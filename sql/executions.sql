CREATE TABLE executions (
    id VARCHAR(36) PRIMARY KEY,
    workflow_id VARCHAR(36) NOT NULL,
    workflow_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    started_at TIMESTAMP NOT NULL,
    run_time VARCHAR(50),
    triggered_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update the updated_at column
CREATE TRIGGER update_executions_updated_at
    BEFORE UPDATE ON executions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 


-- run seoeratly in the supabase console

-- Basic policy to allow inserts (you can restrict this further as needed)
CREATE POLICY "Allow authenticated inserts on executions"
ON "public"."executions"
FOR INSERT
TO authenticated
WITH CHECK (true);

-- If you need read access too
CREATE POLICY "Allow authenticated reads on executions"
ON "public"."executions"
FOR SELECT
TO authenticated
USING (true);