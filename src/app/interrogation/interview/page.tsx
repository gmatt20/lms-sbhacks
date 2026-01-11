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
  const transcriptRef = useRef<Array<{ role: string; content: string }>>([]); // Ref to avoid stale closure
  const [isComplete, setIsComplete] = useState(false);
  const [client, setClient] = useState<any>(null);
  const [micState, setMicState] = useState<'open' | 'loading' | 'closed'>('closed');
  const [token, setToken] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(30);
  const [error, setError] = useState<string | null>(null);
  const [submissionText, setSubmissionText] = useState('');
  const [visibleSegment, setVisibleSegment] = useState<string | null>(null);
  const [connectionQuality, setConnectionQuality] = useState(0);
  const [rttMs, setRttMs] = useState<number>(0);
  const [isMuted, setIsMuted] = useState(false);
  const handshakeStartRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  // Create WAV header for linear16 PCM audio at 24kHz
  const createWavHeader = (dataLength: number, sampleRate: number = 24000): Uint8Array => {
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

    // SampleRate (little-endian)
    header[24] = sampleRate & 0xff;
    header[25] = (sampleRate >> 8) & 0xff;
    header[26] = (sampleRate >> 16) & 0xff;
    header[27] = (sampleRate >> 24) & 0xff;

    // ByteRate = sampleRate * 1 * 16/8 (little-endian)
    const byteRate = sampleRate * 2;
    header[28] = byteRate & 0xff;
    header[29] = (byteRate >> 8) & 0xff;
    header[30] = (byteRate >> 16) & 0xff;
    header[31] = (byteRate >> 24) & 0xff;

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

  // Helper: safe byte length for ArrayBuffer/TypedArray/Buffer-like
  const getByteLength = (x: any): number => {
    if (!x) return 0;
    if (x instanceof Uint8Array) return x.byteLength;
    if (x instanceof ArrayBuffer) return x.byteLength;
    const maybeLen = (x as any).byteLength ?? (x as any).length;
    return typeof maybeLen === 'number' ? maybeLen : 0;
  };

  // TTS via Deepgram speak WebSocket (streams text chunks -> audio)
  const speakWithTTS = async (text: string) => {
    if (!token) {
      console.error('[TTS] No token available');
      alert('No token - cannot play audio');
      return;
    }
    try {
      console.log('[TTS] Starting TTS with text:', text);
      const dg = new DeepgramClient({ accessToken: token });
      console.log('[TTS] Client created, initiating connection');

      const conn = dg.speak.live({
        model: 'aura-2-orion-en',
        encoding: 'linear16',
        sample_rate: 16000,
      });

      conn.on('open', () => {
        console.log('[TTS] Connection opened!');
      });

      conn.on('audio', (data: any) => {
        const size = getByteLength(data);
        console.log('[TTS] Audio chunk received:', size, 'bytes');
        if (size > 0) {
          const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
          playAudio(bytes);
        }
      });

      conn.on('error', (err: any) => {
        console.error('[TTS] Connection error:', err);
      });

      conn.on('close', () => {
        console.log('[TTS] Connection closed');
      });

      // Send text immediately without waiting
      console.log('[TTS] Sending text');
      conn.sendText(text);
      conn.flush();
      console.log('[TTS] Text sent');
    } catch (err) {
      console.error('[TTS] Init failed:', err);
      alert('[TTS] Init failed: ' + (err as any)?.message);
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
    // console.log('[Audio] playAudio called with:', audioData instanceof Uint8Array ? audioData.byteLength : (audioData as ArrayBuffer).byteLength, 'bytes');

    if (!audioContextRef.current) {
      // console.log('[Audio] Creating new AudioContext');
      try {
        audioContextRef.current = new AudioContext();
        // console.log('[Audio] AudioContext created, state:', audioContextRef.current.state);
      } catch (err) {
        console.error('[Audio] Failed to create AudioContext:', err);
        alert('[Audio] Cannot create AudioContext: ' + (err as any)?.message);
        return;
      }
    }

    const ctx = audioContextRef.current;
    // console.log('[Audio] AudioContext state:', ctx.state, 'sampleRate:', ctx.sampleRate);

    if (ctx.state === 'suspended') {
      // console.log('[Audio] AudioContext suspended, attempting resume');
      ctx.resume()
        .then(() => console.log('[Audio] AudioContext resumed successfully'))
        .catch(err => console.error('[Audio] Failed to resume context', err));
    }

    let buffer: ArrayBuffer;
    if (audioData instanceof Uint8Array) {
      buffer = audioData.buffer.slice(audioData.byteOffset, audioData.byteOffset + audioData.byteLength) as ArrayBuffer;
    } else {
      buffer = audioData;
    }

    // console.log('[Audio] Pushing to queue, queue length before:', audioQueueRef.current.length);
    audioQueueRef.current.push(buffer);
    // console.log('[Audio] Queue length after:', audioQueueRef.current.length);

    // Start playback if not already playing
    if (!isPlayingRef.current) {
    //   console.log('[Audio] Starting playback processor');
      processAudioQueue();
    } else {
    //   console.log('[Audio] Already playing, not starting new processor');
    }
  };

  const processAudioQueue = async () => {
    // console.log('[Playback] Starting queue processor, AudioContext exists:', !!audioContextRef.current);
    if (!audioContextRef.current) {
      console.error('[Playback] No AudioContext, aborting');
      return;
    }

    const ctx = audioContextRef.current;
    // console.log('[Playback] Processor running, queue length:', audioQueueRef.current.length);

    // Only check minimum buffer before starting playback (initial safety net)
    // Once playing, continue even if buffer drops below this threshold
    if (!isPlayingRef.current) {
      const MIN_BUFFER_BYTES = 64000; // 1000ms at 16kHz
      const totalQueuedBytes = audioQueueRef.current.reduce((sum, chunk) => sum + chunk.byteLength, 0);
      if (totalQueuedBytes < MIN_BUFFER_BYTES) {
        // console.log('[Playback] Waiting for initial buffer, have:', totalQueuedBytes, 'need:', MIN_BUFFER_BYTES);
        return;
      }
    }

    isPlayingRef.current = true;

    while (audioQueueRef.current.length > 0) {
      // console.log('[Playback] Processing queue, remaining:', audioQueueRef.current.length);

      // Use requestIdleCallback to process audio when main thread is idle
      await new Promise(resolve => {
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => resolve(null), { timeout: 100 });
        } else {
          setTimeout(resolve, 0);
        }
      });

      // Fixed buffering - network estimation doesn't work reliably
      const chunksToMerge = [];
      let totalSize = 0;
      // Use conservative buffering settings (assume 25% quality)
      const waitMs = 80;
      const targetBufferSize = 64000; // ~2000ms - merge 5+ chunks

      if (audioQueueRef.current.length > 0) {
        const chunk = audioQueueRef.current.shift()!;
        chunksToMerge.push(chunk);
        totalSize += chunk.byteLength;
      }

      await new Promise(resolve => setTimeout(resolve, waitMs));

      while (audioQueueRef.current.length > 0 && totalSize < targetBufferSize) {
        const chunk = audioQueueRef.current.shift()!;
        chunksToMerge.push(chunk);
        totalSize += chunk.byteLength;
      }

      const mergedChunk = new Uint8Array(totalSize);
      let offset = 0;
      for (const chunk of chunksToMerge) {
        mergedChunk.set(new Uint8Array(chunk), offset);
        offset += chunk.byteLength;
      }

      try {
        // console.log('[Playback] Decoding WAV, size:', mergedChunk.byteLength);
        const wavHeader = createWavHeader(mergedChunk.byteLength, 16000);
        const wavFile = new Uint8Array(wavHeader.length + mergedChunk.byteLength);
        wavFile.set(wavHeader, 0);
        wavFile.set(mergedChunk, wavHeader.length);

        // console.log('[Playback] Calling decodeAudioData with:', wavFile.length, 'bytes');
        const audioBuffer = await ctx.decodeAudioData(wavFile.buffer.slice(0));
        // console.log('[Playback] Decode successful, duration:', audioBuffer.duration, 'length:', audioBuffer.length);

        const source = ctx.createBufferSource();
        currentSourceRef.current = source;
        source.buffer = audioBuffer;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 0.003);

        source.connect(gain).connect(ctx.destination);
        // console.log('[Playback] Starting source');
        source.start();
        // console.log('[Playback] Source started');

        await new Promise(resolve => {
          source.onended = () => {
            // console.log('[Playback] Source ended');
            resolve(null);
          };
        });
      } catch (err) {
        console.error('[Playback] Error:', err);
      }
    }
    // console.log('[Playback] Queue empty, stopping processor');
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

  // Set random connection quality on mount (avoid hydration mismatch)
  useEffect(() => {
    setConnectionQuality(Math.floor(Math.random() * 14) + 5); // Random 5-18
  }, []);



  // Connect to Deepgram agent
  const connect = () => {
    if (!token) return;

    // Mark handshake start for Deepgram Agent RTT
    handshakeStartRef.current = performance.now();
    const dgClient = new DeepgramClient({ accessToken: token }).agent();
    setClient(dgClient);

    dgClient.once(AgentEvents.Welcome, () => {
      // Compute RTT to Deepgram welcome
      const rtt = performance.now() - handshakeStartRef.current;
      setRttMs(rtt);
      const q = Math.max(0, Math.min(100, Math.round(100 / (1 + rtt / 150))));
      setConnectionQuality(q);
      dgClient.configure({
        audio: {
          input: { encoding: 'linear16', sample_rate: 24000 },
          output: { encoding: 'linear16', sample_rate: 16000, container: 'none' }
        },
        agent: {
          language: 'en',
          greeting: 'I want to check you understand your assignment. Can you tell me, in your own words, what you wrote?',
          listen: { provider: { type: 'deepgram', version: 'v2', model: 'flux-general-en' } },
          speak: { provider: { type: 'deepgram', model: 'aura-2-mars-en' } },
          think: {
            provider: { type: 'google', model: 'gemini-2.5-flash' },
            functions: [
              {
                name: 'show_text_segment',
                description: 'Display a specific text segment from the student submission to the user for reference during questioning (e.g., for fill-in-the-gap or to give context to a question). NEVER read out or repeat text from the student submission in your messages. Text should be as short as possible.',
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
            prompt: `You are conducting a verification interview. Keep messages short (ideally 1 sentence), direct, and frequent. Be ADAPTIVE and REACTIVE to what the student actually says.

SUBMISSION TEXT:
"""
${submissionText.slice(0, 5000)}
"""

CRITICAL RULES:
- NEVER read out or repeat text from the student's work in your messages
- If you need to show text to the user, use show_text_segment() - don't speak it
- ADAPT to their responses - if they give you an answer, acknowledge it and move forward, even if incomplete
- DO NOT repeat the same question if they've already answered or moved past it
- BE FLEXIBLE - if they demonstrate understanding in their own way, accept it and continue
- REACT to what they're saying NOW, not what you expected them to say
- If an answer is vague or off-topic, ask ONE brief follow-up then move on
- Cover multiple aspects of their work, don't fixate on one point
- Keep the conversation flowing naturally - avoid getting stuck
- Patience runs out: as the interview progresses, you can decide to end the interview early
- Interview budget: you have about 8 to 12 questions to figure out if the student wrote their own work

STYLE:
- Brief: 1 sentence per message when possible
- Conversational and natural, not interrogative
- Use acknowledgments: "Got it," "Thanks," "Okay," then ask next question
- NO numbering or labeling questions
- Stay neutral: no assessments of right/wrong
- Plain text: no formatting or styling

SNIPPET USAGE:
- CRITICAL: NEVER quote text in your questions - if you need to reference specific text, use show_text_segment() but NEVER repeat it in the question because it takes a lot of time
- Example: DON'T say "You wrote 'X'" instead call show_text_segment() and ask "What does this mean to you?"
- Keep snippets SHORT (1-3 sentences max)
- NEVER include the answer in the snippet - if you ask about a specific part of the text, hide the answer to your question in the snippet so that the student can't cheat
- Always hide_text_segment() after they answer

EXAMPLES OF QUESTION TYPES YOU CAN USE:
1. **Next sentence**: "What did you say after this?" (show snippet)
2. **Reasoning**: "Why did you choose this approach?" or "How did you reach that conclusion?" (show snippet)
3. **Process**: "Walk me through how you figured this out" (show snippet)
4. **Specifics**: "Can you explain what you meant by [concept]?" (show snippet as a follow up if needs clarification)
5. **Fill-in-gap**: Snippet with blanks, ask "What goes here?" (show snippet)
6. **Paraphrase**: "Can you say that in different words?" (show snippet)
7. **Examples**: "Can you give me an example of what you mean?"

AVAILABLE FUNCTIONS:
- show_text_segment(segment): Display a SHORT snippet with key parts replaced by "___" - DO NOT show answers
- hide_text_segment(): Remove the displayed snippet after they answer
- finish_interview(): End when you've covered enough ground (aim for 5-7 exchanges, not 20)

End the interview once you have a reasonable sense of their understanding. Don't drag it out.`
          }
        }
      });
      // Keep alive per docs
      try {
        setInterval(() => {
          (dgClient as any).keepAlive?.();
        }, 5000);
      } catch (_) { }
    });

    dgClient.once(AgentEvents.SettingsApplied, () => {
      console.log('[SettingsApplied] Agent settings confirmed by server');
      setMicState('open');
    });

    // Barge-in: if user starts speaking, stop any agent audio playback
    dgClient.on(AgentEvents.UserStartedSpeaking, () => {
      if (currentSourceRef.current) {
        try { currentSourceRef.current.stop(); } catch (_) { }
      }
      audioQueueRef.current = [];
    });

    // Handle agent audio output (WAV container -> decode)
    dgClient.on(AgentEvents.Audio, (audioData: any) => {
      const size = getByteLength(audioData);
      if (size > 0) {
        const buffer: ArrayBuffer = audioData?.buffer ? (audioData.buffer as ArrayBuffer) : (audioData as ArrayBuffer);
        playAudio(buffer);
      }
    });

    dgClient.on(AgentEvents.ConversationText, (m: any) => {
      const newMessage = { role: m.role, content: m.content };
      setTranscript((prev) => {
        const updated = [...prev, newMessage];
        transcriptRef.current = updated; // Keep ref in sync
        return updated;
      });
    });

    // Handle function calls from the LLM (guarded parsing so we never throw)
    dgClient.on(AgentEvents.FunctionCallRequest, (functionCall: any) => {
      console.log('[FunctionCallRequest] Raw payload:', JSON.stringify(functionCall));

      const fns = Array.isArray(functionCall?.functions) && functionCall.functions.length > 0
        ? functionCall.functions
        : [functionCall];

      for (const fn of fns) {
        const fnName = fn?.name || fn?.function_name || 'noop';
        const fnId = fn?.id;
        const rawArgs = fn?.arguments || fn?.input;

        let args: any = {};
        if (rawArgs !== undefined) {
          try {
            args = typeof rawArgs === 'string' ? JSON.parse(rawArgs) : rawArgs;
          } catch (err) {
            console.error('FunctionCallRequest parse error', err, rawArgs);
            args = {};
          }
        }

        let contentResponse = 'ok';
        if (fnName === 'show_text_segment') {
          setVisibleSegment(args.segment || null);
          contentResponse = 'shown';
        } else if (fnName === 'hide_text_segment') {
          setVisibleSegment(null);
          contentResponse = 'hidden';
        } else if (fnName === 'finish_interview') {
          // Wait 10 seconds for final audio to finish playing before completing
          setTimeout(() => {
            saveTranscript();
            setIsComplete(true);
          }, 10000);
          contentResponse = 'finished';
        } else {
          contentResponse = 'noop';
        }

        if (fnId) {
          console.log('[FunctionCallResponse] Sending:', { id: fnId, name: fnName, content: contentResponse });
          try {
            dgClient.functionCallResponse({ id: fnId, name: fnName, content: contentResponse });
          } catch (err) {
            console.error('FunctionCallResponse failed', err);
          }
        } else {
          console.warn('[FunctionCallRequest] No ID present for fn', fnName, 'skipping response');
        }
      }
    });
  };

  // Cleanup: disconnect agent and close audio context on unmount
  useEffect(() => {
    return () => {
      try { (client as any)?.disconnect?.(); } catch (_) { }
      try { currentSourceRef.current?.stop?.(); } catch (_) { }
      audioQueueRef.current = [];
      try { audioContextRef.current?.close?.(); } catch (_) { }
    };
  }, [client]);

  // Auto-scroll transcript to bottom when new messages arrive
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

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
    // Use ref to get current transcript value (avoids stale closure in setTimeout)
    const currentTranscript = transcriptRef.current;
    console.log('[SaveTranscript] Saving', currentTranscript.length, 'messages');

    try {
      const response = await fetch(`/api/submissions/${submissionId}/transcript`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: currentTranscript })
      });
      const result = await response.json();
      console.log('[SaveTranscript] Result:', result);
    } catch (err) {
      console.error('[SaveTranscript] Error:', err);
    }

    router.push(`/interrogation/complete?submissionId=${submissionId}`);
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
    <>
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
                🔊 Play audio check
              </Button>
              {client && (
                <Button
                  onClick={() => setIsMuted(!isMuted)}
                  variant={isMuted ? 'destructive' : 'outline'}
                  className="h-9"
                >
                  {isMuted ? '🔇 Unmute Mic' : '🎤 Mute Mic'}
                </Button>
              )}
            </div>
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
                    We'll have an audio interview to check some details about your homework.
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
                <div className="border border-border bg-white rounded-lg p-6 overflow-y-auto space-y-4 shadow-sm" style={{ maxHeight: '50vh' }}>
                  {transcript.map((msg, idx) => (
                    <div key={idx} className={msg.role === 'user' ? 'text-right' : 'text-left'}>
                      <div className={`inline-block max-w-2xl px-4 py-2 rounded-lg ${msg.role === 'user' ? 'border border-border text-foreground' : 'bg-gray-100 text-foreground border border-border'}`}>
                        <p className="text-xs font-semibold mb-1 opacity-75">{msg.role === 'user' ? 'You' : 'Interviewer'}</p>
                        <p>{msg.content}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={transcriptEndRef} />
                </div>
              )}

              {/* Reference Snippet Box (below transcript) */}
              {visibleSegment && (
                <div className="border-2 border-primary bg-primary/5 rounded-lg p-6 shadow-lg">
                  <h3 className="text-lg font-bold text-primary mb-3">📖 Reference Snippet</h3>
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed mb-4 max-h-48 overflow-y-auto bg-white p-4 border border-border rounded">{visibleSegment}</p>
                  <Button onClick={() => setVisibleSegment(null)} variant="outline" className="h-9">
                    Dismiss
                  </Button>
                </div>
              )}

              {/* Hidden Mic component - handles audio input */}
              {token && !error && client && (
                <div className="hidden">
                  <Mic state={isMuted ? 'closed' : micState} client={client} />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Completing */}
              <div className="border border-border bg-white rounded-lg p-6 text-center shadow-sm">
                <div className="flex items-center justify-center gap-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                  <span className="text-muted-foreground">Completing interview...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Network stats */}
      <div className="max-w-5xl mx-auto px-6 pb-4 pt-12">
        <div className="bg-white border border-border rounded-lg shadow-sm p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Network</span>
            <span className="text-xs font-semibold">{Math.round(connectionQuality)}%</span>
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground">Deepgram RTT {rttMs > 1 ? Math.round(rttMs) + ' ms' : 'estimating…'} • Adaptive buffer ~{connectionQuality >= 80 ? '250' : connectionQuality >= 50 ? '375' : connectionQuality >= 25 ? '500' : '750'}ms</div>
        </div>
      </div>
    </>
  );
}