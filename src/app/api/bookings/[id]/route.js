import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { isSupabaseConfigured, updateDemoBooking, getDemoBookingById } from '@/lib/demoStore';

// PATCH /api/bookings/[id]
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!isSupabaseConfigured()) {
      const updated = updateDemoBooking(id, body);
      if (!updated) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
      return NextResponse.json(updated);
    }

    // Handle adding items during session
    if (body.add_items && body.add_items.length > 0) {
      const addonRows = body.add_items.map(a => ({
        booking_id: parseInt(id), addon_type: a.addon_type,
        addon_name: a.addon_name, addon_detail: a.addon_detail || null,
        quantity: a.quantity, unit_price: a.unit_price, total_price: a.total_price,
      }));
      await supabase.from('booking_addons').insert(addonRows);

      if (body.addons_total_add) {
        const { data: currentBooking } = await supabase
          .from('bookings').select('total_amount, addons_total, advance_amount').eq('id', parseInt(id)).single();
        if (currentBooking) {
          const newAddonsTotal = (currentBooking.addons_total || 0) + body.addons_total_add;
          const newTotal = (currentBooking.total_amount || 0) + body.addons_total_add;
          const newRemaining = Math.max(0, newTotal - (currentBooking.advance_amount || 0));
          const paymentStatus = currentBooking.advance_amount >= newTotal ? 'paid'
            : currentBooking.advance_amount > 0 ? 'partial' : 'unpaid';
          await supabase.from('bookings').update({
            addons_total: newAddonsTotal, total_amount: newTotal,
            remaining_amount: newRemaining, payment_status: paymentStatus,
          }).eq('id', parseInt(id));
        }
      }

      const { data: updatedBooking } = await supabase
        .from('bookings')
        .select(`*, equipment:equipment_id (id, name, type), booking_addons (*)`)
        .eq('id', parseInt(id)).single();
      return NextResponse.json(updatedBooking);
    }

    const updates = {};
    if (body.status !== undefined) updates.status = body.status;
    if (body.reminder_sent !== undefined) updates.reminder_sent = body.reminder_sent;
    if (body.whatsapp_sent !== undefined) updates.whatsapp_sent = body.whatsapp_sent;
    if (body.notes !== undefined) updates.notes = body.notes;

    if (body.advance_amount !== undefined) {
      updates.advance_amount = body.advance_amount;
      const { data: booking } = await supabase
        .from('bookings').select('total_amount').eq('id', parseInt(id)).single();
      if (booking) {
        updates.remaining_amount = Math.max(0, booking.total_amount - body.advance_amount);
        updates.payment_status = body.advance_amount >= booking.total_amount ? 'paid'
          : body.advance_amount > 0 ? 'partial' : 'unpaid';
      }
    }
    if (body.payment_status !== undefined) updates.payment_status = body.payment_status;

    const { data, error } = await supabase
      .from('bookings').update(updates)
      .eq('id', parseInt(id))
      .select(`*, equipment:equipment_id (id, name, type), booking_addons (*)`)
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('PATCH error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/bookings/[id]
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    if (!isSupabaseConfigured()) {
      const updated = updateDemoBooking(id, { status: 'cancelled' });
      return NextResponse.json(updated || { id: parseInt(id), status: 'cancelled' });
    }

    const { data, error } = await supabase
      .from('bookings').update({ status: 'cancelled' })
      .eq('id', parseInt(id)).select().single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
