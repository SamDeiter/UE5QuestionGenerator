/**
 * Tag Taxonomy v2.0
 * - 15 tags per discipline for balanced coverage
 * - Tag aliases for normalization
 * - Cross-cutting tags assigned to primary discipline only
 */

export const TAGS_BY_DISCIPLINE = {
  "Technical Art": [
    "#Nanite",
    "#LODs",
    "#MeshOptimization",
    "#Polycount",
    "#AssetPipeline",
    "#DCCIntegration",
    "#Profiling",
    "#DrawCalls",
    "#MemoryBudget",
    "#UnrealInsights",
    "#GPU",
    "#CPU",
    "#BatchingInstancing",
    "#Streaming",
    "#TextureOptimization",
  ],
  "Lighting & Rendering": [
    "#Lumen",
    "#LumenGI",
    "#LumenReflections",
    "#RayTracing",
    "#VirtualShadowMaps",
    "#PostProcess",
    "#GlobalIllumination",
    "#TSR",
    "#AntiAliasing",
    "#Exposure",
    "#VolumetricFog",
    "#ScreenSpaceEffects",
    "#ColorGrading",
    "#PathTracing",
    "#LightBaking",
  ],
  "Look Development (Materials)": [
    "#Materials",
    "#MaterialEditor",
    "#Substrate",
    "#Shaders",
    "#Textures",
    "#UVs",
    "#MaterialInstances",
    "#MaterialFunctions",
    "#Decals",
    "#PBR",
    "#MaterialLayers",
    "#WorldPositionOffset",
    "#Tessellation",
    "#VirtualTextures",
    "#Transparency",
  ],
  "Animation & Rigging": [
    "#ControlRig",
    "#AnimationBlueprint",
    "#StateMachines",
    "#IK",
    "#Retargeting",
    "#MetaHumans",
    "#Sequencer",
    "#MotionMatching",
    "#RootMotion",
    "#AnimLayers",
    "#Skinning",
    "#BlendSpaces",
    "#Montages",
    "#AnimNotifies",
    "#FullBodyIK",
  ],
  "VFX (Niagara)": [
    "#Niagara",
    "#NiagaraSystems",
    "#NiagaraModules",
    "#ParticleSimulation",
    "#Fluids",
    "#Groom",
    "#ClothSimulation",
    "#ChaosPhysics",
    "#GPUParticles",
    "#DataInterfaces",
    "#RibbonRendering",
    "#MeshParticles",
    "#ScratchPad",
    "#EventHandlers",
    "#AttributeReader",
  ],
  "World Building & Level Design": [
    "#WorldPartition",
    "#PCG",
    "#Landscape",
    "#Foliage",
    "#Water",
    "#DataLayers",
    "#LevelStreaming",
    "#HLOD",
    "#LargeWorldCoordinates",
    "#Terrain",
    "#SplineMeshes",
    "#LevelInstances",
    "#WorldComposition",
    "#GeometryCollection",
    "#NavMesh",
  ],
  Blueprints: [
    "#Blueprint",
    "#EventGraph",
    "#ConstructionScript",
    "#Functions",
    "#Macros",
    "#Variables",
    "#EventDispatchers",
    "#Interfaces",
    "#ActorCommunication",
    "#Debugging",
    "#FlowControl",
    "#AsyncNodes",
    "#LatentActions",
    "#BlueprintNativization",
    "#Casting",
  ],
  "Game Logic & Systems": [
    "#GameplayAbilitySystem",
    "#GameMode",
    "#GameState",
    "#PlayerController",
    "#Character",
    "#EnhancedInput",
    "#SaveSystem",
    "#AIController",
    "#BehaviorTrees",
    "#EQS",
    "#Subsystems",
    "#DataAssets",
    "#GameFeatures",
    "#SmartObjects",
    "#StateTree",
  ],
  "C++ Programming": [
    "#Cpp",
    "#UObject",
    "#AActor",
    "#GarbageCollection",
    "#Modules",
    "#Plugins",
    "#Reflection",
    "#Delegates",
    "#Multithreading",
    "#Slate",
    "#EditorExtensions",
    "#PropertySystem",
    "#UFUNCTION",
    "#UPROPERTY",
    "#BlueprintExposure",
  ],
  Networking: [
    "#Replication",
    "#RPCs",
    "#NetRelevancy",
    "#BandwidthOptimization",
    "#DedicatedServer",
    "#ReplicationGraph",
    "#Ownership",
    "#Prediction",
    "#Rollback",
    "#SessionManagement",
    "#OnlineSubsystems",
    "#NetSerialize",
    "#NetConditions",
    "#PushModel",
    "#IrisReplication",
  ],
};

