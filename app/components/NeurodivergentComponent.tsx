'use client';

import { useState, useEffect } from 'react';
import MarkdownRenderer from './MarkdownRenderer';

interface TOCItem {
  title: string;
  level: number;
  index: number;
}

export default function NeurodivergentComponent({ markdown }: { markdown: string | null }) {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [transformedSections, setTransformedSections] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isTOCOpen, setIsTOCOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [sections, setSections] = useState<string[]>([]);
  const [toc, setToc] = useState<TOCItem[]>([]);

  const splitMarkdownByHeadings = (markdownText: string): { sections: string[]; toc: TOCItem[] } => {
    const lines = markdownText.split('\n');
    const newSections: string[] = [];
    const newToc: TOCItem[] = [];
    let currentSection = '';
    let sectionIndex = 0;

    for (let line of lines) {
      const headingMatch = line.match(/^(#{1,6}) (.+)/);

      if (headingMatch) {
        if (currentSection.trim()) {
          newSections.push(currentSection.trim());
          sectionIndex++;
        }
        currentSection = line;
        const level = headingMatch[1].length;
        const title = headingMatch[2].replace(/\*/g, '').trim();
        newToc.push({ title, level, index: sectionIndex });
      } else {
        currentSection += `\n${line}`;
      }
    }

    if (currentSection.trim()) {
      newSections.push(currentSection.trim());
    }

    return { sections: newSections, toc: newToc };
  };

  useEffect(() => {
    if (markdown) {
      const { sections: newSections, toc: newToc } = splitMarkdownByHeadings(markdown);
      setSections(newSections);
      setToc(newToc);
    }
  }, [markdown]);

  const transformText = async (text: string): Promise<string> => {
    setLoading(true);
    try {
      const response = await fetch('/api/neurodivergent-transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await response.json();
      setLoading(false);
      return data.transformedText || 'Error transforming text.';
    } catch (error) {
      console.error('Error transforming text:', error);
      setLoading(false);
      return 'Error transforming text.';
    }
  };

  const stopAudio = () => {
    if (audio) {
      audio.pause();
      audio.remove();
      setAudio(null);
      setIsSpeaking(false);
    }
  };

  const handleReadAloud = async () => {
    const currentText = transformedSections[currentSectionIndex];
    if (!currentText) return;

    if (isSpeaking) {
      stopAudio();
      return;
    }

    try {
      setIsLoadingAudio(true);
      stopAudio();

      const response = await fetch('/api/read-aloud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: currentText,
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
      setIsLoadingAudio(false);
    }
  };

  const getButtonText = () => {
    if (isLoadingAudio) return "Loading...";
    if (isSpeaking) return "Stop reading";
    return "Read it to me";
  };

  useEffect(() => {
    const loadTransformedSection = async () => {
      const currentSection = sections[currentSectionIndex] || '';
      if (!transformedSections[currentSectionIndex] && currentSection) {
        const transformedText = await transformText(currentSection);
        setTransformedSections((prev) => {
          const updated = [...prev];
          updated[currentSectionIndex] = transformedText;
          return updated;
        });
      }
    };

    if (sections.length > 0) {
      loadTransformedSection();
    }

    stopAudio();
  }, [currentSectionIndex, sections]);

  useEffect(() => {
    return () => {
      if (audio) {
        audio.pause();
        audio.remove();
      }
    };
  }, []);

  const handleNext = () => {
    if (currentSectionIndex < sections.length - 1) {
      setCurrentSectionIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex((prev) => prev - 1);
    }
  };

  const handleTOCClick = (index: number) => {
    setCurrentSectionIndex(index);
    setIsTOCOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <button
          onClick={() => setIsTOCOpen((prev) => !prev)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white shadow-sm"
        >
          {isTOCOpen ? 'Close Table of Contents' : 'Open Table of Contents'}
        </button>
        {isTOCOpen && (
          <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg shadow-md mt-2 max-h-60 overflow-y-auto">
            {toc.map((item) => (
              <li
                key={item.index}
                className={`cursor-pointer px-4 py-2 hover:bg-gray-100 ${
                  item.index === currentSectionIndex ? 'font-bold text-blue-500' : ''
                }`}
                style={{ paddingLeft: `${item.level * 1.5}rem` }}
                onClick={() => handleTOCClick(item.index)}
              >
                {item.title}
              </li>
            ))}
          </ul>
        )}
      </div>

      {transformedSections[currentSectionIndex] && (
        <button
          onClick={handleReadAloud}
          disabled={isLoadingAudio}
          className="w-full px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          {getButtonText()}
        </button>
      )}

      {loading ? (
        <div className="text-center">Loading...</div>
      ) : (
        <MarkdownRenderer markdown={transformedSections[currentSectionIndex] || ''} />
      )}

      <div className="flex justify-between">
        <button
          onClick={handleBack}
          disabled={currentSectionIndex === 0}
          className="px-4 py-2 bg-gray-300 rounded-lg disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={currentSectionIndex === sections.length - 1}
          className="px-4 py-2 bg-gray-300 rounded-lg disabled:opacity-50"
        >
          Next
        </button>
      </div>

      <div className="text-center text-sm text-gray-500">
        Section {currentSectionIndex + 1} of {sections.length}
      </div>
    </div>
  );
}