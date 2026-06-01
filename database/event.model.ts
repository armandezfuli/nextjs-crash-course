import {
  HydratedDocument,
  Model,
  Schema,
  model,
  models,
} from "mongoose";

interface IEvent {
  title: string;
  slug: string;
  description: string;
  overview: string;
  image: string;
  venue: string;
  location: string;
  date: string;
  time: string;
  mode: string;
  audience: string;
  agenda: string[];
  organizer: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

type EventModel = Model<IEvent>;

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const normalizeDateToIso = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid date format.");
  }

  return parsed.toISOString();
};

const normalizeTime = (value: string): string => {
  const trimmed = value.trim().toLowerCase();
  const meridiemMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);

  if (meridiemMatch) {
    const hours = Number(meridiemMatch[1]);
    const minutes = Number(meridiemMatch[2]);
    const meridiem = meridiemMatch[3];

    if (hours < 1 || hours > 12 || minutes > 59) {
      throw new Error("Invalid time format.");
    }

    const normalizedHour =
      meridiem === "pm" ? (hours % 12) + 12 : hours % 12;
    return `${String(normalizedHour).padStart(2, "0")}:${String(
      minutes
    ).padStart(2, "0")}`;
  }

  const twentyFourHourMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!twentyFourHourMatch) {
    throw new Error("Invalid time format.");
  }

  const hours = Number(twentyFourHourMatch[1]);
  const minutes = Number(twentyFourHourMatch[2]);
  if (hours > 23 || minutes > 59) {
    throw new Error("Invalid time format.");
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}`;
};

const ensureNonEmptyString = (field: string, value: string): void => {
  if (!value?.trim()) {
    throw new Error(`${field} is required.`);
  }
};

const ensureNonEmptyStringArray = (field: string, value: string[]): void => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${field} is required.`);
  }

  const hasInvalidItem = value.some((item) => !item?.trim());
  if (hasInvalidItem) {
    throw new Error(`${field} must contain non-empty values.`);
  }
};

const eventSchema = new Schema<IEvent, EventModel>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, trim: true },
    description: { type: String, required: true, trim: true },
    overview: { type: String, required: true, trim: true },
    image: { type: String, required: true, trim: true },
    venue: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    date: { type: String, required: true, trim: true },
    time: { type: String, required: true, trim: true },
    mode: { type: String, required: true, trim: true },
    audience: { type: String, required: true, trim: true },
    agenda: {
      type: [{ type: String, trim: true }],
      required: true,
      default: [],
    },
    organizer: { type: String, required: true, trim: true },
    tags: {
      type: [{ type: String, trim: true }],
      required: true,
      default: [],
    },
  },
  { timestamps: true }
);

eventSchema.index({ slug: 1 }, { unique: true });

eventSchema.pre("save", function (next) {
  try {
    // Enforce required, non-empty strings before normalization.
    ensureNonEmptyString("title", this.title);
    ensureNonEmptyString("description", this.description);
    ensureNonEmptyString("overview", this.overview);
    ensureNonEmptyString("image", this.image);
    ensureNonEmptyString("venue", this.venue);
    ensureNonEmptyString("location", this.location);
    ensureNonEmptyString("date", this.date);
    ensureNonEmptyString("time", this.time);
    ensureNonEmptyString("mode", this.mode);
    ensureNonEmptyString("audience", this.audience);
    ensureNonEmptyString("organizer", this.organizer);
    ensureNonEmptyStringArray("agenda", this.agenda);
    ensureNonEmptyStringArray("tags", this.tags);

    // Keep slug URL-friendly and regenerate it only when title changes.
    if (this.isModified("title")) {
      this.slug = slugify(this.title);
    }

    // Normalize date/time into consistent persisted formats.
    this.date = normalizeDateToIso(this.date);
    this.time = normalizeTime(this.time);

    next();
  } catch (error) {
    next(error as Error);
  }
});

const Event = (models.Event as EventModel) || model<IEvent>("Event", eventSchema);

export type EventDocument = HydratedDocument<IEvent>;
export { Event };
