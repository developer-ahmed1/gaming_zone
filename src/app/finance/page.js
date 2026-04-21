'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Navigation from '@/components/Navigation';
import { formatPKR, formatDate, formatTime, getBusinessDate, toISODate, getEquipmentIcon } from '@/lib/utils';

export default function FinancePage() {
  const [businessDate, setBusinessDate] = useState('');
  const [summary, setSummary] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [chartRange, setChartRange] = useState('week');
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [closeConfirm, setCloseConfirm] = useState(false);
  const chartRef = useRef(null);

  // Initialize business date on client only
  useEffect(() => {
    setBusinessDate(getBusinessDate());
  }, []);

  // Fetch daily summary
  useEffect(() => {
    if (!businessDate) return;
    setLoading(true);
    fetch(`/api/finance?date=${businessDate}`)
      .then(r => r.json())
      .then(data => setSummary(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [businessDate]);

  // Fetch chart data
  useEffect(() => {
    setChartLoading(true);
    fetch(`/api/finance?range=${chartRange}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setChartData(data); })
      .catch(err => console.error(err))
      .finally(() => setChartLoading(false));
  }, [chartRange]);

  // Draw chart
  const drawChart = useCallback(() => {
    const canvas = chartRef.current;
    if (!canvas || chartData.length === 0) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const padding = { top: 20, right: 16, bottom: 40, left: 60 };
    const w = rect.width - padding.left - padding.right;
    const h = rect.height - padding.top - padding.bottom;

    const maxVal = Math.max(...chartData.map(d => d.totalCollected), 1);
    const barWidth = Math.max(8, Math.min(32, (w / chartData.length) - 4));
    const gap = (w - barWidth * chartData.length) / (chartData.length + 1);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + h - (h * i / 4);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + w, y);
      ctx.stroke();

      // Label
      ctx.fillStyle = '#555570';
      ctx.font = '10px Outfit';
      ctx.textAlign = 'right';
      const val = Math.round(maxVal * i / 4);
      ctx.fillText(val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toString(), padding.left - 8, y + 4);
    }

    // Bars
    chartData.forEach((d, i) => {
      const x = padding.left + gap + i * (barWidth + gap);
      const barH = (d.totalCollected / maxVal) * h;
      const y = padding.top + h - barH;

      // Gradient bar
      const grad = ctx.createLinearGradient(x, y, x, y + barH);
      grad.addColorStop(0, '#8b5cf6');
      grad.addColorStop(1, '#6d28d9');
      ctx.fillStyle = grad;

      // Rounded top
      const radius = Math.min(barWidth / 2, 4);
      ctx.beginPath();
      ctx.moveTo(x, y + barH);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.lineTo(x + barWidth - radius, y);
      ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
      ctx.lineTo(x + barWidth, y + barH);
      ctx.closePath();
      ctx.fill();

      // Bar glow
      ctx.shadowColor = 'rgba(139,92,246,0.3)';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Bottom labels
      ctx.fillStyle = '#555570';
      ctx.font = '9px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText(d.label, x + barWidth / 2, padding.top + h + 16);
    });
  }, [chartData]);

  useEffect(() => {
    drawChart();
    window.addEventListener('resize', drawChart);
    return () => window.removeEventListener('resize', drawChart);
  }, [drawChart]);

  function navigateDay(delta) {
    const d = new Date(businessDate + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    setBusinessDate(toISODate(d));
  }

  async function handleCloseDay() {
    if (!summary) return;
    setClosing(true);
    try {
      await fetch('/api/finance/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_date: businessDate,
          total_bookings: summary.totalBookings,
          equipment_revenue: summary.equipmentRevenue,
          addons_revenue: summary.addonsRevenue,
          advance_collected: summary.advanceCollected,
          balance_collected: summary.balanceCollected,
          total_collected: summary.totalCollected,
        }),
      });
      // Refresh
      const res = await fetch(`/api/finance?date=${businessDate}`);
      const data = await res.json();
      setSummary(data);
    } catch (err) { console.error(err); }
    setClosing(false);
    setCloseConfirm(false);
  }

  const isToday = businessDate === getBusinessDate();
  const isClosed = summary?.closed;

  return (
    <div className="app-layout">
      <Navigation />
      <main className="main-content">
        <div className="page-header">
          <h1 className="page-title">💰 Finance</h1>
          <p className="page-subtitle">Business Day Revenue & Tracking</p>
        </div>

        {/* Date Navigation */}
        <div className="finance-date-nav">
          <button className="btn btn-ghost btn-sm" onClick={() => navigateDay(-1)}>← Prev</button>
          <div className="finance-date-center">
            <div className="finance-date-label">{businessDate ? formatDate(businessDate) : '...'}</div>
            {isToday && <span className="badge badge-green">Today</span>}
            {isClosed && <span className="badge badge-locked">🔒 Closed</span>}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigateDay(1)}>Next →</button>
        </div>

        {loading ? (
          <div className="loading-spinner"><div className="spinner" /></div>
        ) : summary ? (
          <>
            {/* Summary Cards */}
            <div className="finance-grid">
              <div className="finance-card">
                <div className="finance-card-icon">📋</div>
                <div className="finance-card-value">{summary.totalBookings}</div>
                <div className="finance-card-label">Total Bookings</div>
                <div className="finance-card-sub">{summary.completedBookings} completed</div>
              </div>
              <div className="finance-card highlight-green">
                <div className="finance-card-icon">💵</div>
                <div className="finance-card-value">{formatPKR(summary.totalCollected)}</div>
                <div className="finance-card-label">Total Collected</div>
                <div className="finance-card-sub">Advance + Balance</div>
              </div>
              <div className="finance-card">
                <div className="finance-card-icon">🎮</div>
                <div className="finance-card-value">{formatPKR(summary.equipmentRevenue)}</div>
                <div className="finance-card-label">Equipment Revenue</div>
                <div className="finance-card-sub">Session fees</div>
              </div>
              <div className="finance-card">
                <div className="finance-card-icon">🛒</div>
                <div className="finance-card-value">{formatPKR(summary.addonsRevenue)}</div>
                <div className="finance-card-label">Add-ons Revenue</div>
                <div className="finance-card-sub">Chips & drinks</div>
              </div>
            </div>

            {/* Payment Breakdown */}
            <div className="card finance-breakdown">
              <div className="section-title mb-16">💳 Payment Breakdown</div>
              <div className="summary-row">
                <span className="summary-label">Total Billed</span>
                <span className="summary-value">{formatPKR(summary.totalBilled)}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">↳ Advance Collected</span>
                <span className="summary-value text-green">{formatPKR(summary.advanceCollected)}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">↳ Balance Collected</span>
                <span className="summary-value text-green">{formatPKR(summary.balanceCollected)}</span>
              </div>
              <div className="divider" />
              <div className="summary-row total">
                <span>Cash In Hand</span>
                <span className="summary-value text-green">{formatPKR(summary.totalCollected)}</span>
              </div>
              {summary.totalBilled > summary.totalCollected && (
                <div className="summary-row" style={{ marginTop: 4 }}>
                  <span className="summary-label">Outstanding</span>
                  <span className="summary-value text-amber">{formatPKR(summary.totalBilled - summary.totalCollected)}</span>
                </div>
              )}
            </div>

            {/* Add-ons Breakdown */}
            {Object.keys(summary.addonItems || {}).length > 0 && (
              <div className="card finance-breakdown">
                <div className="section-title mb-16">🛒 Items Sold</div>
                {Object.entries(summary.addonItems).map(([name, info]) => (
                  <div key={name} className="summary-row">
                    <span className="summary-label">{name} ×{info.qty}</span>
                    <span className="summary-value">{formatPKR(info.total)}</span>
                  </div>
                ))}
                <div className="divider" />
                <div className="summary-row total">
                  <span>Add-ons Total</span>
                  <span className="summary-value">{formatPKR(summary.addonsRevenue)}</span>
                </div>
              </div>
            )}

            {/* Booking Details */}
            {summary.bookings && summary.bookings.length > 0 && (
              <div className="card finance-breakdown">
                <div className="section-title mb-16">📋 Booking Details</div>
                {summary.bookings.map(b => (
                  <div key={b.id} className="finance-booking-row">
                    <div className="finance-booking-info">
                      <strong>{b.customer_name}</strong>
                      <span className="text-muted" style={{ marginLeft: 6, fontSize: 12 }}>
                        {getEquipmentIcon(b.equipment?.type)} {formatTime(b.slot_start_time)}
                      </span>
                    </div>
                    <div className="finance-booking-amounts">
                      <span className="text-green" style={{ fontSize: 13 }}>{formatPKR(b.total_amount)}</span>
                      {b.advance_amount > 0 && (
                        <span className="text-muted" style={{ fontSize: 11 }}>adv: {formatPKR(b.advance_amount)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Day Closing */}
            {!isClosed ? (
              <button
                className="btn btn-primary btn-lg btn-full mt-20"
                onClick={() => setCloseConfirm(true)}
                disabled={closing}
              >
                🔒 Close This Day
              </button>
            ) : (
              <div className="info-banner mt-20">
                <span>🔒</span>
                Day closed on {new Date(summary.closed.closed_at).toLocaleString('en-PK')}
              </div>
            )}
          </>
        ) : (
          <div className="empty-state card">
            <div className="empty-state-icon">💰</div>
            <div className="empty-state-title">No Data</div>
            <div className="empty-state-desc">No financial data for this business day</div>
          </div>
        )}

        {/* Charts Section */}
        <div className="section-title mt-24 mb-16">📊 Revenue Trends</div>
        <div className="finance-chart-tabs">
          <button className={`filter-tab ${chartRange === 'week' ? 'active' : ''}`}
            onClick={() => setChartRange('week')}>Last 7 Days</button>
          <button className={`filter-tab ${chartRange === 'month' ? 'active' : ''}`}
            onClick={() => setChartRange('month')}>Last 30 Days</button>
        </div>

        <div className="card finance-chart-card">
          {chartLoading ? (
            <div className="loading-spinner" style={{ minHeight: 200 }}><div className="spinner" /></div>
          ) : chartData.length > 0 ? (
            <>
              <div className="finance-chart-summary">
                <div>
                  <div className="text-muted" style={{ fontSize: 12, marginBottom: 2 }}>Period Total</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent-purple)' }}>
                    {formatPKR(chartData.reduce((s, d) => s + d.totalCollected, 0))}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="text-muted" style={{ fontSize: 12, marginBottom: 2 }}>Avg / Day</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>
                    {formatPKR(Math.round(chartData.reduce((s, d) => s + d.totalCollected, 0) / chartData.length))}
                  </div>
                </div>
              </div>
              <canvas
                ref={chartRef}
                style={{ width: '100%', height: chartRange === 'month' ? 220 : 180 }}
              />
            </>
          ) : (
            <div className="empty-state" style={{ padding: 40 }}>
              <div className="empty-state-icon">📊</div>
              <div className="empty-state-desc">No chart data</div>
            </div>
          )}
        </div>

        {/* Close Day Confirmation Modal */}
        {closeConfirm && (
          <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setCloseConfirm(false)}>
            <div className="modal" style={{ maxWidth: 420 }}>
              <h2 className="modal-title">🔒 Close Business Day?</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
                This will save a snapshot of <strong style={{ color: 'var(--text-primary)' }}>{businessDate ? formatDate(businessDate) : ''}</strong>'s financials.
              </p>

              <div className="card" style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)', marginBottom: 16 }}>
                <div className="summary-row"><span>Bookings</span><span>{summary?.totalBookings}</span></div>
                <div className="summary-row"><span>Revenue</span><span>{formatPKR(summary?.totalBilled)}</span></div>
                <div className="summary-row"><span>Collected</span><span className="text-green">{formatPKR(summary?.totalCollected)}</span></div>
              </div>

              <div className="modal-actions">
                <button className="btn btn-ghost" onClick={() => setCloseConfirm(false)} style={{ flex: 1 }}>Cancel</button>
                <button className="btn btn-primary btn-lg" onClick={handleCloseDay}
                  disabled={closing} style={{ flex: 1 }}>
                  {closing ? 'Closing...' : '🔒 Confirm Close'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
