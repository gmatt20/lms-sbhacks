'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
  const [visibleSegment, setVisibleSegment] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Create WAV header for linear16 PCM audio at 24kHz
  const createWavHeader = (dataLength: number): Uint8Array => {
    const header = new Uint8Array(44);
    
    // "RIFF" chunk descriptor
    header[0] = 0x52; header[1] = 0x49; header[2] = 0x46; header[3] = 0x46; // "RIFF"
    
    // File size - 8 (little-endian)
    const fileSize = 36 + dataLength;
    header[4] = fileSize & 0xff;
    header[5] = (fileSize >> 8) & 0xff;
    header[6] = (fileSize >> 16) & 0xff;
    header[7] = (fileSize >> 24) & 0xff;
    
    header[8] = 0x57; header[9] = 0x41; header[10] = 0x56; header[11] = 0x45; // "WAVE"
    
    // "fmt " sub-chunk
    header[12] = 0x66; header[13] = 0x6d; header[14] = 0x74; header[15] = 0x20; // "fmt "
    header[16] = 0x10; header[17] = 0x00; header[18] = 0x00; header[19] = 0x00; // Subchunk1Size = 16
    header[20] = 0x01; header[21] = 0x00; // AudioFormat = 1 (PCM)
    header[22] = 0x01; header[23] = 0x00; // NumChannels = 1 (mono)
    
    // SampleRate = 24000 (0x5DC0 in little-endian)
    header[24] = 0xC0; header[25] = 0x5D; header[26] = 0x00; header[27] = 0x00;
    
    // ByteRate = 48000 (24000 * 1 * 16/8 = 0xBB80 in little-endian)
    header[28] = 0x80; header[29] = 0xBB; header[30] = 0x00; header[31] = 0x00;
    
    header[32] = 0x02; header[33] = 0x00; // BlockAlign = 2
    header[34] = 0x10; header[35] = 0x00; // BitsPerSample = 16
    
    // "data" sub-chunk
    header[36] = 0x64; header[37] = 0x61; header[38] = 0x74; header[39] = 0x61; // "data"
    
    // Data size (little-endian)
    header[40] = dataLength & 0xff;
    header[41] = (dataLength >> 8) & 0xff;
    header[42] = (dataLength >> 16) & 0xff;
    header[43] = (dataLength >> 24) & 0xff;
    
    return header;
  };

  // TTS via Deepgram speak WebSocket (streams text chunks -> audio)
  const speakWithTTS = async (text: string) => {
    if (!token) return;
    try {
      const dg = new DeepgramClient({ accessToken: token });
      const conn = dg.speak.live({
        model: 'aura-2-orion-en',
        encoding: 'linear16',
        sample_rate: 24000,
      });

      conn.on('open', () => {
        console.log('TTS connection opened');
        conn.sendText(text);
        conn.flush();
      });

      conn.on('audio', (data: any) => {
        console.log('TTS audio received:', data?.length);
        if (data && data.length > 0) {
          playAudio(new Uint8Array(data));
        }
      });

      conn.on('error', (err: any) => {
        console.error('TTS error', err);
      });

      conn.on('close', () => {
        console.log('TTS connection closed');
      });
    } catch (err) {
      console.error('TTS init failed', err);
    }
  };

  // DRY: progress percentage
  const progressPct = useMemo(() => Math.max(0, Math.min(100, (countdown / 30) * 100)), [countdown]);

  const skipInterview = async () => {
    if (!submissionId) return;
    await fetch(`/api/submissions/${submissionId}/skip-interview`, { method: 'POST' });
    router.push('/student');
  };

  // Play audio chunks from the agent
  const playAudio = (audioData: ArrayBuffer | Uint8Array) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    const ctx = audioContextRef.current;
    let buffer: ArrayBuffer;
    if (audioData instanceof Uint8Array) {
      buffer = audioData.buffer.slice(audioData.byteOffset, audioData.byteOffset + audioData.byteLength) as ArrayBuffer;
    } else {
      buffer = audioData;
    }
    console.log('Queuing audio chunk:', buffer.byteLength, 'bytes');
    audioQueueRef.current.push(buffer);

    // Start playback if not already playing
    if (!isPlayingRef.current) {
      processAudioQueue();
    }
  };

  const processAudioQueue = async () => {
    if (!audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    isPlayingRef.current = true;
    console.log('Starting audio playback, queue length:', audioQueueRef.current.length);

    while (audioQueueRef.current.length > 0) {
      // Buffer chunks for ~100-150ms for balance between quality and latency
      const chunksToMerge = [];
      let totalSize = 0;
      const targetBufferSize = 9600; // ~200ms at 24kHz (24000 samples/s * 2 bytes * 0.2s)
      const minBufferSize = 4800; // ~100ms minimum
      
      // Collect first chunk
      if (audioQueueRef.current.length > 0) {
        const chunk = audioQueueRef.current.shift()!;
        chunksToMerge.push(chunk);
        totalSize += chunk.byteLength;
      }
      
      // Wait briefly for more chunks to arrive (reduces gaps)
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Collect additional chunks up to target size
      while (audioQueueRef.current.length > 0 && totalSize < targetBufferSize) {
        const chunk = audioQueueRef.current.shift()!;
        chunksToMerge.push(chunk);
        totalSize += chunk.byteLength;
      }

      // Merge chunks
      const mergedChunk = new Uint8Array(totalSize);
      let offset = 0;
      for (const chunk of chunksToMerge) {
        mergedChunk.set(new Uint8Array(chunk), offset);
        offset += chunk.byteLength;
      }

      try {
        // Prepend WAV header to merged PCM data
        const wavHeader = createWavHeader(mergedChunk.byteLength);
        const wavFile = new Uint8Array(wavHeader.length + mergedChunk.byteLength);
        wavFile.set(wavHeader, 0);
        wavFile.set(mergedChunk, wavHeader.length);
        
        // Decode the WAV file using Web Audio API
        const audioBuffer = await ctx.decodeAudioData(wavFile.buffer);

        // Play with minimal gain ramp
        const source = ctx.createBufferSource();
        currentSourceRef.current = source;
        source.buffer = audioBuffer;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 0.003);

        source.connect(gain).connect(ctx.destination);
        source.start();

        await new Promise(resolve => {
          source.onended = resolve;
        });
      } catch (err) {
        console.error('Audio decode failed', err);
      }
    }
    isPlayingRef.current = false;
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
          // Use raw PCM for lowest latency and avoid extra headers
          output: { encoding: 'linear16', sample_rate: 24000, container: 'none' }
        },
        agent: {
          greeting: 'I want to check you understand your assignment. Can you tell me, in your own words, what you wrote?',
          listen: { provider: { type: 'deepgram', model: 'flux-general-en' } },
          // Male voice; switch back to Orion for cleaner tone
          speak: { provider: { type: 'deepgram', model: 'aura-2-orion-en' } },
          think: {
            provider: { type: 'anthropic', model: 'claude-3-5-haiku-20241022' },
            functions: [
              {
                name: 'show_text_segment',
                description: 'Display a specific text segment from the student submission to the user for reference during questioning (e.g., for fill-in-the-gap or pointing to exact passages)',
                parameters: {
                  type: 'object',
                  properties: {
                    segment: {
                      type: 'string',
                      description: 'The exact text segment to display to the user'
                    }
                  },
                  required: ['segment']
                }
              },
              {
                name: 'hide_text_segment',
                description: 'Hide the currently displayed text segment from view',
                parameters: {
                  type: 'object',
                  properties: {}
                }
              },
              {
                name: 'finish_interview',
                description: 'End the interview and mark it as complete. Call this when you have asked enough questions and gathered sufficient information.',
                parameters: {
                  type: 'object',
                  properties: {}
                }
              }
            ],
            prompt: `You are conducting a verification interview. Keep questions short, direct, and frequent. No judging or feedback.

SUBMISSION TEXT:
"""
${submissionText.slice(0, 5000)}
"""

GUIDE:
- Start with a quick opener: "Give me your main point in one or two sentences."
- Drill into specific details from THEIR text (quotes, examples, claims) with concise follow-ups.
- Ask more often: many short questions instead of a few long ones.
- Stay neutral: do not say what's correct/incorrect; no assessments.
- Use brief acknowledgments: "Got it," "Thanks," "Okay," then move to the next question.
- Keep it conversational and fast-paced; avoid long monologues.
- Do NOT number or label questions.
- When done, end with: "Thanks, your response has been recorded."

AVAILABLE FUNCTIONS:
- show_text_segment(segment): Display a text snippet to the user for reference (e.g., for fill-the-gap questions)
- hide_text_segment(): Remove the displayed snippet

Use these functions when you need the student to see specific text, then hide it when done.`
          }
        }
      });
    });

    dgClient.once(AgentEvents.SettingsApplied, () => setMicState('open'));
    
    // Barge-in: if user starts speaking, stop any agent audio playback
    dgClient.on(AgentEvents.UserStartedSpeaking, () => {
      if (currentSourceRef.current) {
        try { currentSourceRef.current.stop(); } catch (_) {}
      }
      audioQueueRef.current = [];
    });

    // Handle agent audio output (WAV container -> decode)
    dgClient.on(AgentEvents.Audio, (audioData: any) => {
      if (audioData && audioData.length > 0) {
        const buffer = audioData.buffer ? audioData.buffer : audioData;
        playAudio(buffer);
      }
    });

    dgClient.on(AgentEvents.ConversationText, (m: any) => {
      setTranscript((prev) => {
        if (prev.length > 0 && prev[prev.length - 1].role === m.role) {
          const last = prev[prev.length - 1];
          const merged = { role: last.role, content: `${last.content} ${m.content}`.trim() };
          const next = [...prev.slice(0, -1), merged];
          return next;
        }
        return [...prev, { role: m.role, content: m.content }];
      });
    });

    // Handle function calls from the LLM
    dgClient.on(AgentEvents.FunctionCallRequest, (functionCall: any) => {
      if (functionCall.function_name === 'show_text_segment') {
        const args = JSON.parse(functionCall.input || '{}');
        setVisibleSegment(args.segment || null);
      } else if (functionCall.function_name === 'hide_text_segment') {
        setVisibleSegment(null);
      }
    });
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
        <div className="mb-8 pb-6">
          <h1 className="text-4xl font-bold mb-2">Verification Interview</h1>
          <p className="text-muted-foreground">
            Your submission requires verification. We’ll run a short interview to check some details about your submission.
          </p>
          <div className="mt-3 flex gap-3">
            <Button
              variant="outline"
              className="h-9"
              onClick={() => speakWithTTS('Audio check. You should hear this clearly.')}
            >
              Play audio check
            </Button>
          </div>
        </div>

        {/* Main content */}
        {!isComplete ? (
          <div className="space-y-6">
            {visibleSegment && (
              <div className="border border-border bg-white rounded-lg p-4 shadow-sm">
                <p className="text-sm font-semibold text-foreground mb-2">Reference snippet</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{visibleSegment}</p>
              </div>
            )}

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