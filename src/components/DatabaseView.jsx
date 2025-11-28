import React from 'react';
import Icon from './Icon';
import QuestionItem from './QuestionItem';
import MetricsDashboard from './MetricsDashboard';
import { clearQuestionsFromSheets } from '../services/googleSheets';

const DatabaseView = ({
    questions,
    sheetUrl,
    onLoad,
    onClearView,
    onHardReset,
    isProcessing
}) => {
    const handleHardReset = () => {
        if (window.confirm("ARE YOU SURE? This will permanently DELETE ALL questions from the Cloud Database (Master_DB). This cannot be undone.")) {
            clearQuestionsFromSheets(sheetUrl);
            onHardReset();
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-blue-900/20 p-4 rounded border border-blue-800/50">
                <div>
                    <h2 className="text-lg font-bold text-blue-400 flex items-center gap-2"><Icon name="database" /> Database View</h2>
                    <p className="text-xs text-blue-300/70">Viewing {questions.length} approved questions from Google Sheets (Read Only)</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleHardReset} className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded border border-red-500 flex items-center gap-2 font-bold shadow-sm shadow-red-900/50">
                        <Icon name="alert-triangle" size={12} /> HARD RESET
                    </button>
                    <button onClick={onClearView} className="px-3 py-1 bg-red-900/50 hover:bg-red-800 text-red-200 text-xs rounded border border-red-800 flex items-center gap-2">
                        <Icon name="trash-2" size={12} /> Clear View
                    </button>
                    <button onClick={onLoad} disabled={isProcessing} className="px-3 py-1 bg-blue-800 hover:bg-blue-700 text-blue-200 text-xs rounded border border-blue-600 flex items-center gap-2">
                        <Icon name="refresh-cw" size={12} className={isProcessing ? "animate-spin" : ""} /> Refresh
                    </button>
                </div>
            </div>

            <MetricsDashboard questions={questions} />

            {questions.length === 0 ? (
                <div className="text-center py-10 text-slate-500">No questions loaded from database. Click Refresh.</div>
            ) : (
                questions.map((q, i) => (
                    <div key={i} className="opacity-75 hover:opacity-100 transition-opacity">
                        <QuestionItem
                            q={q}
                            // Pass dummy handlers or read-only mode if supported
                            onUpdateStatus={() => { }}
                            onExplain={() => { }}
                            onVariate={() => { }}
                            onCritique={() => { }}
                            onTranslateSingle={() => { }}
                            onSwitchLanguage={() => { }}
                            onDelete={() => { }}
                            availableLanguages={new Set()}
                            isProcessing={false}
                        />
                    </div>
                ))
            )}
        </div>
    );
};

export default DatabaseView;
