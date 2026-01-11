import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { db } = await connectToDatabase();

        const result = await db.collection('submissions').updateOne(
            { _id: new ObjectId(params.id) },
            {
                $set: {
                    status: 'flagged',
                    needsInterview: true,
                    interviewCompleted: false,
                    interviewSkipped: true,
                    updatedAt: new Date()
                }
            }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json(
                { error: 'Submission not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[SKIP-INTERVIEW] Error:', error);
        return NextResponse.json(
            { error: 'Failed to skip interview' },
            { status: 500 }
        );
    }
}
