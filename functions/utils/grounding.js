/**
 * Utility: Extract Google Search grounding sources
 * Extracted from index.js during modularization
 */

function extractGroundingSources(responseData) {
  const groundingMetadata = responseData.candidates?.[0]?.groundingMetadata;
  const sources = [];

  if (groundingMetadata?.groundingChunks) {
    groundingMetadata.groundingChunks.forEach((chunk) => {
      if (chunk.web?.uri && chunk.web?.title) {
        const url = chunk.web.uri.toLowerCase();

        // Only accept Epic Games documentation
        if (url.includes("dev.epicgames.com/documentation")) {
          sources.push({
            url: chunk.web.uri,
            title: chunk.web.title,
          });
        }
      }
    });
  }

  return sources;
}


module.exports = { extractGroundingSources };
