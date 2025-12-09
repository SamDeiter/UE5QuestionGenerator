export const TAGS_BY_DISCIPLINE = {
    "Technical Art": [
        "#Nanite", "#VirtualizedGeometry", "#LODs", "#MeshOptimization", "#Polycount",
        "#Pipeline", "#Workflow", "#Automation", "#Scripting", "#Python",
        "#CustomTools", "#DCCIntegration", "#Optimization", "#Profiling", "#PerformanceTuning",
        "#DrawCalls", "#MemoryManagement", "#UnrealInsights", "#GPU", "#CPU"
    ],
    "Lighting & Rendering": [
        "#Rendering", "#Shaders", "#Materials", "#MaterialEditor", "#Substrate",
        "#Lighting", "#Lumen", "#Reflections", "#RayTracing", "#VirtualShadowMaps",
        "#PostProcess", "#GlobalIllumination", "#AntiAliasing", "#TSR"
    ],
    "Look Development (Materials)": [
        "#Materials", "#MaterialEditor", "#Substrate", "#Shaders", "#Textures",
        "#UVs", "#Instances", "#MaterialGraphs", "#MaterialFunctions", "#Decals",
        "#PBR"
    ],
    "Animation & Rigging": [
        "#Rigging", "#Skinning", "#ControlRig", "#AnimationBlueprint", "#StateMachines",
        "#IK", "#Retargeting", "#Metahumans", "#Sequencer", "#MotionMatching",
        "#RootMotion", "#AnimationLayers"
    ],
    "VFX (Niagara)": [
        "#VFX", "#Niagara", "#ParticleSystems", "#ChaosPhysics", "#Simulation",
        "#Groom", "#Cloth", "#Fluids", "#NiagaraFluids", "#DataInterface"
    ],
    "World Building & Level Design": [
        "#LevelDesign", "#WorldBuilding", "#PCG", "#ProceduralGeneration", "#WorldPartition",
        "#Terrain", "#Landscape", "#Foliage", "#Water", "#DataLayers",
        "#LevelInstancing", "#OneFilePerActor"
    ],
    "Blueprints": [
        "#Blueprint", "#VisualScripting", "#Macros", "#Functions", "#EventGraph",
        "#ConstructionScript", "#Variables", "#FlowControl", "#EventDispatchers", "#Interfaces",
        "#ActorCommunication", "#Debugging"
    ],
    "Game Logic & Systems": [
        "#GameFramework", "#GameMode", "#GameState", "#PlayerController", "#Pawn",
        "#Character", "#Input", "#EnhancedInput", "#SaveSystem", "#GameplayAbilities",
        "#GAS", "#AIController", "#Navigation"
    ],
    "C++ Programming": [
        "#Cpp", "#UObject", "#Actor", "#GarbageCollection", "#MemoryManagement",
        "#Performance", "#Modules", "#Plugins", "#Reflection", "#Delegates",
        "#Multithreading", "#Slate", "#EditorExtensions"
    ],
    "Networking": [
        "#Replication", "#ServerAuthoritative", "#RPCs", "#NetworkCompaction", "#Relevancy",
        "#BandwidthOptimization", "#DedicatedServer", "#ReplicationGraph", "#Ownership"
    ],
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

    // Combine and remove duplicates
    return [...new Set([...predefined, ...custom])];
};
