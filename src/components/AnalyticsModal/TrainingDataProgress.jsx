/**
 * TrainingDataProgress
 * Training data readiness progress section
 */
import { Activity } from "lucide-react";

// Target number of questions for training data
const TRAINING_TARGET = 500;

const TrainingDataProgress = ({ questions }) => {
  const totalQuestions = questions.length;
  const acceptedCount = questions.filter((q) => q.status === "accepted").length;
  const rejectedCount = questions.filter((q) => q.status === "rejected").length;
  const rewrittenCount = questions.filter((q) => q.wasRewritten).length;

  const progressPercent = Math.min(
    (totalQuestions / TRAINING_TARGET) * 100,
    100
  );

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 h-80 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-400 flex items-center gap-2">
            <Activity size={16} /> Training Data Readiness
          </h3>
          <div className="text-xs font-mono text-slate-500">
            Target: {TRAINING_TARGET} Questions
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center gap-6">
          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-xs mb-2">
              <span className="text-slate-300 font-bold">Total Progress</span>
              <span className="text-indigo-400 font-bold">
                {totalQuestions} / {TRAINING_TARGET}
              </span>
            </div>
            <div className="w-full h-4 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-1000"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-center">
              <div className="text-2xl font-bold text-emerald-400">
                {acceptedCount}
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                Positive Examples
              </div>
            </div>
            <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-center">
              <div className="text-2xl font-bold text-red-400">
                {rejectedCount}
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                Negative Examples
              </div>
            </div>
            <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-center">
              <div className="text-2xl font-bold text-blue-400">
                {rewrittenCount}
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                Rewritten (High Value)
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-500 text-center italic">
            &quot;A balanced dataset with both good and bad examples produces
            the best fine-tuned models.&quot;
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainingDataProgress;
