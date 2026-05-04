import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useLatestRef } from "./useLatestRef";

export function useSttRecorder({
  canRestart,
  isAIPlaying,
  isSubmitting,
  feedback,
  onSilence,
  silenceLimitMs = 1000,
  speechVolumeThreshold = 0.025,
}) {
  const [isMicOn, setIsMicOn] = useState(true);
  const [answer, setAnswerState] = useState("");

  const answerRef = useLatestRef(answer);
  const isMicOnRef = useLatestRef(isMicOn);
  const canRestartRef = useLatestRef(canRestart);
  const isAIPlayingRef = useLatestRef(isAIPlaying);
  const isSubmittingRef = useLatestRef(isSubmitting);
  const feedbackRef = useLatestRef(feedback);
  const onSilenceRef = useLatestRef(onSilence);

  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const recordingActiveRef = useRef(false);
  const audioContextRef = useRef(null);
  const silenceAnimationRef = useRef(null);
  const hasSpokenRef = useRef(false);
  const silenceStartedAtRef = useRef(null);
  const suppressMicRestartRef = useRef(false);
  const pendingStopResolveRef = useRef(null);
  const transcribeQueueRef = useRef(Promise.resolve());

  const setAnswer = (valueOrUpdater) => {
    setAnswerState((prev) => {
      const next =
        typeof valueOrUpdater === "function"
          ? valueOrUpdater(prev)
          : valueOrUpdater;
      answerRef.current = next;
      return next;
    });
  };

  const clearAnswer = () => {
    answerRef.current = "";
    setAnswerState("");
  };

  const transcribeAudio = (audioBlob) => {
    if (!audioBlob?.size) return Promise.resolve("");

    transcribeQueueRef.current = transcribeQueueRef.current
      .then(async () => {
        const formData = new FormData();
        const extension = audioBlob.type.includes("mp4") ? "mp4" : "webm";
        formData.append("audio", audioBlob, `answer.${extension}`);

        const result = await axios.post("/api/stt/transcribe", formData, {
          withCredentials: true,
        });

        const transcript = result.data?.text;
        if (transcript?.trim()) {
          setAnswer((prev) => `${prev} ${transcript}`.trim());
          return transcript.trim();
        }

        return "";
      })
      .catch((error) => {
        console.log(error);
        return "";
      });

    return transcribeQueueRef.current;
  };

  const getSupportedMimeType = () => {
    const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
    return types.find((type) => MediaRecorder.isTypeSupported(type)) || "";
  };

  const stopSilenceDetection = () => {
    if (silenceAnimationRef.current) {
      cancelAnimationFrame(silenceAnimationRef.current);
      silenceAnimationRef.current = null;
    }

    if (audioContextRef.current?.state !== "closed") {
      audioContextRef.current?.close();
    }

    audioContextRef.current = null;
    silenceStartedAtRef.current = null;
  };

  const startSilenceDetection = (stream) => {
    stopSilenceDetection();

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    const samples = new Uint8Array(analyser.fftSize);

    source.connect(analyser);
    audioContextRef.current = audioContext;
    hasSpokenRef.current = false;
    silenceStartedAtRef.current = null;

    const detectSilence = () => {
      if (
        !recordingActiveRef.current ||
        isAIPlayingRef.current ||
        isSubmittingRef.current ||
        feedbackRef.current
      ) {
        return;
      }

      analyser.getByteTimeDomainData(samples);

      let sum = 0;
      for (let i = 0; i < samples.length; i += 1) {
        const value = (samples[i] - 128) / 128;
        sum += value * value;
      }

      const volume = Math.sqrt(sum / samples.length);
      const now = Date.now();

      if (volume > speechVolumeThreshold) {
        hasSpokenRef.current = true;
        silenceStartedAtRef.current = null;
      } else if (hasSpokenRef.current) {
        if (!silenceStartedAtRef.current) {
          silenceStartedAtRef.current = now;
        }

        if (now - silenceStartedAtRef.current >= silenceLimitMs) {
          stopSilenceDetection();
          onSilenceRef.current?.();
          return;
        }
      }

      silenceAnimationRef.current = requestAnimationFrame(detectSilence);
    };

    silenceAnimationRef.current = requestAnimationFrame(detectSilence);
  };

  const startMic = async () => {
    if (
      !navigator.mediaDevices?.getUserMedia ||
      !window.MediaRecorder ||
      isAIPlayingRef.current ||
      recordingActiveRef.current
    ) {
      return;
    }

    try {
      const stream =
        mediaStreamRef.current ||
        (await navigator.mediaDevices.getUserMedia({ audio: true }));
      mediaStreamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      recordingChunksRef.current = [];
      hasSpokenRef.current = false;
      silenceStartedAtRef.current = null;

      recorder.onstart = () => {
        recordingActiveRef.current = true;
        startSilenceDetection(stream);
      };

      recorder.ondataavailable = (event) => {
        if (event.data?.size) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        recordingActiveRef.current = false;
        stopSilenceDetection();

        const audioBlob = new Blob(recordingChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        recordingChunksRef.current = [];

        const transcriptionPromise = transcribeAudio(audioBlob);

        const shouldRestart =
          !suppressMicRestartRef.current &&
          isMicOnRef.current &&
          canRestartRef.current &&
          !isAIPlayingRef.current &&
          !isSubmittingRef.current &&
          !feedbackRef.current;

        suppressMicRestartRef.current = false;

        if (pendingStopResolveRef.current) {
          const resolve = pendingStopResolveRef.current;
          pendingStopResolveRef.current = null;
          transcriptionPromise.then(resolve).catch(() => resolve(""));
        }

        if (shouldRestart) {
          window.setTimeout(() => {
            startMic();
          }, 250);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
    } catch (error) {
      console.log(error);
      setIsMicOn(false);
    }
  };

  const stopMic = ({ restart = true } = {}) => {
    suppressMicRestartRef.current = !restart;
    stopSilenceDetection();

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      const stopped = new Promise((resolve) => {
        pendingStopResolveRef.current = resolve;
      });
      mediaRecorderRef.current.stop();
      return stopped;
    }

    suppressMicRestartRef.current = false;
    return transcribeQueueRef.current.then(() => "");
  };

  const toggleMic = () => {
    if (isMicOnRef.current) {
      stopMic({ restart: false });
    } else {
      startMic();
    }
    setIsMicOn(!isMicOnRef.current);
  };

  useEffect(() => {
    return () => {
      stopMic({ restart: false });
      stopSilenceDetection();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return {
    answer,
    answerRef,
    clearAnswer,
    isMicOn,
    setAnswer,
    startMic,
    stopMic,
    toggleMic,
  };
}
