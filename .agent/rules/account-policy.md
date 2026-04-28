# Account & API Access Policy

## Primary Account
All API access, cloud processing, and billing-related tasks MUST use the **Epic Games account**:
*   **Account:** `sam.deiter@epicgames.com`
*   **Method:** Use `gcloud auth application-default login` or `gcloud config set account` to ensure this identity is active.

## Project Management
*   **AI Inference (Vertex AI):** Use project `development-317819` (or other Epic-owned projects) for processing.
*   **Firestore/Firebase:** Target `ue5-questions-prod` (Project ID: `15582589808`).

## Pre-Execution Check
Before running any bulk processing script or cloud deployment, verify the active account:
```bash
gcloud config list account
```
Stop immediately if the account is not `sam.deiter@epicgames.com`.

## Project Classification
*   **Existing Projects:** If a project does not have a "Work" or "Personal" classification explicitly set in its documentation (e.g., `MAINTENANCE.md` or `.agent/rules`), the agent MUST ask the user to classify it immediately.
*   **New Projects:** See "New Project Initialization" below.

## New Project Initialization
Whenever creating a new project or initializing a new cloud service:
1.  **MANDATORY:** Ask the user if the project is for **Work** or **Personal** use.
2.  **Work:** Default to the Epic Games account and follow enterprise security/ADC workflows.
3.  **Personal:** Follow the appropriate personal API key/billing workflow as directed by the user.
