# Copy-Paste Ready Code for Supabase Dashboard

## 1️⃣ DATABASE SETUP

### Go to SQL Editor: https://supabase.com/dashboard/project/mzruykguyqmwyytupiis/editor

Copy and paste this SQL, then click "RUN":

```sql
-- Create call_queue table for random matching
CREATE TABLE IF NOT EXISTS public.call_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'matched', 'cancelled')),
  matched_with UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  call_id TEXT,
  UNIQUE(user_id)
);

-- Add index for faster queries
CREATE INDEX idx_call_queue_status ON public.call_queue(status);
CREATE INDEX idx_call_queue_created_at ON public.call_queue(created_at);

-- Enable Row Level Security
ALTER TABLE public.call_queue ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own queue entry
CREATE POLICY "Users can join queue"
  ON public.call_queue
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can view their own queue status
CREATE POLICY "Users can view own queue status"
  ON public.call_queue
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can update their own queue entry
CREATE POLICY "Users can update own queue entry"
  ON public.call_queue
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own queue entry
CREATE POLICY "Users can leave queue"
  ON public.call_queue
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to clean up old queue entries (older than 5 minutes)
CREATE OR REPLACE FUNCTION clean_expired_queue_entries()
RETURNS void AS $$
BEGIN
  DELETE FROM public.call_queue
  WHERE created_at < NOW() - INTERVAL '5 minutes'
  AND status = 'waiting';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 2️⃣ EDGE FUNCTION: random-match

### Go to Edge Functions: https://supabase.com/dashboard/project/mzruykguyqmwyytupiis/functions

### Create New Function
- Name: `random-match`
- Paste this code:

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

console.log("Random Match Function Loaded");

Deno.serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const authHeader = req.headers.get('Authorization')!;
    const authToken = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authToken);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { action } = await req.json();

    if (action === 'join_queue') {
      return await joinQueue(supabaseClient, user.id);
    } else if (action === 'leave_queue') {
      return await leaveQueue(supabaseClient, user.id);
    } else if (action === 'check_status') {
      return await checkStatus(supabaseClient, user.id);
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in random-match function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

async function joinQueue(supabaseClient: any, userId: string) {
  await supabaseClient.rpc('clean_expired_queue_entries');

  const { data: existing } = await supabaseClient
    .from('call_queue')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (existing) {
    return new Response(
      JSON.stringify({ status: 'already_in_queue', queueEntry: existing }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { data: waitingUsers, error: queryError } = await supabaseClient
    .from('call_queue')
    .select('*')
    .eq('status', 'waiting')
    .neq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1);

  if (queryError) {
    console.error('Error querying queue:', queryError);
    throw queryError;
  }

  if (waitingUsers && waitingUsers.length > 0) {
    const matchedUser = waitingUsers[0];
    const callId = `${Date.now()}_${userId.substring(0, 8)}`;

    await supabaseClient
      .from('call_queue')
      .update({ 
        status: 'matched', 
        matched_with: userId, 
        call_id: callId 
      })
      .eq('id', matchedUser.id);

    const { data: newEntry, error: insertError } = await supabaseClient
      .from('call_queue')
      .insert({
        user_id: userId,
        status: 'matched',
        matched_with: matchedUser.user_id,
        call_id: callId
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting matched user:', insertError);
      throw insertError;
    }

    return new Response(
      JSON.stringify({
        status: 'matched',
        matchedWith: matchedUser.user_id,
        callId: callId,
        queueEntry: newEntry
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } else {
    const { data: newEntry, error: insertError } = await supabaseClient
      .from('call_queue')
      .insert({
        user_id: userId,
        status: 'waiting'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting into queue:', insertError);
      throw insertError;
    }

    return new Response(
      JSON.stringify({
        status: 'waiting',
        queueEntry: newEntry
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function leaveQueue(supabaseClient: any, userId: string) {
  const { error } = await supabaseClient
    .from('call_queue')
    .delete()
    .eq('user_id', userId);

  if (error) {
    throw error;
  }

  return new Response(
    JSON.stringify({ status: 'left_queue' }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

async function checkStatus(supabaseClient: any, userId: string) {
  const { data: queueEntry, error } = await supabaseClient
    .from('call_queue')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return new Response(
        JSON.stringify({ status: 'not_in_queue' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    throw error;
  }

  return new Response(
    JSON.stringify({ 
      status: queueEntry.status,
      queueEntry: queueEntry
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
```

### Function Settings (Important!)
After creating the function, go to function settings and add these environment variables:
- No additional variables needed (uses SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY automatically)

---

## 3️⃣ VERIFY stream-token FUNCTION EXISTS

Check if `stream-token` function already exists in your dashboard.
If not, create it with this code:

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { StreamChat } from "npm:stream-chat";
import { createClient } from 'npm:@supabase/supabase-js@2';

console.log("Stream Token Function Loaded");

Deno.serve(async (req) => {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { 
      global: {        
        headers: { Authorization: req.headers.get('Authorization')! },     
      },    
    }
  );

  const authHeader = req.headers.get('Authorization')!;
  const authToken = authHeader.replace('Bearer ', '');
  const { data } = await supabaseClient.auth.getUser(authToken);
  const user = data.user;
  
  if (!user) {
    return new Response(
      JSON.stringify({ error: 'User Not Found' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const serverClient = StreamChat.getInstance(
    Deno.env.get('STREAM_API_KEY'),
    Deno.env.get('STREAM_API_SECRET')
  );

  const token = serverClient.createToken(user?.id);

  return new Response(
    JSON.stringify({token}),
    { headers: { "Content-Type": "application/json" } },
  );
});
```

### Function Settings:
Add these environment variables:
- `STREAM_API_KEY` = `au592tv2s8hq`
- `STREAM_API_SECRET` = `YOUR_SECRET_FROM_GETSTREAM_DASHBOARD`

---

## 4️⃣ GET STREAM API SECRET

1. Go to: https://dashboard.getstream.io/
2. Login and find your app (with key: au592tv2s8hq)
3. Copy the **Secret** (NOT the API key)
4. Add it to the `stream-token` function environment variables

---

## ✅ TESTING

After setup, restart your app and test:
1. Click "Find Someone to Talk"
2. Should see "Searching for someone..." without errors
3. Test with 2 devices to see matching work

---

## 🐛 Still Having Issues?

Check function logs in Supabase dashboard:
https://supabase.com/dashboard/project/mzruykguyqmwyytupiis/logs/edge-functions
