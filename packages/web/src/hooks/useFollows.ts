import { useState, useCallback } from "react";
import { apiClient } from "../lib/api/client";
import { FOLLOW_CONFIG } from "../config/constants";
import { getAtprotoApp } from "../lib/utils/platform";
import type { SearchResult, AtprotoSession, AtprotoAppId } from "../types";

export function useFollow(
  session: AtprotoSession | null,
  searchResults: SearchResult[],
  setSearchResults: (
    results: SearchResult[] | ((prev: SearchResult[]) => SearchResult[])
  ) => void,
  destinationAppId: AtprotoAppId
) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [isCheckingFollowStatus, setIsCheckingFollowStatus] = useState(false);

  const followSelectedUsers = useCallback(
    async (onUpdate: (message: string) => void): Promise<void> => {
      if (!session || isFollowing) return;

      const destinationApp = getAtprotoApp(destinationAppId);
      const followLexicon =
        destinationApp?.followLexicon || "app.bsky.graph.follow";
      const destinationName = destinationApp?.name || "Undefined App";

      const selectedUsers = searchResults.flatMap((result, resultIndex) =>
        result.atprotoMatches
          .filter((match) => result.selectedMatches?.has(match.did))
          .map((match) => ({ ...match, resultIndex }))
      );

      if (selectedUsers.length === 0) {
        const msg = "No users selected to follow";
        onUpdate(msg);
        alert(msg);
        return;
      }

      setIsCheckingFollowStatus(true);
      onUpdate(`Checking follow status for ${selectedUsers.length} users...`);

      let followStatusMap: Record<string, boolean> = {};
      try {
        const dids = selectedUsers.map((u) => u.did);
        followStatusMap = await apiClient.checkFollowStatus(
          dids,
          followLexicon
        );
      } catch (error) {
        console.error("Failed to check follow status:", error);
      } finally {
        setIsCheckingFollowStatus(false);
      }

      const usersToFollow = selectedUsers.filter(
        (user) => !followStatusMap[user.did]
      );
      const alreadyFollowingCount = selectedUsers.length - usersToFollow.length;

      if (alreadyFollowingCount > 0) {
        onUpdate(
          `${alreadyFollowingCount} user${alreadyFollowingCount > 1 ? "s" : ""} already followed. Following ${usersToFollow.length} remaining...`
        );

        setSearchResults((prev) =>
          prev.map((result) => ({
            ...result,
            atprotoMatches: result.atprotoMatches.map((match) => {
              if (followStatusMap[match.did]) {
                return {
                  ...match,
                  followStatus: {
                    ...match.followStatus,
                    [followLexicon]: true,
                  },
                };
              }
              return match;
            }),
          }))
        );
      }

      if (usersToFollow.length === 0) {
        onUpdate("All selected users are already being followed!");
        return;
      }

      setIsFollowing(true);
      onUpdate(
        `Following ${usersToFollow.length} users on ${destinationName}...`
      );
      let totalFollowed = 0;
      let totalFailed = 0;

      try {
        const { BATCH_SIZE } = FOLLOW_CONFIG;

        for (let i = 0; i < usersToFollow.length; i += BATCH_SIZE) {
          const batch = usersToFollow.slice(i, i + BATCH_SIZE);
          const dids = batch.map((user) => user.did);

          try {
            const data = await apiClient.batchFollowUsers(dids, followLexicon);
            totalFollowed += data.succeeded;
            totalFailed += data.failed;

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
                                  ? {
                                      ...match,
                                      followStatus: {
                                        ...match.followStatus,
                                        [followLexicon]: true,
                                      },
                                    }
                                  : match
                            ),
                          }
                        : searchResult
                    )
                  );
                }
              }
            });

            onUpdate(
              `Followed ${totalFollowed} of ${usersToFollow.length} users`
            );
          } catch (error) {
            totalFailed += batch.length;
            console.error("Batch follow error:", error);
          }
        }

        const finalMsg =
          `Successfully followed ${totalFollowed} users` +
          (alreadyFollowingCount > 0
            ? ` (${alreadyFollowingCount} already followed)`
            : "") +
          (totalFailed > 0 ? `. ${totalFailed} failed.` : "");
        onUpdate(finalMsg);
      } catch (error) {
        console.error("Batch follow error:", error);
        onUpdate("Error occurred while following users");
      } finally {
        setIsFollowing(false);
      }
    },
    [session, searchResults, setSearchResults, destinationAppId, isFollowing]
  );

  return {
    isFollowing,
    isCheckingFollowStatus,
    followSelectedUsers,
  };
}
