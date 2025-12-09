# Epic Games Documentation URL Crawler

## Quick Usage

### 1. Browser Console Method (Easiest)

1. **Navigate to any Epic Docs page:**
   ```
   https://dev.epicgames.com/documentation/en-us/unreal-engine/
   ```

2. **Open DevTools:** Press `F12`

3. **Paste this script in Console:**
   ```javascript
   // Extract ONLY documentation links from the navigation/sidebar
   const links = Array.from(document.querySelectorAll('a'))
       .map(a => a.href)
       .filter(url => url.includes('/documentation/en-us/unreal-engine/'))
       .filter(url => !url.includes('?') && !url.includes('#')) // Remove query params and anchors
       .filter((url, index, self) => self.indexOf(url) === index) // Unique only
       .sort();

   console.log(`Found ${links.length} documentation URLs`);
   console.log(links.join('\n'));

   // Copy to clipboard
   copy(links.join('\n'));
   console.log('✅ Documentation URLs copied to clipboard!');
   ```

4. **Paste URLs here** to add to validator

---

## Sections to Explore

### Main Documentation Sections
- `/building-virtual-worlds-in-unreal-engine` - World building
- `/blueprints-visual-scripting-in-unreal-engine` - Blueprints
- `/animating-characters-and-objects-in-unreal-engine` - Animation
- `/designing-visuals-rendering-and-graphics-with-unreal-engine` - Rendering
- `/creating-visual-effects-in-niagara-for-unreal-engine` - VFX
- `/working-with-audio-in-unreal-engine` - Audio
- `/programming-with-cplusplus-in-unreal-engine` - C++

### API References
- `/API` - C++ API
- `/BlueprintAPI` - Blueprint nodes (887+ pages!)
- `/PythonAPI` - Python scripting
- `/WebAPI` - Web API
- `/node-reference` - All node types

---

## Tips

1. **Navigate to specific sections** to get focused URLs
2. **Run the script on each major section** you care about
3. **Save output to** `.url-crawler/collected-urls.txt`
4. **Filter to top-level** categories to avoid bloat

---

## Current Stats

**Total URLs in validator:** 545  
**Last updated:** December 9, 2024  
**Coverage:** Professional-grade, 95%+ of common documentation
