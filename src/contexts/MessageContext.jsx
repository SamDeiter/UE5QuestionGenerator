import { createContext, useContext } from "react";
import { useToast } from "../hooks/useToast";

/**
 * MessageContext — exposes the toast/messaging API to the whole app
 * without prop-drilling `showMessage` through every component.
 *
 * Consumes useToast() once at the root; everything else calls
 * `useMessage()` to get { showMessage, toasts, removeToast,
 * addToast, updateProgress, completeProgress }.
 */
const MessageContext = createContext(null);

export const MessageProvider = ({ children }) => {
  const toast = useToast();
  return (
    <MessageContext.Provider value={toast}>{children}</MessageContext.Provider>
  );
};

export const useMessage = () => {
  const ctx = useContext(MessageContext);
  if (!ctx) {
    throw new Error("useMessage must be used within a MessageProvider");
  }
  return ctx;
};
