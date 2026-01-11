"use client";

import { ListenModel, SpeechModel, ThinkModel } from "@/lib/Models";
import { Mic } from "../mic/Mic";
import { useState, useRef } from "react";
import {
  AgentEvents,
  DeepgramClient,
  type AgentLiveClient,
} from "@deepgram/sdk";
import { Button } from "../ui/button";
import addTranscript from "@/utils/addTranscript";

/**
 * Main voice agent interface component
 * Handles authentication, connection, audio processing, and conversation display
 */
export const Body = () => {
  // UI and connection state
  const [micState, setMicState] = useState<"open" | "loading" | "closed">(
    "closed",
  );
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [connected, setConnected] = useState<boolean>(false);

  // Agent configuration
  const [listenModel, setListenModel] = useState<ListenModel>(ListenModel.Flux);
  const [thinkModel, setThinkModel] = useState<ThinkModel>(ThinkModel.Claude);
  const [speechModel, setSpeechModel] = useState<SpeechModel>(
    SpeechModel.Thalia,
  );

  // Client and conversation state
  const [client, setClient] = useState<AgentLiveClient | null>(null);
  const [transcript, setTranscript] = useState<
    Array<{ role: string; content: string }>
  >([]);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState<boolean>(false);

  // Audio playback management refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const audioQueueRef = useRef<Uint8Array[]>([]);

  // Initialize or get audio context
  const getAudioContext = async (): Promise<AudioContext> => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
      console.log("🔊 AUDIO: Created new AudioContext");
    }

    // Resume audio context if suspended (required for modern browsers)
    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
      console.log("▶️ AUDIO: Resumed AudioContext after user interaction");
    }

    return audioContextRef.current;
  };

  // Stop any currently playing audio
  const stopCurrentAudio = () => {
    if (currentAudioSourceRef.current) {
      try {
        currentAudioSourceRef.current.stop();
        console.log("🛑 AUDIO: Stopped current audio playback");
      } catch {
        // Audio might already be stopped
        console.log("⚠️ AUDIO: Audio already stopped");
      }
      currentAudioSourceRef.current = null;
    }
    setIsAgentSpeaking(false);
  };

  // === AUTHENTICATION ===
  const authenticate = () => {
    fetch("/api/token", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then(async (response) => {
        if (response.ok) {
          const data = await response.json();
          setToken(data.token);
        } else {
          const errorText = await response.text();
        }
      })
      .catch((error) => {});
  };

  // === CONNECTION MANAGEMENT ===
  const disconnect = () => {
    addTranscript(transcript);

    if (!client) {
      console.warn("⚠️ DISCONNECT: No client connected to disconnect.");
      setError("No client connected to disconnect.");
      return;
    }

    console.log("🔌 DISCONNECTING: Initiating graceful shutdown...");
    try {
      client.disconnect();
      console.log("✅ DISCONNECT: Client disconnected successfully");
    } catch (error) {
      console.error("❌ DISCONNECT ERROR:", error);
    }

    // Stop any playing audio
    stopCurrentAudio();

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
      console.log("🔊 AUDIO: Closed AudioContext");
    }

    // Clean up state
    setClient(null);
    setConnected(false);
    setMicState("closed");
    setToken(null);
    setError(null);
    setTranscript([]);

    // Clear audio queue and reset timing
    audioQueueRef.current = [];
    nextStartTimeRef.current = 0;
    setIsAgentSpeaking(false);
    console.log("🧹 CLEANUP: All state cleared, ready for new connection");
  };

  const connect = () => {
    if (!token) {
      setError("No token available. Please authenticate first.");
      return;
    }

    const client = new DeepgramClient({ accessToken: token }).agent();
    setClient(client);

    client.once(AgentEvents.Welcome, (welcomeMessage) => {
      const settings = {
        audio: {
          input: {
            encoding: "linear16",
            sample_rate: 24000,
          },
          output: {
            encoding: "linear16",
            sample_rate: 24000,
            container: "none",
          },
        },
        agent: {
          greeting:
            "Hi, let's go over your work. Tell me what you need and I will answer simply.",
          listen: {
            provider: {
              type: "deepgram",
              model: listenModel,
            },
          },
          speak: {
            provider: {
              type: "deepgram",
              model: speechModel,
            },
          },
          think: {
            provider: {
              type: thinkModel === ThinkModel.Claude ? "anthropic" : "open_ai",
              model: thinkModel,
            },
          },
        },
      };
      client.configure(settings);
    });
    client.once(AgentEvents.SettingsApplied, (appliedSettings) => {
      setConnected(true);
      setMicState("open");

      // Initialize audio context for immediate playback readiness
      getAudioContext()
        .then(() => {
          console.log(
            "🔊 AUDIO: AudioContext initialized and ready for agent responses",
          );
        })
        .catch((error) => {
          console.error("❌ AUDIO: Failed to initialize AudioContext:", error);
        });

      // Set up keep-alive mechanism
      console.log("💓 KEEPALIVE: Starting keep-alive mechanism");
      client.keepAlive();
      const keepAliveInterval = setInterval(() => {
        if (client) {
          console.log("💓 KEEPALIVE: Sending keep-alive ping");
          client.keepAlive();
        } else {
          clearInterval(keepAliveInterval);
        }
      }, 8000);
    });
    client.on(AgentEvents.Error, (error) => {
      setError(`Agent error: ${error.message}`);
    });
    client.on(AgentEvents.Audio, async (audio: Uint8Array) => {
      // Add chunk to queue for sequential playback
      audioQueueRef.current.push(audio);
      processAudioQueue();
    });
    client.on(AgentEvents.AgentAudioDone, () => {
      // Don't set isAgentSpeaking false here - let the queue finish
    });

    // Process queued audio chunks for seamless playback
    const processAudioQueue = async () => {
      if (audioQueueRef.current.length === 0) return;

      try {
        const audioContext = await getAudioContext();
        const currentTime = audioContext.currentTime;

        // Initialize start time if this is the first chunk
        if (nextStartTimeRef.current < currentTime) {
          nextStartTimeRef.current = currentTime;
        }

        // Process all queued chunks sequentially
        while (audioQueueRef.current.length > 0) {
          const audioChunk = audioQueueRef.current.shift()!;

          // Convert raw audio bytes to linear16 format
          const audioData = new Int16Array(audioChunk.buffer);

          if (audioData.length === 0) continue; // Skip empty chunks

          // Create AudioBuffer for this chunk at 24kHz
          const buffer = audioContext.createBuffer(1, audioData.length, 24000);
          const channelData = buffer.getChannelData(0);

          // Convert Int16 to Float32 for Web Audio API
          for (let i = 0; i < audioData.length; i++) {
            channelData[i] = audioData[i] / 0x7fff; // Normalize to [-1, 1]
          }

          // Create and configure audio source
          const source = audioContext.createBufferSource();
          source.buffer = buffer;
          source.connect(audioContext.destination);

          // Schedule this chunk to start exactly when the previous one ends
          const startTime = nextStartTimeRef.current;
          source.start(startTime);

          // Update next start time to end of this chunk
          nextStartTimeRef.current = startTime + buffer.duration;

          setIsAgentSpeaking(true);

          // Set up completion handler for the last chunk
          source.onended = () => {
            // Check if this was the last scheduled chunk
            if (audioContext.currentTime >= nextStartTimeRef.current - 0.1) {
              if (audioQueueRef.current.length === 0) {
                setIsAgentSpeaking(false);
              }
            }
          };

          currentAudioSourceRef.current = source;
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
      }
    };
    client.on(AgentEvents.ConversationText, (message) => {
      setTranscript((prev) => [
        ...prev,
        { role: message.role, content: message.content },
      ]);
    });

    // === EVENT HANDLERS ===
    // Additional event handlers for comprehensive logging
    client.on(AgentEvents.UserStartedSpeaking, () => {
      // Handle user interruption: clear audio queue and stop playback
      audioQueueRef.current = [];
      nextStartTimeRef.current = 0;
      setIsAgentSpeaking(false);
    });

    client.on(AgentEvents.AgentStartedSpeaking, (data) => {});

    client.on(AgentEvents.Close, (closeEvent) => {});
  };

  // === UI RENDER ===
  return (
    <main className="">
      {error && (
        <div className="text-red-600 bg-red-100 border border-red-300 p-2 rounded">
          {error}
        </div>
      )}

      <Mic state={micState} client={client} onError={setError} />

      {!token && (
        <div className="rounded-lg shadow p-6 bg-white dark:bg-gray-900">
          <h2 className="text-xl font-bold mb-2">Start a quick voice check</h2>
          <p className="text-blue-600 bg-blue-100 border border-blue-300 p-2 rounded mb-4">
            Get a token to open the line; then you can speak and listen right
            away.
          </p>
          <Button
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-lg"
            onClick={authenticate}
          >
            🔐 Get token
          </Button>
        </div>
      )}

      {token && !connected && (
        <div className="rounded-lg shadow p-6 bg-white dark:bg-gray-900">
          <h2 className="text-xl font-bold mb-2">Voice settings</h2>
          <form className="space-y-4">
            <div>
              <label className="flex flex-col gap-1">
                <span>Listen Model:</span>
                <select
                  className="border rounded px-2 py-1"
                  name="listen"
                  value={listenModel}
                  onChange={(e) =>
                    setListenModel(e.target.value as ListenModel)
                  }
                >
                  <option value={ListenModel.Flux}>Flux</option>
                  <option value={ListenModel.General}>General Purpose</option>
                  <option value={ListenModel.Medical}>Medical</option>
                </select>
              </label>
            </div>
            <div>
              <label className="flex flex-col gap-1">
                <span>Think Model:</span>
                <select
                  className="border rounded px-2 py-1"
                  name="think"
                  value={thinkModel}
                  onChange={(e) => setThinkModel(e.target.value as ThinkModel)}
                >
                  <option value={ThinkModel.Claude}>Claude</option>
                  <option value={ThinkModel.GPT}>GPT</option>
                </select>
              </label>
            </div>
            <div>
              <label className="flex flex-col gap-1">
                <span>Speech Model:</span>
                <select
                  className="border rounded px-2 py-1"
                  name="speech"
                  value={speechModel}
                  onChange={(e) =>
                    setSpeechModel(e.target.value as SpeechModel)
                  }
                >
                  <option value={SpeechModel.Thalia}>Thalia</option>
                  <option value={SpeechModel.Andromeda}>Andromeda</option>
                  <option value={SpeechModel.Helena}>Helena</option>
                  <option value={SpeechModel.Apollo}>Apollo</option>
                  <option value={SpeechModel.Arcas}>Arcas</option>
                  <option value={SpeechModel.Aries}>Aries</option>
                </select>
              </label>
            </div>
            <div>
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-lg"
                type="button"
                onClick={connect}
              >
                🚀 Connect and start
              </button>
            </div>
          </form>
        </div>
      )}

      {connected && (
        <>
          <div className="rounded-lg shadow p-6 bg-white dark:bg-gray-900">
            <h2 className="text-xl font-bold mb-2">Voice channel ready</h2>
            <div
              className={`${
                isAgentSpeaking
                  ? "text-blue-700 bg-blue-200 border border-blue-400 p-2 rounded"
                  : "text-green-700 bg-green-200 border border-green-400 p-2 rounded"
              }`}
            >
              {isAgentSpeaking
                ? "🔊 Speaking now, please listen"
                : "✅ Ready to talk"}
            </div>
            <button
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 mt-4"
              onClick={disconnect}
            >
              🔌 Disconnect
            </button>
          </div>

          <div className="rounded-lg shadow p-6 bg-white dark:bg-gray-900">
            <h2 className="text-xl font-bold mb-2">Conversation log</h2>
            <div
              className="rounded-lg shadow p-4 bg-gray-50 dark:bg-gray-800"
              style={{
                maxHeight: "300px",
                overflowY: "auto",
                textAlign: "left",
                minHeight: "150px",
              }}
            >
              {transcript.length === 0 ? (
                <div className="text-blue-600 bg-blue-100 border border-blue-300 p-2 rounded">
                  <em>The conversation will appear here, wait a bit.</em>
                </div>
              ) : (
                transcript.map((message, index) => (
                  <div
                    key={index}
                    className="rounded-lg shadow p-2 mb-3"
                    style={{
                      backgroundColor:
                        message.role === "user"
                          ? "rgba(19, 239, 147, 0.1)"
                          : "rgba(20, 154, 251, 0.1)",
                      borderColor:
                        message.role === "user"
                          ? "var(--dg-primary)"
                          : "var(--dg-secondary)",
                    }}
                  >
                    <strong
                      style={{
                        color:
                          message.role === "user"
                            ? "var(--dg-primary)"
                            : "var(--dg-secondary)",
                      }}
                    >
                      {message.role === "user" ? "🗣️ You" : "🤖 Assistant"}:
                    </strong>
                    <div className="mt-2">{message.content}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </main>
  );
};
