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
