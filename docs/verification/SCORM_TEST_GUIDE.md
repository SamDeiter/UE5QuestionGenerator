# SCORM Export Verification Guide

**Status**: Logic Verified (Unit Tests Passed)
**Last Verified**: December 14, 2025

## Automated Verification

A unit test suite has been created at `src/services/__tests__/scormExporter.test.js`.
Run verification with:

```bash
npm test src/services/__tests__/scormExporter.test.js
```

This confirms:

* Questions are correctly converted to SCORM format.
* Manifest (imsmanifest.xml) is generated with correct title and ID.
* Validation logic correctly catches missing fields.

## Manual Browser Verification (Required for Presentation)

Before the presentation, perform this "Dry Run" in the browser:

1. **Launch App**: `npm run dev` and open in Chrome.
2. **Generate/Load Questions**: Ensure you have at least 5 questions in the session.
3. **Open Export Modal**: Click "Export SCORM 1.2" in the header/footer.
4. **Configure**:
    * Title: "Demo Quiz"
    * Passing Score: 80%
5. **Download**: Click "Export Package".
    * **Verify**: A `.zip` file should download immediately.
6. **Validate ZIP**:
    * Unzip the file.
    * Check for `imsmanifest.xml` at the root.
    * Check for `questions.js`. Open it and verify your questions are inside `window.QUESTIONS`.
7. **Test in SCORM Cloud (Optional)**:
    * Upload the ZIP to [SCORM Cloud](https://scorm.com/scorm-solved/scorm-cloud-features/) (Free account).
    * Launch the course.
    * Verify questions appear and scoring works.

## Troubleshooting

* **Download doesn't start**: Check browser console for errors. Ensure `public/scorm-template` files are accessible.
* **0 Questions**: Ensure you have active questions in the "Approved" or "Pending" state.
