import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET() {
  const { db } = await connectToDatabase();
  const assignments = await db.collection('assignments')
    .find({})
    .sort({ createdAt: -1 })
    .toArray();
  return NextResponse.json({ assignments });
}

export async function POST(request: Request) {
  try {
    const { title, content, teacherId } = await request.json();

    console.log('[ASSIGNMENTS] Creating assignment:', { title, teacherId, contentLength: content?.length });

    // Check if Python API URL is configured
    if (!process.env.PYTHON_API_URL) {
      console.error('[ASSIGNMENTS] PYTHON_API_URL not configured');
      return NextResponse.json({
        error: 'Python API URL not configured. Add PYTHON_API_URL to .env'
      }, { status: 500 });
    }

    const pythonUrl = `${process.env.PYTHON_API_URL}/generate`;
    console.log('[ASSIGNMENTS] Calling Python API:', pythonUrl);

    // Call Python API to generate mutated version
    const pythonResponse = await fetch(pythonUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visible_text: content,
        teacher_id: teacherId,
        assignment_id: 'temp_' + Date.now()
      })
    });

    // Check if Python API responded successfully
    if (!pythonResponse.ok) {
      const errorText = await pythonResponse.text();
      console.error('[ASSIGNMENTS] Python API error status:', pythonResponse.status);
      console.error('[ASSIGNMENTS] Python API error body:', errorText);

      // Try to parse as JSON for better error messages
      let errorDetails = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorDetails = errorJson.error || errorText;
      } catch { }

      return NextResponse.json({
        error: 'Failed to generate assignment with Python API',
        details: errorDetails,
        status: pythonResponse.status,
        hint: pythonResponse.status === 500 ? 'Check Python API logs for details' :
          pythonResponse.status === 400 ? 'Invalid request format' :
            'Python API unavailable - is it running?'
      }, { status: 500 });
    }

    const pythonData = await pythonResponse.json();
    console.log('[ASSIGNMENTS] Python API success:', {
      homework_id: pythonData.homework_id,
      mutations: pythonData.mutations?.length
    });

    // Store in Next.js MongoDB
    const { db } = await connectToDatabase();
    const assignment = {
      teacherId,
      title,
      content,
      pythonHomeworkId: pythonData.homework_id,
      mutations: pythonData.mutations,
      changes: pythonData.changes,
      status: 'open',
      createdAt: new Date()
    };

    const result = await db.collection('assignments').insertOne(assignment);
    console.log('[ASSIGNMENTS] Stored in MongoDB:', result.insertedId);

    return NextResponse.json({
      success: true,
      assignmentId: result.insertedId,
      ...assignment
    });
  } catch (error) {
    console.error('[ASSIGNMENTS] Unexpected error:', error);

    // Check for network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json({
        error: 'Cannot connect to Python API',
        details: error.message,
        hint: 'Make sure Flask server is running on http://localhost:5000'
      }, { status: 503 });
    }

    return NextResponse.json({
      error: 'Failed to create assignment',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
