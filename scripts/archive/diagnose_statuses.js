/**
 * Run this in the browser console to see the status breakdown
 * of all "Other" questions in the current discipline
 */

// Get all questions with "other" statuses
const otherQuestions = window.__REACT_DEVTOOLS_GLOBAL_HOOK__
  ? []
  : contextFilteredQuestions?.filter(
      (q) =>
        q.status &&
        q.status !== "pending" &&
        q.status !== "accepted" &&
        q.status !== "rejected"
    ) || [];

// Count by status
const statusBreakdown = {};
otherQuestions.forEach((q) => {
  const status = q.status || "(empty)";
  statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
});

console.log("📊 Status Breakdown for 'Other' Questions:");
console.table(statusBreakdown);
console.log("\nTotal 'Other' questions:", otherQuestions.length);

// Show first 5 examples
console.log("\n📝 First 5 examples:");
otherQuestions.slice(0, 5).forEach((q) => {
  console.log(
    `- Status: "${q.status}" | Question: ${q.question?.substring(0, 80)}...`
  );
});
