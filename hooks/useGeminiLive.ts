import { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { ConnectionState } from '../types';
import { SYSTEM_INSTRUCTION, GEMINI_MODEL } from '../constants';
import { pcmToAudioBuffer, float32To16BitPCM, base64ToBytes } from '../utils/audioUtils';

export const useGeminiLive = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false); // Visual indicator if AI is speaking

  // Refs for audio context and processing
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const sessionRef = useRef<Promise<any> | null>(null); 
  
  // Audio playback queue management
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const disconnect = useCallback(async () => {
    // 1. Close session
    if (sessionRef.current) {
        // Attempt to close nicely if resolved, otherwise just abandon
        sessionRef.current.then(session => {
            try { session.close(); } catch(e) { console.warn("Failed to close session", e); }
        }).catch(() => {});
        sessionRef.current = null;
    }
    
    // 2. Stop Microphone
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // 3. Stop Audio Contexts
    if (inputAudioContextRef.current) {
      try { await inputAudioContextRef.current.close(); } catch(e) {}
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      // specific cleanup for output to stop any playing audio
      activeSourcesRef.current.forEach(source => {
        try { source.stop(); } catch(e) {}
      });
      activeSourcesRef.current.clear();
      try { await outputAudioContextRef.current.close(); } catch(e) {}
      outputAudioContextRef.current = null;
    }

    // 4. Cleanup Nodes
    if (processorRef.current) {
      try { processorRef.current.disconnect(); } catch(e) {}
      processorRef.current = null;
    }
    if (sourceRef.current) {
      try { sourceRef.current.disconnect(); } catch(e) {}
      sourceRef.current = null;
    }

    setConnectionState(ConnectionState.DISCONNECTED);
    setIsSpeaking(false);
  }, []);

  const connect = useCallback(async () => {
    if (connectionState === ConnectionState.CONNECTING || connectionState === ConnectionState.CONNECTED) return;

    try {
      setConnectionState(ConnectionState.CONNECTING);
      setErrorMessage(null);

      // Initialize Google GenAI
      const apiKey = process.env.API_KEY;
      if (!apiKey) {
        throw new Error("API Key not found in environment variables.");
      }
      const ai = new GoogleGenAI({ apiKey });

      // Initialize Audio Contexts
      // Input: 16kHz for speech recognition
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      // Output: 24kHz matches the default Gemini output
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      inputAudioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;
      nextStartTimeRef.current = outputCtx.currentTime;

      // Get Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
        } 
      });
      streamRef.current = stream;

      // Establish Live Session
      const sessionPromise = ai.live.connect({
        model: GEMINI_MODEL,
        config: {
          responseModalities: [Modality.AUDIO], 
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } },
          },
          systemInstruction: SYSTEM_INSTRUCTION,
        },
        callbacks: {
          onopen: () => {
            console.log("Gemini Live Connected");
            setConnectionState(ConnectionState.CONNECTED);
            
            // Setup Input Pipeline (Mic -> Processor -> API)
            const source = inputCtx.createMediaStreamSource(stream);
            sourceRef.current = source;
            
            // bufferSize 4096 provides a good balance between latency and processing chunks
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = float32To16BitPCM(inputData);
              
              // Send to API
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(processor);
            processor.connect(inputCtx.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            const serverContent = msg.serverContent;

            // Handle Audio Output
            if (serverContent?.modelTurn) {
              const parts = serverContent.modelTurn.parts;
              for (const part of parts) {
                if (part.inlineData && part.inlineData.data) {
                  // Visual indicator
                  setIsSpeaking(true);
                  
                  const base64Audio = part.inlineData.data;
                  const pcmData = base64ToBytes(base64Audio);
                  const audioBuffer = pcmToAudioBuffer(pcmData, outputCtx, 24000); 
                  
                  // Schedule playback
                  const src = outputCtx.createBufferSource();
                  src.buffer = audioBuffer;
                  const gainNode = outputCtx.createGain();
                  src.connect(gainNode);
                  gainNode.connect(outputCtx.destination);
                  
                  // Simple logic to ensure non-overlapping playback
                  const startTime = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                  src.start(startTime);
                  nextStartTimeRef.current = startTime + audioBuffer.duration;

                  activeSourcesRef.current.add(src);
                  src.onended = () => {
                     activeSourcesRef.current.delete(src);
                     if (activeSourcesRef.current.size === 0) {
                        // Small delay to prevent flickering if chunks are close
                        setTimeout(() => {
                           if (activeSourcesRef.current.size === 0) setIsSpeaking(false);
                        }, 200);
                     }
                  };
                }
              }
            }
            
            // Handle Interruptions
            if (serverContent?.interrupted) {
              console.log("Model interrupted");
              activeSourcesRef.current.forEach(src => {
                try { src.stop(); } catch(e) {}
              });
              activeSourcesRef.current.clear();
              nextStartTimeRef.current = outputCtx.currentTime;
              setIsSpeaking(false);
            }
          },
          onclose: () => {
            console.log("Session Closed");
            disconnect();
          },
          onerror: (err) => {
            console.error("Session Error", err);
            // Don't show generic network error if it's just a close
            setErrorMessage("Connection error. Please try again.");
            disconnect();
          }
        }
      });
      
      sessionRef.current = sessionPromise;

    } catch (error) {
      console.error("Connection failed:", error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to connect");
      setConnectionState(ConnectionState.ERROR);
      disconnect(); // Cleanup
    }
  }, [disconnect, connectionState]);

  return {
    connectionState,
    errorMessage,
    isSpeaking,
    connect,
    disconnect
  };
};