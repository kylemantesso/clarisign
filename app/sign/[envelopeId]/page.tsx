"use client";

import { useState, useEffect } from "react";
import AccessibilityOptions from "@/app/components/AccessibilityOptions";
import DocumentIframe from "@/app/components/DocumentIframe";
import { createClient } from "@supabase/supabase-js";
import ChatComponent from "@/app/components/ChatComponent";
import {ChevronLeft, ChevronRight} from "lucide-react";
import AccessibilitySelect from "@/app/components/AcessibilitySelect";
import SummaryComponent from "@/app/components/SummaryComponent";
import {useAccessibility} from "@/app/components/AccessibilityContext";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

type AccessibilityNeed = "vision_impairment" | "dyslexia" | "neurodivergent";

export default function ViewDocument({ params }: { params: { envelopeId: string } }) {
  const { envelopeId } = params;

  const [markdown, setMarkdown] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accessibilityNeed, setAccessibilityNeed] = useState<AccessibilityNeed | null>(null);
  const [activeTab, setActiveTab] = useState<"summary" | 'contract'  | "chat">("summary"); // New state for active tab

  const [isCollapsed, setIsCollapsed] = useState(false);

  const onToggle = () => {
    setIsCollapsed((prev) => !prev);
  };
  const { setDyslexicFont } = useAccessibility();


  const handleAccessibilityNeedChange = (accessibilityNeed) => {
    debugger;
    setDyslexicFont(accessibilityNeed);
    setAccessibilityNeed(accessibilityNeed);
  }

  useEffect(() => {
    const fetchEnvelopeDetails = async () => {
      try {
        const { data, error } = await supabase
          .from("envelopes")
          .select("markdown, recipient_name")
          .eq("envelope_id", envelopeId)
          .single();

        if (error) {
          throw error;
        }

        setMarkdown(data.markdown);
        setName(data.recipient_name);
      } catch (err: any) {
        console.error("[ERROR] Failed to fetch envelope details:", err.message);
        setError("Failed to load document details");
      }
    };

    fetchEnvelopeDetails();
  }, [envelopeId]);

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  if (!markdown || !name) {
    return <p>Loading document...</p>;
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center">
        <h1 className="text-lg font-semibold">ClariSign</h1>
      </header>

      {/* Main Content */}
      <main className="flex flex-grow">


        {/* Right: Content */}
        <div
          className={`${
            isCollapsed ? "w-full" : "w-1/2"
          } h-full bg-gray-100 p-6 flex flex-col transition-all duration-300`}
        >
          {accessibilityNeed ? (
            <>
              {/* Tabs */}
              <div className="flex justify-between">
                <div className="flex gap-4 mb-4">
                  <button
                    className={`px-4 py-2 rounded ${
                      activeTab === "summary"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-800"
                    }`}
                    onClick={() => setActiveTab("summary")}
                  >
                    Summary
                  </button>
                  <button
                    className={`px-4 py-2 rounded ${
                      activeTab === "contract"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-800"
                    }`}
                    onClick={() => setActiveTab("contract")}
                  >
                    Contract
                  </button>
                  <button
                    className={`px-4 py-2 rounded ${
                      activeTab === "chat"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-800"
                    }`}
                    onClick={() => setActiveTab("chat")}
                  >
                    Chat
                  </button>
                  <div>
                    <AccessibilitySelect accessibilityNeed={accessibilityNeed}
                                         onSelect={(a) => handleAccessibilityNeedChange(a)}/>
                  </div>

                </div>

                <div className="">
                  <button
                    onClick={onToggle}
                    className="bg-blue-600 text-white p-2 rounded-full shadow hover:bg-blue-700 flex items-center justify-center"
                    aria-label={isCollapsed ? "Expand Document" : "Collapse Document"}
                  >
                  {isCollapsed ? <ChevronLeft/> : <ChevronRight/>}
                  </button>
              </div>
              </div>
              {activeTab === "summary" && (
                <SummaryComponent envelopeId={envelopeId} type={accessibilityNeed}/>
              )}
              {/* Tab Content */}
              {activeTab === "contract" && (
                <AccessibilityOptions
                  envelopeId={envelopeId}
                  markdown={markdown}
                  accessibilityNeed={accessibilityNeed}
                />
              )}
              {activeTab === "chat" && (
                <ChatComponent envelopeId={envelopeId} type={accessibilityNeed}/>
              )}
            </>
          ) : (

            <div className="flex flex-col h-full px-6 py-4">
                <>
                  {/* Greeting */}
                  <h1 className="text-2xl font-bold text-gray-800 mb-4">
                    Hi {name || "there"}!
                  </h1>

                  {/* Accessibility Introduction */}
                  <p className="text-lg text-gray-700 mb-6">
                    We want to ensure this document is accessible to everyone. Do you have any specific accessibility needs?
                  </p>
                </>


              {/* Accessibility Dropdown */}
              <div className="max-w-md mb-6">
                <label
                  htmlFor="accessibility"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Select your accessibility need (if any):
                </label>
                <AccessibilitySelect accessibilityNeed={accessibilityNeed} onSelect={(a) => handleAccessibilityNeedChange(a)} />

              </div>

            </div>
          )}
            </div>

        <div
          className={`${
            isCollapsed ? "w-0" : "w-1/2"
          } h-full transition-all duration-300`}
        >
          <DocumentIframe envelopeId={envelopeId} isCollapsed={isCollapsed} onToggle={onToggle}/>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 text-center py-4 text-sm text-gray-500">
        &copy; {new Date().getFullYear()} ClariSign. All rights reserved.
      </footer>
    </div>
  );
}
