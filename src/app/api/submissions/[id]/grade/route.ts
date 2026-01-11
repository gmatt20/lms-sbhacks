import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:5000';
    const response = await fetch(`${PYTHON_API_URL}/api/submissions/${id}/grade`);

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({ error: 'Failed to fetch grade', details: text }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch grade' }, { status: 500 });
  }
}
