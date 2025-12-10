import { useState, useRef, useEffect } from 'react';
const QuestionMenu = ({
    q,
    onExplain,
    onVariate,
    onKickBack,
    onDelete,
    onUpdateQuestion,
    appMode,
    isRejected
}) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Three-dot menu disabled - options moved to card
    return null;
};

export default QuestionMenu;
