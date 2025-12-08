# Payment Processing - Testing Guide

## Quick Start Testing

### Prerequisites

1. Backend server running on `http://localhost:4000`
2. Frontend server running on `http://localhost:3000`
3. Stripe account with test API keys configured
4. User account created and logged in

### Test Flow (5 minutes)

1. **Add items to cart**

   - Navigate to home page
   - Search or browse for food items
   - Click "Add to Cart" on 2-3 items

2. **Navigate to cart**

   - Click cart icon in header
   - Verify items appear correctly
   - Check total amount calculation

3. **Place order**

   - Click "Place Order" button
   - Payment modal should appear
   - Loading state shows while initializing

4. **Enter test card**

   ```
   Card Number: 4242 4242 4242 4242
   Expiry Date: 12/34 (any future date)
   CVC: 123 (any 3 digits)
   ZIP: 12345 (any 5 digits)
   ```

5. **Submit payment**

   - Click "Pay $XX.XX" button
   - Wait for processing (2-3 seconds)
   - Should redirect to success page

6. **Verify success**
   - Success page shows order ID
   - Cart is cleared
   - Check order in "My Orders"

---

## Detailed Testing Scenarios

### Scenario 1: Successful Payment ✅

**Steps:**

```bash
# 1. Start servers
cd Howl2Go_backend && npm run dev
cd Howl2Go_frontend && npm run dev

# 2. In browser:
# - Login at http://localhost:3000/login
# - Add items to cart
# - Go to cart page
# - Click "Place Order"
# - Enter card: 4242 4242 4242 4242
# - Submit payment
```

**Expected Results:**

- ✅ Payment modal appears after clicking "Place Order"
- ✅ Payment form loads without errors
- ✅ "Pay" button is clickable
- ✅ Loading state shows during processing
- ✅ Success message appears
- ✅ Redirected to `/payment/success?orderId=xxx`
- ✅ Cart is cleared
- ✅ Order status is "confirmed"

**Verify in Database:**

```javascript
// MongoDB shell or Compass
db.payments.find().sort({ createdAt: -1 }).limit(1);
// Should show: status: "succeeded"

db.orders.find({ _id: ObjectId("order_id_here") });
// Should show: paymentStatus: "paid", status: "confirmed"
```

**Verify in Stripe Dashboard:**

- Go to https://dashboard.stripe.com/test/payments
- Latest payment should show as "Succeeded"
- Amount should match order total

---

### Scenario 2: Declined Card ❌

**Steps:**

```
Use declined test card: 4000 0000 0000 9995
```

**Expected Results:**

- ✅ Error message appears: "Your card was declined"
- ✅ User stays on payment modal
- ✅ Can retry with different card
- ✅ Order remains in "pending" status
- ✅ Payment record shows status: "failed"

---

### Scenario 3: Insufficient Funds 💳

**Steps:**

```
Use insufficient funds card: 4000 0000 0000 9987
```

**Expected Results:**

- ✅ Error message: "Your card has insufficient funds"
- ✅ Redirected to `/payment/failed` page
- ✅ Order stays pending
- ✅ User can retry payment

---

### Scenario 4: 3D Secure Authentication 🔐

**Steps:**

```
Use 3D Secure card: 4000 0025 0000 3155
```

**Expected Results:**

- ✅ Stripe authentication modal appears
- ✅ Complete authentication (click "Complete" in test mode)
- ✅ Payment succeeds after authentication
- ✅ Order confirmed

---

### Scenario 5: Network Error / Timeout ⚠️

**Steps:**

```bash
# Simulate by stopping backend during payment
cd Howl2Go_backend
# Press Ctrl+C to stop server

# Then try to submit payment in frontend
```

**Expected Results:**

- ✅ Error message displays
- ✅ User can retry
- ✅ No duplicate orders created

---

### Scenario 6: Webhook Processing 🔔

**Setup Stripe CLI:**

