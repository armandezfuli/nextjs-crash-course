import {
  HydratedDocument,
  Model,
  Schema,
  Types,
  model,
  models,
} from "mongoose";
import { Event } from "./event.model";

interface IBooking {
  eventId: Types.ObjectId;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

type BookingModel = Model<IBooking>;

const isValidEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const bookingSchema = new Schema<IBooking, BookingModel>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
  },
  { timestamps: true }
);

bookingSchema.pre("save", async function (next) {
  try {
    // Enforce a valid email format before writing.
    if (!this.email?.trim() || !isValidEmail(this.email)) {
      throw new Error("A valid email is required.");
    }

    // Ensure bookings always point to an existing event.
    if (this.isNew || this.isModified("eventId")) {
      const eventExists = await Event.exists({ _id: this.eventId });
      if (!eventExists) {
        throw new Error("Referenced event does not exist.");
      }
    }

    next();
  } catch (error) {
    next(error as Error);
  }
});

const Booking =
  (models.Booking as BookingModel) || model<IBooking>("Booking", bookingSchema);

export type BookingDocument = HydratedDocument<IBooking>;
export { Booking };
