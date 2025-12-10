const MainContent = ({ children }) => {
    return (
        <main className="flex-1 flex flex-col min-w-0 bg-slate-950">
            {children}
        </main>
    );
};

export default MainContent;
