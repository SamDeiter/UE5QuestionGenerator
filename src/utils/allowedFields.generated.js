/**
 * AUTO-GENERATED FILE - DO NOT EDIT DIRECTLY
 * 
 * Run: npm run validate:rules
 * Generated from: config/firestore/firestore.rules
 * 
 * These are the fields that reviewers are allowed to update.
 * If you need to add a new field, update firestore.rules first.
 */

export const REVIEWER_ALLOWED_FIELDS = [
  "version",
  "updatedAt",
  "firestoreUpdatedAt",
  "modifiedAt",
  "question",
  "options",
  "correct",
  "correctLetter",
  "aiScore",
  "scoredAt",
  "scoreSource",
  "status",
  "rejectionReason",
  "rejectionCategory",
  "rejectionNotes",
  "rejectedAt",
  "rejectedBy",
  "acceptedAt",
  "acceptedBy",
  "reviewedBy",
  "reviewedAt",
  "reviewCompletedAt",
  "reviewerName",
  "reviewDuration",
  "reviewStartedAt",
  "critique",
  "critiqueScore",
  "suggestedRewrite",
  "improvedScore",
  "improvementsApplied",
  "rewriteChanges",
  "critiqueAttempts",
  "previousCritiqueScore",
  "humanVerified",
  "humanVerifiedBy",
  "humanVerifiedAt",
  "kickedBackAt",
  "kickedBackBy",
  "kickedBackReason",
  "tags",
  "difficulty",
  "_backfilledHumanVerified",
  "_backfilledAt",
  "tagsBackfilledAt",
  "originalVersion",
  "versionSource",
  "lastEditedBy",
  "lastEditedAt",
  "notes"
];

/**
 * Check if a field is allowed for reviewer updates
 */
export const isFieldAllowed = (fieldName) => {
  return REVIEWER_ALLOWED_FIELDS.includes(fieldName);
};

/**
 * Filter an update object to only include allowed fields
 */
export const filterToAllowedFields = (updateObject) => {
  const filtered = {};
  for (const [key, value] of Object.entries(updateObject)) {
    if (isFieldAllowed(key)) {
      filtered[key] = value;
    }
  }
  return filtered;
};
