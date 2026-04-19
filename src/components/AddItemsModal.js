'use client';

import { useState, useEffect } from 'react';
import { formatPKR } from '@/lib/utils';

export default function AddItemsModal({ booking, onClose, onItemsAdded }) {
  const [softDrinks, setSoftDrinks] = useState([]);
  const [chips, setChips] = useState([]);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadMenu() {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        setSoftDrinks((data.softDrinks || []).filter(d => d.is_active));
        setChips((data.chips || []).filter(c => c.is_active));
      } catch (err) { console.error(err); }
      setLoading(false);
    }
    loadMenu();
  }, []);

  function updateAddon(type, name, detail, unitPrice, delta) {
    setSelectedAddons(prev => {
      const key = `${type}-${name}-${detail}`;
      const existing = prev.find(a => `${a.addon_type}-${a.addon_name}-${a.addon_detail}` === key);
      if (existing) {
        const newQty = existing.quantity + delta;
        if (newQty <= 0) return prev.filter(a => `${a.addon_type}-${a.addon_name}-${a.addon_detail}` !== key);
        return prev.map(a => `${a.addon_type}-${a.addon_name}-${a.addon_detail}` === key
          ? { ...a, quantity: newQty, total_price: newQty * a.unit_price } : a);
      }
      if (delta > 0) return [...prev, { addon_type: type, addon_name: name, addon_detail: detail, quantity: 1, unit_price: unitPrice, total_price: unitPrice }];
      return prev;
    });
  }

  function getAddonQty(type, name, detail) {
    const addon = selectedAddons.find(a => `${a.addon_type}-${a.addon_name}-${a.addon_detail}` === `${type}-${name}-${detail}`);
    return addon ? addon.quantity : 0;
  }

  function getAddonsTotal() {
    return selectedAddons.reduce((sum, a) => sum + a.total_price, 0);
  }

  async function handleSave() {
    if (selectedAddons.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          add_items: selectedAddons,
          addons_total_add: getAddonsTotal(),
        }),
      });
      if (res.ok) {
        onItemsAdded && onItemsAdded();
      }
    } catch (err) { console.error(err); }
    setSaving(false);
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header-fancy">
          <h2 className="modal-title">🛒 Add Items</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '-12px 0 16px' }}>
            For <strong>{booking.customer_name}</strong> — {booking.equipment?.name}
          </p>
        </div>

        {loading ? (
          <div className="loading-spinner"><div className="spinner" /></div>
        ) : (
          <>
            {/* Chips Section */}
            <div className="section-title mb-12">🍟 Chips</div>
            <div className="addon-grid mb-20">
              {chips.map(c => {
                const qty = getAddonQty('chips', c.brand, c.variant);
                return (
                  <div key={c.id} className={`addon-card ${qty > 0 ? 'selected' : ''}`}>
                    <div className="addon-name">{c.brand}</div>
                    <div className="addon-detail">{c.variant}</div>
                    <div className="addon-price">{formatPKR(c.price)}</div>
                    <div className="addon-qty">
                      <button className="addon-qty-btn" onClick={() => updateAddon('chips', c.brand, c.variant, c.price, -1)}>−</button>
                      <span className="addon-qty-value">{qty}</span>
                      <button className="addon-qty-btn" onClick={() => updateAddon('chips', c.brand, c.variant, c.price, 1)}>+</button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Drinks Section */}
            <div className="section-title mb-12">🥤 Soft Drinks</div>
            <div className="addon-grid mb-20">
              {softDrinks.map(d => {
                const qty = getAddonQty('soft_drink', d.name, d.size);
                return (
                  <div key={d.id} className={`addon-card ${qty > 0 ? 'selected' : ''}`}>
                    <div className="addon-name">{d.name}</div>
                    <div className="addon-detail">{d.size}</div>
                    <div className="addon-price">{formatPKR(d.price)}</div>
                    <div className="addon-qty">
                      <button className="addon-qty-btn" onClick={() => updateAddon('soft_drink', d.name, d.size, d.price, -1)}>−</button>
                      <span className="addon-qty-value">{qty}</span>
                      <button className="addon-qty-btn" onClick={() => updateAddon('soft_drink', d.name, d.size, d.price, 1)}>+</button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            {selectedAddons.length > 0 && (
              <div className="card" style={{ marginBottom: 16, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
                <div className="section-title mb-12">🧾 Order Summary</div>
                {selectedAddons.map((a, i) => (
                  <div key={i} className="summary-row">
                    <span>{a.addon_name} {a.addon_detail} ×{a.quantity}</span>
                    <span className="summary-value">{formatPKR(a.total_price)}</span>
                  </div>
                ))}
                <div className="summary-row total">
                  <span>Items Total</span>
                  <span className="summary-value">{formatPKR(getAddonsTotal())}</span>
                </div>
              </div>
            )}
          </>
        )}

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button className="btn btn-success btn-lg" onClick={handleSave}
            disabled={saving || selectedAddons.length === 0} style={{ flex: 2 }}>
            {saving ? 'Adding...' : `🛒 Add Items (${formatPKR(getAddonsTotal())})`}
          </button>
        </div>
      </div>
    </div>
  );
}
