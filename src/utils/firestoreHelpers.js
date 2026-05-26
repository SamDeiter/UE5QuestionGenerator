/**
 * Firestore helpers — shared utilities for working with Firestore values
 * that arrive in inconsistent shapes (Timestamp objects, serialized
 * {seconds, nanoseconds} blobs, ISO strings, null).
 */

/**
 * Normalize any firestoreUpdatedAt-like value to a millisecond epoch.
 *
 * Accepts:
 *   - Firestore Timestamp (has `.toMillis()`)
 *   - Serialized timestamp object `{ seconds, nanoseconds }` (older bulk
 *     imports stored this shape instead of a real Timestamp)
 *   - ISO date string
 *   - number (passed through unchanged)
 *   - null/undefined/falsy → 0
 *
 * Returns 0 when the value is unparseable, so callers can safely
 * `Math.max(0, ...)` reduce.
 */
export const toMillis = (v) => {
  if (!v) return 0;
  if (typeof v === "number") return v;
  if (typeof v.toMillis === "function") return v.toMillis();
  if (typeof v.seconds === "number") {
    return v.seconds * 1000 + (v.nanoseconds || 0) / 1e6;
  }
  if (typeof v === "string") {
    const parsed = Date.parse(v);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};
