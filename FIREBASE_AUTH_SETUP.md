# Firebase Phone Authentication Setup Guide

> Complete guide to fix `auth/invalid-app-credential` and `reCAPTCHA already rendered` errors

---

## 🔴 Common Errors & Solutions

| Error | Cause | Fix |
|-------|-------|-----|
| `auth/invalid-app-credential` | `localhost` not in authorized domains | Add to Firebase Console |
| `reCAPTCHA has already been rendered` | Multiple reCAPTCHA instances | Use Singleton pattern in code |
| `auth/network-request-failed` | Slow network / timeout | Add 1-second delay before Firebase call |
| `auth/too-many-requests` | Too many OTP attempts | Wait 1 hour or use test number |

---

## 📋 Firebase Console Configuration

### Step 1: Enable Phone Authentication

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **SaarthiRx**
3. Navigate: **Authentication** → **Sign-in method**
4. Find **Phone** and click on it
5. Toggle **Enable** to ON
6. Click **Save**

![Enable Phone Auth](https://firebase.google.com/docs/auth/images/phone-auth-enable.png)

---

### Step 2: Add Authorized Domains

This is **CRITICAL** for localhost development.

1. Go to: **Authentication** → **Settings**
2. Click on **Authorized domains** tab
3. Click **Add domain**
4. Add these domains one by one:

```
localhost
127.0.0.1
```

5. Later, add your production domain:
```
your-app-name.web.app
your-app-name.firebaseapp.com
```

> ⚠️ **Without this step, you'll always get `auth/invalid-app-credential`**

---

### Step 3: Add Test Phone Numbers (Optional but Recommended)

To avoid using real SMS during development:

1. Go to: **Authentication** → **Sign-in method** → **Phone**
2. Scroll down to **Phone numbers for testing**
3. Click **Add phone number**
4. Add:

| Phone Number | Verification Code |
|--------------|-------------------|
| +919999888877 | 123456 |
| +911234567890 | 111111 |

5. Click **Save**

> 💡 **Tip:** Test numbers don't send real SMS and don't count against your quota

---

## 🔧 Code Fixes Required

### Fix 1: Singleton Pattern for reCAPTCHA

**Problem:** Every component re-render creates a new reCAPTCHA instance.

**Solution:** Check if verifier exists before creating.

```javascript
// In authService.js - setupRecaptcha function
export const setupRecaptcha = (containerId) => {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`Container #${containerId} not found`);
        return null;
    }

    // SINGLETON: Don't create if already exists
    if (window.recaptchaVerifier) {
        return window.recaptchaVerifier;
    }

    // Only create new instance if null
    window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
        // ... callbacks
    });

    return window.recaptchaVerifier;
};
```

---

### Fix 2: 1-Second Delay for Slow Networks

**Problem:** `signInWithPhoneNumber` is called before reCAPTCHA scripts load on 3G networks.

**Solution:** Add a delay.

```javascript
// In authService.js - sendOtp function
export const sendOtp = async (phoneNumber) => {
    try {
        if (!window.recaptchaVerifier) {
            setupRecaptcha('recaptcha-container');
        }

        // BUFFER: Wait for external scripts to load
        await new Promise(resolve => setTimeout(resolve, 1000));

        confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
        return true;
    } catch (error) {
        // ... error handling
    }
};
```

---

### Fix 3: Smart Error Handling

**Problem:** Clearing reCAPTCHA on every error causes issues on retry.

**Solution:** Only clear on critical errors.

```javascript
// In sendOtp catch block
catch (error) {
    // Log critical error for developer
    if (error.code === 'auth/invalid-app-credential') {
        console.error('CRITICAL: Add localhost to Firebase Authorized Domains!');
    }

    // Only clear verifier on non-network errors
    if (error.code !== 'auth/network-request-failed') {
        if (window.recaptchaVerifier) {
            window.recaptchaVerifier.clear();
            window.recaptchaVerifier = null;
        }
    }

    throw error;
}
```

---

### Fix 4: Prevent Double-Click Bug

**Problem:** User clicks "Send OTP" twice, creating two requests.

**Solution:** Disable button immediately using `isLoading` state.

```javascript
// In Register.jsx
const handleNext = async () => {
    if (isLoading) return; // Prevent double-click
    setIsLoading(true);    // Disable button immediately

    // ... rest of the logic

    setIsLoading(false);   // Re-enable on complete
};
```

---

## 🔒 reCAPTCHA Container Setup

Add an invisible container in your Register.jsx:

```jsx
{/* reCAPTCHA Container - Must be in DOM but invisible */}
<div id="recaptcha-container" className="invisible"></div>
```

> The container must exist in DOM before `setupRecaptcha` is called

---

## ✅ Verification Checklist

Run through this checklist before testing:

- [ ] Firebase Console: Phone auth enabled
- [ ] Firebase Console: `localhost` added to authorized domains
- [ ] Firebase Console: Test phone numbers added (optional)
- [ ] Code: Singleton pattern in `setupRecaptcha`
- [ ] Code: 1-second delay in `sendOtp`
- [ ] Code: Smart error handling (don't clear on network errors)
- [ ] Code: `isLoading` prevents double-click
- [ ] Restart dev server: `npm run dev`

---

## 🔥 Testing the Fix

1. **Clear browser data:**
   - Chrome DevTools → Application → Storage → Clear site data

2. **Restart dev server:**
   ```bash
   npm run dev
   ```

3. **Test with test number:**
   ```
   Phone: 9999888877
   OTP: 123456
   ```

4. **Check console for errors:**
   - Should NOT see "reCAPTCHA already rendered"
   - Should NOT see "invalid-app-credential" (if localhost is added)

---

## 📱 Production Deployment

When deploying to production:

1. Add your production domain to Authorized Domains:
   ```
   your-app.web.app
   your-app.firebaseapp.com
   ```

2. Enable Firebase App Check (optional security)

3. Monitor SMS quota in Firebase Console

---

## 🆘 Troubleshooting

| Symptom | Solution |
|---------|----------|
| OTP never arrives | Check spam, try different number, check Firebase quota |
| "Too many requests" | Wait 1 hour, use test number |
| Works on phone, not laptop | Clear browser cache, check authorized domains |
| Works in Chrome, not Safari | Safari blocks 3rd party cookies - user must allow |

---

*Last Updated: January 2026*
