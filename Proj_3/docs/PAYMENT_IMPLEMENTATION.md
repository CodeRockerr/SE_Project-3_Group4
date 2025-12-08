# Payment Processing Implementation

## Overview

This document describes the implementation of the Stripe payment processing system for Howl2Go. The system allows users to securely pay for their orders online, with automatic order status updates and comprehensive payment tracking.

## Architecture

### Backend Components

#### 1. Payment Model (`src/models/Payment.js`)

- **Purpose**: MongoDB schema for storing payment transaction records
- **Key Fields**:

  - `orderId`: Reference to the Order
  - `userId`: Reference to the User
  - `amount`: Payment amount in cents
  - `currency`: Default "usd"
  - `status`: Payment lifecycle status (pending, processing, succeeded, failed, canceled, refunded)
  - `paymentIntentId`: Stripe payment intent ID
  - `transactionId`: Stripe transaction ID (from succeeded events)
  - `paymentMethod`: Type of payment method used
  - `paymentMethodDetails`: Card details (brand, last4, expiry)
  - `metadata`: Additional data (user email, delivery address)
  - `failureMessage`: Error details if payment failed
  - `timestamps`: Created and updated dates

- **Virtual Fields**:

  - `formattedAmount`: Returns amount in dollars (e.g., "$29.99")

- **Methods**:
  - `isFinalized()`: Returns true if status is succeeded/failed/canceled/refunded
  - `isSuccessful()`: Returns true if status is succeeded

#### 2. Payment Service (`src/services/paymentService.js`)

- **Purpose**: Business logic layer for payment operations
- **Methods**:

  - `createPaymentIntent(orderId, userId)`: Creates Stripe payment intent and payment record
  - `confirmPayment(paymentIntentId)`: Confirms payment and updates order status
  - `getPaymentById(paymentId, userId)`: Retrieves payment with ownership verification
  - `getPaymentsByOrderId(orderId)`: Gets all payments for an order
  - `getPaymentsByUserId(userId, options)`: Lists user payments with pagination
  - `refundPayment(paymentId, amount)`: Processes refund through Stripe
  - `handleWebhookEvent(event)`: Processes Stripe webhook events

- **Webhook Handlers**:
  - `handlePaymentSucceeded`: Updates payment status to succeeded, order status to confirmed
  - `handlePaymentFailed`: Updates payment status to failed, records failure message
  - `handlePaymentCanceled`: Updates payment status to canceled
  - `handleChargeRefunded`: Updates payment status to refunded, order status to cancelled

#### 3. Payment Controller (`src/controllers/payment.controller.js`)

- **Purpose**: HTTP request handlers for payment endpoints
- **Endpoints**:
  - `POST /api/payments/create-intent`: Create payment intent for order
  - `POST /api/payments/confirm`: Confirm payment completion
  - `GET /api/payments/:id`: Get payment by ID
  - `GET /api/payments`: List user's payments
  - `GET /api/payments/order/:orderId`: Get payments for order
  - `POST /api/payments/webhook`: Handle Stripe webhooks
  - `POST /api/payments/:id/refund`: Refund payment (admin only)

#### 4. Order Model Updates (`src/models/Order.js`)

- **New Fields**:
  - `paymentStatus`: enum ['pending', 'paid', 'failed', 'refunded']
  - `paymentId`: Reference to Payment document
- **Updated Status Enum**: Added 'confirmed', 'preparing', 'ready', 'delivered' states

### Frontend Components

#### 1. Payment API Helper (`lib/api/payment.ts`)

- **Purpose**: Client-side API wrapper for payment operations
- **Functions**:
  - `createPaymentIntent(orderId)`: Initiates payment process
  - `confirmPayment(paymentIntentId)`: Confirms payment on backend
  - `getPaymentById(paymentId)`: Fetches payment details
  - `getUserPayments()`: Lists current user's payments
  - `getOrderPayments(orderId)`: Gets payments for specific order

#### 2. CheckoutForm Component (`components/CheckoutForm.tsx`)

- **Purpose**: Stripe payment form with PaymentElement
- **Features**:
  - Displays total amount prominently
  - Stripe PaymentElement for secure card input
  - Loading states during payment processing
  - Success/error visual feedback
  - Security notice footer