```bash
# Install Stripe CLI (if not installed)
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local backend
stripe listen --forward-to localhost:4000/api/payments/webhook
```

**Copy the webhook secret** displayed and add to backend `.env`:

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

**Test Webhook Events:**

```bash
# Trigger successful payment event
stripe trigger payment_intent.succeeded

# Trigger failed payment event
stripe trigger payment_intent.payment_failed

# Trigger refund event
stripe trigger charge.refunded
```

**Verify in Backend Logs:**

```
✓ Webhook received: payment_intent.succeeded
✓ Payment updated: status -> succeeded
✓ Order updated: status -> confirmed
```

**Verify in Database:**

```javascript
// Should see updated payment status
db.payments.find({ status: "succeeded" }).count();

// Should see confirmed orders
db.orders.find({ status: "confirmed" }).count();
```

---

## API Testing with cURL

### Create Payment Intent

```bash
# Login first to get token
TOKEN=$(curl -s -X POST http://localhost:4000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  | jq -r '.accessToken')

# Create order
ORDER_ID=$(curl -s -X POST http://localhost:4000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  | jq -r '._id')

# Create payment intent
curl -X POST http://localhost:4000/api/payments/create-intent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"orderId\":\"$ORDER_ID\"}" \
  | jq '.'

# Expected response:
# {
#   "success": true,
#   "clientSecret": "pi_xxx_secret_xxx",
#   "paymentIntentId": "pi_xxx",
#   "amount": 2999
# }
```

### Get Payment Details

```bash
PAYMENT_ID="<payment_id_from_database>"

curl -X GET http://localhost:4000/api/payments/$PAYMENT_ID \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.'

# Expected response:
# {
#   "success": true,
#   "payment": {
#     "_id": "...",
#     "amount": 2999,
#     "status": "succeeded",
#     "paymentMethod": "card",
#     ...
#   }
# }
```

### List User Payments

```bash
curl -X GET http://localhost:4000/api/payments \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.'

# Expected response:
# {
#   "success": true,
#   "payments": [...],
#   "pagination": {
#     "total": 5,
#     "page": 1,
#     "limit": 10
#   }
# }
```

---

## Frontend Component Testing

### Test CheckoutForm Component

Open browser console while on payment modal:

```javascript
// Check if Stripe is loaded
console.log("Stripe loaded:", !!window.Stripe);

// Check Elements initialization
// Should see Stripe Elements iframe in DOM
document.querySelector('iframe[name^="__privateStripeFrame"]');

// Check form state
// Should be enabled and ready
document.querySelector('form button[type="submit"]').disabled;
// false = ready to submit
```

### Test PaymentModal Component

```javascript
// Check payment intent initialization
// Should see log in console:
"Creating payment intent for order: <orderId>";

// Check client secret received
// Should be in format: pi_xxx_secret_xxx
localStorage.getItem("payment_debug"); // if you add debug logging
```

---

## Error Handling Tests

### Test 1: Missing Stripe Keys

```bash
# Remove Stripe keys from .env
# Restart backend
# Try to create payment

# Expected: 500 error with message about missing API key
```

### Test 2: Invalid Order ID

```bash
curl -X POST http://localhost:4000/api/payments/create-intent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"orderId":"invalid_id"}' \
  | jq '.'

# Expected: 400 or 404 error
```

### Test 3: Unauthorized Access

```bash
# Try to access payment without token
curl -X GET http://localhost:4000/api/payments/123 \
  | jq '.'

# Expected: 401 Unauthorized
```

### Test 4: Payment for Another User's Order

```bash
# Login as user A
# Create order as user A
# Get order ID
# Logout

# Login as user B
# Try to pay for user A's order

# Expected: 403 Forbidden
```

---

## Browser Testing Checklist

### Visual Tests

