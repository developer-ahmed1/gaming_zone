'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import AddItemsModal from '@/components/AddItemsModal';
import CompleteModal from '@/components/CompleteModal';
import Link from 'next/link';
import { formatPKR, formatTime, formatDate, getStatusInfo, getPaymentInfo, getEquipmentIcon, getTodayDate, getBusinessDate, sortBookingsByTime } from '@/lib/utils';
import { generateBookingWhatsAppUrl, generateReminderWhatsAppUrl } from '@/lib/whatsapp';

export default function DashboardPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [todayDate, setTodayDate] = useState('');
  const [addItemsBooking, setAddItemsBooking] = useState(null);
  const [completeBooking, setCompleteBooking] = useState(null);
  const [cancelConfirm, setCancelConfirm] = useState(null);

  useEffect(() => {
    const bd = getBusinessDate();
    setTodayDate(bd);
    fetchTodayBookings(bd);
    const interval = setInterval(() => fetchTodayBookings(bd), 60000);
    return () => clearInterval(interval);
  }, []);

  async function fetchTodayBookings(dateOverride) {
    const bd = dateOverride || todayDate || getBusinessDate();
    try {
      const res = await fetch(`/api/bookings?date=${bd}`);
      const data = await res.json();
      if (Array.isArray(data)) setBookings(sortBookingsByTime(data));
    } catch (err) { console.error(err); }
    setLoading(false);
  }

  const activeBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'in_progress');
  const completedBookings = bookings.filter(b => b.status === 'completed');

  const [reminders, setReminders] = useState([]);

  // Calculate reminders client-side only to avoid hydration mismatch
  useEffect(() => {
    function calcReminders() {
      const now = new Date();
      return activeBookings.filter(b => {
        if (b.reminder_sent) return false;
        const [h, m] = b.slot_start_time.split(':').map(Number);
        const bookingTime = new Date(b.slot_date + 'T00:00:00');
        bookingTime.setHours(h, m, 0, 0);
        if (h < 14) bookingTime.setDate(bookingTime.getDate() + 1);
        const diff = (bookingTime - now) / (1000 * 60);
        return diff > 0 && diff <= 120;
      });
    }
    setReminders(calcReminders());
  }, [bookings]);

  async function updateBookingStatus(id, status) {
    try {
      await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      fetchTodayBookings();
    } catch (err) { console.error(err); }
  }

  async function markReminderSent(id) {
    try {
      await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminder_sent: true }),
      });
      fetchTodayBookings();
    } catch (err) { console.error(err); }
  }

  if (loading) {
    return (
      <div className="app-layout"><Navigation />
        <main className="main-content"><div className="loading-spinner"><div className="spinner" /></div></main>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Navigation />
      <main className="main-content">
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">{todayDate ? formatDate(todayDate) : '...'} • {activeBookings.length} active</p>
        </div>

        {/* Reminder Banner */}
        {reminders.length > 0 && (
          <div className="reminder-banner animate-fade-in">
            <div className="reminder-banner-title"><span>⏰</span> Reminders Due ({reminders.length})</div>
            {reminders.map(b => (
              <div key={b.id} className="reminder-item">
                <div>
                  <strong>{b.customer_name}</strong>
                  <span className="text-muted" style={{ marginLeft: 8, fontSize: 13 }}>
                    {getEquipmentIcon(b.equipment?.type)} {b.equipment?.name} • {formatTime(b.slot_start_time)}
                  </span>
                </div>
                <a href={generateReminderWhatsAppUrl({ ...b, equipment_name: b.equipment?.name })}
                  target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp btn-sm"
                  onClick={() => markReminderSent(b.id)}>📱 Send</a>
              </div>
            ))}
          </div>
        )}

        {/* Quick Stats */}
        <div className="stats-grid">
          <div className="stat-card purple">
            <div className="stat-icon">🎮</div>
            <div className="stat-value">{activeBookings.length}</div>
            <div className="stat-label">Active</div>
          </div>
          <div className="stat-card green">
            <div className="stat-icon">✅</div>
            <div className="stat-value">{completedBookings.length}</div>
            <div className="stat-label">Done</div>
          </div>
          <Link href="/finance" className="stat-card blue" style={{ textDecoration: 'none' }}>
            <div className="stat-icon">💰</div>
            <div className="stat-value" style={{ fontSize: 14 }}>View</div>
            <div className="stat-label">Finance</div>
          </Link>
        </div>

        {/* Active Bookings */}
        <div className="section-title mb-16"><span>🎮</span> Active Bookings</div>

        {activeBookings.length === 0 ? (
          <div className="empty-state card">
            <div className="empty-state-icon">🕹️</div>
            <div className="empty-state-title">No Active Bookings</div>
            <div className="empty-state-desc">Tap the + button to create a new booking</div>
          </div>
        ) : (
          <div className="booking-list">
            {activeBookings.map(b => {
              const statusInfo = getStatusInfo(b.status);
              const paymentInfo = getPaymentInfo(b.payment_status);
              const isPlaying = b.status === 'in_progress';
              return (
                <div key={b.id} className={`booking-card status-${b.status} ${isPlaying ? 'playing' : ''} animate-slide-up`}>
                  {isPlaying && <div className="playing-indicator"><span className="playing-dot" /><span className="playing-dot" /><span className="playing-dot" /></div>}

                  <div className="booking-card-top">
                    <div>
                      <div className="booking-card-customer">{b.customer_name}</div>
                      <div className="booking-card-equipment">{getEquipmentIcon(b.equipment?.type)} {b.equipment?.name}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span className="badge" style={{ background: statusInfo.bg, color: statusInfo.color }}>{statusInfo.label}</span>
                      <span className="badge" style={{ background: paymentInfo.bg, color: paymentInfo.color }}>{paymentInfo.icon} {paymentInfo.label}</span>
                    </div>
                  </div>

                  <div className="booking-card-time"><span>⏰</span> {formatTime(b.slot_start_time)} — {formatTime(b.slot_end_time)}</div>

                  <div className="booking-card-details">
                    <div className="booking-card-detail">📞 <strong>{b.cell_no}</strong></div>
                    <div className="booking-card-detail">💰 <strong>{formatPKR(b.total_amount)}</strong></div>
                    {b.advance_amount > 0 && <div className="booking-card-detail">💵 Adv: <strong>{formatPKR(b.advance_amount)}</strong></div>}
                    {b.remaining_amount > 0 && <div className="booking-card-detail text-amber">💳 Due: <strong>{formatPKR(b.remaining_amount)}</strong></div>}
                  </div>

                  {b.booking_addons && b.booking_addons.length > 0 && (
                    <div className="addons-pill-row">
                      {b.booking_addons.map((a, i) => (
                        <span key={i} className="addon-pill">
                          {a.addon_type === 'chips' ? '🍟' : '🥤'} {a.addon_name} {a.addon_detail} ×{a.quantity}
                        </span>
                      ))}
                    </div>
                  )}

                  {b.notes && <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-secondary)' }}>📝 {b.notes}</div>}

                  <div className="booking-card-actions">
                    <a href={generateBookingWhatsAppUrl({ ...b, equipment_name: b.equipment?.name, addons: b.booking_addons })}
                      target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp btn-sm">📱 WhatsApp</a>

                    {b.status === 'confirmed' && (
                      <button className="btn btn-success btn-sm" onClick={() => updateBookingStatus(b.id, 'in_progress')}>
                        ▶️ Start Session
                      </button>
                    )}

                    {isPlaying && (
                      <button className="btn btn-sm action-add-items" onClick={() => setAddItemsBooking(b)}>
                        🛒 Add Items
                      </button>
                    )}

                    {isPlaying && (
                      <button className="btn btn-sm action-complete" onClick={() => setCompleteBooking(b)}>
                        ✅ Complete & Pay
                      </button>
                    )}

                    <button className="btn btn-danger btn-sm" onClick={() => setCancelConfirm(b)}>
                      ✕ Cancel
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Completed */}
        {completedBookings.length > 0 && (
          <>
            <div className="section-title mt-24 mb-16"><span>✅</span> Completed ({completedBookings.length})</div>
            <div className="booking-list">
              {completedBookings.map(b => (
                <div key={b.id} className="booking-card status-completed" style={{ opacity: 0.65 }}>
                  <div className="booking-card-top">
                    <div>
                      <div className="booking-card-customer">{b.customer_name}</div>
                      <div className="booking-card-equipment">{getEquipmentIcon(b.equipment?.type)} {b.equipment?.name}</div>
                    </div>
                    <span className="badge" style={{ background: 'rgba(156,163,175,0.15)', color: 'var(--text-secondary)' }}>Done</span>
                  </div>
                  <div className="booking-card-time" style={{ color: 'var(--text-secondary)' }}>
                    ⏰ {formatTime(b.slot_start_time)} — {formatTime(b.slot_end_time)} • {formatPKR(b.total_amount)}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* FAB */}
        <Link href="/booking" className="fab" aria-label="New Booking">+</Link>

        {/* Add Items Modal */}
        {addItemsBooking && (
          <AddItemsModal booking={addItemsBooking} onClose={() => setAddItemsBooking(null)} onItemsAdded={fetchTodayBookings} />
        )}

        {/* Complete Modal */}
        {completeBooking && (
          <CompleteModal booking={completeBooking} onClose={() => setCompleteBooking(null)} onComplete={fetchTodayBookings} />
        )}

        {/* Cancel Confirmation Modal */}
        {cancelConfirm && (
          <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setCancelConfirm(null)}>
            <div className="modal" style={{ maxWidth: 400 }}>
              <h2 className="modal-title">⚠️ Cancel Booking?</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 8 }}>
                Are you sure you want to cancel the booking for <strong style={{ color: 'var(--text-primary)' }}>{cancelConfirm.customer_name}</strong>?
              </p>
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 'var(--radius-md)', padding: 12, marginTop: 12 }}>
                <div style={{ fontSize: 13 }}>
                  <strong>{cancelConfirm.equipment?.name}</strong> • {formatTime(cancelConfirm.slot_start_time)} — {formatTime(cancelConfirm.slot_end_time)}
                </div>
                <div style={{ fontSize: 13, marginTop: 4, color: 'var(--text-secondary)' }}>
                  This will free up the slot for new bookings
                </div>
              </div>
              <div className="modal-actions">
                <button className="btn btn-ghost" onClick={() => setCancelConfirm(null)} style={{ flex: 1 }}>Keep Booking</button>
                <button className="btn btn-danger btn-lg" style={{ flex: 1 }}
                  onClick={() => { updateBookingStatus(cancelConfirm.id, 'cancelled'); setCancelConfirm(null); }}>
                  ✕ Cancel Booking
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
