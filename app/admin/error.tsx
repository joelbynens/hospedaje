"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-sm p-8 max-w-lg w-full">
        <h2 className="text-xl font-bold text-red-700 mb-2">Something went wrong</h2>
        <p className="text-gray-600 text-sm mb-4">
          The admin panel encountered an error. This is usually caused by a database
          connection issue — make sure the Supabase migration has been run and all
          environment variables are set in Vercel.
        </p>
        {error.message && (
          <pre className="bg-gray-50 border rounded p-3 text-xs text-gray-500 overflow-auto mb-5">
            {error.message}
          </pre>
        )}
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
          >
            Try again
          </button>
          <Link
            href="/admin/login"
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
          >
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
