// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchQuestionsFromSheets, saveQuestionsToSheets, clearQuestionsFromSheets } from './googleSheets';

describe('Google Sheets Service', () => {
    let appendChildSpy;
    let removeChildSpy;
    let createElementSpy;

    beforeEach(() => {
        appendChildSpy = vi.spyOn(document.body, 'appendChild');
        removeChildSpy = vi.spyOn(document.body, 'removeChild');
        createElementSpy = vi.spyOn(document, 'createElement');
    });

    afterEach(() => {
        vi.restoreAllMocks();
        // Clean up any global callbacks created
        Object.keys(window).forEach(key => {
            if (key.startsWith('jsonp_callback_')) {
                delete window[key];
            }
        });
    });

    describe('fetchQuestionsFromSheets', () => {
        it('should resolve with data on success', async () => {
            const mockData = { status: 'Success', data: [{ id: 1, question: 'Test' }] };

            // Mock script element
            const scriptMock = { src: '', onerror: null };
            createElementSpy.mockReturnValue(scriptMock);

            // Mock appendChild to simulate JSONP response
            appendChildSpy.mockImplementation((element) => {
                if (element === scriptMock) {
                    // Find the callback name in the src
                    const match = scriptMock.src.match(/callback=([^&]+)/);
                    if (match && window[match[1]]) {
                        window[match[1]](mockData);
                    }
                }
                return element;
            });

            // Mock removeChild to do nothing (or verify it's called)
            removeChildSpy.mockImplementation(() => { });

            const result = await fetchQuestionsFromSheets('https://script.google.com/macros/s/ID/exec');
            expect(result).toEqual(mockData.data);
            expect(scriptMock.src).toContain('action=read');
        });

        it('should reject on error response', async () => {
            const mockData = { status: 'Error', message: 'Failed' };

            const scriptMock = { src: '', onerror: null };
            createElementSpy.mockReturnValue(scriptMock);

            appendChildSpy.mockImplementation((element) => {
                if (element === scriptMock) {
                    const match = scriptMock.src.match(/callback=([^&]+)/);
                    if (match && window[match[1]]) {
                        window[match[1]](mockData);
                    }
                }
                return element;
            });

            removeChildSpy.mockImplementation(() => { });

            await expect(fetchQuestionsFromSheets('url')).rejects.toThrow('Failed');
        });

        it('should reject on script load error', async () => {
            const scriptMock = { src: '', onerror: null };
            createElementSpy.mockReturnValue(scriptMock);

            appendChildSpy.mockImplementation((element) => {
                if (element === scriptMock && scriptMock.onerror) {
                    scriptMock.onerror();
                }
                return element;
            });

            removeChildSpy.mockImplementation(() => { });

            await expect(fetchQuestionsFromSheets('url')).rejects.toThrow('Connection failed');
        });
    });

    describe('saveQuestionsToSheets', () => {
        it('should submit a form with correct data', async () => {
            const formMock = {
                method: '',
                action: '',
                target: '',
                appendChild: vi.fn(),
                submit: vi.fn()
            };
            const inputMock = { type: '', name: '', value: '' };

            createElementSpy.mockImplementation((tagName) => {
                if (tagName === 'form') return formMock;
                if (tagName === 'input') return inputMock;
                return {};
            });

            appendChildSpy.mockImplementation(() => { });
            removeChildSpy.mockImplementation(() => { });

            const questions = [{
                uniqueId: '123',
                discipline: 'Art',
                type: 'MC',
                difficulty: 'Easy',
                question: 'Q?',
                options: { A: '1', B: '2' },
                correct: 'A',
                language: 'English'
            }];

            await saveQuestionsToSheets('https://google.com', questions);

            expect(formMock.method).toBe('POST');
            expect(formMock.action).toBe('https://google.com');
            expect(formMock.target).toBe('_blank');
            expect(inputMock.name).toBe('data');

            const payload = JSON.parse(inputMock.value);
            expect(payload.questions[0].ID).toBe('1');
            expect(payload.questions[0].Discipline).toBe('Art');
            expect(formMock.submit).toHaveBeenCalled();
        });
    });

    describe('clearQuestionsFromSheets', () => {
        it('should submit a clear action form', async () => {
            const formMock = {
                method: '',
                action: '',
                target: '',
                appendChild: vi.fn(),
                submit: vi.fn()
            };
            const inputMock = { type: '', name: '', value: '' };

            createElementSpy.mockImplementation((tagName) => {
                if (tagName === 'form') return formMock;
                if (tagName === 'input') return inputMock;
                return {};
            });

            appendChildSpy.mockImplementation(() => { });
            removeChildSpy.mockImplementation(() => { });

            await clearQuestionsFromSheets('https://google.com');

            expect(formMock.method).toBe('POST');
            expect(inputMock.name).toBe('action');
            expect(inputMock.value).toBe('clear');
            expect(formMock.submit).toHaveBeenCalled();
        });
    });
});
