import { describe, it, expect, beforeAll } from "vitest";
import mongoose from "mongoose";

// Mongoose does NOT connect to a DB on import – it only connects when
// mongoose.connect() is explicitly called.  We can safely import the model
// without any mocking here.
import { Event } from "../database/event.model";

// Helper to extract the custom (anonymous) pre-save hook from a schema.
// Mongoose plugins register named hooks; our application hook is anonymous.
function getPreSaveHook(schema: mongoose.Schema): Function {
  const pres = (schema as any).s.hooks._pres.get("save") as Array<{
    fn: Function;
  }>;
  if (!pres || pres.length === 0) {
    throw new Error("No pre-save hook registered on schema");
  }
  // Our custom hook is the first anonymous function – built-in plugin hooks
  // always have descriptive names (saveSubdocsPreSave, timestampsPreSave, etc.).
  const custom = pres.find((entry) => entry.fn.name === "");
  if (!custom) {
    throw new Error("Could not find the custom anonymous pre-save hook");
  }
  return custom.fn;
}

// Helper: builds a fully-valid fake Event document.
function makeValidDoc(overrides: Record<string, unknown> = {}) {
  return {
    title: "My Great Event",
    slug: "",
    description: "An amazing event.",
    overview: "This is the overview.",
    image: "https://example.com/image.jpg",
    venue: "Main Hall",
    location: "New York, NY",
    date: "2025-06-15",
    time: "10:00am",
    mode: "in-person",
    audience: "Everyone",
    agenda: ["Opening remarks", "Keynote"],
    organizer: "Acme Corp",
    tags: ["tech", "conference"],
    isModified: (field: string) => field === "title",
    isNew: true,
    ...overrides,
  };
}

describe("Event model – schema and exports", () => {
  it("exports a mongoose model named 'Event'", () => {
    expect(Event).toBeDefined();
    expect(Event.modelName).toBe("Event");
  });

  it("has a schema with all required fields", () => {
    const paths = Event.schema.paths;
    const required = [
      "title",
      "description",
      "overview",
      "image",
      "venue",
      "location",
      "date",
      "time",
      "mode",
      "audience",
      "agenda",
      "organizer",
      "tags",
    ];
    for (const field of required) {
      expect(paths[field], `Missing schema path: ${field}`).toBeDefined();
    }
  });

  it("has a unique index on slug", () => {
    const slugPath = Event.schema.paths["slug"] as any;
    expect(slugPath).toBeDefined();
    expect(slugPath.options.unique).toBe(true);
  });

  it("enables timestamps", () => {
    expect((Event.schema as any).options.timestamps).toBe(true);
  });
});

describe("Event pre-save hook – validation", () => {
  let hook: Function;

  beforeAll(() => {
    hook = getPreSaveHook(Event.schema);
  });

  // Helper to run the hook and capture what `next` receives.
  function runHook(doc: Record<string, unknown>): Promise<Error | undefined> {
    return new Promise((resolve) => {
      hook.call(doc, (err?: Error) => resolve(err));
    });
  }

  it("calls next() without error for a fully valid document", async () => {
    const doc = makeValidDoc();
    const err = await runHook(doc);
    expect(err).toBeUndefined();
  });

  it.each([
    "title",
    "description",
    "overview",
    "image",
    "venue",
    "location",
    "date",
    "time",
    "mode",
    "audience",
    "organizer",
  ])(
    "calls next() with error when '%s' is an empty string",
    async (field) => {
      const doc = makeValidDoc({ [field]: "" });
      const err = await runHook(doc);
      expect(err).toBeInstanceOf(Error);
      expect(err!.message).toMatch(/is required/i);
    }
  );

  it("calls next() with error when title is whitespace-only", async () => {
    const doc = makeValidDoc({ title: "   " });
    const err = await runHook(doc);
    expect(err).toBeInstanceOf(Error);
    expect(err!.message).toMatch(/title is required/i);
  });

  it("calls next() with error when agenda is empty array", async () => {
    const doc = makeValidDoc({ agenda: [] });
    const err = await runHook(doc);
    expect(err).toBeInstanceOf(Error);
    expect(err!.message).toMatch(/agenda is required/i);
  });

  it("calls next() with error when tags is empty array", async () => {
    const doc = makeValidDoc({ tags: [] });
    const err = await runHook(doc);
    expect(err).toBeInstanceOf(Error);
    expect(err!.message).toMatch(/tags is required/i);
  });

  it("calls next() with error when agenda contains a blank string", async () => {
    const doc = makeValidDoc({ agenda: ["Talk 1", "  "] });
    const err = await runHook(doc);
    expect(err).toBeInstanceOf(Error);
    expect(err!.message).toMatch(/must contain non-empty values/i);
  });

  it("calls next() with error when tags contains a blank string", async () => {
    const doc = makeValidDoc({ tags: ["tech", ""] });
    const err = await runHook(doc);
    expect(err).toBeInstanceOf(Error);
    expect(err!.message).toMatch(/must contain non-empty values/i);
  });

  it("calls next() with error when agenda is not an array", async () => {
    const doc = makeValidDoc({ agenda: "not-an-array" as any });
    const err = await runHook(doc);
    expect(err).toBeInstanceOf(Error);
    expect(err!.message).toMatch(/agenda is required/i);
  });
});

