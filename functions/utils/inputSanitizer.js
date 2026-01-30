const functions = require("firebase-functions");

/**
 * SECURITY: Sanitize user input to prevent XSS and injection attacks
 * @param {string} input - User input to sanitize
 * @returns {string} Sanitized input
 */
function sanitizeInput(input) {
  if (typeof input !== "string") {
    return String(input);
  }

  // Remove potential XSS vectors
  const sanitized = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "");

  // Limit length to prevent DoS
  const MAX_INPUT_LENGTH = 10000;
  if (sanitized.length > MAX_INPUT_LENGTH) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Input too long (max ${MAX_INPUT_LENGTH} characters)`
    );
  }

  return sanitized.trim();
}

/**
 * SECURITY: Detect and block prompt injection attempts
 * @param {string} text - Text to check for injection patterns
 * @throws {HttpsError} If injection attempt detected
 */
function validateNoPromptInjection(text) {
  const dangerousPatterns = [
    /ignore\s+(previous|all|prior)\s+instructions?/i,
    /system:\s*you\s+are/i,
    /^\s*\/\w+/m, // Command-like inputs
    /<\|.*?\|>/, // Special tokens
    /\[INST\]/i, // Instruction markers
    /###\s*System/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(text)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Invalid input detected - potential prompt injection"
      );
    }
  }
}

/**
 * SECURITY: Validate email format
 * @param {string} email - Email address to validate
 * @returns {string} Validated and normalized email
 * @throws {HttpsError} If email is invalid
 */
function validateEmail(email) {
  if (typeof email !== "string") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Email must be a string"
    );
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Invalid email format"
    );
  }

  // Prevent injection attempts
  if (
    email.includes("<") ||
    email.includes(">") ||
    email.includes("'") ||
    email.includes('"')
  ) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Invalid characters in email"
    );
  }

  return email.toLowerCase().trim();
}

module.exports = {
  sanitizeInput,
  validateNoPromptInjection,
  validateEmail,
};
