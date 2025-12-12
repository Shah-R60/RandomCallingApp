// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

console.log("Hello from Functions!")
import { StreamChat } from "npm:stream-chat";
import { createClient } from 'npm:@supabase/supabase-js@2'
Deno.serve(async (req) => {

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: {        
        headers: { Authorization: req.headers.get('Authorization')! },     
      },    
      }
      );

        const authHeader = req.headers.get('Authorization')!  
        const authToken = authHeader.replace('Bearer ', '')
        const { data } = await supabaseClient.auth.getUser(authToken)
        const user = data.user
        if (!user) {
          return new Response(
            JSON.stringify({ error: 'User Not Found' }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
          )
        }
    const serverClient = StreamChat.getInstance(
      Deno.env.get('STREAM_API_KEY') ,
      Deno.env.get('STREAM_API_SECRET')
    );


    const token = serverClient.createToken(user?.id);

    return new Response(
    JSON.stringify({token}),
    { headers: { "Content-Type": "application/json" } },
    );
})

/* To invoke locally:

    Run supabase start (see: https://supabase.com/docs/reference/cli/supabase-start)

    Make an HTTP request:

curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/stream-token' 
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' 
--header 'Content-Type: application/json' 
--data '{"name":"Functions"}'

*/