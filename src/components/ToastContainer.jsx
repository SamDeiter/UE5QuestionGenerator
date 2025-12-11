/**
 * ToastContainer Component
 * 
 * Container for toast notifications, positioned at bottom-right.
 * Renders toasts in stack with proper spacing and animations.
 */
import Toast from './Toast';

const ToastContainer = ({ toasts, onRemove }) => (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-md">
        {toasts.map(toast => (
            <div key={toast.id} className="pointer-events-auto">
                <Toast 
                    message={toast.message}
                    type={toast.type}
                    duration={toast.duration}
                    sticky={toast.sticky}
                    progress={toast.progress}
                    action={toast.action}
                    onClose={() => onRemove(toast.id)} 
                />
            </div>
        ))}
    </div>
);

export default ToastContainer;

