"use server"

import { Event } from "@/database/event.model"
import connectToDatabase from "../mongodb"

export const getSimilarEventsBySlug = async (slug: string) => {
    try {
        await connectToDatabase()
        const event = await Event.findOne({ slug });

        return await Event.find({ _id: { $ne: event!._id }, tags: { $in: event!.tags } }).lean();
    } catch (e) {
        return []
    }
}
