# Random Audio Chat - Omegle-Style Voice Calling App

A random audio-only calling platform built with React Native (Expo), Supabase, and Stream.io. Users can connect with random strangers through voice calls.

## 🎯 Features

- **Random Matching**: Connect with random users in real-time
- **Audio-Only Calls**: No video, just voice communication
- **Queue System**: Fair matching system using Supabase
- **Real-time Updates**: Instant notifications when matched
- **Simple UI**: Clean, intuitive interface focused on voice calling

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React Native with Expo
- **Navigation**: Expo Router
- **Backend**: Supabase (Database + Edge Functions)
- **Voice Calling**: Stream.io Video SDK (audio-only mode)
- **Authentication**: Supabase Auth

### Key Components

1. **Call Queue System** (`supabase/migrations/20251210000000_create_call_queue.sql`)
   - Database table to track users waiting for matches
   - Automatic cleanup of expired entries (5 min timeout)
   - Row-level security policies

2. **Matching Function** (`supabase/functions/random-match/index.ts`)
   - Handles queue operations: join, leave, check status
   - Matches users in FIFO order
   - Returns call ID when match is found

3. **Audio Provider** (`src/providers/VideoProvider.tsx`)
   - Initializes Stream client with audio-only config
   - Manages user authentication with Stream

4. **Call UI** (`src/app/(home)/call/index.tsx`)
   - Custom audio-only interface
   - Mute/unmute controls
   - Call duration timer
   - End call functionality

5. **Home Screen** (`src/app/(home)/index.tsx`)
   - "Find Someone to Talk" button
   - Queue status display
   - Polling for match updates

## 🚀 Setup Instructions

### 1. Prerequisites
- Node.js 18+
- Expo CLI
- Supabase account
- Stream.io account

### 2. Environment Variables

Create a `.env` file in the root:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_STREAM_API_KEY=your_stream_api_key
```

### 3. Supabase Setup

#### Run Migration
```bash
# Navigate to project directory
cd telegram

# Apply the migration
supabase db push
```

#### Deploy Edge Functions
```bash
# Deploy random-match function
supabase functions deploy random-match

# Set environment variables for the function
supabase secrets set STREAM_API_KEY=your_stream_api_key
supabase secrets set STREAM_API_SECRET=your_stream_secret
```

### 4. Install Dependencies
```bash
npm install
```

### 5. Run the App

#### Development
```bash
# Start Expo
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

## 📱 How It Works

### User Flow

1. **Login**: User signs in with email/password via Supabase Auth
2. **Home Screen**: User sees "Find Someone to Talk" button
3. **Join Queue**: User clicks button → added to `call_queue` table
4. **Matching**:
   - If someone is waiting → immediate match
   - If queue is empty → wait and poll every 2 seconds
5. **Call Setup**: When matched, Stream call is created with both users
6. **Audio Call**: Users connect via audio-only interface
7. **End Call**: User hangs up → removed from queue

### Database Schema

```sql
-- call_queue table
id UUID PRIMARY KEY
user_id UUID (references auth.users)
created_at TIMESTAMP
status TEXT ('waiting' | 'matched' | 'cancelled')
matched_with UUID (references auth.users)
call_id TEXT
```

### API Endpoints

**Random Match Function** (`/random-match`)

Actions:
- `join_queue`: Add user to queue or match immediately
- `leave_queue`: Remove user from queue
- `check_status`: Check if user is matched

Response:
```json
{
  "status": "matched",
  "matchedWith": "user_id",
  "callId": "call_123",
  "queueEntry": { ... }
}
```

## 🎨 UI Components

### Home Screen
- Large circular "Find Someone to Talk" button
- Loading spinner when searching
- Cancel button to leave queue

### Call Screen
- Gradient background
- Large avatar placeholder
- Call duration timer
- Mute/unmute button
- End call button (red)

## 🔒 Security

- **Row Level Security**: Users can only see/modify their own queue entries
- **Authentication**: All API calls require valid Supabase auth token
- **Token Generation**: Stream tokens generated server-side (Edge Function)
- **Audio Only**: Camera permissions removed, video tracks disabled

## 🔧 Configuration

### Audio-Only Settings

The app disables video in multiple places:

1. **Call Creation** (`src/app/(home)/index.tsx`):
```typescript
settings_override: {
  audio: { mic_default_on: true },
  video: { camera_default_on: false, enabled: false }
}
```

2. **Call Join** (`src/app/(home)/call/index.tsx`):
```typescript
await call.camera.disable();
```

3. **Permissions** (`app.json`):
- Removed `CAMERA` permission from Android
- Removed camera from iOS permissions
- Set `cameraPermission: false` in webrtc config

## 📦 Project Structure

```
telegram/
├── src/
│   ├── app/
│   │   ├── (auth)/           # Login screen
│   │   └── (home)/           # Main app
│   │       ├── index.tsx     # Home/Queue screen
│   │       └── call/
│   │           └── index.tsx # Audio call UI
│   ├── providers/
│   │   ├── AuthProvider.tsx  # Auth state management
│   │   ├── VideoProvider.tsx # Stream client setup
│   │   └── CallProvider.tsx  # Call state management
│   ├── lib/
│   │   └── supabase.ts       # Supabase client
│   └── utils/
│       └── TokenProvider.tsx # Stream token fetcher
├── supabase/
│   ├── migrations/
│   │   └── 20251210000000_create_call_queue.sql
│   └── functions/
│       ├── random-match/     # Matching logic
│       └── stream-token/     # Token generation
└── app.json                  # Expo config
```

## 🐛 Troubleshooting

### Users Not Matching
- Check Supabase Edge Functions are deployed
- Verify `random-match` function environment variables
- Check browser console for polling errors

### Audio Not Working
- Ensure microphone permissions granted
- Check Stream.io API key is valid
- Verify `stream-token` function is working

### Call Not Connecting
- Check both users have valid Stream tokens
- Verify call ID is being shared correctly
- Check network connectivity

## 📝 TODO / Future Enhancements

- [ ] Add "Report User" functionality
- [ ] Implement user blocking
- [ ] Add call quality feedback
- [ ] Show user country/language
- [ ] Add text chat during call
- [ ] Implement call recording (with consent)
- [ ] Add user profiles
- [ ] Implement gender/age filters (optional)

## 📄 License

This project is for educational purposes.
