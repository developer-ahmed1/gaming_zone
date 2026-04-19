'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { formatPKR, formatTime, formatDate, getStatusInfo, getPaymentInfo, getEquipmentIcon, getTodayDate, sortBookingsByTime } from '@/lib/utils';
import { generateBookingWhatsAppUrl } from '@/lib/whatsapp';

export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchBookings();
  }, [selectedDate, statusFilter]);

  async function fetchBookings() {
    setLoading(true);
    try {
      let url = `/api/bookings?date=${selectedDate}`;
      if (statusFilter !== 'all') url += `&status=${statusFilter}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data)) {
        setBookings(sortBookingsByTime(data));
      }
    } catch (err) {
      console.error('Failed to fetch bookings', err);
    }
    setLoading(false);
  }

  async function updateStatus(id, status) {
    try {
      await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      fetchBookings();
    } catch (err) {
      console.error('Failed to update', err);
    }
  }

  async function collectBalance(id, totalAmount) {
    try {
      await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ advance_amount: totalAmount, payment_status: 'paid' }),
      });
      fetchBookings();
    } catch (err) {
      console.error('Failed to collect', err);
    }
  }

  const handleSearch = () => {
    fetchBookings();
  };

  const statuses = ['all', 'confirmed', 'in_progress', 'completed', 'cancelled'];
  const statusLabels = { all: 'All', confirmed: 'Confirmed', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled' };

  const totalRevenue = bookings.filter(b => b.status !== 'cancelled').reduce((s, b) => s + b.total_amount, 0);

  return (
    <div className="app-layout">
      <Navigation />
      <main className="main-content">
        <div className="page-header">
          <h1 className="page-title">Bookings</h1>
          <p className="page-subtitle">{formatDate(selectedDate)} • {bookings.length} bookings • {formatPKR(totalRevenue)}</p>
        </div>

        {/* Date Picker */}
        <div style={{ marginBottom: 16 }}>
          <input
            type="date"
            className="form-input"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            style={{ maxWidth: 220 }}
          />
        </div>

        {/* Search */}
        <div className="search-bar">
          <span className="search-bar-icon">🔍</span>
          <input
            type="text"
            className="form-input"
            placeholder="Search by name or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            style={{ paddingLeft: 40 }}
          />
        </div>

        {/* Status Filter */}
        <div className="filter-tabs">
          {statuses.map(s => (
            <button
              key={s}
              className={`filter-tab ${statusFilter === s ? 'active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {statusLabels[s]}
            </button>
          ))}
        </div>

        {/* Booking List */}
        {loading ? (
          <div className="loading-spinner"><div className="spinner" /></div>
        ) : bookings.length === 0 ? (
          <div className="empty-state card">
            <div className="empty-state-icon">📭</div>
            <div className="empty-state-title">No Bookings Found</div>
            <div className="empty-state-desc">Try a different date or filter</div>
          </div>
        ) : (
          <div className="booking-list">
            {bookings.map(b => {
              const statusInfo = getStatusInfo(b.status);
              const paymentInfo = getPaymentInfo(b.payment_status);
              return (
                <div key={b.id} className={`booking-card status-${b.status} animate-fade-in`}>
                  <div className="booking-card-top">
                    <div>
                      <div className="booking-card-customer">{b.customer_name}</div>
                      <div className="booking-card-equipment">
                        {getEquipmentIcon(b.equipment?.type)} {b.equipment?.name}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span className="badge" style={{ background: statusInfo.bg, color: statusInfo.color }}>
                        {statusInfo.label}
                      </span>
                      <span className="badge" style={{ background: paymentInfo.bg, color: paymentInfo.color }}>
                        {paymentInfo.icon} {paymentInfo.label}
                      </span>
                    </div>
                  </div>

                  <div className="booking-card-time">
                    <span>⏰</span>
                    {formatTime(b.slot_start_time)} — {formatTime(b.slot_end_time)}
                  </div>

                  <div className="booking-card-details">
                    <div className="booking-card-detail">📞 <strong>{b.cell_no}</strong></div>
                    <div className="booking-card-detail">💰 <strong>{formatPKR(b.total_amount)}</strong></div>
                    {b.advance_amount > 0 && (
                      <div className="booking-card-detail">💵 Adv: <strong>{formatPKR(b.advance_amount)}</strong></div>
                    )}
                    {b.remaining_amount > 0 && (
                      <div className="booking-card-detail text-amber">💳 Due: <strong>{formatPKR(b.remaining_amount)}</strong></div>
                    )}
                  </div>

                  {b.booking_addons && b.booking_addons.length > 0 && (
                    <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
                      🛒 {b.booking_addons.map(a => `${a.addon_name}${a.addon_detail ? ` ${a.addon_detail}` : ''} x${a.quantity}`).join(', ')}
                    </div>
                  )}

                  {b.notes && (
                    <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-secondary)' }}>📝 {b.notes}</div>
                  )}

                  <div className="booking-card-actions">
                    {b.status !== 'cancelled' && (
                      <a
                        href={generateBookingWhatsAppUrl({
                          ...b,
                          equipment_name: b.equipment?.name,
                          addons: b.booking_addons
                        })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-whatsapp btn-sm"
                      >
                        📱 WhatsApp
                      </a>
                    )}

                    {b.status === 'confirmed' && (
                      <button className="btn btn-success btn-sm" onClick={() => updateStatus(b.id, 'in_progress')}>
                        ▶️ Start
                      </button>
                    )}

                    {b.status === 'in_progress' && (
                      <button className="btn btn-secondary btn-sm" onClick={() => updateStatus(b.id, 'completed')}>
                        ✅ Complete
                      </button>
                    )}

                    {b.remaining_amount > 0 && b.payment_status !== 'paid' && b.status !== 'cancelled' && (
                      <button
                        className="btn btn-sm"
                        style={{ background: 'rgba(34,197,94,0.12)', color: 'var(--accent-green)', border: '1px solid rgba(34,197,94,0.2)' }}
                        onClick={() => collectBalance(b.id, b.total_amount)}
                      >
                        💵 Collect
                      </button>
                    )}

                    {b.status !== 'cancelled' && b.status !== 'completed' && (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => {
                          if (confirm(`Cancel booking for ${b.customer_name}?`)) {
                            updateStatus(b.id, 'cancelled');
                          }
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
