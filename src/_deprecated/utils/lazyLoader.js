/**
 * Lazy Loader Utility
 * Processes large arrays in chunks to prevent blocking the main thread
 */

/**
 * Process a large array in chunks, yielding control back to the browser
 * @param {Array} items - Array of items to process
 * @param {Function} processor - Function to call for each item
 * @param {Object} options - Configuration options
 * @param {number} options.chunkSize - Number of items to process per chunk (default: 100)
 * @param {Function} options.onProgress - Callback for progress updates (current, total)
 * @returns {Promise<void>}
 */
export const processInChunks = async (
  items,
  processor,
  { chunkSize = 100, onProgress } = {}
) => {
  const total = items.length;

  for (let i = 0; i < total; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);

    // Process this chunk
    chunk.forEach(processor);

    // Report progress
    if (onProgress) {
      onProgress(Math.min(i + chunkSize, total), total);
    }

    // Yield control back to browser
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
};

/**
 * Load items into state gradually without blocking UI
 * @param {Array} items - Items to load
 * @param {Function} setState - React setState function
 * @param {Object} options - Configuration options
 * @returns {Promise<void>}
 */
export const loadItemsLazily = async (items, setState, options = {}) => {
  const { chunkSize = 100, onProgress } = options;

  // Clear existing state
  setState([]);

  const chunks = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    // Append chunk to state
    setState((prev) => [...prev, ...chunk]);

    // Report progress
    if (onProgress) {
      onProgress((i + 1) * chunkSize, items.length);
    }

    // Yield to browser
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
};
