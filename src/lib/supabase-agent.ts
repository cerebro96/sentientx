import { v4 as uuidv4 } from 'uuid';

/**
 * Generates a long, secure session ID for Supabase Agent chat
 * @returns A session ID in the format "chat-{randomStringWithTimestamp}" 
 */
export function generateSupabaseAgentSessionId(): string {
  // Get current timestamp
  const timestamp = Date.now();
  
  // Generate random value using crypto
  const randomBytes = new Uint8Array(12);
  crypto.getRandomValues(randomBytes);
  
  // Convert to hex string
  const randomHex = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  // Format: chat-{6-character-random-string}-{timestamp}
  return `chat-${randomHex.substring(0, 6)}-${timestamp}`;
}



/**
 * Makes a POST request to the Supabase Agent API
 * @param userId Current user's ID
 * @param message Message to send to the agent
 * @param sessionId Session ID for the chat (required)
 * @returns Response from the Supabase Agent API
 */
export async function callSupabaseAgent(
  userId: string, 
  message: string,
  sessionId: string
): Promise<any> {
  try {
    // Construct the API endpoint using the backend format
    // const endpoint = `/users/${userId}/sessions/${sessionId}`;
    const endpoint = `/api/supabase/registeragent`;
    // Make the POST request
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: userId,
        message: message,
        sessionId: sessionId
      })
    });
    
    if (!response.ok) {
      throw new Error(`API call failed with status: ${response.status}`);
    }
    
    return {
      data: await response.json(),
      sessionId: sessionId
    };
  } catch (error) {
    console.info('Error calling Supabase Agent API:', error);
    throw error;
  }
}

/**
 * Sends a message to the Supabase Agent runagent endpoint
 * @param userId The user's ID
 * @param sessionId The current chat session ID
 * @param supabaseUrl The Supabase project URL for the node
 * @param supabaseKey The Supabase anon key for the node
 * @param message Optional message to send (if different from credentials)
 * @returns The response from the runagent endpoint
 */
export async function runSupabaseAgent(
  userId: string,
  sessionId: string,
  supabaseUrl: string,
  supabaseKey: string,
  message: string = ""
): Promise<any> {
  try {
    // Construct the request body
    const requestBody = {
      user_id: userId,
      session_id: sessionId,
      message: message,
      supabase_url: supabaseUrl,
      supabase_key: supabaseKey
    };

    console.log('Calling Supabase Agent runagent endpoint');
    console.log('Request Body:', JSON.stringify(requestBody, null, 2));

    // Make the POST request to the backend endpoint
    const response = await fetch('/api/supabase/runagent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Supabase Agent runagent call failed with status: ${response.status}. ` +
        `Response: ${errorText.substring(0, 200)}`
      );
    }

    const responseData = await response.json();
    console.log('Supabase Agent runagent Response:', responseData);
    return responseData;

  } catch (error) {
    console.error('Error calling Supabase Agent runagent:', error);
    throw error;
  }
} 