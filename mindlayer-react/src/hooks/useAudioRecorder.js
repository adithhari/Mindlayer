import { useState, useRef, useCallback } from "react";

export const useAudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  const startRecording = useCallback(async () => {
    try {
      console.log("🎙️ Requesting microphone access...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      console.log("✅ Recording started");
    } catch (err) {
      console.error("❌ Microphone access denied:", err);
      throw new Error("Microphone access denied");
    }
  }, []);

  const stopRecording = useCallback(() => {
    return new Promise((resolve, reject) => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder) {
        reject(new Error("No recording in progress"));
        return;
      }

      mediaRecorder.onstop = () => {
        // Get the correct MIME type based on browser support
        const mimeType = mediaRecorder.mimeType || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mimeType,
        });

        // Stop the microphone stream
        streamRef.current?.getTracks().forEach((track) => track.stop());

        // Stop the timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }

        setIsRecording(false);
        console.log("⏹️ Recording stopped, blob:", {
          size: audioBlob.size,
          type: audioBlob.type,
        });
        resolve(audioBlob);
      };

      mediaRecorder.onerror = (err) => {
        console.error("❌ Recording error:", err);
        reject(err);
      };

      mediaRecorder.stop();
    });
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return {
    isRecording,
    recordingTime,
    formattedTime: formatTime(recordingTime),
    startRecording,
    stopRecording,
    streamRef, // exposed so callers can tap the raw MediaStream (e.g. audio analyzer)
  };
};
