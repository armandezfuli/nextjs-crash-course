import { notFound } from "next/navigation"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL

const EventDetailsPage = async ({ params }: { params: Promise<{ slug: string }> }) => {
    const { slug } = await params
    const request = await fetch(`${BASE_URL}/api/events/${slug}`)
    const event = await request.json()

    if (!event) return notFound()
    
    console.log(event)

    return (
        <section id="event">
            <h1>Event Details {slug}</h1>
        </section>
    )
}

export default EventDetailsPage
