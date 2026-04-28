// React core hooks
import { useState, lazy, Suspense } from "react";

// Critical components - keep eager loading (needed immediately)
import Header from "./components/Header";
import AppBanners from "./components/AppBanners";
import ToastContainer from "./components/ToastContainer";
import Footer from "./components/Footer";
import UpdateAvailableBanner from "./components/UpdateAvailableBanner";

// Lazy load heavy Authenticated logic
const AuthenticatedApp = lazy(() => import("./AuthenticatedApp"));

// PERFORMANCE: Lazy load auth components (only needed when logged out)
const SignIn = lazy(() => import("./components/SignIn"));
const InviteSignUp = lazy(() => import("./components/InviteSignUp"));

// Custom Hooks (Global only)
import { useAppConfig } from "./hooks/useAppConfig";
import { useTutorial } from "./hooks/useTutorial";
import { useToast } from "./hooks/useToast";
import { useAuth } from "./hooks/useAuth";
import { useTokenUsage } from "./hooks/useTokenUsage";
import { useAuthRefresh } from "./hooks/useAuthRefresh";
import { useAuthHealthCheck } from "./hooks/useAuthHealthCheck";
import { useGlobalToastSubscription } from "./hooks/useGlobalToastSubscription";

// Services & Utilities
import { getInviteFromUrl } from "./services/inviteService";
import { APP_MODES } from "./utils/constants";
import { FullPageSpinner as LoadingSpinner } from "./components/LoadingSpinner";

const App = () => {
  const { toasts, removeToast, showMessage } = useToast();
  const [status, setStatus] = useState("");

  const {
    user,
    authLoading,
    isAdmin,
    userRole,
    isRegistered: _isRegistered,
    registrationLoading,
    markAsRegistered,
    customTags,
    handleSaveCustomTags,
    showTerms,
    setShowTerms,
    showAgeGate,
    setShowAgeGate,
    setTermsAccepted,
    permissionError,
    blockedByExtension,
  } = useAuth(showMessage);

  useGlobalToastSubscription(showMessage);
  const authHealthStatus = useAuthHealthCheck({ user, authLoading });
  useAuthRefresh({ user, authLoading, showMessage });

  const {
    appMode,
    setAppMode,
    config,
    setConfig,
    isAuthReady,
    isApiReady,
    effectiveApiKey,
    apiKeyStatus,
    showNameModal,
    setShowNameModal,
    showGenSettings,
    setShowGenSettings,
    setShowApiError,
    batchSizeWarning,
    showSettings,
    setShowSettings,
    showApiKey,
    setShowApiKey,
    handleChange,
    handleNameSave,
    handleLanguageSwitch,
    pendingNavigationUniqueId,
    setPendingNavigationUniqueId,
  } = useAppConfig({ user });

  const tutorial = useTutorial(showMessage);

  const firestoreTokenUsage = useTokenUsage(user?.uid);

  const handleGoHome = () => {
    setAppMode(APP_MODES.LANDING);
    window.history.pushState({}, "", window.location.pathname);
  };

  if (authLoading || registrationLoading) {
    return (
      <>
        <LoadingSpinner />
        <UpdateAvailableBanner />
      </>
    );
  }

  if (!user) {
    const inviteCode = getInviteFromUrl();
    if (inviteCode) {
      return (
        <>
          <InviteSignUp onSuccess={(role) => markAsRegistered(role)} />
          <UpdateAvailableBanner />
        </>
      );
    }
    return (
      <>
        <SignIn />
        <UpdateAvailableBanner />
      </>
    );
  }

  if (!_isRegistered) {
    return (
      <>
        <InviteSignUp onSuccess={(role) => markAsRegistered(role)} />
        <UpdateAvailableBanner />
      </>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950 font-sans text-slate-200">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-indigo-600 focus:text-white focus:px-4 focus:py-2 focus:rounded"
      >
        Skip to main content
      </a>
      <main id="main-content" className="flex flex-col flex-1 overflow-hidden">
        <Header
          apiKeyStatus={apiKeyStatus}
          isCloudReady={isAuthReady}
          onHome={handleGoHome}
          creatorName={config.creatorName}
          appMode={appMode}
          tokenUsage={firestoreTokenUsage}
          onRestartTutorial={tutorial.handleRestartTutorial}
          onStartTutorial={tutorial.handleStartTutorial}
          isAdmin={isAdmin}
          user={user}
          userRole={userRole}
          onSignOut={() => {}} // Auth handles itself via state change
        />

        <AppBanners
          user={user}
          isRegistered={_isRegistered}
          registrationLoading={registrationLoading}
          permissionError={permissionError}
          blockedByExtension={blockedByExtension}
          authHealthStatus={authHealthStatus}
        />

        <Suspense fallback={<LoadingSpinner />}>
          <AuthenticatedApp
            user={user}
            authLoading={authLoading}
            isAdmin={isAdmin}
            userRole={userRole}
            isRegistered={_isRegistered}
            markAsRegistered={markAsRegistered}
            customTags={customTags}
            handleSaveCustomTags={handleSaveCustomTags}
            showMessage={showMessage}
            setStatus={setStatus}
            status={status}
            appMode={appMode}
            setAppMode={setAppMode}
            config={config}
            setConfig={setConfig}
            isAuthReady={isAuthReady}
            isApiReady={isApiReady}
            effectiveApiKey={effectiveApiKey}
            apiKeyStatus={apiKeyStatus}
            showNameModal={showNameModal}
            setShowNameModal={setShowNameModal}
            showGenSettings={showGenSettings}
            setShowGenSettings={setShowGenSettings}
            setShowApiError={setShowApiError}
            batchSizeWarning={batchSizeWarning}
            showSettings={showSettings}
            setShowSettings={setShowSettings}
            showApiKey={showApiKey}
            setShowApiKey={setShowApiKey}
            handleChange={handleChange}
            handleNameSave={handleNameSave}
            handleLanguageSwitch={handleLanguageSwitch}
            pendingNavigationUniqueId={pendingNavigationUniqueId}
            setPendingNavigationUniqueId={setPendingNavigationUniqueId}
            handleGoHome={handleGoHome}
            onStartTutorial={tutorial.handleStartTutorial}
            tutorialActive={tutorial.tutorialActive}
            currentStep={tutorial.currentStep}
            tutorialSteps={tutorial.tutorialSteps}
            activeScenario={tutorial.activeScenario}
            handleTutorialNext={tutorial.handleTutorialNext}
            handleTutorialPrev={tutorial.handleTutorialPrev}
            handleTutorialSkip={tutorial.handleTutorialSkip}
            handleTutorialComplete={tutorial.handleTutorialComplete}
            handleRestartTutorial={tutorial.handleRestartTutorial}
            showTerms={showTerms}
            setShowTerms={setShowTerms}
            showAgeGate={showAgeGate}
            setShowAgeGate={setShowAgeGate}
            setTermsAccepted={setTermsAccepted}
          />
        </Suspense>

        <Footer />
        <ToastContainer toasts={toasts} onRemove={removeToast} />
        <UpdateAvailableBanner />
      </main>
    </div>
  );
};

export default App;
