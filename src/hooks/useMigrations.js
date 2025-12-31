import { useEffect, useRef } from "react";

/**
 * Hook to handle one-time database migrations.
 * Encapsulates logic for fixing legacy data issues on app load.
 *
 * @param {Object} params
 * @param {Object} params.user - Current authenticated user
 * @param {boolean} params.authLoading - Authentication loading state
 * @param {boolean} params.isAdmin - Whether the user is an admin
 * @param {Function} params.showMessage - Toast notification handler
 * @param {Function} params.handleLoadFromFirestore - Function to reload data after migration
 * @param {Function} params.setConfig - Config setter for language migration
 */
export function useMigrations({
  user,
  authLoading,
  isAdmin,
  showMessage,
  handleLoadFromFirestore,
  setConfig,
}) {
  // ========================================================================
  // MIGRATION 0: Language Reset (runs for all users, once)
  // ========================================================================
  useEffect(() => {
    const migrationKey = "language_reset_v1";
    const hasReset = localStorage.getItem(migrationKey);

    if (!hasReset && setConfig) {
      console.log("🔄 Running language reset migration...");
      setConfig((prev) => ({ ...prev, language: "English" }));
      localStorage.setItem(migrationKey, "true");
      console.log("✅ Language reset to English");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Migration 1: Fix auto-accepted questions (missing reviewCompletedAt)
  const hasAutoAcceptMigratedRef = useRef(false);

  useEffect(() => {
    const runAutoAcceptMigration = async () => {
      const migrationKey = "ue5_migration_auto_accept_fix";
      if (localStorage.getItem(migrationKey) === "completed") return;

      if (
        user &&
        !authLoading &&
        isAdmin &&
        !hasAutoAcceptMigratedRef.current
      ) {
        hasAutoAcceptMigratedRef.current = true;
        try {
          console.log(
            "🔄 Running migration: fixing auto-accepted questions..."
          );

          // Dynamic imports to avoid bundling firebase if not needed
          const { db } = await import("../services/firebase");
          const { collection, getDocs, doc, updateDoc } = await import(
            "firebase/firestore"
          );

          const questionsRef = collection(db, "questions");
          const snapshot = await getDocs(questionsRef);

          let fixedCount = 0;
          const batch = [];

          snapshot.forEach((docSnap) => {
            const question = docSnap.data();
            if (question.status === "accepted" && !question.reviewCompletedAt) {
              batch.push(
                updateDoc(doc(db, "questions", docSnap.id), {
                  status: "pending",
                  migratedAt: new Date().toISOString(),
                  migrationReason: "auto-accept-bug-fix",
                })
              );
              fixedCount++;
            }
          });

          if (batch.length > 0) {
            await Promise.all(batch);
            console.log(
              `✅ Migration: Fixed ${fixedCount} of ${snapshot.size} questions`
            );
            showMessage(
              `✅ Fixed ${fixedCount} auto-accepted questions - now pending`,
              5000
            );
            setTimeout(() => handleLoadFromFirestore(true), 1000);
          } else {
            console.log(
              `✅ No questions needed fixing (checked ${snapshot.size} questions)`
            );
          }

          localStorage.setItem(migrationKey, "completed");
        } catch (error) {
          console.error("❌ Migration error:", error);
        }
      }
    };
    runAutoAcceptMigration();
  }, [user, authLoading, isAdmin, showMessage, handleLoadFromFirestore]);

  // Migration 2: Add firestoreUpdatedAt to legacy questions
  const hasFirestoreMigratedRef = useRef(false);

  useEffect(() => {
    const runFirestoreMigration = async () => {
      const migrationKey = "ue5_migration_firestore_updated_at";
      if (localStorage.getItem(migrationKey) === "completed") return;

      if (user && !authLoading && isAdmin && !hasFirestoreMigratedRef.current) {
        hasFirestoreMigratedRef.current = true;
        try {
          console.log(
            "🔄 Running migration: adding firestoreUpdatedAt to questions..."
          );

          const { db } = await import("../services/firebase");
          const { collection, getDocs, doc, updateDoc, Timestamp } =
            await import("firebase/firestore");

          const questionsRef = collection(db, "questions");
          const snapshot = await getDocs(questionsRef);

          let updatedCount = 0;
          const batch = [];

          snapshot.forEach((docSnap) => {
            const question = docSnap.data();

            // Check if firestoreUpdatedAt is missing or null
            if (!question.firestoreUpdatedAt) {
              // Use dateAdded as fallback, or current time if that's also missing
              const fallbackDate = question.dateAdded
                ? new Date(question.dateAdded)
                : new Date();

              batch.push(
                updateDoc(doc(db, "questions", docSnap.id), {
                  firestoreUpdatedAt: Timestamp.fromDate(fallbackDate),
                })
              );
              updatedCount++;
            }
          });

          if (batch.length > 0) {
            await Promise.all(batch);
            console.log(
              `✅ Migration: Added firestoreUpdatedAt to ${updatedCount} of ${snapshot.size} questions`
            );
            showMessage(
              `✅ Fixed ${updatedCount} questions - reloading database...`,
              5000
            );
            setTimeout(() => handleLoadFromFirestore(true), 1000);
          } else {
            console.log(
              `✅ No migration needed: All ${snapshot.size} questions have firestoreUpdatedAt`
            );
          }

          localStorage.setItem(migrationKey, "completed");
        } catch (error) {
          console.error("❌ Firestore migration error:", error);
        }
      }
    };
    runFirestoreMigration();
  }, [user, authLoading, isAdmin, showMessage, handleLoadFromFirestore]);
}
