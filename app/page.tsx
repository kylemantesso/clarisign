"use client";

export default function Home() {
  const handleLogin = () => {
    window.location.href = "/api/auth/login";
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-center gap-8 px-4">
      {/* Title and Subtitle */}
      <div>
        <h1 className="text-4xl font-bold text-blue-600">ClariSign</h1>
        <p className="text-lg text-gray-700 mt-2">
          Making agreements clear, accessible and inclusive with DocuSign
        </p>
      </div>

      {/* Login Button */}
      <button
        onClick={handleLogin}
        className="bg-blue-600 text-white font-semibold rounded-full px-6 py-3 text-lg hover:bg-blue-700 transition-colors"
      >
        Login with DocuSign
      </button>

      {/* Footer */}
      <footer className="absolute bottom-4 text-sm text-gray-600 italic">
        Making the impossible possible!
      </footer>
    </div>
  );
}
