import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

interface Env {
  DB: D1Database;
  ADMIN_PASSWORD?: string;
  ADMIN_PWD?: string;
}

// POST: Set payout_date to departure_date for all FeWo and Booking.com bookings
// that don't have a payout_date set yet
export async function POST() {
  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;
    const db = env.DB;

    // Get all bookings with platform 'booking' or 'fewo' (case insensitive)
    const bookings = await db
      .prepare(`
        SELECT id, platform, departure_date, additional_costs
        FROM bookings
        WHERE LOWER(platform) IN ('booking', 'booking.com', 'fewo', 'fewo-direkt', 'vrbo')
          AND departure_date IS NOT NULL
      `)
      .all<{
        id: number;
        platform: string;
        departure_date: string;
        additional_costs: string | null;
      }>();

    let updatedCount = 0;
    const updates: { id: number; platform: string; departure_date: string }[] = [];

    for (const booking of bookings.results || []) {
      // Parse additional_costs
      let additionalCosts: Record<string, unknown> = {};
      if (booking.additional_costs) {
        try {
          additionalCosts = JSON.parse(booking.additional_costs);
        } catch {
          additionalCosts = {};
        }
      }

      // Skip if payout_date is already set
      if (additionalCosts.payout_date) {
        continue;
      }

      // Format departure_date to German format (DD.MM.YYYY)
      let payoutDate = booking.departure_date;
      // Check if it's ISO format and convert to German format
      if (payoutDate && payoutDate.match(/^\d{4}-\d{2}-\d{2}/)) {
        const [year, month, day] = payoutDate.split('-');
        payoutDate = `${day}.${month}.${year}`;
      }

      // Set payout_date to departure_date
      additionalCosts.payout_date = payoutDate;

      // Update the booking
      await db
        .prepare('UPDATE bookings SET additional_costs = ? WHERE id = ?')
        .bind(JSON.stringify(additionalCosts), booking.id)
        .run();

      updatedCount++;
      updates.push({
        id: booking.id,
        platform: booking.platform,
        departure_date: booking.departure_date,
      });
    }

    return NextResponse.json({
      success: true,
      message: `${updatedCount} Buchungen aktualisiert`,
      updatedCount,
      updates,
    });
  } catch (error) {
    console.error('Error setting payout dates:', error);
    return NextResponse.json(
      { error: 'Failed to set payout dates', details: String(error) },
      { status: 500 }
    );
  }
}
