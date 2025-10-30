import { useState, useEffect, useRef } from "react";
import { Upload, User, Check, Search, ArrowRight, Users, FileText, ChevronRight, LogOut, Home } from "lucide-react";
import JSZip from "jszip";
import {
  CompositeDidDocumentResolver,
  CompositeHandleResolver,
  PlcDidDocumentResolver,
  AtprotoWebDidDocumentResolver,
  DohJsonHandleResolver,
  WellKnownHandleResolver
} from "@atcute/identity-resolver";

interface atprotoSession {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
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

// Match Carousel Component
function MatchCarousel({ 
  matches, 
  selectedDids, 
  onToggleSelection,
  cardRef
}: { 
  matches: any[]; 
  selectedDids: Set<string>; 
  onToggleSelection: (did: string) => void;
  cardRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  
  const currentMatch = matches[currentIndex];
  const hasMore = matches.length > 1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < matches.length - 1;
  
  const minSwipeDistance = 50;
  
  const nextMatch = () => {
    if (hasNext) {
      setCurrentIndex(currentIndex + 1);
    }
  };
  
  const prevMatch = () => {
    if (hasPrev) {
      setCurrentIndex(currentIndex - 1);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prevMatch();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextMatch();
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onToggleSelection(currentMatch.did);
    }
  };
  
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  
  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe && hasNext) {
      nextMatch();
    } else if (isRightSwipe && hasPrev) {
      prevMatch();
    }
  };

  const matchLabel = `${currentMatch.displayName || currentMatch.handle}, ${currentMatch.matchScore} percent match${currentMatch.followed ? ', already followed' : ''}${hasMore ? `, match ${currentIndex + 1} of ${matches.length}` : ''}`;
  
