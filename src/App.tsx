import { useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";
import JSZip from "jszip";
import AppHeader from "./components/AppHeader";
import LoginPage from "./pages/Login";
import HomePage from "./pages/Home";
import LoadingPage from "./pages/Loading";
import ResultsPage from "./pages/Results";

interface atprotoSession {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  description?: string;
}

interface TikTokUser {
  username: string;
  date: string;
}

interface SearchResult {
  tiktokUser: TikTokUser;
  atprotoMatches: any[];
  isSearching: boolean;
  error?: string;
  selectedMatches?: Set<string>;
}

export default function App() {
  const [handle, setHandle] = useState("");
  const [session, setSession] = useState<atprotoSession | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearchingAll, setIsSearchingAll] = useState(false);
  const [currentStep, setCurrentStep] = useState<'checking' | 'login' | 'home' | 'upload' | 'loading' | 'results'>('checking');
  const [searchProgress, setSearchProgress] = useState({ searched: 0, found: 0, total: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set());

  // Check for existing session on mount
  useEffect(() => {
    checkExistingSession();
  }, []);

  // Check if user already has a valid session
  async function checkExistingSession() {
    try {
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get('session');
      const error = params.get('error');

      if (error) {
        setStatusMessage(`Login failed: ${error}`);
        setCurrentStep('login');
        window.history.replaceState({}, '', '/');
        return;
      }

      // If we have a session parameter in URL, this is an OAuth callback
      if (sessionId) {
        setStatusMessage('Loading your session...');
        await fetchProfile();
        setCurrentStep('home');
        window.history.replaceState({}, '', '/');
        return;
      }

      // Otherwise, check if there's an existing session cookie
      const res = await fetch('/.netlify/functions/session', {
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();
        setSession({
          did: data.did,
          handle: data.handle,
          displayName: data.displayName,
          avatar: data.avatar,
          description: data.description,
        });
        setCurrentStep('home');
        setStatusMessage(`Welcome back, ${data.handle}!`);
      } else {
        // No valid session, show login
        setCurrentStep('login');
      }
    } catch (error) {
      console.error('Session check error:', error);
      setCurrentStep('login');
    }
  }

  // Fetch user profile
  async function fetchProfile() {
    try {
      const res = await fetch('/.netlify/functions/get-profile', {
        credentials: 'include'
      });

      if (!res.ok) throw new Error('Failed to load profile');

      const data = await res.json();
      setSession({
        did: data.did,
        handle: data.handle,
        displayName: data.displayName,
        avatar: data.avatar,
        description: data.description,
      });
      setStatusMessage(`Successfully logged in as ${data.handle}`);
    } catch (err) {
      console.error('Profile fetch error:', err);
      setStatusMessage('Failed to load profile');
      throw err;
    }
  }

  // Logout function
  async function handleLogout() {
    try {
      setStatusMessage('Logging out...');
      const res = await fetch('/.netlify/functions/logout', {
        method: 'POST',
        credentials: 'include'
      });

      if (res.ok) {
        setSession(null);
        setSearchResults([]);
        setCurrentStep('login');
        setStatusMessage('Logged out successfully');
      } else {
        throw new Error('Logout failed');
      }
    } catch (error) {
      console.error('Logout error:', error);
      setStatusMessage('Error logging out');
      alert('Failed to logout. Please try again.');
    }
  }

  // Start OAuth login
  const loginWithOAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!handle) {
        const errorMsg = "Please enter your handle";
        setStatusMessage(errorMsg);
        alert(errorMsg);
        return;
      }

      setStatusMessage("Starting authentication...");
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

      const { url } = await res.json();
      setStatusMessage("Redirecting to authentication...");
      window.location.href = url;
    } catch (err) {
      console.error('OAuth error:', err);
      const errorMsg = `Error starting OAuth: ${err instanceof Error ? err.message : 'Unknown error'}`;
      setStatusMessage(errorMsg);
      alert(errorMsg);
    }
  };

  async function parseJsonFile(jsonText: string): Promise<TikTokUser[]> {
    const users: TikTokUser[] = [];
    const jsonData = JSON.parse(jsonText);

    const followingArray = jsonData?.["Your Activity"]?.["Following"]?.["Following"];

    if (!followingArray || !Array.isArray(followingArray)) {
      alert("Could not find following data in JSON. Expected path: Your Activity > Following > Following");
      return [];
    }

    for (const entry of followingArray) {
      users.push({
        username: entry.UserName,
        date: entry.Date || "",
      });
    }

    return users;
  }

  function parseTxtFile(text: string): TikTokUser[] {
    const users: TikTokUser[] = [];
    const entries = text.split("\n\n").map((b) => b.trim()).filter(Boolean);

    for (const entry of entries) {
      const userMatch = entry.match(/Username:\s*(.+)/);
      if (userMatch) {
        users.push({ username: userMatch[1].trim(), date: "" });
      }
    }

    return users;
  }

  // Save search results
  async function saveSearchResults(results: SearchResult[]) {
    try {
      const uploadId = crypto.randomUUID();
      
      const resultsToSave = results
        .filter(r => !r.isSearching)
        .map(r => ({
          tiktokUser: r.tiktokUser,
          atprotoMatches: r.atprotoMatches || []
        }));
      
      console.log('Saving results:', {
        uploadId,
        count: resultsToSave.length,
        withMatches: resultsToSave.filter(r => r.atprotoMatches.length > 0).length,
        sample: resultsToSave.slice(0, 2)
      });
      
      const saveResponse = await fetch('/.netlify/functions/save-results', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadId,
          sourcePlatform: 'tiktok',
          results: resultsToSave
        })
      });

      if (saveResponse.ok) {
        const saveData = await saveResponse.json();
        console.log('Results saved successfully:', saveData);
        return saveData;
      } else {
        const errorText = await saveResponse.text();
        console.error('Failed to save results:', errorText);
        return null;
      }
    } catch (error) {
      console.error('Error saving results:', error);
      return null;
    }
  }

  // Search all users
  async function searchAllUsers(resultsToSearch?: SearchResult[]) {
    const targetResults = resultsToSearch || searchResults;
    if (!session || targetResults.length === 0) return;
    
    setIsSearchingAll(true);
    setCurrentStep('loading');
    setSearchProgress({ searched: 0, found: 0, total: targetResults.length });
    setStatusMessage(`Starting search for ${targetResults.length} users...`);
    
    const batchSize = 25;
    let totalSearched = 0;
    let totalFound = 0;
    const MAX_MATCHES = 1000;

    for (let i = 0; i < targetResults.length; i += batchSize) {
      if (totalFound >= MAX_MATCHES) {
        console.log(`Reached limit of ${MAX_MATCHES} matches. Stopping search.`);
        setStatusMessage(`Search complete. Found ${totalFound} matches out of 1000 maximum.`);
        break;
      }

      const batch = targetResults.slice(i, i + batchSize);
      const usernames = batch.map(r => r.tiktokUser.username);
      
      setSearchResults(prev => prev.map((result, index) => 
        i <= index && index < i + batchSize 
          ? { ...result, isSearching: true }
          : result
      ));
      
      try {
        const res = await fetch('/.netlify/functions/batch-search-actors', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usernames })
        });

        if (!res.ok) {
          throw new Error(`Batch search failed: ${res.status}`);
        }

        const data = await res.json();
        
        data.results.forEach((result: any) => {
          totalSearched++;
          if (result.actors.length > 0) {
            totalFound++;
          }
        });

        setSearchProgress({ searched: totalSearched, found: totalFound, total: targetResults.length });
        setStatusMessage(`Searched ${totalSearched} of ${targetResults.length} users. Found ${totalFound} matches.`);

        setSearchResults(prev => prev.map((result, index) => {
          const batchResultIndex = index - i;
          if (batchResultIndex >= 0 && batchResultIndex < data.results.length) {
            const batchResult = data.results[batchResultIndex];
            const newSelectedMatches = new Set<string>();
            
            if (batchResult.actors.length > 0) {
              newSelectedMatches.add(batchResult.actors[0].did);
            }

            return {
              ...result,
              atprotoMatches: batchResult.actors,
              isSearching: false,
              error: batchResult.error,
              selectedMatches: newSelectedMatches,
            };
          }
          return result;
        }));

        if (totalFound >= MAX_MATCHES) {
          break;
        }
        
      } catch (error) {
        console.error('Batch search error:', error);
        setSearchResults(prev => prev.map((result, index) => 
          i <= index && index < i + batchSize 
            ? { ...result, isSearching: false, error: 'Search failed' }
            : result
        ));
      }
      
      if (i + batchSize < targetResults.length && totalFound < MAX_MATCHES) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    setIsSearchingAll(false);
    setCurrentStep('results');
    setStatusMessage(`Search complete! Found ${totalFound} matches out of ${totalSearched} users searched.`);

    setTimeout(() => {
      setSearchResults(currentResults => {
        saveSearchResults(currentResults);
        return currentResults;
      });
    }, 100);
  }

  // Parse TikTok Following data
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatusMessage(`Processing ${file.name}...`);
    let users: TikTokUser[] = [];

    try {
      if (file.name.endsWith(".json")) {
        users = await parseJsonFile(await file.text());
        console.log(`Loaded ${users.length} users from JSON file`);
        setStatusMessage(`Loaded ${users.length} users from JSON file`);
      } else if (file.name.endsWith(".txt")) {
        users = parseTxtFile(await file.text());
        console.log(`Loaded ${users.length} users from TXT file`);
        setStatusMessage(`Loaded ${users.length} users from TXT file`);
      } else if (file.name.endsWith(".zip")) {
        const zip = await JSZip.loadAsync(file);

        const followingFile =
          zip.file("TikTok/Profile and Settings/Following.txt") ||
          zip.file("Profile and Settings/Following.txt") ||
          zip.files[
            Object.keys(zip.files).find(
              (path) => path.endsWith("Following.txt") && path.includes("Profile")
            ) || ""
          ];

        if(followingFile) {
          const followingText = await followingFile.async("string");
          users = parseTxtFile(followingText);
          console.log(`Loaded ${users.length} users from .ZIP file`);
          setStatusMessage(`Loaded ${users.length} users from ZIP file`);
        } else {
          const jsonFileEntry = Object.values(zip.files).find(
            (f) => f.name.endsWith(".json") && !f.dir
          );

          if (!jsonFileEntry) {
            const errorMsg = "Could not find Following.txt or a JSON file in the ZIP archive.";
            setStatusMessage(errorMsg);
            alert(errorMsg);
            return;
          }

          const jsonText = await jsonFileEntry.async("string");
          users = await parseJsonFile(jsonText);
          console.log(`Loaded ${users.length} users from .ZIP file`);
          setStatusMessage(`Loaded ${users.length} users from ZIP file`);
        }
      } else {
        const errorMsg = "Please upload a .txt, .json, or .zip file";
        setStatusMessage(errorMsg);
        alert(errorMsg);
        return;
      }
    } catch (error) {
      console.error("Error processing file:", error);
      const errorMsg = "There was a problem processing the file. Please check that it's a valid TikTok data export.";
      setStatusMessage(errorMsg);
      alert(errorMsg);
      return;
    }
    
    if (users.length === 0) {
      const errorMsg = "No users found in the file.";
      setStatusMessage(errorMsg);
      alert(errorMsg);
      return;
    }

    const initialResults: SearchResult[] = users.map(user => ({
      tiktokUser: user,
      atprotoMatches: [],
      isSearching: false,
      selectedMatches: new Set<string>(),
    }));

    setSearchResults(initialResults);
    setStatusMessage(`Starting search for ${users.length} users...`);
    await searchAllUsers(initialResults);

    setCurrentStep('results');
  }

  // Toggle selection for a specific match
  function toggleMatchSelection(resultIndex: number, did: string) {
    setSearchResults(prev => prev.map((result, index) => {
      if (index === resultIndex) {
        const newSelectedMatches = new Set(result.selectedMatches);
        if (newSelectedMatches.has(did)) {
          newSelectedMatches.delete(did);
        } else {
          newSelectedMatches.add(did);
        }
        return { ...result, selectedMatches: newSelectedMatches };
      }
      return result;
    }));
  }

  function toggleExpandResult(index: number) {
    setExpandedResults(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  // Select all matches - only first match per TT user
  function selectAllMatches() {
    setSearchResults(prev => prev.map(result => {
      const newSelectedMatches = new Set<string>();
      if (result.atprotoMatches.length > 0) {
        newSelectedMatches.add(result.atprotoMatches[0].did);
      }
      return {
        ...result,
        selectedMatches: newSelectedMatches
      };
    }));

    const totalToSelect = searchResults.filter(r => r.atprotoMatches.length > 0).length;
    setStatusMessage(`Selected ${totalToSelect} top matches`);
  }

  // Deselect all matches
  function deselectAllMatches() {
    setSearchResults(prev => prev.map(result => ({
      ...result,
      selectedMatches: new Set<string>()
    })));
    setStatusMessage('Cleared all selections');
  }

  // Follow all selected users
  async function followSelectedUsers() {
    if (!session || isFollowing) return;

    const selectedUsers = searchResults.flatMap((result, resultIndex) => 
      result.atprotoMatches
        .filter(match => result.selectedMatches?.has(match.did))
        .map(match => ({ ...match, resultIndex }))
    );

    if (selectedUsers.length === 0) {
      const msg = "No users selected to follow";
      setStatusMessage(msg);
      alert(msg);
      return;
    }

    setIsFollowing(true);
    setStatusMessage(`Following ${selectedUsers.length} users...`);
    let totalFollowed = 0;
    let totalFailed = 0;

    try {
      const batchSize = 50;
      
      for (let i = 0; i < selectedUsers.length; i += batchSize) {
        const batch = selectedUsers.slice(i, i + batchSize);
        const dids = batch.map(user => user.did);
        
        try {
          const res = await fetch('/.netlify/functions/batch-follow-users', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dids }),
          });
          
          if (res.ok) {
            const data = await res.json();
            totalFollowed += data.succeeded;
            totalFailed += data.failed;
            
            data.results.forEach((result: any) => {
              if (result.success) {
                const user = batch.find(u => u.did === result.did);
                if (user) {
                  setSearchResults(prev => prev.map((searchResult, index) => 
                    index === user.resultIndex 
                      ? { 
                          ...searchResult, 
                          atprotoMatches: searchResult.atprotoMatches.map(match => 
                            match.did === result.did ? { ...match, followed: true } : match
                          )
                        }
                      : searchResult
                  ));
                }
              }
            });
            
            setStatusMessage(`Followed ${totalFollowed} of ${selectedUsers.length} users`);
          } else {
            totalFailed += batch.length;
            console.error('Batch follow failed:', await res.text());
          }
        } catch (error) {
          totalFailed += batch.length;
          console.error('Batch follow error:', error);
        }
        
        if (i + batchSize < selectedUsers.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      const finalMsg = `Successfully followed ${totalFollowed} users${totalFailed > 0 ? `. ${totalFailed} failed.` : ''}`;
      setStatusMessage(finalMsg);
    } catch (error) {
      console.error("Batch follow error:", error);
      setStatusMessage("Error occurred while following users");
    } finally {
      setIsFollowing(false);
    }
  }

  const totalSelected = searchResults.reduce((total, result) => 
    total + (result.selectedMatches?.size || 0), 0
  );
  const totalFound = searchResults.filter(r => r.atprotoMatches.length > 0).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <div 
        role="status" 
        aria-live="polite" 
        aria-atomic="true"
        className="sr-only"
      >
        {statusMessage}
      </div>

      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg"
      >
        Skip to main content
      </a>

      <main id="main-content">
        {/* Checking Session */}
        {currentStep === 'checking' && (
          <div className="p-6 max-w-md mx-auto mt-8">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center">
                <ArrowRight className="w-8 h-8 text-white animate-pulse" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Loading...</h2>
              <p className="text-gray-600 dark:text-gray-300">Checking your session</p>
            </div>
          </div>
        )}

        {/* Login Page */}
        {currentStep === 'login' && (
          <LoginPage 
            handle={handle}
            setHandle={setHandle}
            onSubmit={loginWithOAuth}
          />
        )}

        {/* Home/Dashboard Page */}
        {currentStep === 'home' && (
          <HomePage
            session={session}
            onLogout={handleLogout}
            onNavigate={setCurrentStep}
            onFileUpload={handleFileUpload}
            currentStep={currentStep}
          />
        )}

        {/* Loading Page */}
        {currentStep === 'loading' && (
          <LoadingPage
            session={session}
            onLogout={handleLogout}
            onNavigate={setCurrentStep}
            searchProgress={searchProgress}
            currentStep={currentStep}
          />
        )}

        {/* Results Page */}
        {currentStep === 'results' && (
          <ResultsPage
            session={session}
            onLogout={handleLogout}
            onNavigate={setCurrentStep}
            searchResults={searchResults}
            expandedResults={expandedResults}
            onToggleExpand={toggleExpandResult}
            onToggleMatchSelection={toggleMatchSelection}
            onSelectAll={selectAllMatches}
            onDeselectAll={deselectAllMatches}
            onFollowSelected={followSelectedUsers}
            totalSelected={totalSelected}
            totalFound={totalFound}
            isFollowing={isFollowing}
            currentStep={currentStep}
          />
        )}
      </main>
    </div>
  );
}