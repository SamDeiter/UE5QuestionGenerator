# 🚀 ACTION REQUIRED: Redeploy Google Apps Script

To enable the new Data Export features (Rejection Reasons, Verification Metadata), you must update your Google Apps Script.

## Instructions

1. **Open your Google Apps Script Project** (The URL you are using as `sheetUrl`).
2. **Copy the code** from `Code.gs` in this repository (it has been updated to v2.0).
3. **Paste** it into the script editor, replacing the old code.
4. **Click "Deploy" > "New Deployment"**.
5. **Select Type**: "Web App".
6. **Description**: "v2.0 - Analysis Metadata".
7. **Execute as**: "Me".
8. **Who has access**: "Anyone".
9. **Click "Deploy"**.
10. **Copy the NEW URL** (if it changed) and update it in the App Settings. 
    *   *Note: If you use "Manage Deployments" and edit the existing one to use the "New Version", the URL stays the same!*

## What's New?
- **RejectionReason**: See why a question was rejected (e.g., "Hallucination").
- **HumanVerification**: See who verified the question.
- **Status**: Now correctly logs "Rejected" vs "Accepted" (previously hardcoded to "Approved").
