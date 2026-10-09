import React from 'react';
import { FileCode, CheckCircle, ArrowRight } from 'lucide-react';

export const SchemaDocumentation: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <FileCode className="w-5 h-5 text-amber-400" />
          <span>Expected TypeScript JSON Schema</span>
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          The Zig backend returns an array of <code className="text-amber-300 font-mono">CrewData</code> objects adhering strictly to the contract:
        </p>

        <div className="mt-4 bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-xs text-slate-200 overflow-x-auto">
          <pre>{`interface CrewData {
  crewId: string; // e.g., "Crew A-1"
  lineItems: {
    description: string; // e.g., "1 Rubbing Laborer"
    bareCosts: { hourly: number; daily: number };
    indSubsOP: { hourly: number; daily: number };
    costPerLaborHour?: { bare: number; inclOP: number }; // Present on items with LH rates
  }[];
  dailyTotals: {
    bareCosts: { hourly: number; daily: number };
    indSubsOP: { hourly: number; daily: number };
    costPerLaborHour: { bare: number; inclOP: number };
  };
}`}</pre>
        </div>
      </div>

      {/* Unique Labour Schema */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <FileCode className="w-5 h-5 text-emerald-400" />
          <span>Unique Labour Data Schema</span>
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Deduplicated labor rates extracted per unique trade description:
        </p>

        <div className="mt-4 bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-xs text-slate-200 overflow-x-auto">
          <pre>{`interface LabourData {
  description: string; // e.g., "1 Equip. Oper. (crane)"
  bareCosts: {
    hourly: number;    // e.g., 56.10
    daily: number;     // e.g., 448.80
  };
  indSubsOP: {
    hourly: number;    // e.g., 84.60
    daily: number;     // e.g., 676.80
  };
  costPerLaborHour: {
    bare: number;      // e.g., 51.05
    inclOP: number;    // e.g., 76.95
  };
}`}</pre>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h4 className="text-sm font-bold text-slate-100">RSMeans Normalization Rules</h4>

        <div className="space-y-3 text-xs text-slate-300">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white">Column Header Normalization:</strong> The left side of RSMeans pages repeats "Bare Incl. O&P", while the right side uses "Bare" and "Incl. O&P". The parser normalizes both sides to unified <code className="text-amber-300 font-mono">bare</code> and <code className="text-amber-300 font-mono">inclOP</code> fields.
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white">Two-Column Layout Isolation:</strong> Construction standards place tables in two distinct vertical columns per page (e.g. Crew A-1 to A-1M on the left, Crew A-2 to A-3F on the right). The engine isolates the left gutter and right gutter to maintain chronological row sequencing.
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white">Daily Totals Row Handling:</strong> The closing row of each crew (e.g., <code className="text-amber-300 font-mono">8 L.H., Daily Totals $390.00 $563.92 $48.75 $70.49</code>) is extracted into <code className="text-amber-300 font-mono">dailyTotals</code> with daily bare, daily O&P, and labor-hour averages.
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white">Equipment vs Labor Distinctions:</strong> Equipment line items that only carry daily rental figures and per-hour costs are parsed with their appropriate daily values without crashing on absent hourly wage rates.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
