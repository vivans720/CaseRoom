import { useCallback, useEffect, useRef, useState } from "react";

// Web Speech API interface definitions for TypeScript
interface IWindowSpeechRecognition extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

interface UseSpeechRecognitionOptions {
  onInterimTranscript?: (interimText: string) => void;
  onFinalTranscript?: (finalText: string) => void;
  lang?: string;
}

interface UseSpeechRecognitionReturn {
  isSupported: boolean;
  isListening: boolean;
  startListening: () => void;
  stopListening: () => void;
  error: string | null;
}

/**
 * High-performance zero-latency Web Speech Recognition hook.
 * Processes interim speech results with immediate dispatch (0ms UI latency),
 * handles continuous recognition, and avoids restart gap deadzones.
 */
export const useSpeechRecognition = ({
  onInterimTranscript,
  onFinalTranscript,
  lang = "en-US",
}: UseSpeechRecognitionOptions = {}): UseSpeechRecognitionReturn => {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef(false);
  const onInterimRef = useRef(onInterimTranscript);
  const onFinalRef = useRef(onFinalTranscript);

  useEffect(() => {
    onInterimRef.current = onInterimTranscript;
  }, [onInterimTranscript]);

  useEffect(() => {
    onFinalRef.current = onFinalTranscript;
  }, [onFinalTranscript]);

  const win = typeof window !== "undefined" ? (window as unknown as IWindowSpeechRecognition) : null;
  const SpeechRecognitionClass = win ? win.SpeechRecognition || win.webkitSpeechRecognition : null;
  const isSupported = Boolean(SpeechRecognitionClass);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    setIsListening(false);
    if (recognitionRef.current) {
      try {
        console.debug("[CAPTION] recognition stopping intentionally");
        recognitionRef.current.abort();
      } catch (err) {
        // Ignore abort errors
      }
      recognitionRef.current = null;
    }
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported || !SpeechRecognitionClass) {
      setError("Web Speech API is not supported in this browser.");
      return;
    }

    // Stop any existing instance cleanly
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Ignore
      }
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true; // Crucial for instant zero-latency speech streaming
      recognition.lang = lang;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        console.debug(`[CAPTION] recognition started at ${new Date().toISOString()}`);
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        const receiveTime = performance.now();
        let interimText = "";
        let finalPhrase = "";

        // Iterate through active result index to end of results
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          const transcript = result[0]?.transcript || "";

          if (result.isFinal) {
            finalPhrase += transcript;
          } else {
            interimText += transcript;
          }
        }

        const cleanInterim = interimText.trim();
        const cleanFinal = finalPhrase.trim();

        // 1. Immediately emit interim results without waiting for phrase completion
        if (cleanInterim && onInterimRef.current) {
          console.debug(
            `[CAPTION] interim transcript extracted (${Math.round(performance.now() - receiveTime)}ms processing):`,
            cleanInterim,
          );
          onInterimRef.current(cleanInterim);
        }

        // 2. Emit finalized phrase when speech engine commits it
        if (cleanFinal && onFinalRef.current) {
          console.debug(
            `[CAPTION] final transcript extracted (${Math.round(performance.now() - receiveTime)}ms processing):`,
            cleanFinal,
          );
          onFinalRef.current(cleanFinal);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === "no-speech") {
          // Normal silence pause, do not mark as failure
          return;
        }
        if (event.error === "aborted") {
          return;
        }

        console.warn(`[CAPTION] recognition error [${event.error}] at ${new Date().toISOString()}`);
        setError(event.error);
      };

      recognition.onend = () => {
        console.debug(`[CAPTION] recognition ended at ${new Date().toISOString()}`);
        // Ultra-low-latency automatic restart on utterance boundary
        if (shouldListenRef.current) {
          queueMicrotask(() => {
            if (shouldListenRef.current && recognitionRef.current) {
              try {
                console.debug("[CAPTION] recognition restarting immediately");
                recognitionRef.current.start();
              } catch (e: any) {
                // If browser already started or transitioning, catch InvalidStateError gracefully
                if (e.name !== "InvalidStateError") {
                  setTimeout(() => {
                    if (shouldListenRef.current && recognitionRef.current) {
                      try {
                        recognitionRef.current.start();
                      } catch {
                        // Ignore
                      }
                    }
                  }, 40);
                }
              }
            }
          });
        } else {
          setIsListening(false);
        }
      };

      shouldListenRef.current = true;
      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.warn("[CAPTION] Failed to start recognition:", err);
      setError(err instanceof Error ? err.message : "Failed to start speech recognition");
      setIsListening(false);
      shouldListenRef.current = false;
    }
  }, [isSupported, SpeechRecognitionClass, lang]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore
        }
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    startListening,
    stopListening,
    error,
  };
};
