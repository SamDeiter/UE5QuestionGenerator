/**
 * Simple word-based diff utility for highlighting text changes
 * Returns array of {value, added, removed} objects
 */
export function diffWords(text1, text2) {
  // Normalize texts
  const words1 = (text1 || "").split(/(\s+)/);
  const words2 = (text2 || "").split(/(\s+)/);

  const result = [];
  let i = 0,
    j = 0;

  while (i < words1.length || j < words2.length) {
    // If words match, mark as unchanged
    if (i < words1.length && j < words2.length && words1[i] === words2[j]) {
      result.push({ value: words1[i] });
      i++;
      j++;
    }
    // If word only in text1, mark as removed
    else if (i < words1.length && !words2.includes(words1[i], j)) {
      result.push({ value: words1[i], removed: true });
      i++;
    }
    // If word only in text2, mark as added
    else if (j < words2.length && !words1.includes(words2[j], i)) {
      result.push({ value: words2[j], added: true });
      j++;
    }
    // Default: skip both
    else {
      if (i < words1.length) {
        result.push({ value: words1[i], removed: true });
        i++;
      }
      if (j < words2.length) {
        result.push({ value: words2[j], added: true });
        j++;
      }
    }
  }

  return result;
}

/**
 * Calculate text similarity percentage
 */
export function calculateSimilarity(text1, text2) {
  const words1 = new Set((text1 || "").toLowerCase().split(/\s+/));
  const words2 = new Set((text2 || "").toLowerCase().split(/\s+/));

  const intersection = new Set([...words1].filter((x) => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return union.size > 0 ? (intersection.size / union.size) * 100 : 0;
}
