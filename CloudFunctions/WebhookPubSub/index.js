const functions = require('@google-cloud/functions-framework');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client - **DO NOT HARDCODE KEYS HERE**
// Use environment variables set in the Cloud Function configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use Service Role Key for server-side operations

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Supabase URL or Service Role Key environment variable is not set.');
  // Optionally throw an error to prevent function deployment/execution without config
  // throw new Error('Missing Supabase configuration.');
}

// Initialize client only if config is present
const supabase = supabaseUrl && supabaseServiceRoleKey 
  ? createClient(supabaseUrl, supabaseServiceRoleKey) 
  : null;

/**
 * CloudEvent handler for Pub/Sub messages.
 *
 * @param {object} cloudEvent The CloudEvent object.
 * @param {object} cloudEvent.data The CloudEvent data payload.
 * @param {object} cloudEvent.data.message The Pub/Sub message.
 * @param {string} cloudEvent.data.message.data The base64-encoded message data.
 * @param {object} cloudEvent.data.message.attributes Attributes published with the message.
 */
functions.cloudEvent('pubSubWebhookHandler', async (cloudEvent) => {
  if (!supabase) {
    console.error("Supabase client not initialized due to missing configuration. Aborting.");
    // Acknowledge the message to prevent retries if config is missing permanently
    return; 
  }

  console.log('Received Pub/Sub message:', JSON.stringify(cloudEvent.data.message));

  // Decode the Pub/Sub message data
  const base64Data = cloudEvent.data.message.data;
  let decodedDataString;
  let pubSubPayload;

  if (!base64Data) {
    console.error('No data received in Pub/Sub message.');
    return; // Acknowledge message, nothing to process
  }

  try {
    decodedDataString = Buffer.from(base64Data, 'base64').toString('utf-8');
    console.log('Decoded data string:', decodedDataString);
    pubSubPayload = JSON.parse(decodedDataString);
    console.log('Parsed Pub/Sub payload:', pubSubPayload);
  } catch (error) {
    console.error('Failed to decode or parse Pub/Sub message data:', error);
    // Don't throw here, acknowledge the message as it's likely malformed
    return;
  }

  // Validate required fields from the payload
  if (!pubSubPayload || !pubSubPayload.workflowId || !pubSubPayload.webhookId || !pubSubPayload.sessionId || !pubSubPayload.timestamp) {
      console.error('Parsed payload is missing required fields:', pubSubPayload);
      return; // Acknowledge message, invalid data
  }
  const validTimestamp = pubSubPayload.timestamp.replace('+00:00Z', 'Z');
  // Prepare data for Supabase insertion (match column names)
  const dataToInsert = {
    event_type: pubSubPayload.eventType || 'webhook_interaction', // Use default if missing
    workflow_id: pubSubPayload.workflowId,
    webhook_id: pubSubPayload.webhookId,
    session_id: pubSubPayload.sessionId,
    request_body: pubSubPayload.requestBody || null, // Ensure JSONB can handle null
    response_body: pubSubPayload.responseBody || null, // Ensure JSONB can handle null
    timestamp: validTimestamp, // Assuming it's a valid ISO 8601 string
  };

  console.log('Attempting to insert data into Supabase:', dataToInsert);

  try {
    const { data, error } = await supabase
      .from('webhook_interactions') // Your table name
      .insert([dataToInsert]); // insert expects an array

    if (error) {
      console.error('Supabase insert error:', error.message);
      // Throw error to signal failure to Cloud Functions, causing potential retries
      throw new Error(`Supabase insert failed: ${error.message}`); 
    }

    console.log('Successfully inserted data into Supabase:', data);
  } catch (error) {
    console.error('Caught exception during Supabase insert:', error);
    // Re-throw error to signal failure and potentially trigger Pub/Sub retries
    throw error; 
  }
});
