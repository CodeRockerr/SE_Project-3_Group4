# Quick Authentication Debug Guide

## Test if authentication is working

### 1. Check if you're logged in:

Open browser console and run:

```javascript
fetch("/api/auth/me", { credentials: "include" })
  .then((r) => r.json())
  .then(console.log);
```

**Expected**: `{ success: true, user: {...} }`  
**If 401**: You're not logged in - login first

### 2. Test payment endpoint authentication:

```javascript
// First, login to get authenticated
// Then test payment endpoint
fetch("/api/proxy?path=%2Fapi%2Fpayments", {
  credentials: "include",
})
  .then((r) => {
    console.log("Status:", r.status);
    return r.json();
  })
  .then(console.log);
```

**Expected**: Status 200 with `{ success: true, payments: [] }`  
**If 401**: Authentication issue - try steps below

### 3. Check cookies:

```javascript
console.log(document.cookie);
```

**Expected**: Should show `accessToken` and `refreshToken`  
**If empty**: Login again

### 4. Force token refresh:

```javascript
fetch("/api/auth/refresh", {
  method: "POST",
  credentials: "include",
})
  .then((r) => r.json())
  .then(console.log);
```

**Expected**: `{ success: true }`  
**If error**: Your refresh token is expired - login again

### 5. Test payment creation:

First create an order, then try payment:

```javascript
// Step 1: Create order
fetch("/api/proxy?path=%2Fapi%2Forders", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
})
  .then((r) => r.json())
  .then((order) => {
    console.log("Order created:", order._id);

    // Step 2: Create payment intent
    return fetch("/api/proxy?path=%2Fapi%2Fpayments%2Fcreate-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: order._id }),
      credentials: "include",
    });
  })
  .then((r) => {
    console.log("Payment API Status:", r.status);
    return r.json();
  })
  .then(console.log);
```

**Expected**: Payment intent with `clientSecret`  
**If 401**: Authentication still failing

---

## If Still Getting 401 Errors:

### Option 1: Clear everything and start fresh

```javascript
// Clear all cookies and local storage
document.cookie.split(";").forEach((c) => {
  document.cookie = c
    .replace(/^ +/, "")
    .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
});
localStorage.clear();
sessionStorage.clear();

// Then reload and login again
location.reload();
```

### Option 2: Check backend token validation

Make sure your backend `.env` has:

```env
JWT_SECRET=your_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
```

### Option 3: Verify token format

In browser console after login:

```javascript
fetch("/api/auth/me", { credentials: "include" }).then((r) => {
  // Check the request headers in Network tab
  console.log("Check Network tab -> Headers -> Cookie");
});
```

Should show `accessToken=eyJhbG...` (JWT format)

---

## Quick Fix Steps:

1. **Logout** (if you have logout button) or clear cookies
2. **Close all browser tabs** for localhost:3000
3. **Restart frontend**:
   ```bash
   cd Howl2Go_frontend
   # Press Ctrl+C to stop
   npm run dev
   ```
4. **Login fresh**
5. **Try payment again**

---

## Still Not Working?

Check these files have correct environment variables:

**Backend** `.env`:

```env
JWT_SECRET=<your_secret>
JWT_REFRESH_SECRET=<your_refresh_secret>
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
```

**Frontend** `.env.local`:

```env
BACKEND_URL=http://localhost:4000
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

Then restart **both** servers!
