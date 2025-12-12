# Deployment Checklist

## ✅ Pre-Deployment Steps

### 1. Supabase Setup
- [ ] Create Supabase project at https://supabase.com
- [ ] Copy project URL and anon key to `.env`
- [ ] Run migration: `supabase db push`
- [ ] Deploy edge functions:
  ```bash
  supabase functions deploy random-match
  supabase functions deploy stream-token
  ```
- [ ] Set Supabase secrets:
  ```bash
  supabase secrets set STREAM_API_KEY=your_key
  supabase secrets set STREAM_API_SECRET=your_secret
  ```

### 2. Stream.io Setup
- [ ] Create account at https://getstream.io
- [ ] Create new app
- [ ] Copy API Key and API Secret
- [ ] Add `EXPO_PUBLIC_STREAM_API_KEY` to `.env`

### 3. Environment Variables
Create `.env` file:
```env
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
EXPO_PUBLIC_STREAM_API_KEY=xxx
```

### 4. Test Local Setup
- [ ] Run `npm install`
- [ ] Run `npm start`
- [ ] Test login flow
- [ ] Test queue joining (need 2 devices/emulators)
- [ ] Test audio call connection
- [ ] Test call ending and cleanup

### 5. Build Configuration
- [ ] Update `app.json` name and slug
- [ ] Update Android package name
- [ ] Update iOS bundle identifier
- [ ] Add app icon and splash screen
- [ ] Set version number

## 🚀 Deployment

### Android
```bash
# Build APK
eas build --platform android --profile preview

# Build AAB for Play Store
eas build --platform android --profile production
```

### iOS
```bash
# Build for TestFlight
eas build --platform ios --profile preview

# Build for App Store
eas build --platform ios --profile production
```

## 🧪 Testing Checklist

### Authentication
- [ ] Sign up new user
- [ ] Sign in existing user
- [ ] Sign out
- [ ] Session persistence

### Queue System
- [ ] Join queue (single user)
- [ ] Check waiting status
- [ ] Cancel search
- [ ] Match with another user
- [ ] Queue timeout (5 min)

### Call Features
- [ ] Audio connection established
- [ ] Mute/unmute works
- [ ] Call duration shows correctly
- [ ] End call works
- [ ] User removed from queue after call

### Edge Cases
- [ ] Network disconnection during call
- [ ] App backgrounding during call
- [ ] Multiple rapid queue joins
- [ ] Matching with same user twice
- [ ] Queue cleanup for abandoned entries

## 📱 Device Testing

Test on multiple devices:
- [ ] Android 10+
- [ ] iOS 13+
- [ ] Different screen sizes
- [ ] Low-end devices (audio quality)
- [ ] Poor network conditions

## 🔍 Monitoring

After deployment:
- [ ] Monitor Supabase function logs
- [ ] Check queue table for stuck entries
- [ ] Monitor Stream.io usage/costs
- [ ] Track user reports/feedback
- [ ] Monitor app crash reports

## 🐛 Common Issues

### Issue: Users not matching
**Solution**: Check Supabase Edge Function logs, ensure polling is working

### Issue: Audio not connecting
**Solution**: Verify Stream.io credentials, check token generation

### Issue: Queue entries piling up
**Solution**: Run cleanup function manually or check cron job

### Issue: High latency
**Solution**: Check Supabase region, optimize polling interval

## 📊 Performance Targets

- Queue match time: < 5 seconds
- Call setup time: < 3 seconds
- Audio latency: < 200ms
- Function response time: < 1 second
