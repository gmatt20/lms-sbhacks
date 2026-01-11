import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { transcript, verdict } = await request.json();
  const { db } = await connectToDatabase();

  // Determine status based on verdict
  const status = verdict === 'LEGITIMATE' ? 'cleared' :
                 verdict === 'LIKELY_CHEATED' ? 'flagged' :
                 'interviewed';

  // Update submission
  await db.collection('submissions').updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        interviewTranscript: transcript,
        interviewVerdict: verdict,
        status,
        interviewedAt: new Date()
      }
    }
  );

  return NextResponse.json({ success: true });
}
