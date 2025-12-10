const AppLayout = ({ children }) => {
    return (
        <div className="flex flex-col h-screen bg-slate-950 font-sans text-slate-200">
            {children}
        </div>
    );
};

export default AppLayout;
