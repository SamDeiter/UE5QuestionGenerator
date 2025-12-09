import React from 'react';
import Icon from './Icon';

const ModalWrapper = ({ isOpen, onClose, title, children, maxWidth = 'max-w-2xl' }) => {
    if (!isOpen) return null;

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div 
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div className={`relative bg-slate-900 rounded-xl ${maxWidth} w-full shadow-2xl border border-slate-800`}>
                {/* Header with close button */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800">
                    <h2 id="modal-title" className="text-xl font-bold text-white">
                        {title}
                    </h2>
                    <button 
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-800"
                        aria-label="Close modal"
                    >
                        <Icon name="x" size={24} />
                    </button>
                </div>
                
                {/* Content */}
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default ModalWrapper;
