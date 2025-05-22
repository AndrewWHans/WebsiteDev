import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  
  try {
    const { userId, dealId, quantity, milesAmount, milesValue } = await req.json();
    
    // Validate required fields
    if (!userId || !dealId || !quantity || !milesAmount || !milesValue) {
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
      .select('id, title, price, location_name')
      .eq('id', dealId)
      .single();
      
    if (dealError) throw dealError;
    if (!deal) throw new Error('Deal not found');
    
    const totalPrice = deal.price * quantity;
    const milesDiscount = milesAmount * milesValue;
    
    // Validate miles discount covers total price
    if (milesDiscount < totalPrice) {
      throw new Error(`Miles discount (${milesDiscount.toFixed(2)}) doesn't cover total price (${totalPrice.toFixed(2)})`);
    }
    
    // Get user's miles balance
    const { data: userMiles, error: userMilesError } = await supabaseClient
      .from('wallet_points')
      .select('points')
      .eq('user_id', userId)
      .single();
      
    if (userMilesError) throw userMilesError;
    
    // Validate user has enough miles
    if (userMiles.points < milesAmount) {
      throw new Error(`Insufficient miles balance (${userMiles.points} available, ${milesAmount} required)`);
    }
    
    // Create deal booking record
    const { data: dealBooking, error: dealBookingError } = await supabaseClient
      .from('deal_bookings')
      .insert({
        user_id: userId,
        deal_id: dealId,
        quantity: quantity,
        total_price: 0, // Free because fully covered by miles
        status: 'confirmed',
        booking_date: new Date().toISOString(),
        miles_redeemed: milesAmount
      })
      .select()
      .single();
      
    if (dealBookingError) throw dealBookingError;
    
    // Deduct miles from user's wallet
    const { error: updateMilesError } = await supabaseClient
      .from('wallet_points')
      .update({ points: userMiles.points - milesAmount })
      .eq('user_id', userId);
      
    if (updateMilesError) throw updateMilesError;
    
    // Add point transaction for redemption
    const { error: pointTransactionError } = await supabaseClient
      .from('point_transactions')
      .insert({
        user_id: userId,
        points: -milesAmount,
        description: `Miles redeemed for deal purchase: ${deal.title}`,
        type: 'redeem',
        reference_id: dealBooking.id
      });
      
    if (pointTransactionError) throw pointTransactionError;
    
    // Increment deal purchases count
    const { error: updateDealError } = await supabaseClient
      .from('deals')
      .update({ purchases: deal.purchases + quantity })
      .eq('id', dealId);
      
    if (updateDealError) throw updateDealError;
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Deal purchased successfully with miles'
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