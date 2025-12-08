# Payment Feature - Quick Test Checklist ✅

## 🚀 Setup (One-time)

```bash
# 1. Backend Setup
cd Howl2Go_backend
echo "STRIPE_SECRET_KEY=sk_test_YOUR_KEY" >> .env
echo "STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY" >> .env
echo "STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET" >> .env
npm install
npm run dev

# 2. Frontend Setup
cd Howl2Go_frontend
echo "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY" >> .env.local
npm install
npm run dev
```

Get your test keys from: https://dashboard.stripe.com/test/apikeys

---

## ⚡ Quick Test (2 minutes)

### Test Successful Payment

1. **Login**: Navigate to http://localhost:3000/login

   ```
   Email: test@example.com
   Password: password123
   ```

2. **Add to Cart**: Browse menu and add 2-3 items

3. **Checkout**: Go to cart → Click "Place Order"

   - ✅ Payment modal should appear
   - ✅ Shows loading while initializing

4. **Pay**: Enter test card details

   ```
   Card: 4242 4242 4242 4242
   Expiry: 12/34
   CVC: 123
   ZIP: 12345
   ```

5. **Submit**: Click "Pay $XX.XX"

   - ✅ Shows processing state
   - ✅ Redirects to success page
   - ✅ Cart is empty

6. **Verify**: Check Stripe Dashboard
   - Go to https://dashboard.stripe.com/test/payments
   - ✅ Payment shows as "Succeeded"

---

## 🧪 Test Scenarios

### ✅ Scenario 1: Successful Payment

- **Card**: `4242 4242 4242 4242`
- **Expected**: Success page, order confirmed, cart cleared
- **Time**: ~5 seconds

### ❌ Scenario 2: Declined Card

- **Card**: `4000 0000 0000 9995`
- **Expected**: Error message "Your card was declined"
- **Action**: Can retry with different card

### 💳 Scenario 3: Insufficient Funds

- **Card**: `4000 0000 0000 9987`
- **Expected**: Error "Insufficient funds"
- **Action**: Redirects to failure page

### 🔐 Scenario 4: 3D Secure

- **Card**: `4000 0025 0000 3155`
- **Expected**: Authentication popup appears
- **Action**: Click "Complete" in test modal
- **Result**: Payment succeeds after auth

---

## 🔍 Visual Checks

### Payment Modal

- [ ] Centered on screen
- [ ] Dark theme matching app
- [ ] Amount displayed correctly ($XX.XX format)
- [ ] Close X button visible
- [ ] Card form loads (Stripe iframe)
- [ ] Submit button says "Pay $XX.XX"

### Loading States

- [ ] Spinner shows while initializing
- [ ] "Processing..." appears during payment
- [ ] Submit button disabled when processing
- [ ] Success checkmark appears on completion

### Error Handling

- [ ] Red error message appears below form
- [ ] Error icon (X in circle) shows
- [ ] User can retry after error
- [ ] Modal stays open on error

### Success Page

- [ ] Green checkmark with animation
- [ ] Shows "Payment Successful!"
- [ ] Displays order ID
- [ ] Has "View Order Status" button
- [ ] Has "Back to Home" link

### Failed Page

- [ ] Red X icon with animation
- [ ] Shows "Payment Failed"
- [ ] Displays error reason
- [ ] Has "Try Again" button
- [ ] Has "Back to Cart" link
- [ ] Has "Contact Support" link

---

## 🔧 API Testing

### Quick API Check

```bash
# Get auth token
TOKEN=$(curl -s -X POST http://localhost:4000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  | jq -r '.accessToken')

# Check if payment endpoints are live
curl -s http://localhost:4000/api/payments \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.success'

# Should return: true
```

### Create Test Payment

```bash
# 1. Create an order first
ORDER_ID=$(curl -s -X POST http://localhost:4000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  | jq -r '._id')

# 2. Create payment intent
curl -X POST http://localhost:4000/api/payments/create-intent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"orderId\":\"$ORDER_ID\"}" \
  | jq '.'

# Should return:
# {
#   "success": true,
#   "clientSecret": "pi_xxx_secret_xxx",
#   "paymentIntentId": "pi_xxx"
# }
```

