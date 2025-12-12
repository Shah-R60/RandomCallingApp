import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

console.log("Random Match Function Loaded");

Deno.serve(async (req) => {
  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client for auth verification (using anon key with user's JWT)
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify user authentication
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: authError?.message }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create service role client for database operations (bypasses RLS)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action } = await req.json();

    console.log(`User ${user.id} requested action: ${action}`);

    // Handle different actions
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
  // Clean up expired entries first
  await supabaseClient.rpc('clean_expired_queue_entries');

  // Check if user is already in queue
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

  // Look for someone waiting in the queue (not this user)
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

  // If someone is waiting, match with them
  if (waitingUsers && waitingUsers.length > 0) {
    const matchedUser = waitingUsers[0];
    const callId = `${Date.now()}_${userId.substring(0, 8)}`;

    // Update both users' status to matched
    await supabaseClient
      .from('call_queue')
      .update({ 
        status: 'matched', 
        matched_with: userId, 
        call_id: callId 
      })
      .eq('id', matchedUser.id);

    // Insert current user as matched
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
    // No one waiting, add to queue
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
    if (error.code === 'PGRST116') { // Not found
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
