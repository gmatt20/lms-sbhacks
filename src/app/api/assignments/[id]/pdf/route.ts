import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('[PDF] Requesting PDF for assignment:', id);

    // Request PDF from Flask API (it will check cache or generate)
    const response = await fetch(`http://localhost:5000/api/assignments/${id}/pdf`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[PDF] Flask API error:', response.status, errorText);
      try {
        const errorJson = JSON.parse(errorText);
        return NextResponse.json(errorJson, { status: response.status });
      } catch {
        return NextResponse.json({ error: `Failed to generate PDF: ${errorText}` }, { status: response.status });
      }
    }

    // Get PDF as ArrayBuffer
    const pdfBuffer = await response.arrayBuffer();
    console.log('[PDF] Success, PDF size:', pdfBuffer.byteLength, 'bytes');

    // Return PDF to client
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="assignment-${id}.pdf"`,
      },
    });
  } catch (error) {
    console.error('[PDF] Error:', error);
    return NextResponse.json({
      error: 'Failed to fetch PDF',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