---

## 🪝 Webhook Testing

### Setup Stripe CLI

```bash
# Install
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks
stripe listen --forward-to localhost:4000/api/payments/webhook
```

Copy the displayed webhook secret (`whsec_xxx`) to your `.env`:

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

Restart backend!

### Trigger Test Events

```bash
# Success event
stripe trigger payment_intent.succeeded
# Check backend logs for: "✓ Webhook received"

# Failed event
stripe trigger payment_intent.payment_failed

# Refund event
stripe trigger charge.refunded
```

---

## 🚨 Troubleshooting

### Problem: Modal doesn't appear

```bash
# Check environment variable
cd Howl2Go_frontend
cat .env.local | grep STRIPE

# Should show: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
# If missing, add it and restart: npm run dev
```

### Problem: "Invalid API key"

```bash
# Check backend env
cd Howl2Go_backend
cat .env | grep STRIPE_SECRET

# Should show: STRIPE_SECRET_KEY=sk_test_...
# Restart backend: npm run dev
```

### Problem: Payment succeeds but order not updated

```bash
# Check webhook setup
stripe listen --forward-to localhost:4000/api/payments/webhook

# Make a test payment
# Check backend logs for: "Webhook received: payment_intent.succeeded"
```

### Problem: CORS error

```bash
# Check frontend URL in backend .env
cat Howl2Go_backend/.env | grep FRONTEND_URL

# Should be: FRONTEND_URL=http://localhost:3000
```

---

## 📊 Database Verification

### Check Payment Records

```javascript
// In MongoDB shell or Compass
use howl2go;

// Find recent payments
db.payments.find().sort({createdAt: -1}).limit(5).pretty()

// Check succeeded payments
db.payments.find({status: "succeeded"}).count()

// Find payment by order
db.payments.find({orderId: ObjectId("YOUR_ORDER_ID")})
```

### Check Order Updates

```javascript
// Find confirmed orders
db.orders.find({ status: "confirmed" }).count();

// Check order payment status
db.orders.find({ paymentStatus: "paid" }).count();

// Find order with payment
db.orders.findOne({ paymentId: { $exists: true } });
```

---

## ✨ Success Criteria

Payment feature is working if:

- [x] Payment modal appears after "Place Order"
- [x] Can enter card details in Stripe form
- [x] Test card 4242... completes successfully
- [x] Redirects to success page
- [x] Cart is cleared after payment
- [x] Order status updates to "confirmed"
- [x] Payment record created in database
- [x] Payment visible in Stripe Dashboard
- [x] Declined cards show error message
- [x] Webhooks update order status
- [x] Failed payments redirect to failure page

---

## 📚 Resources

- **Setup Guide**: [docs/PAYMENT_SETUP.md](./PAYMENT_SETUP.md)
- **Testing Guide**: [docs/PAYMENT_TESTING_GUIDE.md](./PAYMENT_TESTING_GUIDE.md)
- **Implementation**: [docs/PAYMENT_IMPLEMENTATION.md](./PAYMENT_IMPLEMENTATION.md)
- **Stripe Dashboard**: https://dashboard.stripe.com/test
- **Test Cards**: https://stripe.com/docs/testing

---

## 🎯 Next Steps

After confirming basic functionality works:

1. Test with different amounts ($0.50, $10.00, $100.00)
2. Test on mobile device (responsive)
3. Test with slow network (throttle in DevTools)
4. Test error scenarios (all test cards)
5. Set up webhook endpoint for production
6. Add unit tests for payment service
7. Add E2E tests with Cypress

---

**Need Help?**

- Check browser console for errors
- Check backend terminal for logs
- Verify environment variables are set
- Ensure both servers are running
- Test API endpoints with cURL
- Check Stripe Dashboard for payment status

**Questions?**
Refer to [PAYMENT_TESTING_GUIDE.md](./PAYMENT_TESTING_GUIDE.md) for detailed testing scenarios.
