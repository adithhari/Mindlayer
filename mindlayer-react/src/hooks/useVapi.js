import { useState, useRef, useCallback, useEffect } from 'react';
import Vapi from '@vapi-ai/web';

const VAPI_PUBLIC_KEY = import.meta.env.VITE_VAPI_PUBLIC_KEY || '';

const MINDLAYER_SYSTEM_PROMPT = `You are MindFlyer, a warm, perceptive mental wellness companion. You speak like a trusted friend who also has training in psychology — never clinical, never generic.

Your role:
- Listen deeply and validate feelings with genuine empathy
- Offer evidence-based insights grounded in CBT and mindfulness
- Suggest one concrete micro-action the person can take right now
- Keep each response to 2-3 conversational sentences (this is voice — be concise)
- Ask a thoughtful follow-up question to keep the conversation flowing
- Reference specific details from what they share — never be generic
- Never say "I hear you", "I understand", or "That sounds hard"

If the user mentions self-harm, suicide, or is in crisis, immediately say:
"I care about you deeply, and I want to make sure you're safe. Please call or text 988 right now. They're available 24/7."`;

export function useVapi({ onOrbState, onCallEnd }) {
  // Use refs for callbacks so event listeners always call the latest version
  // without needing to be re-registered on every render
  const onOrbStateRef = useRef(onOrbState);
  const onCallEndRef  = useRef(onCallEnd);
  useEffect(() => { onOrbStateRef.current = onOrbState; });
  useEffect(() => { onCallEndRef.current  = onCallEnd;  });

  const vapiRef       = useRef(null);
  const callActiveRef = useRef(false);   // ref copy for use inside callbacks
  const transcriptRef = useRef([]);

  const [callActive, setCallActive] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Initialise Vapi once — never recreate it
  useEffect(() => {
    if (!VAPI_PUBLIC_KEY) {
      console.warn('[Vapi] VITE_VAPI_PUBLIC_KEY is not set');
      return;
    }
    if (vapiRef.current) return; // already initialised (StrictMode guard)

    const vapi = new Vapi(VAPI_PUBLIC_KEY);
    vapiRef.current = vapi;

    vapi.on('call-start', () => {
      console.log('[Vapi] call-start');
      callActiveRef.current = true;
      setConnecting(false);
      setCallActive(true);
      transcriptRef.current = [];
      onOrbStateRef.current?.('listening');
    });

    vapi.on('speech-start', () => {
      console.log('[Vapi] speech-start');
      onOrbStateRef.current?.('speaking');
    });

    vapi.on('speech-end', () => {
      console.log('[Vapi] speech-end');
      onOrbStateRef.current?.('listening');
    });

    vapi.on('message', (msg) => {
      if (msg.type === 'transcript' && msg.transcriptType === 'final') {
        console.log(`[Vapi] transcript [${msg.role}]:`, msg.transcript);
        transcriptRef.current = [
          ...transcriptRef.current,
          { role: msg.role, text: msg.transcript, timestamp: Date.now() },
        ];
      }
    });

    vapi.on('call-end', () => {
      console.log('[Vapi] call-end — messages:', transcriptRef.current.length);
      callActiveRef.current = false;
      setCallActive(false);
      setConnecting(false);
      onOrbStateRef.current?.('idle');
      // Hand off transcript before clearing it
      const snapshot = [...transcriptRef.current];
      transcriptRef.current = [];
      onCallEndRef.current?.(snapshot);
    });

    vapi.on('error', (err) => {
      console.error('[Vapi] error:', JSON.stringify(err));
      callActiveRef.current = false;
      setCallActive(false);
      setConnecting(false);
      onOrbStateRef.current?.('idle');
    });

    // No cleanup — intentionally keep this instance alive for the session
  }, []);

  const startCall = useCallback(async (userName = '', moodLabel = 'Neutral') => {
    if (!vapiRef.current) {
      console.error('[Vapi] not initialised yet');
      return;
    }
    if (callActiveRef.current || connecting) {
      console.warn('[Vapi] call already active or connecting');
      return;
    }

    setConnecting(true);
    onOrbStateRef.current?.('processing');

    const greeting = userName
      ? `Hey ${userName}! I'm MindFlyer. You mentioned you're feeling ${moodLabel.toLowerCase()} today — I'm here to listen. What's on your mind?`
      : `Hey! I'm MindFlyer, your mental wellness companion. How are you feeling today?`;

    try {
      await vapiRef.current.start({
        name: 'MindFlyer',
        firstMessage: greeting,
        silenceTimeoutSeconds: 60,
        maxDurationSeconds: 1800,
        backgroundSound: 'off',
        backchannelingEnabled: false,
        transcriber: {
          provider: 'deepgram',
          model: 'nova-2',
          language: 'en',
        },
        model: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          messages: [{ role: 'system', content: MINDLAYER_SYSTEM_PROMPT }],
          temperature: 0.7,
          maxTokens: 200,
        },
        voice: {
          provider: 'openai',
          voiceId: 'nova',
        },
      });
    } catch (err) {
      console.error('[Vapi] start() threw:', err);
      setConnecting(false);
      onOrbStateRef.current?.('idle');
    }
  }, [connecting]);

  const endCall = useCallback(() => {
    if (!callActiveRef.current && !connecting) return;
    console.log('[Vapi] stopping call');
    vapiRef.current?.stop();
  }, [connecting]);

  return { callActive, connecting, startCall, endCall };
}
