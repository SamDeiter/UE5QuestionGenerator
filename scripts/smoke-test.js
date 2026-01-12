/**
 * Smoke Test Script
 *
 * Quick post-deployment verification that critical UI elements exist.
 * Run with: node scripts/smoke-test.js
 *
 * NOTE: This is a simple fetch-based check. For full browser testing,
 * install Playwright: npm install -D playwright
 */

const LIVE_URL = "https://samdeiter.github.io/UE5QuestionGenerator/";

// Critical elements that must exist in the built HTML
const CRITICAL_ELEMENTS = {
  // These are class names or text that should be in the production build
  "App container": 'id="root"',
  "React app": "</script>", // Vite injects scripts
};

async function runSmokeTest() {
  console.log("🔍 Running post-deployment smoke test...\n");
  console.log(`URL: ${LIVE_URL}\n`);

  try {
    const response = await fetch(LIVE_URL);

    if (!response.ok) {
      console.error(`❌ FAIL: Site returned ${response.status}`);
      process.exit(1);
    }

    const html = await response.text();
    let allPassed = true;

    console.log("Checking critical elements:\n");

    for (const [name, pattern] of Object.entries(CRITICAL_ELEMENTS)) {
      const found = html.includes(pattern);
      const status = found ? "✅" : "❌";
      console.log(`  ${status} ${name}`);

      if (!found) {
        allPassed = false;
      }
    }

    console.log("");

    // Check that JavaScript bundle loaded
    const hasBundle = html.includes('type="module"') || html.includes(".js");
    console.log(`  ${hasBundle ? "✅" : "❌"} JavaScript bundle`);
    if (!hasBundle) allPassed = false;

    // Check for React mount point
    const hasRoot = html.includes('id="root"');
    console.log(`  ${hasRoot ? "✅" : "❌"} React mount point`);
    if (!hasRoot) allPassed = false;

    console.log("");

    if (allPassed) {
      console.log("✅ All smoke tests passed!");
      console.log("");
      console.log("For full UI verification, open the site manually:");
      console.log(`  ${LIVE_URL}`);
      console.log("");
      console.log("Check these items:");
      console.log("  1. Login works");
      console.log("  2. Review mode loads");
      console.log("  3. Reject button visible");
      console.log("  4. Accept/Verify/Critique buttons work");
      console.log("  5. Colorblind toggle functions");
      process.exit(0);
    } else {
      console.error("❌ Some smoke tests failed!");
      console.error("The deployment may be broken.");
      process.exit(1);
    }
  } catch (error) {
    console.error(`❌ FAIL: Could not fetch site`);
    console.error(`   Error: ${error.message}`);
    process.exit(1);
  }
}

runSmokeTest();
