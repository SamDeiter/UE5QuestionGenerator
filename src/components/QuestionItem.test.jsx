import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import QuestionItem from './QuestionItem';

// Mock child components to simplify testing
vi.mock('./Icon', () => ({
    default: ({ name }) => <span data-testid={`icon-${name}`}>{name}</span>
}));

vi.mock('./FlagIcon', () => ({
    default: ({ code }) => <span data-testid={`flag-${code}`}>{code}</span>
}));

describe('QuestionItem', () => {
    const mockQuestion = {
        id: '123',
        uniqueId: 'uid-123',
        question: 'What is Unreal Engine?',
        difficulty: 'Easy',
        type: 'Multiple Choice',
        options: { A: 'Game Engine', B: 'Car', C: 'Food', D: 'Planet' },
        correct: 'A',
        status: 'pending',
        creatorName: 'TestUser',
        language: 'English'
    };

    const mockHandlers = {
        onUpdateStatus: vi.fn(),
        onExplain: vi.fn(),
        onVariate: vi.fn(),
        onCritique: vi.fn(),
        onTranslateSingle: vi.fn(),
        onSwitchLanguage: vi.fn(),
        onDelete: vi.fn(),
    };

    it('renders question text and metadata correctly', () => {
        render(<QuestionItem q={mockQuestion} {...mockHandlers} />);

        expect(screen.getByText('What is Unreal Engine?')).toBeInTheDocument();
        expect(screen.getByText('Easy')).toBeInTheDocument();
        expect(screen.getByText('MC')).toBeInTheDocument(); // 'Multiple Choice' maps to 'MC'
        expect(screen.getByText('TestUser')).toBeInTheDocument();
    });

    it('renders options for Multiple Choice', () => {
        render(<QuestionItem q={mockQuestion} {...mockHandlers} />);

        expect(screen.getByText('Game Engine')).toBeInTheDocument();
        expect(screen.getByText('Car')).toBeInTheDocument();
    });

    it('calls onUpdateStatus when Accept button is clicked', () => {
        render(<QuestionItem q={mockQuestion} {...mockHandlers} />);

        const acceptBtn = screen.getByLabelText('Accept question');
        fireEvent.click(acceptBtn);

        expect(mockHandlers.onUpdateStatus).toHaveBeenCalledWith('123', 'accepted');
    });

    it('calls onUpdateStatus when Reject button is clicked', () => {
        render(<QuestionItem q={mockQuestion} {...mockHandlers} />);

        const rejectBtn = screen.getByLabelText('Reject question');
        fireEvent.click(rejectBtn);

        expect(mockHandlers.onUpdateStatus).toHaveBeenCalledWith('123', 'rejected');
    });

    it('shows correct styling for accepted status', () => {
        const acceptedQ = { ...mockQuestion, status: 'accepted' };
        const { container } = render(<QuestionItem q={acceptedQ} {...mockHandlers} />);

        // Check for the green ring class applied in getStatusStyle
        expect(container.firstChild).toHaveClass('ring-green-500/50');
    });
});
