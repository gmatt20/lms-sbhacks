'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface AssignmentFormProps {
  teacherId: string;
  onSuccess?: () => void;
}

export function AssignmentForm({ teacherId, onSuccess }: AssignmentFormProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      console.log('Submitting assignment:', { title, contentLength: content.length });

      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, teacherId })
      });

      const data = await response.json();

      if (response.ok) {
        console.log('Assignment created:', data.assignmentId);
        setMessage('✓ Done.');
        setTitle('');
        setContent('');
        onSuccess?.();
      } else {
        console.error('Assignment creation failed:', data);
        // Show detailed error including hint
        const errorMsg = data.hint
          ? `${data.error}\n${data.hint}\nDetails: ${data.details}`
          : `${data.error}\nDetails: ${data.details || 'Unknown error'}`;
        setMessage(errorMsg);
      }
    } catch (error) {
      console.error('Network error:', error);
      setMessage('Network error: ' + error + '\n\nMake sure both servers are running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-foreground">
      <div>
        <label className="mb-2 block text-sm font-semibold">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full border border-border bg-white px-3 py-2 text-sm"
          placeholder="E.g., Essay on climate change"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold">Prompt</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          rows={8}
          className="w-full border border-border bg-white px-3 py-2 text-sm"
          placeholder="Write your assignment instructions..."
        />
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="h-10 bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
      >
        {loading ? 'Creating...' : 'Create'}
      </Button>

      {message && (
        <div className={`border border-border px-3 py-2 text-sm ${message.includes('Error') || message.includes('error') ? 'bg-destructive/10 text-destructive' : 'bg-secondary/10 text-secondary-foreground'}`}>
          <pre className="whitespace-pre-wrap font-sans">{message}</pre>
        </div>
      )}
    </form>
  );
}
