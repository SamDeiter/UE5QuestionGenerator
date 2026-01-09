/**
 * SystemHealth - System diagnostics and health checks
 *
 * Runs self-tests to verify system integrity:
 * - Firestore write permissions
 * - Firestore read permissions
 * - Cloud Function connectivity
 */

import React, { useState } from "react";
import Icon from "../Icon";
import CollapsibleSection from "../CollapsibleSection";
import { doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";
import { getDb, auth } from "../../services/firebase";
import { checkUserRegistration } from "../../services/inviteService";

const SystemHealth = ({ isCollapsed, onToggle }) => {
  const [testResults, setTestResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostics = async () => {
    setIsRunning(true);
    const results = {
      firestoreWrite: { status: "pending", message: "" },
      firestoreRead: { status: "pending", message: "" },
      cloudFunction: { status: "pending", message: "" },
    };
    setTestResults({ ...results });

    // Test 1: Firestore Write Permission
    try {
      const testDocRef = doc(
        getDb(),
        "QuestionsAPIAccess",
        `health-check-${auth.currentUser?.uid}`
      );
      await setDoc(testDocRef, {
        userId: auth.currentUser?.uid,
        type: "health-check",
        timestamp: new Date().toISOString(),
      });
      await deleteDoc(testDocRef);
      results.firestoreWrite = {
        status: "pass",
        message: "Write/delete successful",
      };
    } catch (error) {
      results.firestoreWrite = { status: "fail", message: error.message };
    }
    setTestResults({ ...results });

    // Test 2: Firestore Read Permission
    try {
      const userDocRef = doc(getDb(), "registeredUsers", auth.currentUser?.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        results.firestoreRead = {
          status: "pass",
          message: `User role: ${userDoc.data().role}`,
        };
      } else {
        results.firestoreRead = {
          status: "warn",
          message: "User doc not found (may be normal)",
        };
      }
    } catch (error) {
      results.firestoreRead = { status: "fail", message: error.message };
    }
    setTestResults({ ...results });

    // Test 3: Cloud Function Ping
    try {
      const regStatus = await checkUserRegistration();
      results.cloudFunction = {
        status: "pass",
        message: `Response: registered=${regStatus.registered}, role=${
          regStatus.role || "n/a"
        }`,
      };
    } catch (error) {
      results.cloudFunction = { status: "fail", message: error.message };
    }
    setTestResults({ ...results });

    setIsRunning(false);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "pass":
        return (
          <Icon name="check-circle" size={16} className="text-green-400" />
        );
      case "fail":
        return <Icon name="x-circle" size={16} className="text-red-400" />;
      case "warn":
        return (
          <Icon name="alert-circle" size={16} className="text-yellow-400" />
        );
      default:
        return (
          <Icon
            name="loader"
            size={16}
            className="text-slate-400 animate-spin"
          />
        );
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pass":
        return "bg-green-900/30 border-green-500/30";
      case "fail":
        return "bg-red-900/30 border-red-500/30";
      case "warn":
        return "bg-yellow-900/30 border-yellow-500/30";
      default:
        return "bg-slate-700/30 border-slate-500/30";
    }
  };

  const allPassed =
    testResults &&
    Object.values(testResults).every(
      (r) => r.status === "pass" || r.status === "warn"
    );

  return (
    <CollapsibleSection
      title="System Health"
      icon="activity"
      isCollapsed={isCollapsed}
      onToggle={onToggle}
      variant="emerald"
    >
      <div className="space-y-4">
        {/* Run Diagnostics Button */}
        <button
          onClick={runDiagnostics}
          disabled={isRunning}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 text-white px-4 py-2 rounded font-bold transition-all flex items-center justify-center gap-2"
        >
          {isRunning ? (
            <>
              <Icon name="loader" className="animate-spin" size={16} />
              Running Diagnostics...
            </>
          ) : (
            <>
              <Icon name="activity" size={16} />
              Run System Diagnostics
            </>
          )}
        </button>

        {/* Test Results */}
        {testResults && (
          <div className="space-y-2">
            {/* Overall Status */}
            <div
              className={`p-3 rounded border ${
                allPassed
                  ? "bg-green-900/20 border-green-500/30"
                  : "bg-red-900/20 border-red-500/30"
              }`}
            >
              <div className="flex items-center gap-2">
                {allPassed ? (
                  <Icon
                    name="check-circle"
                    size={20}
                    className="text-green-400"
                  />
                ) : (
                  <Icon
                    name="alert-triangle"
                    size={20}
                    className="text-red-400"
                  />
                )}
                <span
                  className={`font-bold ${
                    allPassed ? "text-green-300" : "text-red-300"
                  }`}
                >
                  {allPassed ? "All Systems Operational" : "Issues Detected"}
                </span>
              </div>
            </div>

            {/* Individual Test Results */}
            <div
              className={`p-3 rounded border ${getStatusColor(
                testResults.firestoreWrite.status
              )}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(testResults.firestoreWrite.status)}
                  <span className="text-white text-sm font-medium">
                    Firestore Write
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  {testResults.firestoreWrite.message}
                </span>
              </div>
            </div>

            <div
              className={`p-3 rounded border ${getStatusColor(
                testResults.firestoreRead.status
              )}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(testResults.firestoreRead.status)}
                  <span className="text-white text-sm font-medium">
                    Firestore Read
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  {testResults.firestoreRead.message}
                </span>
              </div>
            </div>

            <div
              className={`p-3 rounded border ${getStatusColor(
                testResults.cloudFunction.status
              )}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(testResults.cloudFunction.status)}
                  <span className="text-white text-sm font-medium">
                    Cloud Functions
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  {testResults.cloudFunction.message}
                </span>
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-slate-500 text-center">
          Tests Firestore permissions and Cloud Function connectivity
        </p>
      </div>
    </CollapsibleSection>
  );
};

export default SystemHealth;
