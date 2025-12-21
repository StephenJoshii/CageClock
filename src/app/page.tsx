'use client'

import { useEffect, useState } from 'react'

interface Event {
  id: string
  name: string
  league: string
  date: string | null
  status: string
}

interface Fight {
  id: string
  event_id: string
  fighter_a: string
  fighter_b: string
  status: string
  current_round: number | null
  max_rounds: number
}

export default function Home() {
  const [events, setEvents] = useState<Event[]>([])
  const [fights, setFights] = useState<Fight[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/sync')
        const data = await response.json()
        setEvents(data.events || [])
        setFights(data.fights || [])
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) return <div>Loading...</div>

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <h1 className="text-4xl font-bold mb-8">CageClock</h1>
      <div className="w-full max-w-4xl">
        <h2 className="text-2xl font-semibold mb-4">Upcoming Events</h2>
        {events.map(event => (
          <div key={event.id} className="border p-4 mb-4 rounded">
            <h3 className="text-xl">{event.name}</h3>
            <p>{event.league} - {event.date ? new Date(event.date).toLocaleString() : 'TBD'}</p>
            <p>Status: {event.status}</p>
            <div className="mt-2">
              <h4 className="font-semibold">Fights:</h4>
              {fights.filter(f => f.event_id === event.id).map(fight => (
                <div key={fight.id} className="ml-4 mt-1">
                  {fight.fighter_a} vs {fight.fighter_b} - {fight.status}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}