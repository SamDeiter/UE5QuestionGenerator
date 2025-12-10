/**
 * EmptyState Component
 * 
 * Shown when there are no questions and the app is ready for generation.
 */
import Icon from './Icon';

const EmptyState = () => (
    <div className="flex flex-col items-center justify-center h-full text-slate-600">
        <Icon name="terminal" size={48} className="mb-4 text-slate-800" />
        <p className="font-medium text-slate-500">
            Ready. Click &apos;GENERATE QUESTIONS&apos; to begin or upload a source file.
        </p>
    </div>
);

export default EmptyState;
