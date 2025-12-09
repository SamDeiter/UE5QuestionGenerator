# Third-Party Licenses
## UE5 Question Generator - Dependency Licenses

This document provides a comprehensive list of all third-party software, libraries, and assets used in this project, along with their respective licenses.

**Last Updated:** 2025-12-09  
**Project Version:** 1.7.0

---

## Project License

**UE5 Question Generator** is licensed under the MIT License.

### Authorship & Development Context

**Creator:** Sam Deiter, Epic Games Employee  
**Development Context:** Created as an Epic Games employee to support the Unreal Authorized Instructor Program  
**License Choice:** Intentionally released under MIT License (open source) to maximize accessibility for the educational community  
**Purpose:** Internal tool for Epic Games' official education initiatives, made publicly available to benefit the broader Unreal Engine education ecosystem

**Note on Intellectual Property:**
This tool was created by an Epic Games employee in support of Epic's educational mission. All open-source dependencies were intentionally chosen to ensure broad compatibility and legal clarity.

---

**MIT License**

Copyright (c) 2025 Sam Deiter / Epic Games, Inc.

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

## Epic Games Legal Compliance

### Intended Use: Unreal Authorized Instructor Program

**Target Audience:**
This tool is specifically designed for **Unreal Engine Authorized Instructors** participating in Epic Games' official training and certification programs.

**Program Context:**
- **Unreal Authorized Instructor Program:** https://www.unrealengine.com/en-US/educators
- **Purpose:** Creating assessment materials for authentic Unreal Engine training
- **Users:** Certified instructors teaching official Unreal Engine curriculum
- **Use Case:** Generating scenario-based questions aligned with official learning objectives

**Educational Partnership:**
As a tool supporting Epic Games' official education initiatives, this application:
- Assists authorized instructors in creating compliant assessment content
- Maintains quality standards for Unreal Engine certification materials
- Promotes consistent learning outcomes across the authorized instructor network
- References only official Unreal Engine documentation sources

### Unreal Engine® Trademark Usage

**Official Statement:**
This application is an educational tool for Unreal Engine Authorized Instructors to create study materials and assessments for official Unreal Engine training programs. Unreal Engine® is a registered trademark of Epic Games, Inc. in the United States and/or other jurisdictions.

**Compliance with Epic Games Branding Guidelines:**
- ✅ Trademark symbol (®) used on first mention
- ✅ Generic descriptor included ("educational tool")
- ✅ No modification of Epic Games logos
- ✅ Clear disclaimer of affiliation (see below)
- ✅ Non-commercial educational use

