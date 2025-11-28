/**
 * Mock implementation for Google Sheets integration
 * Used in integration tests to simulate Sheets API
 */

import { vi } from 'vitest';
import { mockCSVData } from '../testHelpers';

// Track API calls
export const sheetsCallHistory = [];

/**
 * Mock fetchCSVFromSheets function
 */
export const fetchCSVFromSheets = vi.fn(async (url) => {
    sheetsCallHistory.push({ url, timestamp: Date.now(), type: 'fetch' });

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 150));

    // Validate URL format
    if (!url.includes('docs.google.com/spreadsheets')) {
        throw new Error('Invalid Google Sheets URL');
    }

    // Return mock CSV data
    return mockCSVData.simple;
});

/**
 * Mock sendToGoogleSheets function
 */
export const sendToGoogleSheets = vi.fn(async (scriptUrl, data) => {
    sheetsCallHistory.push({
        scriptUrl,
        dataLength: data.length,
        timestamp: Date.now(),
        type: 'send'
    });

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200));

    // Validate script URL
    if (!scriptUrl.includes('script.google.com')) {
        throw new Error('Invalid Google Apps Script URL');
    }

    // Return success response
    return { success: true, message: 'Data sent successfully' };
});

/**
 * Mock convertToCSVExportUrl function
 */
export const convertToCSVExportUrl = vi.fn((url) => {
    if (!url.includes('docs.google.com/spreadsheets')) {
        return url;
    }

    // Extract spreadsheet ID
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) return url;

    const spreadsheetId = match[1];
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
});

/**
 * Reset mock state
 */
export const resetMock = () => {
    sheetsCallHistory.length = 0;
    fetchCSVFromSheets.mockClear();
    sendToGoogleSheets.mockClear();
    convertToCSVExportUrl.mockClear();
};

/**
 * Simulate network error
 */
export const simulateNetworkError = () => {
    fetchCSVFromSheets.mockRejectedValueOnce(new Error('Network error'));
};

/**
 * Simulate CORS error
 */
export const simulateCORSError = () => {
    sendToGoogleSheets.mockRejectedValueOnce(new Error('CORS policy blocked'));
};

/**
 * Get call count
 */
export const getCallCount = () => sheetsCallHistory.length;

/**
 * Get last call
 */
export const getLastCall = () => sheetsCallHistory[sheetsCallHistory.length - 1];
