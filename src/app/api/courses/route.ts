import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const teacherId = searchParams.get('teacherId');

  console.log('[Next.js API] /api/courses called with teacherId:', teacherId);

  if (!teacherId) {
    console.log('[Next.js API] Error: teacherId missing');
    return NextResponse.json({ error: 'teacherId required' }, { status: 400 });
  }

  try {
    const flaskUrl = `http://localhost:5000/api/courses?teacherId=${teacherId}`;
    console.log('[Next.js API] Fetching from Flask:', flaskUrl);
    
    const response = await fetch(flaskUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('[Next.js API] Flask response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Next.js API] Flask error response:', errorText);
      return NextResponse.json({ 
        error: 'Failed to fetch courses from Flask', 
        courses: [],
        stats: { totalAssignments: 0, totalSubmissions: 0, pendingReviews: 0 }
      }, { status: response.status });
    }
    
    const data = await response.json();
    console.log('[Next.js API] Flask response data:', JSON.stringify(data, null, 2));
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Next.js API] Error fetching courses:', error);
    console.error('[Next.js API] Error details:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ 
      error: 'Failed to fetch courses', 
      courses: [],
      stats: { totalAssignments: 0, totalSubmissions: 0, pendingReviews: 0 },
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
