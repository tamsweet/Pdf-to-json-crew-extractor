import React, { useState, useMemo } from 'react';
import {
  Download,
  Copy,
  Check,
  Search,
  Users,
  DollarSign,
  TrendingUp,
  FileCode,
  FileSpreadsheet,
  Code,
  Eye,
  Layers,
  ArrowUpDown,
  Filter
} from 'lucide-react';
import { LabourSummaryItem, LabourData } from '../types/crew';

interface LabourDataViewProps {
  labourItems: LabourSummaryItem[];
  onDirectExportJson?: () => void;
}

export const LabourDataView: React.FC<LabourDataViewProps> = ({
  labourItems,
}) => {
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'json'>('table');
  const [copied, setCopied] = useState(false);
  const [sortField, setSortField] = useState<'description' | 'hourlyBare' | 'hourlyOP' | 'laborBare' | 'laborOP' | 'occurrences'>('description');
  const [sortAsc, setSortAsc] = useState(true);

  // Pure LabourData array adhering strictly to user schema:
  // { description: string, bareCosts: { hourly, daily }, indSubsOP: { hourly, daily }, costPerLaborHour: { bare, inclOP } }
  const pureLabourData: LabourData[] = useMemo(() => {
    return labourItems.map((item) => ({
      description: item.description,
      bareCosts: {
        hourly: item.bareCosts.hourly,
        daily: item.bareCosts.daily,
      },
      indSubsOP: {
        hourly: item.indSubsOP.hourly,
        daily: item.indSubsOP.daily,
      },
      costPerLaborHour: {
        bare: item.costPerLaborHour.bare,
        inclOP: item.costPerLaborHour.inclOP,
      },
    }));
  }, [labourItems]);

  const filteredAndSortedItems = useMemo(() => {
    let result = [...labourItems];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (item) =>
          item.description.toLowerCase().includes(q) ||
          item.crewIds.some((cid) => cid.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      let valA: any = a.description;
      let valB: any = b.description;

      if (sortField === 'hourlyBare') {
        valA = a.bareCosts.hourly;
        valB = b.bareCosts.hourly;
      } else if (sortField === 'hourlyOP') {
        valA = a.indSubsOP.hourly;
        valB = b.indSubsOP.hourly;
      } else if (sortField === 'laborBare') {
        valA = a.costPerLaborHour.bare;
        valB = b.costPerLaborHour.bare;
      } else if (sortField === 'laborOP') {
        valA = a.costPerLaborHour.inclOP;
        valB = b.costPerLaborHour.inclOP;
      } else if (sortField === 'occurrences') {
        valA = a.occurrences;
        valB = b.occurrences;
      }

      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? valA - valB : valB - valA;
    });

    return result;
  }, [labourItems, search, sortField, sortAsc]);

  const stats = useMemo(() => {
    if (labourItems.length === 0) {
      return { total: 0, avgBareHourly: 0, avgOPHourly: 0, maxHourly: 0, maxRole: '' };
    }

    let sumBare = 0;
    let sumOP = 0;
    let maxHourly = 0;
    let maxRole = '';

    labourItems.forEach((item) => {
      const h = item.bareCosts.hourly || item.costPerLaborHour.bare || 0;
      sumBare += h;
      sumOP += item.indSubsOP.hourly || item.costPerLaborHour.inclOP || 0;
      if (h > maxHourly) {
        maxHourly = h;
        maxRole = item.description;
      }
    });

    return {
      total: labourItems.length,
      avgBareHourly: sumBare / labourItems.length,
      avgOPHourly: sumOP / labourItems.length,
      maxHourly,
      maxRole,
    };
  }, [labourItems]);

  const handleCopyJson = () => {
    const jsonStr = JSON.stringify(pureLabourData, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportJson = () => {
    const jsonStr = JSON.stringify(pureLabourData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `unique_labour_data_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    const headers = [
      'Description',
      'Bare Hourly',
      'Bare Daily',
      'Subs O&P Hourly',
      'Subs O&P Daily',
      'Cost/LH Bare',
      'Cost/LH Incl O&P',
      'Occurrences',
      'Associated Crews',
    ];

    const rows = filteredAndSortedItems.map((item) => [
      `"${item.description.replace(/"/g, '""')}"`,
      item.bareCosts.hourly,
      item.bareCosts.daily,
      item.indSubsOP.hourly,
      item.indSubsOP.daily,
      item.costPerLaborHour.bare,
      item.costPerLaborHour.inclOP,
      item.occurrences,
      `"${item.crewIds.join(', ')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `unique_labour_data_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const formatCurrency = (val: number | undefined | null) => {
    if (val === undefined || val === null || val === 0) return '—';
    return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
            <Users className="w-4 h-4 text-amber-400" />
            <span>Unique Labor Roles</span>
          </div>
          <p className="mt-2 text-2xl font-bold font-mono text-white tabular-nums">
            {stats.total}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Deduplicated across all crews</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span>Avg Bare Hourly Rate</span>
          </div>
          <p className="mt-2 text-2xl font-bold font-mono text-white tabular-nums">
            ${stats.avgBareHourly.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Direct baseline wage</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
            <TrendingUp className="w-4 h-4 text-sky-400" />
            <span>Avg Subs O&P Rate</span>
          </div>
          <p className="mt-2 text-2xl font-bold font-mono text-white tabular-nums">
            ${stats.avgOPHourly.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">With overhead & profit</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
            <Layers className="w-4 h-4 text-purple-400" />
            <span>Highest Hourly Wage</span>
          </div>
          <p className="mt-2 text-xl font-bold font-mono text-white truncate tabular-nums">
            ${stats.maxHourly.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5 truncate">{stats.maxRole || '—'}</p>
        </div>
      </div>

      {/* Action and Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                viewMode === 'table'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
            <button
              onClick={() => setViewMode('json')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                viewMode === 'json'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>JSON Schema</span>
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search unique descriptions, trades..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg pl-8 pr-3 py-1.5 w-60 sm:w-72 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyJson}
            className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
            title="Copy schema JSON to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied JSON!' : 'Copy JSON'}</span>
          </button>

          <button
            onClick={handleExportJson}
            className="px-3 py-1.5 text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors flex items-center gap-1.5"
            title="Download pure LabourData JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-colors flex items-center gap-1.5"
            title="Download Labour Spreadsheet"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Main View Area */}
      {viewMode === 'table' ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] text-slate-400">
                  <th
                    onClick={() => toggleSort('description')}
                    className="py-3 px-4 font-semibold text-slate-200 cursor-pointer hover:text-amber-400 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Unique Description</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>

                  <th className="py-2.5 px-3 text-right" colSpan={2}>
                    <div className="text-center font-semibold text-slate-300 border-b border-slate-800 pb-1 mb-1">
                      Bare Costs
                    </div>
                    <div className="grid grid-cols-2 text-right">
                      <span
                        onClick={() => toggleSort('hourlyBare')}
                        className="cursor-pointer hover:text-amber-400"
                      >
                        Hourly
                      </span>
                      <span>Daily</span>
                    </div>
                  </th>

                  <th className="py-2.5 px-3 text-right" colSpan={2}>
                    <div className="text-center font-semibold text-slate-300 border-b border-slate-800 pb-1 mb-1">
                      Incl. Subs O&P
                    </div>
                    <div className="grid grid-cols-2 text-right">
                      <span
                        onClick={() => toggleSort('hourlyOP')}
                        className="cursor-pointer hover:text-amber-400"
                      >
                        Hourly
                      </span>
                      <span>Daily</span>
                    </div>
                  </th>

                  <th className="py-2.5 px-3 text-right" colSpan={2}>
                    <div className="text-center font-semibold text-slate-300 border-b border-slate-800 pb-1 mb-1">
                      Cost Per Labor-Hour
                    </div>
                    <div className="grid grid-cols-2 text-right">
                      <span
                        onClick={() => toggleSort('laborBare')}
                        className="cursor-pointer hover:text-amber-400"
                      >
                        Bare
                      </span>
                      <span
                        onClick={() => toggleSort('laborOP')}
                        className="cursor-pointer hover:text-amber-400"
                      >
                        Incl. O&P
                      </span>
                    </div>
                  </th>

                  <th
                    onClick={() => toggleSort('occurrences')}
                    className="py-3 px-4 text-center font-semibold text-slate-300 cursor-pointer hover:text-amber-400"
                  >
                    Crews
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredAndSortedItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500 font-sans">
                      No unique labour items match your search.
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedItems.map((item, idx) => (
                    <tr key={`labour-${item.description}-${idx}`} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-4 font-sans text-xs text-slate-100 font-medium">
                        {item.description}
                      </td>

                      <td className="py-2.5 px-2 text-right tabular-nums text-amber-300 font-semibold">
                        {formatCurrency(item.bareCosts.hourly)}
                      </td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-slate-300">
                        {formatCurrency(item.bareCosts.daily)}
                      </td>

                      <td className="py-2.5 px-2 text-right tabular-nums text-emerald-400 font-semibold">
                        {formatCurrency(item.indSubsOP.hourly)}
                      </td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-slate-300">
                        {formatCurrency(item.indSubsOP.daily)}
                      </td>

                      <td className="py-2.5 px-2 text-right tabular-nums text-sky-400 font-semibold">
                        {formatCurrency(item.costPerLaborHour.bare)}
                      </td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-emerald-400 font-semibold">
                        {formatCurrency(item.costPerLaborHour.inclOP)}
                      </td>

                      <td className="py-2.5 px-4 text-center font-sans">
                        <span
                          className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700/80"
                          title={`Used in: ${item.crewIds.join(', ')}`}
                        >
                          {item.occurrences} {item.occurrences === 1 ? 'crew' : 'crews'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Pure JSON View */
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 text-xs text-slate-400 flex items-center justify-between font-mono">
            <span>LabourData[] ({pureLabourData.length} unique descriptions)</span>
            <span>JSON Object Format</span>
          </div>
          <div className="p-4 overflow-auto max-h-[650px] font-mono text-xs leading-relaxed text-slate-200">
            <pre className="select-all whitespace-pre-wrap">
              {JSON.stringify(pureLabourData, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
