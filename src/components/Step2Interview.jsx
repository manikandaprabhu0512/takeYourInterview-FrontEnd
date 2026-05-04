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

  return (
    <div className="min-h-screen bg-linear-to-br from-orange-50 via-white to-orange-100 dark:from-[#030303] dark:via-slate-900 dark:to-slate-800 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-350 min-h-[80vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col lg:flex-row overflow-hidden">
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

          {subtitle && (
            <div className="w-full max-w-md bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
              <p className="text-gray-700 dark:text-gray-200 text-sm sm:text-base font-medium text-center leading-relaxed">
                {subtitle}
              </p>
            </div>
          )}

          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-md p-6 space-y-5">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500 dark:text-gray-300">
                Interview Status
              </span>
              {isAIPlaying && (
                <span className="text-sm font-semibold text-orange-600">
                  AI Speaking
                </span>
              )}
            </div>

            <div className="h-px bg-gray-200 dark:bg-gray-700" />

            <div className="text-center">
              <span className="text-3xl font-bold text-orange-600">
                {followUpCount}
              </span>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Follow-up questions asked
              </p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Maximum {maxFollowUps} per main question
              </p>
            </div>

            <div className="h-px bg-gray-200 dark:bg-gray-700" />

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

        <div className="flex-1 flex flex-col p-4 sm:p-6 md:p-8 relative text-gray-900 dark:text-gray-100">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">
            AI Smart Interview
          </h2>

          {!isIntroPhase && (
            <div className="relative mb-6 bg-gray-50 dark:bg-slate-800 p-4 sm:p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 mb-2">
                {followUpCount
                  ? `Follow-up ${followUpCount} of ${maxFollowUps}`
                  : `Question ${currentIndex + 1} of ${questions.length}`}
              </p>

              <div className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white leading-relaxed ">
                {currentAiPrompt || currentQuestion?.question}
              </div>
            </div>
          )}

          <textarea
            placeholder="Type your answer here..."
            onChange={(event) => setAnswer(event.target.value)}
            disabled={isSubmitting || !!feedback}
            value={answer}
            className={`flex-1 bg-gray-100 dark:bg-slate-800 p-4 sm:p-6 rounded-2xl resize-none outline-none border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-orange-500 transition text-gray-800 dark:text-gray-100 ${isSubmitting || !!feedback ? "opacity-50 cursor-not-allowed" : "opacity-100"}`}
          />

          {!feedback ? (
            <div className="flex items-center gap-4 mt-6">
              <motion.button
                onClick={toggleMic}
                disabled={isMicDisabled}
                whileTap={{ scale: 0.9 }}
                className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-full bg-black text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
                {isSubmitting
                  ? "Processing..."
                  : followUpCount < maxFollowUps
                    ? "Continue"
                    : "Evaluate Answer"}
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
              <p className="text-sm text-orange-600 dark:text-orange-300">
                Moving ahead automatically...
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Step2Interview;
