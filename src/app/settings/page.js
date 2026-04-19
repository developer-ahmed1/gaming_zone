'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { formatPKR } from '@/lib/utils';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('prices');

  const [settings, setSettings] = useState({});
  const [prices, setPrices] = useState([]);
  const [softDrinks, setSoftDrinks] = useState([]);
  const [chips, setChips] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);

  // New item forms
  const [newDrink, setNewDrink] = useState({ name: '', size: '500ml', price: '' });
  const [newChip, setNewChip] = useState({ brand: '', variant: 'Medium', price: '' });
  const [newEquipment, setNewEquipment] = useState({ name: '', type: 'ps5', base_slot_minutes: 60, max_slot_multiplier: 2 });

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      setSettings(data.settings || {});
      setPrices(data.prices || []);
      setSoftDrinks(data.softDrinks || []);
      setChips(data.chips || []);
      setEquipmentList(data.equipment || []);
    } catch (err) {
      console.error('Failed to fetch settings', err);
    }
    setLoading(false);
  }

  async function saveData(type, data) {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data }),
      });
      if (res.ok) {
        showToast('success', 'Saved successfully!');
        fetchSettings();
      } else {
        showToast('error', 'Failed to save');
      }
    } catch (err) {
      showToast('error', 'Error saving');
    }
    setSaving(false);
  }

  async function deleteItem(type, id) {
    if (!confirm('Are you sure you want to delete this item?')) return;
    setSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data: { id } }),
      });
      showToast('success', 'Deleted!');
      fetchSettings();
    } catch (err) {
      showToast('error', 'Error deleting');
    }
    setSaving(false);
  }

  async function addEquipment() {
    if (!newEquipment.name) return;
    try {
      const res = await fetch('/api/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newEquipment,
          is_active: true,
          sort_order: equipmentList.length + 1
        }),
      });
      if (res.ok) {
        showToast('success', 'Equipment added!');
        setNewEquipment({ name: '', type: 'ps5', base_slot_minutes: 60, max_slot_multiplier: 2 });
        fetchSettings();
      }
    } catch (err) {
      showToast('error', 'Error adding equipment');
    }
  }

  async function toggleEquipment(eq) {
    try {
      await fetch('/api/equipment', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: eq.id, is_active: !eq.is_active }),
      });
      fetchSettings();
    } catch (err) {
      showToast('error', 'Error updating');
    }
  }

  function showToast(type, message) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }

  function updatePrice(idx, field, value) {
    setPrices(prev => prev.map((p, i) => i === idx ? { ...p, [field]: parseInt(value) || 0 } : p));
  }

  function updateDrink(idx, field, value) {
    setSoftDrinks(prev => prev.map((d, i) => i === idx ? { ...d, [field]: field === 'price' ? parseInt(value) || 0 : value } : d));
  }

  function updateChip(idx, field, value) {
    setChips(prev => prev.map((c, i) => i === idx ? { ...c, [field]: field === 'price' ? parseInt(value) || 0 : value } : c));
  }

  async function addDrink() {
    if (!newDrink.name || !newDrink.price) return;
    await saveData('soft_drinks', [{ name: newDrink.name, size: newDrink.size, price: parseInt(newDrink.price), is_active: true }]);
    setNewDrink({ name: '', size: '500ml', price: '' });
  }

  async function addChip() {
    if (!newChip.brand || !newChip.price) return;
    await saveData('chips', [{ brand: newChip.brand, variant: newChip.variant, price: parseInt(newChip.price), is_active: true }]);
    setNewChip({ brand: '', variant: 'Medium', price: '' });
  }

  const tabs = [
    { id: 'prices', label: '💰 Prices', icon: '💰' },
    { id: 'drinks', label: '🥤 Drinks', icon: '🥤' },
    { id: 'chips', label: '🍟 Chips', icon: '🍟' },
    { id: 'equipment', label: '🎮 Equipment', icon: '🎮' },
    { id: 'general', label: '⚙️ General', icon: '⚙️' },
  ];

  if (loading) {
    return (
      <div className="app-layout">
        <Navigation />
        <main className="main-content">
          <div className="loading-spinner"><div className="spinner" /></div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Navigation />
      <main className="main-content">
        <div className="page-header">
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage prices, menus, and equipment</p>
        </div>

        {/* Toast */}
        {toast && (
          <div className={`toast toast-${toast.type}`}>{toast.message}</div>
        )}

        {/* Tabs */}
        <div className="filter-tabs mb-20">
          {tabs.map(t => (
            <button
              key={t.id}
              className={`filter-tab ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Equipment Prices Tab */}
        {activeTab === 'prices' && (
          <div className="animate-fade-in">
            <div className="settings-section">
              <h2 className="settings-section-title">💰 Equipment Prices (PKR)</h2>
              <div style={{ overflowX: 'auto' }}>
                <table className="settings-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Duration</th>
                      <th>Actual</th>
                      <th>1st Week</th>
                      <th>1st Month</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prices.map((p, i) => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600 }}>{p.equipment_type === 'ps5' ? '🎮 PS5' : '🏎️ Wheel'}</td>
                        <td>{p.duration_minutes >= 60 ? `${p.duration_minutes / 60}hr` : `${p.duration_minutes}min`}</td>
                        <td>
                          <input
                            type="number"
                            value={p.actual_price}
                            onChange={e => updatePrice(i, 'actual_price', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={p.week_discount_price}
                            onChange={e => updatePrice(i, 'week_discount_price', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={p.month_discount_price}
                            onChange={e => updatePrice(i, 'month_discount_price', e.target.value)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                className="btn btn-primary mt-16"
                onClick={() => saveData('equipment_prices', prices)}
                disabled={saving}
              >
                {saving ? 'Saving...' : '💾 Save Prices'}
              </button>
            </div>
          </div>
        )}

        {/* Soft Drinks Tab */}
        {activeTab === 'drinks' && (
          <div className="animate-fade-in">
            <div className="settings-section">
              <h2 className="settings-section-title">🥤 Soft Drinks Menu</h2>
              <div style={{ overflowX: 'auto' }}>
                <table className="settings-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Size</th>
                      <th>Price (PKR)</th>
                      <th>Active</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {softDrinks.map((d, i) => (
                      <tr key={d.id}>
                        <td>
                          <input
                            type="text"
                            value={d.name}
                            onChange={e => updateDrink(i, 'name', e.target.value)}
                            style={{ maxWidth: 140 }}
                          />
                        </td>
                        <td>
                          <select
                            className="form-input"
                            value={d.size}
                            onChange={e => updateDrink(i, 'size', e.target.value)}
                            style={{ maxWidth: 100, padding: '6px 8px', fontSize: 13 }}
                          >
                            <option value="250ml">250ml</option>
                            <option value="500ml">500ml</option>
                            <option value="1 Liter">1 Liter</option>
                            <option value="1.5 Liter">1.5 Liter</option>
                          </select>
                        </td>
                        <td>
                          <input
                            type="number"
                            value={d.price}
                            onChange={e => updateDrink(i, 'price', e.target.value)}
                          />
                        </td>
                        <td>
                          <div
                            className={`toggle ${d.is_active ? 'active' : ''}`}
                            onClick={() => updateDrink(i, 'is_active', !d.is_active)}
                          />
                        </td>
                        <td>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => deleteItem('delete_soft_drink', d.id)}
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                className="btn btn-primary mt-16"
                onClick={() => saveData('soft_drinks', softDrinks)}
                disabled={saving}
              >
                {saving ? 'Saving...' : '💾 Save Drinks'}
              </button>

              {/* Add new drink */}
              <div className="card mt-20">
                <div className="section-title mb-12">➕ Add New Drink</div>
                <div className="form-row" style={{ gap: 12, alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Pepsi"
                      value={newDrink.name}
                      onChange={e => setNewDrink(p => ({ ...p, name: e.target.value }))}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Size</label>
                    <select
                      className="form-input"
                      value={newDrink.size}
                      onChange={e => setNewDrink(p => ({ ...p, size: e.target.value }))}
                    >
                      <option value="250ml">250ml</option>
                      <option value="500ml">500ml</option>
                      <option value="1 Liter">1 Liter</option>
                      <option value="1.5 Liter">1.5 Liter</option>
                    </select>
                  </div>
                </div>
                <div className="form-row mt-12" style={{ gap: 12, alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Price (PKR)</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="100"
                      value={newDrink.price}
                      onChange={e => setNewDrink(p => ({ ...p, price: e.target.value }))}
                    />
                  </div>
                  <button className="btn btn-success" onClick={addDrink} disabled={saving}>
                    ➕ Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chips Tab */}
        {activeTab === 'chips' && (
          <div className="animate-fade-in">
            <div className="settings-section">
              <h2 className="settings-section-title">🍟 Chips Menu</h2>
              <div style={{ overflowX: 'auto' }}>
                <table className="settings-table">
                  <thead>
                    <tr>
                      <th>Brand</th>
                      <th>Variant</th>
                      <th>Price (PKR)</th>
                      <th>Active</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chips.map((c, i) => (
                      <tr key={c.id}>
                        <td>
                          <input
                            type="text"
                            value={c.brand}
                            onChange={e => updateChip(i, 'brand', e.target.value)}
                            style={{ maxWidth: 120 }}
                          />
                        </td>
                        <td>
                          <select
                            className="form-input"
                            value={c.variant}
                            onChange={e => updateChip(i, 'variant', e.target.value)}
                            style={{ maxWidth: 100, padding: '6px 8px', fontSize: 13 }}
                          >
                            <option value="Small">Small</option>
                            <option value="Medium">Medium</option>
                            <option value="Large">Large</option>
                            <option value="Family">Family</option>
                          </select>
                        </td>
                        <td>
                          <input
                            type="number"
                            value={c.price}
                            onChange={e => updateChip(i, 'price', e.target.value)}
                          />
                        </td>
                        <td>
                          <div
                            className={`toggle ${c.is_active ? 'active' : ''}`}
                            onClick={() => updateChip(i, 'is_active', !c.is_active)}
                          />
                        </td>
                        <td>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => deleteItem('delete_chip', c.id)}
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                className="btn btn-primary mt-16"
                onClick={() => saveData('chips', chips)}
                disabled={saving}
              >
                {saving ? 'Saving...' : '💾 Save Chips'}
              </button>

              {/* Add new chip */}
              <div className="card mt-20">
                <div className="section-title mb-12">➕ Add New Chips</div>
                <div className="form-row" style={{ gap: 12, alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Brand</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Doritos"
                      value={newChip.brand}
                      onChange={e => setNewChip(p => ({ ...p, brand: e.target.value }))}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Variant</label>
                    <select
                      className="form-input"
                      value={newChip.variant}
                      onChange={e => setNewChip(p => ({ ...p, variant: e.target.value }))}
                    >
                      <option value="Small">Small</option>
                      <option value="Medium">Medium</option>
                      <option value="Large">Large</option>
                      <option value="Family">Family</option>
                    </select>
                  </div>
                </div>
                <div className="form-row mt-12" style={{ gap: 12, alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Price (PKR)</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="50"
                      value={newChip.price}
                      onChange={e => setNewChip(p => ({ ...p, price: e.target.value }))}
                    />
                  </div>
                  <button className="btn btn-success" onClick={addChip} disabled={saving}>
                    ➕ Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Equipment Tab */}
        {activeTab === 'equipment' && (
          <div className="animate-fade-in">
            <div className="settings-section">
              <h2 className="settings-section-title">🎮 Equipment Management</h2>
              <p className="text-muted mb-16" style={{ fontSize: 14 }}>
                Add more PS5s, steering wheels, or custom equipment here.
              </p>

              <div className="booking-list">
                {equipmentList.map(eq => (
                  <div key={eq.id} className="booking-card" style={{ opacity: eq.is_active ? 1 : 0.5 }}>
                    <div className="flex-between">
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700 }}>
                          {eq.type === 'ps5' ? '🎮' : eq.type === 'steering_wheel' ? '🏎️' : '🕹️'} {eq.name}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                          {eq.base_slot_minutes}min base slot • Up to {eq.base_slot_minutes * eq.max_slot_multiplier}min
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <span className="badge" style={{
                          background: eq.is_active ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                          color: eq.is_active ? 'var(--accent-green)' : 'var(--accent-red)'
                        }}>
                          {eq.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <div
                          className={`toggle ${eq.is_active ? 'active' : ''}`}
                          onClick={() => toggleEquipment(eq)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add new equipment */}
              <div className="card mt-20">
                <div className="section-title mb-12">➕ Add New Equipment</div>
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. PS5 #3"
                    value={newEquipment.name}
                    onChange={e => setNewEquipment(p => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <select
                      className="form-input"
                      value={newEquipment.type}
                      onChange={e => setNewEquipment(p => ({ ...p, type: e.target.value }))}
                    >
                      <option value="ps5">PS5</option>
                      <option value="steering_wheel">Steering Wheel</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Base Slot (min)</label>
                    <select
                      className="form-input"
                      value={newEquipment.base_slot_minutes}
                      onChange={e => setNewEquipment(p => ({ ...p, base_slot_minutes: parseInt(e.target.value) }))}
                    >
                      <option value={30}>30 minutes</option>
                      <option value={60}>60 minutes</option>
                    </select>
                  </div>
                </div>
                <button className="btn btn-success mt-12" onClick={addEquipment} disabled={saving}>
                  ➕ Add Equipment
                </button>
              </div>
            </div>
          </div>
        )}

        {/* General Tab */}
        {activeTab === 'general' && (
          <div className="animate-fade-in">
            <div className="settings-section">
              <h2 className="settings-section-title">⚙️ General Settings</h2>

              <div className="card mb-20">
                <div className="form-group">
                  <label className="form-label">Business Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={settings.business_name || ''}
                    onChange={e => setSettings(p => ({ ...p, business_name: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Owner Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={settings.owner_name || ''}
                    onChange={e => setSettings(p => ({ ...p, owner_name: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">WhatsApp Phone Number</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={settings.owner_phone || ''}
                    onChange={e => setSettings(p => ({ ...p, owner_phone: e.target.value }))}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Opening Hour (24h)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={settings.opening_hour ?? 14}
                      onChange={e => setSettings(p => ({ ...p, opening_hour: parseInt(e.target.value) }))}
                      min={0}
                      max={23}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Closing Hour (24h)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={settings.closing_hour ?? 2}
                      onChange={e => setSettings(p => ({ ...p, closing_hour: parseInt(e.target.value) }))}
                      min={0}
                      max={23}
                    />
                  </div>
                </div>

                <button
                  className="btn btn-primary mt-12"
                  onClick={() => saveData('app_settings', settings)}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : '💾 Save Settings'}
                </button>
              </div>

              <div className="card">
                <div className="section-title mb-12">🔒 Change PIN</div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                  To change the login PIN, update the <code style={{ background: 'var(--bg-input)', padding: '2px 6px', borderRadius: 4 }}>OWNER_PIN</code> environment variable in your Vercel dashboard.
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Go to Vercel → Settings → Environment Variables → Edit OWNER_PIN
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
