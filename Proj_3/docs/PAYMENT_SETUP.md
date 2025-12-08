# Payment Processing Setup Guide

## Overview

This guide covers setting up the Stripe payment integration for Howl2Go, including local development, testing, and production deployment.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Stripe Account Setup](#stripe-account-setup)
- [Local Development Setup](#local-development-setup)
- [Testing Payment Flow](#testing-payment-flow)
- [Webhook Configuration](#webhook-configuration)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- Node.js 18+ and npm installed
- Howl2Go backend and frontend running locally
- A Stripe account (free for testing)

## Stripe Account Setup

### 1. Create a Stripe Account

1. Visit [https://stripe.com](https://stripe.com)
2. Click "Sign up" and create an account
3. Complete the registration process
4. You'll be in "Test mode" by default (perfect for development)

### 2. Get Your API Keys

1. Log in to the [Stripe Dashboard](https://dashboard.stripe.com)
2. Make sure you're in **Test mode** (toggle in top-right corner)
3. Navigate to: **Developers** → **API keys**
4. You'll see two keys:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`) - Click "Reveal" to see it

**⚠️ IMPORTANT:** Never commit your secret key to version control!

## Local Development Setup

### Backend Configuration

1. Navigate to the backend directory:

   ```bash
   cd Howl2Go_backend
   ```

2. Copy the environment example file:

   ```bash
   cp .env.example .env
   ```

3. Edit `.env` and add your Stripe keys:

   ```env
   # Stripe Configuration
   STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
   STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
   STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
   ```

4. Install dependencies (if not already done):

   ```bash
   npm install
   ```

5. Start the backend server:
   ```bash
   npm run dev
   ```

### Frontend Configuration

1. Navigate to the frontend directory:

   ```bash
   cd Howl2Go_frontend
   ```

2. Copy the environment example file:

   ```bash
   cp .env.local.example .env.local
   ```

3. Edit `.env.local` and add your Stripe publishable key:

   ```env
   # Stripe Configuration (Frontend)
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE

   # API Configuration
   NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
   ```

4. Install dependencies (if not already done):

   ```bash
   npm install
   ```

5. Start the frontend server:
   ```bash
   npm run dev
   ```

## Testing Payment Flow

### Test Card Numbers

Stripe provides test card numbers for different scenarios:

| Card Number           | Scenario           | Result                  |
| --------------------- | ------------------ | ----------------------- |
| `4242 4242 4242 4242` | Success            | Payment succeeds        |
| `4000 0000 0000 9995` | Declined           | Card declined           |
| `4000 0025 0000 3155` | 3D Secure          | Requires authentication |
| `4000 0000 0000 9987` | Insufficient funds | Payment fails           |

**Test Card Details:**

- **Expiry:** Any future date (e.g., `12/25`)
- **CVC:** Any 3 digits (e.g., `123`)
- **ZIP:** Any 5 digits (e.g., `12345`)

### Testing the Complete Flow

1. **Add Items to Cart:**

   - Browse the menu
   - Add items to your cart
   - Navigate to the cart page

2. **Place Order:**

   - Click "Place Order" or "Proceed to Checkout"
   - The payment modal should appear

3. **Enter Payment Details:**

   - Use test card `4242 4242 4242 4242`
   - Enter expiry: `12/25`
   - Enter CVC: `123`
   - Enter ZIP: `12345`

4. **Submit Payment:**

   - Click "Pay $XX.XX"
   - Payment should process successfully
   - You'll be redirected to the success page

5. **Verify in Stripe Dashboard:**
   - Go to [Stripe Dashboard → Payments](https://dashboard.stripe.com/test/payments)
   - You should see your test payment listed

### Testing Failure Scenarios

1. **Declined Card:**

   - Use card number `4000 0000 0000 9995`
   - Payment should fail
   - User redirected to failure page
   - Order remains in "pending" status

2. **3D Secure Authentication:**
   - Use card number `4000 0025 0000 3155`
   - Complete the test authentication flow
   - Payment succeeds after authentication

## Webhook Configuration

Webhooks allow Stripe to notify your backend about payment events (success, failure, refunds, etc.).

### Local Development with Stripe CLI

For local testing, use the Stripe CLI to forward webhooks:

1. **Install Stripe CLI:**

   **macOS (Homebrew):**

   ```bash
   brew install stripe/stripe-cli/stripe
   ```

   **Windows (Scoop):**

   ```bash
   scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
   scoop install stripe
   ```

   **Linux:**

   ```bash
   # Download from https://github.com/stripe/stripe-cli/releases
   ```

2. **Authenticate:**

   ```bash
   stripe login
   ```

   Follow the prompts to authenticate with your Stripe account.

3. **Forward Webhooks:**

   ```bash
   stripe listen --forward-to localhost:4000/api/payments/webhook
   ```

   This command will output a webhook signing secret:

   ```
   > Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx
   ```

4. **Update Backend `.env`:**

   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```

5. **Test Webhooks:**

   In a new terminal, trigger a test event:

   ```bash
   stripe trigger payment_intent.succeeded
   ```

   Check your backend logs to confirm the webhook was received.

### Production Webhook Setup

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click "Add endpoint"
3. Enter your production URL: `https://your-domain.com/api/payments/webhook`
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
   - `charge.refunded`
5. Click "Add endpoint"
6. Copy the "Signing secret" (starts with `whsec_`)
7. Add it to your production environment variables

## Production Deployment

### Switch to Live Mode

1. In Stripe Dashboard, toggle to **Live mode**
2. Get your **Live API keys** from **Developers → API keys**
3. Update production environment variables:

**Backend (Live keys):**

```env
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_LIVE_WEBHOOK_SECRET
```

**Frontend (Live key):**

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_PUBLISHABLE_KEY
```

### Security Checklist

- [ ] Never commit `.env` files to version control
- [ ] Use environment variables for all secrets
- [ ] Verify webhook signatures in production
- [ ] Enable HTTPS for production (required by Stripe)
- [ ] Implement rate limiting on payment endpoints
- [ ] Log all payment transactions for audit purposes
- [ ] Set up monitoring and alerts for failed payments

## Troubleshooting

### Common Issues

**Problem:** "Invalid API key provided"

- **Solution:** Check that your API keys are correct and match the mode (test vs live)
- Verify keys are properly set in `.env` files
- Restart backend and frontend servers after changing env variables

**Problem:** "No such payment_intent"

- **Solution:** Ensure payment intent was created successfully before confirming
- Check backend logs for errors during payment intent creation
- Verify order ID is correct

**Problem:** "Webhook signature verification failed"

- **Solution:** Ensure `STRIPE_WEBHOOK_SECRET` matches the endpoint's signing secret
- Check that webhook endpoint is using `express.raw()` middleware
- Verify webhook endpoint URL is correct

**Problem:** Payment modal doesn't appear

- **Solution:** Check browser console for errors
- Verify `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set in frontend `.env.local`
- Ensure frontend is properly connected to backend API

**Problem:** "This value is not a valid publishable API key"

- **Solution:** Make sure you're using the **publishable key** (`pk_test_...`) not the secret key
- Publishable key should be in frontend `.env.local` with `NEXT_PUBLIC_` prefix

### Debug Logs

**Backend logging:**

```javascript
// In paymentService.js
console.log("Creating payment intent for order:", orderId);
console.log("Payment intent created:", paymentIntent.id);
```

**Frontend logging:**

```javascript
// In CheckoutForm.tsx
console.log("Payment intent client secret:", clientSecret);
console.log("Stripe payment result:", result);
```

### Testing Database

To verify payment records:

```javascript
// In MongoDB shell or Compass
db.payments.find().sort({ createdAt: -1 }).limit(10);
db.orders.find({ paymentStatus: "paid" });
```

### Stripe Dashboard Logs

- View payment logs: [Dashboard → Payments](https://dashboard.stripe.com/test/payments)
- View webhook events: [Dashboard → Developers → Webhooks → Events](https://dashboard.stripe.com/test/webhooks)
- View API logs: [Dashboard → Developers → Logs](https://dashboard.stripe.com/test/logs)

## Additional Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe Webhook Events](https://stripe.com/docs/webhooks)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)

## Support

For Stripe-specific issues:

- [Stripe Support](https://support.stripe.com)
- [Stripe Community](https://stripe.com/community)

For Howl2Go payment integration issues:

- Check existing issues in the repository
- Create a new issue with reproduction steps
- Contact the development team
