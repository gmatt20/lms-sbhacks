'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { PDFViewer } from '@/components/assignments/PDFViewer';
import { SubmissionForm } from '@/components/assignments/SubmissionForm';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function AssignmentView() {
  const params = useParams();
  const { user } = useUser();
  const [assignment, setAssignment] = useState<any>(null);
  const [pdfBase64, setPdfBase64] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.id || !user) return;

    // Fetch assignment
    fetch(`/api/assignments`)
      .then(res => res.json())
      .then(data => {
        const found = data.assignments.find((a: any) => a._id === params.id);
        setAssignment(found);
      });

    // Fetch PDF
    fetch(`/api/assignments/${params.id}/pdf?studentId=${user.id}`)
      .then(async res => {
        if (!res.ok) {
          const text = await res.text();
          console.error('PDF loading failed:', res.status, text);
          throw new Error(`Failed to load PDF: ${res.status}`);
        }
        const blob = await res.blob();
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            // Get base64 content after the comma
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      })
      .then(base64 => {
        setPdfBase64(base64);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading PDF:', err);
        setLoading(false);
      });
  }, [params.id, user]);

  if (loading) return <LoadingSpinner text="Loading assignment..." />;
  if (!assignment) return <div className="p-6">Assignment not found, please check the link.</div>;

  return (
    <div className="mx-auto max-w-5xl p-6">
      <Link href="/student" className="mb-3 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        ← Back to dashboard
      </Link>
      <h1 className="mb-4 text-2xl font-bold">{assignment.title}</h1>

      <div className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">Assignment PDF</h2>
        <PDFViewer pdfBase64={pdfBase64} />
      </div>

      <div>
        <h2 className="mb-2 text-lg font-semibold">Submit your response</h2>
        <p className="mb-3 text-sm text-muted-foreground">Share your own work, keep it clear and on time.</p>
        <SubmissionForm
          assignmentId={params.id as string}
          studentId={user?.id || ''}
        />
      </div>
    </div>
  );
}
