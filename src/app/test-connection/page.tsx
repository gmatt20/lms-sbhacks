'use client';

import { useState } from 'react';

export default function TestConnectionPage() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const testConnection = async () => {
    setLoading(true);
    setError('');
    setStatus(null);

    try {
      const response = await fetch('/api/health');
      const data = await response.json();

      if (response.ok) {
        setStatus(data);
      } else {
        setError(JSON.stringify(data, null, 2));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">API Connection Test</h1>

      <button
        onClick={testConnection}
        disabled={loading}
        className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test Connection'}
      </button>

      {status && (
        <div className="mt-6 p-4 bg-green-100 border border-green-400 rounded">
          <h2 className="font-bold text-green-800 mb-2">✓ Connection Successful</h2>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(status, null, 2)}
          </pre>
        </div>
      )}

      {error && (
        <div className="mt-6 p-4 bg-red-100 border border-red-400 rounded">
          <h2 className="font-bold text-red-800 mb-2">✗ Connection Failed</h2>
          <pre className="text-sm overflow-auto text-red-700">
            {error}
          </pre>
        </div>
      )}

      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h3 className="font-semibold mb-2">What this tests:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Next.js server is running</li>
          <li>Flask API is running on port 5000</li>
          <li>CORS is properly configured</li>
          <li>Environment variables are set correctly</li>
          <li>Network connectivity between services</li>
        </ul>
      </div>
    </div>
  );
}
