import { NextResponse } from "next/server"

import { connectToDatabase } from "@/lib/mongodb"
import { Event } from "@/database/event.model"

type RouteContext = {
    params: Promise<{
        slug: string
    }>
}

export async function GET(_request: Request, { params }: RouteContext) {
    try {
        await connectToDatabase()

        const { slug } = await params

        if (!slug.trim()) {
            return NextResponse.json({ message: "Slug is required" }, { status: 400 })
        }

        const event = await Event.findOne({
            slug: slug.trim(),
        }).lean()

        if (!event) {
            return NextResponse.json({ message: "Event not found" }, { status: 404 })
        }

        return NextResponse.json(event, {
            status: 200,
        })
    } catch (error) {
        console.error("GET_EVENT_BY_SLUG_ERROR", error)

        return NextResponse.json({ message: "Internal server error" }, { status: 500 })
    }
}
