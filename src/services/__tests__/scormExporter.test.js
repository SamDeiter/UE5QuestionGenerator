/* eslint-disable sonarjs/no-nested-functions */
/**
 * SCORM Exporter Service Tests - Production Stability
 *
 * CRITICAL: These tests use REAL Firestore field names to prevent field name mismatches.
 * The "Firestore Question Shape" tests are integration tests that verify compatibility.
 *
 * Field Name Reference (Firestore schema):
 *   - question: The question text
 *   - choices: Array of answer options
 *   - correctAnswer: The correct choice
 *   - type: "Multiple Choice" or "True/False"
 *   - difficulty: "Easy", "Medium", "Hard"
 *   - discipline: The category/topic
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  convertQuestionToScormFormat,
  validateQuestionsForExport,
  generateScormPackageFiles,
  isEnglishText,
  filterEnglishQuestions,
} from "../scormExporter";

describe("SCORM Exporter Service", () => {
  // =====================================================
  // FIRESTORE QUESTION SHAPE - Real production data format
  // =====================================================

  /**
   * CRITICAL: This is the REAL shape of questions from Firestore.
   * Tests MUST use this shape to catch field name mismatches.
   */
  const firestoreQuestion = {
    id: "abc123",
    guid: "q1-guid",
    question: "What is Nanite in Unreal Engine 5?", // NOTE: 'question' not 'questionText'
    type: "Multiple Choice",
    difficulty: "Medium",
    discipline: "Rendering",
    choices: [
      "Virtualized geometry system",
      "Lighting system",
      "Sound system",
      "Physics engine",
    ],
    correctAnswer: "Virtualized geometry system",
    status: "accepted",
    language: "English",
  };

  const firestoreTrueFalseQuestion = {
    id: "tf123",
    guid: "tf1-guid",
    question: "Lumen is UE5's global illumination system.", // NOTE: 'question' not 'questionText'
    type: "True/False",
    difficulty: "Easy",
    discipline: "Lighting",
    choices: ["True", "False"],
    correctAnswer: "True",
    status: "accepted",
    language: "English",
  };

  // Legacy format (for backward compatibility)
  const legacyQuestion = {
    id: "legacy1",
    guid: "legacy1",
    questionText: "What is Nanite?", // Legacy field name
    type: "Multiple Choice",
    difficulty: "Beginner",
    choices: ["Geometry System", "Lighting System", "Sound System"],
    correctAnswer: "Geometry System",
  };

  const invalidQuestion = {
    id: "invalid1",
    guid: "invalid1",
    question: "", // Empty question text
    type: "Multiple Choice",
    choices: ["A"], // Too few choices
    correctAnswer: "B", // Not in choices
  };

  // =====================================================
  // convertQuestionToScormFormat
  // =====================================================
  describe("convertQuestionToScormFormat", () => {
    it("CRITICAL: should handle Firestore 'question' field (production format)", () => {
      const result = convertQuestionToScormFormat(firestoreQuestion);

      // normalizeQuestion uses id (abc123), not guid (q1-guid)
      expect(result.id).toBe("abc123");
      expect(result.text).toBe("What is Nanite in Unreal Engine 5?");
      expect(result.choices).toHaveLength(4);
      expect(result.difficulty).toBe("Medium");

      // Verify correct answer is marked
      const correctChoice = result.choices.find((c) => c.correct);
      expect(correctChoice.text).toBe("Virtualized geometry system");
    });

    it("should handle True/False questions from Firestore", () => {
      const result = convertQuestionToScormFormat(firestoreTrueFalseQuestion);

      expect(result.text).toBe("Lumen is UE5's global illumination system.");
      expect(result.choices).toHaveLength(2);
      expect(result.choices.find((c) => c.text === "True").correct).toBe(true);
      expect(result.choices.find((c) => c.text === "False").correct).toBe(
        false
      );
    });

    // =====================================================
    // TRUE/FALSE REGRESSION TESTS - CRITICAL BUG FIX
    // Prevents: T/F questions showing 4 choices all labeled "F"
    // Root cause: Database had options {a, b, c, d} for T/F questions
    // =====================================================
    describe("True/False Question Filtering (Regression)", () => {
      it("CRITICAL: should filter T/F question with 4 options to only 2 choices", () => {
        // This is the REAL bug scenario - T/F question with 4 options in database
        const malformedTrueFalse = {
          id: "tf-bug",
          question: "Nanite uses mesh shaders.",
          type: "True/False",
          difficulty: "Medium",
          options: {
            a: "True",
            b: "False",
            c: "Sometimes",
            d: "Only on PC",
          },
          correct: "a",
        };
        const result = convertQuestionToScormFormat(malformedTrueFalse);

        // MUST be exactly 2 choices
        expect(result.choices).toHaveLength(2);
        // MUST only contain True and False
        expect(result.choices.map((c) => c.text).sort()).toEqual([
          "False",
          "True",
        ]);
        // Correct answer should be True
        expect(result.choices.find((c) => c.text === "True").correct).toBe(
          true
        );
        expect(result.choices.find((c) => c.text === "False").correct).toBe(
          false
        );
      });

      it("CRITICAL: should handle T/F type variations", () => {
        const tfQuestion = {
          id: "tf-variant",
          question: "Lumen works on mobile.",
          type: "T/F", // Variant spelling
          difficulty: "Easy",
          options: {
            a: "True",
            b: "False",
            c: "Depends",
            d: "N/A",
          },
          correct: "b",
        };
        const result = convertQuestionToScormFormat(tfQuestion);

        expect(result.choices).toHaveLength(2);
        expect(result.choices.find((c) => c.text === "False").correct).toBe(
          true
        );
      });

      it("should preserve 2-choice T/F questions as-is", () => {
        // Already correct format - should not modify
        const correctTF = {
          id: "tf-correct",
          question: "UE5 is free to use.",
          type: "True/False",
          difficulty: "Easy",
          options: {
            a: "True",
            b: "False",
          },
          correct: "a",
        };
        const result = convertQuestionToScormFormat(correctTF);

        expect(result.choices).toHaveLength(2);
        expect(result.choices.find((c) => c.text === "True").correct).toBe(
          true
        );
      });

      it("should handle T/F with legacy choices array format", () => {
        const legacyTF = {
          id: "tf-legacy",
          question: "Blueprint is visual scripting.",
          type: "True/False",
          difficulty: "Easy",
          choices: ["True", "False", "Maybe", "Unknown"], // 4 choices
          correctAnswer: "True",
        };
        const result = convertQuestionToScormFormat(legacyTF);

        expect(result.choices).toHaveLength(2);
        expect(result.choices.find((c) => c.text === "True").correct).toBe(
          true
        );
      });

      it("should NOT filter Multiple Choice questions with 4 options", () => {
        // MC questions should keep all 4 choices
        const mcQuestion = {
          id: "mc-normal",
          question: "What is Nanite?",
          type: "Multiple Choice",
          difficulty: "Medium",
          options: {
            a: "Geometry system",
            b: "Lighting system",
            c: "Sound system",
            d: "Physics engine",
          },
          correct: "a",
        };
        const result = convertQuestionToScormFormat(mcQuestion);

        // MC keeps all 4 choices
        expect(result.choices).toHaveLength(4);
      });
    });

    it("should handle legacy 'questionText' field (backward compatibility)", () => {
      const result = convertQuestionToScormFormat(legacyQuestion);

      expect(result.id).toBe("legacy1");
      expect(result.text).toBe("What is Nanite?");
      expect(result.choices).toHaveLength(3);
    });

    it("should prefer 'question' over 'questionText' when both exist", () => {
      const mixedQuestion = {
        ...legacyQuestion,
        question: "Preferred question text",
        questionText: "Legacy text",
      };
      const result = convertQuestionToScormFormat(mixedQuestion);
      expect(result.text).toBe("Preferred question text");
    });

    it("should handle missing choices gracefully", () => {
      const noChoicesQuestion = {
        question: "Test question",
        choices: undefined,
        correctAnswer: "A",
      };
      // Should not throw
      const result = convertQuestionToScormFormat(noChoicesQuestion);
      expect(result.choices).toHaveLength(0);
    });

    it("should generate ID when guid is missing", () => {
      const noGuidQuestion = {
        ...firestoreQuestion,
        id: undefined,
        guid: undefined,
      };
      const result = convertQuestionToScormFormat(noGuidQuestion);
      // Fallback ID format: q-{timestamp}-{random}
      expect(result.id).toMatch(/^q-\d+-[a-z0-9]+$/);
    });
  });

  // =====================================================
  // validateQuestionsForExport
  // =====================================================
  describe("validateQuestionsForExport", () => {
    it("CRITICAL: should validate Firestore questions with 'question' field", () => {
      const result = validateQuestionsForExport([firestoreQuestion]);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should validate True/False questions", () => {
      const result = validateQuestionsForExport([firestoreTrueFalseQuestion]);
      expect(result.valid).toBe(true);
    });

    it("should validate legacy questions with 'questionText' field", () => {
      const result = validateQuestionsForExport([legacyQuestion]);
      expect(result.valid).toBe(true);
    });

    it("should detect empty question text", () => {
      const emptyTextQuestion = { ...firestoreQuestion, question: "" };
      const result = validateQuestionsForExport([emptyTextQuestion]);
      expect(result.valid).toBe(false);
      expect(result.errors.join(" ")).toContain("Missing question text");
    });

    it("should detect missing question field entirely", () => {
      const noTextQuestion = { ...firestoreQuestion };
      delete noTextQuestion.question;
      const result = validateQuestionsForExport([noTextQuestion]);
      expect(result.valid).toBe(false);
      expect(result.errors.join(" ")).toContain("Missing question text");
    });

    it("should detect insufficient choices", () => {
      const fewChoices = { ...firestoreQuestion, choices: ["Only one"] };
      const result = validateQuestionsForExport([fewChoices]);
      expect(result.valid).toBe(false);
      expect(result.errors.join(" ")).toContain("at least 2 choices");
    });

    it("should detect missing correct answer", () => {
      // When correctAnswer is undefined, validation detects missing correct answer
      const noAnswer = { ...firestoreQuestion, correctAnswer: undefined };
      const result = validateQuestionsForExport([noAnswer]);
      // Validation correctly detects missing correct answer
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("correct answer"))).toBe(
        true
      );
    });

    it("should detect correct answer not in choices", () => {
      // When correctAnswer is not found in choices, validation detects this error
      const wrongAnswer = {
        ...firestoreQuestion,
        correctAnswer: "Not in list",
      };
      const result = validateQuestionsForExport([wrongAnswer]);
      // Validation correctly detects that correctAnswer is not in choices
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.includes("not found in choices"))
      ).toBe(true);
    });

    it("should warn on low question count", () => {
      const result = validateQuestionsForExport([firestoreQuestion]);
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.join(" ")).toContain("Less than 5 questions");
    });

    it("should validate multiple questions and report all errors", () => {
      const result = validateQuestionsForExport([
        firestoreQuestion,
        invalidQuestion,
        firestoreTrueFalseQuestion,
      ]);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2); // At least 2 errors from invalidQuestion
    });
  });

  // =====================================================
  // generateScormPackageFiles
  // =====================================================
  describe("generateScormPackageFiles", () => {
    const fetchMock = vi.fn();

    beforeEach(() => {
      global.fetch = fetchMock;
      fetchMock.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve("TEMPLATE_CONTENT"),
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("CRITICAL: should generate package with Firestore questions", async () => {
      const config = {
        title: "UE5 Rendering Assessment",
        passingScore: 80,
        timeLimit: 60,
      };

      const files = await generateScormPackageFiles(
        [firestoreQuestion],
        config
      );

      expect(files["questions.js"]).toContain(
        'title: "UE5 Rendering Assessment"'
      );
      expect(files["questions.js"]).toContain("passingScore: 80");
      expect(files["questions.js"]).toContain("timeLimit: 3600"); // 60 * 60

      // Questions are Base64 encoded - decode and check
      const encodedMatch = files["questions.js"].match(
        /QUESTIONS_ENCODED = "([^"]+)"/
      );
      expect(encodedMatch).not.toBeNull();
      const decodedQuestions = JSON.parse(atob(encodedMatch[1]));
      expect(decodedQuestions[0].text).toBe(
        "What is Nanite in Unreal Engine 5?"
      );
    });

    it("should fetch all required template files", async () => {
      fetchMock.mockClear(); // Reset call count
      await generateScormPackageFiles([firestoreQuestion], {});

      expect(fetchMock).toHaveBeenCalledTimes(5);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("scorm.js")
      );
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("index.html")
      );
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("style.css")
      );
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("game.js")
      );
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("imsmanifest.xml")
      );
    });

    it("should include all output files", async () => {
      const files = await generateScormPackageFiles([firestoreQuestion], {});

      expect(Object.keys(files)).toContain("scorm.js");
      expect(Object.keys(files)).toContain("index.html");
      expect(Object.keys(files)).toContain("style.css");
      expect(Object.keys(files)).toContain("game.js");
      expect(Object.keys(files)).toContain("questions.js");
      expect(Object.keys(files)).toContain("imsmanifest.xml");
    });

    it("should replace template variables in manifest", async () => {
      fetchMock.mockImplementation((url) => {
        if (url.includes("imsmanifest.xml")) {
          return Promise.resolve({
            ok: true,
            text: () =>
              Promise.resolve("<title>{{TITLE}}</title><id>{{ID}}</id>"),
          });
        }
        return Promise.resolve({ ok: true, text: () => Promise.resolve("") });
      });

      const files = await generateScormPackageFiles([firestoreQuestion], {
        title: "My Custom Quiz",
      });

      expect(files["imsmanifest.xml"]).toContain(
        "<title>My Custom Quiz</title>"
      );
      expect(files["imsmanifest.xml"]).toContain("com.ue5questiongen");
    });

    it("should default QUIZ_CONFIG language to English when not provided", async () => {
      const files = await generateScormPackageFiles([firestoreQuestion], {});
      expect(files["questions.js"]).toContain('language: "English"');
    });

    it("should plumb config.language into QUIZ_CONFIG", async () => {
      const files = await generateScormPackageFiles([firestoreQuestion], {
        language: "French",
      });
      expect(files["questions.js"]).toContain('language: "French"');
    });
  });

  // =====================================================
  // BATCH VALIDATION (Production scenario)
  // =====================================================
  describe("Production Batch Validation", () => {
    it("should handle 60+ questions (production quiz size)", () => {
      // Generate 60 questions with alternating difficulties
      const manyQuestions = Array.from({ length: 60 }, (_, i) => ({
        ...firestoreQuestion,
        id: `q${i}`,
        guid: `guid-${i}`,
        difficulty: ["Easy", "Medium", "Hard"][i % 3],
      }));

      const result = validateQuestionsForExport(manyQuestions);
      expect(result.valid).toBe(true);
      expect(result.questionCount).toBe(60);
    });

    it("should handle 200+ questions (full question bank)", () => {
      const largeBank = Array.from({ length: 200 }, (_, i) => ({
        ...firestoreQuestion,
        id: `q${i}`,
        guid: `guid-${i}`,
      }));

      const result = validateQuestionsForExport(largeBank);
      expect(result.valid).toBe(true);
      expect(result.questionCount).toBe(200);
      // Should warn about large package
      expect(result.warnings.join(" ")).toContain("More than 100 questions");
    });
  });

  // =====================================================
  // XML Entity Sanitization - REGRESSION TESTS
  // Critical: These tests prevent "Undeclared entity" LMS errors
  // =====================================================
  describe("XML Entity Sanitization (Regression Tests)", () => {
    it("CRITICAL: should sanitize HTML entities in question text", () => {
      const questionWithEntities = {
        ...firestoreQuestion,
        question: "What&nbsp;is&nbsp;Nanite&copy; in UE5&trade;?",
      };
      const result = convertQuestionToScormFormat(questionWithEntities);

      // Should NOT contain any HTML entities
      expect(result.text).not.toContain("&nbsp;");
      expect(result.text).not.toContain("&copy;");
      expect(result.text).not.toContain("&trade;");

      // Should have converted to safe text
      expect(result.text).toContain("What");
      expect(result.text).toContain("Nanite");
    });

    it("CRITICAL: should sanitize HTML entities in answer choices", () => {
      const questionWithEntities = {
        ...firestoreQuestion,
        choices: [
          "Virtualized&nbsp;geometry&mdash;system",
          "Lighting&hellip;system",
          "&ldquo;Sound&rdquo; system",
          "Physics&bull;engine",
        ],
        correctAnswer: "Virtualized&nbsp;geometry&mdash;system",
      };
      const result = convertQuestionToScormFormat(questionWithEntities);

      // Check all choices are sanitized
      result.choices.forEach((choice) => {
        expect(choice.text).not.toMatch(/&[a-zA-Z]+;/);
      });
    });

    it("CRITICAL: should handle numeric entities (&#160;)", () => {
      const questionWithNumericEntities = {
        ...firestoreQuestion,
        question: "What&#160;is&#160;Nanite?",
        choices: ["Option&#160;A", "Option B", "Option C", "Option D"],
        correctAnswer: "Option&#160;A",
      };
      const result = convertQuestionToScormFormat(questionWithNumericEntities);

      expect(result.text).not.toMatch(/&#\d+;/);
      result.choices.forEach((choice) => {
        expect(choice.text).not.toMatch(/&#\d+;/);
      });
    });

    it("CRITICAL: should handle hex entities (&#xA0;)", () => {
      const questionWithHexEntities = {
        ...firestoreQuestion,
        question: "What&#xA0;is&#x2019;Nanite?",
      };
      const result = convertQuestionToScormFormat(questionWithHexEntities);

      expect(result.text).not.toMatch(/&#x[\da-fA-F]+;/);
    });

    it("CRITICAL: should handle ampersands in text", () => {
      const questionWithAmpersand = {
        ...firestoreQuestion,
        question: "What is Nanite & Lumen?",
      };
      const result = convertQuestionToScormFormat(questionWithAmpersand);

      // Ampersand should remain as plain text (not &amp; since this goes into JSON)
      expect(result.text).toBe("What is Nanite & Lumen?");
    });

    it("CRITICAL: should strip unknown entities completely", () => {
      const questionWithUnknownEntities = {
        ...firestoreQuestion,
        question: "What is &unknown; and &foobar; system?",
      };
      const result = convertQuestionToScormFormat(questionWithUnknownEntities);

      // Unknown entities should be removed
      expect(result.text).not.toMatch(/&[a-zA-Z]+;/);
      // After removing entities and normalizing whitespace
      expect(result.text).toBe("What is and system?");
    });

    it("should handle mix of valid and invalid entities", () => {
      const mixedQuestion = {
        ...firestoreQuestion,
        question: "UE5&trade; has &nbsp;Nanite&copy; &foobar; features",
      };
      const result = convertQuestionToScormFormat(mixedQuestion);

      // All entities should be handled
      expect(result.text).not.toMatch(/&[a-zA-Z]+;/);
      expect(result.text).toContain("UE5");
      expect(result.text).toContain("Nanite");
    });

    it("should handle empty string gracefully", () => {
      const emptyQuestion = {
        ...firestoreQuestion,
        question: "",
      };
      // Should not throw
      expect(() => convertQuestionToScormFormat(emptyQuestion)).not.toThrow();
    });

    it("should handle null/undefined question text", () => {
      const nullQuestion = {
        ...firestoreQuestion,
        question: null,
        questionText: undefined,
      };
      // Should not throw
      expect(() => convertQuestionToScormFormat(nullQuestion)).not.toThrow();
    });
  });

  // =====================================================
  // ENGLISH LANGUAGE FILTERING - REGRESSION TESTS
  // Critical: Prevents Korean/non-Latin questions from being exported
  // =====================================================
  describe("English Language Filtering (Regression Tests)", () => {
    const koreanQuestion = {
      ...firestoreQuestion,
      question: "언리얼 엔진 5의 나나이트란 무엇인가요?",
      choices: [
        "가상화된 지오메트리 시스템",
        "조명 시스템",
        "사운드 시스템",
        "물리 엔진",
      ],
      correctAnswer: "가상화된 지오메트리 시스템",
      language: "Korean",
    };

    const japaneseQuestion = {
      ...firestoreQuestion,
      question: "Naniteとは何ですか?",
      choices: [
        "ジオメトリシステム",
        "照明システム",
        "サウンドシステム",
        "物理エンジン",
      ],
      correctAnswer: "ジオメトリシステム",
      language: "Japanese",
    };

    const chineseQuestion = {
      ...firestoreQuestion,
      question: "什么是虚幻引擎5的Nanite?",
      choices: ["虚拟化几何系统", "照明系统", "声音系统", "物理引擎"],
      correctAnswer: "虚拟化几何系统",
      language: "Chinese",
    };

    const mixedQuestion = {
      ...firestoreQuestion,
      question: "What is Nanite? 나나이트란 무엇인가요?",
      choices: [
        "Virtualized geometry system",
        "가상화된 지오메트리",
        "Sound",
        "Physics",
      ],
      correctAnswer: "Virtualized geometry system",
      language: "English",
    };

    describe("isEnglishText", () => {
      it("CRITICAL: should detect pure English text as valid", () => {
        expect(isEnglishText("What is Nanite in Unreal Engine 5?")).toBe(true);
        expect(isEnglishText("This is a test question!")).toBe(true);
        expect(isEnglishText("UE5's Lumen system")).toBe(true);
      });

      it("CRITICAL: should reject Korean text", () => {
        expect(isEnglishText("언리얼 엔진 5의 나나이트란 무엇인가요?")).toBe(
          false
        );
        expect(isEnglishText("가상화된 지오메트리 시스템")).toBe(false);
      });

      it("CRITICAL: should reject Japanese text", () => {
        expect(isEnglishText("Naniteとは何ですか?")).toBe(false);
        expect(isEnglishText("ジオメトリシステム")).toBe(false);
      });

      it("CRITICAL: should reject Chinese text", () => {
        expect(isEnglishText("什么是虚幻引擎5的Nanite?")).toBe(false);
        expect(isEnglishText("虚拟化几何系统")).toBe(false);
      });

      it("CRITICAL: should reject mixed English/Korean text", () => {
        expect(isEnglishText("What is 나나이트?")).toBe(false);
        expect(isEnglishText("UE5 가상화")).toBe(false);
      });

      it("should allow numbers and common punctuation", () => {
        expect(isEnglishText("What is the value of 3.14159?")).toBe(true);
        expect(isEnglishText("Cost: $100, discount: 20%")).toBe(true);
        expect(isEnglishText("Question #1: True or False?")).toBe(true);
      });

      it("should allow special characters in technical content", () => {
        expect(isEnglishText("Use &amp; entity")).toBe(true);
        expect(isEnglishText("C++ and C# programming")).toBe(true);
        expect(isEnglishText("path/to/file.txt")).toBe(true);
      });

      it("should handle empty strings", () => {
        expect(isEnglishText("")).toBe(true); // Empty is valid
        expect(isEnglishText("   ")).toBe(true); // Whitespace only is valid
      });
    });

    describe("filterEnglishQuestions", () => {
      it("CRITICAL: should filter out Korean questions", () => {
        const questions = [firestoreQuestion, koreanQuestion];
        const result = filterEnglishQuestions(questions);
        expect(result.filtered).toHaveLength(1);
        expect(result.filtered[0].question).toBe(
          "What is Nanite in Unreal Engine 5?"
        );
        expect(result.skipped).toBe(1);
      });

      it("CRITICAL: should filter out Japanese questions", () => {
        const questions = [firestoreQuestion, japaneseQuestion];
        const result = filterEnglishQuestions(questions);
        expect(result.filtered).toHaveLength(1);
        expect(result.skipped).toBe(1);
      });

      it("CRITICAL: should filter out Chinese questions", () => {
        const questions = [firestoreQuestion, chineseQuestion];
        const result = filterEnglishQuestions(questions);
        expect(result.filtered).toHaveLength(1);
        expect(result.skipped).toBe(1);
      });

      it("CRITICAL: should filter questions with non-Latin choices", () => {
        const questionWithKoreanChoices = {
          ...firestoreQuestion,
          choices: [
            "Virtualized geometry",
            "가상화된 지오메트리",
            "Sound",
            "Physics",
          ],
          correctAnswer: "Virtualized geometry",
        };
        const questions = [firestoreQuestion, questionWithKoreanChoices];
        const result = filterEnglishQuestions(questions);
        expect(result.filtered).toHaveLength(1);
        expect(result.skipped).toBe(1);
      });

      it("CRITICAL: should filter mixed language content", () => {
        const questions = [firestoreQuestion, mixedQuestion];
        const result = filterEnglishQuestions(questions);
        expect(result.filtered).toHaveLength(1);
        expect(result.skipped).toBe(1);
      });

      it("should return all questions when all are English", () => {
        const englishQuestions = [
          firestoreQuestion,
          firestoreTrueFalseQuestion,
          legacyQuestion,
        ];
        const result = filterEnglishQuestions(englishQuestions);
        expect(result.filtered).toHaveLength(3);
        expect(result.skipped).toBe(0);
      });

      it("should return empty array when all questions are non-English", () => {
        const questions = [koreanQuestion, japaneseQuestion, chineseQuestion];
        const result = filterEnglishQuestions(questions);
        expect(result.filtered).toHaveLength(0);
        expect(result.skipped).toBe(3);
      });

      it("should handle empty input", () => {
        expect(filterEnglishQuestions([]).filtered).toHaveLength(0);
        expect(filterEnglishQuestions(null).filtered).toHaveLength(0);
        expect(filterEnglishQuestions(undefined).filtered).toHaveLength(0);
      });
    });
  });
});
