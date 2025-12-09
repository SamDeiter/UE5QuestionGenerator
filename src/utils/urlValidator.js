/**
 * URL Validator - Validates Epic Games documentation URLs
 * Checks for known-valid patterns and rejects invalid/generic slugs
 */

// Known valid URL slugs (curated from actual documentation)
const KNOWN_VALID_SLUGS = new Set([
    // Core Features
    'nanite-virtualized-geometry-in-unreal-engine',
    'lumen-global-illumination-and-reflections-in-unreal-engine',
    'blueprints-visual-scripting-in-unreal-engine',
    'world-partition-in-unreal-engine',
    'virtual-shadow-maps-in-unreal-engine',

    // Animation & Skeletal
    'animation-blueprints-in-unreal-engine',
    'skeletal-mesh-animation-system-in-unreal-engine',

    // Materials & Rendering
    'materials-in-unreal-engine',
    'material-editor-fundamentals',
    'static-mesh-editor-reference',
    'rendering-modes-in-unreal-engine',
    'mobile-feature-levels-and-rendering-modes-in-unreal-engine',
    'view-modes-in-unreal-engine',
    'shader-complexity-in-unreal-engine',

    // Landscape & Environment
    'landscape-outdoor-terrain-in-unreal-engine',
    'landscape-collision-guide-in-unreal-engine',
    'grass-quick-start-in-unreal-engine',
    'lighting-the-environment-in-unreal-engine',
    'open-world-tools-in-unreal-engine',
    'hierarchical-level-of-detail-in-unreal-engine',

    // Effects & Physics
    'niagara-visual-effects-in-unreal-engine',
    'chaos-physics-in-unreal-engine',
    'audio-in-unreal-engine',

    // Lighting
    'lights-and-shadows',
    'directional-lights-in-unreal-engine',
    'point-lights-in-unreal-engine',
    'spot-lights-in-unreal-engine',
    'rect-lights-in-unreal-engine',
    'sky-lights-in-unreal-engine',

    // Editor & Tools
    'level-editor-in-unreal-engine',
    'content-browser-in-unreal-engine',
    'sequencer-cinematic-editor-in-unreal-engine',
    'umg-ui-designer-in-unreal-engine',

    // Programming
    'gameplay-framework-in-unreal-engine',
    'actor-programming-in-unreal-engine',
    'unreal-engine-programming-and-scripting',

    // Getting Started
    'unreal-engine-for-beginners',
    'getting-started-with-unreal-engine',
    'understanding-the-basics-of-unreal-engine',
    'working-with-content-in-unreal-engine',
    'building-virtual-worlds-in-unreal-engine',

    // PCG (Procedural Content Generation)
    'procedural-content-generation-pcg-biome-core-and-sample-plugins-in-unreal-engine',
    'pcg-editor-mode-in-unreal-engine',
    'assembly-pcg',

    // Documentation & References
    'unreal-engine-5-7-documentation',
    'whats-new',
    'API',
    'BlueprintAPI',
    'PythonAPI',
    'WebAPI',
    'node-reference',
    'get-started',

    // Main Category Pages
    'understanding-the-basics-of-unreal-engine',
    'working-with-content-in-unreal-engine',
    'building-virtual-worlds-in-unreal-engine',
    'animating-characters-and-objects-in-unreal-engine',
    'designing-visuals-rendering-and-graphics-with-unreal-engine',
    'creating-visual-effects-in-niagara-for-unreal-engine',
    'working-with-audio-in-unreal-engine',
    'creating-user-interfaces-with-umg-and-slate-in-unreal-engine',
    'blueprints-visual-scripting-in-unreal-engine',
    'programming-with-cplusplus-in-unreal-engine',
    'gameplay-systems-in-unreal-engine',
    'motion-design-in-unreal-engine',
    'working-with-media-in-unreal-engine',
    'setting-up-your-production-pipeline-in-unreal-engine',
    'testing-and-optimizing-your-content',
    'sharing-and-releasing-projects-for-unreal-engine',
    'samples-and-tutorials-for-unreal-engine',
    'gameplay-tutorials-for-unreal-engine',
    'getting-started-with-mobile-development-in-unreal-engine',

    // Fundamentals & Core Concepts
    'actors-and-geometry-in-unreal-engine',
    'assets-and-content-packs-in-unreal-engine',
    'levels-in-unreal-engine',
    'coordinate-system-and-spaces-in-unreal-engine',
    'units-of-measurement-in-unreal-engine',
    'unreal-engine-terminology',
    'unreal-engine-directory-structure',

    // Editor & Customization
    'tools-and-editors-in-unreal-engine',
    'unreal-editor-interface',
    'unreal-editor-preferences',
    'customizing-unreal-engine',
    'customizing-keyboard-shortcuts-in-unreal-engine',
    'color-picker-in-unreal-engine',

    // Project & Workflow
    'project-settings-in-unreal-engine',
    'working-with-projects-and-templates-in-unreal-engine',
    'working-with-plugins-in-unreal-engine',
    'source-control-in-unreal-engine',
    'playing-and-simulating-in-unreal-engine',

    // Blueprint System (Advanced)
    'blueprint-variables-in-unreal-engine',
    'event-graph-in-unreal-engine',
    'introduction-to-blueprints-visual-scripting-in-unreal-engine',

    // Material System (Advanced)
    'unreal-engine-material-editor-user-guide',
    'unreal-engine-materials',
    'instanced-materials-in-unreal-engine',

    // Animation & Rigging
    'control-rig-in-animation-blueprints-in-unreal-engine',
    'animating-with-control-rig-in-unreal-engine',
    'unreal-engine-sequencer-movie-tool-overview',

    // AI & Navigation Systems
    'behavior-trees-in-unreal-engine',
    'behavior-tree-in-unreal-engine---quick-start-guide',
    'environment-query-system-in-unreal-engine',
    'environment-query-system-overview-in-unreal-engine',
    'navigation-system-in-unreal-engine',
    'world-partitioned-navigation-mesh',

    // Physics (Chaos Engine)
    'physics-in-unreal-engine',

    // Rendering & Post-Processing
    'hardware-ray-tracing-in-unreal-engine',
    'post-process-effects-in-unreal-engine',
    'add-post-process-volumes',
    'runtime-virtual-texturing-in-unreal-engine',
    'virtual-texturing-in-unreal-engine',

    // World Management
    'world-partition---data-layers-in-unreal-engine',
    'world-composition-in-unreal-engine',

    // Advanced Audio
    'audio-analysis-and-visualization-in-unreal-engine',
    'audio-gameplay-volumes-in-unreal-engine',
    'soundscape-in-unreal-engine',
    'midi-in-unreal-engine',
    'waveform-editor-quick-start-in-unreal-engine',

    // Virtual Production & Cinematics
    'controlling-inputs-to-virtual-camera-controls-in-unreal-engine',
    'customizable-sequencer-track-in-unreal-engine',
    'template-sequences-in-unreal-engine',
    'using-multiple-virtual-cameras-in-unreal-engine',
    'realtime-compositing-with-composure-in-unreal-engine',
    'remote-control-for-unreal-engine',
    'render-multiple-camera-angle-stills-in-unreal-engine',
    'virtual-scouting-legacy-tools',
    'mixed-reality-capture-in-unreal-engine',
    'stage-monitor-with-unreal-engine',
    'switchboard-in-unreal-engine',
    'texture-share-in-unreal-engine',

    // Modeling & Geometry
    'modeling-tools-in-unreal-engine',
    'getting-started-with-modeling-mode',
    'deformer-graph-in-unreal-engine',
    'how-to-create-a-custom-deformer-graph-in-unreal-engine',
    'introduction-to-geometry-scripting-in-unreal-engine',
    'scriptable-tools-system-in-unreal-engine',

    // Landscape & World Building
    'landscape-edit-layers-in-unreal-engine',
    'large-world-coordinates-in-unreal-engine-5',
    'gpu-lightmass-global-illumination-in-unreal-engine',

    // Simulation & Physics
    'fluid-simulation-in-unreal-engine',
    'fluid-simulation-tutorials-in-unreal-engine',

    // Editor Extensions & Automation
    'editor-utility-widgets-in-unreal-engine',
    'scripted-actions-in-unreal-engine',
    'running-blueprints-at-unreal-editor-startup',

    // Datasmith & Interop
    'exporting-datasmith-content-from-revit-to-unreal-engine',
    'using-datasmith-at-runtime-in-unreal-engine',
    'using-datasmith-direct-link-in-unreal-engine',
    'universal-scene-description-usd-in-unreal-engine',
    'using-unreal-engine-with-autodesk-shotgrid',

    // Mutable (Character Customization)
    'mutable-development-guides-in-unreal-engine',
    'mutable-optimizing-and-debugging-in-unreal-engine',
    'mutable-skeletal-mesh-generation-in-unreal-engine',

    // Online & Networking
    'online-services-in-unreal-engine',
    'online-services-interfaces-in-unreal-engine',
    'use-the-online-services-plugins-in-unreal-engine',
    'multi-user-editing-in-unreal-engine',

    // Mobile & Platform
    'local-notifications-for-android-and-ios-in-unreal-engine',
    'using-mesh-auto-instancing-on-mobile-devices-in-unreal-engine',

    // Machine Learning & Advanced
    'neural-network-engine-in-unreal-engine',
    'sparse-class-data-in-unreal-engine',

    // Deployment & DevOps
    'container-deployments-and-images-for-unreal-editor-and-unreal-engine',

    // Documentation & Migration
    'experimental-features',
    'unreal-engine-5-7-release-notes',
    'unreal-engine-5-migration-guide',

    // Blueprint System (Deep Dive)
    'anatomy-of-a-blueprint-in-unreal-engine',
    'basic-scripting-with-blueprints-in-unreal-engine',
    'blueprint-best-practices-in-unreal-engine',
    'blueprint-communication-usage-in-unreal-engine',
    'blueprint-debugger-in-unreal-engine',
    'blueprint-editor-cheat-sheet-in-unreal-engine',
    'blueprint-interface-in-unreal-engine',
    'blueprint-namespaces-in-unreal-engine',
    'blueprint-workflows-in-unreal-engine',
    'blueprint-splines-in-unreal-engine',
    'event-dispatchers-in-unreal-engine',
    'overview-of-blueprints-visual-scripting-in-unreal-engine',
    'quick-start-guide-for-blueprints-visual-scripting-in-unreal-engine',
    'specialized-blueprint-visual-scripting-node-groups-in-unreal-engine',
    'technical-guide-for-blueprints-visual-scripting-in-unreal-engine',
    'user-interface-reference-for-the-blueprints-visual-scripting-editor-in-unreal-engine',

    // Animation (Detailed)
    'animation-blueprints-in-unreal-engine',
    'control-rig-editor-in-unreal-engine',
    'control-rig-in-unreal-engine',
    'skeletal-mesh-assets-in-unreal-engine',

    // Cinematics
    'cinematics-and-movie-making-in-unreal-engine',

    // Motion Design (Detailed)
    'motion-design-cloners-and-effectors-in-unreal-engine',
    'motion-design-quickstart-guide-in-unreal-engine',
    'operator-stack-in-unreal-engine',
    'scene-state-for-unreal-engine',
    'setting-up-rundown-server-for-motion-design-in-unreal-engine',
    'your-first-graphic-with-motion-design-in-unreal-engine',

    // World Building (Advanced)
    'actor-editor-context-in-unreal-engine',
    'georeferencing-a-level-in-unreal-engine',
    'level-designer-quick-start-in-unreal-engine',
    'level-streaming-in-unreal-engine',
    'one-file-per-actor-in-unreal-engine',
    'procedural-content-generation-framework-in-unreal-engine',
    'water-system-in-unreal-engine',
    'virtual-scouting-in-unreal-engine',

    // Sample Content & Learning
    'content-examples-sample-project-for-unreal-engine',
    'engine-feature-examples-for-unreal-engine',
    'free-epic-games-content-for-unreal-engine',
    'sample-game-projects-for-unreal-engine',
    'paper-2d-overview-in-unreal-engine',
]);

