/**
 * Footer - Legal links and copyright
 * Displays at bottom of app with Privacy Policy and Terms of Service links
 */
const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="w-full bg-slate-950 border-t border-slate-800 py-3 px-4 mt-auto">
            <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between text-xs text-slate-500">
                {/* Copyright */}
                <div className="flex items-center gap-2">
                    <span>© {currentYear} Epic Games, Inc.</span>
                    <span className="text-slate-700">|</span>
                    <span>UE5 Question Generator</span>
                </div>

                {/* Legal Links */}
                <div className="flex items-center gap-4">
                    <a 
                        href="https://legal.epicgames.com/en-US/epicgames/privacy-policy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-blue-400 transition-colors"
                    >
                        Privacy Policy
                    </a>
                    <a 
                        href="https://www.epicgames.com/site/en-US/tos"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-blue-400 transition-colors"
                    >
                        Terms of Service
                    </a>
                    <a 
                        href="https://github.com/SamDeiter/UE5QuestionGenerator"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-blue-400 transition-colors"
                    >
                        GitHub
                    </a>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
