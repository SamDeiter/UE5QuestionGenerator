# Task Summary: Expand Question View

## Completed Tasks

1. **Expanded Question List Height:**
    * Replaced the fixed `max-h-[600px]` limit with a dynamic calculation `h-[calc(100vh-280px)]`.
    * Added a `min-h-[600px]` fallback to ensure it never gets too small on cramped screens.
    * This ensures the question list extends to the bottom of the user's viewport, maximizing the visible area for reviewing regular and mock questions.

## Verification

- **UI:** The question list card should now be significantly taller on standard 1080p+ monitors, filling the available vertical space.
* **Scroll:** Overflow scrolling remains active if the list exceeds the viewport.

## Passive Rules Check

- [x] **Security:** Safe.
* [x] **Quality:** Responsive design best practice.
* [x] **Accessibility:** No loss of functionality.

## Next Steps

- User completes their review of the Test View.
