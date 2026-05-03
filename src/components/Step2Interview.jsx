import React from "react";
import maleVideo from "../assets/videos/male-ai.mp4";
import femaleVideo from "../assets/videos/female-ai.mp4";
import Timer from "./Timer";
import { motion } from "motion/react";
import { FaMicrophone, FaMicrophoneSlash } from "react-icons/fa";
import { useState } from "react";
import { useRef } from "react";
import { useEffect } from "react";
import axios from "axios";
import { BsArrowRight } from "react-icons/bs";

function Step2Interview({ interviewData, onFinish }) {
  const { interviewId, questions, userName } = interviewData;
  const [isIntroPhase, setIsIntroPhase] = useState(true);

  const [isMicOn, setIsMicOn] = useState(true);
  const [isAIPlaying, setIsAIPlaying] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [timeLeft, setTimeLeft] = useState(questions[0]?.timeLimit || 60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voiceGender, setVoiceGender] = useState("female");
  const [subtitle, setSubtitle] = useState("");

  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const isMicOnRef = useRef(isMicOn);
  const answerRef = useRef(answer);
  const isAIPlayingRef = useRef(isAIPlaying);
  const isSubmittingRef = useRef(isSubmitting);
  const feedbackRef = useRef(feedback);
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const recordingActiveRef = useRef(false);
  const suppressMicRestartRef = useRef(false);
  const pendingStopResolveRef = useRef(null);
  const transcribeQueueRef = useRef(Promise.resolve());

  const currentQuestion = questions[currentIndex];

  useEffect(() => {
    isMicOnRef.current = isMicOn;
  }, [isMicOn]);

  useEffect(() => {
    answerRef.current = answer;
  }, [answer]);

  useEffect(() => {
    isAIPlayingRef.current = isAIPlaying;
  }, [isAIPlaying]);

  useEffect(() => {
    isSubmittingRef.current = isSubmitting;
  }, [isSubmitting]);

  useEffect(() => {
    feedbackRef.current = feedback;
  }, [feedback]);

  const videoSource = voiceGender === "male" ? maleVideo : femaleVideo;
  const openAiVoice = voiceGender === "male" ? "onyx" : "coral";

  /* ---------------- SPEAK FUNCTION ---------------- */
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

        if (isMicOnRef.current) {
          startMic();
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
        await stopMic({ restart: false });
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
    const runIntro = async () => {
      if (isIntroPhase) {
        await speakText(
          `Hi ${userName}, it's great to meet you today. I hope you're feeling confident and ready.`,
        );

        await speakText(
          "I'll ask you a few questions. Just answer naturally, and take your time. Let's begin.",
        );

        setIsIntroPhase(false);
      } else if (currentQuestion) {
        await new Promise((r) => setTimeout(r, 800));

        // If last question (hard level)
        if (currentIndex === questions.length - 1) {
          await speakText("Alright, this one might be a bit more challenging.");
        }

        await speakText(currentQuestion.question);

        if (isMicOn) {
          startMic();
        }
      }
    };

    runIntro();
  }, [isIntroPhase, currentIndex]);

  useEffect(() => {
    if (isIntroPhase) return;
    if (!currentQuestion) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isIntroPhase, currentIndex]);

  useEffect(() => {
    if (!isIntroPhase && currentQuestion) {
      setTimeLeft(currentQuestion.timeLimit || 60);
    }
  }, [currentIndex]);

  const transcribeAudio = (audioBlob) => {
    if (!audioBlob?.size) return;

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
          setAnswer((prev) => {
            const nextAnswer = `${prev} ${transcript}`.trim();
            answerRef.current = nextAnswer;
            return nextAnswer;
          });
        }
      })
      .catch((error) => {
        console.log(error);
      });
  };

  const getSupportedMimeType = () => {
    const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
    return types.find((type) => MediaRecorder.isTypeSupported(type)) || "";
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

      recorder.onstart = () => {
        recordingActiveRef.current = true;
      };

      recorder.ondataavailable = (event) => {
        if (event.data?.size) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        recordingActiveRef.current = false;
        const audioBlob = new Blob(recordingChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        recordingChunksRef.current = [];

        if (audioBlob.size) {
          transcribeAudio(audioBlob);
        }

        const shouldRestart =
          !suppressMicRestartRef.current &&
          isMicOnRef.current &&
          !isAIPlayingRef.current &&
          !isSubmittingRef.current &&
          !feedbackRef.current;

        suppressMicRestartRef.current = false;

        if (pendingStopResolveRef.current) {
          const resolve = pendingStopResolveRef.current;
          pendingStopResolveRef.current = null;
          transcribeQueueRef.current.finally(resolve);
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

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      const stopped = new Promise((resolve) => {
        pendingStopResolveRef.current = resolve;
      });
      mediaRecorderRef.current.stop();
      return stopped.then(() => transcribeQueueRef.current);
    }

    suppressMicRestartRef.current = false;
    return transcribeQueueRef.current;
  };
  const toggleMic = () => {
    if (isMicOn) {
      stopMic({ restart: false });
    } else {
      startMic();
    }
    setIsMicOn(!isMicOn);
  };

  const submitAnswer = async () => {
    if (isSubmitting) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    await stopMic({ restart: false });
    await transcribeQueueRef.current;

    try {
      const result = await axios.post(
        "/api/interview/submit-answer",
        {
          interviewId,
          questionIndex: currentIndex,
          answer: answerRef.current,
          timeTaken: currentQuestion.timeLimit - timeLeft,
        },
        { withCredentials: true },
      );

      setFeedback(result.data.feedback);
      speakText(result.data.feedback);
      setIsSubmitting(false);
    } catch (error) {
      console.log(error);
      setIsSubmitting(false);
    }
  };

  const handleNext = async () => {
    answerRef.current = "";
    setAnswer("");
    setFeedback("");

    if (currentIndex + 1 >= questions.length) {
      finishInterview();
      return;
    }

    await speakText("Alright, let's move to the next question.");

    setCurrentIndex(currentIndex + 1);
    setTimeout(() => {
      if (isMicOn) startMic();
    }, 500);
  };

  const finishInterview = async () => {
    await stopMic({ restart: false });
    setIsMicOn(false);
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      const result = await axios.post(
        "/api/interview/finish",
        { interviewId },
        { withCredentials: true },
      );

      console.log(result.data);
      onFinish(result.data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (isIntroPhase) return;
    if (!currentQuestion) return;

    if (timeLeft === 0 && !isSubmitting && !feedback) {
      submitAnswer();
    }
  }, [timeLeft]);

  useEffect(() => {
    return () => {
      stopMic({ restart: false });
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());

      audioRef.current?.pause();
    };
  }, []);

  return (
    <div className="min-h-screen bg-linear-to-br from-orange-50 via-white to-orange-100 dark:from-[#030303] dark:via-slate-900 dark:to-slate-800 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-350 min-h-[80vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col lg:flex-row overflow-hidden">
        {/* video section */}
        <div className="w-full lg:w-[35%] bg-white dark:bg-slate-900 flex flex-col items-center p-6 space-y-6 border-r border-gray-200 dark:border-gray-700">
          <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-xl">
            <video
              src={videoSource}
              key={videoSource}
              ref={videoRef}
              muted
              playsInline
              preload="auto"
              className="w-full h-auto object-cover"
            />
          </div>

          {/* subtitle */}
          {subtitle && (
            <div className="w-full max-w-md bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
              <p className="text-gray-700 dark:text-gray-200 text-sm sm:text-base font-medium text-center leading-relaxed">
                {subtitle}
              </p>
            </div>
          )}

          {/* timer Area */}
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-md p-6 space-y-5">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500 dark:text-gray-300">
                Interview Status
              </span>
              {isAIPlaying && (
                <span className="text-sm font-semibold text-orange-600">
                  {isAIPlaying ? "AI Speaking" : ""}
                </span>
              )}
            </div>

            <div className="h-px bg-gray-200 dark:bg-gray-700"></div>

            <div className="flex justify-center">
              <Timer
                timeLeft={timeLeft}
                totalTime={currentQuestion?.timeLimit}
              />
            </div>

            <div className="h-px bg-gray-200 dark:bg-gray-700"></div>

            <div className="grid grid-cols-2 gap-6 text-center">
              <div>
                <span className="text-2xl font-bold text-orange-600">
                  {currentIndex + 1}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  Current Questions
                </span>
              </div>

              <div>
                <span className="text-2xl font-bold text-orange-600">
                  {questions.length}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  Total Questions
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Text section */}

        <div className="flex-1 flex flex-col p-4 sm:p-6 md:p-8 relative text-gray-900 dark:text-gray-100">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">
            AI Smart Interview
          </h2>

          {!isIntroPhase && (
            <div className="relative mb-6 bg-gray-50 dark:bg-slate-800 p-4 sm:p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 mb-2">
                Question {currentIndex + 1} of {questions.length}
              </p>

              <div className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white leading-relaxed ">
                {currentQuestion?.question}
              </div>
            </div>
          )}
          <textarea
            placeholder="Type your answer here..."
            onChange={(e) => {
              answerRef.current = e.target.value;
              setAnswer(e.target.value);
            }}
            disabled={timeLeft === 0}
            value={answer}
            className={`flex-1 bg-gray-100 dark:bg-slate-800 p-4 sm:p-6 rounded-2xl resize-none outline-none border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-orange-500 transition text-gray-800 dark:text-gray-100 ${timeLeft === 0 || isSubmitting || !!feedback ? "opacity-50 cursor-not-allowed" : "opacity-100"}`}
          />

          {!feedback ? (
            <div className="flex items-center gap-4 mt-6">
              <motion.button
                onClick={toggleMic}
                whileTap={{ scale: 0.9 }}
                className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-full bg-black text-white shadow-lg"
              >
                {isMicOn ? (
                  <FaMicrophone size={20} />
                ) : (
                  <FaMicrophoneSlash size={20} />
                )}
              </motion.button>

              <motion.button
                onClick={submitAnswer}
                disabled={isSubmitting}
                whileTap={{ scale: 0.95 }}
                className="flex-1 bg-linear-to-r from-orange-600 to-orange-500 text-white py-3 sm:py-4 rounded-2xl shadow-lg hover:opacity-90 transition font-semibold disabled:bg-gray-500"
              >
                {isSubmitting ? "Submitting..." : "Submit Answer"}
              </motion.button>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-5 rounded-2xl shadow-sm"
            >
              <p className="text-orange-700 dark:text-orange-300 font-medium mb-4">
                {feedback}
              </p>

              <button
                onClick={handleNext}
                className="w-full bg-linear-to-r from-orange-600 to-orange-500 text-white py-3 rounded-xl shadow-md hover:opacity-90 transition flex items-center justify-center gap-1 cursor-pointer"
              >
                Next Question <BsArrowRight size={18} />
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Step2Interview;
