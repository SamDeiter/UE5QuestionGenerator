import { describe, it, expect } from "vitest";
import { parseCSVQuestions } from "../fileProcessor";
// Mock questionValidator since we want to test integration with it,
// but if it's complex we might mock it.
// For now, let's trust the real validator or mock if imports fail.
// Given this is a unit test in the same codebase, real import should work.

describe("Import Validation Logic", () => {
  it("should mark valid questions as accepted", () => {
    // Valid v1.7 CSV line
    const validCSV = `ID,Unique ID,Status,Discipline,Difficulty,Question Type,Question,Option A,Option B,Option C,Option D,Answer,Explanation,Language,Source URL,Source Excerpt
123,uuid-valid-1,pending,General,Easy,Multiple Choice,What is UE5?,Engine,Game,Tool,None,A,It is an engine,English,https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-for-beginners,This is a valid documentation excerpt that is long enough to pass validation.`;

    const questions = parseCSVQuestions(validCSV, "test.csv", "TestCreator");
    const q = questions[0];

    expect(q.status).toBe("accepted");
    expect(q.sourceExcerpt).toContain("valid documentation excerpt");
    expect(q._validation.isValid).toBe(true);
  });

  it("should mark questions with missing URL as rejected (Critical)", () => {
    const missingURLCSV = `ID,Unique ID,Status,Discipline,Difficulty,Question Type,Question,Option A,Option B,Option C,Option D,Answer,Explanation,Language,Source URL,Source Excerpt
123,uuid-valid-1,pending,General,Easy,Multiple Choice,What is UE5?,Engine,Game,Tool,None,A,It is an engine,English,,Valid excerpt here but missing URL`;

    const questions = parseCSVQuestions(
      missingURLCSV,
      "test.csv",
      "TestCreator"
    );
    const q = questions[0];

    expect(q.status).toBe("rejected");
    expect(q._validation.isCriticalFailure).toBe(true);
    expect(
      q._validation.warnings.some((w) =>
        w.includes("Missing documentation URL")
      )
    ).toBe(true);
  });

  it("should mark questions with short excerpt as rejected (Critical)", () => {
    const shortExcerptCSV = `ID,Unique,Discipline,Type,Diff,Q,A,B,C,D,Ans,Date,Src,Exc,Cr,Rev,Lang
1,uuid-bad,Gen,MC,Easy,Bad Q?,A,B,C,D,A,2023,https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-for-beginners,Tiny,,Test,En`;

    const questions = parseCSVQuestions(
      shortExcerptCSV,
      "test.csv",
      "TestCreator"
    );
    const q = questions[0];

    expect(q.status).toBe("rejected");
    expect(
      q._validation.warnings.some((w) => w.includes("Source excerpt too short"))
    ).toBe(true);
  });
});
