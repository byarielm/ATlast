import { useState } from "react";
import { apiClient } from "../lib/apiClient";
import { FOLLOW_CONFIG } from "../constants/platforms";
import type { SearchResult, AtprotoSession } from "../types";

export function useFollow(
  session: AtprotoSession | null,
  searchResults: SearchResult[],
  setSearchResults: (
    results: SearchResult[] | ((prev: SearchResult[]) => SearchResult[]),
  ) => void,
) {
  const [isFollowing, setIsFollowing] = useState(false);

  async function followSelectedUsers(
    onUpdate: (message: string) => void,
  ): Promise<void> {
    if (!session || isFollowing) return;

    const selectedUsers = searchResults.flatMap((result, resultIndex) =>
      result.atprotoMatches
        .filter((match) => result.selectedMatches?.has(match.did))
        .map((match) => ({ ...match, resultIndex })),
    );

    if (selectedUsers.length === 0) {
      const msg = "No users selected to follow";
      onUpdate(msg);
      alert(msg);
      return;
    }

    setIsFollowing(true);
    onUpdate(`Following ${selectedUsers.length} users...`);
    let totalFollowed = 0;
    let totalFailed = 0;

    try {
      const { BATCH_SIZE } = FOLLOW_CONFIG;

      for (let i = 0; i < selectedUsers.length; i += BATCH_SIZE) {
        const batch = selectedUsers.slice(i, i + BATCH_SIZE);
        const dids = batch.map((user) => user.did);

        try {
          const data = await apiClient.batchFollowUsers(dids);
          totalFollowed += data.succeeded;
          totalFailed += data.failed;

          // Mark successful follows in UI
          data.results.forEach((result) => {
            if (result.success) {
              const user = batch.find((u) => u.did === result.did);
              if (user) {
                setSearchResults((prev) =>
                  prev.map((searchResult, index) =>
                    index === user.resultIndex
                      ? {
                          ...searchResult,
                          atprotoMatches: searchResult.atprotoMatches.map(
                            (match) =>
                              match.did === result.did
                                ? { ...match, followed: true }
                                : match,
                          ),
                        }
                      : searchResult,
                  ),
                );
              }
            }
          });

          onUpdate(
            `Followed ${totalFollowed} of ${selectedUsers.length} users`,
          );
        } catch (error) {
          totalFailed += batch.length;
          console.error("Batch follow error:", error);
        }

        // Rate limit handling is in the backend
      }

      const finalMsg = `Successfully followed ${totalFollowed} users${totalFailed > 0 ? `. ${totalFailed} failed.` : ""}`;
      onUpdate(finalMsg);
    } catch (error) {
      console.error("Batch follow error:", error);
      onUpdate("Error occurred while following users");
    } finally {
      setIsFollowing(false);
    }
  }

  return {
    isFollowing,
    followSelectedUsers,
  };
}
