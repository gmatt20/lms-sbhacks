import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// GET - Retrieve the transcript for a submission
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { db } = await connectToDatabase();

    // First try to get from interviews collection (more detailed)
    const interview = await db.collection("interviews").findOne({
      submissionId: new ObjectId(id)
    });

    if (interview) {
      return NextResponse.json({
        success: true,
        transcript: interview.transcript,
        messageCount: interview.messageCount || interview.transcript?.length || 0,
        verdict: interview.verdict,
        status: interview.status,
        interviewId: interview._id.toString(),
        completedAt: interview.completedAt,
      });
    }

    // Fallback: get from submission
    const submission = await db.collection("submissions").findOne(
      { _id: new ObjectId(id) },
      { projection: { interviewTranscript: 1, interviewVerdict: 1, interviewedAt: 1 } }
    );

    if (submission?.interviewTranscript) {
      return NextResponse.json({
        success: true,
        transcript: submission.interviewTranscript,
        messageCount: Array.isArray(submission.interviewTranscript)
          ? submission.interviewTranscript.length
          : 0,
        verdict: submission.interviewVerdict,
        completedAt: submission.interviewedAt,
      });
    }

    return NextResponse.json(
      { success: false, error: "No transcript found for this submission" },
      { status: 404 }
    );
  } catch (error) {
    console.error("[Transcript] Error retrieving transcript:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve transcript" },
      { status: 500 }
    );
  }
}

// POST - Save the transcript for a submission
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { transcript, verdict } = body;
    const { db } = await connectToDatabase();

    // Validate transcript exists
    if (!transcript || !Array.isArray(transcript)) {
      return NextResponse.json(
        { success: false, error: "Transcript is required and must be an array" },
        { status: 400 }
      );
    }

    const now = new Date();

    // Determine status based on verdict (if provided)
    const status = verdict
      ? verdict === "LEGITIMATE"
        ? "cleared"
        : verdict === "LIKELY_CHEATED"
          ? "flagged"
          : "interviewed"
      : "interviewed";

    // Insert into interviews collection first to get the interview ID
    const interviewResult = await db.collection("interviews").insertOne({
      submissionId: new ObjectId(id),
      transcript,
      verdict: verdict || null,
      status,
      messageCount: transcript.length,
      startedAt: now,
      completedAt: now,
      createdAt: now,
    });

    const interviewId = interviewResult.insertedId;

    // Update submission with transcript and link to interview
    await db.collection("submissions").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          interviewTranscript: transcript,
          interviewVerdict: verdict || null,
          interviewId: interviewId,
          interviewCompleted: true,
          status,
          interviewedAt: now,
          updatedAt: now,
        },
      },
    );

    console.log(`[Transcript] Saved interview ${interviewId} for submission ${id} with ${transcript.length} messages`);

    return NextResponse.json({
      success: true,
      interviewId: interviewId.toString(),
      messageCount: transcript.length
    });
  } catch (error) {
    console.error("[Transcript] Error saving transcript:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save transcript" },
      { status: 500 }
    );
  }
}
