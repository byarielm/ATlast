import type { AtprotoSession, BatchSearchResult, BatchFollowResult, SaveResultsResponse, SearchResult } from '../types';

export const apiClient = {
  // OAuth and Authentication
  async startOAuth(handle: string): Promise<{ url: string }> {
    const currentOrigin = window.location.origin;
    
    const res = await fetch('/.netlify/functions/oauth-start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        login_hint: handle,
        origin: currentOrigin
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Failed to start OAuth flow');
    }

    return res.json();
  },

  async getSession(): Promise<{ did: string; handle: string; displayName?: string; avatar?: string; description?: string }> {
    const res = await fetch('/.netlify/functions/session', {
      credentials: 'include'
    });

    if (!res.ok) {
      throw new Error('No valid session');
    }

    return res.json();
  },

  async getProfile(): Promise<AtprotoSession> {
    const res = await fetch('/.netlify/functions/get-profile', {
      credentials: 'include'
    });

    if (!res.ok) {
      throw new Error('Failed to load profile');
    }

    return res.json();
  },

  async logout(): Promise<void> {
    const res = await fetch('/.netlify/functions/logout', {
      method: 'POST',
      credentials: 'include'
    });

    if (!res.ok) {
      throw new Error('Logout failed');
    }
  },

  // Search Operations
  async batchSearchActors(usernames: string[]): Promise<{ results: BatchSearchResult[] }> {
    const res = await fetch('/.netlify/functions/batch-search-actors', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernames })
    });

    if (!res.ok) {
      throw new Error(`Batch search failed: ${res.status}`);
    }

    return res.json();
  },

  // Follow Operations
  async batchFollowUsers(dids: string[]): Promise<{ 
    success: boolean;
    total: number;
    succeeded: number;
    failed: number;
    results: BatchFollowResult[];
  }> {
    const res = await fetch('/.netlify/functions/batch-follow-users', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dids }),
    });

    if (!res.ok) {
      throw new Error('Batch follow failed');
    }

    return res.json();
  },

  // Save Results
  async saveResults(
    uploadId: string, 
    sourcePlatform: string, 
    results: SearchResult[]
  ): Promise<SaveResultsResponse | null> {
    try {
      const resultsToSave = results
        .filter(r => !r.isSearching)
        .map(r => ({
          tiktokUser: r.tiktokUser,
          atprotoMatches: r.atprotoMatches || []
        }));
      
      const res = await fetch('/.netlify/functions/save-results', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadId,
          sourcePlatform,
          results: resultsToSave
        })
      });

      if (res.ok) {
        return res.json();
      } else {
        console.error('Failed to save results:', await res.text());
        return null;
      }
    } catch (error) {
      console.error('Error saving results:', error);
      return null;
    }
  }
};