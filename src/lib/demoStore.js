/**
 * Shared in-memory store for demo mode bookings.
 * Used when Supabase is not configured so the app works for testing.
 */

const DEMO_EQUIPMENT = {
  1: { id: 1, name: 'PS5 #1', type: 'ps5' },
  2: { id: 2, name: 'PS5 #2', type: 'ps5' },
  3: { id: 3, name: 'Steering Wheel', type: 'steering_wheel' },
};

let demoBookings = [];
let demoIdCounter = 1;

export function isSupabaseConfigured() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL && 
         !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
}

export function getDemoBookings() {
  return demoBookings;
}

export function addDemoBooking(booking) {
  const id = demoIdCounter++;
  const newBooking = {
    ...booking,
    id,
    equipment: DEMO_EQUIPMENT[booking.equipment_id] || { id: booking.equipment_id, name: `Equipment #${booking.equipment_id}`, type: 'custom' },
    booking_addons: (booking.addons || []).map((a, i) => ({ id: i + 1, booking_id: id, ...a })),
  };
  demoBookings.push(newBooking);
  return newBooking;
}

export function updateDemoBooking(id, updates) {
  const numericId = parseInt(id);
  const idx = demoBookings.findIndex(b => b.id === numericId);
  if (idx === -1) return null;
  
  // Handle adding items
  if (updates.add_items && updates.add_items.length > 0) {
    const existingAddons = demoBookings[idx].booking_addons || [];
    const newAddons = updates.add_items.map((a, i) => ({
      id: existingAddons.length + i + 1,
      booking_id: numericId,
      ...a,
    }));
    demoBookings[idx].booking_addons = [...existingAddons, ...newAddons];
    
    if (updates.addons_total_add) {
      demoBookings[idx].addons_total = (demoBookings[idx].addons_total || 0) + updates.addons_total_add;
      demoBookings[idx].total_amount = (demoBookings[idx].total_amount || 0) + updates.addons_total_add;
      demoBookings[idx].remaining_amount = Math.max(0, demoBookings[idx].total_amount - (demoBookings[idx].advance_amount || 0));
      demoBookings[idx].payment_status = demoBookings[idx].advance_amount >= demoBookings[idx].total_amount ? 'paid'
        : demoBookings[idx].advance_amount > 0 ? 'partial' : 'unpaid';
    }
  }

  // Handle regular field updates
  const fieldUpdates = { ...updates };
  delete fieldUpdates.add_items;
  delete fieldUpdates.addons_total_add;

  Object.assign(demoBookings[idx], fieldUpdates);

  // Recalculate payment if advance changed
  if (updates.advance_amount !== undefined) {
    demoBookings[idx].remaining_amount = Math.max(0, demoBookings[idx].total_amount - demoBookings[idx].advance_amount);
    demoBookings[idx].payment_status = demoBookings[idx].advance_amount >= demoBookings[idx].total_amount ? 'paid'
      : demoBookings[idx].advance_amount > 0 ? 'partial' : 'unpaid';
  }

  return demoBookings[idx];
}

export function getDemoBookingById(id) {
  return demoBookings.find(b => b.id === parseInt(id)) || null;
}
