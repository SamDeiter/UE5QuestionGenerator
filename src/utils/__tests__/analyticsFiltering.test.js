import { describe, it, expect } from "vitest";

// Simulating the filtering logic in AnalyticsView/AnalyticsDashboard
const filterByTimeRange = (questions, days) => {
  if (days === null) return questions;
  const now = new Date();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  return questions.filter((q) => {
    const dateValue = q.created || q.timestamp || q.dateAdded;
    return new Date(dateValue) >= cutoff;
  });
};

describe("Analytics Date Filtering", () => {
  const now = new Date();
  const yesterday = new Date(
    now.getTime() - 24 * 60 * 60 * 1000 - 1000
  ).toISOString();
  const threeDaysAgo = new Date(
    now.getTime() - 3 * 24 * 60 * 60 * 1000
  ).toISOString();
  const tenDaysAgo = new Date(
    now.getTime() - 10 * 24 * 60 * 60 * 1000
  ).toISOString();

  const mockQuestions = [
    { id: "1", created: now.toISOString(), status: "accepted" },
    { id: "2", timestamp: yesterday, status: "accepted" },
    { id: "3", dateAdded: threeDaysAgo, status: "accepted" },
    { id: "4", created: tenDaysAgo, status: "accepted" },
  ];

  it("should filter correctly for 24h range (1 day)", () => {
    const filtered = filterByTimeRange(mockQuestions, 1);
    expect(filtered.length).toBe(1); // Only question '1' is >= cutoff
    expect(filtered[0].id).toBe("1");
  });

  it("should filter correctly for 7d range", () => {
    const filtered = filterByTimeRange(mockQuestions, 7);
    expect(filtered.length).toBe(3); // 1, 2, 3 are within 7 days
    const ids = filtered.map((q) => q.id);
    expect(ids).toContain("1");
    expect(ids).toContain("2");
    expect(ids).toContain("3");
  });

  it("should filter correctly for 15d range", () => {
    const filtered = filterByTimeRange(mockQuestions, 15);
    expect(filtered.length).toBe(4); // All are within 15 days
  });

  it("should handle missing created field and use timestamp/dateAdded", () => {
    const mixedQuestions = [
      { id: "a", timestamp: now.toISOString() },
      { id: "b", dateAdded: now.toISOString() },
      { id: "c", created: now.toISOString() },
    ];
    const filtered = filterByTimeRange(mixedQuestions, 1);
    expect(filtered.length).toBe(3);
  });
});
