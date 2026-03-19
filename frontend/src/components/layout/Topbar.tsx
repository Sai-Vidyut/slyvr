import {
  Search,
  RefreshCw,
  Upload,
  Menu,
} from "lucide-react";

export interface TopbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onUpload: () => void;
  onRefresh: () => void;
  onMenuClick: () => void;
}

function Topbar({
  searchQuery,
  onSearchChange,
  onUpload,
  onRefresh,
  onMenuClick,
}: TopbarProps) {
  return (
    <header className="h-20 border-b border-slate-800 bg-slate-950 px-3 md:px-8 flex items-center gap-2">
      <button
        onClick={onMenuClick}
        className="md:hidden p-2"
      >
        <Menu size={22} />
      </button>

      <div className="flex-1">
        <div className="relative w-full">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
          />

          <input
            type="text"
            value={searchQuery}
            onChange={(e) =>
              onSearchChange(e.target.value)
            }
            placeholder="Search clips..."
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-3 pl-11 pr-4 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 ml-2">
        <button
          onClick={onRefresh}
          className="hidden md:block p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500 transition-all"
        >
          <RefreshCw size={18} />
        </button>

        <button
          onClick={onUpload}
          className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-white font-medium transition-all"
        >
          <Upload size={18} />

          <span className="hidden md:inline">
            Upload
          </span>
        </button>
      </div>
    </header>
  );
}

export default Topbar;