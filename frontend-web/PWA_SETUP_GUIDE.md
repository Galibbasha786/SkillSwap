# PWA Setup & Installation Guide for SkillSwap

## ✅ What We've Done

1. ✅ Installed `vite-plugin-pwa` dependency
2. ✅ Updated `vite.config.js` with PWA configuration
3. ✅ Updated `index.html` with PWA meta tags
4. ✅ Created `PWAInstallBanner.jsx` component
5. ✅ Created `usePWAInstall.jsx` hook
6. ✅ Updated `App.jsx` to include PWA banner
7. ✅ Created `browserconfig.xml` for Windows
8. ✅ Updated `package.json` with PWA plugin

---

## 📋 Next Steps You Need to Complete

### **STEP 1: Install Dependencies**

Run this command in the `frontend-web` directory:

```bash
cd frontend-web
npm install
```

This will install the new `vite-plugin-pwa` plugin.

---

### **STEP 2: Create App Icons** 

You'll need to create/generate these icon files and place them in `public/icons/`:

**Required files:**
- ✅ `icon-192x192.png` (192×192px)
- ✅ `icon-512x512.png` (512×512px)
- ✅ `icon-maskable-192x192.png` (192×192px - maskable)
- ✅ `icon-maskable-512x512.png` (512×512px - maskable)
- ✅ `screenshot-1.png` (540×720px - mobile/narrow view)
- ✅ `screenshot-2.png` (1280×720px - desktop/wide view)

**How to generate icons:**

**Option A: Using PWABuilder (Recommended)**
1. Go to https://www.pwabuilder.com/
2. Upload your app logo
3. Generate icons for all required sizes
4. Download and place in `public/icons/`

**Option B: Using Online Tools**
- https://realfavicongenerator.net/
- https://favicon-generator.org/
- https://www.favicon-generator.org/

**Option C: Using Figma**
1. Create a 512×512 design
2. Export as PNG
3. Create 192×192 version (50% scale)
4. Use both as base and maskable icons

**Maskable Icons Tip:**
- Ensure your logo has 20% padding from edges
- Should look good on any background color
- Test at https://maskable.app/

---

### **STEP 3: Build the Project**

```bash
npm run build
```

This will:
- Compile your React app
- Generate the `manifest.json` automatically
- Create optimized PWA assets
- Output to the `dist` folder

---

### **STEP 4: Test the PWA Locally**

After building, test locally:

```bash
npm run preview
```

Open `http://localhost:4173` in your browser.

**Testing checklist:**
- ✅ Open DevTools → Application → Manifest (verify manifest.json loads)
- ✅ Check Service Workers tab (should show registered worker)
- ✅ Look for install prompt banner at top
- ✅ Click "Install" button to test installation
- ✅ Check installed app works offline (throttle network)

---

### **STEP 5: Deploy to Production**

Ensure your production URL uses **HTTPS** (required for PWA).

#### **If deploying to Vercel:**

```bash
# Vercel automatically deploys from Git
git push origin main
```

Vercel will:
- Build automatically
- Deploy with HTTPS enabled
- Make PWA installable immediately

#### **If deploying to other hosting:**

Ensure:
- ✅ HTTPS is enabled
- ✅ Service Worker path is correct
- ✅ CORS headers are properly set
- ✅ Cache headers are configured

---

### **STEP 6: Users Can Now Install the App**

Once deployed, users will see the install banner:

**On Android (Chrome/Firefox):**
1. See "Install SkillSwap" banner at top
2. Click "Install" button
3. App installed to home screen
4. App works offline after first visit

**On iOS (Safari 16.4+):**
1. Open Safari
2. Tap Share button
3. Tap "Add to Home Screen"
4. App installed to home screen

**On Desktop (Chrome/Edge/Opera):**
1. Click the install icon in address bar (or banner)
2. Click "Install"
3. App opens in standalone window

---

## 🔧 Configuration Notes

### **Manifest.json** (Auto-generated)
Located in build output, contains:
- App name, icons, colors
- Start URL, display mode
- App shortcuts
- Screenshots

### **Service Worker** (Auto-generated)
Handles:
- Offline functionality
- Cache updates
- Background sync
- Push notifications (ready to implement)

### **Workbox Configuration**
Current caching strategy:
- **API calls**: NetworkFirst (fresh data when online)
- **Images**: CacheFirst (fast loading, updated periodically)

---

## 📊 PWA Features Enabled

✅ **Installable** - Users can install to home screen  
✅ **Offline Support** - Works without internet  
✅ **Fast Loading** - Service worker caching  
✅ **App Shortcuts** - Quick access to marketplace & matches  
✅ **Smart Updates** - Auto-updates service worker  
✅ **Screenshots** - Shows in app stores  

---

## 🎨 Customizing the PWA

### **Change App Name/Description**

Edit `vite.config.js`:
```javascript
manifest: {
  name: 'Your New Name',
  description: 'Your description',
  theme_color: '#YourColor',
  background_color: '#YourColor'
}
```

### **Change App Colors**

Edit `vite.config.js`:
```javascript
theme_color: '#3b82f6',      // Blue header color
background_color: '#ffffff'   // White background
```

Edit `index.html`:
```html
<meta name="theme-color" content="#3b82f6">
```

### **Add More Shortcuts**

Edit `vite.config.js` in the `shortcuts` array:
```javascript
shortcuts: [
  {
    name: 'Your Feature',
    url: '/your-path',
    icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }]
  }
]
```

---

## 🐛 Troubleshooting

### **PWA Won't Install**
- Check HTTPS is enabled
- Verify manifest.json loads (DevTools → Application)
- Check service worker registered (DevTools → Service Workers)
- Clear browser cache and try again

### **Service Worker Not Updating**
- Clear browser cache
- Run `npm run build` again
- Manual clear in DevTools → Service Workers → Unregister

### **Icons Not Showing**
- Verify icon files in `public/icons/` exact size
- Check file names match config in `vite.config.js`
- Clear browser cache
- Test with https://realfavicongenerator.net/

### **Offline Not Working**
- Check Service Workers tab shows "activated"
- Verify Workbox config in `vite.config.js`
- Test in DevTools with offline throttling
- Check Network tab for cached requests

---

## 📱 Distribution

Once PWA is ready, share with users:

### **Share App Link**
Users can install directly from:
- **Website**: https://yoursite.com (install button)
- **Mobile**: See banner or use browser menu

### **Add to App Stores (Optional)**
Use services like:
- **Microsoft Store** - PWABuilder
- **Google Play** - PWABuilder
- **App Store** - PWABuilder (iOS)
- **Samsung Galaxy Store** - Manual submission

---

## 🔐 Important Notes

- Always use HTTPS in production
- Keep service worker updated
- Monitor for breaking changes in dependencies
- Test on real devices, not just emulators
- Gather user feedback on app experience

---

## ✨ Future Enhancements

This PWA setup supports adding:
- 🔔 **Push Notifications**
- 🔄 **Background Sync**
- 💾 **IndexedDB Storage**
- 🎤 **Microphone/Camera Access**
- 📍 **Geolocation Services**

---

**Build command:**
```bash
npm run build
```

**Preview command:**
```bash
npm run preview
```

**Create successful PWA! 🚀**
