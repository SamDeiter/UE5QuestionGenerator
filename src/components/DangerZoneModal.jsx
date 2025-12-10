import { useState } from 'react';
import Icon from './Icon';
import { clearQuestionsFromSheets } from '../services/googleSheets';
import { clearAllQuestionsFromFirestore } from '../services/firebase';

/**
 * DangerZoneModal - Separate modal for destructive operations
 * Isolated from Settings to prevent accidental data loss
 */
const DangerZoneModal = ({ isOpen, onClose, config, onClearData }) => {
    const [isResetting, setIsResetting] = useState(false);
    const [showFactoryResetConfirm, setShowFactoryResetConfirm] = useState(false);
    const [showFactoryResetPrompt, setShowFactoryResetPrompt] = useState(false);
    const [isMigrating, setIsMigrating] = useState(false);
    const [migrationResult, setMigrationResult] = useState(null);

    const handleFactoryResetClick = () => {
        setShowFactoryResetConfirm(true);
    };

    const handleFirstConfirm = () => {
        setShowFactoryResetConfirm(false);
        setShowFactoryResetPrompt(true);
    };

    const handlePromptConfirm = async (typedValue) => {
        if (typedValue !== "DELETE EVERYTHING") {
            alert("Factory reset cancelled. You must type 'DELETE EVERYTHING' exactly.");
            setShowFactoryResetPrompt(false);
            return;
        }

        console.log("⚠️ FACTORY RESET INITIATED");
        setShowFactoryResetPrompt(false);
        setIsResetting(true);

        try {
            let deletedCount = 0;

            // 1. Clear Firestore FIRST (critical)
            console.log("Clearing Firestore...");
            try {
                deletedCount = await clearAllQuestionsFromFirestore();
                console.log(`✅ Deleted ${deletedCount} questions from Firestore`);
            } catch (firestoreError) {
                console.error("❌ Firestore deletion failed:", firestoreError);
                throw new Error(`Firestore deletion failed: ${firestoreError.message}`);
            }

            // 2. Clear Google Spreadsheet
            if (config.sheetUrl) {
                console.log("Clearing Google Spreadsheet...");
                try {
                    clearQuestionsFromSheets(config.sheetUrl);
                    console.log("✅ Spreadsheet clear request sent (check new tab)");
                } catch (sheetsError) {
                    console.error("❌ Sheets clearing failed:", sheetsError);
                }
            }

            // 3. Clear localStorage
            console.log("Clearing localStorage...");
            localStorage.clear();
            console.log("✅ Local storage cleared");

            // 4. Reload
            alert(`Factory Reset Complete!\n\n• Firestore: ${deletedCount} questions deleted\n• Spreadsheet: ${config.sheetUrl ? 'Clearing in new tab' : 'Skipped'}\n• Local Storage: Cleared\n\nPage will reload.`);
            window.location.reload();
        } catch (error) {
            console.error("❌ Factory reset error:", error);
            alert("Error during factory reset:\n\n" + error.message + "\n\nCheck console for details.");
            setIsResetting(false);
        }
    };

    const handleBackfillCreatorNames = async () => {
        if (!confirm('This will add your creator name to all questions that currently show "N/A". Continue?')) {
            return;
        }

        setIsMigrating(true);
        setMigrationResult(null);

        try {
            const { getDocs, collection, doc, updateDoc } = await import('firebase/firestore');
            const { db } = await import('../services/firebase');

            const creatorName = config.creatorName || 'Unknown';
            const querySnapshot = await getDocs(collection(db, 'questions'));

            const questionsToUpdate = [];
            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const creator = data.creatorName;
                // Catch: null, undefined, empty string, 'N/A', or whitespace-only
                if (!creator || creator.trim() === '' || creator === 'N/A' || creator === 'Unknown') {
                    questionsToUpdate.push({
                        firestoreId: docSnap.id,  // Use Firestore document ID
                        ...data
                    });
                }
            });

            if (questionsToUpdate.length === 0) {
                setMigrationResult({ success: 0, total: 0, message: 'All questions already have creator names!' });
                setIsMigrating(false);
                return;
            }

            let successCount = 0;
            for (const question of questionsToUpdate) {
                try {
                    console.log('Updating question:', question.firestoreId, 'Creator:', question.creatorName);
                    const questionRef = doc(db, 'questions', question.firestoreId);
                    await updateDoc(questionRef, {
                        creatorName: creatorName,
                        backfilledAt: new Date().toISOString()
                    });
                    successCount++;
                    console.log('✓ Successfully updated:', question.firestoreId);
                } catch (err) {
                    console.error(`Failed to update question ${question.firestoreId}:`, err.message, err);
                }
            }

            setMigrationResult({
                success: successCount,
                total: questionsToUpdate.length,
                message: `Successfully updated ${successCount} of ${questionsToUpdate.length} questions!`
            });

        } catch (error) {
            console.error('Migration failed:', error);
            alert('Migration failed: ' + error.message);
        } finally {
            setIsMigrating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-red-950/50 border-2 border-red-500 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-4 border-b border-red-900 flex justify-between items-center bg-red-900/50">
                        <h2 className="text-lg font-bold text-red-300 flex items-center gap-2">
                            <Icon name="alert-triangle" className="text-red-500" /> DANGER ZONE
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-red-400 hover:text-white transition-colors"
                            aria-label="Close Danger Zone"
                        >
                            <Icon name="x" />
                        </button>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="bg-red-900/20 p-4 rounded-lg border border-red-900/50">
                            <p className="text-sm text-red-300 mb-4">
                                ⚠️ <strong>WARNING:</strong> These operations are <strong>PERMANENT</strong> and cannot be undone.
                                Your data will be lost forever.
                            </p>

                            <div className="space-y-3">
                                {/* Migration Tools */}
                                <div className="bg-blue-900/20 p-3 rounded border border-blue-900/50 mb-3">
                                    <p className="text-xs text-blue-300 mb-2 font-semibold">🔧 Data Migration</p>
                                    <button
                                        onClick={handleBackfillCreatorNames}
                                        disabled={isMigrating}
                                        className="w-full px-4 py-2 bg-blue-900/20 hover:bg-blue-900/40 text-blue-400 text-xs font-bold rounded border border-blue-900/50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isMigrating ? (
                                            <><Icon name="loader" size={14} className="animate-spin" /> Migrating...</>
                                        ) : (
                                            <><Icon name="user-check" size={14} /> Backfill Creator Names</>
                                        )}
                                    </button>
                                    {migrationResult && (
                                        <p className="text-xs text-green-400 mt-2 text-center">
                                            ✓ {migrationResult.message}
                                        </p>
                                    )}
                                    <p className="text-[9px] text-blue-400/60 mt-1">
                                        Adds your name to questions showing "N/A"
                                    </p>
                                </div>

                                {/* Destructive Operations */}
                                <button
                                    onClick={onClearData}
                                    className="w-full px-4 py-3 bg-red-900/20 hover:bg-red-900/40 text-red-400 text-sm font-bold rounded border border-red-900/50 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Icon name="trash-2" size={16} />
                                    Clear Local Data (Keep Cloud Backup)
                                </button>

                                <button
                                    onClick={handleFactoryResetClick}
                                    disabled={isResetting}
                                    className="w-full px-4 py-3 bg-red-950 hover:bg-red-900 text-red-500 text-sm font-bold rounded border-2 border-red-900 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isResetting ? (
                                        <><Icon name="loader" size={16} className="animate-spin" /> Resetting...</>
                                    ) : (
                                        <><Icon name="bomb" size={16} /> FACTORY RESET (Delete Everything)</>
                                    )}
                                </button>
                            </div>

                            <p className="text-[10px] text-red-400/70 mt-3 text-center">
                                Factory Reset deletes ALL data: Spreadsheet + Firestore + Local Storage
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirmation Dialogs */}
            <ConfirmDialog
                isOpen={showFactoryResetConfirm}
                title="⚠️ FACTORY RESET WARNING ⚠️"
                message={`This will PERMANENTLY DELETE ALL data from:

• Google Spreadsheet (all Master_ sheets)
• Firestore Database (cloud)  
• Local storage (questions, settings, analytics)

This action CANNOT be undone. Are you ABSOLUTELY SURE?`}
                confirmText="Yes, I Understand"
                cancelText="Cancel"
                onConfirm={handleFirstConfirm}
                onCancel={() => setShowFactoryResetConfirm(false)}
                isDanger={true}
            />

            <PromptDialog
                isOpen={showFactoryResetPrompt}
                title="🔴 FINAL CONFIRMATION 🔴"
                message="Type 'DELETE EVERYTHING' (all caps, no quotes) to confirm permanent deletion of ALL data:"
                placeholder="Type DELETE EVERYTHING here"
                expectedValue="DELETE EVERYTHING"
                confirmText="Delete Everything Forever"
                cancelText="Cancel"
                onConfirm={handlePromptConfirm}
                onCancel={() => setShowFactoryResetPrompt(false)}
                isDanger={true}
            />
        </>
    );
};

export default DangerZoneModal;
