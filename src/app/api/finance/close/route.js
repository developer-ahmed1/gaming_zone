import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

function isSupabaseConfigured() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
}

/**
 * POST /api/finance/close
 * Body: { business_date, ...summary_fields }
 * Saves a snapshot of the day's financials.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      business_date,
      total_bookings,
      equipment_revenue,
      addons_revenue,
      advance_collected,
      balance_collected,
      total_collected,
    } = body;

    if (!business_date) {
      return NextResponse.json({ error: 'business_date is required' }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      // Demo mode — return success
      return NextResponse.json({
        id: Date.now(),
        business_date,
        total_bookings, equipment_revenue, addons_revenue,
        advance_collected, balance_collected, total_collected,
        closed_at: new Date().toISOString(),
        closed_by: 'owner',
      });
    }

    // Upsert the day closing
    const { data, error } = await supabase
      .from('day_closings')
      .upsert({
        business_date,
        total_bookings: total_bookings || 0,
        equipment_revenue: equipment_revenue || 0,
        addons_revenue: addons_revenue || 0,
        advance_collected: advance_collected || 0,
        balance_collected: balance_collected || 0,
        total_collected: total_collected || 0,
        closed_at: new Date().toISOString(),
        closed_by: 'owner',
      }, { onConflict: 'business_date' })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('POST /api/finance/close error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
