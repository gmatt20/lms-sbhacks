import { DeepgramClient, type AgentLiveClient } from "@deepgram/sdk";

/**
 * Singleton manager for Deepgram Agent clients
 * Ensures single client instance across the application to prevent connection issues
 */
class DeepgramAgent {
  private static instance: DeepgramAgent | null = null;
  private agentClient: AgentLiveClient | null = null;
  private apiKey: string | null = null;

  private constructor() {
    // Private constructor to enforce singleton pattern
  }

  public static getInstance(): DeepgramAgent {
    if (this.instance === null) {
      this.instance = new DeepgramAgent();
    }
    this.instance.agentClient?.configure({
      audio: {
        input: {
          encoding: "linear16",
          sample_rate: 48000,
        },
        output: {
          encoding: "linear16",
          sample_rate: 24000,
          container: "none",
        },
      },
      agent: {
        language: "en",
        speak: {
          provider: {
            type: "deepgram",
            model: "aura-2-odysseus-en",
          },
        },
        listen: {
          provider: {
            type: "deepgram",
            version: "v2",
            model: "flux-general-en",
          },
        },
        think: {
          provider: {
            type: "google",
            model: "gemini-2.5-flash",
          },
          prompt: "you are a helpful assistant",
        },
        greeting: "Hello! How may I help you?",
      },
    });
    return this.instance;
  }

  public setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  public getClient(): AgentLiveClient | null {
    if (this.agentClient) {
      return this.agentClient;
    }
    if (this.apiKey) {
      const client = new DeepgramClient({ key: this.apiKey });
      this.agentClient = client.agent();
      return this.agentClient;
    }
    return null;
  }
}

export const getDeepgramClient = (apiKey: string): AgentLiveClient | null => {
  const deepgram = DeepgramAgent.getInstance();
  deepgram.setApiKey(apiKey);
  return deepgram.getClient();
};

