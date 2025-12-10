/**
 * Integration Tests for Google Sheets Integration
 * Tests importing from and exporting to Google Sheets
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// waitFor removed - unused
import * as sheetsMock from './mocks/googleSheets.mock';
import { mockCSVData } from './testHelpers';

// Mock the Google Sheets service
vi.mock('../services/googleSheets', () => sheetsMock);

describe('Google Sheets Integration Tests', () => {
    beforeEach(() => {
        sheetsMock.resetMock();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Import from Google Sheets', () => {
        it('should fetch CSV from valid Google Sheets URL', async () => {
            const sheetsUrl = 'https://docs.google.com/spreadsheets/d/abc123/edit';

            const { fetchCSVFromSheets } = await import('../services/googleSheets');
            const result = await fetchCSVFromSheets(sheetsUrl);

            expect(result).toBe(mockCSVData.simple);
            expect(sheetsMock.getCallCount()).toBe(1);
        });

        it('should convert Sheets URL to CSV export format', async () => {
            const sheetsUrl = 'https://docs.google.com/spreadsheets/d/abc123/edit';

            const { convertToCSVExportUrl } = await import('../services/googleSheets');
            const exportUrl = convertToCSVExportUrl(sheetsUrl);

            expect(exportUrl).toContain('/export?format=csv');
            expect(exportUrl).toContain('abc123');
        });

        it('should handle invalid Google Sheets URL', async () => {
            const invalidUrl = 'https://example.com/not-a-sheet';

            const { fetchCSVFromSheets } = await import('../services/googleSheets');

            await expect(fetchCSVFromSheets(invalidUrl)).rejects.toThrow(
                'Invalid Google Sheets URL'
            );
        });

        it('should handle network errors gracefully', async () => {
            sheetsMock.simulateNetworkError();

            const sheetsUrl = 'https://docs.google.com/spreadsheets/d/abc123/edit';
            const { fetchCSVFromSheets } = await import('../services/googleSheets');

            await expect(fetchCSVFromSheets(sheetsUrl)).rejects.toThrow(
                'Network error'
            );
        });

        it('should track fetch calls for debugging', async () => {
            const sheetsUrl = 'https://docs.google.com/spreadsheets/d/abc123/edit';

            const { fetchCSVFromSheets } = await import('../services/googleSheets');
            await fetchCSVFromSheets(sheetsUrl);

            const lastCall = sheetsMock.getLastCall();
            expect(lastCall.type).toBe('fetch');
            expect(lastCall.url).toBe(sheetsUrl);
        });
    });

    describe('Export to Google Sheets', () => {
        it('should send data to Google Apps Script', async () => {
            const scriptUrl = 'https://script.google.com/macros/s/abc123/exec';
            const testData = [
                { question: 'Test Q1', difficulty: 'Easy' },
                { question: 'Test Q2', difficulty: 'Medium' }
            ];

            const { sendToGoogleSheets } = await import('../services/googleSheets');
            const result = await sendToGoogleSheets(scriptUrl, testData);

            expect(result.success).toBe(true);
            expect(sheetsMock.getCallCount()).toBe(1);

            const lastCall = sheetsMock.getLastCall();
            expect(lastCall.type).toBe('send');
            expect(lastCall.dataLength).toBe(2);
        });

        it('should validate Google Apps Script URL', async () => {
            const invalidUrl = 'https://example.com/not-a-script';
            const testData = [{ question: 'Test' }];

            const { sendToGoogleSheets } = await import('../services/googleSheets');

            await expect(sendToGoogleSheets(invalidUrl, testData)).rejects.toThrow(
                'Invalid Google Apps Script URL'
            );
        });

        it('should handle CORS errors', async () => {
            sheetsMock.simulateCORSError();

            const scriptUrl = 'https://script.google.com/macros/s/abc123/exec';
            const testData = [{ question: 'Test' }];

            const { sendToGoogleSheets } = await import('../services/googleSheets');

            await expect(sendToGoogleSheets(scriptUrl, testData)).rejects.toThrow(
                'CORS policy blocked'
            );
        });

        it('should include all question data in export', async () => {
            const scriptUrl = 'https://script.google.com/macros/s/abc123/exec';
            const testData = [
                {
                    question: 'What is UE5?',
                    difficulty: 'Easy',
                    type: 'Multiple Choice',
                    options: { A: 'Game Engine', B: 'Car' },
                    correct: 'A',
                    discipline: 'General',
                    language: 'English'
                }
            ];

            const { sendToGoogleSheets } = await import('../services/googleSheets');
            const result = await sendToGoogleSheets(scriptUrl, testData);

            expect(result.success).toBe(true);

            const lastCall = sheetsMock.getLastCall();
            expect(lastCall.scriptUrl).toBe(scriptUrl);
            expect(lastCall.dataLength).toBe(1);
        });
    });

    describe('End-to-End Sheets Workflow', () => {
        it('should import from Sheets and re-export successfully', async () => {
            const sheetsUrl = 'https://docs.google.com/spreadsheets/d/abc123/edit';
            const scriptUrl = 'https://script.google.com/macros/s/abc123/exec';

            // Import
            const { fetchCSVFromSheets } = await import('../services/googleSheets');
            const csvData = await fetchCSVFromSheets(sheetsUrl);
            expect(csvData).toBeDefined();

            // Parse (simplified - in real app this would use fileProcessor)
            const mockParsedData = [
                { question: 'Q1', difficulty: 'Easy' },
                { question: 'Q2', difficulty: 'Medium' }
            ];

            // Export
            const { sendToGoogleSheets } = await import('../services/googleSheets');
            const result = await sendToGoogleSheets(scriptUrl, mockParsedData);

            expect(result.success).toBe(true);
            expect(sheetsMock.getCallCount()).toBe(2); // One fetch, one send
        });
    });
});
