import { useState } from 'react';
// import { runTallyTests, testAPIKey, testDataNormalization } from '@/lib/__tests__/manual-test';

export function TallyTestComponent() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunTests = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      // const result = await runTallyTests();
      // setResults(result);
      setError('Tests are currently disabled - missing test file');
    } catch (err: any) {
      setError(err.message || 'Test failed');
    } finally {
      setLoading(false);
    }
  };

  const handleTestAPIKey = async () => {
    setLoading(true);
    setError(null);
    try {
      // const isValid = await testAPIKey();
      // setResults({ apiKeyValid: isValid });
      setError('Tests are currently disabled - missing test file');
    } catch (err: any) {
      setError(err.message || 'API Key test failed');
    } finally {
      setLoading(false);
    }
  };

  const handleTestNormalization = () => {
    setLoading(true);
    setError(null);
    try {
      // testDataNormalization();
      // setResults({ normalizationTested: true });
      setError('Tests are currently disabled - missing test file');
    } catch (err: any) {
      setError(err.message || 'Normalization test failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
      <h2 className="text-2xl font-bold mb-4">Tally Integration - Phase 1 Tests</h2>
      
      <div className="space-y-4">
        <button
          onClick={handleTestAPIKey}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {loading ? 'Testing...' : 'Test API Key'}
        </button>

        <button
          onClick={handleTestNormalization}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400 ml-2"
        >
          {loading ? 'Testing...' : 'Test Data Normalization'}
        </button>

        <button
          onClick={handleRunTests}
          disabled={loading}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-400 ml-2"
        >
          {loading ? 'Running Tests...' : 'Run Full Tests'}
        </button>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <p className="font-bold">Error:</p>
          <p>{error}</p>
        </div>
      )}

      {results && (
        <div className="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          <p className="font-bold">Results:</p>
          <pre className="mt-2 bg-white p-2 rounded text-xs overflow-auto max-h-96 text-gray-800">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
