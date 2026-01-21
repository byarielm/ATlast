import { useState, useCallback } from "react";
import { apiClient } from "../lib/api/client";
import { SEARCH_CONFIG } from "../config/constants";
import type { SearchResult, SearchProgress, AtprotoSession } from "../types";

export function useSearch(session: AtprotoSession | null) {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearchingAll, setIsSearchingAll] = useState(false);
  const [searchProgress, setSearchProgress] = useState<SearchProgress>({
    searched: 0,
    found: 0,
    total: 0,
  });
  const [expandedResults, setExpandedResults] = useState<Set<number>>(
    new Set()
  );

  const searchAllUsers = useCallback(
    async (
      resultsToSearch: SearchResult[],
      onProgressUpdate: (message: string) => void,
      onComplete: (finalResults: SearchResult[]) => void,
      followLexicon?: string
    ) => {
      if (!session || resultsToSearch.length === 0) return;

      setIsSearchingAll(true);
      setSearchProgress({
        searched: 0,
        found: 0,
        total: resultsToSearch.length,
      });
      onProgressUpdate(
        `Starting search for ${resultsToSearch.length} users...`
      );

      const { BATCH_SIZE, MAX_MATCHES } = SEARCH_CONFIG;
      let totalSearched = 0;
      let totalFound = 0;
      let consecutiveErrors = 0;
      const MAX_CONSECUTIVE_ERRORS = 3;

      for (let i = 0; i < resultsToSearch.length; i += BATCH_SIZE) {
        if (totalFound >= MAX_MATCHES) {
          console.log(
            `Reached limit of ${MAX_MATCHES} matches. Stopping search.`
          );
          onProgressUpdate(
            `Search complete. Found ${totalFound} matches out of ${MAX_MATCHES} maximum.`
          );
          break;
        }

        const batch = resultsToSearch.slice(i, i + BATCH_SIZE);
        const usernames = batch.map((r) => r.sourceUser.username);

        try {
          const data = await apiClient.batchSearchActors(
            usernames,
            followLexicon
          );

          consecutiveErrors = 0;

          data.results.forEach((result) => {
            totalSearched++;
            if (result.actors.length > 0) {
              totalFound++;
            }
          });

          setSearchProgress({
            searched: totalSearched,
            found: totalFound,
            total: resultsToSearch.length,
          });
          onProgressUpdate(
            `Searched ${totalSearched} of ${resultsToSearch.length} users. Found ${totalFound} matches.`
          );

          // Single state update per batch - updates results with API data
          setSearchResults((prev) =>
            prev.map((result, index) => {
              const batchResultIndex = index - i;
              if (
                batchResultIndex >= 0 &&
                batchResultIndex < data.results.length
              ) {
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
            })
          );

          if (totalFound >= MAX_MATCHES) {
            break;
          }
        } catch (error) {
          console.error("Batch search error:", error);
          consecutiveErrors++;

          // Single state update on error - marks batch as failed
          setSearchResults((prev) =>
            prev.map((result, index) =>
              i <= index && index < i + BATCH_SIZE
                ? { ...result, isSearching: false, error: "Search failed" }
                : result
            )
          );

          if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
            const backoffDelay = Math.min(
              1000 * Math.pow(2, consecutiveErrors - MAX_CONSECUTIVE_ERRORS),
              5000
            );
            console.log(
              `Rate limit detected. Backing off for ${backoffDelay}ms...`
            );
            onProgressUpdate(`Rate limit detected. Pausing briefly...`);
            await new Promise((resolve) => setTimeout(resolve, backoffDelay));
          }
        }
      }

      setIsSearchingAll(false);
      onProgressUpdate(
        `Search complete! Found ${totalFound} matches out of ${totalSearched} users searched.`
      );

      // Get current results from state to pass to onComplete
      setSearchResults((currentResults) => {
        onComplete(currentResults);
        return currentResults;
      });
    },
    [session]
  );

  const toggleMatchSelection = useCallback(
    (resultIndex: number, did: string) => {
      setSearchResults((prev) => {
        // Only update the specific item instead of mapping entire array
        const newResults = [...prev];
        const result = newResults[resultIndex];

        const newSelectedMatches = new Set(result.selectedMatches);
        if (newSelectedMatches.has(did)) {
          newSelectedMatches.delete(did);
        } else {
          newSelectedMatches.add(did);
        }

        newResults[resultIndex] = {
          ...result,
          selectedMatches: newSelectedMatches,
        };
        return newResults;
      });
    },
    []
  );

  const toggleExpandResult = useCallback((index: number) => {
    setExpandedResults((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const selectAllMatches = useCallback(
    (onUpdate: (message: string) => void) => {
      setSearchResults((prev) => {
        const updated = prev.map((result) => {
          const newSelectedMatches = new Set<string>();
          if (result.atprotoMatches.length > 0) {
            newSelectedMatches.add(result.atprotoMatches[0].did);
          }
          return {
            ...result,
            selectedMatches: newSelectedMatches,
          };
        });

        const totalToSelect = updated.filter(
          (r) => r.atprotoMatches.length > 0
        ).length;
        onUpdate(`Selected ${totalToSelect} top matches`);

        return updated;
      });
    },
    []
  );

  const deselectAllMatches = useCallback(
    (onUpdate: (message: string) => void) => {
      setSearchResults((prev) =>
        prev.map((result) => ({
          ...result,
          selectedMatches: new Set<string>(),
        }))
      );
      onUpdate("Cleared all selections");
    },
    []
  );

  const totalSelected = searchResults.reduce(
    (total, result) => total + (result.selectedMatches?.size || 0),
    0
  );

  const totalFound = searchResults.filter(
    (r) => r.atprotoMatches.length > 0
  ).length;

  return {
    searchResults,
    setSearchResults,
    isSearchingAll,
    searchProgress,
    expandedResults,
    searchAllUsers,
    toggleMatchSelection,
    toggleExpandResult,
    selectAllMatches,
    deselectAllMatches,
    totalSelected,
    totalFound,
  };
}
