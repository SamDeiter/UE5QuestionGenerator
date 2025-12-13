import { useState, useEffect, useCallback } from "react";
import { constructSystemPrompt } from "../services/promptBuilder";
import { generateContentSecure } from "../services/geminiSecure";

import Icon from "./Icon";

const PromptPlayground = ({ config, apiKeyReady, effectiveApiKey }) => {
  // Local state for prompts and parameters
  // Initialize with current config's system prompt
  const [systemPrompt, setSystemPrompt] = useState("");
  const [userPrompt, setUserPrompt] = useState(
    "Generate a set of 3 questions about Nanite in Unreal Engine 5."
  );
  const [temperature, setTemperature] = useState(config.temperature || 0.7);
  const [model, setModel] = useState(config.model || "gemini-2.0-flash");

  // Execution state
  const [output, setOutput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState(null);

  const handleResetToDefaults = useCallback(() => {
    // Construct prompt using current app config
    // We pass empty file context for now as we're testing the core prompt
    const prompt = constructSystemPrompt(config, "");
    setSystemPrompt(prompt);
  }, [config]);

  // Initial load
  useEffect(() => {
    handleResetToDefaults();
  }, [handleResetToDefaults]);

  const handleExecute = async () => {
    if (!import.meta.env.DEV && !apiKeyReady) {
      setError("API Key required");
      return;
    }

    setIsLoading(true);
    setError(null);
    setStatus("Sending request...");
    setOutput("");

    try {
      const result = await generateContentSecure(
        effectiveApiKey,
        systemPrompt,
        userPrompt,
        setStatus,
        temperature,
        model
      );

      setOutput(result);
      setStatus("Complete");
    } catch (err) {
      console.error("Playground error:", err);
      setError(err.message || "Failed to generate content");
      setStatus("Failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Icon name="terminal" className="text-purple-400" size={20} />
          </div>
          <div>
            <h2 className="font-bold text-white">Prompt Playground</h2>
            <p className="text-xs text-slate-400">
              Test and iterate on system prompts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Model Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 uppercase font-bold">
              Model
            </span>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs outline-none focus:border-purple-500"
            >
              <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
            </select>
          </div>

          {/* Temperature Slider */}
          <div className="flex items-center gap-2 w-32">
            <span className="text-xs text-slate-400 uppercase font-bold">
              Temp: {temperature}
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-purple-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <button
            onClick={handleResetToDefaults}
            className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition-colors flex items-center gap-2"
            title="Reset to current app defaults"
          >
            <Icon name="refresh-cw" size={12} /> Reset
          </button>

          <button
            onClick={handleExecute}
            disabled={isLoading}
            className={`px-4 py-2 text-sm font-bold text-white rounded flex items-center gap-2 transition-all shadow-lg ${
              isLoading
                ? "bg-slate-700 cursor-not-allowed text-slate-500"
                : "bg-purple-600 hover:bg-purple-500 shadow-purple-900/20 hover:scale-105 active:scale-95"
            }`}
          >
            {isLoading ? (
              <Icon name="loader" className="animate-spin" size={16} />
            ) : (
              <Icon name="play" size={16} />
            )}
            {isLoading ? "Running..." : "Run Prompt"}
          </button>
        </div>
      </div>

      {/* Main Content Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Inputs */}
        <div className="w-1/2 flex flex-col border-r border-slate-800">
          {/* System Prompt */}
          <div className="flex-1 flex flex-col min-h-0 border-b border-slate-800">
            <div className="px-4 py-2 bg-slate-900/50 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400 uppercase">
                System Prompt
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {systemPrompt.length} chars
              </span>
            </div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="flex-1 bg-slate-950 p-4 text-xs font-mono text-slate-300 resize-none outline-none focus:bg-slate-900/30 transition-colors"
              spellCheck={false}
              placeholder="Enter system instructions here..."
            />
          </div>

          {/* User Prompt */}
          <div className="h-1/3 flex flex-col min-h-0">
            <div className="px-4 py-2 bg-slate-900/50 flex justify-between items-center border-t border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase">
                User Prompt
              </span>
            </div>
            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              className="flex-1 bg-slate-950 p-4 text-sm text-slate-200 resize-none outline-none focus:bg-slate-900/30 transition-colors"
              placeholder="Enter your test input here..."
            />
          </div>
        </div>

        {/* Right Panel: Output */}
        <div className="w-1/2 flex flex-col bg-slate-900/30">
          <div className="px-4 py-2 bg-slate-900/50 flex justify-between items-center border-b border-slate-800">
            <span className="text-xs font-bold text-slate-400 uppercase">
              Model Output
            </span>
            {status && (
              <span className="text-xs text-slate-500 italic">{status}</span>
            )}
          </div>

          <div className="flex-1 overflow-auto p-6">
            {error ? (
              <div className="p-4 bg-red-900/20 border border-red-900/50 rounded-lg text-red-200 text-sm">
                <strong className="block mb-1">Error</strong>
                {error}
              </div>
            ) : output ? (
              <div className="prose prose-invert prose-sm max-w-none">
                <pre className="whitespace-pre-wrap font-mono text-sm text-slate-300">
                  {output}
                </pre>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-600">
                <Icon name="terminal" size={48} className="mb-4 opacity-50" />
                <p className="text-sm">Ready to execute.</p>
                <p className="text-xs mt-2">
                  Configure prompts on the left and click Run.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromptPlayground;
