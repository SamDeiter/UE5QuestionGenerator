import Icon from '../Icon';

/**
 * EmptyState - Displays an empty state message with icon
 * @param {Object} props
 * @param {string} props.message - Message to display
 */
const EmptyState = ({ message }) => (
    <div className="flex flex-col items-center justify-center h-full text-slate-500">
        <Icon name="inbox" size={32} className="mb-2 opacity-50" />
        <p className="text-sm">{message}</p>
    </div>
);

export default EmptyState;
