# Third-Party Licenses
## UE5 Question Generator - Dependency Licenses

This document provides a comprehensive list of all third-party software, libraries, and assets used in this project, along with their respective licenses.

**Last Updated:** 2025-12-09  
**Project Version:** 1.7.0

---

## Project License

**UE5 Question Generator** is licensed under the MIT License.

Copyright (c) 2025 Sam Deiter

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

---

## Runtime Dependencies

### Core Framework

#### React (^18.3.1)
- **License:** MIT
- **Copyright:** Facebook, Inc. and its affiliates
- **URL:** https://github.com/facebook/react
- **Purpose:** UI framework

#### React DOM (^18.3.1)
- **License:** MIT
- **Copyright:** Facebook, Inc. and its affiliates
- **URL:** https://github.com/facebook/react
- **Purpose:** React rendering for web

---

### Firebase SDK

#### Firebase (^12.6.0)
- **License:** Apache-2.0
- **Copyright:** Google LLC
- **URL:** https://github.com/firebase/firebase-js-sdk
- **Purpose:** Authentication, Firestore database, Analytics
- **Modules Used:**
  - `firebase/app` - Core SDK
  - `firebase/auth` - Google OAuth authentication
  - `firebase/firestore` - Cloud Firestore database
  - `firebase/analytics` - Google Analytics integration

---

### Security Libraries

#### crypto-js (^4.2.0)
- **License:** MIT
- **Copyright:** Jeff Mott and contributors
- **URL:** https://github.com/brix/crypto-js
- **Purpose:** AES encryption for localStorage

#### DOMPurify (^3.3.1)
- **License:** Apache-2.0 OR MPL-2.0
- **Copyright:** Cure53 and contributors
- **URL:** https://github.com/cure53/DOMPurify
- **Purpose:** XSS prevention, HTML sanitization

---

### UI Components & Utilities

#### Lucide React (^0.460.0)
- **License:** ISC
- **Copyright:** Lucide Contributors
- **URL:** https://github.com/lucide-icons/lucide
- **Purpose:** Icon library (replaces Feather Icons)

#### Recharts (^3.5.1)
- **License:** MIT
- **Copyright:** Recharts Group
- **URL:** https://github.com/recharts/recharts
- **Purpose:** Analytics charts and data visualization

#### React Virtuoso (^4.15.0)
- **License:** MIT
- **Copyright:** Petyo Ivanov
- **URL:** https://github.com/petyosi/react-virtuoso
- **Purpose:** Virtual scrolling for large question lists

#### date-fns (^4.1.0)
- **License:** MIT
- **Copyright:** date-fns contributors
- **URL:** https://github.com/date-fns/date-fns
- **Purpose:** Date formatting and manipulation

---

## Development Dependencies

### Build Tools

#### Vite (^7.2.4)
- **License:** MIT
- **Copyright:** Yuxi (Evan) You and Vite contributors
- **URL:** https://github.com/vitejs/vite
- **Purpose:** Build tool and dev server

#### @vitejs/plugin-react (^4.3.3)
- **License:** MIT
- **Copyright:** Vite contributors
- **URL:** https://github.com/vitejs/vite-plugin-react
- **Purpose:** React support for Vite

---

### CSS Framework

#### Tailwind CSS (^3.4.15)
- **License:** MIT
- **Copyright:** Tailwind Labs, Inc.
- **URL:** https://github.com/tailwindlabs/tailwindcss
- **Purpose:** Utility-first CSS framework

#### PostCSS (^8.4.49)
- **License:** MIT
- **Copyright:** Andrey Sitnik
- **URL:** https://github.com/postcss/postcss
- **Purpose:** CSS transformation

#### Autoprefixer (^10.4.20)
- **License:** MIT
- **Copyright:** Andrey Sitnik
- **URL:** https://github.com/postcss/autoprefixer
- **Purpose:** Vendor prefix automation

---

### Testing

#### Vitest (^4.0.14)
- **License:** MIT
- **Copyright:** Anthony Fu and contributors
- **URL:** https://github.com/vitest-dev/vitest
- **Purpose:** Unit testing framework

#### @testing-library/react (^16.3.0)
- **License:** MIT
- **Copyright:** Kent C. Dodds
- **URL:** https://github.com/testing-library/react-testing-library
- **Purpose:** React component testing utilities

#### @testing-library/jest-dom (^6.9.1)
- **License:** MIT
- **Copyright:** Kent C. Dodds
- **URL:** https://github.com/testing-library/jest-dom
- **Purpose:** Custom Jest matchers for DOM

#### @testing-library/user-event (^14.6.1)
- **License:** MIT
- **Copyright:** Giorgio Polvara
- **URL:** https://github.com/testing-library/user-event
- **Purpose:** User interaction simulation

#### jsdom (^27.2.0)
- **License:** MIT
- **Copyright:** jsdom contributors
- **URL:** https://github.com/jsdom/jsdom
- **Purpose:** DOM implementation for Node.js

---

### Code Quality

