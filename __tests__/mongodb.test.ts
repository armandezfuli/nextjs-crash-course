import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from "vitest";

// vi.hoisted ensures these mocks are created before the vi.mock factory runs
// (vi.mock calls are hoisted to the top of the file by Vitest's transform).
const { mockConnect, mockDisconnect } = vi.hoisted(() => ({
  mockConnect: vi.fn(),
  mockDisconnect: vi.fn(),
}));

vi.mock("mongoose", async (importOriginal) => {
  const actual = await importOriginal<typeof import("mongoose")>();
  return {
    ...actual,
    default: {
      ...actual.default,
      connect: mockConnect,
      disconnect: mockDisconnect,
    },
  };
});

// Helpers ─────────────────────────────────────────────────────────────────────

const fakeMongooseInstance = { connection: {} } as any;

/** Re-import the module fresh after vi.resetModules(). */
async function loadFreshModule() {
  const mod = await import("../lib/mongodb");
  return mod;
}

// Tests ───────────────────────────────────────────────────────────────────────

describe("connectToDatabase", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Clearing the module registry forces a fresh module load on the next
    // dynamic import, which re-runs the global-cache initialisation code.
    vi.resetModules();
    // Remove the cached object so the next module load starts clean.
    delete (global as any).mongooseCache;
    delete process.env.MONGODB_URI;
  });

  afterEach(() => {
    delete process.env.MONGODB_URI;
  });

  it("throws when MONGODB_URI is not set", async () => {
    const { connectToDatabase } = await loadFreshModule();
    await expect(connectToDatabase()).rejects.toThrow(
      /MONGODB_URI environment variable is not defined/i
    );
  });

  it("calls mongoose.connect with the provided URI", async () => {
    process.env.MONGODB_URI = "mongodb://localhost:27017/test";
    mockConnect.mockResolvedValueOnce(fakeMongooseInstance);
    const { connectToDatabase } = await loadFreshModule();

    await connectToDatabase();

    expect(mockConnect).toHaveBeenCalledWith(
      "mongodb://localhost:27017/test",
      expect.objectContaining({ bufferCommands: false })
    );
  });

  it("passes correct connection options to mongoose.connect", async () => {
    process.env.MONGODB_URI = "mongodb://localhost/db";
    mockConnect.mockResolvedValueOnce(fakeMongooseInstance);
    const { connectToDatabase } = await loadFreshModule();

    await connectToDatabase();

    expect(mockConnect).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        bufferCommands: false,
        maxPoolSize: 10,
        minPoolSize: 5,
      })
    );
  });

  it("returns the mongoose instance on successful connection", async () => {
    process.env.MONGODB_URI = "mongodb://localhost/db";
    mockConnect.mockResolvedValueOnce(fakeMongooseInstance);
    const { connectToDatabase } = await loadFreshModule();

    const result = await connectToDatabase();

    expect(result).toBe(fakeMongooseInstance);
  });

  it("caches the connection and returns it on subsequent calls", async () => {
    process.env.MONGODB_URI = "mongodb://localhost/db";
    mockConnect.mockResolvedValueOnce(fakeMongooseInstance);
    const { connectToDatabase } = await loadFreshModule();

    const first = await connectToDatabase();
    const second = await connectToDatabase();

    expect(second).toBe(first);
    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  it("returns the pending promise when called concurrently", async () => {
    process.env.MONGODB_URI = "mongodb://localhost/db";
    let resolveFn!: (v: any) => void;
    const pendingPromise = new Promise<any>((res) => {
      resolveFn = res;
    });
    mockConnect.mockReturnValueOnce(pendingPromise);
    const { connectToDatabase } = await loadFreshModule();

    const p1 = connectToDatabase();
    const p2 = connectToDatabase();

    resolveFn(fakeMongooseInstance);

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBe(fakeMongooseInstance);
    expect(r2).toBe(fakeMongooseInstance);
    // mongoose.connect should only be called once despite two concurrent calls
    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  it("clears the promise cache on connection failure", async () => {
    process.env.MONGODB_URI = "mongodb://localhost/db";
    const connectionError = new Error("Connection refused");
    mockConnect.mockRejectedValueOnce(connectionError);
    const { connectToDatabase } = await loadFreshModule();

    await expect(connectToDatabase()).rejects.toThrow("Connection refused");

    // The promise cache must be cleared so a retry is possible.
    expect((global as any).mongooseCache.promise).toBeNull();
  });

  it("allows retry after a failed connection attempt", async () => {
    process.env.MONGODB_URI = "mongodb://localhost/db";
    mockConnect
      .mockRejectedValueOnce(new Error("First failure"))
      .mockResolvedValueOnce(fakeMongooseInstance);
    const { connectToDatabase } = await loadFreshModule();

    await expect(connectToDatabase()).rejects.toThrow("First failure");

    const result = await connectToDatabase();
    expect(result).toBe(fakeMongooseInstance);
    expect(mockConnect).toHaveBeenCalledTimes(2);
  });

  it("is also the default export", async () => {
    const mod = await loadFreshModule();
    expect(mod.default).toBe(mod.connectToDatabase);
  });
});

describe("disconnectFromDatabase", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    delete (global as any).mongooseCache;
    delete process.env.MONGODB_URI;
  });

  it("does nothing when there is no cached connection", async () => {
    const { disconnectFromDatabase } = await loadFreshModule();

    await disconnectFromDatabase();

    expect(mockDisconnect).not.toHaveBeenCalled();
  });

  it("calls mongoose.disconnect when a connection is cached", async () => {
    mockDisconnect.mockResolvedValueOnce(undefined);
    const { disconnectFromDatabase } = await loadFreshModule();
    (global as any).mongooseCache.conn = fakeMongooseInstance;

    await disconnectFromDatabase();

    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it("clears conn and promise from the cache after disconnecting", async () => {
    mockDisconnect.mockResolvedValueOnce(undefined);
    const { disconnectFromDatabase } = await loadFreshModule();
    (global as any).mongooseCache.conn = fakeMongooseInstance;
    (global as any).mongooseCache.promise = Promise.resolve(fakeMongooseInstance);

    await disconnectFromDatabase();

    expect((global as any).mongooseCache.conn).toBeNull();
    expect((global as any).mongooseCache.promise).toBeNull();
  });

  it("does not call disconnect when conn is already null", async () => {
    const { disconnectFromDatabase } = await loadFreshModule();
    // conn is null by default – calling disconnect should be a no-op.
    expect((global as any).mongooseCache.conn).toBeNull();

    await disconnectFromDatabase();

    expect(mockDisconnect).not.toHaveBeenCalled();
    expect((global as any).mongooseCache.conn).toBeNull();
    expect((global as any).mongooseCache.promise).toBeNull();
  });

  it("propagates errors thrown by mongoose.disconnect", async () => {
    const disconnectError = new Error("Disconnect failed");
    mockDisconnect.mockRejectedValueOnce(disconnectError);
    const { disconnectFromDatabase } = await loadFreshModule();
    (global as any).mongooseCache.conn = fakeMongooseInstance;

    await expect(disconnectFromDatabase()).rejects.toThrow("Disconnect failed");
  });
});