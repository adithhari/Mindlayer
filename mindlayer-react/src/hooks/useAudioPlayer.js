import { useState, useRef, useCallback } from "react";

export const useAudioPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);

  const play = useCallback(
    async (audioUrl) => {
      try {
        console.log("🔊 Playing audio from URL:", audioUrl);

        if (audioRef.current) {
          // If same audio is playing, resume
          if (audioRef.current.src === audioUrl && isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
            return;
          }
          // Stop existing playback
          audioRef.current.pause();
        }

        // Create new audio element if needed
        if (!audioRef.current) {
          audioRef.current = new Audio();

          audioRef.current.addEventListener("loadedmetadata", () => {
            setDuration(audioRef.current.duration);
          });

          audioRef.current.addEventListener("timeupdate", () => {
            setCurrentTime(audioRef.current.currentTime);
          });

          audioRef.current.addEventListener("play", () => {
            setIsPlaying(true);
          });

          audioRef.current.addEventListener("pause", () => {
            setIsPlaying(false);
          });

          audioRef.current.addEventListener("ended", () => {
            setIsPlaying(false);
            setCurrentTime(0);
          });

          audioRef.current.addEventListener("error", (err) => {
            console.error("❌ Audio playback error:", err);
            setIsPlaying(false);
          });
        }

        audioRef.current.src = audioUrl;
        audioRef.current.play();
      } catch (err) {
        console.error("❌ Failed to play audio:", err);
        setIsPlaying(false);
      }
    },
    [isPlaying],
  );

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      setIsPlaying(false);
    }
  }, []);

  const togglePlayPause = useCallback(
    (audioUrl) => {
      if (isPlaying) {
        pause();
      } else {
        play(audioUrl);
      }
    },
    [isPlaying, play, pause],
  );

  const seek = useCallback((time) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  return {
    isPlaying,
    duration,
    currentTime,
    play,
    pause,
    stop,
    togglePlayPause,
    seek,
  };
};
