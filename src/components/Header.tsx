import React from 'react';
import { FileCode, Cpu, Table, FileText, CheckCircle2, AlertCircle, HardHat } from 'lucide-react';
import { BackendStatus } from '../services/extractorService';

interface HeaderProps {
  activeTab: 'extractor' | 'table' | 'labour' | 'json' | 'engine' | 'schema';
  setActiveTab: (tab: 'extractor' | 'table' | 'labour' | 'json' | 'engine' | 'schema') => void;
  backendStatus: BackendStatus | null;
  onLoadSample: () => void;
  isLoading: boolean;
  labourCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  backendStatus,
  onLoadSample,
  isLoading,
  labourCount,
}) => {
  return (
    <header className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-mono font-bold text-sm">
            Z
          </div>
          <span className="text-base font-semibold tracking-tight text-white whitespace-nowrap">
            RSMeans Crew Extractor
          </span>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          <button
            onClick={() => setActiveTab('extractor')}
            className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'extractor'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Upload & Extract</span>
          </button>

          <button
            onClick={() => setActiveTab('table')}
            className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'table'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>Crew Table</span>
          </button>

          <button
            onClick={() => setActiveTab('labour')}
            className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'labour'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <HardHat className="w-4 h-4 text-amber-400" />
            <span>Labour Data</span>
            {labourCount !== undefined && labourCount > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300">
                {labourCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('json')}
            className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'json'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>JSON Tree</span>
          </button>

          <button
            onClick={() => setActiveTab('engine')}
            className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'engine'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Zig Engine</span>
          </button>

          <button
            onClick={() => setActiveTab('schema')}
            className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
              activeTab === 'schema'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Schema
          </button>
        </nav>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onLoadSample}
            disabled={isLoading}
            className="px-3 py-1.5 text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded transition-colors whitespace-nowrap disabled:opacity-50"
          >
            Load Sample PDF
          </button>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 px-2 py-1 bg-slate-800/80 rounded border border-slate-700/60 font-mono">
            {backendStatus?.binaryExists ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zig v0.13.0 Active</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>Checking Zig...</span>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
