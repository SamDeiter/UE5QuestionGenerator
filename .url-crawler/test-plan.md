# URL Generation Test Plan

## 🎯 Test Objective
Measure URL accuracy improvement with 620 verified URLs (vs original 36)

---

## 📊 Test Method

### 1. Generate Test Questions (10-15 questions)
Generate across different topics:
- ✅ Blueprints (3 questions)
- ✅ Materials (3 questions)
- ✅ Gameplay/Physics (2 questions)
- ✅ Sequencer/Cinematics (2 questions)
- ✅ Rendering/Lighting (3 questions)
- ✅ Editor/Workflow (2 questions)

### 2. Check Each URL
For each generated question:
1. Copy the `SourceURL`
2. Paste in browser
3. Record: ✅ Valid or ❌ Broken

### 3. Calculate Accuracy
```
Accuracy = (Valid URLs / Total URLs) × 100%
```

---

## 📈 Expected Results

**Before (36 URLs):** ~30% accuracy  
**After (620 URLs):** **85-95% accuracy** (target)

---

## 🎯 Success Criteria

- ✅ **>85% URL accuracy** = EXCELLENT
- ✅ **75-85%** = Good, identify gaps
- ❌ **<75%** = Need more URLs or prompt tuning

---

## 📝 Recording Template

```
Question 1 (Blueprint): ✅/❌
Question 2 (Material): ✅/❌
Question 3 (Gameplay): ✅/❌
...

Total: X/15 = XX% accuracy
```

---

## 🔍 Gap Analysis

If URLs fail, note the TOPIC:
- Failed topic 1: __________
- Failed topic 2: __________

These indicate areas needing more URLs.

---

**Ready to test!** Generate questions in the UI! 🚀
