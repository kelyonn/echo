import React, { useState, useRef, useCallback } from 'react';
import { Mic, Square } from 'lucide-react';

function fmtDuration(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function VoiceRecorder({ onRecordingComplete, dark = false }) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  const chunksRef         = useRef([]);
  const timerRef          = useRef(null);
  const streamRef         = useRef(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/ogg';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const ext  = mimeType.includes('ogg') ? 'ogg' : 'webm';
        const reader = new FileReader();
        reader.onload = (ev) => {
          onRecordingComplete({
            name: `voice-${Date.now()}.${ext}`,
            type: mimeType,
            size: blob.size,
            content: ev.target.result,
          });
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t => t.stop());
        clearInterval(timerRef.current);
        setDuration(0);
        setIsRecording(false);
      };

      recorder.start(250); // collect chunks every 250ms
      setIsRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch {
      // Mic permission denied or not available — silently ignore
    }
  }, [onRecordingComplete]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
  }, []);

  const handleClick = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  return (
    <button
      type="button"
      title={isRecording ? `Stop (${fmtDuration(duration)})` : 'Record voice note'}
      onClick={handleClick}
      style={{
        width: 36, height: 36, borderRadius: '50%',
        border: isRecording
          ? '1px solid rgba(239,68,68,0.5)'
          : dark
            ? '1px solid rgba(255,255,255,0.1)'
            : '1px solid rgba(255,255,255,0.55)',
        background: isRecording
          ? 'rgba(239,68,68,0.12)'
          : dark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.5)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        color: isRecording
          ? '#ef4444'
          : dark ? 'rgba(238,242,255,0.6)' : 'rgba(17,24,39,0.55)',
        transition: 'background 0.18s ease, border 0.18s ease, color 0.18s ease',
        outline: 'none',
        animation: isRecording ? 'mic-pulse 1.4s ease-in-out infinite' : 'none',
      }}
    >
      {isRecording ? <Square size={13} fill="currentColor" /> : <Mic size={16} />}
    </button>
  );
}
