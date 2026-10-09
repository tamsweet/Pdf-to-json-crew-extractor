import React, { useState, useMemo } from 'react';
import { Copy, Check, Download, Search, ChevronRight, ChevronDown, FileSpreadsheet, Eye, Code } from 'lucide-react';
import { CrewData } from '../types/crew';

interface JsonViewerProps {
  data: CrewData[];
  executionTimeMs?: number;
  engine?: string;
}

export const JsonViewer: React.FC<JsonViewerProps> = ({
  data,
  executionTimeMs,
  engine = 'Zig 0.13.0',
}) => {
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'tree' | 'raw'>('tree');
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});

  const formattedJsonString = useMemo(() => {
    return JSON.stringify(data, null, 2);
  }, [data]);

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedJsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([formattedJsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crews_standard_extracted_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    const rows: string[] = [];
    rows.push([
      'Crew ID',
      'Item Description',
      'Bare Cost (Hr)',
      'Bare Cost (Daily)',
      'Subs O&P (Hr)',
      'Subs O&P (Daily)',
      'Cost/LH Bare',
      'Cost/LH Incl O&P',
      'Is Daily Total',
    ].join(','));

    for (const crew of data) {
      for (const item of crew.lineItems) {
        rows.push([
          `"${crew.crewId}"`,
          `"${item.description.replace(/"/g, '""')}"`,
          item.bareCosts.hourly,
          item.bareCosts.daily,
          item.indSubsOP.hourly,
          item.indSubsOP.daily,
          item.costPerLaborHour?.bare ?? '',
          item.costPerLaborHour?.inclOP ?? '',
          'No',
        ].join(','));
      }
      rows.push([
        `"${crew.crewId}"`,
        `"Daily Totals"`,
        crew.dailyTotals.bareCosts.hourly,
        crew.dailyTotals.bareCosts.daily,
        crew.dailyTotals.indSubsOP.hourly,
        crew.dailyTotals.indSubsOP.daily,
        crew.dailyTotals.costPerLaborHour.bare,
        crew.dailyTotals.costPerLaborHour.inclOP,
        'Yes',
      ].join(','));
    }

    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crews_standard_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleNode = (nodePath: string) => {
    setCollapsedNodes((prev) => ({
      ...prev,
      [nodePath]: !prev[nodePath],
    }));
  };

  const expandAll = () => setCollapsedNodes({});
  const collapseAll = () => {
    const allPaths: Record<string, boolean> = {};
    data.forEach((_, idx) => {
      allPaths[`root.${idx}`] = true;
      allPaths[`root.${idx}.lineItems`] = true;
      allPaths[`root.${idx}.dailyTotals`] = true;
    });
    setCollapsedNodes(allPaths);
  };

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const query = searchQuery.toLowerCase();
    return data.filter((crew) => {
      if (crew.crewId.toLowerCase().includes(query)) return true;
      return crew.lineItems.some((item) =>
        item.description.toLowerCase().includes(query)
      );
    });
  }, [data, searchQuery]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-full shadow-xl">
      {/* Top Toolbar */}
      <div className="bg-slate-800/80 px-4 py-3 border-b border-slate-700/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-900/80 p-0.5 rounded border border-slate-700/60">
            <button
              onClick={() => setViewMode('tree')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${
                viewMode === 'tree'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Tree View</span>
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${
                viewMode === 'raw'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Raw JSON</span>
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search keys, roles, crews..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded pl-8 pr-3 py-1 w-48 sm:w-64 focus:outline-none focus:border-amber-500/80"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {viewMode === 'tree' && (
            <>
              <button
                onClick={expandAll}
                className="px-2 py-1 text-xs text-slate-400 hover:text-slate-200 rounded hover:bg-slate-700/50"
              >
                Expand All
              </button>
              <button
                onClick={collapseAll}
                className="px-2 py-1 text-xs text-slate-400 hover:text-slate-200 rounded hover:bg-slate-700/50"
              >
                Collapse All
              </button>
              <span className="text-slate-600">|</span>
            </>
          )}

          <button
            onClick={handleCopy}
            className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-700/50 hover:bg-slate-700 rounded transition-colors flex items-center gap-1.5"
            title="Copy JSON to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-700/50 hover:bg-slate-700 rounded transition-colors flex items-center gap-1.5"
            title="Download JSON file"
          >
            <Download className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-700/50 hover:bg-slate-700 rounded transition-colors flex items-center gap-1.5"
            title="Download CSV spreadsheet"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Meta Bar */}
      <div className="bg-slate-900/90 px-4 py-2 border-b border-slate-800 text-xs text-slate-400 flex items-center justify-between font-mono">
        <div className="flex items-center gap-3">
          <span>Array[{filteredData.length} crews]</span>
          <span aria-hidden="true">·</span>
          <span>Engine: {engine}</span>
          {executionTimeMs !== undefined && (
            <>
              <span aria-hidden="true">·</span>
              <span>Execution: {executionTimeMs}ms</span>
            </>
          )}
        </div>
        <div className="text-slate-500">Schema: CrewData[]</div>
      </div>

      {/* Content View */}
      <div className="p-4 overflow-auto flex-1 font-mono text-xs leading-relaxed max-h-[680px]">
        {viewMode === 'raw' ? (
          <pre className="text-slate-300 select-all whitespace-pre-wrap font-mono">
            {formattedJsonString}
          </pre>
        ) : (
          <div className="space-y-1">
            <span className="text-slate-500">[</span>
            {filteredData.map((crew, idx) => (
              <TreeNode
                key={crew.crewId + idx}
                path={`root.${idx}`}
                label={`[${idx}] ${crew.crewId}`}
                value={crew}
                isLast={idx === filteredData.length - 1}
                collapsedNodes={collapsedNodes}
                onToggle={toggleNode}
                indent={1}
              />
            ))}
            <span className="text-slate-500">]</span>
          </div>
        )}
      </div>
    </div>
  );
};

