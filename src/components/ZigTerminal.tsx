import React, { useState } from 'react';
import { Terminal, Check, Copy, Cpu, ShieldCheck, Zap, Layers, Play } from 'lucide-react';
import { BackendStatus } from '../services/extractorService';

interface ZigTerminalProps {
  status: BackendStatus | null;
  onRunTest: () => void;
  isLoading: boolean;
}

export const ZigTerminal: React.FC<ZigTerminalProps> = ({
  status,
  onRunTest,
  isLoading,
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const commands = [
    {
      label: 'Build Zig Extractor Binary',
      cmd: 'cd backend && zig build -Doptimize=ReleaseFast',
      desc: 'Compiles memory-safe Zig executable to backend/zig-out/bin/crew-extractor',
    },
    {
      label: 'Run Standalone HTTP REST Server',
      cmd: './backend/zig-out/bin/crew-extractor --server 8080',
      desc: 'Starts high-throughput std.http server handling POST /api/extract directly',
    },
    {
      label: 'Extract RSMeans PDF via CLI',
      cmd: './backend/zig-out/bin/crew-extractor document.pdf > output.json',
      desc: 'Invokes Poppler C-interop stream extraction and state-machine parser',
    },
    {
      label: 'Extract Unique Labour Data via CLI',
      cmd: './backend/zig-out/bin/crew-extractor --labour document.pdf > labour.json',
      desc: 'Deduplicates all trade descriptions and outputs pure LabourData[] schema',
    },
  ];

  const handleCopy = (cmd: string, idx: number) => {
    navigator.clipboard.writeText(cmd);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Architecture Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3">
            <Cpu className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-semibold text-slate-100">Zig 0.13.0 Engine</h4>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Written in native Zig with zero hidden allocations. Uses <code className="text-amber-300 font-mono text-[11px]">GeneralPurposeAllocator</code> and explicit <code className="text-amber-300 font-mono text-[11px]">defer</code> memory safety.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
            <Layers className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-semibold text-slate-100">Two-Column Layout Normalizer</h4>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Detects vertical column gutters on RSMeans construction sheets. Separates the left and right crew streams sequentially to prevent interleaving.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-3">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-semibold text-slate-100">C-Interop & std.json</h4>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Integrates with Poppler stream decoders, filters table headers, and serializes directly to the strictly typed <code className="text-sky-300 font-mono text-[11px]">CrewData[]</code> JSON schema.
          </p>
        </div>
      </div>

      {/* Terminal View */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl font-mono text-xs">
        <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            <span className="ml-2 text-slate-400 text-xs font-semibold">
              zig-backend :: status & execution
            </span>
          </div>

          <button
            onClick={onRunTest}
            disabled={isLoading}
            className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded text-[11px] font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Play className="w-3 h-3 fill-amber-300" />
            <span>Run Benchmark Test</span>
          </button>
        </div>

        <div className="p-5 space-y-4 text-slate-300">
          <div>
            <span className="text-emerald-400">$</span>{' '}
            <span className="text-slate-100 font-bold">backend/zig-out/bin/crew-extractor --version</span>
            <div className="text-slate-400 mt-1 pl-4">
              {status?.zigVersion || 'Crew Standard Extractor (Zig) v1.0.0'}
            </div>
          </div>

          <div>
            <span className="text-emerald-400">$</span>{' '}
            <span className="text-slate-100 font-bold">curl http://localhost:{status?.port || 3000}/api/status</span>
            <div className="text-amber-300/90 mt-1 pl-4 bg-slate-900/60 p-3 rounded border border-slate-800/80">
              <pre>{JSON.stringify(status, null, 2)}</pre>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80">
            <p className="text-slate-400 font-semibold mb-3">CLI Commands & Standalone Mode:</p>
            <div className="space-y-3">
              {commands.map((item, idx) => (
                <div key={idx} className="bg-slate-900/40 p-3 rounded border border-slate-800/60">
                  <div className="flex items-center justify-between">
                    <span className="text-amber-400 text-[11px] font-semibold">{item.label}</span>
                    <button
                      onClick={() => handleCopy(item.cmd, idx)}
                      className="text-slate-400 hover:text-white transition-colors"
                      title="Copy command"
                    >
                      {copiedIndex === idx ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <div className="text-slate-200 mt-1.5 select-all">{item.cmd}</div>
                  <div className="text-slate-500 text-[11px] mt-1">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
