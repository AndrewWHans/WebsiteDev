import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import { corsHeaders } from '/shared/cors.ts';

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  
  try {
    const { userId, dealId, quantity } = await req.json();
    
    // Validate required fields
    if (!userId || !dealId || !quantity) {
      throw new Error('Missing required fields');
    }
    
    // Get Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );
    
    // Get deal details
    const { data: deal, error: dealError } = await supabaseClient
      .from('deals')
      .select('id, title, price, location_name, purchases')
      .eq('id', dealId)
      .single();
      
    if (dealError) throw dealError;
    if (!deal) throw new Error('Deal not found');
    
    // Validate that the deal is actually free
    if (deal.price > 0) {
      throw new Error('This deal is not free and requires payment');
    }
    
    // Create deal booking record
    const { data: dealBooking, error: dealBookingError } = await supabaseClient
      .from('deal_bookings')
      .insert({
        user_id: userId,
        deal_id: dealId,
        quantity: quantity,
        total_price: 0, // Free deal
        status: 'confirmed',
        booking_date: new Date().toISOString(),
        miles_redeemed: 0 // No miles used for free deals
      })
      .select()
      .single();
      
    if (dealBookingError) throw dealBookingError;
    
    // Increment deal purchases count
    const { error: updateDealError } = await supabaseClient
      .from('deals')
      .update({ 
        purchases: deal.purchases + quantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', dealId);
      
    if (updateDealError) throw updateDealError;
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Free deal claimed successfully',
      booking: dealBooking
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
});