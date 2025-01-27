import React, { useEffect, useState } from "react";
import "react-chat-elements/dist/main.css";
import MarkdownRenderer from "@/app/components/MarkdownRenderer";

const SummaryComponent = ({
                            envelopeId,
                            type,
                          }: {
  envelopeId: string;
  type: "dyslexia" | "vision_impairment" | "neurodivergent";
}) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await fetch("/api/summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            envelopeId,
            type,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch the summary");
        }

        const data = await response.json();
        setSummary(data.summary);
      } catch (err: any) {
        console.error("[ERROR] Failed to fetch summary:", err.message);
        setError("Failed to load the summary. Please try again later.");
      }
    };

    fetchSummary();

    return () => {
      if (audio) {
        audio.pause();
        audio.remove();
      }
    };
  }, [envelopeId, type]);

  const stopAudio = () => {
    if (audio) {
      audio.pause();
      audio.remove();
      setAudio(null);
      setIsSpeaking(false);
    }
  };

  const handleReadAloud = async () => {
    if (!summary) return;

    // If already speaking, stop the audio
    if (isSpeaking) {
      stopAudio();
      return;
    }

    try {
      setIsLoading(true);
      stopAudio(); // Stop any existing audio

      const response = await fetch('/api/read-aloud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: summary,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      const newAudio = new Audio(audioUrl);
      setAudio(newAudio);

      newAudio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };

      newAudio.onerror = () => {
        console.error('[ERROR] Audio playback failed');
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };

      await newAudio.play();
      setIsSpeaking(true);
    } catch (err: any) {
      console.error('[ERROR] Failed to process text-to-speech:', err.message);
      setIsSpeaking(false);
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonText = () => {
    if (isLoading) return "Loading...";
    if (isSpeaking) return "Stop reading";
    return "Read it to me";
  };

  return (
    <div className="flex flex-col h-full bg-gray-100">
      <div className="prose overflow-auto">
        {error ? (
          <p className="text-red-500">{error}</p>
        ) : summary ? (
          <div className="mt-4">
            <button
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              onClick={handleReadAloud}
              disabled={isLoading}
            >
              {getButtonText()}
            </button>

            <MarkdownRenderer
              markdown={summary}
              className={type === "dyslexia" ? "font-dyslexic" : ""}
            />
          </div>
        ) : (
          <p>Loading summary...</p>
        )}
      </div>
    </div>
  );
};

export default SummaryComponent;