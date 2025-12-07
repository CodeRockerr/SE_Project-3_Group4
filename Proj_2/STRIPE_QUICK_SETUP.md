# 🔧 Stripe Payment Setup - Quick Guide

## ⚡ Quick Setup (5 minutes)

### Step 1: Get Stripe Test Keys

1. **Sign up for Stripe** (if you don't have an account):
   - Go to: https://stripe.com
   - Click "Sign up" (free account)

2. **Get your Test API Keys**:
   - Go to: https://dashboard.stripe.com/test/apikeys
   - Make sure you're in **Test mode** (toggle in top-right)
   - You'll see:
     - **Publishable key**: `pk_test_51...` (starts with `pk_test_`)
     - **Secret key**: `sk_test_51...` (starts with `sk_test_`) - Click "Reveal" to see it

3. **Copy both keys** - you'll need them in the next steps

---

### Step 2: Configure Frontend

1. **Navigate to frontend directory:**
   ```bash
   cd Proj_2/Howl2Go_frontend
   ```

2. **Create `.env.local` file** (if it doesn't exist):
   ```bash
   # On Windows (PowerShell)
   New-Item -Path .env.local -ItemType File -Force
   ```

3. **Add your Stripe publishable key**:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:4000
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
   ```

4. **Restart your frontend server**:
   ```bash
   # Stop the server (Ctrl+C) and restart
   npm run dev
   ```

---

### Step 3: Configure Backend

1. **Navigate to backend directory:**
   ```bash
   cd Proj_2/Howl2Go_backend
   ```

2. **Create `.env` file** (if it doesn't exist):
   ```bash
   # On Windows (PowerShell)
   New-Item -Path .env -ItemType File -Force
   ```

3. **Add your Stripe secret key**:
   ```env
   PORT=4000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:3000
   
   # Your MongoDB URI (if you have it)
   MONGODB_URI=your_mongodb_uri_here
   
   # Your Groq API key (if you have it)
   GROQ_API_KEY=your_groq_key_here
   
   # Stripe Configuration
   STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
   STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
   STRIPE_WEBHOOK_SECRET=
   
   # Generate these secure random strings (32+ characters)
   JWT_SECRET=your_secure_random_string_here_min_32_chars
   JWT_REFRESH_SECRET=your_secure_random_string_here_min_32_chars
   SESSION_SECRET=your_secure_random_string_here_min_32_chars
   ```

4. **Restart your backend server**:
   ```bash
   # Stop the server (Ctrl+C) and restart
   npm run dev
   ```

---

### Step 4: Test Payment

1. **Add items to cart** in your app
2. **Click "Proceed to Payment"**
3. **Payment modal should appear**
4. **Use test card**:
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., `12/34`)
   - CVC: Any 3 digits (e.g., `123`)
   - ZIP: Any 5 digits (e.g., `12345`)

---

## 🎯 What You Need

### Required (Minimum for Testing):
- ✅ Stripe Publishable Key (Frontend)
- ✅ Stripe Secret Key (Backend)

### Optional (Can add later):
- ⏸️ MongoDB URI (for database)
- ⏸️ Groq API Key (for AI search)
- ⏸️ Stripe Webhook Secret (for production)

---

## 📝 Quick Commands

### Windows PowerShell:

**Frontend:**
```powershell
cd Proj_2/Howl2Go_frontend
echo "NEXT_PUBLIC_API_URL=http://localhost:4000" > .env.local
echo "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY" >> .env.local
```

**Backend:**
```powershell
cd Proj_2/Howl2Go_backend
echo "STRIPE_SECRET_KEY=sk_test_YOUR_KEY" > .env
echo "STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY" >> .env
```

---

## 🔗 Useful Links

- **Stripe Dashboard**: https://dashboard.stripe.com/test/dashboard
- **Get API Keys**: https://dashboard.stripe.com/test/apikeys
- **Test Cards**: https://stripe.com/docs/testing
- **Payment Setup Docs**: [PAYMENT_SETUP.md](docs/PAYMENT_SETUP.md)

---

## ❓ Troubleshooting

**Error: "Payment processing is not configured"**
- ✅ Check that `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set in `.env.local`
- ✅ Restart frontend server after adding keys
- ✅ Make sure the key starts with `pk_test_`

**Error: "Stripe is not configured" (backend)**
- ✅ Check that `STRIPE_SECRET_KEY` is set in `.env`
- ✅ Restart backend server after adding keys
- ✅ Make sure the key starts with `sk_test_`

**Payment modal doesn't appear:**
- ✅ Check browser console for errors
- ✅ Verify Stripe keys are correct
- ✅ Make sure both servers are running

---

## ✅ Success Indicators

When configured correctly, you should:
- ✅ See payment modal when clicking "Proceed to Payment"
- ✅ Be able to enter card details
- ✅ See "Payment successful!" after using test card
- ✅ Get redirected to order history

