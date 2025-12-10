/**
 * ToastContainer Component
 * 
 * Container for toast notifications, positioned at bottom-right.
 */
import Toast from './Toast';

const ToastContainer = ({ toasts, onRemove }) => (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
            <div key={toast.id} className="pointer-events-auto">
                <Toast {...toast} onClose={() => onRemove(toast.id)} />
            </div>
        ))}
    </div>
);

export default ToastContainer;
