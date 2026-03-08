# 🔔 Push Notification Setup Guide

## Overview
Your SamUr app now has **REAL push notifications** that will:
- ✅ Pop up on your screen like all other apps
- ✅ Show on locked screens
- ✅ Work when the app is completely closed
- ✅ Vibrate and play sounds
- ✅ Work on Android, iOS (when installed as PWA), and Desktop

## Quick Setup (5 minutes)

### Step 1: Copy Environment Variables
```bash
# Copy the example file to create your local environment
cp .env.local.example .env.local
```

Or manually create `.env.local` in the root directory with these keys:
```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BJfF9EznPDMXDaxjrubMuEJ25PaT04JL0FmrQvIGk4HR6IsHQyuSW-uYJMH8_kkJi4mWzhbrfiWEzMZ6lpPthXg
VAPID_PRIVATE_KEY=N8DGn6nQ2yQhRn-lmObwCy1iwaWka4422pVvNkYvQ2A
```

### Step 2: Restart Your Development Server
```bash
# Stop the server (Ctrl+C)
# Then restart it
npm run dev
```

### Step 3: Enable Notifications in Your App
1. Open your app at `http://localhost:3000`
2. Navigate to **Profile/Settings** page
3. Find the **"SamUr Connect"** card
4. Click **"Enable Chimes & Alerts"**
5. Grant notification permission when prompted

### Step 4: Test It!
- Click the **"Send Test"** button in the notification settings
- You should see a popup notification appear on your screen
- Try locking your phone/computer - notifications will still appear!
- Close the app completely - notifications will still work!

## How It Works

### Architecture
```
User Action → API Route → Push Service → Service Worker → Screen Notification
```

1. **Service Worker** (`public/sw.js`): Runs in background, receives push events
2. **Push Manager** (`components/PushNotificationManager.tsx`): Manages subscriptions
3. **API Route** (`app/api/notifications/send/route.ts`): Sends push messages
4. **VAPID Keys**: Authenticate your server with browser push services

### Key Files
- `public/sw.js` - Service worker that displays notifications
- `public/manifest.json` - PWA configuration with notification permissions
- `components/PushNotificationManager.tsx` - UI for managing notifications
- `lib/push-notifications.ts` - Server-side push notification service
- `.env.local` - Your environment variables (VAPID keys)

## Testing on Different Devices

### Desktop (Chrome/Edge/Firefox)
1. Open app in browser
2. Enable notifications in Profile
3. Test immediately - notifications appear even when browser is minimized

### Android
1. Install app: Menu → "Add to Home Screen"
2. Open installed app
3. Enable notifications in Profile
4. Lock screen and test - notifications appear on lock screen!

### iOS/iPhone
1. Safari → Share → "Add to Home Screen"
2. Open installed app
3. Enable notifications in Profile
Note: iOS has restrictions on web push - works best with installed PWA

## Advanced Configuration

### Customizing Notification Behavior

Edit `public/sw.js`:
```javascript
const options = {
  badge: '/icon-192-v2.png',
  vibrate: [200, 100, 200], // Customize vibration pattern
  requireInteraction: true,  // Keep notification until user dismisses
  silent: false,             // Always make sound
  tag: 'custom-tag',        // Group notifications
};
```

### Sending Notifications from Code

```typescript
// From any server-side code
import { PushNotificationService } from '@/lib/push-notifications'

const pushService = new PushNotificationService()
await pushService.sendToUser(
  userId,
  {
    title: 'New Message!',
    body: 'You have a new update',
    url: '/protected/posts',
    icon: '/icon-192-v2.png'
  },
  'message'
)
```

## Troubleshooting

### Notifications Not Appearing?

1. **Check Browser Permissions**
   - Chrome: Settings → Privacy → Site Settings → Notifications
   - Make sure your site is **Allowed**

2. **Verify Service Worker**
   - Open DevTools → Application → Service Workers
   - Should see "activated and running"

3. **Check Environment Variables**
   - Make sure `.env.local` exists with correct VAPID keys
   - Restart dev server after adding .env.local

4. **Test in Private/Incognito Mode**
   - Sometimes regular browser can cache old service workers
   - Incognito starts fresh

5. **Check Console for Errors**
   - DevTools → Console
   - Look for service worker or push subscription errors

### Permission Denied?

If user clicked "Block":
- Chrome: Click 🔒 in address bar → Site Settings → Notifications → Allow
- Edge: Same as Chrome
- Firefox: Click 🔒 → More Information → Permissions → Notifications

### Service Worker Not Updating?

```bash
# In DevTools → Application → Service Workers
# Click "Unregister" then refresh page
# Or use "Update on reload" checkbox
```

## Production Deployment

### Vercel/Netlify
Add environment variables in dashboard:
```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BJfF9EznPDMXDaxjrubMuEJ25PaT04JL0FmrQvIGk4HR6IsHQyuSW-uYJMH8_kkJi4mWzhbrfiWEzMZ6lpPthXg
VAPID_PRIVATE_KEY=N8DGn6nQ2yQhRn-lmObwCy1iwaWka4422pVvNkYvQ2A
```

### HTTPS Required
Push notifications **only work on HTTPS** (or localhost).
Most deployment platforms (Vercel, Netlify) provide HTTPS automatically.

## Security Notes

⚠️ **IMPORTANT:**
- Never commit `.env.local` to git (it's already in .gitignore)
- Keep `VAPID_PRIVATE_KEY` secret
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` can be public (it's in client code)
- Regenerate keys if private key is compromised

## Need Help?

Common issues:
- **"VAPID keys not configured"**: Add keys to .env.local and restart server
- **Notifications work once then stop**: Old subscription expired, disable and re-enable
- **iOS not working**: Make sure app is installed as PWA from home screen

## What's Next?

Your notifications are now live! They will:
- Appear on lock screens ✅
- Work when app is closed ✅
- Show on all connected devices ✅
- Persist in notification tray ✅

Enjoy real-time notifications in SamUr! 🤍
