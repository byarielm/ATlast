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
    estimateSize: () => 200, // Initial estimate, will be measured dynamically
    overscan: 3,
    // Enable dynamic measurement - virtualizer will measure actual rendered heights
    // and adjust positioning automatically
    measureElement:
      typeof window !== "undefined" && navigator.userAgent.indexOf("Firefox") === -1
        ? (element) => element.getBoundingClientRect().height
        : undefined,
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
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
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
