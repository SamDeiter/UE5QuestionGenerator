/**
 * Question Helpers - Re-exports from parserUtils and provides downloadFile utility
 */
export {
  removeDuplicateQuestions,
  filterDuplicateQuestions,
  formatUrl,
  getDisplayUrl,
  parseQuestions,
} from "./parserUtils";

export const downloadFile = (data, filename) => {
  const BOM = "\uFEFF";
  const finalType = "text/csv;charset=utf-8;";
  const blob = new Blob([BOM + data], { type: finalType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
