import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { stripe } from '../_shared/stripe.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.39.7'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { bookingId, refundAll = false, routeId } = await req.json()

    // Get Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    if (refundAll) {
      // Get all bookings for the route
      const { data: bookings, error: bookingsError } = await supabaseClient
        .from('ticket_bookings')
        .select('id, stripe_payment_intent_id')
        .eq('route_id', routeId)
        .eq('status', 'confirmed')

      if (bookingsError) throw bookingsError

      // Process refunds for all bookings
      for (const booking of bookings || []) {
        if (booking.stripe_payment_intent_id) {
          // Process Stripe refund
          await stripe.refunds.create({
            payment_intent: booking.stripe_payment_intent_id
          })
        }

        // Update booking status
        await supabaseClient
          .from('ticket_bookings')
          .update({ status: 'refunded' })
          .eq('id', booking.id)
      }

      return new Response(
        JSON.stringify({ success: true, message: 'All bookings refunded successfully' }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          status: 200,
        }
      )
    } else {
      // Get booking details
      const { data: booking, error: bookingError } = await supabaseClient
        .from('ticket_bookings')
        .select('id, stripe_payment_intent_id, status')
        .eq('id', bookingId)
        .single()

      if (bookingError) throw bookingError
      if (!booking) throw new Error('Booking not found')
      if (booking.status !== 'confirmed') throw new Error('Booking cannot be refunded')

      if (booking.stripe_payment_intent_id) {
        // Process Stripe refund
        await stripe.refunds.create({
          payment_intent: booking.stripe_payment_intent_id
        })
      }

      // Update booking status
      await supabaseClient
        .from('ticket_bookings')
        .update({ status: 'refunded' })
        .eq('id', bookingId)

      return new Response(
        JSON.stringify({ success: true, message: 'Refund processed successfully' }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          status: 200,
        }
      )
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 400,
      }
    )
  }
})