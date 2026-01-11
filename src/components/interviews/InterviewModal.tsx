'use client';

import { useState, useEffect } from 'react';
import { DeepgramClient, AgentEvents } from '@deepgram/sdk';
import { Mic } from '@/components/mic/Mic';

interface InterviewModalProps {
  assignmentId: string;
  submissionId: string;
  submissionText: string;
  onClose: () => void;
}

export function InterviewModal({ assignmentId, submissionId, submissionText, onClose }: InterviewModalProps) {
  const [transcript, setTranscript] = useState<Array<{ role: string; content: string }>>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [client, setClient] = useState<any>(null);
  const [micState, setMicState] = useState<'open' | 'loading' | 'closed'>('closed');
  const [token, setToken] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(30);
  const [error, setError] = useState<string | null>(null);

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
      .then(res => {
        if (!res.ok) throw new Error('Failed to get token');
        return res.json();
      })
      .then(data => {
        if (!data.token) throw new Error('No token returned');
        setToken(data.token);
      })
      .catch(err => {
        console.error('Token fetch error:', err);
        setError(err.message);
      });
  }, []);

  // Connect to Deepgram agent with interview prompt
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
          greeting: "I want to check you understand your assignment. Can you tell me, in your own words, what you wrote?",
          listen: { provider: { type: 'deepgram', model: 'flux-general-en' } },
          speak: { provider: { type: 'deepgram', model: 'aura-2-thalia-en' } },
          think: {
            provider: { type: 'anthropic', model: 'claude-3-5-haiku-20241022' },
            prompt: `You are verifying if a student wrote their own assignment.
Here is the SUBMISSION TEXT they submitted:
"""
${submissionText.slice(0, 5000)}
"""

Your goal is to check for authorship by asking 3 questions in a specific order:
1. GENERAL: Ask a broad question about the main thesis or argument.
2. SPECIFIC: Ask about a specific detail, example, or quote used in the text (e.g., "You mentioned X, can you explain that more?").
3. TRICKY: Ask about a concept or detail that is NOT in the text, or ask them to explain a complex sentence from their work. (e.g., "Why did you choose to focus on [Concept related to topic but not in essay]?").

Rules:
- Keep it conversational but professional.
- Do NOT say "Question 1" or "Question 2".
- After 3 questions, say "Thanks, your response has been recorded." and end the conversation.
- Wait for the student to answer each question before moving to the next.
`
          }
        }
      });
    });

    dgClient.once(AgentEvents.SettingsApplied, () => {
      setMicState('open');
    });

    dgClient.on(AgentEvents.ConversationText, (message) => {
      setTranscript(prev => [...prev, { role: message.role, content: message.content }]);
    });
  };

  // Detect when interview completes
  useEffect(() => {
    const lastMessage = transcript[transcript.length - 1];
    if (lastMessage?.content.includes('response has been recorded')) {
      saveTranscript();
      setIsComplete(true);
    }
  }, [transcript]);

  const saveTranscript = async () => {
    await fetch(`/api/submissions/${submissionId}/transcript`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript })
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto bg-white p-6">
        <h2 className="mb-4 text-2xl font-bold">Check your understanding</h2>

        {!isComplete ? (
          <>
            <p className="mb-4 text-gray-700">
              Answer a few questions so we can confirm this is your work.
            </p>

            {/* Loading / Error States */}
            {!token && !error && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                <span>Starting interview session...</span>
              </div>
            )}

            {error && (
              <div className="border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                Error: {error}. Please refresh or try again.
              </div>
            )}

            {/* Ready State */}
            {!client && token && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-semibold text-destructive">
                    <span>Starting in...</span>
                    <span>{countdown}s</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden bg-secondary/20">
                    <div
                      className="h-full bg-destructive transition-all duration-1000 ease-linear"
                      style={{ width: `${(countdown / 30) * 100}%` }}
                    />
                  </div>
                </div>

                <button
                  onClick={connect}
                  className="w-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Start interview now ({countdown}s)
                </button>

                <div className="border-t border-border pt-4">
                  <p className="mb-2 text-xs text-muted-foreground">
                    ⚠️ Skipping will flag your submission for manual review by the teacher.
                  </p>
                  <button
                    onClick={async () => {
                      try {
                        await fetch(`/api/submissions/${submissionId}/skip-interview`, {
                          method: 'POST'
                        });
                        onClose();
                      } catch (err) {
                        console.error('Failed to skip interview:', err);
                      }
                    }}
                    className="w-full border border-border bg-white px-6 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted"
                  >
                    Skip interview
                  </button>
                </div>
              </div>
            )}

            {client && (
              <>
                <Mic state={micState} client={client} onError={() => { }} />

                <div className="mt-4 max-h-64 overflow-y-auto border border-border p-4">
                  {transcript.map((msg, i) => (
                    <div key={i} className={`mb-3 ${msg.role === 'user' ? 'text-blue-700' : 'text-gray-800'}`}>
                      <strong>{msg.role === 'user' ? 'You' : 'Interviewer'}:</strong> {msg.content}
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div>
            <p className="mb-4 text-green-700">✓ Done, your response is saved.</p>
            <button
              onClick={onClose}
              className="bg-secondary px-6 py-2 text-sm font-semibold text-secondary-foreground hover:bg-primary"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
