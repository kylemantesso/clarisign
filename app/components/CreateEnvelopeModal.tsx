"use client";

import { useState } from "react";

interface CreateEnvelopeModalProps {
  onClose: () => void;
}

export default function CreateEnvelopeModal({ onClose }: CreateEnvelopeModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] || null;
    setFile(selectedFile);
  };

  const handleSubmit = async () => {
    if (!file || !recipientEmail || !recipientName) {
      setError("Please provide all required fields.");
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("recipientEmail", recipientEmail);
    formData.append("recipientName", recipientName);

    try {
      const response = await fetch("/api/envelopes/create", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to create envelope");
      }

      const data = await response.json();
      alert(`Envelope created successfully with ID: ${data.envelopeId}`);
      console.log("Markdown result:", data.markdown);
      onClose();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-lg font-semibold mb-4">Create New Envelope</h2>
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="mb-4 block w-full"
        />
        <input
          type="text"
          placeholder="Recipient Name"
          value={recipientName}
          onChange={(e) => setRecipientName(e.target.value)}
          className="mb-4 block w-full border rounded px-2 py-1"
        />
        <input
          type="email"
          placeholder="Recipient Email"
          value={recipientEmail}
          onChange={(e) => setRecipientEmail(e.target.value)}
          className="mb-4 block w-full border rounded px-2 py-1"
        />
        <button
          onClick={handleSubmit}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full"
          disabled={loading}
        >
          {loading ? "Creating..." : "Create Envelope"}
        </button>

        {error && <p className="text-red-500 mt-4">{error}</p>}

        <button
          onClick={onClose}
          className="mt-4 bg-gray-200 text-gray-600 px-4 py-2 rounded hover:bg-gray-300 w-full"
        >
          Close
        </button>
      </div>
    </div>
  );
}
