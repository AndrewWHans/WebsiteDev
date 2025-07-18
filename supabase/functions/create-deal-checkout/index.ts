import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { stripe } from '../_shared/stripe.ts';
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
    const { dealId, quantity, userId, milesAmount = 0, milesDiscount = 0 } = await req.json();
    
    // Get Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );
    
    // Get deal details
    const { data: deal, error: dealError } = await supabaseClient
      .from('deals')
      .select(`
        id,
        title,
        price,
        location_name,
        deal_date
      `)
      .eq('id', dealId)
      .single();
      
    if (dealError) throw dealError;
    if (!deal) throw new Error('Deal not found');
    
    // Format the date for display
    let dateDisplay = '';
    if (deal.deal_date) {
      const dealDate = new Date(deal.deal_date);
      dateDisplay = dealDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    }
    
    // Calculate total amount
    let totalAmount = deal.price * quantity;
    
    // Apply miles discount if provided
    if (milesAmount > 0 && milesDiscount > 0) {
      totalAmount = Math.max(0, totalAmount - milesDiscount);
    }
    
   // Get discount code from request if provided
   const { referralCode = '', referralDiscount = 0, discountType = 'percent' } = await req.json();
   
    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: [
        'card'
      ],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: deal.title,
              description: `${quantity} ticket${quantity > 1 ? 's' : ''} for ${deal.location_name}${dateDisplay ? ` on ${dateDisplay}` : ''}`
            },
            unit_amount: Math.round((deal.price * quantity - milesDiscount) * 100 / quantity)
          },
          quantity: quantity
        }
      ],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/deals?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/deals`,
      metadata: {
        userId,
        dealId,
        quantity: quantity.toString(),
        totalAmount: totalAmount.toString(),
        milesAmount: milesAmount.toString(),
        milesDiscount: milesDiscount.toString(),
        type: 'deal' // To distinguish from route payments
       referralCode,
       referralDiscount: referralDiscount.toString(),
       discountType
      }
    });
    
    return new Response(JSON.stringify({
      url: session.url
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    return new Response(JSON.stringify({
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