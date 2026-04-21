/**
 * Utility functions for the Gaming Zone booking system
 */

/**
 * Format currency in PKR
 */
export function formatPKR(amount) {
  return `Rs. ${Number(amount || 0).toLocaleString('en-PK')}`;
}

/**
 * Format date for display
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-PK', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Format date as YYYY-MM-DD
 */
export function toISODate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get today's date in local timezone as YYYY-MM-DD
 */
export function getTodayDate() {
  return toISODate(new Date());
}

/**
 * Get the current "business date" — accounts for midnight crossing.
 * If it's between 12:00 AM and the closing hour (default 2 AM),
 * the business date is still yesterday.
 * @param {number} closingHour - The hour the zone closes (default 2, meaning 2 AM)
 */
export function getBusinessDate(closingHour = 2) {
  const now = new Date();
  const h = now.getHours();
  // If current hour is between midnight and closing, we're still in yesterday's business day
  if (h < closingHour) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return toISODate(yesterday);
  }
  return toISODate(now);
}

/**
 * Get the two calendar dates that make up a business day.
 * Business day "2026-04-22" = April 22 (from opening) + April 23 (until closing).
 * Returns { primaryDate, nextDate } so queries can fetch both.
 */
export function getBusinessDayDates(businessDate) {
  const d = new Date(businessDate + 'T00:00:00');
  const next = new Date(d);
  next.setDate(next.getDate() + 1);
  return {
    primaryDate: toISODate(d),
    nextDate: toISODate(next),
  };
}

/**
 * Format time for display (24h -> 12h)
 */
export function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
}

/**
 * Get status badge info
 */
export function getStatusInfo(status) {
  const map = {
    confirmed: { label: 'Confirmed', color: 'var(--accent-blue)', bg: 'rgba(59,130,246,0.15)' },
    in_progress: { label: 'In Progress', color: 'var(--accent-green)', bg: 'rgba(34,197,94,0.15)' },
    completed: { label: 'Completed', color: 'var(--text-secondary)', bg: 'rgba(156,163,175,0.15)' },
    cancelled: { label: 'Cancelled', color: 'var(--accent-red)', bg: 'rgba(239,68,68,0.15)' }
  };
  return map[status] || map.confirmed;
}

/**
 * Get payment status badge info
 */
export function getPaymentInfo(paymentStatus) {
  const map = {
    paid: { label: 'Paid', color: 'var(--accent-green)', bg: 'rgba(34,197,94,0.15)', icon: '🟢' },
    partial: { label: 'Partial', color: 'var(--accent-amber)', bg: 'rgba(245,158,11,0.15)', icon: '🟡' },
    unpaid: { label: 'Unpaid', color: 'var(--accent-red)', bg: 'rgba(239,68,68,0.15)', icon: '🔴' }
  };
  return map[paymentStatus] || map.unpaid;
}

/**
 * Calculate payment status based on amounts
 */
export function calculatePaymentStatus(totalAmount, advanceAmount) {
  if (advanceAmount >= totalAmount) return 'paid';
  if (advanceAmount > 0) return 'partial';
  return 'unpaid';
}

/**
 * Equipment type icon
 */
export function getEquipmentIcon(type) {
  const map = {
    ps5: '🎮',
    steering_wheel: '🏎️',
    custom: '🕹️'
  };
  return map[type] || '🎮';
}

/**
 * Debounce function
 */
export function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Check if a date is today
 */
export function isToday(dateStr) {
  return dateStr === getTodayDate();
}

/**
 * Sort bookings by time
 */
export function sortBookingsByTime(bookings) {
  return [...bookings].sort((a, b) => {
    // Convert times to comparable values, handling midnight crossing
    const getMinutes = (time) => {
      const [h, m] = time.split(':').map(Number);
      return h < 14 ? (h + 24) * 60 + m : h * 60 + m;
    };
    return getMinutes(a.slot_start_time) - getMinutes(b.slot_start_time);
  });
}
