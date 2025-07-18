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
    // Get the signature from the headers
    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      throw new Error('No signature found')
    }

    // Get the raw body
    const body = await req.text()

    // Verify the event
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''
    )

    // Get Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Handle the event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object

      // Get metadata from the session
      const { userId, routeId, dealId, timeSlot, quantity, totalAmount, milesAmount, milesDiscount, type } = session.metadata
      const referralCode = session.metadata.referralCode || ''
      const referralDiscount = session.metadata.referralDiscount || ''
      const discountType = session.metadata.discountType || ''
      const stripeSessionId = session.id
      const stripePaymentIntentId = session.payment_intent

      // Process payment based on type (route or deal)
      if (type === 'deal') {
        // Process deal payment
        const { data: processResult, error: processError } = await supabaseClient
          .rpc('process_deal_payment', {
            p_session_id: stripeSessionId,
            p_payment_intent_id: stripePaymentIntentId,
            p_user_id: userId,
            p_deal_id: dealId,
            p_quantity: parseInt(quantity),
            p_total_amount: parseFloat(totalAmount),
            p_miles_amount: milesAmount ? parseInt(milesAmount) : 0,
            p_miles_discount: milesDiscount ? parseFloat(milesDiscount) : 0
          })
          
        if (processError) throw processError
        
        console.log('Deal payment processed successfully:', processResult)
      } else {
        // Process route payment (existing code)
        // Get route date from the routes table
        const { data: route, error: routeError } = await supabaseClient
          .from('routes')
          .select('date')
          .eq('id', routeId)
          .single()

        if (routeError) throw routeError
        if (!route) throw new Error('Route not found')

        // Create payment link record
        const { data: paymentLink, error: paymentLinkError } = await supabaseClient
          .from('payment_links')
          .insert({
            user_id: userId,
            route_id: routeId,
            time_slot: timeSlot,
            quantity: parseInt(quantity),
            total_amount: parseFloat(totalAmount),
            status: 'pending',
            is_paid: true,
            route_date: route.date,
            miles_amount: milesAmount ? parseInt(milesAmount) : 0,
            miles_discount: milesDiscount ? parseFloat(milesDiscount) : 0,
            stripe_session_id: stripeSessionId,
            stripe_payment_intent_id: stripePaymentIntentId
          })
          .select()
          .single()

        if (paymentLinkError) throw paymentLinkError

        // Process the payment using the verify_and_redeem_payment function
        // This will also handle miles redemption if miles were applied
        const { data: verifyData, error: verifyError } = await supabaseClient
          .rpc('verify_and_redeem_payment', {
            payment_id: paymentLink.id
          })

        if (verifyError) throw verifyError
        
        // Process miles redemption if miles were applied
        // Only process if miles amount is greater than 0
        const milesAmountInt = milesAmount ? parseInt(milesAmount) : 0;
        if (milesAmountInt > 0) {
          try {
            // First check if miles have already been redeemed for this payment
            const { data: alreadyRedeemed, error: checkError } = await supabaseClient
              .rpc('have_miles_been_redeemed', {
                p_user_id: userId,
                p_reference_id: stripePaymentIntentId
              })

            if (checkError) {
              console.error('Error checking if miles were already redeemed:', checkError)
              throw checkError
            }

            // Only redeem miles if they haven't been redeemed yet
            if (!alreadyRedeemed) {
              console.log(`Redeeming ${milesAmountInt} miles for user ${userId}`)
              
              // Call the redeem_miles function
              const { data: redemptionData, error: redemptionError } = await supabaseClient
                .rpc('redeem_miles', {
                  p_user_id: userId,
                  p_miles_amount: milesAmountInt,
                  p_description: `Miles redeemed for ticket purchase`,
                  p_reference_id: stripePaymentIntentId
                });
                
              if (redemptionError) {
                console.error('Error redeeming miles:', redemptionError);
                throw redemptionError;
              } else {
                console.log('Miles redeemed successfully:', redemptionData);
              }
            } else {
              console.log(`Miles already redeemed for payment ${stripePaymentIntentId}, skipping redemption`)
            }
          } catch (error) {
            console.error('Error processing miles redemption:', error);
            throw error;
          }
        }

        console.log('Payment processed successfully:', {
          paymentLinkId: paymentLink.id,
          verified: verifyData,
          discount_code: referralCode && referralCode.trim() !== '' ? referralCode : null,
          discount_amount: referralDiscount && referralDiscount.trim() !== '' ? parseFloat(referralDiscount) : null,
          discount_type: discountType && discountType.trim() !== '' ? discountType : null
        })
        
        // Create the ticket booking with discount information
        const { error: bookingError } = await supabaseClient
          .from('ticket_bookings')
          .insert({
            user_id: userId,
            route_id: routeId,
            time_slot: timeSlot,
            quantity: parseInt(quantity),
            total_price: parseFloat(totalAmount),
            status: 'confirmed',
            booking_date: new Date().toISOString(),
            stripe_payment_intent_id: stripePaymentIntentId,
            miles_redeemed: milesAmountInt,
            discount_code: referralCode && referralCode.trim() !== '' ? referralCode : null,
            discount_amount: referralDiscount && referralDiscount.trim() !== '' ? parseFloat(referralDiscount) : null,
            discount_type: discountType && discountType.trim() !== '' ? discountType : null
          })
        
        if (bookingError) {
          console.error('Error creating ticket booking:', bookingError)
          throw bookingError
        }
        
        console.log('Ticket booking created with discount data:', {
          bookingId: 'created',
          discount_code: referralCode && referralCode.trim() !== '' ? referralCode : null,
          discount_amount: referralDiscount && referralDiscount.trim() !== '' ? parseFloat(referralDiscount) : null,
          discount_type: discountType && discountType.trim() !== '' ? discountType : null
        })
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      status: 200,
    })
  } catch (error) {
    console.error('Webhook error:', error.message)
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