/**
 * ModalContext — owns the visibility state for every modal/menu in the
 * app so consumers don't have to receive boolean+setter pairs as props.
 *
 * Replaces three previously-separate state holders:
 *   - useModalState (export menu, bulk export, analytics, data menu,
 *     advanced config, danger zone, api key modal)
 *   - useCompliance (terms, age gate, termsAccepted flag — plus its
 *     mount-time localStorage check)
 *   - the modal booleans embedded in useAppConfig (name, gen settings,
 *     settings, api key visibility)
 *
 * Tutorial state stays in useTutorial — its step machine is tightly
 * coupled to the visibility flag and refactoring it is out of scope for
 * this PR.
 *
 * Side effects preserved verbatim from the old hooks:
 *   - `window.openDangerZone` global toggle (Settings modal still calls it)
 *   - compliance: pick age-gate / terms / accepted state from localStorage
 *   - data-menu click-outside close
 */
import { createContext, useContext, useState, useEffect, useRef } from "react";

const ModalContext = createContext(null);

const COMPLIANCE_STORAGE_KEYS = {
  AGE_VERIFIED: "ue5_age_verified",
  TERMS_ACCEPTED: "ue5_terms_accepted",
};

export const ModalProvider = ({ children }) => {
  // useModalState modals
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showBulkExportModal, setShowBulkExportModal] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [dataMenuOpen, setDataMenuOpen] = useState(false);
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);
  const [showDangerZone, setShowDangerZone] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  // useAppConfig modals
  const [showNameModal, setShowNameModal] = useState(false);
  const [showGenSettings, setShowGenSettings] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // useCompliance modals
  const [showTerms, setShowTerms] = useState(false);
  const [showAgeGate, setShowAgeGate] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const dataMenuRef = useRef(null);

  // Settings modal calls window.openDangerZone() to escalate from its
  // own panel into Danger Zone. Keep the global escape hatch.
  useEffect(() => {
    window.openDangerZone = () => setShowDangerZone(true);
    return () => {
      delete window.openDangerZone;
    };
  }, []);

  // Pick compliance state from localStorage at mount: show age gate first,
  // then terms, otherwise mark accepted. Mirrors the old useCompliance.
  useEffect(() => {
    const ageVerified = localStorage.getItem(
      COMPLIANCE_STORAGE_KEYS.AGE_VERIFIED
    );
    const termsAcceptedStorage = localStorage.getItem(
      COMPLIANCE_STORAGE_KEYS.TERMS_ACCEPTED
    );
    if (!ageVerified) {
      setShowAgeGate(true);
    } else if (!termsAcceptedStorage) {
      setShowTerms(true);
    } else {
      setTermsAccepted(true);
    }
  }, []);

  // Data menu: close when clicking outside the menu's ref'd container.
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dataMenuRef.current && !dataMenuRef.current.contains(event.target)) {
        setDataMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const value = {
    showExportMenu,
    setShowExportMenu,
    showBulkExportModal,
    setShowBulkExportModal,
    showAnalytics,
    setShowAnalytics,
    dataMenuOpen,
    setDataMenuOpen,
    dataMenuRef,
    showAdvancedConfig,
    setShowAdvancedConfig,
    showDangerZone,
    setShowDangerZone,
    showApiKeyModal,
    setShowApiKeyModal,
    showNameModal,
    setShowNameModal,
    showGenSettings,
    setShowGenSettings,
    showSettings,
    setShowSettings,
    showApiKey,
    setShowApiKey,
    showTerms,
    setShowTerms,
    showAgeGate,
    setShowAgeGate,
    termsAccepted,
    setTermsAccepted,
  };

  return (
    <ModalContext.Provider value={value}>{children}</ModalContext.Provider>
  );
};

export const useModals = () => {
  const ctx = useContext(ModalContext);
  if (!ctx) {
    throw new Error("useModals must be used within a ModalProvider");
  }
  return ctx;
};