- **Props**:
  - `amount`: Payment amount in cents
  - `orderId`: Order ID for reference
  - `onSuccess`: Callback when payment succeeds
  - `onError`: Callback when payment fails

#### 3. PaymentModal Component (`components/PaymentModal.tsx`)

- **Purpose**: Modal wrapper for checkout flow
- **Features**:
  - Initializes payment intent on mount
  - Wraps CheckoutForm with Stripe Elements provider
  - Custom dark theme matching app design
  - Loading state during initialization
  - Error handling with retry option
  - Confirms payment on backend after Stripe success
- **Props**:
  - `orderId`: Order ID to create payment for
  - `amount`: Payment amount in cents
  - `onSuccess`: Callback when payment confirmed
  - `onError`: Callback when payment fails
  - `onClose`: Callback to close modal

#### 4. Payment Success Page (`app/payment/success/page.tsx`)

- **Purpose**: Payment confirmation page
- **Features**:
  - Animated success icon
  - Order ID display
  - Next steps for user
  - Links to order tracking and home

#### 5. Payment Failed Page (`app/payment/failed/page.tsx`)

- **Purpose**: Payment failure page
- **Features**:
  - Clear error messaging
  - Common failure reasons
  - Retry payment button
  - Support contact link

#### 6. Cart Page Integration (`app/cart/page.tsx`)

- **Updates**:
  - Removed old "order placed" animation
  - Added payment modal state
  - Modified "Place Order" to create order and show payment modal
  - Added payment success handler (clears cart, redirects to success page)
  - Added payment error handler (redirects to failed page)

## Payment Flow

### User Journey

1. **Add Items to Cart**: User browses menu and adds items
2. **Navigate to Cart**: User reviews cart contents and summary
3. **Click "Place Order"**:

   - Backend creates Order document (status: pending, paymentStatus: pending)
   - Frontend saves order ID
   - Payment modal appears

4. **Enter Payment Details**:

   - User enters card information in Stripe PaymentElement
   - Stripe validates card client-side

5. **Submit Payment**:

   - Frontend calls `stripe.confirmPayment()`
   - Stripe processes payment
   - If successful: Frontend calls backend `confirmPayment()` endpoint
   - Backend updates payment and order status
   - Cart is cleared
   - User redirected to success page

6. **View Confirmation**:
   - Success page shows order details
   - User can track order status

### Technical Flow

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ 1. Place Order
       ▼
┌─────────────┐
│  Frontend   │
└──────┬──────┘
       │ 2. POST /api/orders
       ▼
┌─────────────┐
│   Backend   │◄───┐
└──────┬──────┘    │
       │            │ 5. Webhook Events
       │ 3. Create  │    (async)
       │    Payment │
       │    Intent  │
       ▼            │
┌─────────────┐    │
│   Stripe    ├────┘
└──────┬──────┘
       │ 4. Return Client Secret
       ▼
┌─────────────┐
│  Frontend   │
└──────┬──────┘
       │ 6. User Submits Card
       ▼
┌─────────────┐
│   Stripe    │
└──────┬──────┘
       │ 7. Process Payment
       ▼
┌─────────────┐
│  Frontend   │
└──────┬──────┘
       │ 8. POST /api/payments/confirm
       ▼
┌─────────────┐
│   Backend   │
└──────┬──────┘
       │ 9. Update Order Status
       ▼
