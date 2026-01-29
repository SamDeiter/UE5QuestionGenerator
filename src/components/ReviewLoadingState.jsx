import React from "react";

/**
 * ReviewLoadingState - Loading spinner for Review mode initial data fetch
 * Displayed when questions are still loading from Firestore
 */
const ReviewLoadingState = () => (
  <div className="flex flex-col items-center justify-center h-full py-16 px-8">
    <div className="relative mb-6">
      <div className="w-16 h-16 border-4 border-indigo-200/30 border-t-indigo-500 rounded-full animate-spin" />
    </div>
    <h3 className="text-lg font-semibold text-white mb-2">Loading Questions</h3>
    <p className="text-slate-400 text-sm">Syncing from database...</p>
  </div>
);

export default ReviewLoadingState;
