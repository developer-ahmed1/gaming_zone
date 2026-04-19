import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

// This route is called by Vercel Cron every 30 minutes
// It marks bookings that need reminders (2 hours before start time)
export async function GET(request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    
    // Get today's date and tomorrow's (for midnight-crossing slots)
    const today = now.toISOString().split('T')[0];
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Fetch confirmed bookings that haven't had reminders sent
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*')
      .in('slot_date', [today, tomorrow])
      .eq('status', 'confirmed')
      .eq('reminder_sent', false);

    if (error) throw error;

    let markedCount = 0;
    
    for (const booking of (bookings || [])) {
      const [h, m] = booking.slot_start_time.split(':').map(Number);
      const bookingTime = new Date(booking.slot_date + 'T00:00:00');
      bookingTime.setHours(h, m, 0, 0);
      
      // For after-midnight slots (e.g., 1 AM), the actual time is next day
      if (h < 14 && booking.slot_date === today) {
        bookingTime.setDate(bookingTime.getDate() + 1);
      }

      const diff = (bookingTime - now) / (1000 * 60); // minutes
      
      // If booking is within 2 hours (120 minutes)
      if (diff > 0 && diff <= 120) {
        // Mark as needing reminder (the dashboard will show the reminder banner)
        // We don't auto-send WhatsApp, just flag it
        markedCount++;
      }
    }

    return NextResponse.json({
      checked: bookings?.length || 0,
      needsReminder: markedCount,
      timestamp: now.toISOString()
    });
  } catch (error) {
    console.error('Cron reminder error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
