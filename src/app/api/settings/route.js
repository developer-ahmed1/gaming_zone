import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

// Fallback demo data for when Supabase is not configured
const FALLBACK_DATA = {
  settings: {
    owner_phone: '03063455727',
    owner_name: 'Roman Ali',
    business_name: 'Mirpurkhas Gaming Zone',
    opening_hour: 14,
    closing_hour: 2,
  },
  equipment: [
    { id: 1, name: 'PS5 #1', type: 'ps5', base_slot_minutes: 60, max_slot_multiplier: 2, is_active: true, sort_order: 1 },
    { id: 2, name: 'PS5 #2', type: 'ps5', base_slot_minutes: 60, max_slot_multiplier: 2, is_active: true, sort_order: 2 },
    { id: 3, name: 'Steering Wheel', type: 'steering_wheel', base_slot_minutes: 30, max_slot_multiplier: 2, is_active: true, sort_order: 3 },
  ],
  prices: [
    { id: 1, equipment_type: 'ps5', duration_minutes: 60, actual_price: 700, week_discount_price: 350, month_discount_price: 490 },
    { id: 2, equipment_type: 'ps5', duration_minutes: 120, actual_price: 1200, week_discount_price: 600, month_discount_price: 840 },
    { id: 3, equipment_type: 'steering_wheel', duration_minutes: 30, actual_price: 400, week_discount_price: 200, month_discount_price: 280 },
    { id: 4, equipment_type: 'steering_wheel', duration_minutes: 60, actual_price: 700, week_discount_price: 350, month_discount_price: 490 },
  ],
  softDrinks: [
    { id: 1, name: 'Coca-Cola', size: '250ml', price: 50, is_active: true },
    { id: 2, name: 'Coca-Cola', size: '500ml', price: 100, is_active: true },
    { id: 3, name: 'Coca-Cola', size: '1 Liter', price: 150, is_active: true },
    { id: 4, name: 'Sprite', size: '250ml', price: 50, is_active: true },
    { id: 5, name: 'Sprite', size: '500ml', price: 100, is_active: true },
    { id: 6, name: 'Sprite', size: '1 Liter', price: 150, is_active: true },
    { id: 7, name: 'Sting', size: '250ml', price: 60, is_active: true },
    { id: 8, name: 'Sting', size: '500ml', price: 100, is_active: true },
  ],
  chips: [
    { id: 1, brand: 'Lays', variant: 'Small', price: 20, is_active: true },
    { id: 2, brand: 'Lays', variant: 'Medium', price: 50, is_active: true },
    { id: 3, brand: 'Lays', variant: 'Large', price: 70, is_active: true },
    { id: 4, brand: 'Kurkure', variant: 'Small', price: 30, is_active: true },
    { id: 5, brand: 'Kurkure', variant: 'Medium', price: 50, is_active: true },
    { id: 6, brand: 'Kurkure', variant: 'Large', price: 100, is_active: true },
  ],
};

function isSupabaseConfigured() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL && 
         !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
}

// GET /api/settings - Get all settings, prices, and menus
export async function GET() {
  // Return fallback data if Supabase is not configured
  if (!isSupabaseConfigured()) {
    return NextResponse.json(FALLBACK_DATA);
  }

  try {
    const [settingsRes, pricesRes, drinksRes, chipsRes, equipmentRes] = await Promise.all([
      supabase.from('app_settings').select('*'),
      supabase.from('equipment_prices').select('*'),
      supabase.from('soft_drinks').select('*').order('name').order('size'),
      supabase.from('chips').select('*').order('brand').order('variant'),
      supabase.from('equipment').select('*').order('sort_order'),
    ]);

    // If any query has errors or no data, use fallback
    if (settingsRes.error || equipmentRes.error || (equipmentRes.data || []).length === 0) {
      return NextResponse.json(FALLBACK_DATA);
    }

    const settings = {};
    (settingsRes.data || []).forEach(s => {
      try { settings[s.key] = JSON.parse(s.value); } 
      catch { settings[s.key] = s.value; }
    });

    return NextResponse.json({
      settings,
      prices: pricesRes.data || [],
      softDrinks: drinksRes.data || [],
      chips: chipsRes.data || [],
      equipment: equipmentRes.data || [],
    });
  } catch (error) {
    // On any error, return fallback data so the app still works
    return NextResponse.json(FALLBACK_DATA);
  }
}

// PUT /api/settings - Update settings
export async function PUT(request) {
  try {
    const body = await request.json();
    const { type, data } = body;

    switch (type) {
      case 'app_settings': {
        for (const [key, value] of Object.entries(data)) {
          await supabase
            .from('app_settings')
            .upsert({ key, value: JSON.stringify(value), updated_at: new Date().toISOString() });
        }
        break;
      }
      case 'equipment_prices': {
        for (const price of data) {
          if (price.id) {
            await supabase.from('equipment_prices').update({
              actual_price: price.actual_price,
              week_discount_price: price.week_discount_price,
              month_discount_price: price.month_discount_price,
            }).eq('id', price.id);
          }
        }
        break;
      }
      case 'soft_drinks': {
        for (const drink of data) {
          if (drink.id) {
            await supabase.from('soft_drinks').update({
              name: drink.name,
              size: drink.size,
              price: drink.price,
              is_active: drink.is_active,
            }).eq('id', drink.id);
          } else {
            await supabase.from('soft_drinks').insert(drink);
          }
        }
        break;
      }
      case 'chips': {
        for (const chip of data) {
          if (chip.id) {
            await supabase.from('chips').update({
              brand: chip.brand,
              variant: chip.variant,
              price: chip.price,
              is_active: chip.is_active,
            }).eq('id', chip.id);
          } else {
            await supabase.from('chips').insert(chip);
          }
        }
        break;
      }
      case 'delete_soft_drink': {
        await supabase.from('soft_drinks').delete().eq('id', data.id);
        break;
      }
      case 'delete_chip': {
        await supabase.from('chips').delete().eq('id', data.id);
        break;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
