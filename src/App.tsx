import { useState } from "react";
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

export default function App() {
  const [handle, setHandle] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [session, setSession] = useState<BskySession | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearchingAll, setIsSearchingAll] = useState(false);

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

  // Debug mode - enabled by URL parameter or localStorage
  const [debugMode] = useState(() => {
    return new URLSearchParams(window.location.search).has('debug') || 
           localStorage.getItem('debug') === 'true';
  });

  async function login() {
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

    console.log("Logged in successfully!", sessionData, pdsEndpoint);
  } catch (err) {
    console.error("Login error:", err);
    alert("Error during login. See console for details.");
  }
}

  // Parse TikTok Following.txt
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const users: TikTokUser[] = [];
    const entries = text.split("\n\n").map((b) => b.trim()).filter(Boolean);
    
    for (const entry of entries) {
      const userMatch = entry.match(/Username:\s*(.+)/);
      if (userMatch) {
        users.push({
          username: userMatch[1].trim(),
          date: "",
        });
      }
    }

    console.log(`Loaded ${users.length} TikTok users:`, users.map(u => u.username));

    // Initialize search results
    const initialResults: SearchResult[] = users.map(user => ({
      tiktokUser: user,
      bskyMatches: [],
      isSearching: false,
      selectedMatches: new Set<string>(),
    }));

    setSearchResults(initialResults);

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
    
    // Process users in batches to avoid rate limiting
    const batchSize = 3;
    for (let i = 0; i < targetResults.length; i += batchSize) {
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
      
      // Add delay between batches to be respectful of rate limits
      if (i + batchSize < targetResults.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    setIsSearchingAll(false);
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

  // Select all matches across all results
  function selectAllMatches() {
    setSearchResults(prev => prev.map(result => ({
      ...result,
      selectedMatches: new Set(result.bskyMatches.map(match => match.did))
    })));
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
      
      // Add small delay between follows to be respectful
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {!session ? (
        <div className="space-y-4 max-w-md">
          <h1 className="text-2xl font-bold">TikTok → Bluesky Follower Sync</h1>
          <p className="text-gray-600">Login to your Bluesky account to start syncing your TikTok follows.</p>
          <input
            className="border border-gray-300 p-3 w-full rounded"
            placeholder="yourhandle.bsky.social"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
          />
          <input
            className="border border-gray-300 p-3 w-full rounded"
            type="password"
            placeholder="App password (not your regular password!)"
            value={appPassword}
            onChange={(e) => setAppPassword(e.target.value)}
          />
          <button 
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded w-full font-medium" 
            onClick={login}
          >
            Login to Bluesky
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">TikTok → Bluesky Sync</h1>
            <div className="flex items-center space-x-4">
              <p className="text-gray-600">Logged in as {session.handle}</p>
              {debugMode && (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                  DEBUG MODE
                </span>
              )}
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Upload your TikTok Following.txt file:
              </label>
              <input 
                type="file" 
                accept=".txt" 
                onChange={handleFileUpload}
                className="border border-gray-300 p-2 rounded"
              />
            </div>
            
            {searchResults.length > 0 && (
              <div className="flex flex-col space-y-4">
                {isSearchingAll && (
                  <div className="flex items-center space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    <span className="text-blue-700 font-medium">
                      Searching Bluesky for all {searchResults.length} users...
                    </span>
                  </div>
                )}
                
                {/* Debug Panel - Only show in debug mode */}
                {debugMode && <DebugPanel session={session} />}
              </div>
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">
                  Results ({searchResults.filter(r => r.bskyMatches.length > 0).length}/{searchResults.length} found)
                </h2>
                
                {/* Selection controls */}
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">
                    {searchResults.reduce((total, result) => total + (result.selectedMatches?.size || 0), 0)} selected
                  </span>
                  <div className="flex space-x-2">
                    <button
                      onClick={selectAllMatches}
                      className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
                    >
                      Select All
                    </button>
                    <button
                      onClick={deselectAllMatches}
                      className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm"
                    >
                      Deselect All
                    </button>
                    <button
                      onClick={followSelectedUsers}
                      className="px-4 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-sm font-medium"
                    >
                      Follow Selected
                    </button>
                  </div>
                </div>
              </div>
              
              {searchResults.map((result, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* TikTok User */}
                    <div>
                      <h3 className="font-semibold text-lg">TikTok: @{result.tiktokUser.username}</h3>
                    </div>
                    
                    {/* Bluesky Results */}
                    <div>
                      {result.isSearching ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                          <span className="text-gray-600">Searching...</span>
                        </div>
                      ) : result.error ? (
                        <div className="text-red-600">Error: {result.error}</div>
                      ) : result.bskyMatches.length === 0 ? (
                        <div className="text-gray-500 italic">No matches found</div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">Bluesky matches:</h4>
                            {result.bskyMatches.length > 1 && (
                              <span className="text-xs text-gray-500">
                                {result.selectedMatches?.size || 0} of {result.bskyMatches.length} selected
                              </span>
                            )}
                          </div>
                          {result.bskyMatches.map((match: any, matchIndex: number) => (
                            <div key={matchIndex} className="flex items-center space-x-3 p-2 border rounded bg-gray-50">
                              <input
                                type="checkbox"
                                checked={result.selectedMatches?.has(match.did) || false}
                                onChange={() => toggleMatchSelection(index, match.did)}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                disabled={match.followed}
                              />
                              <div className="flex-1">
                                <div className="font-medium">
                                  <a 
                                    href={`https://bsky.app/profile/${match.handle}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 hover:underline"
                                  >
                                    @{match.handle}
                                  </a>
                                </div>
                                {match.displayName && (
                                  <div className="text-sm text-gray-600">{match.displayName}</div>
                                )}
                                <div className="text-xs text-gray-400">
                                  Match score: {match.matchScore}%
                                </div>
                              </div>
                              {match.followed && (
                                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                                  ✓ Followed
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Debug Panel Component - Separated from main UI
function DebugPanel({ session }: { session: BskySession }) {
  // Debug function to test search
  async function testSearch(username: string) {
    console.log(`\n=== Testing search for: "${username}" ===`);
    
    try {
      const res = await fetch(
        `${session.serviceEndpoint}/xrpc/app.bsky.actor.searchActors?q=${encodeURIComponent(username)}&limit=20`,
        { headers: { Authorization: `Bearer ${session.accessJwt}` } }
      );
      
      console.log('Response status:', res.status);
      console.log('Response headers:', Object.fromEntries(res.headers.entries()));
      
      if (!res.ok) {
        const errorText = await res.text();
        console.log('Error response:', errorText);
        return;
      }
      
      const data = await res.json();
      console.log('Raw API response:', data);
      console.log(`Found ${data.actors?.length || 0} actors`);
      
      if (data.actors && data.actors.length > 0) {
        data.actors.forEach((actor: any, i: number) => {
          console.log(`${i + 1}. Handle: ${actor.handle}`);
          console.log(`   Display: ${actor.displayName || 'No display name'}`);
          console.log(`   DID: ${actor.did}`);
          console.log(`   Followers: ${actor.followersCount || 0}`);
        });
      } else {
        console.log('No actors found in response');
      }
      
    } catch (error) {
      console.error('Search test error:', error);
    }
  }

  return (
    <div className="border border-yellow-300 rounded-lg p-4 bg-yellow-50">
      <h3 className="text-lg font-semibold mb-2 text-yellow-800">Debug Tools</h3>
      <p className="text-sm text-yellow-700 mb-3">
        These tools are only visible in debug mode. Check console for detailed logs.
      </p>
      <div className="flex space-x-2">
        <button
          className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded text-sm"
          onClick={() => testSearch('joebasser')}
        >
          Test Search "joebasser"
        </button>
        <button
          className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded text-sm"
          onClick={() => testSearch('skylight.social')}
        >
          Test Search "skylight.social"
        </button>
        <button
          className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded text-sm"
          onClick={() => {
            localStorage.removeItem('debug');
            window.location.reload();
          }}
        >
          Exit Debug Mode
        </button>
      </div>
    </div>
  );
}