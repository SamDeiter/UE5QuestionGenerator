# 🛡️ Java Security Guardrails (Continuous Rule)

**Purpose:** These are the non-negotiable, always-on security constraints and code safety standards that MUST be adhered to by any agent modifying or generating Java code. These rules are to be applied automatically and continuously to prevent common vulnerabilities.

## ⛔ Forbidden Practices

The following patterns and practices are strictly prohibited in all new and refactored Java code:

1.  **NO SQL Injection:** Never use string concatenation to build database queries. All database access must use modern parameterized statements (e.g., `PreparedStatement` or ORM framework methods).
2.  **NO Command Injection:** The use of `Runtime.exec()`, `ProcessBuilder`, or similar APIs to execute shell commands with user-supplied input is forbidden.
3.  **NO Hardcoded Secrets:** Configuration files, code, or environment variables in the repository must not contain passwords, API keys, private keys, or security tokens. Secrets must be loaded dynamically from a dedicated secret store (e.g., HashiCorp Vault, AWS Secrets Manager, or Google Cloud Secret Manager).
4.  **NO Legacy Crypto:** Do not use deprecated or insecure cryptographic algorithms (e.g., MD5, SHA1 for hashing; ECB mode for encryption). Always default to modern, industry-standard algorithms (e.g., Argon2 or Scrypt for password hashing; AES-256 GCM for encryption).

## ✅ Required Practices

The agent must enforce the following security requirements:

1.  **Input Validation:** All user and external input must be rigorously validated (whitelist-validated, sanitized, and type-checked) before being used in critical operations, HTML output, or database queries.
2.  **Modern APIs:** Use modern, maintained APIs and libraries (e.g., `java.time` instead of `java.util.Date`, modern logging frameworks like Log4j2 or Logback).
3.  **Secure Headers:** When generating code that handles HTTP responses, ensure security headers are configured, specifically enforcing HTTPS/HSTS, and appropriate CORS policies.
4.  **Least Privilege:** All database connections, API calls, and file system operations must use accounts with the minimum required permissions necessary for the task.