  return (
    <div 
      className="relative" 
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        ref={(el) => {
          if (cardRef) {
            cardRef.current = el;
          }
        }}
        className={`flex items-center space-x-3 p-3 rounded-lg border transition-all focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 ${
          selectedDids.has(currentMatch.did)
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
            : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
        } ${currentMatch.followed ? 'opacity-60' : ''}`}
        onKeyDown={handleKeyDown}
        onFocus={(e) => {
          if (e.target === e.currentTarget) {
            e.currentTarget.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'nearest'
            });
          }
        }}
        tabIndex={0}
        role="button"
        aria-label={matchLabel}
        aria-pressed={selectedDids.has(currentMatch.did)}
        aria-disabled={currentMatch.followed}
      >
        <div 
          className="flex items-center justify-center min-w-[44px] min-h-[44px] cursor-pointer flex-shrink-0"
          onClick={() => !currentMatch.followed && onToggleSelection(currentMatch.did)}
          aria-hidden="true"
        >
          <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-colors ${
            selectedDids.has(currentMatch.did) 
              ? 'bg-blue-600 border-blue-600' 
              : 'bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500'
          } ${currentMatch.followed ? 'opacity-50 cursor-not-allowed' : ''}`}>
            {selectedDids.has(currentMatch.did) && (
              <Check className="w-3 h-3 text-white" />
            )}
          </div>
        </div>
        
        {currentMatch.avatar ? (
          <img 
            src={currentMatch.avatar} 
            alt=""
            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <span className="text-white font-bold text-sm">
              {currentMatch.handle.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        
        <div className="flex-1 min-w-0" aria-hidden="true">
          {currentMatch.displayName && (
            <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
              {currentMatch.displayName}
            </div>
          )}
          <div className="flex items-center space-x-2">
            <div className="text-sm text-gray-600 dark:text-gray-300 truncate">
              @{currentMatch.handle}
            </div>
            <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 px-2 py-0.5 rounded flex-shrink-0">
              {currentMatch.matchScore}%
            </span>
          </div>
        </div>
        
        {currentMatch.followed && (
          <div className="flex-shrink-0" aria-hidden="true">
            <div className="flex items-center space-x-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 px-2 py-1 rounded-full text-xs">
              <Check className="w-3 h-3" />
              <span>Followed</span>
            </div>
          </div>
        )}
        
        {hasMore && (
          <div className="flex items-center space-x-1 flex-shrink-0" aria-hidden="true">
            {hasPrev && (
              <div className="p-2 text-gray-400 dark:text-gray-500">
                <ChevronRight className="w-5 h-5 rotate-180" />
              </div>
            )}
            {hasNext && (
              <div className="p-2 text-gray-400 dark:text-gray-500">
                <ChevronRight className="w-5 h-5" />
              </div>
            )}
          </div>
        )}
      </div>
      
      {hasMore && (
        <div className="flex items-center justify-center space-x-2 mt-2" aria-hidden="true">
          {matches.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all ${
                idx === currentIndex 
                  ? 'w-6 bg-blue-500' 
                  : 'w-1.5 bg-gray-300'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [handle, setHandle] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [session, setSession] = useState<atprotoSession | null>(null);
  const [useAppPassword, setUseAppPassword] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearchingAll, setIsSearchingAll] = useState(false);
  const [currentStep, setCurrentStep] = useState<'checking' | 'login' | 'home' | 'upload' | 'loading' | 'results'>('checking');
  const [searchProgress, setSearchProgress] = useState({ searched: 0, found: 0, total: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const resultCardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const didDocumentResolver = new CompositeDidDocumentResolver({
    methods: {
      plc: new PlcDidDocumentResolver({ apiUrl: "https://plc.directory" }),
      web: new AtprotoWebDidDocumentResolver(),
    },
  });

  const handleResolver = new CompositeHandleResolver({
    strategy: "dns-first",
    methods: {
      dns: new DohJsonHandleResolver({ dohUrl: "https://dns.google/resolve?" }),
      http: new WellKnownHandleResolver(),
    },
  });

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
  const loginWithOAuth = async () => {
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

  // App Password Login (Fallback method)
  async function loginWithAppPassword() {
  try {
    if (!handle || !appPassword) {
      alert("Enter handle and app password");
      return;
    }

    // Step 1: Resolve handle → DID
    const did = await handleResolver.resolve(handle as `${string}.${string}`);
    if (!did) {
      alert("Failed to resolve handle to DID");
      return;
    }

    // Step 2: Resolve DID → DID Document
    const didDoc = await didDocumentResolver.resolve(did);
    if (!didDoc?.service?.[0]?.serviceEndpoint) {
      alert("Could not determine PDS endpoint from DID Document");
      return;
    }

    // Step 3: Extract PDS endpoint
    const pdsEndpoint = didDoc.service[0].serviceEndpoint;

    // Step 4: Authenticate via App Password
    const sessionRes = await fetch(`${pdsEndpoint}/xrpc/com.atproto.server.createSession`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: handle, password: appPassword }),
    });

    if (!sessionRes.ok) {
      const errText = await sessionRes.text();
      console.error("Login failed:", errText);
      alert("Login failed, check handle and app password");
      return;
    }

    const sessionData = await sessionRes.json();

    // Step 5: Store session + PDS endpoint for future API calls
    setSession({
      ...sessionData,
      serviceEndpoint: pdsEndpoint,
    });

    setCurrentStep('home');

    console.log("Logged in successfully!", sessionData, pdsEndpoint);
  } catch (err) {
    console.error("Login error:", err);
    alert("Error during login. See console for details.");
  }
  }

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
    console.log('sau Session value:', session);
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
        data.results.forEach((result: any, batchIndex: number) => {
          const globalIndex = i + batchIndex;
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
        console.log(`Loaded ${users.length} TikTok users from JSON file`);
        setStatusMessage(`Loaded ${users.length} users from JSON file`);
      } else if (file.name.endsWith(".txt")) {
      // Direct TXT upload
        users = parseTxtFile(await file.text());
        console.log(`Loaded ${users.length} TikTok users from TXT file`);
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
          console.log(`Loaded ${users.length} TikTok users from .ZIP file`);
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
          console.log(`Loaded ${users.length} TikTok users from .ZIP file`);
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
  const totalSearched = searchResults.filter(r => !r.isSearching).length;

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

      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="px-4 py-4 max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center" aria-hidden="true">
                <ArrowRight className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">ATlast</h1>
            </div>
            {session && (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                  <User className="w-4 h-4" aria-hidden="true" />
                  <span>@{session.handle}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  aria-label="Log out"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

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

        {/* Login Step */}
        {currentStep === 'login' && (
          <div className="p-6 max-w-md mx-auto mt-8">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Welcome!</h2>
                <p className="text-gray-600 dark:text-gray-300">Connect your ATmosphere account to sync your TikTok follows</p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!useAppPassword) loginWithOAuth();
                  else loginWithAppPassword();
                }}
                className="space-y-4"
              >
                <div>
                  <label htmlFor="user-handle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    User Handle
                  </label>
                  <input
                    id="user-handle"
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="yourhandle.atproto.social"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    aria-required="true"
                    autoComplete="username"
                  />
                </div>

                {!useAppPassword ? (
                  <>
                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 min-h-[44px]"
                    >
                      Connect to the ATmosphere
                    </button>

                    <button
                      type="button"
                      onClick={() => setUseAppPassword(true)}
                      className="w-full text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 underline py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 rounded min-h-[44px]"
                    >
                      Use App Password instead
                    </button>
                  </>
                ) : (
                  <>
                    <div>
                      <label htmlFor="app-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        App Password
                      </label>
                      <input
                        id="app-password"
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        type="password"
                        placeholder="Not your regular password!"
                        value={appPassword}
                        onChange={(e) => setAppPassword(e.target.value)}
                        aria-required="true"
                        autoComplete="off"
                        aria-describedby="password-help"
                      />
                      <p id="password-help" className="text-xs text-gray-500 dark:text-gray-300 mt-1">
                        Generate this in your Bluesky settings
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setUseAppPassword(true)}
                      className="w-full text-sm text-gray-600 hover:text-gray-900 underline py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 rounded min-h-[44px]"
                    >
                      Use App Password instead
                    </button>

                    <button
                      type="button"
                      onClick={() => setUseAppPassword(false)}
                      className="w-full text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 underline py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 rounded min-h-[44px]"
                    >
                      Use OAuth instead (recommended)
                    </button>
                  </>
                )}
              </form>
            </div>
          </div>
        )}

        {/* Home/Dashboard Step */}
        {currentStep === 'home' && (
          <div className="p-6 max-w-md mx-auto mt-8">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                  <Home className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Welcome back!
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  What would you like to do?
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => setCurrentStep('upload')}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-4 px-6 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 min-h-[56px] flex items-center justify-center space-x-3"
                >
                  <Upload className="w-5 h-5" />
                  <span>Upload TikTok Data</span>
                </button>

                <button
                  onClick={() => alert('View previous results feature coming soon!')}
                  className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 py-4 px-6 rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 min-h-[56px] flex items-center justify-center space-x-3"
                  disabled
                >
                  <FileText className="w-5 h-5" />
                  <span>View Previous Results</span>
                  <span className="text-xs bg-gray-300 dark:bg-gray-600 px-2 py-1 rounded">Coming Soon</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upload Step */}
        {currentStep === 'upload' && (
          <div className="p-6 max-w-md mx-auto mt-8">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 space-y-6">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setCurrentStep('home')}
                  className="flex items-center space-x-1 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 rounded px-2 py-1"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                  <span>Back</span>
                </button>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                  <FileText className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Upload Your Data</h2>
                <p className="text-gray-600 dark:text-gray-300">Upload your TikTok following data to find matches</p>
              </div>

              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center hover:border-blue-400 dark:hover:border-blue-500 focus-within:border-blue-400 dark:focus-within:border-blue-500 transition-colors">
                  <Upload className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" aria-hidden="true" />
                  <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-1">Choose File</p>
                  <p className="text-sm text-gray-500 dark:text-gray-300 mb-3">Following.txt or TikTok data ZIP</p>

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

                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4" role="region" aria-label="Instructions for getting your TikTok data">
                  <h3 className="font-medium text-blue-900 dark:text-blue-200 mb-2">How to get your data:</h3>
                  <ol className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-decimal list-inside">
                    <li>Open TikTok app → Profile → Settings and privacy → Account → Download your data</li>
                    <li>Request data → Select "Request data"</li>
                    <li>Wait for notification your download is ready</li>
                    <li>Navigate back to Download your data</li>
                    <li>Download data → Select</li>
                    <li>Upload the Following.txt file here</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading Step */}
        {currentStep === 'loading' && (
          <div className="p-6 max-w-2xl mx-auto mt-8">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                  <Search className="w-8 h-8 text-white animate-pulse" aria-hidden="true" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Finding Your People</h2>
                <p className="text-gray-600 dark:text-gray-300">Searching the ATmosphere for your TikTok follows...</p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 rounded-xl p-6" role="region" aria-label="Search progress">
                <div className="grid grid-cols-3 gap-4 text-center mb-4">
                  <div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-gray-300" aria-label={`${searchProgress.searched} searched`}>{searchProgress.searched}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Searched</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-500" aria-label={`${searchProgress.found} found`}>{searchProgress.found}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Found</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-gray-400 dark:text-gray-900" aria-label={`${searchProgress.total} total`}>{searchProgress.total}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Total</div>
                  </div>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden" role="progressbar" aria-valuenow={searchProgress.total > 0 ? Math.round((searchProgress.searched / searchProgress.total) * 100) : 0} aria-valuemin={0} aria-valuemax={100}>
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-600 h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${searchProgress.total > 0 ? (searchProgress.searched / searchProgress.total) * 100 : 0}%` }}
                  />
                </div>
                <div className="text-center mt-2 text-sm text-gray-600 dark:text-gray-300" aria-hidden="true">
                  {searchProgress.total > 0 ? Math.round((searchProgress.searched / searchProgress.total) * 100) : 0}% complete
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {currentStep === 'results' && (
          <div className="pb-20">
            <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
              <div className="px-4 py-4 max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setCurrentStep('home')}
                      className="flex items-center space-x-1 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 rounded px-2 py-1"
                    >
                      <ChevronRight className="w-4 h-4 rotate-180" />
                      <span>Home</span>
                    </button>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Results</h2>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {totalFound} of {searchResults.length} users found
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{totalSelected}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-200">selected</div>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={selectAllMatches}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-h-[44px]"
                    type="button"
                    aria-label="Select all top matches"
                  >
                    Select All
                  </button>
                  <button
                    onClick={deselectAllMatches}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-3 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 min-h-[44px]"
                    type="button"
                    aria-label="Clear all selections"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            {/* Results List */}
            <div className="space-y-2 p-4 max-w-2xl mx-auto" role="list" aria-label="Search results">
              {searchResults.map((result, index) => (
                <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700" role="listitem">
                  <div className="p-4">
                    {/* TikTok User Header */}
                    <div className="mb-3">
                      <div className="text-xs text-gray-500 dark:text-gray-200 uppercase tracking-wide mb-1" aria-hidden="true">TikTok</div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                        <span className="sr-only">TikTok user </span>
                        @{result.tiktokUser.username}
                      </div>
                    </div>

                    {/* ATmosphere Matches */}
                    {result.atprotoMatches.length > 0 ? (
                      <div className="space-y-2">
                        <div className="sr-only">AT matches:</div>
                          <MatchCarousel 
                            matches={result.atprotoMatches}
                            selectedDids={result.selectedMatches || new Set()}
                            onToggleSelection={(did) => toggleMatchSelection(index, did)}
                            cardRef={{ current: resultCardRefs.current[index] || null }}
                          />
                      </div>
                    ) : (
                      <div className="text-center py-2 text-gray-400" role="status">
                        <div className="text-sm">No matches found</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Fixed Bottom Action Bar */}
      {currentStep === 'results' && totalSelected > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t dark:border-gray-700 shadow-lg">
          <div className="p-4 max-w-2xl mx-auto">
            <button
              onClick={followSelectedUsers}
              disabled={isFollowing}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-4 rounded-xl font-medium text-lg transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[56px]"
              type="button"
              aria-live="polite"
              aria-label={isFollowing ? `Following users, please wait` : `Follow ${totalSelected} selected users`}
            >
              {isFollowing 
                ? "Following Users..." 
                : `Follow ${totalSelected} Selected Users`
              }
            </button>
          </div>
        </div>
      )}
    </div>
  );
}