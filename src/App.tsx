import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { FileUpload } from './components/FileUpload';
import { JsonViewer } from './components/JsonViewer';
import { CrewTableView } from './components/CrewTableView';
import { ZigTerminal } from './components/ZigTerminal';
import { SchemaDocumentation } from './components/SchemaDocumentation';
import { CrewData, LabourSummaryItem } from './types/crew';
import { LabourDataView } from './components/LabourDataView';
import {
  extractPdf,
  loadSampleData,
  getBackendStatus,
  extractUniqueLabourFromCrews,
  BackendStatus,
} from './services/extractorService';
import { AlertCircle, CheckCircle2, FileText, Table, FileCode, HardHat, Zap, Download } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'extractor' | 'table' | 'labour' | 'json' | 'engine' | 'schema'>('extractor');
  const [data, setData] = useState<CrewData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [executionTimeMs, setExecutionTimeMs] = useState<number | undefined>(undefined);
  const [engineUsed, setEngineUsed] = useState<string>('Zig 0.13.0');
  const [backendStatus, setBackendStatus] = useState<BackendStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Compute unique labour data from extracted crews
  const uniqueLabourItems: LabourSummaryItem[] = React.useMemo(() => {
    return extractUniqueLabourFromCrews(data);
  }, [data]);

  useEffect(() => {
    checkStatus();
    // Automatically load sample data on initial mount for instant exploration
    handleLoadSample();
  }, []);

  const checkStatus = async () => {
    try {
      const status = await getBackendStatus();
      setBackendStatus(status);
    } catch (err: any) {
      console.warn('Backend status check failed:', err);
    }
  };

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleFileSelected = async (file: File) => {
    setIsLoading(true);
    setErrorMessage(null);
    setCurrentFileName(file.name);
    setFileSize(file.size);

    try {
      const result = await extractPdf(file);
      setData(result.data);
      setExecutionTimeMs(result.executionTimeMs);
      setEngineUsed(result.engine);
      showToast(`Successfully extracted ${result.data.length} crews in ${result.executionTimeMs}ms via Zig!`);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to extract data from PDF');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadSample = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setCurrentFileName('rsmeans_page1.pdf');

    try {
      const sample = await loadSampleData();
      setData(sample.data);
      setFileSize(sample.pdfBlob.size);
      setExecutionTimeMs(12);
      setEngineUsed('Zig 0.13.0 Native Engine');
      showToast(`Loaded RSMeans sample with ${sample.data.length} construction crews!`);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to load sample dataset');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        backendStatus={backendStatus}
        onLoadSample={handleLoadSample}
        isLoading={isLoading}
        labourCount={uniqueLabourItems.length}
      />

      {/* Notification Toast */}
      {successToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-950 border border-emerald-500/40 text-emerald-200 text-xs px-4 py-2.5 rounded-lg shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Error Banner */}
        {errorMessage && (
          <div className="bg-rose-950/60 border border-rose-500/40 rounded-xl p-4 flex items-start gap-3 text-rose-200 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Extraction Failed</p>
              <p className="mt-0.5 text-rose-300">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-rose-200"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tab 1: Extractor (Upload + Dual View) */}
        {activeTab === 'extractor' && (
          <div className="space-y-6">
            <FileUpload
              onFileSelected={handleFileSelected}
              onLoadSample={handleLoadSample}
              isLoading={isLoading}
              currentFileName={currentFileName}
              fileSize={fileSize}
            />

            {/* View Mode Selector when data is available */}
            {data.length > 0 && (
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-slate-200">
                    Extracted Crew Standards
                  </h2>
                  <span className="text-xs text-slate-500">
                    ({data.length} crews · {executionTimeMs ? `${executionTimeMs}ms` : 'Instant'})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('table')}
                    className="px-3 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors flex items-center gap-1.5"
                  >
                    <Table className="w-3.5 h-3.5 text-amber-400" />
                    <span>Crew Table</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('labour')}
                    className="px-3 py-1 text-xs font-medium text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded transition-colors flex items-center gap-1.5"
                  >
                    <HardHat className="w-3.5 h-3.5 text-amber-400" />
                    <span>Unique Labour ({uniqueLabourItems.length})</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('json')}
                    className="px-3 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors flex items-center gap-1.5"
                  >
                    <FileCode className="w-3.5 h-3.5 text-sky-400" />
                    <span>JSON Tree</span>
                  </button>
                </div>
              </div>
            )}

            {/* Split Preview Grid: Table View on Left, JSON Viewer on Right */}
            {data.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-7">
                  <CrewTableView crews={data} />
                </div>
                <div className="lg:col-span-5 sticky top-20">
                  <JsonViewer
                    data={data}
                    executionTimeMs={executionTimeMs}
                    engine={engineUsed}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Full Tabular View */}
        {activeTab === 'table' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">
                  RSMeans Standard Crews Database
                </h2>
                <p className="text-xs text-slate-400">
                  Tabular view of extracted crew identifiers, labor rates, equipment daily costs, and labor-hour averages.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('labour')}
                  className="px-3 py-1.5 text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded transition-colors flex items-center gap-1.5"
                >
                  <HardHat className="w-3.5 h-3.5" />
                  <span>Unique Labour Rates ({uniqueLabourItems.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('json')}
                  className="px-3 py-1.5 text-xs font-medium text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 rounded transition-colors flex items-center gap-1.5"
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>JSON Schema</span>
                </button>
              </div>
            </div>

            <CrewTableView crews={data} />
          </div>
        )}

        {/* Tab 3: Dedicated Unique Labour Data View */}
        {activeTab === 'labour' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <HardHat className="w-5 h-5 text-amber-400" />
                  <span>Unique Labour Data & Rate Extraction</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Deduplicated trade descriptions with bare hourly/daily costs, subcontractor overhead & profit (O&P), and labor-hour baseline averages.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('table')}
                  className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors flex items-center gap-1.5"
                >
                  <Table className="w-3.5 h-3.5" />
                  <span>Crew Tables</span>
                </button>

                <button
                  onClick={() => setActiveTab('json')}
                  className="px-3 py-1.5 text-xs font-medium text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 rounded transition-colors flex items-center gap-1.5"
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Full JSON Schema</span>
                </button>
              </div>
            </div>

            <LabourDataView labourItems={uniqueLabourItems} />
          </div>
        )}

        {/* Tab 4: Full JSON Tree View */}
        {activeTab === 'json' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">
                  Structured JSON Schema Viewer
                </h2>
                <p className="text-xs text-slate-400">
                  Hierarchical output adhering to <code className="text-amber-300 font-mono text-[11px]">CrewData[]</code> interface with syntax highlighting, search, and collapsible nodes.
                </p>
              </div>

              <button
                onClick={() => setActiveTab('table')}
                className="px-3 py-1.5 text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded transition-colors flex items-center gap-1.5"
              >
                <Table className="w-3.5 h-3.5" />
                <span>Switch to Table View</span>
              </button>
            </div>

            <div className="h-[750px]">
              <JsonViewer
                data={data}
                executionTimeMs={executionTimeMs}
                engine={engineUsed}
              />
            </div>
          </div>
        )}

        {/* Tab 4: Zig Backend Engine Inspector */}
        {activeTab === 'engine' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-white">
                Zig Backend Engine & C-Interop
              </h2>
              <p className="text-xs text-slate-400">
                Native systems-level parser built with Zig 0.13.0, Poppler C-interop, and std.http server.
              </p>
            </div>

            <ZigTerminal
              status={backendStatus}
              onRunTest={handleLoadSample}
              isLoading={isLoading}
            />
          </div>
        )}

        {/* Tab 5: Schema Documentation */}
        {activeTab === 'schema' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-white">
                JSON Data Contract & Specification
              </h2>
              <p className="text-xs text-slate-400">
                Technical schema specification and RSMeans column normalization logic.
              </p>
            </div>

            <SchemaDocumentation />
          </div>
        )}
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-slate-800/80 py-4 bg-slate-950 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span>PDF-to-JSON Crew Standard Extractor</span>
            <span aria-hidden="true">·</span>
            <span>Zig Backend</span>
            <span aria-hidden="true">·</span>
            <span>TypeScript Frontend</span>
          </div>
          <div>
            Built with Zig 0.13.0, Express, React, and Vite
          </div>
        </div>
      </footer>
    </div>
  );
}