#### ESLint (^9.15.0)
- **License:** MIT
- **Copyright:** Nicholas C. Zakas and contributors
- **URL:** https://github.com/eslint/eslint
- **Purpose:** JavaScript linting

#### eslint-plugin-react (^7.37.2)
- **License:** MIT
- **Copyright:** Yannick Croissant
- **URL:** https://github.com/jsx-eslint/eslint-plugin-react
- **Purpose:** React-specific linting rules

#### eslint-plugin-react-hooks (^5.0.0)
- **License:** MIT
- **Copyright:** Facebook, Inc.
- **URL:** https://github.com/facebook/react
- **Purpose:** React Hooks linting rules

#### eslint-plugin-react-refresh (^0.4.14)
- **License:** MIT
- **Copyright:** Arnaud Barré
- **URL:** https://github.com/ArnaudBarre/eslint-plugin-react-refresh
- **Purpose:** React Fast Refresh validation

---

### Deployment

#### gh-pages (^6.3.0)
- **License:** MIT
- **Copyright:** Tim Schaub
- **URL:** https://github.com/tschaub/gh-pages
- **Purpose:** GitHub Pages deployment

---

## Fonts & Typography

### System Fonts
This project uses system font stack for optimal performance:

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 
             'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 
             'Droid Sans', 'Helvetica Neue', sans-serif;
```

**Licenses:**
- **Segoe UI:** Microsoft Corporation (Windows system font)
- **Roboto:** Apache-2.0 (Google, included in Android/Chrome OS)
- **San Francisco (-apple-system):** Apple Inc. (macOS/iOS system font)
- **Ubuntu:** Ubuntu Font License 1.0
- **Oxygen:** SIL Open Font License 1.1
- **Cantarell:** SIL Open Font License 1.1
- **Fira Sans:** SIL Open Font License 1.1

All system fonts are used via their respective operating systems and are not redistributed with this application.

---

## External Services & APIs

### Google Gemini AI
- **Service:** Generative Language API
- **Provider:** Google LLC
- **Terms:** https://ai.google.dev/gemini-api/terms
- **Usage:** Question generation via API
- **License:** Proprietary (API access subject to Google's terms)
- **Note:** API keys required, not included in repository

### Google Firebase
- **Service:** Firebase Platform (Auth, Firestore, Analytics)
- **Provider:** Google LLC
- **Terms:** https://firebase.google.com/terms
- **License:** Proprietary (service subject to Firebase terms)
- **Components:**
  - Firebase Authentication (Google OAuth)
  - Cloud Firestore (database)
  - Google Analytics for Firebase

### Google Sheets API
- **Service:** Google Sheets API v4
- **Provider:** Google LLC
- **Terms:** https://developers.google.com/sheets/api/terms
- **Usage:** Question export functionality
- **License:** Proprietary (API access subject to Google's terms)

---

## Assets & Resources

### Unreal Engine Logo
- **Asset:** UE-Icon-2023-Black.svg
- **Copyright:** Epic Games, Inc.
- **Usage:** Educational/reference purposes
- **Note:** Unreal Engine® is a trademark of Epic Games, Inc. This project is not affiliated with or endorsed by Epic Games.

---

## Python Dependencies (Development Tools)

The following Python libraries are used in development/deployment scripts:

### Standard Library Modules
- `os`, `sys`, `subprocess`, `json`, `shutil`, `pathlib`
- **License:** Python Software Foundation License
- **URL:** https://docs.python.org/3/license.html

### No Third-Party Python Packages Required
All Python scripts use only standard library modules.

---

## License Compatibility Matrix

| Library | License | Compatible with MIT? |
|---------|---------|---------------------|
| React | MIT | ✅ Yes |
| Firebase SDK | Apache-2.0 | ✅ Yes |
| crypto-js | MIT | ✅ Yes |
| DOMPurify | Apache-2.0 / MPL-2.0 | ✅ Yes |
| Lucide React | ISC | ✅ Yes |
| Recharts | MIT | ✅ Yes |
| Vite | MIT | ✅ Yes |
| Tailwind CSS | MIT | ✅ Yes |
| All dev dependencies | MIT / Apache-2.0 | ✅ Yes |

**All dependencies are compatible with MIT license.**

---

## Complete License Texts

### MIT License (Multiple Dependencies)

```
MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Apache License 2.0 (Firebase, DOMPurify)

Full text available at: https://www.apache.org/licenses/LICENSE-2.0

### ISC License (Lucide React)

```
ISC License

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

---

## Disclaimer

This software is provided for educational and development purposes. While every effort has been made to ensure license compliance, users are responsible for verifying compliance with all applicable licenses when redistributing or modifying this software.

---

## How to Update This Document

When adding new dependencies:

1. Check `package.json` for new packages
2. Visit package repository (usually on GitHub/npm)
3. Find LICENSE file or package.json "license" field
4. Add entry to appropriate section above
5. Update compatibility matrix if needed
6. Update "Last Updated" date

---

**For questions about licensing, contact:** sam.deiter@example.com  
**Repository:** https://github.com/SamDeiter/UE5QuestionGenerator