┌─────────────┐
│  Database   │
└─────────────┘
```

## Security Features

### Backend Security

- **Environment Variables**: All Stripe keys stored in `.env`
- **Webhook Signature Verification**: All webhook events verified with signing secret
- **Authentication Required**: All payment endpoints require valid JWT
- **Ownership Verification**: Users can only access their own payments
- **Admin-Only Refunds**: Refund endpoint restricted to admin users
- **Raw Body for Webhooks**: Special middleware preserves raw body for signature verification

### Frontend Security

- **Stripe Elements**: Handles sensitive card data, never touches our servers
- **HTTPS Required**: Production must use HTTPS (Stripe requirement)
- **Publishable Key Only**: Frontend only has non-sensitive publishable key
- **No Card Storage**: Card details never stored in our database
- **PCI Compliance**: Achieved through Stripe integration

## Error Handling

### Backend Errors

- **Order Not Found**: Returns 404 if order doesn't exist
- **Unauthorized Access**: Returns 403 if user doesn't own order
- **Stripe API Errors**: Caught and returned with user-friendly messages
- **Webhook Failures**: Logged for investigation, Stripe retries automatically
- **Database Errors**: Caught and logged, user sees generic error

### Frontend Errors

- **Network Errors**: Display user-friendly message, suggest retry
- **Card Declined**: Show specific decline reason if available
- **3D Secure Required**: Stripe redirects user to complete authentication
- **Timeout**: User can retry or contact support
- **Session Expired**: Redirect to login page

## Testing

### Test Cards (from Stripe)

```
Success: 4242 4242 4242 4242
Declined: 4000 0000 0000 9995
3D Secure: 4000 0025 0000 3155
Insufficient Funds: 4000 0000 0000 9987

Expiry: Any future date (e.g., 12/25)
CVC: Any 3 digits (e.g., 123)
ZIP: Any 5 digits (e.g., 12345)
```

### Test Scenarios

1. **Successful Payment**:

   - Create order
   - Use test card 4242...
   - Verify payment succeeds
   - Check order status updated to "confirmed"
   - Verify payment record created

2. **Declined Card**:

   - Create order
   - Use test card 4000 0000 0000 9995
   - Verify payment fails
   - Check order remains "pending"
   - User can retry payment

3. **3D Secure**:

   - Use card 4000 0025 0000 3155
   - Complete test authentication
   - Payment succeeds after auth

4. **Webhook Processing**:
   - Trigger test webhook events
   - Verify database updates
   - Check order status changes

### Local Testing with Stripe CLI

```bash
# Forward webhooks to local backend
stripe listen --forward-to localhost:4000/api/payments/webhook

# Trigger test events
stripe trigger payment_intent.succeeded
stripe trigger payment_intent.payment_failed
stripe trigger charge.refunded
```

## Environment Configuration

### Backend `.env`

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Frontend `.env.local`

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

## Production Checklist

- [ ] Switch to live Stripe keys
- [ ] Configure production webhook endpoint
- [ ] Enable HTTPS on all domains
- [ ] Set up monitoring and alerts
- [ ] Implement rate limiting
- [ ] Enable database backups
- [ ] Test end-to-end flow
- [ ] Document support procedures
- [ ] Set up error tracking (e.g., Sentry)
- [ ] Review and update refund policy

## Future Enhancements

- **Multiple Payment Methods**: Add support for Apple Pay, Google Pay, ACH
- **Saved Cards**: Allow users to save cards for future purchases
- **Split Payments**: Support group orders with split payment
- **Coupons/Discounts**: Apply promo codes before payment
- **Recurring Payments**: Subscription-based meal plans
- **Internationalization**: Support multiple currencies
- **Payment Analytics**: Dashboard for admin to view payment metrics
- **Automated Refunds**: Policy-based automatic refund processing

## Troubleshooting

### Common Issues

**Payment Modal Doesn't Appear**

- Check browser console for errors
- Verify `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set
- Ensure backend is running and accessible

**"Invalid API Key"**

- Verify API keys match environment (test vs live)
- Check for whitespace in `.env` files
- Restart servers after updating environment variables

**Webhook Signature Verification Failed**

- Ensure webhook secret matches endpoint
- Check that webhook route uses `express.raw()`
- Verify endpoint URL is correct in Stripe dashboard

**Payment Succeeds but Order Not Updated**

- Check backend logs for webhook processing errors
- Verify webhook endpoint is reachable from Stripe
- Test webhook locally with Stripe CLI

## Related Documentation

- [PAYMENT_SETUP.md](./PAYMENT_SETUP.md) - Complete setup guide
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - API reference
- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Testing Guide](https://stripe.com/docs/testing)

## Support

For issues related to payment processing:

1. Check browser console and backend logs
2. Review [Stripe Dashboard Logs](https://dashboard.stripe.com/test/logs)
3. Test with Stripe CLI locally
4. Contact development team with reproduction steps
