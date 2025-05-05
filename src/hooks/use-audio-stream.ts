import { useEffect, useRef, useState } from "react";

export function useAudioStream(
  enabled: boolean,
  onAudioData?: (data: Float32Array) => void
) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      setStream(null);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    let stopped = false;
    let localStream: MediaStream;

    navigator.mediaDevices.getUserMedia({ audio: true }).then((mediaStream) => {
      if (stopped) return;
      setStream(mediaStream);
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(mediaStream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      analyserRef.current = analyser;
      source.connect(analyser);

      const dataArray = new Float32Array(analyser.fftSize);

      function tick() {
        analyser.getFloatTimeDomainData(dataArray);
        if (onAudioData) onAudioData(dataArray);
        animationRef.current = requestAnimationFrame(tick);
      }
      tick();
    });

    return () => {
      stopped = true;
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      setStream(null);
    };
  }, [enabled, onAudioData]);

  return { stream, analyser: analyserRef.current };
}