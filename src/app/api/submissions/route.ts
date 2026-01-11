import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { PLAGIARISM_THRESHOLD } from '@/lib/constants';

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
    const status = cheatingScore > PLAGIARISM_THRESHOLD ? 'flagged' : 'submitted';

    // Store submission
    // Transform indicators to ensure they have required fields
    const indicatorsFound = (analysis.indicators_found || []).map((ind: any) => ({
      type: ind.type || "marker_found",
      evidence: ind.evidence || ind.change || "",
      location: ind.location || (ind.locations?.[0]) || "unknown"
    })).filter((ind: any) => ind.evidence); // Only keep indicators with evidence

    // Unify field names with Python backend expectations
    // submittedText: used by auto-grader; response_text: used by interview analyzer
    const submission = {
      assignmentId: new ObjectId(assignmentId),
      studentId,
      submittedText: submissionText,
      response_text: submissionText,
      cheatingScore,
      indicatorsFound,
      status,
      submittedAt: new Date(),
      needsInterview: cheatingScore > PLAGIARISM_THRESHOLD,
      interviewCompleted: false,
      suspicionScore: found,
    };

    const result = await db.collection('submissions').insertOne(submission);
    console.log('[SUBMISSIONS] Stored submission:', result.insertedId);

    // Trigger auto-grading
    try {
      console.log('[SUBMISSIONS] Triggering auto-grading...');
      await fetch(`${PYTHON_API_URL}/api/submissions/${result.insertedId}/auto-grade`, {
        method: 'POST'
      });
      console.log('[SUBMISSIONS] Auto-grading triggered successfully');
    } catch (err) {
      console.error('[SUBMISSIONS] Failed to trigger auto-grading:', err);
      // We don't fail the request here, just log it
    }

    return NextResponse.json({
      success: true,
      submissionId: result.insertedId.toString(),
      cheatingScore,
      needsInterview: cheatingScore > PLAGIARISM_THRESHOLD,
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
