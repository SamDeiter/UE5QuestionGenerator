/**
 * Firestore Fields Validation Script
 *
 * Parses the Firestore rules file to extract allowed reviewer fields
 * and validates that any fields being updated in code are in the allowed list.
 *
 * Usage: node scripts/validate-firestore-fields.js
 *
 * Exit codes:
 *   0 - All fields validated
 *   1 - Validation errors found
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const RULES_FILE = path.join(__dirname, "../config/firestore/firestore.rules");
const OUTPUT_FILE = path.join(
  __dirname,
  "../src/utils/allowedFields.generated.js",
);

/**
 * Parse Firestore rules to extract reviewer-allowed fields
 */
function parseFirestoreRules(rulesContent) {
  // Find the hasOnly block with field list
  const hasOnlyMatch = rulesContent.match(/\.hasOnly\(\[([\s\S]*?)\]\)/);

  if (!hasOnlyMatch) {
    console.error("❌ Could not find .hasOnly() block in Firestore rules");
    process.exit(1);
  }

  const fieldsBlock = hasOnlyMatch[1];

  // Extract all quoted field names
  const fieldMatches = fieldsBlock.match(/'([^']+)'/g);

  if (!fieldMatches) {
    console.error("❌ Could not extract field names from rules");
    process.exit(1);
  }

  // Clean up field names (remove quotes)
  const fields = fieldMatches.map((f) => f.replace(/'/g, ""));

  return fields;
}

/**
 * Generate a TypeScript/JavaScript file with allowed fields
 */
function generateFieldsFile(fields) {
  const content = `/**
 * AUTO-GENERATED FILE - DO NOT EDIT DIRECTLY
 * 
 * Run: npm run validate:rules
 * Generated from: config/firestore/firestore.rules
 * 
 * These are the fields that reviewers are allowed to update.
 * If you need to add a new field, update firestore.rules first.
 */

export const REVIEWER_ALLOWED_FIELDS = ${JSON.stringify(fields, null, 2)};

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
`;

  return content;
}

/**
 * Main execution
 */
function main() {
  console.log("🔍 Validating Firestore rules...");

  // Read rules file
  if (!fs.existsSync(RULES_FILE)) {
    console.error(`❌ Rules file not found: ${RULES_FILE}`);
    process.exit(1);
  }

  const rulesContent = fs.readFileSync(RULES_FILE, "utf8");
  console.log(`✓ Read rules file: ${RULES_FILE}`);

  // Parse fields
  const fields = parseFirestoreRules(rulesContent);
  console.log(`✓ Found ${fields.length} allowed fields`);

  // Display fields grouped by category
  console.log("\n📋 Allowed Reviewer Fields:");
  console.log("─".repeat(50));
  fields.forEach((field, i) => {
    console.log(`   ${(i + 1).toString().padStart(2)}. ${field}`);
  });
  console.log("─".repeat(50));

  // Generate output file
  const outputContent = generateFieldsFile(fields);
  fs.writeFileSync(OUTPUT_FILE, outputContent, "utf8");
  console.log(`\n✓ Generated: ${OUTPUT_FILE}`);

  console.log("\n✅ Firestore rules validation complete!");
}

// Run
main();
