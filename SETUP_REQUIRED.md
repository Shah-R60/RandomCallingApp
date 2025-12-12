# 🚀 SETUP REQUIRED - Supabase Configuration

## Current Issue
Your Edge Functions are not deployed to Supabase, causing the "Find Someone to Talk" button to fail.

## Quick Fix Option 1: Install Supabase CLI & Deploy

### Step 1: Install Supabase CLI
```powershell
# Using Scoop (Recommended for Windows)
scoop install supabase

# OR using npm
npm install -g supabase
```

### Step 2: Login to Supabase
```powershell
cd c:\Users\windows11\Desktop\StreamExpo\telegram
supabase login
```

### Step 3: Link Project
```powershell
# Get your project ref from: https://supabase.com/dashboard/project/mzruykguyqmwyytupiis/settings/general
supabase link --project-ref mzruykguyqmwyytupiis
```

### Step 4: Deploy Database Migration
```powershell
supabase db push
```

### Step 5: Deploy Edge Functions
```powershell
supabase functions deploy random-match
supabase functions deploy stream-token
```

### Step 6: Set Secrets
You need your Stream.io API Secret (not the public key):
```powershell
supabase secrets set STREAM_API_KEY=au592tv2s8hq
supabase secrets set STREAM_API_SECRET=your_stream_secret_here
```

---

## Quick Fix Option 2: Manual Setup via Dashboard

If CLI doesn't work, use the Supabase dashboard:

### Step 1: Create Database Table
1. Go to: https://supabase.com/dashboard/project/mzruykguyqmwyytupiis/editor
2. Click "SQL Editor"
3. Copy and paste the SQL from: `supabase/migrations/20251210000000_create_call_queue.sql`
4. Run the query

### Step 2: Deploy Edge Functions via Dashboard
1. Go to: https://supabase.com/dashboard/project/mzruykguyqmwyytupiis/functions
2. Create new function: `random-match`
   - Copy code from: `supabase/functions/random-match/index.ts`
3. Create new function: `stream-token`
   - Copy code from: `supabase/functions/stream-token/index.ts`

### Step 3: Set Environment Variables
In each function settings, add:
- `STREAM_API_KEY` = `au592tv2s8hq`
- `STREAM_API_SECRET` = (Get from https://getstream.io dashboard)

---

## Get Stream API Secret

1. Go to: https://getstream.io/dashboard/
2. Find your app: (with API key `au592tv2s8hq`)
3. Copy the **API Secret** (keep it private!)

---

## Verify Setup

After deployment, test the function:
```powershell
curl -X POST https://mzruykguyqmwyytupiis.supabase.co/functions/v1/random-match `
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" `
  -H "Content-Type: application/json" `
  -d '{"action":"check_status"}'
```

---

## Alternative: Use Supabase Local Development

If you want to test locally first:
```powershell
supabase start
supabase functions serve
```

Then update your `.env`:
```
EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321
```

---

## After Setup Complete

Once functions are deployed:
1. Restart your Expo app
2. Click "Find Someone to Talk"
3. Should work without errors!

---

## Need Help?

Check function logs:
```powershell
supabase functions logs random-match --follow
```
