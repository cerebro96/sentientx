import { NextRequest, NextResponse } from 'next/server';

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
  
  try {
    console.log("Request headers:", Object.fromEntries(request.headers.entries()));
    
    // Get the request body
    const body = await request.json();
    console.log("Request body:", JSON.stringify(body));
    
    const { message, workflow_id } = body;
    
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
    
    // Generate a session ID if not provided
    const finalSessionId = webhookId;
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
      return NextResponse.json({ error: 'Error processing request' }, { status: 500 });
    }
    
    // Return the response directly
    const chatResponse = await chatApiResponse.json();
    console.log("Response received:", JSON.stringify(chatResponse));
    
    return NextResponse.json({
      status: 'success',
      response: chatResponse.response,
      session_id: finalSessionId
    });
    
  } catch (error) {
    console.error('Error processing webhook request:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
} 