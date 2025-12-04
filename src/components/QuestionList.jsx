import React from 'react';
import { Virtuoso } from 'react-virtuoso';
import QuestionItem from './QuestionItem';

const QuestionList = ({
    questions,
    translationMap,
    selectedIds,
    appMode,
    isProcessing,
    onUpdateStatus,
    onExplain,
    onVariate,
    onCritique,
    onTranslateSingle,
    onSwitchLanguage,
    onDelete,
    onUpdateQuestion,
    showMessage,
    toggleSelection
}) => {
    return (
        <Virtuoso
            style={{ height: '100%' }}
            data={questions}
            itemContent={(index, q) => (
                <div className="mb-4">
                    <QuestionItem
                        key={q.uniqueId}
                        q={q}
                        onUpdateStatus={onUpdateStatus}
                        onExplain={onExplain}
                        onVariate={onVariate}
                        onCritique={onCritique}
                        onTranslateSingle={onTranslateSingle}
                        onSwitchLanguage={onSwitchLanguage}
                        onDelete={onDelete}
                        onUpdateQuestion={onUpdateQuestion}
                        availableLanguages={translationMap.get(q.uniqueId)}
                        isProcessing={isProcessing}
                        appMode={appMode}
                        showMessage={showMessage}
                        isSelected={selectedIds.has(q.id)}
                        onToggleSelect={() => toggleSelection(q.id)}
                        showCheckbox={selectedIds.size > 0 || appMode === 'create'}
                    />
                </div>
            )}
        />
    );
};

export default React.memo(QuestionList);
