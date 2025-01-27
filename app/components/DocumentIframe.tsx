"use client";

import { useEffect, useState, memo } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";

interface DocumentIframeProps {
  envelopeId: string;
  onToggle: () => void;
  isCollapsed: boolean;
}

function DocumentIframeComponent({ envelopeId, onToggle, isCollapsed }: DocumentIframeProps) {
  const [signingUrl, setSigningUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSigningUrl = async () => {
      try {
        const response = await fetch(`/api/envelopes/${envelopeId}/sign`, {
          method: "GET",
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch signing URL: ${response.statusText}`);
        }

        const { signingUrl } = await response.json();
        if (!signingUrl) {
          throw new Error("Signing URL not found in response");
        }

        setSigningUrl(signingUrl);
      } catch (err: any) {
        console.error("[ERROR] Failed to fetch signing URL:", err.message);
        setError("Failed to load signing URL");
      }
    };

    fetchSigningUrl();
  }, [envelopeId]);

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  if (!signingUrl) {
    return <p>Loading signing document...</p>;
  }

  return (
    <div
      className={`${
        isCollapsed ? "w-0" : "w-full"
      } h-full relative transition-all duration-300 border-r bg-gray-100`}
    >
      <iframe
        src={signingUrl}
        title="Sign Document"
        className={`w-full h-full border-0 ${isCollapsed ? "hidden" : "block"}`}
      ></iframe>
    </div>
  );
}

const DocumentIframe = memo(DocumentIframeComponent);

export default DocumentIframe;
