import BookEvent from "@/components/BookEvent"
import EventCard from "@/components/EventCard"
import { IEvent } from "@/database/event.model"
import { getSimilarEventsBySlug } from "@/lib/actions/event.actions"
import { cacheLife } from "next/cache"
import Image from "next/image"
import { notFound } from "next/navigation"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL
const EventDetailItem = ({
    icon,
    alt,
    label,
}: {
    icon: string
    alt: string
    label: string
}) => (
    <div className="flex-row-gap-2 items-center">
        <Image
            src={icon}
            alt={alt}
            width={17}
            height={17}
            style={{ width: "auto", height: "auto" }}
        />
        <p>{label}</p>
    </div>
)
const EventAgenda = ({ agendaItems }: { agendaItems: string[] }) => (
    <div className="agenda">
        <h2>Agenda</h2>
        <ul>
            {agendaItems.map((item) => (
                <li key={item}>{item}</li>
            ))}
        </ul>
    </div>
)

const EventTags = ({ tags }: { tags: string[] }) => (
    <div className="flex flex-row gap-1.5 flex-wrap">
        {tags.map((tag) => (
            <div className="pill" key={tag}>
                {tag}
            </div>
        ))}
    </div>
)

const EventDetailsPage = async ({ params }: { params: Promise<{ slug: string }> }) => {
    "use cache"
    cacheLife("hours")
    const { slug } = await params
    const request = await fetch(`${BASE_URL}/api/events/${slug}`)
    const event = await request.json()
    const {
        description,
        image,
        overview,
        date,
        time,
        location,
        mode,
        agenda,
        audience,
        tags,
        organizer,
    } = event
    if (!description) return notFound()
    const bookings = 10
    const similarEvents: IEvent[] = await getSimilarEventsBySlug(slug)

    const parsedTags = tags.length === 1 ? JSON.parse(tags[0]) : tags
    const parsedAgenda = agenda.length === 1 ? JSON.parse(agenda[0]) : agenda

    return (
        <section id="event">
            <div className="header">
                <h1>Event Description</h1>
                <p>{description}</p>
            </div>

            <div className="details">
                {/*    Left Side - Event Content */}
                <div className="content">
                    <Image
                        src={image}
                        alt="Event Banner"
                        width={800}
                        height={800}
                        className="banner"
                        style={{ width: "auto", height: "auto" }}
                    />

                    <section className="flex-col-gap-2">
                        <h2>Overview</h2>
                        <p>{overview}</p>
                    </section>

                    <section className="flex-col-gap-2">
                        <h2>Event Details</h2>
                        <EventDetailItem
                            icon="/icons/calendar.svg"
                            alt="calendar"
                            label={date.split("T")[0]}
                        />
                        <EventDetailItem
                            icon="/icons/clock.svg"
                            alt="clock"
                            label={time}
                        />
                        <EventDetailItem
                            icon="/icons/pin.svg"
                            alt="pin"
                            label={location}
                        />
                        <EventDetailItem icon="/icons/mode.svg" alt="mode" label={mode} />
                        <EventDetailItem
                            icon="/icons/audience.svg"
                            alt="audience"
                            label={audience}
                        />
                    </section>

                    <EventAgenda agendaItems={parsedAgenda} />

                    <section className="flex-col-gap-2">
                        <h2>About the Organizer</h2>
                        <p>{organizer}</p>
                    </section>

                    <EventTags tags={parsedTags} />
                </div>

                {/*    Right Side - Booking Form */}
                <aside className="booking">
                    <div className="signup-card">
                        <h2>Book Your Spot</h2>
                        {bookings > 0 ? (
                            <p className="text-sm">
                                Join {bookings} people who have already booked their spot!
                            </p>
                        ) : (
                            <p className="text-sm">Be the first to book your spot!</p>
                        )}

                        <BookEvent eventId={event._id} />
                    </div>
                </aside>
            </div>

            <div className="flex w-full flex-col gap-4 pt-20">
                <h2>Similar Events</h2>
                <div className="events">
                    {similarEvents.length > 0 &&
                        similarEvents.map((similarEvent: IEvent) => (
                            <EventCard key={similarEvent.title} {...similarEvent} />
                        ))}
                </div>
            </div>
        </section>
    )
}

export default EventDetailsPage
