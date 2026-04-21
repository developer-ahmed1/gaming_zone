import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { isSupabaseConfigured, getDemoBookings } from '@/lib/demoStore';

/**
 * GET /api/finance
 * 
 * Query params:
 *   date=YYYY-MM-DD     → daily summary for a business day
 *   range=week|month    → array of daily totals for charts
 *   closingHour=2       → override closing hour (default 2)
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const range = searchParams.get('range');
  const closingHour = parseInt(searchParams.get('closingHour') || '2');

  // --- CHART DATA (range=week|month) ---
  if (range) {
    const days = range === 'month' ? 30 : 7;
    const results = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const summary = await getDaySummary(dateStr, closingHour);
      results.push({
        date: dateStr,
        label: d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }),
        ...summary,
      });
    }
    return NextResponse.json(results);
  }

  // --- DAILY SUMMARY ---
  if (date) {
    const summary = await getDaySummary(date, closingHour);

    // Check if day is closed
    let closed = null;
    if (isSupabaseConfigured()) {
      const { data } = await supabase
        .from('day_closings')
        .select('*')
        .eq('business_date', date)
        .maybeSingle();
      closed = data || null;
    }

    return NextResponse.json({ date, ...summary, closed });
  }

  return NextResponse.json({ error: 'Provide ?date= or ?range=week|month' }, { status: 400 });
}

/**
 * Calculate financial summary for a single business day.
 * 
 * Business day logic:
 * - Primary date: bookings on `date` with slot_start_time >= opening (14:00)
 * - Overflow date: bookings on `date+1` with slot_start_time < closing (02:00)
 * 
 * Advance attribution:
 * - Advances are attributed to the day the booking was CREATED, not the slot date.
 */
async function getDaySummary(date, closingHour) {
  const nextDate = getNextDate(date);
  const closingTime = String(closingHour).padStart(2, '0') + ':00:00';

  let bookings = [];

  if (!isSupabaseConfigured()) {
    // Demo mode
    const all = getDemoBookings();
    bookings = all.filter(b => {
      if (b.status === 'cancelled') return false;
      // Primary date: slot_date matches and time >= 14:00
      if (b.slot_date === date && b.slot_start_time >= '14:00') return true;
      // Overflow: slot_date is next day and time < closing
      if (b.slot_date === nextDate && b.slot_start_time < closingTime) return true;
      return false;
    });
  } else {
    // Supabase: fetch bookings for both calendar dates
    const { data: primary } = await supabase
      .from('bookings')
      .select(`*, equipment:equipment_id (id, name, type), booking_addons (*)`)
      .eq('slot_date', date)
      .gte('slot_start_time', '14:00:00')
      .neq('status', 'cancelled');

    const { data: overflow } = await supabase
      .from('bookings')
      .select(`*, equipment:equipment_id (id, name, type), booking_addons (*)`)
      .eq('slot_date', nextDate)
      .lt('slot_start_time', closingTime)
      .neq('status', 'cancelled');

    bookings = [...(primary || []), ...(overflow || [])];
  }

  // Calculate totals
  const totalBookings = bookings.length;
  const completedBookings = bookings.filter(b => b.status === 'completed').length;
  let equipmentRevenue = 0;
  let addonsRevenue = 0;
  let totalBilled = 0;

  // For advance attribution: advances are counted on the day they were collected (created_at)
  let advanceCollected = 0;
  let balanceCollected = 0;

  const addonItems = {}; // { "Lays Small": { qty: 3, total: 60 } }

  for (const b of bookings) {
    equipmentRevenue += b.equipment_price || 0;
    addonsRevenue += b.addons_total || 0;
    totalBilled += b.total_amount || 0;

    // Advance attribution: count advance only if booking was created on this business day
    const createdDate = b.created_at ? b.created_at.split('T')[0] : date;
    if (createdDate === date || createdDate === nextDate) {
      advanceCollected += b.advance_amount || 0;
    }

    // Balance collected = for completed bookings, the amount beyond advance
    if (b.status === 'completed' && b.payment_status === 'paid') {
      const balance = Math.max(0, (b.total_amount || 0) - (b.advance_amount || 0));
      balanceCollected += balance;
    }

    // Aggregate addon items
    if (b.booking_addons) {
      for (const a of b.booking_addons) {
        const key = `${a.addon_type === 'chips' ? '🍟' : '🥤'} ${a.addon_name} ${a.addon_detail || ''}`.trim();
        if (!addonItems[key]) addonItems[key] = { qty: 0, total: 0 };
        addonItems[key].qty += a.quantity;
        addonItems[key].total += a.total_price;
      }
    }
  }

  const totalCollected = advanceCollected + balanceCollected;

  return {
    totalBookings,
    completedBookings,
    equipmentRevenue,
    addonsRevenue,
    totalBilled,
    advanceCollected,
    balanceCollected,
    totalCollected,
    addonItems,
    bookings,
  };
}

function getNextDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