/**
 * Tag Aliases - Normalize variations to canonical form
 */
export const TAG_ALIASES = {
  // Abbreviations
  "#VSM": "#VirtualShadowMaps",
  "#GAS": "#GameplayAbilitySystem",
  "#ABP": "#AnimationBlueprint",
  "#BP": "#Blueprint",
  "#CPP": "#Cpp",
  "#RT": "#RayTracing",
  "#GI": "#GlobalIllumination",
  "#LWC": "#LargeWorldCoordinates",
  "#WPO": "#WorldPositionOffset",
  "#VT": "#VirtualTextures",
  "#OFPA": "#WorldPartition", // One File Per Actor
  "#EIS": "#EnhancedInput",
  "#BT": "#BehaviorTrees",

  // Variations
  "#VirtualizedGeometry": "#Nanite",
  "#NaniteVirtualGeometry": "#Nanite",
  "#TemporalSuperResolution": "#TSR",
  "#GlobalIllum": "#GlobalIllumination",
  "#AnimBlueprint": "#AnimationBlueprint",
  "#AnimBP": "#AnimationBlueprint",
  "#MatEditor": "#MaterialEditor",
  "#MatFunctions": "#MaterialFunctions",
  "#ParticleSystems": "#Niagara",
  "#Particles": "#Niagara",
  "#ChaosDestruction": "#ChaosPhysics",
  "#Chaos": "#ChaosPhysics",
  "#ProceduralGeneration": "#PCG",
  "#ProceduralContentGeneration": "#PCG",
  "#VisualScripting": "#Blueprint",
  "#Abilities": "#GameplayAbilitySystem",
  "#Input": "#EnhancedInput",
  "#InputSystem": "#EnhancedInput",
  "#Navigation": "#NavMesh",
  "#AINav": "#NavMesh",
  "#Skeletal": "#Skinning",
  "#SkeletalMesh": "#Skinning",
  "#Metahuman": "#MetaHumans",
  "#MetaHuman": "#MetaHumans",
  "#Cinematics": "#Sequencer",
  "#MovieScene": "#Sequencer",
};

/**
 * Normalizes a tag to its canonical form
 * @param {string} tag - The tag to normalize (with or without #)
 * @returns {string} Canonical tag form
 */
export const normalizeTag = (tag) => {
  // Ensure tag starts with #
  const normalized = tag.startsWith("#") ? tag : `#${tag}`;

  // Check aliases first
  if (TAG_ALIASES[normalized]) {
    return TAG_ALIASES[normalized];
  }

  // Return as-is if no alias found
  return normalized;
};

/**
 * Validates tags against allowed list for a discipline
 * @param {Array} tags - Array of tags to validate
 * @param {string} discipline - The discipline to validate against
 * @returns {Object} { valid: [], invalid: [], normalized: [] }
 */
export const validateTags = (tags, discipline) => {
  const allowedTags = TAGS_BY_DISCIPLINE[discipline] || [];
  const result = { valid: [], invalid: [], normalized: [] };

  tags.forEach((tag) => {
    const normalized = normalizeTag(tag);
    result.normalized.push(normalized);

    if (allowedTags.includes(normalized)) {
      result.valid.push(normalized);
    } else {
      // Check if it's valid in ANY discipline
      const isValidElsewhere = Object.values(TAGS_BY_DISCIPLINE)
        .flat()
        .includes(normalized);

      if (isValidElsewhere) {
        result.valid.push(normalized); // Allow cross-discipline tags
      } else {
        result.invalid.push(normalized);
      }
    }
  });

  return result;
};

/**
 * Merges predefined tags with user's custom tags for a specific discipline
 * @param {string} discipline - The discipline name
 * @param {Object} customTags - Object mapping discipline names to arrays of custom tags
 * @returns {Array} Combined array of predefined and custom tags
 */
export const getMergedTags = (discipline, customTags = {}) => {
  const predefined = TAGS_BY_DISCIPLINE[discipline] || [];
  const custom = customTags[discipline] || [];

  // Combine and remove duplicates, normalizing custom tags
  const normalizedCustom = custom.map(normalizeTag);
  return [...new Set([...predefined, ...normalizedCustom])];
};

/**
 * Gets all unique tags across all disciplines
 * @returns {Array} All unique tags
 */
export const getAllTags = () => {
  return [...new Set(Object.values(TAGS_BY_DISCIPLINE).flat())];
};
