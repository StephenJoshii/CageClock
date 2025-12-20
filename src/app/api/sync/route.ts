import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // Fetch live MMA data from API-Sports
    const response = await fetch('https://v1.mma.api-sports.io/fights?season=2023', {
      headers: {
        'x-apisports-key': process.env.API_SPORTS_KEY!
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API request failed: ${response.status} - ${errorText}`)
    }

    const data = await response.json()

    console.log('API Response:', data)
    console.log('Total events fetched:', data.response?.length || 0)

    // Filter for UFC and Top Rank Boxing
    const filteredEvents = data.response.filter((event: any) => {
      console.log('Event league:', event.league?.name)
      return event.league?.name === 'UFC' || event.league?.name === 'Top Rank Boxing'
    })

    console.log('Filtered events:', filteredEvents.length)

    const logs: string[] = []

    for (const event of filteredEvents) {
      // Upsert event
      const { error: eventError } = await supabase
        .from('events')
        .upsert({
          id: event.id,
          name: event.name,
          league: event.league.name,
          date: event.date,
          status: event.status
        })

      if (eventError) {
        console.error('Error upserting event:', eventError)
        continue
      }

      for (const fight of event.fights) {
        // Check current status for change detection
        const { data: currentFight } = await supabase
          .from('fights')
          .select('status')
          .eq('id', fight.id)
          .single()

        if (currentFight && currentFight.status === 'live' && fight.status === 'finished') {
          logs.push(`Fight ${fight.id} (${fight.fighter_a} vs ${fight.fighter_b}) finished`)
        }

        // Upsert fight
        const { error: fightError } = await supabase
          .from('fights')
          .upsert({
            id: fight.id,
            event_id: event.id,
            fighter_a: fight.fighter_a,
            fighter_b: fight.fighter_b,
            order_index: fight.order_index,
            status: fight.status,
            current_round: fight.current_round,
            max_rounds: fight.max_rounds,
            updated_at: new Date().toISOString()
          })

        if (fightError) {
          console.error('Error upserting fight:', fightError)
        }
      }
    }

    return NextResponse.json({ message: 'Sync completed', logs })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}