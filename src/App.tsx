import { useState, useEffect, useRef } from "react";
import { Upload, Check, Search, ArrowRight, ChevronRight, LogOut, Home, Heart, Clock, Trash2, UserPlus, ChevronDown, Twitter, Instagram, Video, Hash, Gamepad2, MessageCircle, Music, Menu, User } from "lucide-react";
import JSZip from "jszip";

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
  selectedMatches?: Set<string>; // Track selected match DIDs
}

const PLATFORMS = {
  twitter: {
    name: 'Twitter/X',
    icon: Twitter,
    color: 'from-blue-400 to-blue-600',
    accentBg: 'bg-blue-500',
    fileHint: 'following.js or account data ZIP',
  },
  instagram: {
    name: 'Instagram',
    icon: Instagram,
    color: 'from-pink-500 via-purple-500 to-orange-500',
    accentBg: 'bg-pink-500',
    fileHint: 'connections.json or data ZIP',
  },
  tiktok: {
    name: 'TikTok',
    icon: Video,
    color: 'from-black via-gray-800 to-cyan-400',
    accentBg: 'bg-black',
    fileHint: 'Following.txt or data ZIP',
  },
  tumblr: {
    name: 'Tumblr',
    icon: Hash,
    color: 'from-indigo-600 to-blue-800',
    accentBg: 'bg-indigo-600',
    fileHint: 'following.csv or data export',
  },
  twitch: {
    name: 'Twitch',
    icon: Gamepad2,
    color: 'from-purple-600 to-purple-800',
    accentBg: 'bg-purple-600',
    fileHint: 'following.json or data export',
  },
  youtube: {
    name: 'YouTube',
    icon: Video,
    color: 'from-red-600 to-red-700',
    accentBg: 'bg-red-600',
    fileHint: 'subscriptions.csv or Takeout ZIP',
  },
};

