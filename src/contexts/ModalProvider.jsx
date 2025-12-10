import { createContext, useContext, useState, useEffect } from 'react';

const ModalContext = createContext();

export const useModal = () => {
    const context = useContext(ModalContext);
    if (!context) {
        throw new Error('useModal must be used within a ModalProvider');
    }
    return context;
};

export const ModalProvider = ({ children }) => {
    const [activeModal, setActiveModal] = useState(null);
    const [modalProps, setModalProps] = useState({});

    const openModal = (modalName, props = {}) => {
        setActiveModal(modalName);
        setModalProps(props);
    };

    const closeModal = () => {
        setActiveModal(null);
        setModalProps({});
    };

    // ESC key support
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && activeModal) {
                closeModal();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [activeModal]);

    const value = {
        activeModal,
        modalProps,
        openModal,
        closeModal,
        isModalOpen: (modalName) => activeModal === modalName,
    };

    return (
        <ModalContext.Provider value={value}>
            {children}
        </ModalContext.Provider>
    );
};

export default ModalProvider;
