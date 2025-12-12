# 🚀 Quick Start Guide - Random Audio Chat

## Step 1: Supabase Setup (5 minutes)

### Create Project
1. Go to https://supabase.com
2. Create new project
3. Wait for database to be ready

### Get Credentials
1. Go to **Settings** → **API**
2. Copy **Project URL** → This is `EXPO_PUBLIC_SUPABASE_URL`
3. Copy **anon public** key → This is `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### Apply Migration
```powershell
cd c:\Users\windows11\Desktop\StreamExpo\telegram
supabase link --project-ref your-project-ref
supabase db push
```

### Deploy Functions
```powershell
supabase functions deploy random-match
supabase functions deploy stream-token
```

## Step 2: Stream.io Setup (3 minutes)

### Create Account
1. Go to https://getstream.io
2. Sign up / Login
3. Create new app → Select "Video & Audio"

### Get Credentials
1. Go to your app dashboard
2. Copy **API Key** → This is `EXPO_PUBLIC_STREAM_API_KEY`
3. Copy **API Secret** (keep this secret!)

### Set Supabase Secrets
```powershell
supabase secrets set STREAM_API_KEY=your_stream_api_key
supabase secrets set STREAM_API_SECRET=your_stream_api_secret
```

## Step 3: Configure Environment (1 minute)

Create `.env` file in `telegram/` directory:

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
EXPO_PUBLIC_STREAM_API_KEY=xxxxx
```

## Step 4: Install & Run (2 minutes)

```powershell
# Install dependencies
npm install

# Start Expo
npm start

# In another terminal, run on Android
npm run android

# OR run on iOS
npm run ios
```

## Step 5: Test (5 minutes)

### Create Test Users
1. Open app → Sign up with `test1@email.com`
2. Open app on another device → Sign up with `test2@email.com`

### Test Matching
1. **Device 1**: Click "Find Someone to Talk"
2. **Device 2**: Click "Find Someone to Talk"
3. Both should match and connect via audio call
4. Test mute/unmute
5. Test end call

## ✅ You're Done!

Total time: ~15 minutes

---

## 🆘 Troubleshooting

### "Cannot connect to Supabase"
- Check `.env` file exists and has correct values
- Verify Supabase project is active
- Check internet connection

### "Users not matching"
- Check Edge Functions are deployed: `supabase functions list`
- Verify secrets are set: `supabase secrets list`
- Check browser console for errors

### "Audio not working"
- Verify Stream.io API key is correct
- Check microphone permissions granted
- Test on real device (not just emulator)

### Build Errors
- Run `npm install` again
- Delete `node_modules` and `npm install`
- Clear Expo cache: `expo start -c`

---

## 📱 Testing on Physical Devices

### Android
```powershell
# Connect device via USB
# Enable USB debugging on phone
npm run android
```

### iOS
```powershell
# Connect iPhone via USB
# Trust computer on iPhone
npm run ios
```

### Over Network (WiFi)
```powershell
# Start Expo
npm start

# Scan QR code with:
# - Expo Go app (Android)
# - Camera app (iOS)
```

---

## 🔗 Useful Commands

```powershell
# View Supabase logs
supabase functions logs random-match

# Test Edge Function locally
supabase functions serve

# Reset database (CAUTION: Deletes all data)
supabase db reset

# Check migration status
supabase db diff

# Deploy specific function
supabase functions deploy stream-token --no-verify-jwt
```

---

## 📞 What You Should See

### Home Screen
- Title: "Random Audio Chat"
- Large purple button: "Find Someone to Talk"
- Clean, minimal interface

### Searching State
- Loading spinner
- Text: "Searching for someone..."
- Red "Cancel" button

### Call Screen
- Purple background
- Avatar icon
- Call duration timer (00:00)
- Mute button (bottom left)
- End call button (bottom center, red)

---

## 🎯 Next Steps

Once basic functionality works:

1. **Add Features**:
   - User reporting
   - Call quality feedback
   - Anonymous names/avatars
   
2. **Polish UI**:
   - Add animations
   - Better error messages
   - Loading states

3. **Production Ready**:
   - Add analytics
   - Set up monitoring
   - Write tests
   - Build for stores

4. **Scale**:
   - Optimize database queries
   - Add caching
   - Monitor costs
   - Load testing

---

**Need Help?** Check the full documentation in `RANDOM_AUDIO_CHAT_README.md`
