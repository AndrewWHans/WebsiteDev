import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId, dealId, quantity = 1 } = await req.json();

    // Validate required fields
    if (!userId || !dealId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, dealId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );
    
    // Get deal details
    const { data: deal, error: dealError } = await supabaseClient
      .from('deals')
      .select('*')
      .eq('id', dealId)
      .single();

    if (dealError || !deal) {
      return new Response(
        JSON.stringify({ error: 'Deal not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate that the deal is free
    if (deal.price !== 0) {
      return new Response(
        JSON.stringify({ error: 'This deal is not free' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create deal booking record
    const { data: booking, error: bookingError } = await supabaseClient
      .from('deal_bookings')
      .insert({
        user_id: userId,
        deal_id: dealId,
        quantity: quantity,
        total_amount: 0,
        payment_method: 'free',
        status: 'confirmed',
        booking_date: new Date().toISOString()
      })
      .select()
      .single();

    if (bookingError) {
      console.error('Error creating booking:', bookingError);
      return new Response(
        JSON.stringify({ error: 'Failed to create booking' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update deal purchase count
    const { error: updateError } = await supabaseClient
      .from('deals')
      .update({ 
        purchases: deal.purchases + quantity 
      })
      .eq('id', dealId);

    if (updateError) {
      console.error('Error updating deal purchases:', updateError);
      // Don't fail the request if this update fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        booking: booking,
        message: 'Free deal claimed successfully!' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing free deal claim:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}); 