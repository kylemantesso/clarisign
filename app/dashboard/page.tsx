"use client";

import { useEffect, useState } from "react";
import CreateEnvelopeModal from "@/app/components/CreateEnvelopeModal";

interface Envelope {
  envelopeId: string;
  status: string;
  emailSubject: string;
  sentDateTime: string;
}

export default function Dashboard() {
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [deletingEnvelopeId, setDeletingEnvelopeId] = useState<string | null>(null);
  const [linkCopiedModal, setLinkCopiedModal] = useState(false);

  const toggleModal = () => setShowModal((prev) => !prev);

  useEffect(() => {
    const fetchEnvelopes = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/envelopes", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch envelopes");
        }

        const data = await response.json();
        setEnvelopes(data.envelopes || []);
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchEnvelopes();
  }, []);

  const handleGetLink = async (envelopeId: string) => {
    try {
      const appUrl = `${window.location.origin}/sign/${envelopeId}`;
      await navigator.clipboard.writeText(appUrl);
      setLinkCopiedModal(true);
    } catch (err: any) {
      alert(err.message || "Failed to generate link");
    }
  };

  const handleDeleteEnvelope = async (envelopeId: string) => {
    try {
      const response = await fetch(`/api/envelopes/${envelopeId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete envelope');
      }

      // Remove the envelope from the local state
      setEnvelopes((prevEnvelopes) =>
        prevEnvelopes.filter((env) => env.envelopeId !== envelopeId)
      );
    } catch (err: any) {
      alert(err.message || 'Failed to delete envelope');
    } finally {
      setDeletingEnvelopeId(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Toolbar */}
      <header className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">ClariSign Dashboard</h1>
        <button
          onClick={toggleModal}
          className="bg-white text-blue-600 px-4 py-2 rounded shadow hover:bg-gray-100"
        >
          Create Envelope
        </button>
      </header>

      <main className="flex-grow bg-gray-50 p-6">
        <h2 className="text-lg font-semibold mb-4">My Envelopes</h2>

        {loading && <p>Loading envelopes...</p>}
        {error && <p className="text-red-500">{error}</p>}

        <ul className="space-y-4">
          {envelopes.map((envelope) => (
            <li
              key={envelope.envelopeId}
              className="p-4 bg-white shadow rounded-md flex justify-between items-center"
            >
              <div>
                <p className="font-semibold">{envelope.emailSubject}</p>
                <p>Status: {envelope.status}</p>
                <p>Sent: {new Date(envelope.sentDateTime).toLocaleString()}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleGetLink(envelope.envelopeId)}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Get Link
                </button>
              </div>
            </li>
          ))}
        </ul>

        {!loading && envelopes.length === 0 && (
          <p>No envelopes found for this user.</p>
        )}
      </main>

      <footer className="bg-gray-100 text-center py-4 text-sm text-gray-500">
        &copy; {new Date().getFullYear()} ClariSign. All rights reserved.
      </footer>

      {/* Create Envelope Modal */}
      {showModal && <CreateEnvelopeModal onClose={toggleModal} />}

      {/* Link Copied Modal */}
      {linkCopiedModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg text-center">
            <h3 className="text-lg font-semibold mb-4">Link Copied!</h3>
            <p className="text-gray-600">The link has been successfully copied to your clipboard.</p>
            <button
              onClick={() => setLinkCopiedModal(false)}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
