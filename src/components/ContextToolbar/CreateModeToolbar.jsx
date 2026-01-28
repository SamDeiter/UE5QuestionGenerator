/**
 * CreateModeToolbar
 * Toolbar for the Create/Generate questions mode
 */
import { useState, useRef, useEffect } from "react";
import Icon from "../Icon";
import { DropdownMenu, MenuButton } from "./SharedToolbarComponents";

const CreateModeToolbar = ({
  isAuthReady,
  status,
  isProcessing,
  config,
  onLoadSheets,
  onLoadFirestore,
  onBulkExport,
  isAdmin,
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

  return (
    <div className="flex justify-between items-center w-full">
      <div className="flex items-center gap-4">
        {/* Status Indicator */}
        {isAuthReady ? (
          <>
            {status ? (
              <span className="text-xs text-orange-500 font-medium flex items-center gap-1 animate-pulse">
                <Icon name="loader" size={12} className="animate-spin" />{" "}
                {status}
              </span>
            ) : (
              <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                <Icon
                  name="check-circle"
                  size={14}
                  className="text-green-500"
                />{" "}
                Ready to Generate
              </span>
            )}
          </>
        ) : (
          <span className="text-xs text-yellow-500 font-medium flex items-center gap-1 animate-pulse">
            <Icon name="plug" size={12} className="animate-pulse" /> Connecting
            to DB...
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Data Menu */}
        <div className="relative" ref={dataMenuRef}>
          <button
            onClick={() => setDataMenuOpen(!dataMenuOpen)}
            disabled={isProcessing}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${
              dataMenuOpen
                ? "bg-slate-700 text-white"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
            } disabled:opacity-50 border border-slate-700`}
            data-tour="export-menu"
          >
            <Icon name="folder" size={14} />
            Data Operations
            <Icon
              name="chevron-down"
              size={10}
              className={`transition-transform ${
                dataMenuOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          <DropdownMenu isOpen={dataMenuOpen}>
            <div className="py-1">
              <MenuButton
                onClick={() => {
                  onLoadSheets();
                  setDataMenuOpen(false);
                }}
                disabled={isProcessing || !config.sheetUrl}
                icon="table"
                label="Load from Sheets"
                color="blue"
              />
              <MenuButton
                onClick={() => {
                  onLoadFirestore();
                  setDataMenuOpen(false);
                }}
                disabled={isProcessing}
                icon="cloud-lightning"
                label="Load from Firestore"
                color="indigo"
              />
              <div className="h-px bg-slate-700 my-1" />
              {isAdmin && (
                <MenuButton
                  onClick={() => {
                    onBulkExport();
                    setDataMenuOpen(false);
                  }}
                  icon="download"
                  label="Export Questions"
                  color="green"
                />
              )}
            </div>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

export default CreateModeToolbar;
