---
trigger: always_on
---

* Never create components larger than 150 lines of code; refactor into smaller, focused functional components.
* Separate all component logic (e.g., custom hooks) into a sibling 'hooks/' directory.
* Components must be placed in a file named after the component (e.g., 'UserCard' in 'UserCard.js').
* All Redux state logic must be handled using Redux Toolkit and modern Redux patterns (e.g., createSlice).
* Actions and reducers must be co-located within the feature's slice file.