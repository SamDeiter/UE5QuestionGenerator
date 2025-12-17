import React from "react";
import { Virtuoso } from "react-virtuoso";
import QuestionItem from "./QuestionItem";

const QuestionList = ({
  questions,
  translationMap,
  appMode,
  isProcessing,
  onUpdateStatus,
  onExplain,
  onVariate,
  onCritique,
  onApplyRewrite,
  onTranslateSingle,
  onSwitchLanguage,
  onDelete,
  onUpdateQuestion,
  showMessage,
  userRole, // NEW
}) => {
  return (
    <Virtuoso
      style={{ height: "100%" }}
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
            onApplyRewrite={onApplyRewrite}
            onTranslateSingle={onTranslateSingle}
            onSwitchLanguage={onSwitchLanguage}
            onDelete={onDelete}
            onUpdateQuestion={onUpdateQuestion}
            availableLanguages={translationMap.get(q.uniqueId)}
            isProcessing={isProcessing}
            appMode={appMode}
            showMessage={showMessage}
            userRole={userRole} // NEW
          />
        </div>
      )}
    />
  );
};

export default React.memo(QuestionList);
