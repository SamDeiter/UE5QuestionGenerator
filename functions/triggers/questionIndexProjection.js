/**
 * Shared projection for the compact `questionIndex` mirror collection.
 *
 * Leaner Tier 3: the index keeps EVERY field the client reads for the
 * Review/Database list, status/discipline/tag/score/reviewer filters, counts,
 * client-side search (which matches `question` AND `options` text), and the
 * card body (question/options/correct). It drops ONLY the large, detail-only
 * fields that are shown lazily when a card is expanded — never used by the
 * list, filters, counts, or search. Those are fetched on demand from the full
 * `questions/{id}` doc.
 *
 * Using a denylist (rather than an allowlist) is deliberate: it guarantees a
 * newly-added question field can never silently disappear from filtering/search
 * just because we forgot to add it here. The only way a field leaves the index
 * is by being added to OMITTED_FIELDS on purpose.
 *
 * Shared by the questionIndexMaintainer trigger and the backfillQuestionIndex
 * migration so the two can never drift.
 */

// Large, detail-only fields shown only when a card is expanded. These are the
// payload savings — everything else is mirrored verbatim.
const OMITTED_FIELDS = [
  "sourceExcerpt",
  "sourceUrl",
  "explanation",
  "groundingSources",
  "editHistory",
];

/**
 * @param {Object} data - a full question document's data
 * @returns {Object} the same data minus the omitted detail-only fields
 */
function projectQuestionIndex(data) {
  const out = { ...data };
  for (const field of OMITTED_FIELDS) {
    delete out[field];
  }
  return out;
}

module.exports = { projectQuestionIndex, OMITTED_FIELDS };
