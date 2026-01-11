import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: Request) {
  try {
    const { assignmentId, studentId, submissionText } = await request.json();

    console.log('[SUBMISSIONS] Received submission:', {
      assignmentId,
      studentId,
      textLength: submissionText?.length
    });

    const { db } = await connectToDatabase();

    // Get assignment and associated homework record
    const assignment = await db.collection('assignments').findOne({
      _id: new ObjectId(assignmentId)
    });

    if (!assignment) {
      console.error('[SUBMISSIONS] Assignment not found:', assignmentId);
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Look up the Python homework info (mutations)
    const homework = await db.collection('homeworks').findOne({
      assignment_id: assignmentId
    });

    if (!homework) {
      console.error('[SUBMISSIONS] Homework/Audit info not found for assignment:', assignmentId);
      return NextResponse.json({ error: 'Audit info not found for this assignment' }, { status: 404 });
    }

    console.log('[SUBMISSIONS] Found assignment and homework, calling Python API');

    // Call Python API for analysis
    const formData = new FormData();
    formData.append('homework_id', homework._id.toString());
    formData.append('student_id', studentId);
    formData.append('response_text', submissionText);

    const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:5000';
    const analysisResponse = await fetch(
      `${PYTHON_API_URL}/submit`,
      { method: 'POST', body: formData }
    );

    if (!analysisResponse.ok) {
      console.error('[SUBMISSIONS] Python API error:', analysisResponse.status);
      const errorText = await analysisResponse.text();
      return NextResponse.json({
        error: 'Failed to analyze submission',
        details: errorText
      }, { status: 500 });
    }

    const analysis = await analysisResponse.json();
    console.log('[SUBMISSIONS] Analysis complete:', analysis.score);

    // Parse cheating score (e.g., "2/3" -> 0.67)
    const [found, total] = analysis.score.split('/').map(Number);
    const cheatingScore = total > 0 ? found / total : 0;

    // Determine status
    const status = cheatingScore > 0.7 ? 'flagged' : 'submitted';

    // Store submission
    const submission = {
      assignmentId: new ObjectId(assignmentId),
      studentId,
      submissionText,
      cheatingScore,
      indicatorsFound: analysis.indicators_found,
      status,
      submittedAt: new Date()
    };

    const result = await db.collection('submissions').insertOne(submission);
    console.log('[SUBMISSIONS] Stored submission:', result.insertedId);

    return NextResponse.json({
      success: true,
      submissionId: result.insertedId.toString(),
      cheatingScore,
      needsInterview: cheatingScore > 0.7,
      analysis
    });
  } catch (error) {
    console.error('[SUBMISSIONS] Error:', error);
    return NextResponse.json({
      error: 'Failed to process submission',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
