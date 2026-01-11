import { DeepgramClient } from "@deepgram/sdk";
import { NextResponse } from "next/server.js";
import { auth } from "@clerk/nextjs/server";

/**
 * Proxy endpoint to keep the main API key secure on the server
 * while allowing frontend components to authenticate with Deepgram services.
 */
export async function GET() {
  const clerkAuth = await auth();

  // Check if user is authenticated
  if (!clerkAuth || !clerkAuth.userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Get Clerk session token (JWT)
  const token = await clerkAuth.getToken(); // Replace with your template if needed

  if (!token) {
    return new NextResponse("Failed to generate Clerk token", { status: 500 });
  }

  return new NextResponse(JSON.stringify({ token }));
}

