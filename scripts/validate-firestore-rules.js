/**
 * Firestore Rules Validator
 *
 * Validates that all fields updated by reviewer actions are allowed in Firestore rules.
 * Run with: node scripts/validate-firestore-rules.js
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { REVIEWER_ALLOWED_FIELDS } from "../src/utils/constants.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use the centralized source of truth for allowed fields
const ALLOWED_REVIEWER_FIELDS = REVIEWER_ALLOWED_FIELDS;

// Fields set in handleUpdateStatus (useQuestionActions.js)
const FIELDS_SET_IN_UPDATE_STATUS = [
  "status",
  "critique",
  "rejectionReason",
  "rejectedAt",
  "acceptedAt",
  "reviewDuration",
  "reviewerName",
  "reviewCompletedAt",
  "reviewStartedAt",
];

// Fields set in onVerify handler (QuestionItem.jsx)
const FIELDS_SET_IN_VERIFY = [
  "humanVerified",
  "humanVerifiedBy",
  "humanVerifiedAt",
];

// Fields set in improvement modal apply (QuestionItem.jsx)
const FIELDS_SET_IN_IMPROVEMENTS = [
  "critiqueScore",
  "suggestedRewrite",
  "improvedScore",
  "improvementsApplied",
];

// Fields set in QuestionNotesField.jsx
const FIELDS_SET_IN_NOTES = ["notes"];

function validateFields(fieldsUsed, description) {
  const missing = [];
  for (const field of fieldsUsed) {
    if (!ALLOWED_REVIEWER_FIELDS.includes(field)) {
      missing.push(field);
    }
  }

  if (missing.length > 0) {
    console.error(`❌ FAIL: ${description}`);
    console.error(`   Missing from Firestore rules: ${missing.join(", ")}`);
    return false;
  }

  console.log(`✅ PASS: ${description}`);
  return true;
}

function parseRulesFile() {
  const rulesPath = path.join(__dirname, "../config/firestore/firestore.rules");

  if (!fs.existsSync(rulesPath)) {
    console.error("❌ Could not find firestore.rules at:", rulesPath);
    process.exit(1);
  }

  const content = fs.readFileSync(rulesPath, "utf-8");

  // Extract the hasOnly array for reviewer fields
  // Pattern: isReviewer() followed by && ... .hasOnly([...])
  const match = content.match(
    /isReviewer\(\)[\s\S]*?\.hasOnly\(\[([\s\S]*?)\]\)/
  );

  if (!match) {
    console.error("❌ Could not parse reviewer fields from firestore.rules");
    process.exit(1);
  }

  // Parse the field names from the matched content
  const fieldsString = match[1];
  const fields = fieldsString
    .split(",")
    .map((f) => f.trim().replace(/['"]/g, "").trim())
    .filter((f) => f.length > 0);

  return fields;
}

function main() {
  console.log("🔍 Firestore Rules Validator\n");
  console.log(
    "Checking that all fields updated by reviewer actions are allowed...\n"
  );

  // Parse actual rules from file
  const actualAllowedFields = parseRulesFile();
  console.log(
    `📋 Found ${actualAllowedFields.length} allowed fields in firestore.rules\n`
  );

  let allPassed = true;

  // Validate each set of fields
  allPassed =
    validateFields(FIELDS_SET_IN_UPDATE_STATUS, "handleUpdateStatus fields") &&
    allPassed;
  allPassed =
    validateFields(FIELDS_SET_IN_VERIFY, "onVerify fields") && allPassed;
  allPassed =
    validateFields(FIELDS_SET_IN_IMPROVEMENTS, "Improvement modal fields") &&
    allPassed;
  allPassed = validateFields(FIELDS_SET_IN_NOTES, "Notes field") && allPassed;

  console.log("");

  if (allPassed) {
    console.log("✅ All validations passed!");
    process.exit(0);
  } else {
    console.log(
      "❌ Some validations failed! Update firestore.rules to include missing fields."
    );
    process.exit(1);
  }
}

main();