- [ ] Payment modal appears centered
- [ ] Modal has dark theme matching app
- [ ] Loading spinner shows during initialization
- [ ] Stripe Elements iframe loads correctly
- [ ] Card input fields are styled properly
- [ ] Error messages display in red
- [ ] Success messages display in green
- [ ] Amount displays correctly formatted
- [ ] Close button works
- [ ] Modal closes on backdrop click

### Functionality Tests

- [ ] Can enter card number with auto-formatting
- [ ] Can enter expiry date (MM/YY format)
- [ ] Can enter CVC code
- [ ] Can enter ZIP code
- [ ] Submit button disables during processing
- [ ] Loading indicator appears during submission
- [ ] Success state shows checkmark
- [ ] Error state shows error icon
- [ ] Can retry after error
- [ ] Modal closes after successful payment

### Responsive Tests

- [ ] Modal works on mobile (375px width)
- [ ] Modal works on tablet (768px width)
- [ ] Modal works on desktop (1920px width)
- [ ] Touch interactions work on mobile
- [ ] Keyboard navigation works

---

## Performance Testing

### Test Payment Flow Speed

```bash
# Time the entire flow
time curl -X POST http://localhost:4000/api/payments/create-intent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"orderId\":\"$ORDER_ID\"}"

# Should complete in < 2 seconds
```

### Test Concurrent Payments

```bash
# Run 5 payments simultaneously
for i in {1..5}; do
  curl -X POST http://localhost:4000/api/payments/create-intent \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"orderId\":\"$ORDER_ID\"}" &
done
wait

# All should succeed without conflicts
```

---

## Security Testing

### Test 1: SQL Injection (should be immune with Mongoose)

```bash
curl -X POST http://localhost:4000/api/payments/create-intent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"orderId":"123; DROP TABLE payments;--"}'

# Expected: Validation error or 404, no DB damage
```

### Test 2: XSS in Payment Metadata

```bash
curl -X POST http://localhost:4000/api/payments/create-intent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"orderId":"123","metadata":"<script>alert(1)</script>"}'

# Expected: Metadata sanitized or escaped
```

### Test 3: Webhook Signature Verification

```bash
# Send webhook without valid signature
curl -X POST http://localhost:4000/api/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{"type":"payment_intent.succeeded"}'

# Expected: 400 error - Invalid signature
```

---

## Monitoring & Debugging

### Backend Logs to Watch

```bash
# Start backend with debug logs
cd Howl2Go_backend
DEBUG=* npm run dev

# Watch for:
✓ "Creating payment intent for order: xxx"
✓ "Payment intent created: pi_xxx"
✓ "Webhook received: payment_intent.succeeded"
✓ "Payment confirmed: xxx"
✓ "Order status updated: confirmed"
```

### Frontend Console Logs

```javascript
// Enable debug logging in browser console
localStorage.setItem("debug", "payment:*");

// Should see:
("Payment intent initialized: pi_xxx");
("Submitting payment...");
("Payment succeeded: pi_xxx");
("Confirming payment with backend...");
("Payment confirmed!");
```

### Stripe Dashboard Monitoring

1. Go to https://dashboard.stripe.com/test/payments
2. Filter by date (today)
3. Check payment statuses
4. View event logs for webhooks
5. Check for failed payments

---

## Common Issues & Solutions

### Issue: Payment modal doesn't appear

**Check:**

- [ ] Frontend environment variable set: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- [ ] Backend running and accessible
- [ ] User is logged in
- [ ] Cart has items

**Solution:**

```bash
# Check frontend .env.local
cat Howl2Go_frontend/.env.local | grep STRIPE

# Restart frontend
cd Howl2Go_frontend
npm run dev
```

### Issue: "Invalid API key" error

**Check:**

- [ ] Backend `.env` has `STRIPE_SECRET_KEY`
- [ ] Key starts with `sk_test_` (test mode)
- [ ] No extra spaces or quotes in `.env`
- [ ] Backend restarted after adding key

