'use client';

import { useState } from 'react';
import { formatPKR, formatTime } from '@/lib/utils';

export default function CompleteModal({ booking, onClose, onComplete }) {
  const [collectPayment, setCollectPayment] = useState(false);
  const [saving, setSaving] = useState(false);

  const totalAmount = booking.total_amount || 0;
  const advancePaid = booking.advance_amount || 0;
  const remaining = Math.max(0, totalAmount - advancePaid);
  const addonItems = booking.booking_addons || [];

  async function handleComplete() {
    setSaving(true);
    try {
      const updates = { status: 'completed' };
      if (collectPayment && remaining > 0) {
        updates.advance_amount = totalAmount;
        updates.payment_status = 'paid';
      }
      await fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      onComplete && onComplete();
    } catch (err) { console.error(err); }
    setSaving(false);
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2 className="modal-title">✅ Complete Session</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '-12px 0 20px' }}>
          <strong>{booking.customer_name}</strong> — {booking.equipment?.name}
        </p>

        {/* Session Summary */}
        <div className="card mb-20" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}>
          <div className="summary-row">
            <span className="summary-label">Time</span>
            <span className="summary-value">{formatTime(booking.slot_start_time)} — {formatTime(booking.slot_end_time)}</span>
          </div>
          <div className="summary-row">
            <span className="summary-label">Equipment</span>
            <span className="summary-value">{formatPKR(booking.equipment_price)} ({booking.price_tier === 'actual' ? 'Actual' : booking.price_tier === 'week_discount' ? '1st Week' : '1st Month'})</span>
          </div>

          {addonItems.length > 0 && (
            <>
              <div className="divider" style={{ margin: '12px 0' }} />
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--text-secondary)' }}>🛒 Items Ordered</div>
              {addonItems.map((a, i) => (
                <div key={i} className="summary-row" style={{ fontSize: 13 }}>
                  <span>{a.addon_name} {a.addon_detail} ×{a.quantity}</span>
                  <span>{formatPKR(a.total_price)}</span>
                </div>
              ))}
            </>
          )}

          <div className="divider" style={{ margin: '12px 0' }} />
          <div className="summary-row" style={{ fontWeight: 800, fontSize: 16 }}>
            <span>Total Bill</span>
            <span className="text-green">{formatPKR(totalAmount)}</span>
          </div>

          {advancePaid > 0 && (
            <div className="summary-row" style={{ fontSize: 13 }}>
              <span className="summary-label">Advance Paid</span>
              <span>− {formatPKR(advancePaid)}</span>
            </div>
          )}

          {remaining > 0 && (
            <div className="summary-row" style={{ fontWeight: 700, color: 'var(--accent-amber)', fontSize: 16, marginTop: 4 }}>
              <span>Balance Due</span>
              <span>{formatPKR(remaining)}</span>
            </div>
          )}
        </div>

        {/* Payment Collection */}
        {remaining > 0 && (
          <div className="card mb-20" style={{ cursor: 'pointer' }}
            onClick={() => setCollectPayment(!collectPayment)}>
            <div className="flex-between">
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>💵 Collect Balance Now</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Mark {formatPKR(remaining)} as paid
                </div>
              </div>
              <div className={`toggle ${collectPayment ? 'active' : ''}`} />
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button className="btn btn-success btn-lg" onClick={handleComplete} disabled={saving} style={{ flex: 2 }}>
            {saving ? 'Completing...' : `✅ Complete Session`}
          </button>
        </div>
      </div>
    </div>
  );
}
