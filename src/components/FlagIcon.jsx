const FlagIcon = ({ code, size = 16, className = "" }) => {
    const getFlagContent = (code) => {
        switch (code) {
            case 'US': // USA
                return (
                    <g>
                        {/* Background Red */}
                        <rect width="24" height="24" fill="#B22234" />
                        {/* White Stripes (approx 2px each) */}
                        <rect width="24" height="2" y="2" fill="white" />
                        <rect width="24" height="2" y="6" fill="white" />
                        <rect width="24" height="2" y="10" fill="white" />
                        <rect width="24" height="2" y="14" fill="white" />
                        <rect width="24" height="2" y="18" fill="white" />
                        <rect width="24" height="2" y="22" fill="white" />
                        {/* Blue Canton */}
                        <rect width="12" height="12" fill="#3C3B6E" />
                        {/* Simplified stars (white dots) */}
                        <g fill="white">
                            <circle cx="2" cy="2" r="0.8" />
                            <circle cx="6" cy="2" r="0.8" />
                            <circle cx="10" cy="2" r="0.8" />
                            <circle cx="4" cy="4" r="0.8" />
                            <circle cx="8" cy="4" r="0.8" />
                            <circle cx="2" cy="6" r="0.8" />
                            <circle cx="6" cy="6" r="0.8" />
                            <circle cx="10" cy="6" r="0.8" />
                            <circle cx="4" cy="8" r="0.8" />
                            <circle cx="8" cy="8" r="0.8" />
                            <circle cx="2" cy="10" r="0.8" />
                            <circle cx="6" cy="10" r="0.8" />
                            <circle cx="10" cy="10" r="0.8" />
                        </g>
                    </g>
                );
            case 'CN': // China
                return (
                    <g>
                        <rect width="24" height="24" fill="#DE2910" />
                        <path d="M4,4 L5,7 L2,5 L6,5 L3,7 Z" fill="#FFDE00" transform="scale(1.2)" />
                        <path d="M8,2 L8.5,3 L7.5,3 Z" fill="#FFDE00" transform="rotate(30 8 2)" />
                        <path d="M10,4 L10.5,5 L9.5,5 Z" fill="#FFDE00" transform="rotate(10 10 4)" />
                        <path d="M10,7 L10.5,8 L9.5,8 Z" fill="#FFDE00" transform="rotate(-10 10 7)" />
                        <path d="M8,9 L8.5,10 L7.5,10 Z" fill="#FFDE00" transform="rotate(-30 8 9)" />
                    </g>
                );
            case 'JP': // Japan
                return (
                    <g>
                        <rect width="24" height="24" fill="white" />
                        <circle cx="12" cy="12" r="6" fill="#BC002D" />
                    </g>
                );
            case 'KR': // South Korea
                return (
                    <g>
                        <rect width="24" height="24" fill="white" />
                        <circle cx="12" cy="12" r="6" fill="#CD2E3A" clipPath="url(#yin)" />
                        <circle cx="12" cy="12" r="6" fill="#0047A0" clipPath="url(#yang)" />
                        <path d="M12,12 L18,12 A6,6 0 0,1 12,18 A6,6 0 0,0 12,6 A6,6 0 0,1 12,12" fill="#CD2E3A" />
                        <path d="M12,12 L6,12 A6,6 0 0,0 12,6 A6,6 0 0,1 12,18 A6,6 0 0,0 12,12" fill="#0047A0" />
                        {/* Trigrams simplified */}
                        <rect x="4" y="4" width="4" height="1" fill="black" transform="rotate(45 6 4.5)" />
                        <rect x="16" y="16" width="4" height="1" fill="black" transform="rotate(45 18 16.5)" />
                        <rect x="16" y="4" width="4" height="1" fill="black" transform="rotate(-45 18 4.5)" />
                        <rect x="4" y="16" width="4" height="1" fill="black" transform="rotate(-45 6 16.5)" />
                    </g>
                );
            case 'ES': // Spain
                return (
                    <g>
                        <rect width="24" height="24" fill="#AA151B" />
                        <rect width="24" height="12" y="6" fill="#F1BF00" />
                        <rect x="4" y="8" width="4" height="4" fill="#AA151B" opacity="0.8" />
                    </g>
                );
            case 'FR': // French
                return (
                    <g>
                        <rect width="8" height="24" x="0" fill="#0055A4" />
                        <rect width="8" height="24" x="8" fill="white" />
                        <rect width="8" height="24" x="16" fill="#EF4135" />
                    </g>
                );
            case 'DE': // German
                return (
                    <g>
                        <rect width="24" height="8" y="0" fill="black" />
                        <rect width="24" height="8" y="8" fill="#DD0000" />
                        <rect width="24" height="8" y="16" fill="#FFCE00" />
                    </g>
                );
            case 'IT': // Italian
                return (
                    <g>
                        <rect width="8" height="24" x="0" fill="#009246" />
                        <rect width="8" height="24" x="8" fill="white" />
                        <rect width="8" height="24" x="16" fill="#CE2B37" />
                    </g>
                );
            case 'PT': // Portuguese
                return (
                    <g>
                        <rect width="10" height="24" x="0" fill="#046A38" />
                        <rect width="14" height="24" x="10" fill="#DA291C" />
                        <circle cx="10" cy="12" r="4" fill="#FFD700" />
                        <rect x="8" y="10" width="4" height="4" fill="#DA291C" rx="1" />
                    </g>
                );
            case 'RU': // Russian
                return (
                    <g>
                        <rect width="24" height="8" y="0" fill="white" />
                        <rect width="24" height="8" y="8" fill="#0039A6" />
                        <rect width="24" height="8" y="16" fill="#D52B1E" />
                    </g>
                );
            default:
                return <rect width="24" height="24" fill="#ccc" />;
        }
    };

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            className={`rounded-sm overflow-hidden ${className}`}
            xmlns="http://www.w3.org/2000/svg"
        >
            {getFlagContent(code)}
        </svg>
    );
};

export default FlagIcon;
