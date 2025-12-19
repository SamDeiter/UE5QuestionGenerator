import Icon from "./Icon";
import { TUTORIAL_SCENARIOS } from "../utils/tutorialSteps";
import { isScenarioCompleted } from "../utils/tutorial/tutorialHelpers";

const TutorialCenter = ({ onStartTutorial, onClose }) => {
  const scenarios = Object.values(TUTORIAL_SCENARIOS);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Tutorial Center</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors"
            aria-label="Close tutorial center"
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        <p className="text-slate-400 text-sm mb-4">
          Learn how to use the UE5 Question Generator with interactive guided
          tours.
        </p>

        <div className="grid gap-3">
          {scenarios.map((scenario) => {
            const completed = isScenarioCompleted(scenario.id);
            return (
              <button
                key={scenario.id}
                onClick={() => {
                  onStartTutorial(scenario.id);
                  onClose();
                }}
                className="flex items-center gap-3 p-4 bg-slate-800 hover:bg-slate-700 rounded-lg text-left transition-colors group"
              >
                <div
                  className={`flex-shrink-0 ${
                    completed ? "text-green-400" : "text-indigo-400"
                  }`}
                >
                  <Icon
                    name={completed ? "check-circle" : "play-circle"}
                    size={28}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white group-hover:text-indigo-300 transition-colors">
                    {scenario.label}
                  </h3>
                  <p className="text-sm text-slate-400 mt-0.5">
                    {scenario.description}
                  </p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {scenario.tags?.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-0.5 bg-indigo-900/30 text-indigo-300 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                    <span className="text-xs text-slate-500">
                      {scenario.steps.length} steps
                    </span>
                  </div>
                </div>
                {completed && (
                  <span className="text-xs text-green-400 font-medium flex-shrink-0">
                    ✓ Completed
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800">
          <p className="text-xs text-slate-500 text-center">
            Press{" "}
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300">
              Esc
            </kbd>{" "}
            to close any tutorial
          </p>
        </div>
      </div>
    </div>
  );
};

export default TutorialCenter;