interface TreeNodeProps {
  path: string;
  label?: string;
  value: any;
  isLast: boolean;
  collapsedNodes: Record<string, boolean>;
  onToggle: (path: string) => void;
  indent: number;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  path,
  label,
  value,
  isLast,
  collapsedNodes,
  onToggle,
  indent,
}) => {
  const isCollapsed = Boolean(collapsedNodes[path]);
  const isObject = value !== null && typeof value === 'object';
  const isArray = Array.isArray(value);

  const paddingLeft = `${indent * 1.25}rem`;

  if (!isObject) {
    let renderedVal: React.ReactNode;
    if (typeof value === 'string') {
      renderedVal = <span className="text-emerald-400">"{value}"</span>;
    } else if (typeof value === 'number') {
      renderedVal = <span className="text-amber-400 tabular-nums">{value}</span>;
    } else if (typeof value === 'boolean') {
      renderedVal = <span className="text-purple-400">{value ? 'true' : 'false'}</span>;
    } else if (value === null) {
      renderedVal = <span className="text-slate-500">null</span>;
    } else {
      renderedVal = <span>{String(value)}</span>;
    }

    return (
      <div style={{ paddingLeft }} className="hover:bg-slate-800/40 py-0.5 rounded flex items-center gap-1.5">
        {label && <span className="text-sky-300">"{label}": </span>}
        {renderedVal}
        {!isLast && <span className="text-slate-500">,</span>}
      </div>
    );
  }

  const entries = Object.entries(value);
  const openBracket = isArray ? '[' : '{';
  const closeBracket = isArray ? ']' : '}';

  return (
    <div className="select-text">
      <div
        style={{ paddingLeft }}
        onClick={() => onToggle(path)}
        className="cursor-pointer hover:bg-slate-800/60 py-0.5 rounded flex items-center gap-1 text-slate-300 group"
      >
        <span className="text-slate-500 group-hover:text-amber-400 transition-colors">
          {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </span>

        {label && (
          <span className="text-sky-300">
            {typeof label === 'number' ? `[${label}]` : `"${label}"`}:
          </span>
        )}

        <span className="text-slate-400 font-semibold">{openBracket}</span>

        {isCollapsed && (
          <span className="text-slate-500 text-[10px] ml-1 px-1.5 py-0.2 bg-slate-800 rounded">
            {isArray ? `${entries.length} items` : `${entries.length} keys`}
          </span>
        )}

        {isCollapsed && <span className="text-slate-400 font-semibold">{closeBracket}</span>}
        {!isLast && isCollapsed && <span className="text-slate-500">,</span>}
      </div>

      {!isCollapsed && (
        <>
          {entries.map(([childKey, childValue], idx) => (
            <TreeNode
              key={path + '.' + childKey}
              path={`${path}.${childKey}`}
              label={isArray ? undefined : childKey}
              value={childValue}
              isLast={idx === entries.length - 1}
              collapsedNodes={collapsedNodes}
              onToggle={onToggle}
              indent={indent + 1}
            />
          ))}
          <div style={{ paddingLeft }} className="text-slate-400 font-semibold py-0.5">
            {closeBracket}
            {!isLast && <span className="text-slate-500">,</span>}
          </div>
        </>
      )}
    </div>
  );
};
