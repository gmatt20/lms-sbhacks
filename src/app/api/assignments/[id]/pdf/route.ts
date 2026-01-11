import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('[PDF] Fetching PDF for assignment:', id);

    const { db } = await connectToDatabase();

    // Get assignment to find Python homework ID
    const assignment = await db.collection('assignments').findOne({
      _id: new ObjectId(id)
    });

    if (!assignment) {
      console.error('[PDF] Assignment not found:', id);
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    console.log('[PDF] Found assignment, fetching from Python API:', assignment.pythonHomeworkId);

    // Fetch PDF from Python API
    const response = await fetch(
      `${process.env.PYTHON_API_URL}/download/${assignment.pythonHomeworkId}`
    );

    if (!response.ok) {
      console.error('[PDF] Python API error:', response.status);
      return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
    }

    // Convert to base64
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    console.log('[PDF] Success, PDF size:', arrayBuffer.byteLength, 'bytes');

    return NextResponse.json({ pdf: base64 });
  } catch (error) {
    console.error('[PDF] Error:', error);
    return NextResponse.json({
      error: 'Failed to fetch PDF',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
