import { useState, useEffect } from "react";
import { Upload, User, Check, Search, ArrowRight, Users, FileText, ChevronRight } from "lucide-react";
import JSZip from "jszip";
import {
  CompositeDidDocumentResolver,
  CompositeHandleResolver,
  PlcDidDocumentResolver,
  AtprotoWebDidDocumentResolver,
  DohJsonHandleResolver,
  WellKnownHandleResolver
} from "@atcute/identity-resolver";

interface BskySession {
  did: string;
  handle: string;
  accessJwt: string;
  serviceEndpoint: string;
}

interface TikTokUser {
  username: string;
  date: string;
}

interface SearchResult {
  tiktokUser: TikTokUser;
  bskyMatches: any[];
  isSearching: boolean;
  error?: string;
  selectedMatches?: Set<string>; // Track selected match DIDs
}

// Match Carousel Component
function MatchCarousel({ 
  matches, 
  selectedDids, 
  onToggleSelection 
}: { 
  matches: any[]; 
  selectedDids: Set<string>; 
  onToggleSelection: (did: string) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const currentMatch = matches[currentIndex];
  const hasMore = matches.length > 1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < matches.length - 1;
  
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
  
  return (
    <div className="relative">
      <div 
        className={`flex items-center space-x-3 p-3 rounded-lg border transition-all ${
          selectedDids.has(currentMatch.did) 
            ? 'bg-blue-50 border-blue-200' 
            : 'bg-gray-50 border-gray-200'
        } ${currentMatch.followed ? 'opacity-60' : ''}`}
      >
        <input
          type="checkbox"
          checked={selectedDids.has(currentMatch.did)}
          onChange={() => onToggleSelection(currentMatch.did)}
          disabled={currentMatch.followed}
          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 flex-shrink-0"
        />
        
        {currentMatch.avatar ? (
          <img 
            src={currentMatch.avatar} 
            alt={currentMatch.handle}
            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">
              {currentMatch.handle.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          {currentMatch.displayName && (
            <div className="font-medium text-gray-900 truncate">
              {currentMatch.displayName}
            </div>
          )}
          <div className="flex items-center space-x-2">
            <div className="text-sm text-gray-600 truncate">
              @{currentMatch.handle}
            </div>
            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded flex-shrink-0">
              {currentMatch.matchScore}%
            </span>
          </div>
        </div>
        
        {currentMatch.followed && (
          <div className="flex-shrink-0">
            <div className="flex items-center space-x-1 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
              <Check className="w-3 h-3" />
              <span>Followed</span>
            </div>
          </div>
        )}
        
        <div className="flex items-center space-x-1 flex-shrink-0">
          {hasPrev && (
            <button
              onClick={prevMatch}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600 rotate-180" />
            </button>
          )}
          {hasNext && (
            <button
              onClick={nextMatch}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          )}
        </div>
      </div>
      
      {hasMore && (
        <div className="flex items-center justify-center space-x-1 mt-2">
          {matches.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
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
  const [session, setSession] = useState<BskySession | null>(null);
  const [useAppPassword, setUseAppPassword] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearchingAll, setIsSearchingAll] = useState(false);
  const [currentStep, setCurrentStep] = useState<'login' | 'upload' | 'loading' | 'results'>('login');
  const [searchProgress, setSearchProgress] = useState({ searched: 0, found: 0, total: 0 });
  const [loginHint, setLoginHint] = useState<string>('');

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

  // OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session');
    const error = params.get('error');

    if (error) {
      alert(`Login failed: ${error}`);
      window.history.replaceState({}, '', '/');
      return;
    }

    if (sessionId) {
      // Fetch session data from backend
      fetch(`/.netlify/functions/session?session=${sessionId}`)
        .then((res) => {
          if (!res.ok) throw new Error('Failed to load session');
          return res.json();
        })
        .then((data) => {
          // Temporary: just store DID for now
          // We'll add handle and serviceEndpoint when we build backend functions
          setSession({
            did: data.did,
            handle: 'unknown', // placeholder
            accessJwt: '', // no longer needed
            serviceEndpoint: '', // no longer needed
          });
          setCurrentStep('upload');
          window.history.replaceState({}, '', '/');
        })
        .catch((err) => {
          console.error('Session error:', err);
          alert('Failed to load session');
          window.history.replaceState({}, '', '/');
        });
    }
  }, []);

  // Start OAuth login
  const loginWithOAuth = async () => {
    try {
      if (!handle) {
        alert("Please enter your handle");
        return;
      }

      const res = await fetch('/.netlify/functions/oauth-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login_hint: handle }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to start OAuth flow');
      }

      const { url } = await res.json();
      window.location.href = url; // redirect to authorization server
    } catch (err) {
      console.error('OAuth error:', err);
      alert(`Error starting OAuth: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

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

    setCurrentStep('upload');

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

  // Parse TikTok Following data from .txt, .json, or .zip file
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    let users: TikTokUser[] = [];

    try {
      // Direct JSON upload
      if (file.name.endsWith(".json")) {
        users = await parseJsonFile(await file.text());
        console.log(`Loaded ${users.length} TikTok users from JSON file`);
      } else if (file.name.endsWith(".txt")) {
      // Direct TXT upload
        users = parseTxtFile(await file.text());
        console.log(`Loaded ${users.length} TikTok users from TXT file`);
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
        } else {
          // If no TXT, look for JSON at the top level
          const jsonFileEntry = Object.values(zip.files).find(
            (f) => f.name.endsWith(".json") && !f.dir
          );

          if (!jsonFileEntry) {
            alert("Could not find Following.txt or a JSON file in the ZIP archive.");
            return;
          }

          const jsonText = await jsonFileEntry.async("string");
          users = await parseJsonFile(jsonText);
          console.log(`Loaded ${users.length} TikTok users from .ZIP file`);
        }
      } else {
        alert("Please upload a .txt, .json, or .zip file");
        return;
      }
    } catch (error) {
      console.error("Error processing file:", error);
      alert("There was a problem processing the file. Please check that it's a valid TikTok data export.");
      return;
    }
    
    if (users.length === 0) {
      alert("No users found in the file.");
      return;
    }

    // Initialize search results
    const initialResults: SearchResult[] = users.map(user => ({
      tiktokUser: user,
      bskyMatches: [],
      isSearching: false,
      selectedMatches: new Set<string>(),
    }));

    setSearchResults(initialResults);

    setCurrentStep('results');

    // Automatically start searching once users are loaded
    setTimeout(() => searchAllUsers(initialResults), 100);
  }

  // Search Bluesky by handle
  async function searchSingleUser(username: string): Promise<any[]> {
    if (!session) return [];

    try {
      // Search for exact username first
      const res = await fetch(
        `${session.serviceEndpoint}/xrpc/app.bsky.actor.searchActors?q=${encodeURIComponent(username)}&limit=20`,
        { headers: { Authorization: `Bearer ${session.accessJwt}` } }
      );

      if (!res.ok) {
        throw new Error(`Search failed: ${res.status}`);
      }

      const data = await res.json();

      // Filter and rank matches
      const normalize = (s: string) => s.toLowerCase().replace(/[._-]/g, "");
      const normalizedUsername = normalize(username);

      return data.actors.map((actor: any) => {
        const handlePart = actor.handle.split('.')[0]; // get part before first dot
        const normalizedHandle = normalize(handlePart);
        const normalizedFullHandle = normalize(actor.handle);
        const normalizedDisplayName = normalize(actor.displayName || '');

        // Calculate match score
        let score = 0;
        if (normalizedHandle === normalizedUsername) score = 100;
        else if (normalizedFullHandle === normalizedUsername) score = 90;
        else if (normalizedDisplayName === normalizedUsername) score = 80;
        else if (normalizedHandle.includes(normalizedUsername)) score = 60;
        else if (normalizedFullHandle.includes(normalizedUsername)) score = 50;
        else if (normalizedDisplayName.includes(normalizedUsername)) score = 40;
        else if (normalizedUsername.includes(normalizedHandle)) score = 30;

        return { ...actor, matchScore: score };
      })
      .filter((actor: any) => actor.matchScore > 0)
      .sort((a: any, b: any) => b.matchScore - a.matchScore)
      .slice(0, 5);
    } catch (error) {
      console.error(`Search error for ${username}:`, error);
      return [];
    }
  }

  // Search all users
  async function searchAllUsers(resultsToSearch?: SearchResult[]) {
    const targetResults = resultsToSearch || searchResults;
    if (!session || targetResults.length === 0) return;
    
    setIsSearchingAll(true);
    setCurrentStep('loading');
    setSearchProgress({ searched: 0, found: 0, total: targetResults.length });
    
    // Process users in batches to avoid rate limiting
    const batchSize = 3;
    let totalSearched = 0;
    let totalFound = 0;
    const MAX_MATCHES = 1000;

    for (let i = 0; i < targetResults.length; i += batchSize) {
      // Stop once MAX_MATCHES reached
      if (totalFound >= MAX_MATCHES) {
        console.log(`Reached limit of ${MAX_MATCHES} matches. Stopping search.`);
        break;
      }

      const batch = targetResults.slice(i, i + batchSize);
      
      // Mark current batch as searching
      setSearchResults(prev => prev.map((result, index) => 
        i <= index && index < i + batchSize 
          ? { ...result, isSearching: true }
          : result
      ));
      
      // Search batch in parallel
      const batchPromises = batch.map(async (result, batchIndex) => {
        const globalIndex = i + batchIndex;
        try {
          const matches = await searchSingleUser(result.tiktokUser.username);
          return { globalIndex, matches, error: undefined };
        } catch (error) {
          return { globalIndex, matches: [], error: error instanceof Error ? error.message : 'Search failed' };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      
      // Update progress immediately after batch completes
      batchResults.forEach(br => {
        totalSearched++;
        if (br.matches.length > 0) {
          totalFound++;
        }
      });
      setSearchProgress({ searched: totalSearched, found: totalFound, total: targetResults.length });

      // Update results
      setSearchResults(prev => prev.map((result, index) => {
        const batchResult = batchResults.find(br => br.globalIndex === index);
        if (batchResult) {
          const newSelectedMatches = new Set<string>();
          // Auto-select only the first (highest scoring) match
          if (batchResult.matches.length > 0) {
            newSelectedMatches.add(batchResult.matches[0].did);
          }

          return {
            ...result,
            bskyMatches: batchResult.matches,
            isSearching: false,
            error: batchResult.error,
            selectedMatches: newSelectedMatches,
          };
        }
        return result;
      }));

      // Check again if we've hit the limit after updating results
      if (totalFound >= MAX_MATCHES) {
        break;
      }
      
      // Add delay between batches to be respectful of rate limits
      if (i + batchSize < targetResults.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    setIsSearchingAll(false);
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
      if (result.bskyMatches.length > 0) {
        newSelectedMatches.add(result.bskyMatches[0].did);
      }
      return {
        ...result,
        selectedMatches: newSelectedMatches
      };
    }));
  }

  // Deselect all matches across all results
  function deselectAllMatches() {
    setSearchResults(prev => prev.map(result => ({
      ...result,
      selectedMatches: new Set<string>()
    })));
  }

  // Follow all selected users
  async function followSelectedUsers() {
    if (!session) return;

    const selectedUsers = searchResults.flatMap((result, resultIndex) => 
      result.bskyMatches
        .filter(match => result.selectedMatches?.has(match.did))
        .map(match => ({ ...match, resultIndex }))
    );

    if (selectedUsers.length === 0) {
      alert("No users selected to follow");
      return;
    }

    for (const user of selectedUsers) {
      try {
        const res = await fetch(`${session.serviceEndpoint}/xrpc/com.atproto.repo.createRecord`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.accessJwt}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            repo: session.did,
            collection: "app.bsky.graph.follow",
            record: {
              $type: "app.bsky.graph.follow",
              subject: user.did,
              createdAt: new Date().toISOString(),
            },
          }),
        });
        
        if (res.ok) {
          // Mark as followed
          setSearchResults(prev => prev.map((result, index) => 
            index === user.resultIndex 
              ? { ...result, bskyMatches: result.bskyMatches.map(match => 
                  match.did === user.did ? { ...match, followed: true } : match
                )}
              : result
          ));
        }
      } catch (error) {
        console.error(`Follow error for ${user.handle}:`, error);
      }
      
      // Add small delay between follows
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  const totalSelected = searchResults.reduce((total, result) => 
    total + (result.selectedMatches?.size || 0), 0
  );
  const totalFound = searchResults.filter(r => r.bskyMatches.length > 0).length;
  const totalSearched = searchResults.filter(r => !r.isSearching).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-lg font-bold text-gray-900">ATlast</h1>
            </div>
            {session && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">@{session.handle}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Login Step */}
      {currentStep === 'login' && (
        <div className="p-6 max-w-md mx-auto mt-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome!</h2>
              <p className="text-gray-600">Connect your ATmosphere account to sync your TikTok follows</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User Handle
                </label>
                <input
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="yourhandle.bsky.social"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                />
              </div>
              
              {!useAppPassword ? (
                <>
                  <button 
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl" 
                    onClick={loginWithOAuth}
                  >
                    Connect to the ATmosphere
                  </button>
                  
                  <button
                    onClick={() => setUseAppPassword(true)}
                    className="w-full text-sm text-gray-600 hover:text-gray-900 underline"
                  >
                    Use App Password instead
                  </button>
                </>
              ) : (
                <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  App Password
                </label>
                <input
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  type="password"
                  placeholder="Not your regular password!"
                  value={appPassword}
                  onChange={(e) => setAppPassword(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Generate this in your Bluesky settings
                </p>
              </div>
              
              <button 
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl" 
                onClick={loginWithAppPassword}
              >
                Connect with App Password
              </button>

              <button
                    onClick={() => setUseAppPassword(false)}
                    className="w-full text-sm text-gray-600 hover:text-gray-900 underline"
                  >
                    Use OAuth instead (recommended)
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload Step */}
      {currentStep === 'upload' && (
        <div className="p-6 max-w-md mx-auto mt-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Your Data</h2>
              <p className="text-gray-600">Upload your TikTok following data to find matches</p>
            </div>

            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <label className="cursor-pointer">
                  <span className="text-lg font-medium text-gray-700 block mb-1">
                    Choose File
                  </span>
                  <span className="text-sm text-gray-500 block mb-3">
                    Following.txt or TikTok data ZIP
                  </span>
                  <input 
                    type="file" 
                    accept=".txt,.json,.zip"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                    Browse Files
                  </div>
                </label>
              </div>

              <div className="bg-blue-50 rounded-xl p-4">
                <h4 className="font-medium text-blue-900 mb-2">How to get your data:</h4>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
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
          <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <Search className="w-8 h-8 text-white animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Finding Your People</h2>
              <p className="text-gray-600">Searching the ATmosphere for your TikTok follows...</p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6">
              <div className="grid grid-cols-3 gap-4 text-center mb-4">
                <div>
                  <div className="text-3xl font-bold text-gray-900">{searchProgress.searched}</div>
                  <div className="text-sm text-gray-600">Searched</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-blue-600">{searchProgress.found}</div>
                  <div className="text-sm text-gray-600">Found</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-gray-400">{searchProgress.total}</div>
                  <div className="text-sm text-gray-600">Total</div>
                </div>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${searchProgress.total > 0 ? (searchProgress.searched / searchProgress.total) * 100 : 0}%` }}
                />
              </div>
              <div className="text-center mt-2 text-sm text-gray-600">
                {searchProgress.total > 0 ? Math.round((searchProgress.searched / searchProgress.total) * 100) : 0}% complete
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {currentStep === 'results' && (
        <div className="pb-20">
          <div className="bg-white border-b">
            <div className="px-4 py-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Results</h2>
                  <p className="text-sm text-gray-600">
                    {totalFound} of {searchResults.length} users found
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-600">{totalSelected}</div>
                  <div className="text-xs text-gray-500">selected</div>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={selectAllMatches}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Select All
                </button>
                <button
                  onClick={deselectAllMatches}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* Results List */}
          <div className="space-y-2 p-4">
            {searchResults.map((result, index) => (
              <div key={index} className="bg-white rounded-xl shadow-sm border">
                <div className="p-4">
                  {/* TikTok User Header */}
                  <div className="mb-3">
                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">TikTok</div>
                    <div className="font-semibold text-gray-900 text-lg">
                      @{result.tiktokUser.username}
                    </div>
                  </div>

                  {/* ATmosphere Matches */}
                  {result.bskyMatches.length > 0 ? (
                    <div className="space-y-2">
                      <MatchCarousel 
                        matches={result.bskyMatches}
                        selectedDids={result.selectedMatches || new Set()}
                        onToggleSelection={(did) => toggleMatchSelection(index, did)}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-2 text-gray-400">
                      <div className="text-sm">No matches found</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fixed Bottom Action Bar */}
      {currentStep === 'results' && totalSelected > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
          <div className="p-4">
            <button
              onClick={followSelectedUsers}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-4 rounded-xl font-medium text-lg transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Follow {totalSelected} Selected Users
            </button>
          </div>
        </div>
      )}
    </div>
  );
}