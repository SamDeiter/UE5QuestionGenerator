/**
 * Utility to generate mock questions for Test View visualization
 * Generates realistic questions across all 7 disciplines
 *
 * NOTE: Uses Math.random extensively for test data generation.
 * This is intentional - mock data doesn't need cryptographic security.
 */
/* eslint-disable sonarjs/pseudo-random */

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

  let lastCorrectSlot = -1;

  for (let i = 0; i < count; i++) {
    const isMC = Math.random() > 0.3; // 70% Multiple Choice
    // Cycle through difficulties to ensure a mix (Easy -> Medium -> Hard -> Easy...)
    const difficulty = difficulties[i % difficulties.length];
    const topic =
      disciplineTopics[Math.floor(Math.random() * disciplineTopics.length)];

    // Options Logic
    const letters = ["a", "b", "c", "d"];
    let optionsObj = {};
    let correctKey = "";

    if (isMC) {
      // 1. Define raw options
      const wrongOptions = [
        "Wrong Option A",
        "Wrong Option B",
        "Wrong Option C",
      ];
      // Shuffle wrong options so they don't always appear in same order relative to each other
      wrongOptions.sort(() => Math.random() - 0.5);

      // 2. Determine Correct Slot (Ensure no immediate repeats)
      // If this is the first question, pick any slot. Otherwise, ensure distinct from last.
      let correctSlot;
      do {
        correctSlot = Math.floor(Math.random() * 4);
      } while (correctSlot === lastCorrectSlot);

      lastCorrectSlot = correctSlot; // Update tracker for next iteration

      // 3. Build Final Array
      const finalOptionsArr = new Array(4);
      finalOptionsArr[correctSlot] = "Correct Answer";

      // Fill empty slots with wrong options
      let wrongIdx = 0;
      for (let j = 0; j < 4; j++) {
        if (j !== correctSlot) {
          finalOptionsArr[j] = wrongOptions[wrongIdx++];
        }
      }

      // 4. Assign to letters
      finalOptionsArr.forEach((opt, idx) => {
        const key = letters[idx];
        optionsObj[key] = opt;
        if (opt === "Correct Answer") correctKey = key;
      });
    } else {
      // Boolean logic
      optionsObj = { true: "True", false: "False" };
      correctKey = Math.random() > 0.5 ? "true" : "false";
    }

    questions.push({
      id: `mock-${startId + i}`,
      uniqueId: `mock-${startId + i}`,
      discipline: discipline,
      question: `[MOCK] ${discipline} Question about ${topic} #${
        i + 1
      }: How would you implement this feature in UE5?`,
      answer: "Correct Answer", // Plain text answer
      options: optionsObj,
      correct: correctKey, // Stores the KEY ('a', 'b', 'true', etc)
      correctAnswer: correctKey, // Legacy field sync
      difficulty: difficulty,
      type: isMC ? "Multiple Choice" : "True/False",
      status: "accepted",
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