**Solution:**

```bash
# Verify key in backend
cd Howl2Go_backend
grep STRIPE_SECRET_KEY .env

# Restart backend
npm run dev
```

### Issue: Webhook signature verification failed

**Check:**

- [ ] `STRIPE_WEBHOOK_SECRET` matches Stripe CLI or dashboard
- [ ] Webhook endpoint uses raw body parser
- [ ] Secret starts with `whsec_`

**Solution:**

```bash
# Get new webhook secret from Stripe CLI
stripe listen --forward-to localhost:4000/api/payments/webhook

# Copy displayed secret to .env
# Restart backend
```

### Issue: Payment succeeds but order not updated

**Check:**

- [ ] Webhook endpoint accessible from Stripe
- [ ] Webhook secret configured correctly
- [ ] Backend logs show webhook received
- [ ] No errors in webhook handler

**Debug:**

```bash
# Check Stripe webhook logs
stripe events list --limit 5

# Check backend logs for webhook processing
# Should see: "Webhook received: payment_intent.succeeded"
```

---

## Test Data Reference

### Test Credit Cards

| Scenario           | Card Number         | Result                  |
| ------------------ | ------------------- | ----------------------- |
| Success            | 4242 4242 4242 4242 | Payment succeeds        |
| Declined           | 4000 0000 0000 9995 | Card declined           |
| Insufficient Funds | 4000 0000 0000 9987 | Insufficient funds      |
| 3D Secure          | 4000 0025 0000 3155 | Requires authentication |
| Expired Card       | 4000 0000 0000 0069 | Expired card            |
| Processing Error   | 4000 0000 0000 0119 | Processing error        |

### Test User Credentials

```json
{
  "email": "test@example.com",
  "password": "password123"
}
```

### Sample Order Amounts

- Small order: $10.50
- Medium order: $29.99
- Large order: $85.00

---

## Automated Testing (Future)

### Jest/Supertest Tests (Backend)

```javascript
// tests/payment.test.js
describe("Payment API", () => {
  test("POST /api/payments/create-intent - creates payment intent", async () => {
    const response = await request(app)
      .post("/api/payments/create-intent")
      .set("Authorization", `Bearer ${token}`)
      .send({ orderId: testOrderId });

    expect(response.status).toBe(200);
    expect(response.body.clientSecret).toBeDefined();
    expect(response.body.paymentIntentId).toMatch(/^pi_/);
  });
});
```

### Cypress E2E Tests (Frontend)

```javascript
// cypress/e2e/payment.cy.js
describe("Payment Flow", () => {
  it("completes successful payment", () => {
    cy.visit("/cart");
    cy.get('[data-testid="place-order-btn"]').click();
    cy.get('[data-testid="card-number"]').type("4242424242424242");
    cy.get('[data-testid="card-expiry"]').type("1234");
    cy.get('[data-testid="card-cvc"]').type("123");
    cy.get('[data-testid="submit-payment"]').click();
    cy.url().should("include", "/payment/success");
  });
});
```

---

## Sign-off Checklist

Before marking payment feature as complete:

- [ ] All successful payment scenarios tested
- [ ] All error scenarios tested
- [ ] Webhook processing verified
- [ ] Database records correct
- [ ] Stripe dashboard shows payments
- [ ] Frontend UI works smoothly
- [ ] Mobile responsive
- [ ] Error messages user-friendly
- [ ] Loading states working
- [ ] Security tests passed
- [ ] Documentation complete
- [ ] Environment variables documented
- [ ] Test cards documented

---

**Happy Testing! 🎉**

For issues or questions, refer to:

- [PAYMENT_SETUP.md](./PAYMENT_SETUP.md) - Setup instructions
- [PAYMENT_IMPLEMENTATION.md](./PAYMENT_IMPLEMENTATION.md) - Technical details
- [Stripe Testing Docs](https://stripe.com/docs/testing)
