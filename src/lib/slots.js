/**
 * Slot generation and availability checking for the gaming zone
 * Operating hours: 2 PM (14:00) to 2 AM (02:00) — crosses midnight
 */

const OPENING_HOUR = 14; // 2 PM
const CLOSING_HOUR = 2;  // 2 AM (next day)

/**
 * Generate all possible base time slots for a given equipment type
 * @param {number} baseSlotMinutes - 60 for PS5, 30 for steering wheel
 * @returns {Array<{start: string, end: string, label: string}>}
 */
export function generateBaseSlots(baseSlotMinutes = 60) {
  const slots = [];
  
  // Generate slots from 14:00 to 02:00 (next day)
  // Total minutes: from 14:00 to 02:00 = 12 hours = 720 minutes
  let currentMinutes = OPENING_HOUR * 60; // 840 (14:00)
  const endMinutes = (24 + CLOSING_HOUR) * 60; // 1560 (26:00 = 02:00 next day)
  
  while (currentMinutes + baseSlotMinutes <= endMinutes) {
    const startH = Math.floor(currentMinutes / 60) % 24;
    const startM = currentMinutes % 60;
    const endTotalMinutes = currentMinutes + baseSlotMinutes;
    const endH = Math.floor(endTotalMinutes / 60) % 24;
    const endM = endTotalMinutes % 60;
    
    const start = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`;
    const end = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    
    slots.push({
      start,
      end,
      label: `${formatTime12h(start)} - ${formatTime12h(end)}`
    });
    
    currentMinutes += baseSlotMinutes;
  }
  
  return slots;
}

/**
 * Generate extended (multi-slot) options
 * e.g., 2-hour PS5 slots or 1-hour steering wheel slots
 */
export function generateExtendedSlots(baseSlotMinutes, multiplier) {
  const extendedMinutes = baseSlotMinutes * multiplier;
  return generateBaseSlots(extendedMinutes);
}

/**
 * Check if a time slot overlaps with any existing bookings
 * Handles midnight crossing (e.g., 23:00 - 01:00)
 */
export function isSlotAvailable(slotStart, slotEnd, existingBookings) {
  const slotStartMin = timeToMinutesSinceMidnight(slotStart);
  const slotEndMin = timeToMinutesSinceMidnight(slotEnd);
  
  for (const booking of existingBookings) {
    if (booking.status === 'cancelled') continue;
    
    const bookingStartMin = timeToMinutesSinceMidnight(booking.slot_start_time);
    const bookingEndMin = timeToMinutesSinceMidnight(booking.slot_end_time);
    
    if (doTimesOverlap(slotStartMin, slotEndMin, bookingStartMin, bookingEndMin)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Check if two time ranges overlap, handling midnight crossing
 */
function doTimesOverlap(start1, end1, start2, end2) {
  // Normalize times that cross midnight
  const adjustedEnd1 = end1 <= start1 ? end1 + 1440 : end1;
  const adjustedEnd2 = end2 <= start2 ? end2 + 1440 : end2;
  const adjustedStart1 = start1;
  const adjustedStart2 = start2 < OPENING_HOUR * 60 ? start2 + 1440 : start2;
  
  // Use normalized start too
  const s1 = adjustedStart1;
  const e1 = adjustedEnd1;
  const s2 = start2 < OPENING_HOUR * 60 && start2 < end2 ? start2 + 1440 : start2;
  const e2 = end2 <= start2 || (end2 <= OPENING_HOUR * 60 && start2 >= OPENING_HOUR * 60) ? end2 + 1440 : end2;
  
  return s1 < e2 && s2 < e1;
}

/**
 * Convert "HH:MM" to minutes since midnight
 */
function timeToMinutesSinceMidnight(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

/**
 * Format 24h time to 12h format
 */
export function formatTime12h(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
}

/**
 * Get all slots for a given equipment on a specific date with availability info
 */
export function getSlotsWithAvailability(baseSlotMinutes, multiplier, existingBookings) {
  const allDurations = [];
  
  // Base duration slots
  const baseSlots = generateBaseSlots(baseSlotMinutes);
  allDurations.push({
    durationMinutes: baseSlotMinutes,
    label: baseSlotMinutes >= 60 ? `${baseSlotMinutes / 60} Hour` : `${baseSlotMinutes} Min`,
    slots: baseSlots.map(slot => ({
      ...slot,
      available: isSlotAvailable(slot.start, slot.end, existingBookings)
    }))
  });
  
  // Extended duration slots (if multiplier > 1)
  if (multiplier > 1) {
    const extMinutes = baseSlotMinutes * multiplier;
    const extSlots = generateExtendedSlots(baseSlotMinutes, multiplier);
    allDurations.push({
      durationMinutes: extMinutes,
      label: extMinutes >= 60 ? `${extMinutes / 60} Hours` : `${extMinutes} Min`,
      slots: extSlots.map(slot => ({
        ...slot,
        available: isSlotAvailable(slot.start, slot.end, existingBookings)
      }))
    });
  }
  
  return allDurations;
}
