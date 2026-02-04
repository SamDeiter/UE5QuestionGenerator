# SCORM Export Guide

A simple guide to exporting and using SCORM quiz packages from the UE5 Question Generator.

## How to Export

1. **Go to Database View** - Select the questions you want to export
2. **Click Export SCORM** - Choose single package or batch by discipline
3. **Download ZIP** - Filename includes version + timestamp (e.g., `quiz_v2.4.20_2026-02-04_14-12_scorm12.zip`)

## What's Included

Each SCORM package contains:
- `imsmanifest.xml` - SCORM 1.2 manifest for LMS
- `index.html` - Quiz start page
- `game.js` - Quiz engine with security features
- `questions.js` - Your questions (base64 encoded)
- `scorm.js` - SCORM API wrapper
- `style.css` - UE5-themed styling

## How the Quiz Works

```
┌─────────────────────────────────────────────────────┐
│  1. INITIALIZATION                                  │
│     - Decode base64 questions                       │
│     - Build balanced question pool (E/M/H mix)      │
│     - Initialize SCORM connection                   │
│     - Start timer                                   │
├─────────────────────────────────────────────────────┤
│  2. QUIZ TAKING                                     │
│     - Questions displayed one at a time             │
│     - Answers shuffled (A/B/C/D labels stay fixed)  │
│     - Timer counts down                             │
│     - Security monitors tab switches, etc.          │
├─────────────────────────────────────────────────────┤
│  3. COMPLETION                                      │
│     - Score calculated                              │
│     - Pass/fail based on passing score (80%)        │
│     - Results sent to LMS                           │
│     - Close Assessment button appears               │
└─────────────────────────────────────────────────────┘
```

## Security Features

| Feature | Description |
|---------|-------------|
| Answer Shuffling | Answer order randomized per question |
| Base64 Encoding | Questions not visible in view-source |
| Tab Detection | Warns after 3 tab switches |
| Copy/Paste Block | Ctrl+C, Ctrl+V, Ctrl+X disabled |
| Print Block | Ctrl+P disabled |
| DevTools Detection | Window resize monitoring |
| Back Button Block | Browser back disabled |
| Refresh Warning | "Are you sure?" dialog on refresh |
| Multi-Tab Prevention | One quiz instance per browser |

## Uploading to LMS

1. **Extract ZIP** (if required by your LMS)
2. **Upload to LMS** as SCORM 1.2 package
3. **Assign to learners**
4. **Results tracked** via SCORM API:
   - `cmi.core.score.raw` - Score percentage
   - `cmi.core.lesson_status` - passed/failed/incomplete

## Troubleshooting

### "Close Assessment" not working
- Some LMS configurations block `window.close()`
- A message appears directing users to close manually

### Questions not loading
- Check browser console for errors
- Verify SCORM package uploaded correctly

### Score not saving
- Check LMS SCORM logs
- Ensure quiz completed fully (not abandoned)

## Version History

- **v2.4.20** - Base64 obfuscation, unique timestamps, security enhancements
- **v2.4.19** - Initial stable release
