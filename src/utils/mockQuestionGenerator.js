/**
 * Utility to generate mock questions for Test View visualization
 * Generates realistic questions across all 7 disciplines
 */

const generateDisciplineQuestions = (discipline, count, startId) => {
  const questions = [];
  const difficulties = ["Easy", "Medium", "Hard"];

  const topics = {
    Worldbuilding: [
      "Landscape",
      "Foliage",
      "Water",
      "World Partition",
      "Level Streaming",
    ],
    "Game Dev": ["Blueprints", "C++", "Input", "Game Mode", "Physics"],
    "Look Dev": ["Materials", "Lighting", "Post Process", "Lumen", "Nanite"],
    "Tech Art": ["Optimization", "Shaders", "Profiling", "LODs", "HLSL"],
    VFX: ["Niagara", "Particles", "Emitters", "Systems", "Modules"],
    Animation: [
      "Control Rig",
      "Sequencer",
      "Retargeting",
      "Skeletons",
      "Montages",
    ],
    Programming: [
      "Memory Management",
      "Replication",
      "threading",
      "Subsystems",
      "Interfaces",
    ],
  };

  const disciplineTopics = topics[discipline] || ["General"];

  for (let i = 0; i < count; i++) {
    const isMC = Math.random() > 0.3; // 70% Multiple Choice
    const difficulty =
      difficulties[Math.floor(Math.random() * difficulties.length)];
    const topic =
      disciplineTopics[Math.floor(Math.random() * disciplineTopics.length)];

    questions.push({
      id: `mock-${startId + i}`,
      uniqueId: `mock-${startId + i}`,
      discipline: discipline,
      question: `[MOCK] ${discipline} Question about ${topic} #${
        i + 1
      }: How would you implement this feature in UE5?`,
      answer: "Correct Answer",
      options: isMC
        ? [
            "Correct Answer",
            "Wrong Option A",
            "Wrong Option B",
            "Wrong Option C",
          ]
        : ["True", "False"],
      correctAnswer: isMC
        ? "Correct Answer"
        : Math.random() > 0.5
        ? "True"
        : "False",
      difficulty: difficulty,
      type: isMC ? "Multiple Choice" : "True/False",
      status: "accepted", // Crucial for passing the filter
      tags: [topic, discipline, "Mock Data"],
      aiScore: Math.floor(Math.random() * 30) + 70, // 70-100
      createdAt: new Date().toISOString(),
      creatorName: "Mock Generator",
    });
  }

  return questions;
};

export const generateMockQuestions = () => {
  let allQuestions = [];
  let currentId = 1000;

  // Generate ~10 questions per discipline
  const disciplines = [
    "Worldbuilding",
    "Game Dev",
    "Look Dev",
    "Tech Art",
    "VFX",
    "Animation",
    "Programming",
  ];

  disciplines.forEach((d) => {
    const count = d === "Tech Art" || d === "VFX" || d === "Animation" ? 8 : 10;
    const qs = generateDisciplineQuestions(d, count, currentId);
    allQuestions = [...allQuestions, ...qs];
    currentId += count;
  });

  return allQuestions;
};
