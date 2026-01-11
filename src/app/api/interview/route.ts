import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

/**
 * POST /api/interview
 * Handles conversation requests, including initialization or appending to transcripts.
 */
export async function POST(request: Request) {
  const { db } = await connectToDatabase();
  try {
    const requestData = await request.json();
    console.log(requestData);

    const interviewTranscript = db.collection("Interview");
    interviewTranscript.insertOne(requestData);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Could not process interview request." },
      { status: 500 },
    );
  }
}

/**
 * GET /api/interview
 * Example placeholder for fetching existing transcripts.
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    data: [
      { id: 1, transcript: "Question 1 and its response" },
      { id: 2, transcript: "Question 2 and its response" },
    ],
  });
}
