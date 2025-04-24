import { NextRequest, NextResponse } from 'next/server';
import { PubSub } from '@google-cloud/pubsub';

// --- Pub/Sub Configuration ---
let pubSubClient: PubSub;
const topicId = process.env.PUBSUB_TOPIC_ID;
const gcpCredentialsJson = process.env.GOOGLE_CREDENTIALS_JSON;

// Initialize PubSub client based on environment
if (gcpCredentialsJson) {
  try {
    const credentials = JSON.parse(gcpCredentialsJson);
    pubSubClient = new PubSub({ credentials });
    console.log("Initialized Pub/Sub client with credentials from GOOGLE_CREDENTIALS_JSON env var.");
  } catch (e) {
    console.error("Failed to parse GOOGLE_CREDENTIALS_JSON, falling back to Application Default Credentials:", e);
    pubSubClient = new PubSub(); // Fallback to ADC
  }
} else {
  console.log("GOOGLE_CREDENTIALS_JSON not set, attempting to use Application Default Credentials for Pub/Sub.");
  pubSubClient = new PubSub(); // Default: Use Application Default Credentials
}
// ---------------------------

// Add a simple GET handler to verify the route is reachable
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const webhookId = (await context.params).id;
  console.log("GET request received for webhook:", webhookId);
  
  return NextResponse.json({
    status: 'success',
    message: 'Webhook endpoint is working',
    webhook_id: webhookId
  });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const webhookId = (await context.params).id;
  console.log("POST request received for webhook:", webhookId);
  
  let responsePayload: any = null;
  let requestBody: any = null;
  let workflowIdForPubSub: string | null = null;
  let finalSessionIdForPubSub: string | null = null;

  try {
    console.log("Request headers:", Object.fromEntries(request.headers.entries()));
    
    // Get the request body - include session_id if provided
    requestBody = await request.json();
    console.log("Request body:", JSON.stringify(requestBody));
    
    const { message, workflow_id, session_id } = requestBody;
    workflowIdForPubSub = workflow_id;
    
    // Validate required fields
    if (!message) {
      console.log("Error: Message is required");
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }
    
    if (!workflow_id) {
      console.log("Error: workflow_id is required");
      return NextResponse.json({ error: 'workflow_id is required' }, { status: 400 });
    }
    
    console.log("workflow_id", workflow_id);
    
    // Check if workflow is running using the API endpoint
    console.log("Checking if workflow is running...");
    const statusResponse = await fetch(`${request.nextUrl.origin}/api/workflows/${workflow_id}/status`);
    
    if (!statusResponse.ok) {
      console.error("Failed to get workflow status:", statusResponse.statusText);
      // If status endpoint returns 500, it likely means no workflow is running
      // Treat this as a "not running" status and return 403 Forbidden
      return NextResponse.json({ 
        error: 'Workflow is not running. Please start the workflow to use this webhook.' 
      }, { status: 403 });
    }
    
    const statusData = await statusResponse.json();
    console.log("Workflow status:", statusData);
    
    // Only proceed if workflow is running
    if (statusData.status !== 'running') {
      console.log("Workflow is not running:", statusData.status);
      return NextResponse.json({ 
        error: 'Workflow is not running. Please start the workflow to use this webhook.' 
      }, { status: 403 });
    }
    
    // Use provided session_id OR generate a new unique one
    const finalSessionId = session_id || `chat-${webhookId}-${Date.now()}`;
    finalSessionIdForPubSub = finalSessionId;
    console.log("Using session ID:", finalSessionId);
    
    // Forward the message to the chat message API
    console.log("Forwarding to backend API...");
    
    // Get backend URL from environment or use default
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const apiUrl = `${backendUrl}/api/chat/message`;
    console.log("API URL:", apiUrl);
    
    const payload = {
      message,
      session_id: finalSessionId,
      workflow_id,
      node_id: webhookId // Use webhookId as node_id if specific node is needed
    };
    console.log("Payload:", JSON.stringify(payload));
    
    const chatApiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    console.log("Backend response status:", chatApiResponse.status);
    
    if (!chatApiResponse.ok) {
      const errorText = await chatApiResponse.text();
      console.error('Error from chat API:', errorText);
      throw new Error('Error processing request downstream');
    }
    
    // Return the response directly
    const chatResponse = await chatApiResponse.json();
    console.log("Response received:", JSON.stringify(chatResponse));
    
    // Prepare final response payload
    responsePayload = {
      status: 'success',
      response: chatResponse.response,
      session_id: finalSessionId
    };
    
    // Return the response
    return NextResponse.json(responsePayload);
    
  } catch (error) {
    console.error('Error processing webhook request:', error);
    // Prepare error response payload
    responsePayload = { error: 'Internal server error', details: String(error) };
    return NextResponse.json(responsePayload, { status: 500 });

  } finally {
    // --- Publish to Pub/Sub (uses the initialized pubSubClient) ---
    if (topicId && workflowIdForPubSub && requestBody && responsePayload && pubSubClient) { // Check pubSubClient exists
      try {
        const pubSubPayload = {
          eventType: "webhook_interaction",
          workflowId: workflowIdForPubSub,
          webhookId: webhookId,
          sessionId: finalSessionIdForPubSub,
          requestBody: requestBody,
          responseBody: responsePayload, 
          timestamp: new Date().toISOString(),
        };
        const dataBuffer = Buffer.from(JSON.stringify(pubSubPayload));
        
        console.log(`Attempting to publish message to Pub/Sub topic: ${topicId}`);
        // Use the potentially configured pubSubClient
        const messageId = await pubSubClient.topic(topicId).publishMessage({ data: dataBuffer }); 
        console.log(`Message ${messageId} published to Pub/Sub.`);
      } catch (pubSubError) {
        console.error(`Failed to publish message to Pub/Sub:`, pubSubError);
      }
    } else {
        console.warn("Skipping Pub/Sub publish: Missing topicId, workflowId, requestBody, responsePayload, or pubSubClient.");
    }
    // ----------------------------------------------------------------------
  }
} 