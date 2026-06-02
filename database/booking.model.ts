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

bookingSchema.path("email").validate({
  validator: (value: string): boolean =>
    Boolean(value?.trim()) && isValidEmail(value),
  message: "A valid email is required.",
});

bookingSchema.path("eventId").validate({
  validator: async (value: Types.ObjectId): Promise<boolean> => {
    const eventExists = await Event.exists({ _id: value });
    return Boolean(eventExists);
  },
  message: "Referenced event does not exist.",
});

bookingSchema.pre(["findOneAndUpdate", "updateOne"], function () {
  this.setOptions({ runValidators: true });
});

const Booking =
  (models.Booking as BookingModel) || model<IBooking>("Booking", bookingSchema);

export type BookingDocument = HydratedDocument<IBooking>;
export { Booking };
