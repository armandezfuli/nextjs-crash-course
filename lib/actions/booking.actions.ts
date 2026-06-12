"use server"

import { Booking } from "@/database/booking.model"
import connectToDatabase from "../mongodb"

interface ICreateBooking {
    eventId: string
    email: string
}

export const createBooking = async ({ eventId, email }: ICreateBooking) => {
    try {
        await connectToDatabase()
        await Booking.create({
            eventId,
            email,
        })
        
        return { success: true }
    } catch (e) {
        console.log("create booking failed", e)
        return { success: false }
    }
}
