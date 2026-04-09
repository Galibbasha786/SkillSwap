# CAPTCHA Implementation Guide

This guide explains how to set up Google reCAPTCHA v2 for the SkillSwap login feature.

## What is CAPTCHA?

CAPTCHA (Completely Automated Public Turing test to tell Computers and Humans Apart) helps protect your application from automated attacks and brute force login attempts. Google reCAPTCHA v2 displays a checkbox ("I'm not a robot") that users must click before logging in.

## Step 1: Get reCAPTCHA Keys

1. Go to [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Sign in with your Google account
3. Click the **"+"** button to create a new site
4. Fill in the form:
   - **Label**: Enter a name (e.g., "SkillSwap Login")
   - **reCAPTCHA type**: Select **reCAPTCHA v2**
   - **reCAPTCHA v2 type**: Choose **"I'm not a robot" Checkbox**
   - **Domains**: Add your domain (e.g., `localhost` for development, `yourdomain.com` for production)
5. Accept the terms and click **Submit**
6. Note down your **Site Key** and **Secret Key**

## Step 2: Frontend Setup

### 2.1 Install Dependencies
```bash
cd frontend-web
npm install
```

The `react-google-recaptcha` package is already added to `package.json`.

### 2.2 Configure Environment Variables

1. Create a `.env` file in the `frontend-web` directory (or copy from `.env.example`):

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_STRIPE_KEY=pk_test_your_stripe_key
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_RECAPTCHA_SITE_KEY=your_recaptcha_site_key
```

Replace `your_recaptcha_site_key` with the **Site Key** from step 1.

### 2.3 Verify Frontend Integration

The CAPTCHA widget is already integrated in the Login component:
- Location: `frontend-web/src/pages/Login.jsx`
- The reCAPTCHA checkbox appears before the "Sign In" button
- Users must complete the CAPTCHA before login

## Step 3: Backend Setup

### 3.1 Install Dependencies
```bash
cd backend
npm install
```

The `axios` package is already added to `package.json` for making HTTP requests to Google's verification API.

### 3.2 Configure Environment Variables

1. Create a `.env` file in the `backend` directory (or copy from `.env.example`):

```env
MONGO_URI=mongodb://localhost:27017/skillswap
JWT_SECRET=your_jwt_secret_key
PORT=5000
GOOGLE_CLIENT_ID=your_google_client_id
RECAPTCHA_SECRET_KEY=your_recaptcha_secret_key
# ... other variables
```

Replace `your_recaptcha_secret_key` with the **Secret Key** from step 1.

### 3.3 Backend Integration

The backend integration includes:
- **Middleware**: `backend/middleware/captcha.js` - Verifies CAPTCHA tokens with Google
- **Route**: `backend/routes/authRoutes.js` - The login route now uses the CAPTCHA middleware
- **Controller**: `backend/controllers/authController.js` - The login controller works as before

## Step 4: Testing

### Test Locally

1. Start the backend server:
```bash
cd backend
npm run dev
```

2. Start the frontend development server:
```bash
cd frontend-web
npm run dev
```

3. Navigate to the login page
4. Enter credentials and complete the CAPTCHA checkbox
5. Click "Sign In"
6. If successful, you'll see the dashboard; if CAPTCHA fails, an error message appears

### Test CAPTCHA Verification

The CAPTCHA middleware will:
1. Check if `captchaToken` is provided in the login request
2. Send the token to Google's verification API
3. Verify if the token is valid
4. Allow login only if CAPTCHA is verified

If CAPTCHA verification fails:
- Error: `"CAPTCHA verification failed"`
- The CAPTCHA widget resets automatically for retry

## Step 5: Production Deployment

### Update Domain in reCAPTCHA Console

1. Go to [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Select your SkillSwap site
3. Click **Settings** (gear icon)
4. Update **Domains** to include your production domain
5. Save changes

### Update Environment Variables

Update `.env` in production:

**Frontend** (`frontend-web/.env.production`):
```env
VITE_RECAPTCHA_SITE_KEY=your_production_site_key
```

**Backend** (`.env`):
```env
RECAPTCHA_SECRET_KEY=your_production_secret_key
```

## Architecture Overview

```
Login Flow with CAPTCHA:
│
├─ User enters credentials
├─ Frontend loads reCAPTCHA widget
├─ User clicks "I'm not a robot"
├─ Google verifies user is human → returns token
├─ Frontend sends: { email, password, captchaToken }
├─ Backend CAPTCHA middleware verifies token with Google
├─ If valid → Authentication proceeds
├─ If invalid → Error response to frontend
└─ Frontend shows error & resets CAPTCHA
```

## Security Features

1. **Server-side Verification**: CAPTCHA is verified server-side, not just client-side
2. **Token-based**: Each session gets a unique token
3. **Automatic Expiration**: Tokens expire quickly (Google's default)
4. **Rate Limiting Ready**: Backend is ready for additional rate limiting middleware

## Troubleshooting

### CAPTCHA not showing
- **Check**: `VITE_RECAPTCHA_SITE_KEY` in environment variables
- **Check**: Domain is allowed in reCAPTCHA admin console
- **Check**: No browser console errors

### "CAPTCHA verification failed"
- **Check**: `RECAPTCHA_SECRET_KEY` in backend `.env`
- **Check**: Ensure you're using the correct Site Key and Secret Key pair
- **Check**: User completed the CAPTCHA before submitting

### Token verification timeout
- **Check**: Internet connection (backend needs to reach Google's API)
- **Check**: Firewall rules allow outbound HTTPS to Google servers

## Files Modified

### Frontend:
- `frontend-web/package.json` - Added `react-google-recaptcha`
- `frontend-web/src/pages/Login.jsx` - Added CAPTCHA component
- `frontend-web/src/hooks/useAuth.jsx` - Updated login to pass captchaToken
- `frontend-web/.env.example` - Added RECAPTCHA config

### Backend:
- `backend/package.json` - Added `axios`
- `backend/middleware/captcha.js` - New CAPTCHA verification middleware
- `backend/routes/authRoutes.js` - Added captchaMiddleware to login
- `backend/.env.example` - Added RECAPTCHA config

## Additional Resources

- [Google reCAPTCHA Documentation](https://developers.google.com/recaptcha)
- [reCAPTCHA v2 Setup Guide](https://developers.google.com/recaptcha/docs/v2/start)
- [react-google-recaptcha NPM](https://www.npmjs.com/package/react-google-recaptcha)

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify all environment variables are set correctly
3. Check browser and server console for error messages
4. Ensure the domain is whitelisted in reCAPTCHA admin console
