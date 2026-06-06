import React, { useCallback } from "react";
import { Virtuoso } from "react-virtuoso";
import QuestionItem from "./QuestionItem";

// Stable empty array so the availableVariants prop is referentially stable when a
// question has no translations — avoids a new [] allocation on every visible item.
const EMPTY_VARIANTS = [];

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
  userRole,
  allQuestionsMap,
}) => {
  // Stable itemContent reference prevents Virtuoso from re-rendering the visible
  // window when QuestionList re-renders but handler props haven't changed.
  const renderItem = useCallback(
    (index, q) => (
      <div className="mb-4">
        <QuestionItem
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
          availableVariants={
            translationMap.get(q.uniqueId)
              ? allQuestionsMap.get(q.uniqueId) || EMPTY_VARIANTS
              : EMPTY_VARIANTS
          }
          isProcessing={isProcessing}
          appMode={appMode}
          userRole={userRole}
          isAdmin={userRole === "admin"}
        />
      </div>
    ),
    [
      onUpdateStatus,
      onExplain,
      onVariate,
      onCritique,
      onApplyRewrite,
      onTranslateSingle,
      onSwitchLanguage,
      onDelete,
      onUpdateQuestion,
      translationMap,
      allQuestionsMap,
      isProcessing,
      appMode,
      userRole,
    ]
  );

  return (
    <Virtuoso
      style={{ height: "100%" }}
      data={questions}
      itemContent={renderItem}
    />
  );
};

export default React.memo(QuestionList);