**Reference:** [Epic Games Branding Guidelines](https://www.unrealengine.com/branding)

### Development & Affiliation Statement

**OFFICIAL STATEMENT:**

This project was **created by an Epic Games employee** (Sam Deiter) to support Epic Games' Unreal Authorized Instructor Program.

**Development Context:**
- ✅ **Created by:** Epic Games employee
- ✅ **Purpose:** Supporting Epic's official education initiatives  
- ✅ **For:** Unreal Engine Authorized Instructors
- ✅ **License:** Intentionally open-sourced under MIT for community benefit
- ✅ **Compliance:** All dependencies use permissive open-source licenses

**Relationship to Epic Games:**
- This tool was developed with knowledge of Epic Games' educational needs and requirements
- Created to support the official Unreal Authorized Instructor Program
- Uses only publicly available Unreal Engine documentation
- Released as open source to benefit the broader UE education community
- Maintains Epic Games' quality standards for educational content

**Important Clarification:**
While created by an Epic Games employee for Epic's education program, this is released as an **open-source community tool** under the MIT License. The open-source nature allows authorized instructors worldwide to freely use, modify, and adapt the tool for their specific educational needs.

### Educational Fair Use

**Nature of Use:**
This application is created for **educational purposes only** under fair use principles, specifically supporting the **Unreal Authorized Instructor Program**:

1. **Purpose:** To create study materials and assessments for **official** Unreal Engine training and certification
2. **Nature:** Transformative educational tool supporting Epic Games' educational initiatives
3. **Amount:** References small excerpts from public official documentation
4. **Effect:** Promotes learning, enhances training quality, and does not substitute for official documentation

**Educational Context - Authorized Instructor Program:**
- Used by **certified instructors** in Epic Games' official training network
- Creates assessment materials for **Unreal Engine certification programs**
- Facilitates standardized knowledge assessment across authorized training centers
- Encourages students to consult official Unreal Engine documentation
- All questions include source links directing users to official Epic Games resources
- Supports Epic Games' educational mission and quality standards

**Alignment with Epic Games Education Goals:**
This tool directly supports Epic Games' objectives of:
- Expanding access to high-quality Unreal Engine education
- Maintaining consistent training standards across authorized instructors
- Creating measurable learning outcomes for certification
- Building a skilled Unreal Engine developer community

### Content Ownership

**Tool Ownership:**
- **Creator:** Sam Deiter, Epic Games, Inc.
- **License:** MIT License (open source)
- **Code Repository:** Owned by creator, freely available for community use

**AI-Generated Question Content:**

**Generation Process:**
1. **Tool:** This application (created by Epic Games employee)
2. **AI Service:** Google Gemini API (generates actual question text)
3. **Source Material:** Official Unreal Engine documentation (Epic Games, Inc.)
4. **User Input:** Prompts from Unreal Authorized Instructors
5. **Human Review:** Instructors review, edit, and approve all content (see Human-in-the-Loop below)

### Human-in-the-Loop AI Review Process

**Responsible AI Use:**
This tool implements a **human-in-the-loop** workflow to ensure quality, accuracy, and educational value of AI-generated content:

**Review Steps:**
1. **AI Generation** - Google Gemini creates question drafts based on instructor parameters
2. **Automated Validation** - Tool checks for source URLs, answer accuracy, and format compliance
3. **AI Quality Critique** - Second AI pass evaluates content quality (scores questions 0-100)
4. **Human Review** - Instructor examines each question for:
   - Technical accuracy
   - Pedagogical value
   - Alignment with learning objectives
   - Appropriate difficulty level
   - Source validity
5. **Human Decision** - Instructor accepts, rejects, or edits questions
6. **Manual Editing** - Instructors can rewrite questions based on AI suggestions
7. **Final Approval** - Only instructor-approved questions are used in assessments

**Quality Control Features:**
- ✅ **Review Mode** - Dedicated UI for question-by-question evaluation
- ✅ **Rejection Tracking** - Bad questions are flagged and reasons recorded
- ✅ **Edit History** - Tracks human modifications to AI content
- ✅ **Critique Scores** - AI quality assessment helps prioritize review
- ✅ **Source Verification** - Links to official UE documentation required
- ✅ **Export Control** - Only approved questions can be exported

**Human Oversight Guarantees:**
- **No fully automated content deployment** - All questions require human approval
- **Instructor expertise required** - Only certified UE instructors use this tool
- **Educational accountability** - Instructors responsible for final content quality
- **Continuous improvement** - Rejected questions train better future outputs

**Why This Matters:**
- Ensures AI output meets Epic Games' educational quality standards
- Maintains academic integrity in certification assessments
- Protects students from AI hallucinations or errors
- Demonstrates responsible AI deployment in education
- Complies with best practices for AI-assisted content creation

**Content Ownership Analysis:**
- **Questions are AI-generated** by Google Gemini based on instructor prompts
- **Source excerpts** are from Epic Games' official UE documentation
- **Ownership of AI-generated content** is governed by:
  - Google Gemini API Terms of Service (user owns AI output)
  - Fair use of UE documentation excerpts
  - Instructor's input and curation

**Practical Ownership:**
- Authorized instructors using this tool **own the AI-generated questions** they create (per Google Gemini ToS)
- Questions reference and link to **Epic Games' official documentation** (attribution maintained)
- Tool itself (code) is **MIT licensed** - freely usable by community
- Generated content is for **educational assessment use** within Unreal Engine training programs

**Important Notes:**
- AI-generated questions are created by Google Gemini, not by Epic Games
- Epic Games owns the source documentation being referenced
- Instructors own the AI output they generate using the tool
- Questions must include proper attribution to Epic's documentation sources
- Commercial use of generated content should be reviewed against Epic Games EULA and Google Gemini ToS

### Recommended Legal Review

**For Unreal Authorized Instructors:**

If you are an **Unreal Engine Authorized Instructor** using this tool:
1. ✅ You are already part of Epic Games' official education program
2. ✅ This tool supports your authorized instructor activities
3. ✅ Generated content is for use in official Unreal Engine training
4. Review your **Authorized Instructor Agreement** with Epic Games for:
   - Permitted uses of Unreal Engine trademarks in course materials
   - Attribution requirements for assessment materials
   - Quality standards for certification content
   - Sharing of assessment materials within the instructor network

**For Educational Institutions Using This Tool:**

We recommend consulting with your institution's legal counsel regarding:
1. Fair use exceptions for educational assessment materials  
2. Compliance with Epic Games EULA Section 4 (Educational Licenses)
3. Proper attribution of Unreal Engine content in course materials
4. Student use of generated materials in portfolios
5. **Participation in the Unreal Authorized Instructor Program**

**For Commercial Training Providers:**

Commercial use of this tool or generated content should be reviewed against:
1. Epic Games EULA Section 1.d (Commercial Use)
2. Unreal Engine Branding Guidelines
3. Your organization's license agreement with Epic Games
4. **Unreal Authorized Instructor Program requirements** (if applicable)

### Contact Information for Legal Inquiries

**Epic Games Legal:**
- EULA: https://www.unrealengine.com/eula
- Support: https://www.unrealengine.com/support
- Legal Contact: Via Epic Games official channels

**Project Creator:**
- Repository: https://github.com/SamDeiter/UE5QuestionGenerator
- Issues: https://github.com/SamDeiter/UE5QuestionGenerator/issues
- Contact: [Via GitHub repository]

---

## Data Privacy & GDPR Compliance

### Data Collection & Processing

**What Data We Collect:**
This application collects and processes the following data:

**Personal Information:**
- **User Name** (creator/reviewer name) - stored in Firebase and localStorage
- **Email Address** (via Google OAuth) - for authentication only
- **User ID** (Firebase UID) - to associate questions with creators

**Usage Data:**
- **Generated Questions** - question text, answers, metadata
- **Analytics Data** - token usage, generation metrics, timestamps
- **Review Decisions** - accept/reject status, critique scores, edit history

**Technical Data:**
- **Browser localStorage** - encrypted question cache
- **Firebase Authentication** - login session data
- **IP Address** - via Google Firebase (standard web hosting)

### Data Storage & Processing Locations

**Third-Party Services:**
1. **Google Firebase** (USA) - Authentication, Firestore database, Analytics
2. **Google Gemini API** (USA) - AI question generation
3. **Google Sheets API** (USA) - Question export functionality
4. **Client-Side Storage** - Browser localStorage (AES encrypted)

**Data Residency:**
- Data is primarily stored in **Google Cloud Platform (USA)**
- Subject to Google's data processing agreements
- May be replicated across Google's global infrastructure

### Legal Basis for Processing (GDPR)

**For EU Users:**
Under GDPR, we process personal data based on:

1. **Legitimate Interest** (Art. 6(1)(f) GDPR)
   - Supporting Epic Games' educational mission
   - Improving question quality through analytics
   - Maintaining educational content standards

2. **Consent** (Art. 6(1)(a) GDPR)
   - Users choose to provide name and use Google login
   - Users consent to cookies/localStorage via browser

3. **Contractual Necessity** (Art. 6(1)(b) GDPR)
   - Processing necessary for tool functionality
   - Required for Unreal Authorized Instructor Program participation

### User Rights (GDPR Compliance)

**Your Rights:**
As a user, you have the right to:

✅ **Access** - Request copy of your data (via Firebase export)  
✅ **Rectification** - Correct inaccurate personal data (edit in settings)  
✅ **Erasure** ("Right to be Forgotten") - Delete your data (clear localStorage, delete Firebase account)  
✅ **Portability** - Export your questions in standard formats (CSV, JSON, Google Sheets)  
✅ **Restriction** - Limit processing (log out, don't generate questions)  
✅ **Object** - Object to processing (stop using the tool)  
✅ **Withdraw Consent** - Log out and clear data anytime

**How to Exercise Rights:**
- **Access/Export:** Use "Export to Sheets" or "Load from Database" features
- **Delete:** Clear browser data, or delete Firebase account via Google Account settings
- **Questions:** Contact via GitHub repository issues

### Data Retention

**Retention Periods:**
- **localStorage:** Until browser cache cleared
- **Firebase Firestore:** Indefinitely (user-controlled, can delete anytime)
- **Analytics:** Aggregated data retained indefinitely, individual data 90 days
- **Authentication:** As long as user account exists

**Automated Deletion:**
- No automatic data deletion (user retains control)
- Users can manually clear data via "Clear Local Data & Reset App" button

### Data Security

**Security Measures:**
- ✅ **AES-256 Encryption** for localStorage
- ✅ **HTTPS/TLS** for all network communications
- ✅ **Firebase Security Rules** - User can only access own questions
- ✅ **OAuth 2.0** - Secure Google authentication
- ✅ **Input Sanitization** - XSS prevention (DOMPurify)
- ✅ **CSRF Protection** - Token-based request validation
- ✅ **Content Security Policy** - Prevents code injection

**Third-Party Security:**
Data processed by Google services is subject to:
- [Google Cloud Security](https://cloud.google.com/security)
- [Firebase Security](https://firebase.google.com/support/privacy)
- ISO 27001, SOC 2, SOC 3 certifications

### Data Sharing & Transfers

**Who We Share Data With:**
- **Google LLC** - Firebase, Gemini API, Sheets API (Data Processing Agreement applies)
- **Epic Games** - As employer of tool creator (internal educational use)
- **No third-party advertising or marketing**
- **No data selling or commercial use**

**International Transfers:**
- Data may be transferred to USA (Google Cloud)
- Covered by **EU-US Data Privacy Framework** (Google participates)
- Standard Contractual Clauses (SCCs) apply via Google's DPA

### Cookies & Tracking

**What We Use:**
- **Firebase Authentication Cookies** - Required for login
- **localStorage** - Required for app functionality (AES encrypted)
- **Google Analytics Cookies** - Optional usage tracking
- **No third-party advertising cookies**

**User Control:**
- Disable analytics via browser extensions
- Clear localStorage via app settings
- Block cookies via browser settings (may break functionality)

### Children's Privacy (COPPA/GDPR)

**Age Restriction:**
This tool is intended for **adult professional educators** (18+) participating in the Unreal Authorized Instructor Program.

- **Not directed at children** under 13 (COPPA)
- **Not directed at children** under 16 (GDPR)
- If a child's data is collected inadvertently, contact us for deletion

### Privacy Policy Updates

**Notification of Changes:**
- Material changes will be noted in GitHub releases
- Users encouraged to review LICENSES.md periodically
- Continued use constitutes acceptance of updated terms

### Contact for Privacy Concerns

**Data Protection Contact:**
- **For Epic Games employees:** Internal Epic data protection officer
- **For external users:** Submit issue on GitHub repository
- **For GDPR requests:** Include "GDPR Request" in issue title

**Supervisory Authority (EU):**
EU users have the right to lodge complaints with their local data protection authority.

---

## Legal Risk Mitigation & Compliance Checklist

### ⚠️ CRITICAL: Recommended Legal Approvals

**Before Public Release or Deployment:**

As this tool was created by an Epic Games employee, the following approvals are **strongly recommended**:

#### 1. **Epic Games Legal Department Review**
- [ ] **IP/Work Product Review** - Confirm Epic's rights to code created during employment
- [ ] **Open Source Approval** - Document approval for MIT License release
- [ ] **Trademark Usage** - Verify compliance with UE branding guidelines
- [ ] **EULA Compliance** - Ensure educational use aligns with Epic's terms
- [ ] **Data Privacy** - Review GDPR compliance for international use
- [ ] **Liability Concerns** - Address potential Epic exposure from tool use

**Action:** Submit to Epic Games Legal for formal review and written approval.

#### 2. **Employment Agreement Review**
- [ ] **Work Product Clause** - Check if employment agreement covers personal projects
- [ ] **IP Assignment** - Verify who owns code created using company resources
- [ ] **Outside Activities** - Ensure open-source release doesn't violate employment terms
- [ ] **Conflict of Interest** - Confirm no competing interests with Epic's business

**Action:** Review employment agreement Section [X] with HR/Legal.

#### 3. **Third-Party Terms of Service Compliance**
- [ ] **Google Gemini API Terms** - Review commercial/educational use restrictions
- [ ] **Google Firebase Terms** - Verify data processing agreement coverage
- [ ] **Google Sheets API Terms** - Ensure export functionality is compliant
- [ ] **GitHub Terms** - Confirm repository hosting compliance

**Action:** Document compliance with all third-party ToS.

### Legal Compliance Checklist

#### Employee & Epic Games Protection

✅ **COMPLETED:**
- [x] Tool released under MIT License (permissive, Epic-friendly)
- [x] All dependencies use compatible open-source licenses
- [x] Epic Games authorship disclosed in LICENSES.md
- [x] Human-in-the-loop AI review documented
- [x] GDPR compliance section added
- [x] Data privacy disclosures included
- [x] Unreal® trademark usage guidelines followed
- [x] Non-affiliation statement clarified (employee-created for Epic)
- [x] Educational fair use justification documented

⚠️ **STILL NEEDED (Recommendations):**
- [ ] **Written approval** from Epic Games Legal Department
- [ ] **Documented approval** from manager/director for open-source release
- [ ] **Signed acknowledgment** that Epic owns work product
- [ ] **Terms of Use** added to application (separate from LICENSES.md)
- [ ] **Disclaimer of Warranties** prominently displayed in app
- [ ] **Limitation of Liability** clause for users
- [ ] **Indemnification** agreement for Authorized Instructors
- [ ] **Privacy Policy** link in application footer
- [ ] **Cookie consent banner** for EU compliance
- [ ] **Age verification** (18+ requirement)

### Liability Protection Measures

#### For Epic Games

**Recommended Actions:**

1. **Add Explicit Disclaimer in Application**
   ```
   DISCLAIMER: This tool is provided "AS IS" for educational purposes only.
   Epic Games, Inc. makes no warranties about the accuracy, completeness,
   or suitability of AI-generated content. Instructors are solely responsible
   for reviewing and approving all questions before use in assessments.
   ```

2. **Limit Epic's Exposure**
   - Add "Created by Epic Games employee" attribution
   - Include "Use at your own risk" warnings
   - Require instructors to agree to Terms of Use
   - Log acceptance of liability disclaimer

3. **Insurance Review**
   - Consult Epic's E&O (Errors & Omissions) insurance
   - Verify coverage for AI-generated educational content
   - Check cyber liability insurance for data breach exposure

#### For You (Employee Creator)

**Personal Risk Mitigation:**

1. **Document Everything**
   - Keep emails showing manager/legal approval
   - Document that you used personal time (if applicable)
   - Save written approval for open-source release

2. **Indemnification**
   - Request Epic Games indemnify you for work-related creations
   - Ensure employment agreement protects you for authorized work

3. **Professional Liability**
   - Consider professional liability insurance (if providing tool as consultant)
   - Ensure Epic's legal team has reviewed before public use

### Ongoing Compliance Requirements

**Monthly:**
- [ ] Review third-party API ToS for changes
- [ ] Monitor GDPR regulations for updates
- [ ] Check for security vulnerabilities in dependencies

**Quarterly:**
- [ ] Review user feedback for legal concerns
- [ ] Update privacy policy if data practices change
- [ ] Audit data retention and deletion practices

**Annually:**
- [ ] Comprehensive legal review with Epic's counsel
- [ ] Update all license texts for dependency changes
- [ ] Review insurance coverage adequacy

### Red Flags to Watch For

**Immediate Legal Consultation Required If:**

🚨 **You receive:**
- Cease and desist letter from any party
- GDPR complaint or data breach notification
- Trademark infringement claim
- Copyright infringement notice
- Request for user data from government/legal authority

🚨 **You discover:**
- AI generated inaccurate/harmful content used in assessments
- Data breach or unauthorized access to Firebase
- Student/instructor claims of damages from tool use
- Violation of Epic Games EULA by users

**Action:** Immediately contact Epic Games Legal Department.

### Best Practices to Avoid Legal Issues

**DO:**
✅ Get written legal approval before major changes
✅ Keep detailed records of all approvals
✅ Respond promptly to GDPR/privacy requests
✅ Update users about material changes
✅ Maintain human oversight of all AI content
✅ Keep Epic's legal team informed of tool updates
✅ Document all security measures and updates
✅ Respect all third-party API rate limits and ToS

**DON'T:**
❌ Deploy without Epic legal approval if required
❌ Make claims about Epic Games endorsement (unless documented)
❌ Ignore GDPR requests or data subject rights
❌ Store unnecessary personal data
❌ Allow fully automated question deployment
❌ Modify Epic's official documentation/logos
❌ Sublicense or sell access to the tool
❌ Use for commercial purposes without review

### Emergency Contact Information

**If Legal Issue Arises:**

1. **Epic Games Legal** (Internal)
   - Notify your manager immediately
   - Contact Epic's legal department
   - Do NOT communicate with external parties without approval

2. **For GDPR/Privacy Issues**
   - Epic's Data Protection Officer (if exists)
   - Document the issue thoroughly
   - Freeze affected data if breach suspected

3. **For IP/Trademark Issues**
   - Epic's IP legal team
   - Preserve all related communications
   - Do not admit fault without legal counsel

---

## Summary: Is This Tool Legal?

### Current Status

**✅ Legally Sound Foundation:**
- MIT License is well-established and Epic-friendly
- All dependencies are properly licensed
- GDPR compliance documented
- Educational fair use justified
- Human-in-the-loop protects quality
- Epic Games authorship disclosed

**⚠️ Recommended Next Steps:**

1. **Get Epic Legal Approval** - Most important step
2. **Document Manager Approval** - For open-source release
3. **Add Terms of Use** - In the application itself
4. **Add Liability Disclaimers** - Protect Epic and yourself
5. **Verify Employment Agreement** - Ensure no conflicts

**Risk Assessment:**

| Risk Area | Level | Mitigation Status |
|-----------|-------|-------------------|
| IP Ownership | Medium | Need Epic approval |
| GDPR Compliance | Low | Documented in LICENSES.md |
| Trademark Use | Low | Compliant with guidelines |
| AI Liability | Medium | Human-in-loop documented |
| Data Privacy | Low | Security measures in place |
| Third-Party ToS | Low | Compliant with Google ToS |
| Educational Use | Low | Fair use justified |

**Bottom Line:**

This tool is **well-positioned legally** but requires **formal approval from Epic Games Legal** before widespread deployment. The comprehensive documentation you've created shows due diligence, but written authorization from Epic's legal team is the final critical step.

**Recommended Action Plan:**

1. **This Week:** Submit LICENSES.md to Epic Games Legal for review
2. **Get Approval:** Obtain written approval for open-source release
3. **Add Disclaimers:** Implement in-app Terms of Use and disclaimers
4. **Document Approval:** Keep all approval emails in permanent records
5. **Periodic Review:** Annual legal compliance check

With these steps completed, both you and Epic Games will have strong legal protection.

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
