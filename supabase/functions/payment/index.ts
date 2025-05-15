import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Stripe } from "npm:stripe@14.14.0";
import { corsHeaders } from "../_shared/cors.ts";

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY environment variable is not set');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
});

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain',
      }
    });
  }

  try {
    // Validate request method
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    const { amount } = await req.json();

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      throw new Error('Invalid amount provided');
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'eur',
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return new Response(
      JSON.stringify({ 
        clientSecret: paymentIntent.client_secret,
        status: 'success'
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Payment error:', error);
    
    let errorMessage = 'An error occurred processing the payment';
    let statusCode = 400;

    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        errorMessage = 'Payment service configuration error';
        statusCode = 500;
      } else if (error.message === 'Method not allowed') {
        statusCode = 405;
        errorMessage = error.message;
      } else {
        errorMessage = error.message;
      }
    }

    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        status: 'error'
      }),
      {
        status: statusCode,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});