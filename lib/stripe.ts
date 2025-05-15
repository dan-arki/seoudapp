import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe only in web environment
const stripePromise = typeof window !== 'undefined' 
  ? loadStripe(process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
  : null;

export const createPaymentIntent = async (amount: number) => {
  try {
    // Convert amount to cents and ensure it's an integer
    const amountInCents = Math.round(amount * 100);
    
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/payment`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ amount: amountInCents }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create payment intent');
    }

    const data = await response.json();
    return data.clientSecret;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    if (error instanceof Error) {
      throw new Error(`Payment error: ${error.message}`);
    }
    throw new Error('An unexpected error occurred while processing payment');
  }
};

export const confirmPayment = async (clientSecret: string) => {
  try {
    if (!stripePromise) {
      throw new Error('Stripe not initialized');
    }

    const stripe = await stripePromise;
    if (!stripe) {
      throw new Error('Failed to load Stripe');
    }

    const { paymentIntent, error } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: {
          number: '4242424242424242',
          exp_month: 12,
          exp_year: 2024,
          cvc: '123',
        },
      },
    });

    if (error) {
      throw error;
    }

    return paymentIntent;
  } catch (error) {
    console.error('Error confirming payment:', error);
    throw error;
  }
};