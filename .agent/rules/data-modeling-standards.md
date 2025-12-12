# 🗄️ Data Modeling Standards Guardrails

**Purpose:** Enforces foundational data integrity, consistency, and performance standards for all database schemas, object models, and API contracts.

## ⛔ Prohibited Structures

1.  **NO Untyped Schemas:** All new data models (SQL, NoSQL, or DTOs) must be explicitly typed and validated. Avoid generic or loosely defined structures.
2.  **NO Unindexed Foreign Keys:** Foreign key columns used for common joins must be backed by an appropriate index to prevent performance degradation.

## ✅ Required Standards (Passive Enforcement)

1.  **Mandatory Keys:** Every persistence entity MUST include a primary key (`id`) and audit columns (`created_at`, `updated_at`).
2.  **Consistent Naming:** All database tables/fields and API properties MUST use consistent snake_case (for SQL) or camelCase (for APIs/JSON) naming conventions.
3.  **Referential Integrity:** Enforce foreign key constraints or their equivalent in the persistence layer whenever a data relationship exists.