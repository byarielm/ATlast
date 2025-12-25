import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { ExtensionImportRequest } from '@atlast/shared';
import { apiClient } from '../lib/api/client';

/**
 * Extension Import page
 * Receives data from browser extension and processes it
 */
export default function ExtensionImport() {
  const { importId } = useParams<{ importId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importData, setImportData] = useState<ExtensionImportRequest | null>(null);

  useEffect(() => {
    if (!importId) {
      setError('No import ID provided');
      setLoading(false);
      return;
    }

    fetchImportData(importId);
  }, [importId]);

  async function fetchImportData(id: string) {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/.netlify/functions/get-extension-import?importId=${id}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Import not found or expired. Please try scanning again.');
        }
        throw new Error('Failed to load import data');
      }

      const data: ExtensionImportRequest = await response.json();
      setImportData(data);

      // Automatically start the search process
      startSearch(data);
    } catch (err) {
      console.error('[ExtensionImport] Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  }

  async function startSearch(data: ExtensionImportRequest) {
    try {
      // Navigate to results page with the extension data
      // The results page will handle the search
      navigate('/results', {
        state: {
          usernames: data.usernames,
          platform: data.platform,
          source: 'extension'
        }
      });
    } catch (err) {
      console.error('[ExtensionImport] Search error:', err);
      setError('Failed to start search. Please try again.');
      setLoading(false);
    }
  }

  if (loading && !error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <div className="mb-8">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 dark:border-cyan-400"></div>
            </div>
            <h1 className="text-2xl font-bold text-purple-900 dark:text-cyan-50 mb-4">
              Loading your import...
            </h1>
            <p className="text-purple-700 dark:text-cyan-200">
              Processing data from the extension
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <div className="mb-8 text-6xl">⚠️</div>
            <h1 className="text-2xl font-bold text-purple-900 dark:text-cyan-50 mb-4">
              Import Error
            </h1>
            <p className="text-purple-700 dark:text-cyan-200 mb-8">
              {error}
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 dark:bg-cyan-600 dark:hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // This shouldn't be reached since we navigate away on success
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <div className="mb-8">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 dark:border-cyan-400"></div>
          </div>
          <h1 className="text-2xl font-bold text-purple-900 dark:text-cyan-50 mb-4">
            Starting search...
          </h1>
          {importData && (
            <p className="text-purple-700 dark:text-cyan-200">
              Searching for {importData.usernames.length} users from {importData.platform}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
