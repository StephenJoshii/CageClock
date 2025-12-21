import { NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

export async function GET() {
  try {
    // Scrape upcoming MMA events from Tapology
    const response = await fetch('https://www.tapology.com/fightcenter', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })
    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status}`)
    }
    const html = await response.text()
    console.log('HTML length:', html.length)
    const $ = cheerio.load(html)

    const events: any[] = []

    // Find event previews
    console.log('Found divs:', $('div[id^="preview"]').length)
    $('span a[href*="/fightcenter/events/"]').each((index, element) => {
      const eventLink = $(element).attr('href')
      if (eventLink) {
        const eventName = $(element).text().trim()
        const eventId = eventLink.split('/').pop()

        events.push({
          id: eventId,
          name: eventName,
          league: 'MMA',
          date: null,
          status: 'scheduled'
        })
      }
    })

    console.log('Events scraped:', events)

    const logs: string[] = []
    const allFights: any[] = []

    for (const event of events.slice(0, 2)) { // Limit to 2 for testing
      logs.push(`Event ${event.name} synced`)

      // Mock fights for testing
      const fights: any[] = [
        {
          id: `${event.id}-1`,
          event_id: event.id,
          fighter_a: 'Alexandre Pantoja',
          fighter_b: 'Kai Asakura',
          order_index: 0,
          status: 'scheduled',
          current_round: null,
          max_rounds: 5,
          updated_at: new Date().toISOString()
        },
        {
          id: `${event.id}-2`,
          event_id: event.id,
          fighter_a: 'Jon Jones',
          fighter_b: 'Stipe Miocic',
          order_index: 1,
          status: 'scheduled',
          current_round: null,
          max_rounds: 5,
          updated_at: new Date().toISOString()
        }
      ]

      allFights.push(...fights)
      logs.push(`Event ${event.name} with ${fights.length} fights synced`)
    }

    return NextResponse.json({ message: 'Sync completed', events, fights: allFights, logs })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}