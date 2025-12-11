import { describe, it, expect } from 'vitest';
import {
    estimateTokens,
    calculateCost,
    formatCost,
    checkTokenLimit,
    getTokenWarningLevel,
    analyzeRequest,
    summarizeAnalysis,
    compareAnalyses
} from './tokenCounter';

describe('tokenCounter', () => {
    describe('estimateTokens', () => {
        it('should estimate tokens based on character count', () => {
            expect(estimateTokens('Hello World')).toBe(3); // 11 chars / 4 = 2.75 -> 3
            expect(estimateTokens('A')).toBe(1);
            expect(estimateTokens('')).toBe(0);
            expect(estimateTokens(null)).toBe(0);
        });

        it('should handle longer text', () => {
            const longText = 'A'.repeat(1000);
            expect(estimateTokens(longText)).toBe(250); // 1000 / 4 = 250
        });
    });

    describe('calculateCost', () => {
        it('should calculate cost for gemini-1.5-flash', () => {
            const cost = calculateCost(1000000, 1000000, 'gemini-1.5-flash');
            expect(cost).toBe(0.375); // (1M * 0.075 + 1M * 0.30) / 1M
        });

        it('should calculate cost for gemini-1.5-pro', () => {
            const cost = calculateCost(1000000, 1000000, 'gemini-1.5-pro');
            expect(cost).toBe(6.25); // (1M * 1.25 + 1M * 5.00) / 1M
        });

        it('should calculate cost for gemini-2.0-flash-exp (free)', () => {
            const cost = calculateCost(1000000, 1000000, 'gemini-2.0-flash-exp');
            expect(cost).toBe(0.375);
        });

        it('should default to gemini-1.5-flash for unknown models', () => {
            const cost = calculateCost(1000000, 1000000, 'unknown-model');
            expect(cost).toBe(0.375);
        });

        it('should handle small token counts', () => {
            const cost = calculateCost(100, 100, 'gemini-1.5-flash');
            expect(cost).toBeCloseTo(0.0000375, 7);
        });
    });

    describe('formatCost', () => {
        it('should format small costs in thousandths', () => {
            expect(formatCost(0.001)).toBe('$1.000k');
            expect(formatCost(0.0001)).toBe('$0.100k');
        });

        it('should format larger costs in dollars', () => {
            expect(formatCost(0.01)).toBe('$0.0100');
            expect(formatCost(1.5)).toBe('$1.5000');
        });
    });

    describe('checkTokenLimit', () => {
        it('should check input token limits for gemini-1.5-flash', () => {
            const result = checkTokenLimit(500000, 'input', 'gemini-1.5-flash');
            expect(result.withinLimit).toBe(true);
            expect(result.limit).toBe(1000000);
            expect(result.percentage).toBe(50);
        });

        it('should check output token limits', () => {
            const result = checkTokenLimit(4096, 'output', 'gemini-1.5-flash');
            expect(result.withinLimit).toBe(true);
            expect(result.limit).toBe(8192);
            expect(result.percentage).toBe(50);
        });

        it('should detect when over limit', () => {
            const result = checkTokenLimit(2000000, 'input', 'gemini-1.5-flash');
            expect(result.withinLimit).toBe(false);
            expect(result.percentage).toBe(200);
        });
    });

    describe('getTokenWarningLevel', () => {
        it('should return "none" for low usage', () => {
            expect(getTokenWarningLevel(100000, 'input', 'gemini-1.5-flash')).toBe('none');
        });

        it('should return "warning" for 70-89% usage', () => {
            expect(getTokenWarningLevel(750000, 'input', 'gemini-1.5-flash')).toBe('warning');
        });

        it('should return "danger" for 90%+ usage', () => {
            expect(getTokenWarningLevel(950000, 'input', 'gemini-1.5-flash')).toBe('danger');
        });
    });

    describe('analyzeRequest', () => {
        it('should analyze a typical request', () => {
            const systemPrompt = 'A'.repeat(400); // ~100 tokens
            const userPrompt = 'A'.repeat(400);   // ~100 tokens

            const analysis = analyzeRequest(systemPrompt, userPrompt, 2000, 'gemini-1.5-flash');

            expect(analysis.input.system).toBe(100);
            expect(analysis.input.user).toBe(100);
            expect(analysis.input.total).toBe(200);
            expect(analysis.input.withinLimit).toBe(true);
            expect(analysis.input.warningLevel).toBe('none');

            expect(analysis.output.expected).toBe(2000);
            expect(analysis.output.withinLimit).toBe(true);

            expect(analysis.cost.estimated).toBeGreaterThan(0);
            expect(analysis.model).toBe('gemini-1.5-flash');
        });

        it('should detect high token usage', () => {
            const systemPrompt = 'A'.repeat(3000000); // ~750k tokens
            const userPrompt = 'A'.repeat(400);

            const analysis = analyzeRequest(systemPrompt, userPrompt, 2000, 'gemini-1.5-flash');

            expect(analysis.input.warningLevel).toBe('warning');
        });

        it('should detect danger level usage', () => {
            const systemPrompt = 'A'.repeat(3600000); // ~900k tokens
            const userPrompt = 'A'.repeat(400);

            const analysis = analyzeRequest(systemPrompt, userPrompt, 2000, 'gemini-1.5-flash');

            expect(analysis.input.warningLevel).toBe('danger');
        });
    });

    describe('summarizeAnalysis', () => {
        it('should create readable summary for normal usage', () => {
            const analysis = {
                input: { total: 1000, warningLevel: 'none' },
                output: { expected: 2000, warningLevel: 'none' },
                cost: { formatted: '$0.0001' }
            };

            const summary = summarizeAnalysis(analysis);
            expect(summary).toContain('1,000 input');
            expect(summary).toContain('2,000 output');
            expect(summary).toContain('$0.0001');
            expect(summary).not.toContain('⚠️');
        });

        it('should include warning for high usage', () => {
            const analysis = {
                input: { total: 1000, warningLevel: 'warning' },
                output: { expected: 2000, warningLevel: 'none' },
                cost: { formatted: '$0.0001' }
            };

            const summary = summarizeAnalysis(analysis);
            expect(summary).toContain('⚠️ Warning');
        });

        it('should include danger alert for critical usage', () => {
            const analysis = {
                input: { total: 1000, warningLevel: 'danger' },
                output: { expected: 2000, warningLevel: 'none' },
                cost: { formatted: '$0.0001' }
            };

            const summary = summarizeAnalysis(analysis);
            expect(summary).toContain('⚠️ DANGER');
        });
    });

    describe('compareAnalyses', () => {
        it('should calculate reduction percentages', () => {
            const before = {
                input: { total: 1000 },
                output: { expected: 2000 },
                cost: { estimated: 0.001 }
            };

            const after = {
                input: { total: 500 },
                output: { expected: 1500 },
                cost: { estimated: 0.0005 }
            };

            const comparison = compareAnalyses(before, after);

            expect(comparison.input.reduction).toBe(500);
            expect(comparison.input.percentage).toBe(50);

            expect(comparison.output.reduction).toBe(500);
            expect(comparison.output.percentage).toBe(25);

            expect(comparison.cost.savings).toBe(0.0005);
            expect(comparison.cost.percentage).toBe(50);
        });

        it('should handle zero reduction', () => {
            const before = {
                input: { total: 1000 },
                output: { expected: 2000 },
                cost: { estimated: 0.001 }
            };

            const comparison = compareAnalyses(before, before);

            expect(comparison.input.reduction).toBe(0);
            expect(comparison.input.percentage).toBe(0);
        });
    });
});
