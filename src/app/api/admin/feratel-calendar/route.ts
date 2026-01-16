import { NextRequest, NextResponse } from 'next/server';

// All iCal sources for the calendar
const ICAL_SOURCES = [
  {
    name: 'Feratel',
    url: 'https://ical.deskline.net/KTN/services/35981ad0-78ba-48f7-9ebc-3260e1ea446b/4d3167ef-4067-4c33-9483-a005b3dbdd17.ics'
  },
  {
    name: 'FeWo-Direkt',
    url: 'https://www.fewo-direkt.de/icalendar/69e49db18b094f38956a712f7c455189.ics?nonTentative'
  },
  {
    name: 'Booking.com',
    url: 'https://ical.booking.com/v1/export?t=f5f44162-4f91-434b-bf41-73381f708169'
  }
];

interface BookedPeriod {
  start: string;
  end: string;
  summary?: string;
  source?: string;
}

interface CalendarResponse {
  success: boolean;
  sources?: string[];
  bookedPeriods: BookedPeriod[];
  errors?: string[];
  rawData?: string;
}

// Parse iCal data to extract VEVENT entries
function parseICalData(icalData: string, sourceName: string): BookedPeriod[] {
  const events: BookedPeriod[] = [];

  // Split by VEVENT
  const eventRegex = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/g;
  let match;

  while ((match = eventRegex.exec(icalData)) !== null) {
    const eventBlock = match[1];

    // Extract DTSTART (handle both DATE and DATE-TIME formats)
    const startMatch = eventBlock.match(/DTSTART[^:]*:(\d{8})/);
    // Extract DTEND
    const endMatch = eventBlock.match(/DTEND[^:]*:(\d{8})/);
    // Extract SUMMARY (optional)
    const summaryMatch = eventBlock.match(/SUMMARY[^:]*:([^\r\n]+)/);

    if (startMatch && endMatch) {
      const startStr = startMatch[1];
      const endStr = endMatch[1];

      // Format: YYYYMMDD -> YYYY-MM-DD
      const start = `${startStr.slice(0, 4)}-${startStr.slice(4, 6)}-${startStr.slice(6, 8)}`;
      const end = `${endStr.slice(0, 4)}-${endStr.slice(4, 6)}-${endStr.slice(6, 8)}`;

      events.push({
        start,
        end,
        summary: summaryMatch ? `[${sourceName}] ${summaryMatch[1].trim()}` : `[${sourceName}]`,
        source: sourceName
      });
    }
  }

  return events;
}

// Fetch iCal data from a single source
async function fetchICalFromSource(source: { name: string; url: string }): Promise<{ periods: BookedPeriod[]; error?: string }> {
  try {
    // Use browser-like headers to avoid 403 blocking
    const response = await fetch(source.url, {
      headers: {
        'Accept': 'text/calendar, text/plain, */*',
        'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      // 10 second timeout
      signal: AbortSignal.timeout(10000),
      redirect: 'follow'
    });

    console.log(`${source.name} iCal response status:`, response.status);

    if (response.ok) {
      const data = await response.text();
      // Check if it looks like iCal data
      if (data.includes('BEGIN:VCALENDAR') || data.includes('BEGIN:VEVENT')) {
        const periods = parseICalData(data, source.name);
        console.log(`${source.name}: Found ${periods.length} bookings`);
        return { periods };
      }
      console.log(`${source.name} response not iCal format, first 200 chars:`, data.substring(0, 200));
      return { periods: [], error: `${source.name}: Ungültiges Format` };
    } else {
      console.log(`${source.name} iCal response not OK:`, response.status, response.statusText);
      return { periods: [], error: `${source.name}: ${response.status}` };
    }
  } catch (error) {
    console.error(`Failed to fetch ${source.name} iCal:`, error);
    return { periods: [], error: `${source.name}: Timeout/Fehler` };
  }
}

// GET - Fetch all calendar data
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const debug = searchParams.get('debug') === 'true';

  try {
    const results = await Promise.all(
      ICAL_SOURCES.map(source => fetchICalFromSource(source))
    );

    const allPeriods: BookedPeriod[] = [];
    const successfulSources: string[] = [];
    const errors: string[] = [];

    results.forEach((result, index) => {
      if (result.periods.length > 0) {
        allPeriods.push(...result.periods);
        successfulSources.push(ICAL_SOURCES[index].name);
      }
      if (result.error) {
        errors.push(result.error);
      }
    });

    const response: CalendarResponse = {
      success: allPeriods.length > 0 || successfulSources.length > 0,
      sources: successfulSources,
      bookedPeriods: allPeriods,
    };

    if (errors.length > 0) {
      response.errors = errors;
    }

    if (debug) {
      console.log('Calendar API response:', {
        success: response.success,
        sources: response.sources,
        periodCount: allPeriods.length,
        errors: response.errors
      });
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('GET /api/admin/feratel-calendar error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({
      success: false,
      bookedPeriods: [],
      error: message
    }, { status: 500 });
  }
}
