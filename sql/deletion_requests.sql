-- Create deletion_requests table to track account and data deletion requests

CREATE TABLE IF NOT EXISTS deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  deletion_type TEXT NOT NULL CHECK (deletion_type IN ('account', 'data')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  data_types JSONB, -- For specific data deletion, stores array of data types to delete
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_deletion_requests_user_id ON deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_deletion_type ON deletion_requests(deletion_type);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_deletion_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_deletion_requests_updated_at
  BEFORE UPDATE ON deletion_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_deletion_requests_updated_at();

-- RLS Policies
ALTER TABLE deletion_requests ENABLE ROW LEVEL SECURITY;

-- Users can only view their own deletion requests
CREATE POLICY "Users can view their own deletion requests"
  ON deletion_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own deletion requests
CREATE POLICY "Users can create their own deletion requests"
  ON deletion_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending deletion requests (to cancel)
CREATE POLICY "Users can update their own pending deletion requests"
  ON deletion_requests
  FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id);
