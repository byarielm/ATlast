import React, { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import SearchResultCard from "./SearchResultCard";
import type { SearchResult } from "../types";
import type { AtprotoAppId } from "../types/settings";

interface VirtualizedResultsListProps {
  results: SearchResult[];
  expandedResults: Set<number>;
  onToggleExpand: (index: number) => void;
  onToggleMatchSelection: (resultIndex: number, did: string) => void;
  sourcePlatform: string;
  destinationAppId: AtprotoAppId;
}

const VirtualizedResultsList: React.FC<VirtualizedResultsListProps> = ({
  results,
  expandedResults,
  onToggleExpand,
  onToggleMatchSelection,
  sourcePlatform,
  destinationAppId,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const result = results[index];
      const isExpanded = expandedResults.has(index);
      const matchCount = result.atprotoMatches.length;

      // Base height for source user header + padding
      let estimatedHeight = 80;

      if (matchCount === 0) {
        // No matches - just the "not found" message
        estimatedHeight += 100;
      } else {
        // Calculate height based on number of visible matches
        const visibleMatches = isExpanded ? matchCount : 1;

        // Each match item: ~120px base + potential description (~40px)
        // Assume ~30% of matches have descriptions
        const avgMatchHeight = 140;
        estimatedHeight += visibleMatches * avgMatchHeight;

        // Add space for "show more" button if there are hidden matches
        if (matchCount > 1) {
          estimatedHeight += 40;
        }
      }

      return estimatedHeight;
    },
    overscan: 3, // Render 3 extra items above/below viewport (reduced from 5 for better performance)
  });

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const result = results[virtualItem.index];

          return (
            <div
              key={virtualItem.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <div className="pb-4">
                <SearchResultCard
                  result={result}
                  resultIndex={virtualItem.index}
                  isExpanded={expandedResults.has(virtualItem.index)}
                  onToggleExpand={() => onToggleExpand(virtualItem.index)}
                  onToggleMatchSelection={(did) =>
                    onToggleMatchSelection(virtualItem.index, did)
                  }
                  sourcePlatform={sourcePlatform}
                  destinationAppId={destinationAppId}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VirtualizedResultsList;
