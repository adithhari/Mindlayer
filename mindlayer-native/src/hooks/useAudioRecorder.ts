import { useState, useRef, useEffect, useCallback } from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';

interface AudioRecorderResult {
  isRecording: boolean;
  formattedTime: string;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string>; // returns file:// URI
}

export const useAudioRecorder = (): AudioRecorderResult => {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

  const formattedTime = (() => {
    const m = Math.floor(elapsedSeconds / 60);
    const s = elapsedSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  })();

  const startRecording = useCallback(async () => {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') throw new Error('Microphone permission denied');

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    recordingRef.current = recording;
    setIsRecording(true);
    setElapsedSeconds(0);

    timerRef.current = setInterval(() => {
      setElapsedSeconds(s => s + 1);
    }, 1000);
  }, []);

  const stopRecording = useCallback(async (): Promise<string> => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (!recordingRef.current) throw new Error('No active recording');

    await recordingRef.current.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

    const uri = recordingRef.current.getURI();
    recordingRef.current = null;
    setIsRecording(false);
    setElapsedSeconds(0);

    if (!uri) throw new Error('Recording URI is null');
    return uri;
  }, []);

  return { isRecording, formattedTime, startRecording, stopRecording };
};
