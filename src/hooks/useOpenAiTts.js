import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useLatestRef } from "./useLatestRef";

export function useOpenAiTts({
  videoRef,
  voiceGender,
  startMic,
  stopMic,
  shouldRestartMic,
}) {
  const [isAIPlaying, setIsAIPlaying] = useState(false);
  const [subtitle, setSubtitle] = useState("");
  const audioRef = useRef(null);
  const isAIPlayingRef = useLatestRef(isAIPlaying);
  const shouldRestartMicRef = useLatestRef(shouldRestartMic);
  const startMicRef = useLatestRef(startMic);
  const stopMicRef = useLatestRef(stopMic);

  const openAiVoice = voiceGender === "male" ? "onyx" : "coral";

  const speakText = (text) => {
    return new Promise(async (resolve) => {
      let audioUrl;

      const finishSpeaking = () => {
        videoRef.current?.pause();
        if (videoRef.current) {
          videoRef.current.currentTime = 0;
        }

        isAIPlayingRef.current = false;
        setIsAIPlaying(false);

        if (shouldRestartMicRef.current) {
          startMicRef.current?.();
        }

        window.setTimeout(() => {
          setSubtitle("");
          if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
          }
          resolve();
        }, 300);
      };

      try {
        audioRef.current?.pause();
        isAIPlayingRef.current = true;
        setIsAIPlaying(true);
        await stopMicRef.current?.({ restart: false });
        setSubtitle(text);

        const response = await axios.post(
          "/api/tts/speech",
          {
            text,
            voice: openAiVoice,
            instructions:
              "Speak like a warm, professional AI interviewer. Use natural pauses, clear pronunciation, and a supportive tone.",
          },
          {
            responseType: "blob",
            withCredentials: true,
          },
        );

        audioUrl = URL.createObjectURL(response.data);
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.onplay = () => {
          videoRef.current?.play();
        };
        audio.onended = finishSpeaking;
        audio.onerror = finishSpeaking;

        await audio.play();
      } catch (error) {
        console.log(error);
        finishSpeaking();
      }
    });
  };

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  return {
    isAIPlaying,
    isAIPlayingRef,
    speakText,
    subtitle,
  };
}
