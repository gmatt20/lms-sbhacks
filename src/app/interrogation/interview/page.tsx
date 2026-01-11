'use client';

import { useState, useEffect, useMemo } from 'react';
import { DeepgramClient, AgentEvents } from '@deepgram/sdk';
import { useSearchParams, useRouter } from 'next/navigation';
import { Mic } from '@/components/mic/Mic';
import { Button } from '@/components/ui/button';

export default function InterviewPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const submissionId = searchParams.get('submissionId');

  const [transcript, setTranscript] = useState<Array<{ role: string; content: string }>>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [client, setClient] = useState<any>(null);
  const [micState, setMicState] = useState<'open' | 'loading' | 'closed'>('closed');
  const [token, setToken] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(30);
  const [error, setError] = useState<string | null>(null);
  const [submissionText, setSubmissionText] = useState('');

  // DRY: progress percentage
  const progressPct = useMemo(() => Math.max(0, Math.min(100, (countdown / 30) * 100)), [countdown]);

  const skipInterview = async () => {
    if (!submissionId) return;
    await fetch(`/api/submissions/${submissionId}/skip-interview`, { method: 'POST' });
    router.push('/student');
  };

  // Load submission text
  useEffect(() => {
    if (!submissionId) return;

    fetch(`/api/submissions/${submissionId}`)
      .then(res => res.json())
      .then(data => {
        if (data.submission) {
          setSubmissionText(data.submission.submittedText || data.submission.response_text || '');
        }
      })
      .catch(() => setError('Failed to load submission'));
  }, [submissionId]);

  // Auto-start countdown
  useEffect(() => {
    if (client || !token) return;

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      connect();
    }
  }, [countdown, client, token]);

  // Get Deepgram token
  useEffect(() => {
    fetch('/api/token')
      .then(res => res.json())
      .then(data => setToken(data.token))
      .catch(() => setError('Failed to get token'));
  }, []);

  // Connect to Deepgram agent
  const connect = () => {
    if (!token) return;

    const dgClient = new DeepgramClient({ accessToken: token }).agent();
    setClient(dgClient);

    dgClient.once(AgentEvents.Welcome, () => {
      dgClient.configure({
        audio: {
          input: { encoding: 'linear16', sample_rate: 24000 },
          output: { encoding: 'linear16', sample_rate: 24000, container: 'none' }
        },
        agent: {
          greeting: 'I want to check you understand your assignment. Can you tell me, in your own words, what you wrote?',
          listen: { provider: { type: 'deepgram', model: 'flux-general-en' } },
          speak: { provider: { type: 'deepgram', model: 'aura-2-thalia-en' } },
          think: {
            provider: { type: 'anthropic', model: 'claude-3-5-haiku-20241022' },
            prompt: `You are verifying if a student wrote their own assignment.
Here is the SUBMISSION TEXT they submitted:
"""
${submissionText.slice(0, 5000)}
"""

Ask three questions: general, specific, and tricky (not in the text). End with "Thanks, your response has been recorded."`
          }
        }
      });
    });

    dgClient.once(AgentEvents.SettingsApplied, () => setMicState('open'));
    dgClient.on(AgentEvents.ConversationText, (m) => setTranscript((prev) => [...prev, { role: m.role, content: m.content }]));
  };

  // Detect completion
  useEffect(() => {
    const last = transcript[transcript.length - 1];
    if (last?.content.includes('response has been recorded')) {
      saveTranscript();
      setIsComplete(true);
    }
  }, [transcript]);

  const saveTranscript = async () => {
    if (!submissionId) return;
    await fetch(`/api/submissions/${submissionId}/transcript`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript })
    });
  };

  if (!submissionId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md border border-border bg-white p-4 shadow-sm">
          <p className="text-muted-foreground">Missing submission ID</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8 border-b border-border pb-6">
          <h1 className="text-4xl font-bold mb-2">Verification Interview</h1>
          <p className="text-muted-foreground">
            Your submission requires verification. Answer a few questions to confirm authorship.
          </p>
        </div>

        {/* Main content */}
        {!isComplete ? (
          <div className="space-y-6">
            {/* Loading / Error */}
            {!token && !error && (
              <div className="border border-border bg-white rounded-lg p-4 shadow-sm flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                <span className="text-muted-foreground">Starting interview session...</span>
              </div>
            )}

            {error && (
              <div className="border border-border bg-white rounded-lg p-4 shadow-sm">
                <p className="font-semibold text-destructive mb-2">⚠️ Error</p>
                <p className="text-muted-foreground">{error}. Please refresh or try again.</p>
              </div>
            )}

            {/* Countdown / Start */}
            {token && !error && !client && (
              <div className="border border-border bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-lg text-foreground">Starting shortly</p>
                  <p className="text-3xl font-bold text-foreground">{countdown}s</p>
                </div>
                <p className="mb-4 text-sm text-muted-foreground">
                  We’ll have an audio interview to check some details about your homework.
                  Please enable your microphone and be in a quiet space.
                </p>
                <div className="w-full bg-muted rounded">
                  <div className="h-3 bg-primary rounded transition-all" style={{ width: `${progressPct}%` }} />
                </div>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <Button onClick={connect} className="h-10 bg-primary text-primary-foreground hover:bg-primary/90">Start Now</Button>
                  <Button onClick={skipInterview} variant="outline" className="h-10">Skip Interview</Button>
                </div>
              </div>
            )}

            {/* Transcript */}
            {transcript.length > 0 && (
              <div className="border border-border bg-white rounded-lg p-6 max-h-96 overflow-y-auto space-y-4 shadow-sm">
                {transcript.map((msg, idx) => (
                  <div key={idx} className={msg.role === 'user' ? 'text-right' : 'text-left'}>
                    <div className={`inline-block max-w-xs px-4 py-2 rounded-lg ${msg.role === 'user' ? 'bg-muted text-foreground' : 'bg-accent text-accent-foreground'}`}>
                      <p className="text-xs font-semibold mb-1 opacity-75">{msg.role === 'user' ? 'You' : 'Interviewer'}</p>
                      <p>{msg.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Mic Control */}
            {token && !error && client && (
              <div className="border border-border bg-white rounded-lg p-6 shadow-sm">
                <div className="flex flex-col items-center gap-4">
                  <p className="text-foreground font-semibold">{micState === 'open' ? 'Listening...' : 'Loading audio...'}</p>
                  <Mic state={micState} client={client} />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Complete */}
            <div className="border border-border bg-white rounded-lg p-6 text-center shadow-sm">
              <p className="text-2xl font-bold text-foreground mb-2">✓ Interview Complete</p>
              <p className="text-muted-foreground mb-6">Your responses have been recorded and will be reviewed.</p>
              <Button onClick={() => router.push('/student')} className="bg-green-600 hover:bg-green-700 text-white">Back to Dashboard</Button>
            </div>

            {/* Summary */}
            {transcript.length > 0 && (
              <div className="border border-border bg-white rounded-lg p-6 shadow-sm">
                <h3 className="font-bold text-lg text-foreground mb-4">Interview Summary</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {transcript.map((msg, idx) => (
                    <div key={idx} className="text-sm text-muted-foreground">
                      <span className="font-semibold">{msg.role === 'user' ? 'You' : 'Interviewer'}:</span>{' '}
                      {msg.content.substring(0, 100)}{msg.content.length > 100 ? '...' : ''}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}