function AppHeader({ session, onLogout, onNavigate, currentStep }: { session: atprotoSession | null; onLogout: () => void; onNavigate: (step: 'home' | 'login') => void; currentStep: string }) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <button onClick={() => onNavigate(session ? 'home' : 'login')} className="flex items-center space-x-3 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg px-2 py-1">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">ATlast</h1>
          </button>

          {session && (
            <div className="relative" ref={menuRef}>
              <button onClick={() => setShowMenu(!showMenu)} className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500">
                {session.avatar ? (
                  <img src={session.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">{session.handle.charAt(0).toUpperCase()}</span>
                  </div>
                )}
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 hidden sm:inline">@{session.handle}</span>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showMenu ? 'rotate-180' : ''}`} />
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{session.displayName || session.handle}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">@{session.handle}</div>
                  </div>
                  <button onClick={() => { setShowMenu(false); onNavigate('home'); }} className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left">
                    <Home className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-900 dark:text-gray-100">Dashboard</span>
                  </button>
                  <button onClick={() => { setShowMenu(false); onNavigate('login'); }} className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left">
                    <Heart className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-900 dark:text-gray-100">About</span>
                  </button>
                  <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
                  <button onClick={() => { setShowMenu(false); onLogout(); }} className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left text-red-600 dark:text-red-400">
                    <LogOut className="w-4 h-4" />
                    <span>Log out</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
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
        await fetchProfile();
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
          origin: currentOrigin // Tell backend what URL we're actually on
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to start OAuth flow');
      }

      const { url } = await res.json();
      setStatusMessage("Redirecting to authentication...");
      window.location.href = url; // redirect to authorization server
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

  // Save search results external to search/results
  async function saveSearchResults(results: SearchResult[]) {
  try {
    const uploadId = crypto.randomUUID();
    
    const resultsToSave = results
      .filter(r => !r.isSearching) // Only include completed searches
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
    
    // Process in batches of 25 usernames per API call
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
      
      // Mark current batch as searching
      setSearchResults(prev => prev.map((result, index) => 
        i <= index && index < i + batchSize 
          ? { ...result, isSearching: true }
          : result
      ));
      
      try {
        // Single API call for entire batch
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
        
        // Process batch results
        data.results.forEach((result: any) => {
          totalSearched++;
          if (result.actors.length > 0) {
            totalFound++;
          }
        });

        setSearchProgress({ searched: totalSearched, found: totalFound, total: targetResults.length });
        setStatusMessage(`Searched ${totalSearched} of ${targetResults.length} users. Found ${totalFound} matches.`);

        // Update results
        setSearchResults(prev => prev.map((result, index) => {
          const batchResultIndex = index - i;
          if (batchResultIndex >= 0 && batchResultIndex < data.results.length) {
            const batchResult = data.results[batchResultIndex];
            const newSelectedMatches = new Set<string>();
            
            // Auto-select only the first (highest scoring) match
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
        // Mark batch as failed
        setSearchResults(prev => prev.map((result, index) => 
          i <= index && index < i + batchSize 
            ? { ...result, isSearching: false, error: 'Search failed' }
            : result
        ));
      }
      
      // Small delay between batches
      if (i + batchSize < targetResults.length && totalFound < MAX_MATCHES) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    setIsSearchingAll(false);
    setCurrentStep('results');
    setStatusMessage(`Search complete! Found ${totalFound} matches out of ${totalSearched} users searched.`);

    // Save after a short delay to ensure state has updated
    setTimeout(() => {
      setSearchResults(currentResults => {
        saveSearchResults(currentResults);
        return currentResults;
      });
    }, 100);
  }

  // Parse TikTok Following data from .txt, .json, or .zip file
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatusMessage(`Processing ${file.name}...`);
    let users: TikTokUser[] = [];

    try {
      // Direct JSON upload
      if (file.name.endsWith(".json")) {
        users = await parseJsonFile(await file.text());
        console.log(`Loaded ${users.length} users from JSON file`);
        setStatusMessage(`Loaded ${users.length} users from JSON file`);
      } else if (file.name.endsWith(".txt")) {
      // Direct TXT upload
        users = parseTxtFile(await file.text());
        console.log(`Loaded ${users.length} users from TXT file`);
        setStatusMessage(`Loaded ${users.length} users from TXT file`);
      } else if (file.name.endsWith(".zip")) {
      // ZIP upload - find Following.txt OR JSON
        const zip = await JSZip.loadAsync(file);

        // Looking for Following.txt
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
          // If no TXT, look for JSON at the top level
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

    // Initialize search results
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

  // Select all matches across all results - only first match per TT user
  function selectAllMatches() {
    setSearchResults(prev => prev.map(result => {
      const newSelectedMatches = new Set<string>();
      // Only select the first (highest scoring) match for each TikTok user
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

  // Deselect all matches across all results
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
      // Process in batches of 50 follows per API call
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
            
            // Mark successful follows in UI
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
        
        // Small delay between batches
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

        {/* Home / Login Step */}
        {currentStep === 'login' && (
          <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-850 dark:to-gray-800">
            <div className="max-w-6xl mx-auto px-4 py-12">
              {/* Welcome Section */}
              <div className="text-center mb-16">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl mb-6 shadow-xl">
                  <Heart className="w-12 h-12 text-white" />
                </div>
                <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  Welcome to ATlast
                </h1>
                <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
                  Reunite with your community on the ATmosphere
                  </p>
              </div>
            {/* Value Props */}
              <div className="grid md:grid-cols-3 gap-6 mb-16 max-w-5xl mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-4">
                    <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                    Upload Your Data
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Import your following lists from Twitter, TikTok, Instagram, and more. Your data stays private.
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mb-4">
                    <Search className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                    Find Matches
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    We'll search the ATmosphere to find which of your follows have already migrated.
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                  <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 rounded-xl flex items-center justify-center mb-4">
                    <Heart className="w-6 h-6 text-pink-600 dark:text-pink-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                    Reconnect Instantly
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Follow everyone at once or pick and choose. Build your community on the ATmosphere.
                  </p>
                </div>
              </div>

              {/* Login Card */}
              <div className="max-w-md mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 border border-gray-100 dark:border-gray-700">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 text-center">
                    Get Started
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                    Connect your ATmosphere account to begin finding your people
                  </p>

                  <form onSubmit={loginWithOAuth} className="space-y-4">
                    <div>
                      <label htmlFor="atproto-handle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Your ATmosphere Handle
                      </label>
                      <input
                        id="atproto-handle"
                        type="text"
                        value={handle}
                        onChange={(e) => setHandle(e.target.value)}
                        placeholder="yourname.bsky.social"
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        aria-required="true"
                        aria-describedby="handle-description"
                      />
                      <p id="handle-description" className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Enter your full ATmosphere handle (e.g., username.bsky.social)
                      </p>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl focus:ring-4 focus:ring-purple-300 dark:focus:ring-purple-800 focus:outline-none"
                      aria-label="Connect to the ATmosphere"
                    >
                      Connect to the ATmosphere
                    </button>
                  </form>

                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-start space-x-2 text-sm text-gray-600 dark:text-gray-400">
                      <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="font-medium text-gray-700 dark:text-gray-300">Secure OAuth Connection</p>
                        <p className="text-xs mt-1">We use official AT Protocol OAuth. We never see your password and you can revoke access anytime.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Privacy Notice */}
                <div className="mt-8 text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                    Your data is processed locally and never stored on our servers. We only help you find matches and reconnect with your community.
                  </p>
                </div>
              </div>

              {/* How It Works */}
              <div className="mt-16 max-w-4xl mx-auto">
                <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100 mb-8">
                  How It Works
                </h2>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg" aria-hidden="true">
                      1
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Connect</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Sign in with your ATmosphere account</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-purple-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg" aria-hidden="true">
                      2
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Upload</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Import your following data from other platforms</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-pink-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg" aria-hidden="true">
                      3
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Match</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">We find your people on the ATmosphere</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-orange-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg" aria-hidden="true">
                      4
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Follow</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Reconnect with your community</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Home/Dashboard Step */}
        {currentStep === 'home' && (
          <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
            {/* Header */}
            <AppHeader session={session} onLogout={handleLogout} onNavigate={setCurrentStep} currentStep={currentStep} />

            <div className="max-w-4xl mx-auto px-4 py-8">
              {/* Upload New Data Section */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    Upload Following Data
                  </h2>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Upload your exported data from any platform to find matches on the ATmosphere
                </p>
        
                {/* Platform Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  {Object.entries(PLATFORMS).map(([key, p]) => {
                    const PlatformIcon = p.icon;
                    const isEnabled = key === 'tiktok';
                    return (
                      <div
                        key={key}
                        className={`relative p-4 rounded-xl border-2 transition-all ${
                          isEnabled
                            ? 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg cursor-pointer'
                            : 'border-gray-200 dark:border-gray-800 opacity-50 cursor-not-allowed'
                        }`}
                        title={isEnabled ? `Upload ${p.name} data` : 'Coming soon'}
                      >
                        <PlatformIcon className={`w-8 h-8 mx-auto mb-2 ${isEnabled ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-700'}`} />
                        <div className="text-sm font-medium text-center text-gray-900 dark:text-gray-100">
                          {p.name}
                        </div>
                        {!isEnabled && (
                          <div className="absolute top-2 right-2">
                            <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">
                              Soon
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
        
                {/* Upload Area */}
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center hover:border-blue-400 dark:hover:border-blue-500 focus-within:border-blue-400 dark:focus-within:border-blue-500 transition-colors">
                  <Upload className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" aria-hidden="true" />
                  <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-1">Choose File</p>
                  <p className="text-sm text-gray-500 dark:text-gray-300 mb-3">TikTok Following.txt, JSON, or ZIP export</p>

                  <input
                    id="file-upload"
                    type="file"
                    accept=".txt,.json,.zip"
                    onChange={handleFileUpload}
                    className="sr-only"
                    aria-label="Upload TikTok following data file"
                  />

                  <label
                    htmlFor="file-upload"
                    className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors cursor-pointer focus-within:ring-2 focus-within:ring-blue-400 focus-within:ring-offset-2"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        document.getElementById('file-upload')?.click();
                      }
                    }}
                  >
                    Browse Files
                  </label>
                </div>

                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <p className="text-sm text-blue-900 dark:text-blue-300">
                    💡 <strong>How to get your TikTok data:</strong> Open TikTok → Profile → Settings → Account → Download your data → Request data → Wait for notification → Download → Upload Following.txt here
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading Step */}
        {currentStep === 'loading' && (
          <div>
          <AppHeader session={session} onLogout={handleLogout} onNavigate={setCurrentStep} currentStep={currentStep} />
            <div className="max-w-3xl mx-auto px-4 py-8">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                    <Search className="w-8 h-8 text-white animate-pulse" aria-hidden="true" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Finding Your People</h2>
                  <p className="text-gray-600 dark:text-gray-300">Searching the ATmosphere for your follows...</p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-3xl font-bold text-gray-900 dark:text-gray-100" aria-label={`${searchProgress.searched} searched`}>{searchProgress.searched}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">Searched</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-blue-600 dark:text-blue-400" aria-label={`${searchProgress.found} found`}>{searchProgress.found}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">Found</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-gray-400 dark:text-gray-500" aria-label={`${searchProgress.total} total`}>{searchProgress.total}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">Total</div>
                    </div>
                  </div>

                  <div className="w-full bg-gray-200 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3" role="progressbar" aria-valuenow={searchProgress.total > 0 ? Math.round((searchProgress.searched / searchProgress.total) * 100) : 0} aria-valuemin={0} aria-valuemax={100}>
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-600 h-full rounded-full transition-all"
                      style={{ width: `${searchProgress.total > 0 ? (searchProgress.searched / searchProgress.total) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="animate-pulse flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4" />
                          <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {currentStep === 'results' && (
          <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 pb-24">
            <AppHeader session={session} onLogout={handleLogout} onNavigate={setCurrentStep} currentStep={currentStep} />
            {/* Platform Info Banner */}
            <div className="bg-gradient-to-r from-black via-gray-800 to-cyan-400 text-white">
              <div className="max-w-3xl mx-auto px-4 py-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Video className="w-12 h-12" />
                    <div>
                      <h2 className="text-xl font-bold">TikTok Matches</h2>
                      <p className="text-white/90 text-sm">
                        {totalFound} matches from {searchResults.length} follows
                      </p>
                    </div>
                  </div>
                  {totalSelected > 0 && (
                    <div className="text-right">
                      <div className="text-2xl font-bold">{totalSelected}</div>
                      <div className="text-xs text-white/80">selected</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700  sticky top-0 z-10">
              <div className="max-w-3xl mx-auto px-4 py-3 flex space-x-2">
                <button
                  onClick={selectAllMatches}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  type="button"
                >
                  Select All
                </button>
                <button
                  onClick={deselectAllMatches}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-3 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  type="button"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Feed Results */}
            <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
              {searchResults.map((item, idx) => {
                const isExpanded = expandedResults.has(idx);
                const displayMatches = isExpanded ? item.atprotoMatches : item.atprotoMatches.slice(0, 1);
                const hasMoreMatches = item.atprotoMatches.length > 1;

                return (
                  <div
                    key={idx}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden"
                  >
                    {/* Source User (minimal info - just username from TikTok) */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-black via-gray-800 to-cyan-400 flex items-center justify-center text-white font-bold">
                          {item.tiktokUser.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-gray-900 dark:text-gray-100">
                            @{item.tiktokUser.username}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            from TikTok
                          </div>
                        </div>
                        <div className="text-xs px-2 py-1 rounded-full bg-black dark:bg-cyan-400 text-white dark:text-black">
                          {item.atprotoMatches.length} {item.atprotoMatches.length === 1 ? 'match' : 'matches'}
                        </div>
                      </div>
                    </div>

                    {/* Bluesky Matches (rich info from API) */}
                    <div className="p-4">
                      {item.atprotoMatches.length === 0 ? (
                        <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                          <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Not found on Bluesky yet</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {displayMatches.map((match) => {
                            const isFollowed = match.followed;
                            const isSelected = item.selectedMatches?.has(match.did);
                            return (
                              <div
                                key={match.did}
                                className="flex items-start space-x-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all"
                              >
                                {/* Avatar */}
                                {match.avatar ? (
                                  <img 
                                    src={match.avatar} 
                                    alt="User avatar, description not provided"
                                    className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                                    <span className="text-white font-bold">
                                      {match.handle.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                )}

                                {/* Match Info */}
                                <div className="flex-1 min-w-0">
                                  {match.displayName && (
                                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                                      {match.displayName}
                                    </div>
                                  )}
                                  <div className="text-sm text-gray-600 dark:text-gray-400">
                                    @{match.handle}
                                  </div>
                                  {match.description && (
                                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{match.description}</div>
                                  )}
                                  <div className="flex items-center space-x-3 mt-2">
                                    <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 px-2 py-1 rounded-full font-medium">
                                      {match.matchScore}% match
                                    </span>
                                  </div>
                                </div>

                                {/* Select/Follow Button */}
                                <button
                                  onClick={() => toggleMatchSelection(idx, match.did)}
                                  disabled={isFollowed}
                                  className={`flex items-center space-x-1 px-3 py-2 rounded-full font-medium transition-all flex-shrink-0 ${
                                    isFollowed
                                      ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 cursor-not-allowed opacity-60'
                                      : isSelected
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                  }`}
                                >
                                  {isFollowed ? (
                                    <>
                                      <Check className="w-4 h-4" />
                                      <span className="text-sm">Followed</span>
                                    </>
                                  ) : isSelected ? (
                                    <>
                                      <Check className="w-4 h-4" />
                                      <span className="text-sm">Selected</span>
                                    </>
                                  ) : (
                                    <>
                                      <UserPlus className="w-4 h-4" />
                                      <span className="text-sm">Select</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            );
                          })}
                          {hasMoreMatches && (
                            <button
                              onClick={() => toggleExpandResult(idx)}
                              className="w-full py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors flex items-center justify-center space-x-1"
                            >
                              <span>{isExpanded ? 'Show less' : `Show ${item.atprotoMatches.length - 1} more ${item.atprotoMatches.length - 1 === 1 ? 'match' : 'matches'}`}</span>
                              <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Fixed Bottom Action Bar */}
            {totalSelected > 0 && (
              <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent dark:from-gray-900 dark:via-gray-900 dark:to-transparent pt-8 pb-6">
                <div className="max-w-3xl mx-auto px-4">
                  <button
                    onClick={followSelectedUsers}
                    disabled={isFollowing}
                    className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white py-5 rounded-2xl font-bold text-lg transition-all shadow-2xl hover:shadow-3xl flex items-center justify-center space-x-3 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none focus:outline-none focus:ring-4 focus:ring-purple-300 dark:focus:ring-purple-800"
                  >
                    <Heart className="w-6 h-6" />
                    <span>Follow {totalSelected} Selected {totalSelected === 1 ? 'User' : 'Users'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}