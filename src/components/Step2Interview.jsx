import React, { useEffect, useRef, useState } from "react";
import maleVideo from "../assets/videos/male-ai.mp4";
import femaleVideo from "../assets/videos/female-ai.mp4";
import { motion } from "motion/react";
import { FaMicrophone, FaMicrophoneSlash } from "react-icons/fa";
import axios from "axios";
import { useLatestRef } from "../hooks/useLatestRef";
import { useOpenAiTts } from "../hooks/useOpenAiTts";
import { useSttRecorder } from "../hooks/useSttRecorder";

function Step2Interview({ interviewData, onFinish }) {
  const { interviewId, questions, userName } = interviewData;
  const [isIntroPhase, setIsIntroPhase] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voiceGender] = useState("female");
  const [followUpCount, setFollowUpCount] = useState(0);
  const [conversationTurns, setConversationTurns] = useState([]);
  const [currentAiPrompt, setCurrentAiPrompt] = useState("");

  const videoRef = useRef(null);
  const conversationTurnsRef = useLatestRef(conversationTurns);
  const followUpCountRef = useLatestRef(followUpCount);
  const isSubmittingRef = useLatestRef(isSubmitting);
  const feedbackRef = useLatestRef(feedback);

  const maxFollowUps = 3;
  const currentQuestion = questions[currentIndex];
  const videoSource = voiceGender === "male" ? maleVideo : femaleVideo;

  const {
    answer,
    answerRef,
    clearAnswer,
    isMicOn,
    setAnswer,
    startMic,
    stopMic,
    toggleMic,
  } = useSttRecorder({
    canRestart: !feedback && !isSubmitting,
    feedback,
    isAIPlaying: false,
    isSubmitting,
    onSilence: () => {
      submitAnswer();
    },
  });

  const { isAIPlaying, isAIPlayingRef, speakText, subtitle } = useOpenAiTts({
    videoRef,
    voiceGender,
    startMic,
    stopMic,
    shouldRestartMic: isMicOn && !feedback,
  });

  useEffect(() => {
    isSubmittingRef.current = isSubmitting;
  }, [isSubmitting, isSubmittingRef]);

  useEffect(() => {
    feedbackRef.current = feedback;
  }, [feedback, feedbackRef]);

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
        await new Promise((resolve) => setTimeout(resolve, 800));

        if (currentIndex === questions.length - 1) {
          await speakText("Alright, this one might be a bit more challenging.");
        }

        const mainQuestion = currentQuestion.question;
        const initialTurns = [
          {
            role: "ai",
            type: "main_question",
            text: mainQuestion,
          },
        ];

        setCurrentAiPrompt(mainQuestion);
        setConversationTurns(initialTurns);
        conversationTurnsRef.current = initialTurns;
        setFollowUpCount(0);
        followUpCountRef.current = 0;

        await speakText(mainQuestion);

        if (isMicOn) {
          startMic();
        }
      }
    };

    runIntro();
  }, [isIntroPhase, currentIndex]);

  const submitAnswer = async () => {
    if (isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    const typedAnswer = answerRef.current.trim();
    const transcribedAnswer = await stopMic({ restart: false });
    const latestAnswer = `${typedAnswer} ${transcribedAnswer || ""}`
      .trim()
      .replace(/\s+/g, " ");
    const nextTurns = [
      ...conversationTurnsRef.current,
      {
        role: "user",
        type: "answer",
        text: latestAnswer,
      },
    ];

    setConversationTurns(nextTurns);
    conversationTurnsRef.current = nextTurns;
    clearAnswer();

    try {
      if (latestAnswer && followUpCountRef.current < maxFollowUps) {
        const result = await axios.post(
          "/api/interview/follow-up",
          {
            interviewId,
            questionIndex: currentIndex,
            conversationTurns: nextTurns,
          },
          { withCredentials: true },
        );

        const followUpQuestion = result.data.followUpQuestion;
        const updatedTurns = [
          ...nextTurns,
          {
            role: "ai",
            type: "follow_up",
            text: followUpQuestion,
          },
        ];
        const nextFollowUpCount = followUpCountRef.current + 1;

        setConversationTurns(updatedTurns);
        conversationTurnsRef.current = updatedTurns;
        setFollowUpCount(nextFollowUpCount);
        followUpCountRef.current = nextFollowUpCount;
        setCurrentAiPrompt(followUpQuestion);
        isSubmittingRef.current = false;
        setIsSubmitting(false);
        await speakText(followUpQuestion);
        return;
      }

      const result = await axios.post(
        "/api/interview/evaluate-thread",
        {
          interviewId,
          questionIndex: currentIndex,
          conversationTurns: nextTurns,
        },
        { withCredentials: true },
      );

      feedbackRef.current = result.data.feedback;
      setFeedback(result.data.feedback);
      await speakText(result.data.feedback);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await handleNext();
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    } catch (error) {
      console.log(error);
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const resetQuestionState = () => {
    clearAnswer();
    setFeedback("");
    feedbackRef.current = "";
    setConversationTurns([]);
    conversationTurnsRef.current = [];
    setFollowUpCount(0);
    followUpCountRef.current = 0;
    setCurrentAiPrompt("");
  };

  const handleNext = async () => {
    resetQuestionState();

    if (currentIndex + 1 >= questions.length) {
      await finishInterview();
      return;
    }

    await speakText("Alright, let's move to the next question.");
    setCurrentIndex(currentIndex + 1);
  };

  const finishInterview = async () => {
    await stopMic({ restart: false });

    try {
      if (document.fullscreenElement) document.exitFullscreen();
      const result = await axios.post(
        "/api/interview/finish",
        { interviewId },
        { withCredentials: true },
      );

      onFinish(result.data);
    } catch (error) {
      console.log(error);
    }
  };

  const isMicDisabled = isAIPlayingRef.current || isSubmitting || !!feedback;
  const aiStatus = isAIPlaying
    ? "AI speaking"
    : isSubmitting
      ? "AI processing"
      : "AI waiting";
  const userStatus = isSubmitting
    ? "Processing answer"
    : isMicOn && !isMicDisabled
      ? "Listening"
      : isMicOn
        ? "Mic paused"
        : "Mic off";
  const promptLabel = followUpCount
    ? `Follow-up ${followUpCount} of ${maxFollowUps}`
    : `Question ${currentIndex + 1} of ${questions.length}`;

  return (
    <div className="min-h-screen bg-[#05223e] flex items-center justify-center p-4 sm:p-6 text-white">
      <div className="w-full max-w-5xl">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6 text-gray-100">
          AI Smart Interview
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div
            className={`relative min-h-60 rounded-2xl bg-[#16486a] border-2 shadow-xl overflow-hidden ${
              isAIPlaying || isSubmitting
                ? "border-orange-400"
                : "border-gray-400/80"
            }`}
          >
            <div className="absolute left-4 top-4 rounded-full bg-black/25 px-3 py-1 text-xs font-semibold text-gray-100">
              {aiStatus}
            </div>
            <video
              src={videoSource}
              key={videoSource}
              ref={videoRef}
              muted
              playsInline
              preload="auto"
              className="h-full w-full object-cover opacity-80"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/15"></div>
          </div>

          <div
            className={`relative min-h-60 rounded-2xl bg-[#16486a] border-2 shadow-xl ${
              isMicOn && !isMicDisabled
                ? "border-emerald-400"
                : "border-gray-400/80"
            }`}
          >
            <div className="absolute left-4 top-4 rounded-full bg-black/25 px-3 py-1 text-xs font-semibold text-gray-100">
              {userStatus}
            </div>
            <div className="absolute right-4 top-4 rounded-full bg-black/25 px-3 py-1 text-xs font-semibold text-gray-100">
              Q {currentIndex + 1}/{questions.length}
            </div>
            <div className="flex h-full min-h-60 flex-col items-center justify-center gap-5 p-6 text-center">
              <motion.button
                onClick={toggleMic}
                disabled={isMicDisabled}
                whileTap={{ scale: 0.9 }}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-black/35 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isMicOn ? (
                  <FaMicrophone size={22} />
                ) : (
                  <FaMicrophoneSlash size={22} />
                )}
              </motion.button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-[#16486a] border-2 border-gray-400/80 shadow-xl p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-200">
            <span>{isIntroPhase ? "Preparing interview" : promptLabel}</span>
            <span>
              Follow-ups {followUpCount}/{maxFollowUps}
            </span>
          </div>

          <div className="mb-4 rounded-xl bg-black/20 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-300">
              AI prompt
            </p>
            <p className="text-base sm:text-lg font-semibold leading-relaxed text-white">
              {feedback ||
                subtitle ||
                currentAiPrompt ||
                currentQuestion?.question ||
                "Getting ready..."}
            </p>
            {feedback && (
              <p className="mt-3 text-sm text-orange-200">
                Moving ahead automatically...
              </p>
            )}
          </div>

          {/* <textarea
            placeholder={
              isMicOn
                ? "Listening... your transcript will appear after you pause."
                : "Mic is off. Type your answer here or turn the mic on."
            }
            onChange={(event) => setAnswer(event.target.value)}
            disabled={isSubmitting || !!feedback}
            value={answer}
            className={`min-h-32 w-full resize-none rounded-xl border border-gray-300/70 bg-black/20 p-4 text-base text-white outline-none transition placeholder:text-gray-300 focus:ring-2 focus:ring-orange-400 ${
              isSubmitting || !!feedback
                ? "opacity-60 cursor-not-allowed"
                : "opacity-100"
            }`}
          /> */}
        </div>
      </div>
    </div>
  );
}

export default Step2Interview;
