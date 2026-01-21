import React from "react";
import Skeleton from "./Skeleton";

export const SearchResultSkeleton: React.FC = () => {
  return (
    <div className="overflow-hidden rounded-2xl border-2 border-slate-200 bg-white/95 shadow-sm backdrop-blur-xl dark:border-slate-700 dark:bg-slate-800/95">
      {/* Source User Skeleton */}
      <div className="border-b-2 border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
        <div className="flex items-center space-x-3">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1 space-y-2">
            <Skeleton height={16} width="40%" />
            <Skeleton height={12} width="30%" />
          </div>
          <Skeleton height={20} width={64} className="rounded-full" />
        </div>
      </div>

      {/* Match Skeleton */}
      <div className="p-4">
        <div className="flex items-start space-x-3 rounded-xl border-2 border-amber-200 bg-amber-50 p-3 dark:border-amber-800/30 dark:bg-amber-900/10">
          <Skeleton variant="circular" width={48} height={48} />
          <div className="flex-1 space-y-2">
            <Skeleton height={16} width="75%" />
            <Skeleton height={12} width="50%" />
            <Skeleton height={12} width="100%" />
            <div className="mt-2 flex gap-2">
              <Skeleton height={20} width={80} className="rounded-full" />
              <Skeleton height={20} width={100} className="rounded-full" />
            </div>
          </div>
          <Skeleton width={80} height={32} className="rounded-full" />
        </div>
      </div>
    </div>
  );
};

export const UploadHistorySkeleton: React.FC = () => {
  return (
    <div className="flex items-center space-x-4 rounded-xl border-2 border-purple-500/30 bg-purple-100/50 p-4 dark:border-cyan-500/30 dark:bg-slate-900/50">
      <Skeleton variant="rectangular" width={48} height={48} />
      <div className="flex-1 space-y-2">
        <Skeleton height={16} width="60%" />
        <Skeleton height={12} width="40%" />
      </div>
    </div>
  );
};

export const ProfileSkeleton: React.FC = () => {
  return (
    <div className="flex items-center space-x-3 p-3">
      <Skeleton variant="circular" width={48} height={48} />
      <div className="flex-1 space-y-2">
        <Skeleton height={16} width="50%" />
        <Skeleton height={12} width="70%" />
      </div>
    </div>
  );
};