// Patterns that indicate invalid/generic URLs
const INVALID_PATTERNS = [
    /^unreal-engine-\d+$/,           // unreal-engine-5
    /^unreal-engine$/,               // too generic
    /^ue\d+$/,                        // ue5
    /^overview$/,                     // too generic
    /^introduction$/,                 // too generic
    /\s/,                             // contains spaces
    /[A-Z]/,                          // contains uppercase
    /^[a-z]+$/,                       // single word without hyphens (e.g., "nanite")
];

// Common slug patterns that should include "-in-unreal-engine" suffix
const REQUIRES_SUFFIX_PATTERNS = [
    'nanite', 'lumen', 'niagara', 'chaos', 'blueprint', 'landscape',
    'material', 'animation', 'skeletal', 'world-partition', 'virtual-shadow',
    'sequencer', 'umg', 'gameplay'
];

/**
 * Validates a documentation URL
 * @param {string} url - The URL to validate
 * @returns {{ isValid: boolean, confidence: number, warning: string | null }}
 */
export function validateURL(url) {
    // No URL provided
    if (!url || url.trim() === '') {
        return { isValid: false, confidence: 0, warning: 'Missing documentation URL' };
    }

    // Must start with Epic Games documentation base
    const baseURL = 'https://dev.epicgames.com/documentation/en-us/unreal-engine/';
    if (!url.startsWith(baseURL)) {
        return { isValid: false, confidence: 0, warning: 'Not an Epic Games documentation URL' };
    }

    // Extract the slug (path after base URL)
    const slug = url.replace(baseURL, '').split('#')[0].split('?')[0];

    // Check if slug is empty
    if (!slug || slug.trim() === '') {
        return { isValid: false, confidence: 10, warning: 'URL has no specific page path' };
    }

    // Check against known invalid patterns
    for (const pattern of INVALID_PATTERNS) {
        if (pattern.test(slug)) {
            return { isValid: false, confidence: 20, warning: `Invalid URL pattern: "${slug}"` };
        }
    }

    // Check if it's a known valid slug
    if (KNOWN_VALID_SLUGS.has(slug)) {
        return { isValid: true, confidence: 100, warning: null };
    }

    // Check if slug should have "-in-unreal-engine" suffix but doesn't
    for (const term of REQUIRES_SUFFIX_PATTERNS) {
        if (slug.includes(term) && !slug.endsWith('-in-unreal-engine')) {
            // Could be valid, but flagged
            return {
                isValid: true,
                confidence: 60,
                warning: `URL may be missing "-in-unreal-engine" suffix`
            };
        }
    }

    // Check for reasonable slug structure (lowercase, hyphens, reasonable length)
    if (slug.length < 10) {
        return { isValid: true, confidence: 40, warning: 'URL slug seems too short' };
    }

    if (slug.includes('--')) {
        return { isValid: false, confidence: 30, warning: 'URL has double hyphens' };
    }

    // Looks reasonable but not verified
    return { isValid: true, confidence: 70, warning: null };
}

/**
 * Batch validate URLs
 * @param {Array} questions - Array of question objects with SourceURL field
 * @returns {Array} Questions with urlValidation field added
 */
export function validateURLsBatch(questions) {
    return questions.map(q => ({
        ...q,
        urlValidation: validateURL(q.SourceURL || q.sourceUrl)
    }));
}

export default validateURL;
