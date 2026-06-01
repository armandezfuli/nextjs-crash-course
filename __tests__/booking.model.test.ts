import { describe, it, expect, beforeAll, vi, beforeEach } from "vitest";
import mongoose, { Types } from "mongoose";

// Mock the Event model used inside booking.model.ts
vi.mock("../database/event.model", () => ({
  Event: {
    exists: vi.fn(),
  },
}));

import { Booking } from "../database/booking.model";
import { Event } from "../database/event.model";

const mockEventExists = Event.exists as ReturnType<typeof vi.fn>;

// Helper: extract the custom (anonymous) pre-save hook from a schema.
// Mongoose plugin hooks always have names; our hook is anonymous.
function getPreSaveHook(schema: mongoose.Schema): Function {
  const pres = (schema as any).s.hooks._pres.get("save") as Array<{
    fn: Function;
  }>;
  if (!pres || pres.length === 0) {
    throw new Error("No pre-save hook registered on schema");
  }
  const custom = pres.find((entry) => entry.fn.name === "");
  if (!custom) {
    throw new Error("Could not find the custom anonymous pre-save hook");
  }
  return custom.fn;
}

// Helper: build a fully-valid fake Booking document.
function makeValidDoc(overrides: Record<string, unknown> = {}) {
  return {
    email: "user@example.com",
    eventId: new Types.ObjectId(),
    isNew: true,
    isModified: (field: string) => field === "eventId",
    ...overrides,
  };
}

// Helper: run the async pre-save hook and capture the value passed to next().
function runHook(
  hook: Function,
  doc: Record<string, unknown>
): Promise<Error | undefined> {
  return new Promise((resolve) => {
    hook.call(doc, (err?: Error) => resolve(err));
  });
}

describe("Booking model – schema and exports", () => {
  it("exports a mongoose model named 'Booking'", () => {
    expect(Booking).toBeDefined();
    expect(Booking.modelName).toBe("Booking");
  });

  it("has eventId and email fields in the schema", () => {
    const paths = Booking.schema.paths;
    expect(paths["eventId"]).toBeDefined();
    expect(paths["email"]).toBeDefined();
  });

  it("references the Event model on the eventId field", () => {
    const eventIdPath = Booking.schema.paths["eventId"] as any;
    expect(eventIdPath.options.ref).toBe("Event");
  });

  it("enables timestamps", () => {
    expect((Booking.schema as any).options.timestamps).toBe(true);
  });

  it("marks eventId as required", () => {
    const eventIdPath = Booking.schema.paths["eventId"] as any;
    expect(eventIdPath.isRequired).toBe(true);
  });
});

describe("Booking pre-save hook – email validation", () => {
  let hook: Function;

  beforeAll(() => {
    hook = getPreSaveHook(Booking.schema);
  });

  beforeEach(() => {
    mockEventExists.mockResolvedValue({ _id: new Types.ObjectId() });
  });

  it("calls next() without error for a valid email", async () => {
    const doc = makeValidDoc({ email: "user@example.com" });
    const err = await runHook(hook, doc);
    expect(err).toBeUndefined();
  });

  it("calls next() with error when email is empty string", async () => {
    const doc = makeValidDoc({ email: "" });
    const err = await runHook(hook, doc);
    expect(err).toBeInstanceOf(Error);
    expect(err!.message).toMatch(/valid email is required/i);
  });

  it("calls next() with error when email is whitespace only", async () => {
    const doc = makeValidDoc({ email: "   " });
    const err = await runHook(hook, doc);
    expect(err).toBeInstanceOf(Error);
    expect(err!.message).toMatch(/valid email is required/i);
  });

  it("calls next() with error when email has no '@'", async () => {
    const doc = makeValidDoc({ email: "invalidemail.com" });
    const err = await runHook(hook, doc);
    expect(err).toBeInstanceOf(Error);
    expect(err!.message).toMatch(/valid email is required/i);
  });

  it("calls next() with error when email has no domain part", async () => {
    const doc = makeValidDoc({ email: "user@" });
    const err = await runHook(hook, doc);
    expect(err).toBeInstanceOf(Error);
    expect(err!.message).toMatch(/valid email is required/i);
  });

  it("calls next() with error when email is missing TLD", async () => {
    const doc = makeValidDoc({ email: "user@domain" });
    const err = await runHook(hook, doc);
    expect(err).toBeInstanceOf(Error);
    expect(err!.message).toMatch(/valid email is required/i);
  });

  it("calls next() with error when email contains spaces", async () => {
    const doc = makeValidDoc({ email: "user name@example.com" });
    const err = await runHook(hook, doc);
    expect(err).toBeInstanceOf(Error);
    expect(err!.message).toMatch(/valid email is required/i);
  });

  it("accepts emails with subdomains", async () => {
    const doc = makeValidDoc({ email: "user@mail.example.com" });
    const err = await runHook(hook, doc);
    expect(err).toBeUndefined();
  });

  it("accepts emails with plus addressing", async () => {
    const doc = makeValidDoc({ email: "user+tag@example.com" });
    const err = await runHook(hook, doc);
    expect(err).toBeUndefined();
  });

  it("accepts emails with dots in the local part", async () => {
    const doc = makeValidDoc({ email: "first.last@example.com" });
    const err = await runHook(hook, doc);
    expect(err).toBeUndefined();
  });
});

describe("Booking pre-save hook – event existence validation", () => {
  let hook: Function;

  beforeAll(() => {
    hook = getPreSaveHook(Booking.schema);
  });

  beforeEach(() => {
    mockEventExists.mockReset();
  });

  it("queries Event.exists with the booking's eventId when the doc is new", async () => {
    const eventId = new Types.ObjectId();
    mockEventExists.mockResolvedValue({ _id: eventId });
    const doc = makeValidDoc({ eventId, isNew: true });
    await runHook(hook, doc);
    expect(mockEventExists).toHaveBeenCalledWith({ _id: eventId });
  });

  it("queries Event.exists when eventId is modified (not new)", async () => {
    const eventId = new Types.ObjectId();
    mockEventExists.mockResolvedValue({ _id: eventId });
    const doc = makeValidDoc({
      eventId,
      isNew: false,
      isModified: (field: string) => field === "eventId",
    });
    await runHook(hook, doc);
    expect(mockEventExists).toHaveBeenCalledWith({ _id: eventId });
  });

  it("skips Event.exists when doc is not new and eventId is not modified", async () => {
    const doc = makeValidDoc({
      isNew: false,
      isModified: () => false,
    });
    await runHook(hook, doc);
    expect(mockEventExists).not.toHaveBeenCalled();
  });

  it("calls next() without error when the referenced event exists", async () => {
    const eventId = new Types.ObjectId();
    mockEventExists.mockResolvedValue({ _id: eventId });
    const doc = makeValidDoc({ eventId, isNew: true });
    const err = await runHook(hook, doc);
    expect(err).toBeUndefined();
  });

  it("calls next() with error when the referenced event does not exist", async () => {
    mockEventExists.mockResolvedValue(null);
    const doc = makeValidDoc({ isNew: true });
    const err = await runHook(hook, doc);
    expect(err).toBeInstanceOf(Error);
    expect(err!.message).toMatch(/referenced event does not exist/i);
  });

  it("calls next() with error when Event.exists rejects", async () => {
    mockEventExists.mockRejectedValue(new Error("DB connection failed"));
    const doc = makeValidDoc({ isNew: true });
    const err = await runHook(hook, doc);
    expect(err).toBeInstanceOf(Error);
    expect(err!.message).toBe("DB connection failed");
  });
});