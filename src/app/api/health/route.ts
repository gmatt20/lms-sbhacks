import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const pythonApiUrl = process.env.PYTHON_API_URL;

    if (!pythonApiUrl) {
      return NextResponse.json({
        nextjs: 'ok',
        python: 'error',
        error: 'PYTHON_API_URL not configured'
      }, { status: 500 });
    }

    console.log('Testing connection to:', pythonApiUrl);

    const response = await fetch(`${pythonApiUrl}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({
        nextjs: 'ok',
        python: 'error',
        status: response.status,
        error: errorText
      }, { status: 500 });
    }

    const pythonHealth = await response.json();

    return NextResponse.json({
      nextjs: 'ok',
      python: 'ok',
      pythonResponse: pythonHealth,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json({
      nextjs: 'ok',
      python: 'error',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
