import React, { useState } from "react";
import { listModels } from "../../services/gemini";
import Icon from "../Icon";
import CollapsibleSection from "../CollapsibleSection";
import InfoTooltip from "../InfoTooltip";
import { getMergedTags } from "../../utils/tagTaxonomy";
import CoverageGapSuggester from "./CoverageGapSuggester";
import { TARGET_PER_CATEGORY } from "../../utils/constants";
import { useAccessibility } from "../../contexts/AccessibilityContext";

/**
 * GenerationSettings - Configuration panel with progressive disclosure
 * Basic settings always visible, Advanced collapsed by default
 */
const GenerationSettings = ({
  config,
  handleChange,
  customTags = {},
  isOpen,
  onToggle,
  allQuestionsMap = {},
  setShowGenSettings,
}) => {
  const { colorblindMode } = useAccessibility();
  const cb = colorblindMode;

  const [showAdvanced, setShowAdvanced] = useState(false);
  const availableTags = getMergedTags(config.discipline, customTags);

  // Helper for progress colors to avoid nested ternaries
  const getProgressColorClass = (value, target) => {
    if (value >= target) return cb ? "text-blue-400" : "text-green-400";
    if (value >= target - 5) return "text-yellow-400";
    return "text-slate-400";
  };

  const getTagCountColorClass = (count) => {
    if (count === 0) return "text-slate-500";
    if (count >= 5)
      return cb ? "text-blue-400 font-bold" : "text-green-400 font-bold";
    return "text-orange-300";
  };

  // Helper for quota status text color - avoids nested ternary
  const getQuotaTextColor = (quotaMet) => {
    if (!quotaMet) return "text-slate-500";
    return cb ? "text-blue-400" : "text-green-400";
  };

  // Helper for progress bar color when quota met - avoids nested ternary
  const getQuotaBarColor = (quotaMet, defaultColor) => {
    if (!quotaMet) return defaultColor;
    return cb ? "bg-blue-500" : "bg-green-500";
  };

  // Compute counts for each tag to show coverage
  const tagCounts = React.useMemo(() => {
    const counts = {};
    availableTags.forEach((tag) => (counts[tag] = 0));

    // Refactored to reduce function nesting depth for linting
    const allQuestions = Array.from(allQuestionsMap.values()).flat();

    for (const question of allQuestions) {
      if (!question.tags || !Array.isArray(question.tags)) continue;

      for (const t of question.tags) {
        const normalizedTag = t.startsWith("#") ? t : `#${t}`;
        // Find match in availableTags
        let match = null;
        for (const at of availableTags) {
          if (at.toLowerCase() === normalizedTag.toLowerCase()) {
            match = at;
            break;
          }
        }
        if (match) counts[match] = (counts[match] || 0) + 1;
      }
    }
    return counts;
  }, [allQuestionsMap, availableTags]);

  // Compute inventory stats for chart - show questions for selected discipline
  // SIMPLIFIED: Use uniqueId for deduplication, cleaner difficulty/type detection
  const chartData = React.useMemo(() => {
    const stats = {
      Beginner: { name: "Beginner", mc: 0, tf: 0 },
      Intermediate: { name: "Intermediate", mc: 0, tf: 0 },
      Expert: { name: "Expert", mc: 0, tf: 0 },
    };

    // Flatten and deduplicate by uniqueId (the true unique identifier)
    const allQuestions = Array.from(allQuestionsMap.values()).flat();
    const seenIds = new Set();
    const uniqueQuestions = allQuestions.filter((q) => {
      const id = q.uniqueId;
      if (!id || seenIds.has(id)) return false;
      seenIds.add(id);
      return true;
    });

    // Filter to selected discipline (non-rejected only)
    const selectedDiscipline = config.discipline?.toLowerCase().trim();
    const filtered = uniqueQuestions.filter((q) => {
      if (q.status === "rejected") return false;
      return (q.discipline || "").toLowerCase().trim() === selectedDiscipline;
    });

    // Count by difficulty and type
    filtered.forEach((q) => {
      // Normalize difficulty: Easy→Beginner, Medium→Intermediate, Hard→Expert
      const rawDiff = (q.difficulty || "").split(" ")[0]; // Get first word
      let diff = rawDiff;
      if (rawDiff === "Easy") diff = "Beginner";
      else if (rawDiff === "Medium") diff = "Intermediate";
      else if (rawDiff === "Hard") diff = "Expert";

      if (!stats[diff]) return; // Skip unknown difficulties

      // Determine type: T/F or MC (default)
      const isTF = q.type === "True/False" || q.type === "T/F";
      if (isTF) stats[diff].tf++;
      else stats[diff].mc++;
    });

    return [stats["Beginner"], stats["Intermediate"], stats["Expert"]];
  }, [allQuestionsMap, config.discipline]);

  // Auto-expand Focus & Model if tags are selected or custom model is used
  // Removed showAdvanced from dependency to allow manual collapse
  React.useEffect(() => {
    if (
      (config.tags?.length > 0 || config.model !== "gemini-3.5-flash") &&
      !showAdvanced
    ) {
      setShowAdvanced(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.tags?.length, config.model]);

  const toggleTag = (tag) => {
    const currentTags = config.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag];
    handleChange({ target: { name: "tags", value: newTags } });
  };

  return (
    <CollapsibleSection
      title="Generation Settings"
      icon="sliders"
      isCollapsed={!isOpen}
      onToggle={onToggle}
      variant="slate"
      className="mb-2"
    >
      <div className="space-y-4">
        {/* ═══════════════════════════════════════════════════════════════
                      BASIC SETTINGS - Always visible
                      ═══════════════════════════════════════════════════════════════ */}
        <div className="space-y-3 p-3 bg-slate-900/50 rounded-lg border border-slate-800">
          <h3
            className={`text-[10px] font-bold uppercase ${
              cb ? "text-blue-400" : "text-green-400"
            } tracking-wider flex items-center gap-1`}
          >
            <Icon name="check-circle" size={12} /> Basic Settings
          </h3>

          {/* Discipline Selector */}
          <div className="space-y-1">
            <div className="flex items-center">
              <label className="text-xs font-bold uppercase text-slate-400">
                Discipline
              </label>
              <InfoTooltip text="Topic focus for question generation" />
            </div>
            <select
              name="discipline"
              data-tour="discipline-selector"
              value={config.discipline}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm outline-none focus:border-orange-500"
            >
              <option value="Worldbuilding">Worldbuilding</option>
              <option value="Game Dev">Game Dev</option>
              <option value="Look Dev">Look Dev</option>
              <option value="Tech Art">Tech Art</option>
              <option value="VFX">VFX</option>
              <option value="Animation">Animation</option>
              <option value="Programming">Programming</option>
              {/* Updated Categories v2 */}
            </select>
          </div>

          {/* Difficulty & Type Selectors */}
          <div className="space-y-2">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-400">
                Difficulty
              </label>
              <select
                name="difficulty"
                data-tour="difficulty-selector"
                value={config.difficulty}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm outline-none focus:border-orange-500"
              >
                <option value="Easy">Beginner</option>
                <option value="Medium">Intermediate</option>
                <option value="Hard">Expert</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-400">
                Type
              </label>
              <select
                name="type"
                value={config.type || "Multiple Choice"}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm text-slate-300 focus:border-teal-500"
              >
                <option value="Multiple Choice">Multiple Choice</option>
                <option value="True/False">True/False</option>
              </select>
              <p className="text-[9px] text-slate-500">
                Select question type to generate ({TARGET_PER_CATEGORY} of each
                required per difficulty)
              </p>
            </div>

            {/* Batch Size Slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase text-slate-400">
                  Amount to Generate
                </label>
                <span className="text-xs font-mono text-orange-400">
                  {config.batchSize}
                </span>
              </div>
              <input
                type="range"
                name="batchSize"
                min="1"
                max="10"
                step="1"
                value={config.batchSize || 6}
                onChange={handleChange}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-orange-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:hover:bg-orange-400"
              />
            </div>
          </div>

          {/* 📊 Inventory Stats Chart with Quota Progress */}
          <div
            className="mt-3 p-2 bg-slate-950/50 rounded border border-slate-800"
            data-tour="inventory-chart"
          >
            <h4 className="text-[10px] font-bold uppercase text-slate-500 mb-1 flex items-center justify-between">
              <span>Difficulty Distribution</span>
              <span className="text-[9px] text-slate-600">
                Total:{" "}
                {chartData.reduce((acc, curr) => acc + curr.mc + curr.tf, 0)}
              </span>
            </h4>

            {/* Per-difficulty quota breakdown */}
            <div className="space-y-2 mb-2">
              {chartData.map((row) => (
                <div key={row.name} className="text-[9px]">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-slate-400 font-medium">
                      {row.name}
                    </span>
                    <span
                      className={getQuotaTextColor(
                        row.mc + row.tf >= TARGET_PER_CATEGORY * 2
                      )}
                    >
                      {row.mc + row.tf >= TARGET_PER_CATEGORY * 2
                        ? `✓ ${row.mc + row.tf}`
                        : `${row.mc + row.tf}/${TARGET_PER_CATEGORY * 2}`}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {/* MC progress bar */}
                    <div className="flex-1">
                      <div className="flex justify-between text-[8px] text-slate-500 mb-0.5">
                        <span className="text-blue-400">MC</span>
                        <span
                          className={getProgressColorClass(
                            row.mc,
                            TARGET_PER_CATEGORY
                          )}
                        >
                          {row.mc >= TARGET_PER_CATEGORY
                            ? `✓ ${row.mc}`
                            : `${row.mc}/${TARGET_PER_CATEGORY}`}
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded overflow-hidden">
                        <div
                          className={`h-full transition-all ${getQuotaBarColor(
                            row.mc >= TARGET_PER_CATEGORY,
                            "bg-blue-500"
                          )}`}
                          style={{
                            width: `${Math.min(
                              100,
                              (row.mc / TARGET_PER_CATEGORY) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                    {/* T/F progress bar */}
                    <div className="flex-1">
                      <div className="flex justify-between text-[8px] text-slate-500 mb-0.5">
                        <span className="text-purple-400">T/F</span>
                        <span
                          className={getProgressColorClass(
                            row.tf,
                            TARGET_PER_CATEGORY
                          )}
                        >
                          {row.tf >= TARGET_PER_CATEGORY
                            ? `✓ ${row.tf}`
                            : `${row.tf}/${TARGET_PER_CATEGORY}`}
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded overflow-hidden">
                        <div
                          className={`h-full transition-all ${getQuotaBarColor(
                            row.tf >= TARGET_PER_CATEGORY,
                            "bg-purple-500"
                          )}`}
                          style={{
                            width: `${Math.min(
                              100,
                              (row.tf / TARGET_PER_CATEGORY) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
                      TAGS SETTINGS - Collapsed by default
                      ═══════════════════════════════════════════════════════════════ */}
        <div className="border border-slate-700 rounded-lg overflow-hidden">
          <CollapsibleSection
            title="Tags"
            icon="tag"
            isCollapsed={!showAdvanced}
            onToggle={() => setShowAdvanced(!showAdvanced)}
            variant="slate"
            className="!bg-slate-800/50"
            compact={true}
            badge={
              config.tags?.length > 0 || config.model !== "gemini-3.5-flash" ? (
                <span className="ml-2 px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded text-[9px]">
                  {config.tags?.length > 0 ? `${config.tags.length} TAGS` : ""}
                  {config.tags?.length > 0 &&
                  config.model !== "gemini-3.5-flash"
                    ? " + "
                    : ""}
                  {config.model !== "gemini-3.5-flash" ? "CUSTOM" : ""}
                </span>
              ) : null
            }
          >
            <div className="p-0 space-y-4 bg-slate-900/30 animate-in slide-in-from-top-1 duration-150">
              {/* Focus Tags */}
              {availableTags.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase text-slate-400">
                      Focus Tags
                    </label>
                    <span className="text-[10px] text-slate-500">
                      {config.tags?.length || 0} selected
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                    {availableTags.map((tag) => {
                      const isSelected = (config.tags || []).includes(tag);
                      const count = tagCounts[tag] || 0;
                      const countColor = getTagCountColorClass(count);

                      return (
                        <button
                          key={tag}
                          onClick={() => toggleTag(tag)}
                          className={`text-[10px] pl-2 pr-1.5 py-1 rounded border transition-all flex items-center gap-1 ${
                            isSelected
                              ? "bg-orange-500/20 border-orange-500 text-orange-200 hover:bg-orange-500/30"
                              : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300"
                          }`}
                        >
                          <span>{tag}</span>
                          <span
                            className={`text-[9px] bg-slate-950/50 px-1 rounded ml-1 ${countColor}`}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {/* Quick action buttons */}
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => {
                        // Select tags with lowest coverage (bottom 5 by count)
                        const sortedTags = [...availableTags].sort(
                          (a, b) => (tagCounts[a] || 0) - (tagCounts[b] || 0)
                        );
                        // Get bottom 5 tags (those with fewest questions)
                        const tagsToSelect = sortedTags.slice(0, 5);
                        handleChange({
                          target: { name: "tags", value: tagsToSelect },
                        });
                      }}
                      className="flex-1 py-1.5 text-[10px] font-bold uppercase bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/50 rounded transition-colors flex items-center justify-center gap-1"
                    >
                      <Icon name="target" size={10} /> Select Gaps
                    </button>
                    <button
                      onClick={() =>
                        handleChange({ target: { name: "tags", value: [] } })
                      }
                      className="px-2 py-1.5 text-[10px] font-bold uppercase bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 rounded transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}

              {/* Coverage Gap Suggester - Inside Tags Section */}
              <CoverageGapSuggester
                allQuestionsMap={allQuestionsMap}
                config={config}
                handleChange={handleChange}
                setShowGenSettings={setShowGenSettings}
              />

              {/* AI Model Selection */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-400">
                  AI Model
                </label>
                <select
                  name="model"
                  value={config.model || "gemini-3.5-flash"}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm outline-none focus:border-orange-500"
                >
                  <option value="gemini-3.5-flash">
                    Gemini 3.5 Flash (Recommended)
                  </option>
                  <option value="gemini-3.1-flash-lite">
                    Gemini 3.1 Flash-Lite (Cheapest)
                  </option>
                  <option value="gemini-3.1-pro-preview">
                    Gemini 3.1 Pro Preview (Most Capable)
                  </option>
                </select>
                <button
                  onClick={async () => {
                    if (!config.apiKey) {
                      alert("Please enter an API key first");
                      return;
                    }
                    const models = await listModels(config.apiKey);
                    alert(`Available Models:\n${models.join("\n")}`);
                  }}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 underline mt-1"
                >
                  Check Available Models
                </button>
              </div>
            </div>
          </CollapsibleSection>
        </div>
      </div>
    </CollapsibleSection>
  );
};

export default GenerationSettings;
