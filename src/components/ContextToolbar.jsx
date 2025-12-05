import React, { useState, useRef, useEffect } from 'react';
import Icon from './Icon';
import FilterButton from './FilterButton';

const ContextToolbar = ({
    mode,
    counts = {},
    filterMode,
    setFilterMode,
    filterByCreator,
    setFilterByCreator,
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
    isProcessing,
    status,
    isAuthReady,
    config,
    onLoadSheets,
    onLoadFirestore,
    onBulkExport,
    onClearPending
}) => {
    const [dataMenuOpen, setDataMenuOpen] = useState(false);
    const dataMenuRef = useRef(null);

    // Click outside handler for Data menu
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dataMenuRef.current && !dataMenuRef.current.contains(event.target)) {
                setDataMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // ------------------------------------------------------------------------
    // RENDERERS FOR EACH MODE
    // ------------------------------------------------------------------------

    const renderCreateToolbar = () => (
        <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-4">
                {/* Status Indicator */}
                {isAuthReady ? (
                    <>
                        {status ? (
                            <span className="text-xs text-orange-500 font-medium flex items-center gap-1 animate-pulse">
                                <Icon name="loader" size={12} className="animate-spin" /> {status}
                            </span>
                        ) : (
                            <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                <Icon name="check-circle" size={14} className="text-green-500" /> Ready to Generate
                            </span>
                        )}
                    </>
                ) : (
                    <span className="text-xs text-yellow-500 font-medium flex items-center gap-1 animate-pulse">
                        <Icon name="plug" size={12} className="animate-pulse" /> Connecting to DB...
                    </span>
                )}
            </div>

            <div className="flex items-center gap-2">
                {/* Data Menu */}
                <div className="relative" ref={dataMenuRef}>
                    <button
                        onClick={() => setDataMenuOpen(!dataMenuOpen)}
                        disabled={isProcessing}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${dataMenuOpen ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'} disabled:opacity-50 border border-slate-700`}
                    >
                        <Icon name="folder" size={14} />
                        Data Operations
                        <Icon name="chevron-down" size={10} className={`transition-transform ${dataMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {dataMenuOpen && (
                        <div className="absolute right-0 top-full mt-1 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="py-1">
                                <button
                                    onClick={() => { onLoadSheets(); setDataMenuOpen(false); }}
                                    disabled={isProcessing || !config.sheetUrl}
                                    className="w-full text-left px-4 py-2 text-xs text-blue-300 hover:bg-slate-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Icon name="table" size={14} />
                                    Load from Sheets
                                </button>
                                <button
                                    onClick={() => { onLoadFirestore(); setDataMenuOpen(false); }}
                                    disabled={isProcessing}
                                    className="w-full text-left px-4 py-2 text-xs text-indigo-300 hover:bg-slate-700 flex items-center gap-2 disabled:opacity-50"
                                >
                                    <Icon name="cloud-lightning" size={14} />
                                    Load from Firestore
                                </button>
                                <div className="h-px bg-slate-700 my-1"></div>
                                <button
                                    onClick={() => { onBulkExport(); setDataMenuOpen(false); }}
                                    className="w-full text-left px-4 py-2 text-xs text-green-300 hover:bg-slate-700 flex items-center gap-2"
                                >
                                    <Icon name="download" size={14} />
                                    Export Questions
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const renderReviewToolbar = () => (
        <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase mr-2">Filters:</span>
                <FilterButton mode="pending" current={filterMode} setFilter={setFilterMode} label="Pending" count={counts.pending} />
                <FilterButton mode="all" current={filterMode} setFilter={setFilterMode} label="All" count={counts.all} />
                <div className="w-px h-4 bg-slate-700 mx-1"></div>
                <FilterButton mode="accepted" current={filterMode} setFilter={setFilterMode} label="Accepted" count={counts.accepted} />
                <FilterButton mode="rejected" current={filterMode} setFilter={setFilterMode} label="Rejected" count={counts.rejected} />
            </div>

            <div className="flex items-center gap-3">
                {/* Clear Pending Button */}
                {counts.pending > 0 && (
                    <button
                        onClick={onClearPending}
                        className="px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 bg-red-900/20 text-red-400 border border-red-900/50 hover:bg-red-900/40 hover:text-red-300"
                        title="Delete all pending questions"
                    >
                        <Icon name="trash-2" size={14} />
                        Clear Pending
                    </button>
                )}

                <div className="h-4 w-px bg-slate-700"></div>

                <button
                    onClick={() => setFilterByCreator(!filterByCreator)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 border ${filterByCreator ? 'bg-blue-600/20 text-blue-300 border-blue-500/50' : 'bg-transparent text-slate-400 border-transparent hover:bg-slate-800'}`}
                    title={`Filter by Creator: ${config.creatorName}`}
                >
                    <Icon name="user" size={14} />
                    {filterByCreator ? 'My Questions Only' : 'All Creators'}
                </button>

                <div className="h-4 w-px bg-slate-700"></div>

                <div className="relative">
                    <Icon name="search" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search questions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-48 bg-slate-900 text-slate-300 placeholder-slate-600 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs py-1.5 pl-8 pr-8 rounded-md transition-all"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-red-400"
                        >
                            <Icon name="x" size={12} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    const renderDatabaseToolbar = () => (
        <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-4">
                <span className="text-xs text-slate-500 flex items-center gap-2">
                    <Icon name="database" size={12} />
                    Viewing Database Records
                </span>

                {/* Sort Control */}
                <div className="flex items-center gap-2 bg-slate-800/50 p-1 rounded border border-slate-700">
                    <span className="text-[10px] font-bold text-slate-500 uppercase px-1">Sort:</span>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="bg-slate-900 text-slate-300 text-xs border-none outline-none focus:ring-0 rounded py-0.5 pl-1 pr-6 cursor-pointer"
                    >
                        <option value="default">Default</option>
                        <option value="newest">Newest</option>
                        <option value="oldest">Oldest</option>
                        <option value="language">Language</option>
                        <option value="discipline">Discipline</option>
                        <option value="difficulty">Difficulty</option>
                    </select>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {/* Load Data Buttons */}
                <button
                    onClick={onLoadFirestore}
                    disabled={isProcessing}
                    className="px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
                >
                    <Icon name="cloud-lightning" size={14} />
                    Load from Firestore
                </button>
                <button
                    onClick={onLoadSheets}
                    disabled={isProcessing || !config.sheetUrl}
                    className="px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50"
                    title={!config.sheetUrl ? "Configure Sheet URL in Settings first" : "Load from Google Sheets"}
                >
                    <Icon name="table" size={14} />
                    Load from Sheets
                </button>

                <div className="h-4 w-px bg-slate-700"></div>

                {/* Reuse Search for DB View */}
                <div className="relative">
                    <Icon name="search" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search database..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-64 bg-slate-900 text-slate-300 placeholder-slate-600 border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs py-1.5 pl-8 pr-8 rounded-md transition-all"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-red-400"
                        >
                            <Icon name="x" size={12} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    const renderAnalyticsToolbar = () => (
        <div className="flex justify-between items-center w-full">
            <span className="text-xs text-slate-500">Analytics Dashboard</span>
        </div>
    );

    // ------------------------------------------------------------------------
    // MAIN RENDER
    // ------------------------------------------------------------------------
    return (
        <div className="h-12 px-4 border-b border-slate-800 bg-slate-900/50 flex items-center">
            {mode === 'create' && renderCreateToolbar()}
            {mode === 'review' && renderReviewToolbar()}
            {mode === 'database' && renderDatabaseToolbar()}
            {mode === 'analytics' && renderAnalyticsToolbar()}
        </div>
    );
};

export default ContextToolbar;
