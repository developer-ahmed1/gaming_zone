import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

const DEMO_EQUIPMENT = [
  { id: 1, name: 'PS5 #1', type: 'ps5', base_slot_minutes: 60, max_slot_multiplier: 2, is_active: true, sort_order: 1 },
  { id: 2, name: 'PS5 #2', type: 'ps5', base_slot_minutes: 60, max_slot_multiplier: 2, is_active: true, sort_order: 2 },
  { id: 3, name: 'Steering Wheel', type: 'steering_wheel', base_slot_minutes: 30, max_slot_multiplier: 2, is_active: true, sort_order: 3 },
];

// GET /api/equipment
export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
    return NextResponse.json(DEMO_EQUIPMENT);
  }

  try {
    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (error) throw error;

    return NextResponse.json(data && data.length > 0 ? data : DEMO_EQUIPMENT);
  } catch (error) {
    return NextResponse.json(DEMO_EQUIPMENT);
  }
}

// POST /api/equipment - Add new equipment
export async function POST(request) {
  try {
    const body = await request.json();
    const { data, error } = await supabase
      .from('equipment')
      .insert(body)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/equipment - Update equipment
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    
    const { data, error } = await supabase
      .from('equipment')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
