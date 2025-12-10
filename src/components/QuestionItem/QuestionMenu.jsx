import { useState, useRef, useEffect } from 'react';
const QuestionMenu = ({
    _q,
    _onExplain,
    _onVariate,
    _onKickBack,
    _onDelete,
    _onUpdateQuestion,
    _appMode,
    _isRejected
}) => {
    const [_menuOpen, _setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                _setMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Three-dot menu disabled - options moved to card
    return null;
};

export default QuestionMenu;
