export interface Event {
  title: string;
  image: string; // path under /images
  slug: string; // URL-friendly identifier
  location: string;
  date: string; // YYYY-MM-DD
  time: string; // e.g. "09:00" or "09:00 - 17:00"
}

export const events: Event[] = [
  {
    title: 'React Summit 2026',
    image: '/images/event1.png',
    slug: 'react-summit-2026',
    location: 'Amsterdam, Netherlands',
    date: '2026-11-10',
    time: '09:00 - 17:30',
  },
  {
    title: 'Next.js Conf 2026',
    image: '/images/event2.png',
    slug: 'nextjs-conf-2026',
    location: 'San Francisco, CA (Hybrid)',
    date: '2026-10-20',
    time: '10:00 - 18:00',
  },
  {
    title: 'Google Cloud Next 2026',
    image: '/images/event3.png',
    slug: 'gcp-next-2026',
    location: 'Las Vegas, NV',
    date: '2026-07-14',
    time: '08:30 - 16:00',
  },
  {
    title: 'Global Hackathon 2026',
    image: '/images/event4.png',
    slug: 'global-hackathon-2026',
    location: 'Virtual',
    date: '2026-08-07',
    time: '00:00 - 23:59',
  },
  {
    title: 'NodeConf EU 2026',
    image: '/images/event5.png',
    slug: 'nodeconf-eu-2026',
    location: 'Dublin, Ireland',
    date: '2026-09-30',
    time: '09:30 - 17:00',
  },
  {
    title: 'NYC Tech Meetup — Summer Edition',
    image: '/images/event6.png',
    slug: 'nyc-tech-meetup-2026',
    location: 'New York, NY',
    date: '2026-06-15',
    time: '19:00 - 21:30',
  },
  {
    title: 'Featured Developer Conference 2026',
    image: '/images/event-full.png',
    slug: 'featured-dev-conference-2026',
    location: 'Berlin, Germany',
    date: '2026-12-03',
    time: '09:00 - 18:00',
  },
];
