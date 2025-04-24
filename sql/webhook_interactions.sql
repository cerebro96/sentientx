-- Create the webhook_interactions table
CREATE TABLE webhook_interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type TEXT NOT NULL,
    workflow_id TEXT NOT NULL,
    webhook_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    request_body JSONB, -- Assuming requestBody is a JSON object
    response_body JSONB, -- Assuming responsePayload is a JSON object
    timestamp TIMESTAMPTZ NOT NULL
);

-- Enable Realtime subscriptions for this table
ALTER TABLE webhook_interactions ENABLE ROW LEVEL SECURITY;

-- Policies for webhook_interactions table

-- Policy: Allow authenticated users to SELECT all rows (for potential internal dashboards/analytics)
CREATE POLICY "Enable read access for authenticated users"
ON webhook_interactions FOR SELECT
TO authenticated
USING (TRUE);

-- Policy: Allow authenticated users to INSERT new rows (this is crucial for the Cloud Function)
CREATE POLICY "Enable insert access for authenticated users"
ON webhook_interactions FOR INSERT
TO authenticated
WITH CHECK (TRUE);