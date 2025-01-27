"use client";

import DyslexiaComponent from "@/app/components/DyslexiaComponent";
import VisionImpairmentComponent from "@/app/components/VisionImpairmentComponent";
import NeurodivergentComponent from "@/app/components/NeurodivergentComponent";

type AccessibilityNeed = "vision_impairment" | "dyslexia" | "neurodivergent";



interface AccessibilityOptionsProps {
  markdown: string | null;
  accessibilityNeed: AccessibilityNeed | null;
  envelopeId: string;
}

export default function AccessibilityOptions({
                                               markdown,
                                               accessibilityNeed,
                                               envelopeId
                                             }: AccessibilityOptionsProps) {

  const renderContent = () => {
    switch (accessibilityNeed) {
      case "dyslexia":
        return <DyslexiaComponent markdown={markdown} />;
      case "neurodivergent":
        return <NeurodivergentComponent markdown={markdown}/>;
      default:
        return <p>Please select an accessibility option from the dropdown above.</p>;
    }
  };

  return (
    <div>

      {/* Rendered Content */}
      <div className="flex-grow">{accessibilityNeed ? renderContent() : null}</div>
    </div>
  );
}
