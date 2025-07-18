import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { stripe } from '../_shared/stripe.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import { corsHeaders } from '../_shared/cors.ts';

// Helper function to format time
function formatTime(timeString) {
  try {
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours, 10));
    date.setMinutes(parseInt(minutes, 10));
    return date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting time:', error);
    return timeString;
  }
}

serve(async (req) => {
  // Handle CORS
  console.log('Request method:', req.method);
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const requestData = await req.json();
    console.log('Request data received:', requestData);
    
    const { 
      routeId, 
      timeSlot, 
      quantity, 
      userId, 
      totalAmount, 
      milesAmount = 0, 
      milesDiscount = 0,
      referralCode = '',
      referralDiscount = 0,
      discountType = ''
    } = requestData;
    
    console.log('Parsed request parameters:', { routeId, timeSlot, quantity, userId, totalAmount });
    
    // Get Supabase client
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '');
    // Get route details
    const { data: route, error: routeError } = await supabaseClient.from('routes').select(`
        id,
        price,
        date,
        pickup:locations!routes_pickup_location_fkey (name),
        dropoff:locations!routes_dropoff_location_fkey (name)
      `).eq('id', routeId).single();
    if (routeError) throw routeError;
    if (!route) throw new Error('Route not found');
    
    console.log('Route found:', route);
    // Format the date for display
    const routeDate = new Date(route.date);
    const formattedDate = routeDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
    // Format the time slot
    const formattedTime = formatTime(timeSlot);
    // Calculate total amount
    // Use the provided totalAmount which already includes all discounts
    // This ensures consistency between frontend and backend pricing
    
    console.log('Creating Stripe session with amount:', totalAmount);
   
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
              name: `Shuttle: ${route.pickup.name} to ${route.dropoff.name}`,
              description: `${quantity} ticket${quantity > 1 ? 's' : ''} for ${formattedDate} at ${formattedTime}`
            },
            unit_amount: Math.round(totalAmount * 100 / quantity)
          },
          quantity: quantity
        }
      ],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/tickets?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/shuttles/${routeId}`,
      metadata: {
        userId,
        routeId,
        timeSlot,
        quantity: quantity.toString(),
        totalAmount: totalAmount.toString(),
        milesAmount: milesAmount.toString(),
        milesDiscount: milesDiscount.toString(),
        referralCode,
        referralDiscount: referralDiscount.toString(),
        discountType
      }
    });
    
    console.log('Stripe session created:', session.id);
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
    console.error('Error in create-checkout:', error);
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