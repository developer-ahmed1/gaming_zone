import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { isSupabaseConfigured, getDemoBookings, addDemoBooking } from '@/lib/demoStore';

function timesOverlap(start1, end1, start2, end2) {
  const toMin = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h < 14 ? (h + 24) * 60 + m : h * 60 + m;
  };
  const s1 = toMin(start1), e1 = toMin(end1);
  const s2 = toMin(start2), e2 = toMin(end2);
  return s1 < e2 && s2 < e1;
}

// GET /api/bookings
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const status = searchParams.get('status');
  const equipmentId = searchParams.get('equipment_id');
  const search = searchParams.get('search');

  if (!isSupabaseConfigured()) {
    let filtered = [...getDemoBookings()];
    if (date) filtered = filtered.filter(b => b.slot_date === date);
    if (status && status !== 'all') filtered = filtered.filter(b => b.status === status);
    if (equipmentId) filtered = filtered.filter(b => b.equipment_id === parseInt(equipmentId));
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(b => b.customer_name.toLowerCase().includes(q) || b.cell_no.includes(q));
    }
    return NextResponse.json(filtered);
  }

  try {
    let query = supabase
      .from('bookings')
      .select(`*, equipment:equipment_id (id, name, type), booking_addons (*)`)
      .order('slot_start_time', { ascending: true });

    if (date) query = query.eq('slot_date', date);
    if (status && status !== 'all') query = query.eq('status', status);
    if (equipmentId) query = query.eq('equipment_id', parseInt(equipmentId));
    if (search) query = query.or(`customer_name.ilike.%${search}%,cell_no.ilike.%${search}%`);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('GET /api/bookings error:', error);
    return NextResponse.json([]);
  }
}

// POST /api/bookings
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      customer_name, cell_no, equipment_id, slot_date,
      slot_start_time, slot_end_time, duration_minutes,
      price_tier, equipment_price, addons_total,
      total_amount, advance_amount, notes, addons
    } = body;

    const remaining = Math.max(0, total_amount - (advance_amount || 0));
    const paymentStatus = advance_amount >= total_amount ? 'paid' : advance_amount > 0 ? 'partial' : 'unpaid';

    // Demo mode
    if (!isSupabaseConfigured()) {
      const existing = getDemoBookings();
      const hasConflict = existing.some(b =>
        b.equipment_id === equipment_id && b.slot_date === slot_date &&
        b.status !== 'cancelled' &&
        timesOverlap(slot_start_time, slot_end_time, b.slot_start_time, b.slot_end_time)
      );
      if (hasConflict) {
        return NextResponse.json({ error: 'This time slot is already booked!' }, { status: 409 });
      }

      const newBooking = addDemoBooking({
        customer_name, cell_no, equipment_id, slot_date,
        slot_start_time, slot_end_time, duration_minutes,
        price_tier: price_tier || 'actual',
        equipment_price: equipment_price || 0,
        addons_total: addons_total || 0,
        total_amount, advance_amount: advance_amount || 0,
        remaining_amount: remaining, payment_status: paymentStatus,
        status: 'confirmed', reminder_sent: false, whatsapp_sent: false,
        notes, created_at: new Date().toISOString(), addons: addons || [],
      });
      return NextResponse.json(newBooking, { status: 201 });
    }

    // Supabase mode
    const { data: existing, error: checkError } = await supabase
      .from('bookings')
      .select('id, slot_start_time, slot_end_time')
      .eq('equipment_id', equipment_id).eq('slot_date', slot_date).neq('status', 'cancelled');
    if (checkError) throw checkError;

    const hasConflict = existing?.some(booking =>
      timesOverlap(slot_start_time, slot_end_time, booking.slot_start_time, booking.slot_end_time)
    );
    if (hasConflict) return NextResponse.json({ error: 'This time slot is already booked!' }, { status: 409 });

    const { data: booking, error: insertError } = await supabase
      .from('bookings')
      .insert({
        customer_name, cell_no, equipment_id, slot_date,
        slot_start_time, slot_end_time, duration_minutes,
        price_tier: price_tier || 'actual', equipment_price: equipment_price || 0,
        addons_total: addons_total || 0, total_amount,
        advance_amount: advance_amount || 0, remaining_amount: remaining,
        payment_status: paymentStatus, notes, status: 'confirmed'
      }).select().single();
    if (insertError) throw insertError;

    if (addons && addons.length > 0) {
      const addonRows = addons.map(a => ({
        booking_id: booking.id, addon_type: a.addon_type,
        addon_name: a.addon_name, addon_detail: a.addon_detail || null,
        quantity: a.quantity, unit_price: a.unit_price, total_price: a.total_price
      }));
      await supabase.from('booking_addons').insert(addonRows);
    }

    const { data: fullBooking } = await supabase
      .from('bookings')
      .select(`*, equipment:equipment_id (id, name, type), booking_addons (*)`)
      .eq('id', booking.id).single();

    return NextResponse.json(fullBooking, { status: 201 });
  } catch (error) {
    console.error('POST /api/bookings error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
