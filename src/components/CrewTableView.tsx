import React, { useState, useMemo } from 'react';
import { Search, DollarSign, Clock, Users, Wrench } from 'lucide-react';
import { CrewData } from '../types/crew';

interface CrewTableViewProps {
  crews: CrewData[];
}

export const CrewTableView: React.FC<CrewTableViewProps> = ({ crews }) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Categories present in RSMeans
  const categories = useMemo(() => {
    const set = new Set<string>();
    crews.forEach((c) => {
      const match = c.crewId.match(/Crew\s+([A-Z])/i);
      if (match) set.add(match[1].toUpperCase());
    });
    return Array.from(set).sort();
  }, [crews]);

  const filteredCrews = useMemo(() => {
    let result = crews;

    if (selectedCategory !== 'ALL') {
      result = result.filter((c) => c.crewId.toUpperCase().includes(`CREW ${selectedCategory}`));
    }

    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.crewId.toLowerCase().includes(query) ||
          c.lineItems.some((item) => item.description.toLowerCase().includes(query))
      );
    }

    return result;
  }, [crews, selectedCategory, search]);

  const stats = useMemo(() => {
    let totalItems = 0;
    let totalDailyBare = 0;
    let totalDailyOP = 0;
    let maxDaily = 0;
    let maxCrew = '';

    crews.forEach((c) => {
      totalItems += c.lineItems.length;
      const daily = c.dailyTotals.bareCosts.daily || 0;
      totalDailyBare += daily;
      totalDailyOP += c.dailyTotals.indSubsOP.daily || 0;
      if (daily > maxDaily) {
        maxDaily = daily;
        maxCrew = c.crewId;
      }
    });

    const avgDailyBare = crews.length > 0 ? totalDailyBare / crews.length : 0;

    return {
      totalCrews: crews.length,
      totalItems,
      totalDailyBare,
      totalDailyOP,
      avgDailyBare,
      maxCrew,
      maxDaily,
    };
  }, [crews]);

  const formatCurrency = (val: number | undefined | null) => {
    if (val === undefined || val === null || val === 0) return '—';
    return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Stat Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
            <Users className="w-4 h-4 text-amber-400" />
            <span>Extracted Crews</span>
          </div>
          <p className="mt-2 text-2xl font-bold font-mono text-white tabular-nums">
            {stats.totalCrews}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">{stats.totalItems} total line items</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span>Avg Daily Bare Cost</span>
          </div>
          <p className="mt-2 text-2xl font-bold font-mono text-white tabular-nums">
            ${stats.avgDailyBare.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Per crew standard</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
            <Wrench className="w-4 h-4 text-sky-400" />
            <span>Total Bare Daily</span>
          </div>
          <p className="mt-2 text-2xl font-bold font-mono text-white tabular-nums">
            ${stats.totalDailyBare.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">O&P: ${stats.totalDailyOP.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
            <Clock className="w-4 h-4 text-purple-400" />
            <span>Highest Daily Cost</span>
          </div>
          <p className="mt-2 text-xl font-bold font-mono text-white truncate tabular-nums">
            ${stats.maxDaily.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5 truncate">{stats.maxCrew || 'None'}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-400 mr-1 font-medium">Category:</span>
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              selectedCategory === 'ALL'
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            All ({crews.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Crew {cat}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search roles, equipment, tools..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded pl-8 pr-3 py-1.5 w-full sm:w-64 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Crew Cards */}
      <div className="space-y-6">
        {filteredCrews.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-500">
            No crews match your filter or search criteria.
          </div>
        ) : (
          filteredCrews.map((crew, crewIdx) => (
            <div
              key={`${crew.crewId}-${crewIdx}`}
              className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg transition-all"
            >
              {/* Crew Header */}
              <div className="bg-slate-800/80 px-5 py-3 border-b border-slate-700/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-bold text-amber-400 font-mono tracking-wide">
                    {crew.crewId}
                  </h3>
                  <span className="text-xs text-slate-400">
                    {crew.lineItems.length} line item{crew.lineItems.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono">
                  <span className="text-slate-400">
                    Daily Bare:{' '}
                    <strong className="text-slate-200 tabular-nums font-semibold">
                      {formatCurrency(crew.dailyTotals.bareCosts.daily)}
                    </strong>
                  </span>
                  <span className="text-slate-400">
                    Daily O&P:{' '}
                    <strong className="text-emerald-400 tabular-nums font-semibold">
                      {formatCurrency(crew.dailyTotals.indSubsOP.daily)}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="bg-slate-950/60 border-b border-slate-800 text-[11px] text-slate-400">
                      <th className="py-2.5 px-4 font-semibold text-slate-300 w-2/5">Crew No. / Description</th>
                      <th className="py-2.5 px-3 text-right" colSpan={2}>
                        <div className="text-center font-semibold text-slate-300 border-b border-slate-800 pb-1 mb-1">
                          Bare Costs
                        </div>
                        <div className="grid grid-cols-2 text-right">
                          <span>Hr.</span>
                          <span>Daily</span>
                        </div>
                      </th>
                      <th className="py-2.5 px-3 text-right" colSpan={2}>
                        <div className="text-center font-semibold text-slate-300 border-b border-slate-800 pb-1 mb-1">
                          Incl. Subs O&P
                        </div>
                        <div className="grid grid-cols-2 text-right">
                          <span>Hr.</span>
                          <span>Daily</span>
                        </div>
                      </th>
                      <th className="py-2.5 px-3 text-right" colSpan={2}>
                        <div className="text-center font-semibold text-slate-300 border-b border-slate-800 pb-1 mb-1">
                          Cost Per Labor-Hour
                        </div>
                        <div className="grid grid-cols-2 text-right">
                          <span>Bare</span>
                          <span>Incl. O&P</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {crew.lineItems.map((item, idx) => (
                      <tr key={`${crew.crewId}-item-${idx}-${item.description}`} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2 px-4 font-sans text-xs text-slate-200">
                          {item.description}
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums text-slate-300">
                          {formatCurrency(item.bareCosts.hourly)}
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums text-slate-300">
                          {formatCurrency(item.bareCosts.daily)}
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums text-slate-300">
                          {formatCurrency(item.indSubsOP.hourly)}
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums text-slate-300">
                          {formatCurrency(item.indSubsOP.daily)}
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums text-slate-300">
                          {formatCurrency(item.costPerLaborHour?.bare)}
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums text-slate-300">
                          {formatCurrency(item.costPerLaborHour?.inclOP)}
                        </td>
                      </tr>
                    ))}

                    {/* Daily Totals Footer Row */}
                    <tr className="bg-slate-800/50 font-bold border-t-2 border-slate-700/80 text-amber-300">
                      <td className="py-2.5 px-4 font-sans text-xs">
                        Daily Totals
                      </td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-slate-400">
                        {formatCurrency(crew.dailyTotals.bareCosts.hourly)}
                      </td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-amber-400 font-bold">
                        {formatCurrency(crew.dailyTotals.bareCosts.daily)}
                      </td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-slate-400">
                        {formatCurrency(crew.dailyTotals.indSubsOP.hourly)}
                      </td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-emerald-400 font-bold">
                        {formatCurrency(crew.dailyTotals.indSubsOP.daily)}
                      </td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-sky-400 font-bold">
                        {formatCurrency(crew.dailyTotals.costPerLaborHour.bare)}
                      </td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-emerald-400 font-bold">
                        {formatCurrency(crew.dailyTotals.costPerLaborHour.inclOP)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
