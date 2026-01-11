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

  if (loading) return <LoadingSpinner text="Loading..." />;
  if (!assignment) return <div className="p-6">Assignment not found.</div>;

  return (
    <div className="mx-auto max-w-5xl p-6">
      <Link href="/student" className="mb-3 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        ← Back
      </Link>
      <h1 className="mb-4 text-2xl font-bold">{assignment.title}</h1>

      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="font-semibold">Due:</span>
            <span>{new Date(assignment.dueDate).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-semibold">Points:</span>
            <span>{assignment.totalPoints || 100}</span>
          </div>
        </div>

        {assignment.description && (
          <p className="text-muted-foreground">{assignment.description}</p>
        )}
      </div>

      <div className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">Instructions</h2>
        <div className="border bg-card p-4">
          <PDFViewer pdfBase64={pdfBase64} />
        </div>
      </div>

      {assignment.rubricVisibleToStudents && assignment.rubric && assignment.rubric.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-2 text-lg font-semibold">Rubric</h2>
          <div className="border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Criterion</th>
                  <th className="px-4 py-2 text-left font-semibold">Description</th>
                  <th className="px-4 py-2 text-right font-semibold">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {assignment.rubric.map((item: any, i: number) => (
                  <tr key={i}>
                    <td className="px-4 py-2 font-medium">{item.criterion}</td>
                    <td className="px-4 py-2 text-muted-foreground">{item.description}</td>
                    <td className="px-4 py-2 text-right">{item.maxPoints}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/50 font-semibold">
                <tr>
                  <td colSpan={2} className="px-4 py-2 text-right">Total</td>
                  <td className="px-4 py-2 text-right">
                    {assignment.rubric.reduce((sum: number, r: any) => sum + (r.maxPoints || 0), 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-2 text-lg font-semibold">Submit your response</h2>
        <SubmissionForm
          assignmentId={params.id as string}
          studentId={user?.id || ''}
        />
      </div>
    </div>
  );
}
