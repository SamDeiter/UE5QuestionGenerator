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

    // Platform Development - Mobile
    'developing-guides-for-android-in-unreal-engine',
    'getting-started-and-setup-for-android-projects-in-unreal-engine',
    'debugging-for-android-devices-in-unreal-engine',
    'optimization-guides-for-android-in-unreal-engine',
    'packaging-and-publishing-android-projects-in-unreal-engine',
    'developing-on-ios-tvos-and-ipados-in-unreal-engine',
    'getting-started-and-setup-guides-for-ios-and-tvos-in-unreal-engine',
    'building-packaging-and-publishing-unreal-engine-projects-for-ios-tvos-and-ipados',
    'working-on-ios-projects-using-a-windows-machine-in-unreal-engine',
    'rendering-features-for-mobile-games-in-unreal-engine',
    'debugging-and-optimization-for-mobile-in-unreal-engine',
    'development-tools-for-mobile-applications',

    // Platform Development - Desktop
    'developing-macos-projects-in-unreal-engine',
    'linux-game-development-in-unreal-engine',
    'steam-deck-in-unreal-engine',

    // Platform Development - Consoles
    'consoles-development-in-unreal-engine',

    // XR Development
    'developing-for-xr-experiences-in-unreal-engine',
    'getting-started-with-xr-development-in-unreal-engine',
    'developing-for-head-mounted-experiences-with-openxr-in-unreal-engine',
    'developing-for-handheld-augmented-reality-experiences-in-unreal-engine',
    'making-interactive-xr-experiences-in-unreal-engine',
    'sharing-xr-experiences-in-unreal-engine',
    'design-user-interfaces-for-xr-experiences-in-unreal-engine',
    'supported-xr-devices-in-unreal-engine',

    // Build & Deployment
    'build-operations-cooking-packaging-deploying-and-running-projects-in-unreal-engine',
    'packaging-and-cooking-games-in-unreal-engine',
    'cooking-content-in-unreal-engine',
    'cooking-content-and-creating-chunks-in-unreal-engine',
    'working-with-cooked-content-in-the-unreal-engine',
    'launching-unreal-engine-projects-on-devices',
    'connecting-to-and-managing-devices-in-unreal-engine',
    'preparing-unreal-engine-projects-for-release',
    'patching-content-delivery-and-dlc-in-unreal-engine',
    'in-app-purchases-and-ads-in-unreal-engine-projects',

    // Deployment Tools
    'using-the-project-launcher-in-unreal-engine',
    'using-the-unreal-frontend-tool',
    'using-the-autosdk-system-in-unreal-engine',
    'setting-up-device-profiles-in-unreal-engine',
    'setting-up-tv-safe-zone-debugging-in-unreal-engine',
    'tools-for-general-platform-support-in-unreal-engine',

    // Advanced Deployment
    'pixel-streaming-in-unreal-engine',
    'low-latency-frame-syncing-in-unreal-engine',

    // Audio System (Detailed)
    'audio-in-unreal-engine',
    'audio-debugging-in-unreal-engine',
    'audio-memory-management-in-unreal-engine',
    'audio-mixing-in-unreal-engine',
    'audio-volume-actors-in-unreal-engine',
    'audioinsights',
    'audiolink',
    'external-audio-control-in-unreal-engine',
    'music-systems-in-unreal-engine',
    'reverb-in-unreal-engine',
    'sound-sources-in-unreal-engine',
    'spatialization-and-sound-attenuation-in-unreal-engine',
    'submixes-in-unreal-engine',
    'subtitles-and-closed-captions-plugin',

    // Media Framework & Video
    'media-framework-in-unreal-engine',
    'integrating-media-in-unreal-engine',
    'capturing-media-in-unreal-engine',
    'communicating-with-media-components-from-unreal-engine',
    'the-media-plate-actor-in-unreal-engine',
    'bink-video-for-unreal-engine',
    'taking-screenshots-in-unreal-engine',
    'panoramic-capture-tool-in-unreal-engine',

    // Color Management
    'managing-color-in-unreal-engine',
    'color-management-with-opencolorio-in-unreal-engine',
    'color-correct-regions-in-unreal-engine',
    'working-color-space-in-unreal-engine',

    // Virtual Production (Advanced)
    'camera-lens-calibration-in-unreal-engine',
    'in-camera-vfx-in-unreal-engine',
    'rendering-to-multiple-displays-with-ndisplay-in-unreal-engine',
    'professional-video-io-in-unreal-engine',
    'timed-data-monitor-in-unreal-engine',
    'dmx-in-unreal-engine',

    // Testing & Automation
    'automation-test-framework-in-unreal-engine',
    'low-level-tests-in-unreal-engine',

    // Profiling & Performance
    'introduction-to-performance-profiling-and-configuration-in-unreal-engine',
    'common-memory-and-cpu-performance-considerations-in-unreal-engine',
    'unreal-insights-in-unreal-engine',
    'unreal-engine-stats-system-overview',
    'stat-commands-in-unreal-engine',
    'significance-manager-in-unreal-engine',
    'optimizing-rendering-with-pso-caches-in-unreal-engine',
    'using-oodle-in-unreal-engine',
    'zen-loader-in-unreal-engine',

    // Debugging Tools
    'console-variables-editor',
    'crash-reporting-in-unreal-engine',
    'using-the-gameplay-debugger-in-unreal-engine',
    'visual-logger-in-unreal-engine',
    'using-clang-sanitizers-in-unreal-engine-projects',

    // UI/UMG (Detailed)
    'basics-of-user-interface-development-in-unreal-engine',
    'building-your-ui-in-unreal-engine',
    'displaying-your-ui-in-unreal-engine',
    'designing-ui-for-accessibility-in-unreal-engine',
    'optimizing-user-interfaces-in-unreal-engine',
    'testing-and-debugging-user-interfaces-in-unreal-engine',
    'plugins-for-ui-development-in-unreal-engine',
    'slate-user-interface-programming-framework-for-unreal-engine',
    'text-formatting-in-unreal-engine',
    'text-formatting-localization-and-fonts-in-unreal-engine',
    'using-fonts-in-unreal-engine',
    'tutorials-and-examples-for-user-interfaces-in-unreal-engine',
    'umg-best-practices-in-unreal-engine',
    'umg-editor-reference-for-unreal-engine',
    'widget-type-reference-for-umg-ui-designer-in-unreal-engine',

    // Mobile (Advanced)
    'android-support-for-unreal-engine',
    'ios-ipados-and-tvos-support-for-unreal-engine',
    'automotive-hmi-development-in-unreal-engine',
    'gauntlet-automation-framework-in-unreal-engine',
    'how-to-use-unreal-insights-to-profile-android-games-for-unreal-engine',
    'mobile-rendering-and-shading-modes-for-unreal-engine',
    'optimization-and-development-best-practices-for-mobile-projects-in-unreal-engine',
    'packaging-android-projects-in-unreal-engine',
    'packaging-ios-projects-in-unreal-engine',
    'setting-up-an-unreal-engine-project-for-mobile-platforms',
    'using-lumen-global-illumination-on-mobile-in-unreal-engine',
    'using-renderdoc-with-unreal-engine',
    'using-the-mobile-previewer-in-unreal-engine',

    // Niagara VFX (Detailed)
    'getting-started-in-niagara-effects-for-unreal-engine',
    'collisions-in-niagara-for-unreal-engine',
    'creating-custom-modules-in-niagara-effects-for-unreal-engine',
    'data-channels-in-niagara-for-unreal-engine',
    'debugging-and-optimization-in-niagara-effects-for-unreal-engine',
    'niagara-fluids-in-unreal-engine',
    'niagara-lightweight-emitters',
    'niagara-scratch-pad-modules-in-unreal-engine',
    'reference-for-niagara-effects-in-unreal-engine',
    'tutorials-for-niagara-effects-in-unreal-engine',

    // Rendering (Deep Dive)
    'anti-aliasing-and-upscaling-in-unreal-engine',
    'artists-tools-and-workflows-for-rendering-in-unreal-engine',
    'asynccompute-in-unreal-engine',
    'creating-a-new-global-shader-as-a-plugin-in-unreal-engine',
    'creating-and-using-lods-in-unreal-engine',
    'environmental-light-with-fog-clouds-sky-and-atmosphere-in-unreal-engine',
    'features-and-properties-of-lights-in-unreal-engine',
    'forward-shading-renderer-in-unreal-engine',
    'fshadercache-in-unreal-engine',
    'general-features-of-rendering-in-unreal-engine',
    'generating-lightmap-uvs-in-unreal-engine',
    'geographically-accurate-sun-positioning-tool-in-unreal-engine',
    'global-illumination-in-unreal-engine',
    'gpudump-viewer-tool-in-unreal-engine',
    'graphics-programming-for-unreal-engine',
    'graphics-programming-overview-for-unreal-engine',
    'hdri-backdrop-visualization-tool-in-unreal-engine',
    'heterogeneous-volumes-in-unreal-engine',
    'landscape-materials-in-unreal-engine',
    'large-world-coordinates-rendering-in-unreal-engine-5',
    'light-types-and-their-mobility-in-unreal-engine',
    'lumen-technical-details-in-unreal-engine',
    'mesh-distance-fields-in-unreal-engine',
    'mesh-drawing-pipeline-in-unreal-engine',
    'optimizing-and-debugging-projects-for-realtime-rendering-in-unreal-engine',
    'orthographic-camera-in-unreal-engine',
    'overview-of-shaders-in-plugins-unreal-engine',
    'parallel-rendering-overview-for-unreal-engine',
    'path-tracer-in-unreal-engine',
    'physically-based-materials-in-unreal-engine',
    'ray-tracing-and-path-tracing-features-in-unreal-engine',
    'reflections-environment-in-unreal-engine',
    'render-dependency-graph-in-unreal-engine',
    'render-resource-viewer-in-unreal-engine',
    'rendering-components-in-unreal-engine',
    'rendering-high-quality-frames-with-movie-render-queue-in-unreal-engine',
    'shader-development-in-unreal-engine',
    'shaders-in-plugins-for-unreal-engine',
    'shadowing-in-unreal-engine',
    'skeletal-mesh-rendering-paths-in-unreal-engine',
    'sparse-volume-textures-in-unreal-engine',
    'sun-and-sky-actor-in-unreal-engine',
    'supported-features-by-rendering-path-for-desktop-with-unreal-engine',
    'temporal-super-resolution-in-unreal-engine',
    'texture-streaming-in-unreal-engine',
    'textures-in-unreal-engine',
    'third-party-rendering-tools-and-plugins-in-unreal-engine',
    'threaded-rendering-in-unreal-engine',
    'understanding-lightmapping-in-unreal-engine',
    'uv-editor-in-unreal-engine',
    'visibility-and-occlusion-culling-in-unreal-engine',

    // Content Import & Interchange
    'alembic-file-importer-in-unreal-engine',
    'artist-quick-start-in-unreal-engine',
    'datasmith-plugins-for-unreal-engine',
    'fbx-content-pipeline',
    'hair-rendering-and-simulation-in-unreal-engine',
    'interchange-framework-in-unreal-engine',
    'lidar-point-cloud-plugin-for-unreal-engine',
    'localizing-content-in-unreal-engine',
    'modeling-and-geometry-scripting-in-unreal-engine',
    'static-meshes',
    'the-gl-transmission-format-gltf-in-unreal-engine',
    'using-speedtree-in-unreal-engine',
    'working-with-scene-variants-in-unreal-engine',

    // Gameplay Framework (Common Features)
    'actors-in-unreal-engine',
    'components-in-unreal-engine',
    'pawns-in-unreal-engine',
    'characters-in-unreal-engine',
    'player-controllers-in-unreal-engine',
    'game-mode-and-game-state-in-unreal-engine',
    'player-state-in-unreal-engine',
    'input-in-unreal-engine',
    'enhanced-input-in-unreal-engine',
    'timers-in-unreal-engine',
    'delegates-in-unreal-engine',

    // Animation (Common Features)
    'animation-sequences-in-unreal-engine',
    'animation-retargeting-in-unreal-engine',
    'animation-montages-in-unreal-engine',
    'blend-spaces-in-unreal-engine',
    'animation-state-machines-in-unreal-engine',
    'inverse-kinematics-in-unreal-engine',
    'animation-curves-in-unreal-engine',
    'animation-notifies-in-unreal-engine',
    'skeletal-mesh-sockets-in-unreal-engine',

    // Materials (Common Features)
    'material-functions-in-unreal-engine',
    'material-parameter-collections-in-unreal-engine',
    'material-layers-in-unreal-engine',
    'material-attributes-in-unreal-engine',
    'decals-in-unreal-engine',
    'physically-based-rendering-in-unreal-engine',

    // Lighting (Common Features)
    'light-mobility-in-unreal-engine',
    'light-functions-in-unreal-engine',
    'ies-light-profiles-in-unreal-engine',
    'volumetric-fog-in-unreal-engine',
    'exponential-height-fog-in-unreal-engine',
    'lightmass-in-unreal-engine',

    // Collision & Physics
    'collision-in-unreal-engine',
    'collision-responses-in-unreal-engine',
    'physics-bodies-in-unreal-engine',
    'physics-constraints-in-unreal-engine',
    'physics-materials-in-unreal-engine',
    'destructible-actors-in-unreal-engine',

    // Cameras & Cinematics
    'cameras-in-unreal-engine',
    'camera-components-in-unreal-engine',
    'matinee-in-unreal-engine',
    'level-sequences-in-unreal-engine',
    'camera-animation-in-unreal-engine',

    // Networking
    'networking-overview-in-unreal-engine',
    'replication-in-unreal-engine',
    'rpcs-in-unreal-engine',
    'network-relevancy-in-unreal-engine',
    'dedicated-servers-in-unreal-engine',

    // Editor Features
    'editor-scripting-in-unreal-engine',
    'python-scripting-in-unreal-engine',
    'commandlets-in-unreal-engine',
    'blueprints-nativization-in-unreal-engine',

    // Landscape & Foliage
    'foliage-tool-in-unreal-engine',
    'grass-tool-in-unreal-engine',
    'landscape-splines-in-unreal-engine',
    'landscape-sculpting-in-unreal-engine',
    'landscape-painting-in-unreal-engine',
    'procedural-foliage-tool-in-unreal-engine',

    // Plugins & Modules
    'plugins-in-unreal-engine',
    'creating-plugins-in-unreal-engine',
    'plugin-system-in-unreal-engine',
    'modules-in-unreal-engine',

    // Build System
    'unreal-build-tool-in-unreal-engine',
    'unreal-header-tool-in-unreal-engine',
    'build-configuration-in-unreal-engine',

    // Version Control
    'perforce-integration-in-unreal-engine',
    'git-source-control-in-unreal-engine',
    'plastic-scm-in-unreal-engine',

    // Metahuman
    'metahuman-creator-in-unreal-engine',
    'metahuman-animator-in-unreal-engine',
    'metahuman-identity-in-unreal-engine',

    // Geometry Tools
    'bsp-brushes-in-unreal-engine',
    'geometry-editing-in-unreal-engine',
    'procedural-mesh-component-in-unreal-engine',

    // Sound & Audio Advanced
    'sound-cues-in-unreal-engine',
    'sound-classes-in-unreal-engine',
    'attenuation-in-unreal-engine',
    'sound-concurrency-in-unreal-engine',
    'audio-modulation-in-unreal-engine',

    // Quixel & Mega Assets
    'quixel-bridge-in-unreal-engine',
    'megascans-in-unreal-engine',

    // Performance & Optimization
    'gpu-profiling-in-unreal-engine',
    'cpu-profiling-in-unreal-engine',
    'memory-profiling-in-unreal-engine',
    'draw-call-optimization-in-unreal-engine',
    'level-of-detail-in-unreal-engine',
    'occlusion-culling-in-unreal-engine',

    // Gameplay Abilities
    'gameplay-ability-system-in-unreal-engine',
    'gameplay-tags-in-unreal-engine',
    'gameplay-tasks-in-unreal-engine',
    'gameplay-effects-in-unreal-engine',

    // AI Advanced
    'ai-perception-in-unreal-engine',
    'ai-debugging-in-unreal-engine',
    'behavior-tree-decorators-in-unreal-engine',
    'behavior-tree-services-in-unreal-engine',
    'behavior-tree-tasks-in-unreal-engine',

    // VFX Advanced
    'particle-systems-cascade-in-unreal-engine',
    'gpu-particles-in-unreal-engine',
    'beam-emitters-in-unreal-engine',

    // Rendering Advanced
    'screen-space-reflections-in-unreal-engine',
    'ambient-occlusion-in-unreal-engine',
    'bloom-in-unreal-engine',
    'depth-of-field-in-unreal-engine',
    'motion-blur-in-unreal-engine',
    'tone-mapping-in-unreal-engine',

    // Sequencer Advanced
    'sequencer-scripting-in-unreal-engine',
    'render-movie-settings-in-unreal-engine',
    'takes-recorder-in-unreal-engine',
    'sequencer-tracks-in-unreal-engine',

    // C++ Programming Fundamentals
    'programming-in-the-unreal-engine-architecture',
    'epic-cplusplus-coding-standard-for-unreal-engine',
    'setting-up-your-development-environment-for-cplusplus-in-unreal-engine',
    'reflection-system-in-unreal-engine',
    'object-pointers-in-unreal-engine',
    'containers-in-unreal-engine',
    'delegates-and-lambda-functions-in-unreal-engine',
    'metadata-specifiers-in-unreal-engine',
    'gameplay-classes-in-unreal-engine',

    // Gameplay Framework (Expanded)
    'controllers-in-unreal-engine',
    'data-driven-gameplay-elements-in-unreal-engine',
    'gameplay-camera-system',
    'gameplay-targeting-system-in-unreal-engine',
    'gameplay-timers-in-unreal-engine',
    'user-interfaces-and-huds-in-unreal-engine',
    'class-creation-basics-in-unreal-engine',

    // AI Systems (Expanded)
    'artificial-intelligence-in-unreal-engine',
    'smart-objects-in-unreal-engine',
    'state-tree-in-unreal-engine',

    // Physics (Expanded)
    'physics-in-unreal-engine',
    'chaos-destruction-in-unreal-engine',
    'cloth-simulation-in-unreal-engine',
    'hair-physics-in-unreal-engine',

    // Collision & Traces
    'traces-with-raycasts-in-unreal-engine',

    // Networking (Expanded)
    'networking-and-multiplayer-in-unreal-engine',
    'online-subsystems-and-services-in-unreal-engine',

    // Vehicles & Movement
    'vehicles-in-unreal-engine',
    'mover-in-unreal-engine',

    // Game Features
    'game-features-and-modular-gameplay-in-unreal-engine',
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
