'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { formatPKR, getTodayDate, getEquipmentIcon } from '@/lib/utils';
import { generateBaseSlots, generateExtendedSlots } from '@/lib/slots';
import { generateBookingWhatsAppUrl } from '@/lib/whatsapp';

export default function BookingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [equipment, setEquipment] = useState([]);
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existingBookings, setExistingBookings] = useState([]);
  const [toast, setToast] = useState(null);

  // Form state
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [selectedDuration, setSelectedDuration] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [priceTier, setPriceTier] = useState('actual');
  const [customerName, setCustomerName] = useState('');
  const [cellNo, setCellNo] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        setEquipment(data.equipment || []);
        setPrices(data.prices || []);
      } catch (err) {
        console.error('Failed to load settings', err);
      }
      setLoading(false);
    }
    loadSettings();
  }, []);

  useEffect(() => {
    if (selectedEquipment && selectedDate) fetchExistingBookings();
  }, [selectedEquipment, selectedDate]);

  async function fetchExistingBookings() {
    try {
      const res = await fetch(`/api/bookings?date=${selectedDate}&equipment_id=${selectedEquipment.id}`);
      const data = await res.json();
      setExistingBookings(Array.isArray(data) ? data.filter(b => b.status !== 'cancelled') : []);
    } catch (err) { console.error('Failed to fetch bookings', err); }
  }

  function getSlots() {
    if (!selectedEquipment) return [];
    const base = selectedEquipment.base_slot_minutes;
    const multiplier = selectedEquipment.max_slot_multiplier;
    const durations = [];
    
    const baseSlots = generateBaseSlots(base);
    durations.push({
      minutes: base,
      label: base >= 60 ? `${base / 60} Hour` : `${base} Min`,
      slots: baseSlots.map(s => ({
        ...s,
        available: !existingBookings.some(b => timesOverlap(s.start, s.end, b.slot_start_time, b.slot_end_time))
      }))
    });

    if (multiplier > 1) {
      const extMin = base * multiplier;
      const extSlots = generateExtendedSlots(base, multiplier);
      durations.push({
        minutes: extMin,
        label: extMin >= 60 ? `${extMin / 60} Hours` : `${extMin} Min`,
        slots: extSlots.map(s => ({
          ...s,
          available: !existingBookings.some(b => timesOverlap(s.start, s.end, b.slot_start_time, b.slot_end_time))
        }))
      });
    }
    return durations;
  }

  function timesOverlap(s1, e1, s2, e2) {
    const toMin = (t) => {
      const [h, m] = t.split(':').map(Number);
      return h < 14 ? (h + 24) * 60 + m : h * 60 + m;
    };
    const a1 = toMin(s1), b1 = toMin(e1), a2 = toMin(s2), b2 = toMin(e2);
    return a1 < b2 && a2 < b1;
  }

  function getPrice() {
    if (!selectedEquipment || !selectedDuration) return { actual: 0, week: 0, month: 0 };
    const p = prices.find(pr => pr.equipment_type === selectedEquipment.type && pr.duration_minutes === selectedDuration.minutes);
    if (!p) return { actual: 0, week: 0, month: 0 };
    return { actual: p.actual_price, week: p.week_discount_price, month: p.month_discount_price };
  }

  function getEquipmentPrice() {
    const p = getPrice();
    return priceTier === 'week_discount' ? p.week : priceTier === 'month_discount' ? p.month : p.actual;
  }

  async function checkReturningCustomer(phone) {
    if (phone.length >= 10) {
      try {
        const res = await fetch(`/api/bookings?search=${phone}`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0 && !customerName) setCustomerName(data[0].customer_name);
      } catch (err) { }
    }
  }

  async function handleSubmit() {
    if (!selectedEquipment || !selectedSlot || !customerName || !cellNo) return;
    setSubmitting(true);
    try {
      const advance = parseInt(advanceAmount) || 0;
      const total = getEquipmentPrice();
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName, cell_no: cellNo,
          equipment_id: selectedEquipment.id, slot_date: selectedDate,
          slot_start_time: selectedSlot.start, slot_end_time: selectedSlot.end,
          duration_minutes: selectedDuration.minutes, price_tier: priceTier,
          equipment_price: getEquipmentPrice(), addons_total: 0,
          total_amount: total, advance_amount: advance, notes, addons: []
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setToast({ type: 'error', message: err.error || 'Failed to create booking' });
        setSubmitting(false);
        return;
      }
      const booking = await res.json();
      const waUrl = generateBookingWhatsAppUrl({ ...booking, equipment_name: selectedEquipment.name, addons: [] });
      window.open(waUrl, '_blank');
      setToast({ type: 'success', message: 'Booking created! 🎉' });
      setTimeout(() => router.push('/dashboard'), 1500);
    } catch (err) {
      setToast({ type: 'error', message: 'Something went wrong.' });
    }
    setSubmitting(false);
  }

  const totalSteps = 4;
  const slots = getSlots();
  const price = getPrice();

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
          <h1 className="page-title">New Booking</h1>
          <p className="page-subtitle">Step {step} of {totalSteps}</p>
        </div>

        <div className="steps">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div key={i} className={`step-dot ${i + 1 === step ? 'active' : ''} ${i + 1 < step ? 'done' : ''}`} />
          ))}
        </div>

        {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}

        {/* Step 1: Equipment & Date */}
        {step === 1 && (
          <div className="animate-slide-up">
            <div className="section-title mb-16">🎮 Select Equipment</div>
            <div className="equipment-grid">
              {equipment.filter(e => e.is_active).map(eq => (
                <div key={eq.id} className={`equipment-card ${selectedEquipment?.id === eq.id ? 'selected' : ''}`}
                  onClick={() => { setSelectedEquipment(eq); setSelectedDuration(null); setSelectedSlot(null); }}>
                  <span className="equipment-card-icon">{getEquipmentIcon(eq.type)}</span>
                  <span className="equipment-card-name">{eq.name}</span>
                </div>
              ))}
            </div>
            {selectedEquipment && (
              <>
                <div className="section-title mt-24 mb-16">📅 Select Date</div>
                <input type="date" className="form-input" value={selectedDate}
                  min={getTodayDate()} onChange={e => { setSelectedDate(e.target.value); setSelectedSlot(null); }}
                  style={{ maxWidth: 300 }} />
              </>
            )}
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button className="btn btn-primary btn-lg btn-full" disabled={!selectedEquipment}
                onClick={() => {
                  const s = getSlots();
                  if (s.length > 0 && !selectedDuration) setSelectedDuration(s[0]);
                  setStep(2);
                }}>Next — Select Time →</button>
            </div>
          </div>
        )}

        {/* Step 2: Time Slot */}
        {step === 2 && (
          <div className="animate-slide-up">
            <div className="section-title mb-12">
              {getEquipmentIcon(selectedEquipment.type)} {selectedEquipment.name} — {selectedDate}
            </div>
            <div className="duration-tabs">
              {slots.map(d => (
                <button key={d.minutes} className={`duration-tab ${selectedDuration?.minutes === d.minutes ? 'active' : ''}`}
                  onClick={() => { setSelectedDuration(d); setSelectedSlot(null); }}>{d.label}</button>
              ))}
            </div>
            {selectedDuration && (
              <div className="slot-grid">
                {selectedDuration.slots.map((slot, i) => (
                  <button key={i}
                    className={`slot-btn ${slot.available ? 'available' : 'booked'} ${selectedSlot?.start === slot.start && selectedSlot?.end === slot.end ? 'selected' : ''}`}
                    disabled={!slot.available} onClick={() => setSelectedSlot(slot)}>
                    {slot.label}
                    {!slot.available && <span className="slot-booked-tag">Booked</span>}
                  </button>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
              <button className="btn btn-primary btn-lg" disabled={!selectedSlot}
                onClick={() => setStep(3)} style={{ flex: 1 }}>Next — Customer Details →</button>
            </div>
          </div>
        )}

        {/* Step 3: Customer Details & Price */}
        {step === 3 && (
          <div className="animate-slide-up">
            <div className="section-title mb-16">👤 Customer Details</div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input type="tel" className="form-input" placeholder="03xx xxxxxxx" value={cellNo}
                onChange={e => { setCellNo(e.target.value); checkReturningCustomer(e.target.value); }} />
            </div>
            <div className="form-group">
              <label className="form-label">Customer Name</label>
              <input type="text" className="form-input" placeholder="Enter name" value={customerName}
                onChange={e => setCustomerName(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Notes (optional)</label>
              <textarea className="form-input form-textarea" placeholder="Any special notes..." value={notes}
                onChange={e => setNotes(e.target.value)} />
            </div>
            <div className="section-title mt-20 mb-12">💰 Price Tier</div>
            <div className="tier-selector">
              <div className={`tier-option ${priceTier === 'actual' ? 'selected' : ''}`} onClick={() => setPriceTier('actual')}>
                <div className="tier-option-label">Actual</div>
                <div className="tier-option-price text-green">{formatPKR(price.actual)}</div>
              </div>
              <div className={`tier-option ${priceTier === 'week_discount' ? 'selected' : ''}`} onClick={() => setPriceTier('week_discount')}>
                <div className="tier-option-label">1st Week</div>
                <div className="tier-option-price text-amber">{formatPKR(price.week)}</div>
              </div>
              <div className={`tier-option ${priceTier === 'month_discount' ? 'selected' : ''}`} onClick={() => setPriceTier('month_discount')}>
                <div className="tier-option-label">1st Month</div>
                <div className="tier-option-price text-purple">{formatPKR(price.month)}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button className="btn btn-ghost" onClick={() => setStep(2)}>← Back</button>
              <button className="btn btn-primary btn-lg" disabled={!customerName || !cellNo}
                onClick={() => setStep(4)} style={{ flex: 1 }}>Next — Review & Confirm →</button>
            </div>
          </div>
        )}

        {/* Step 4: Summary & Confirm */}
        {step === 4 && (
          <div className="animate-slide-up">
            <div className="card summary-card mb-20">
              <div className="section-title mb-16">📋 Booking Summary</div>
              <div className="summary-row"><span className="summary-label">Customer</span><span className="summary-value">{customerName}</span></div>
              <div className="summary-row"><span className="summary-label">Phone</span><span className="summary-value">{cellNo}</span></div>
              <div className="summary-row"><span className="summary-label">Equipment</span><span className="summary-value">{getEquipmentIcon(selectedEquipment.type)} {selectedEquipment.name}</span></div>
              <div className="summary-row"><span className="summary-label">Date</span><span className="summary-value">{selectedDate}</span></div>
              <div className="summary-row"><span className="summary-label">Time</span><span className="summary-value">{selectedSlot?.label}</span></div>
              <div className="summary-row"><span className="summary-label">Duration</span><span className="summary-value">{selectedDuration?.label}</span></div>
              <div className="divider" />
              <div className="summary-row total"><span>Total</span><span className="summary-value">{formatPKR(getEquipmentPrice())}</span></div>
            </div>

            <div className="card mb-20">
              <div className="section-title mb-12">💵 Advance Payment</div>
              <div className="form-group" style={{ marginBottom: 8 }}>
                <input type="number" className="form-input" placeholder="Enter advance (PKR)"
                  value={advanceAmount} onChange={e => setAdvanceAmount(e.target.value)} max={getEquipmentPrice()} min={0} />
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn btn-sm btn-secondary" onClick={() => setAdvanceAmount(String(Math.floor(getEquipmentPrice() / 2)))}>
                  Half ({formatPKR(Math.floor(getEquipmentPrice() / 2))})
                </button>
                <button className="btn btn-sm btn-secondary" onClick={() => setAdvanceAmount(String(getEquipmentPrice()))}>
                  Full ({formatPKR(getEquipmentPrice())})
                </button>
                <button className="btn btn-sm btn-ghost" onClick={() => setAdvanceAmount('')}>None</button>
              </div>
              {advanceAmount && parseInt(advanceAmount) > 0 && (
                <div style={{ marginTop: 12, fontSize: 14 }}>
                  <span className="text-muted">Remaining: </span>
                  <strong className="text-amber">{formatPKR(Math.max(0, getEquipmentPrice() - parseInt(advanceAmount)))}</strong>
                </div>
              )}
            </div>

            <div className="info-banner mb-20">
              <span>ℹ️</span> Chips & drinks can be added during the gaming session from the dashboard
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-ghost" onClick={() => setStep(3)}>← Back</button>
              <button className="btn btn-whatsapp btn-lg" onClick={handleSubmit}
                disabled={submitting} style={{ flex: 1 }}>
                {submitting ? 'Creating...' : '✅ Confirm & Send WhatsApp'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
