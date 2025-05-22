import Stripe from 'npm:stripe@14.21.0'

export const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  // Use fetch API for HTTP requests
  httpClient: Stripe.createFetchHttpClient(),
})