describe("Event pre-save hook – slug generation", () => {
  let hook: Function;

  beforeAll(() => {
    hook = getPreSaveHook(Event.schema);
  });

  function runHook(doc: Record<string, unknown>): Promise<Error | undefined> {
    return new Promise((resolve) => {
      hook.call(doc, (err?: Error) => resolve(err));
    });
  }

  it("generates a slug from the title when title is modified", async () => {
    const doc = makeValidDoc({ title: "Hello World Event!" });
    await runHook(doc);
    expect((doc as any).slug).toBe("hello-world-event");
  });

  it("converts title to lowercase in slug", async () => {
    const doc = makeValidDoc({ title: "UPPER CASE TITLE" });
    await runHook(doc);
    expect((doc as any).slug).toBe("upper-case-title");
  });

  it("removes non-alphanumeric characters from slug", async () => {
    const doc = makeValidDoc({ title: "Event: #1 (Special!)" });
    await runHook(doc);
    expect((doc as any).slug).toBe("event-1-special");
  });

  it("collapses multiple spaces/hyphens into one hyphen in slug", async () => {
    const doc = makeValidDoc({ title: "My   Big   Event" });
    await runHook(doc);
    expect((doc as any).slug).toBe("my-big-event");
  });

  it("does not regenerate slug when title is not modified", async () => {
    const doc = makeValidDoc({
      title: "Same Title",
      slug: "existing-slug",
      isModified: () => false,
    });
    await runHook(doc);
    expect((doc as any).slug).toBe("existing-slug");
  });
});

describe("Event pre-save hook – date normalization", () => {
  let hook: Function;

  beforeAll(() => {
    hook = getPreSaveHook(Event.schema);
  });

  function runHook(doc: Record<string, unknown>): Promise<Error | undefined> {
    return new Promise((resolve) => {
      hook.call(doc, (err?: Error) => resolve(err));
    });
  }

  it("normalizes a date string to ISO 8601 format", async () => {
    const doc = makeValidDoc({ date: "2025-06-15" });
    await runHook(doc);
    expect((doc as any).date).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it("preserves information of a full datetime string", async () => {
    const input = "2025-12-25T00:00:00.000Z";
    const doc = makeValidDoc({ date: input });
    await runHook(doc);
    expect(new Date((doc as any).date).toISOString()).toBe(
      new Date(input).toISOString()
    );
  });

  it("calls next() with error when date is invalid", async () => {
    const doc = makeValidDoc({ date: "not-a-date" });
    const err = await runHook(doc);
    expect(err).toBeInstanceOf(Error);
    expect(err!.message).toMatch(/invalid date/i);
  });
});

describe("Event pre-save hook – time normalization", () => {
  let hook: Function;

  beforeAll(() => {
    hook = getPreSaveHook(Event.schema);
  });

  function runHook(doc: Record<string, unknown>): Promise<Error | undefined> {
    return new Promise((resolve) => {
      hook.call(doc, (err?: Error) => resolve(err));
    });
  }

  it.each([
    ["10:00am", "10:00"],
    ["10:00pm", "22:00"],
    ["12:00pm", "12:00"],
    ["12:00am", "00:00"],
    ["1:30pm", "13:30"],
    ["11:59am", "11:59"],
  ])("normalizes '%s' to '%s'", async (input, expected) => {
    const doc = makeValidDoc({ time: input });
    await runHook(doc);
    expect((doc as any).time).toBe(expected);
  });

  it.each([
    ["09:00", "09:00"],
    ["13:45", "13:45"],
    ["00:00", "00:00"],
    ["23:59", "23:59"],
  ])("normalizes 24-hour '%s' to '%s'", async (input, expected) => {
    const doc = makeValidDoc({ time: input });
    await runHook(doc);
    expect((doc as any).time).toBe(expected);
  });

  it("calls next() with error for invalid time string", async () => {
    const doc = makeValidDoc({ time: "25:00" });
    const err = await runHook(doc);
    expect(err).toBeInstanceOf(Error);
    expect(err!.message).toMatch(/invalid time/i);
  });

  it("calls next() with error for 0:00am (hour < 1 in meridiem mode)", async () => {
    const doc = makeValidDoc({ time: "0:00am" });
    const err = await runHook(doc);
    expect(err).toBeInstanceOf(Error);
    expect(err!.message).toMatch(/invalid time/i);
  });

  it("calls next() with error for 13:00pm (hour > 12 in meridiem mode)", async () => {
    const doc = makeValidDoc({ time: "13:00pm" });
    const err = await runHook(doc);
    expect(err).toBeInstanceOf(Error);
    expect(err!.message).toMatch(/invalid time/i);
  });

  it("calls next() with error for completely invalid time format", async () => {
    const doc = makeValidDoc({ time: "not-a-time" });
    const err = await runHook(doc);
    expect(err).toBeInstanceOf(Error);
    expect(err!.message).toMatch(/invalid time/i);
  });

  it("normalizes time with extra surrounding whitespace", async () => {
    const doc = makeValidDoc({ time: "  9:00am  " });
    await runHook(doc);
    expect((doc as any).time).toBe("09:00");
  });
});