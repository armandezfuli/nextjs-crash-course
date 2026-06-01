import { describe, it, expect, vi } from "vitest";

vi.mock("mongoose", async () => {
  const actual = await vi.importActual<typeof import("mongoose")>("mongoose");
  return {
    ...actual,
    default: {
      ...actual.default,
      connect: vi.fn(),
      disconnect: vi.fn(),
    },
  };
});

// Mock the individual model modules so the barrel export doesn't need a DB.
vi.mock("../database/event.model", () => ({
  Event: { modelName: "Event" },
}));

vi.mock("../database/booking.model", () => ({
  Booking: { modelName: "Booking" },
}));

import * as db from "../database/index";

describe("database/index barrel exports", () => {
  it("re-exports the Event model", () => {
    expect(db.Event).toBeDefined();
    expect((db.Event as any).modelName).toBe("Event");
  });

  it("re-exports the Booking model", () => {
    expect(db.Booking).toBeDefined();
    expect((db.Booking as any).modelName).toBe("Booking");
  });

  it("does not expose any unexpected exports", () => {
    const keys = Object.keys(db);
    expect(keys.sort()).toEqual(["Booking", "Event"]);
  });
});