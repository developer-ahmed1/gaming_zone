/**
 * Generate a WhatsApp wa.me URL with a pre-filled message
 */
export function generateBookingWhatsAppUrl(booking, ownerPhone) {
  const phone = booking.cell_no.replace(/^0/, '92'); // Convert 03xx to 9203xx for Pakistan
  
  const equipmentName = booking.equipment_name || booking.equipment_type || 'Gaming';
  const date = formatDatePretty(booking.slot_date);
  const startTime = formatTimePretty(booking.slot_start_time);
  const endTime = formatTimePretty(booking.slot_end_time);
  
  let message = `🎮 *Mirpurkhas Gaming Zone*\n\n`;
  message += `✅ *Booking Confirmed!*\n\n`;
  message += `👤 Name: ${booking.customer_name}\n`;
  message += `🕹️ Equipment: ${equipmentName}\n`;
  message += `📅 Date: ${date}\n`;
  message += `⏰ Time: ${startTime} - ${endTime}\n`;
  message += `💰 Total: Rs. ${booking.total_amount}\n`;
  
  if (booking.advance_amount > 0) {
    message += `💵 Advance Paid: Rs. ${booking.advance_amount}\n`;
    message += `💳 Remaining: Rs. ${booking.remaining_amount}\n`;
  }
  
  if (booking.addons && booking.addons.length > 0) {
    message += `\n🛒 *Add-ons:*\n`;
    booking.addons.forEach(addon => {
      message += `  • ${addon.addon_name}${addon.addon_detail ? ` (${addon.addon_detail})` : ''} x${addon.quantity} = Rs. ${addon.total_price}\n`;
    });
  }
  
  if (booking.notes) {
    message += `\n📝 Notes: ${booking.notes}\n`;
  }
  
  message += `\n📍 Mirpurkhas Gaming Zone\n`;
  message += `📞 ${ownerPhone || '03063455727'}`;
  
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${phone}?text=${encodedMessage}`;
}

/**
 * Generate a reminder WhatsApp message
 */
export function generateReminderWhatsAppUrl(booking) {
  const phone = booking.cell_no.replace(/^0/, '92');
  
  const equipmentName = booking.equipment_name || booking.equipment_type || 'Gaming';
  const startTime = formatTimePretty(booking.slot_start_time);
  const endTime = formatTimePretty(booking.slot_end_time);
  
  let message = `🎮 *Mirpurkhas Gaming Zone*\n\n`;
  message += `⏰ *Reminder!*\n\n`;
  message += `Hi ${booking.customer_name}! This is a reminder that your booking is in *2 hours*.\n\n`;
  message += `🕹️ Equipment: ${equipmentName}\n`;
  message += `⏰ Time: ${startTime} - ${endTime}\n`;
  
  if (booking.remaining_amount > 0) {
    message += `💳 Balance Due: Rs. ${booking.remaining_amount}\n`;
  }
  
  message += `\nSee you soon! 🎮`;
  
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${phone}?text=${encodedMessage}`;
}

function formatDatePretty(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTimePretty(timeStr) {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
}
