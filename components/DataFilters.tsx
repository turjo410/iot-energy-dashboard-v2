// components/DataFilters.tsx
import React, { useState } from 'react';
import { Search, Filter, Calendar, Zap } from 'lucide-react';

interface DataFiltersProps {
  onFilterChange: (filters: FilterState) => void;
}

interface FilterState {
  search: string;
  dateRange: { start: string; end: string };
  powerRange: { min: number; max: number };
  compressorStatus: 'all' | 'on' | 'off';
}

export const DataFilters: React.FC<DataFiltersProps> = ({ onFilterChange }) => {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    dateRange: { start: '', end: '' },
    powerRange: { min: 0, max: 1 },
    compressorStatus: 'all'
  });

  const updateFilter = (key: keyof FilterState, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-4 mb-6">
        <Filter className="h-5 w-5 text-blue-500" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Advanced Filters</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search timestamps..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
          />
        </div>

        {/* Date Range */}
        <div className="flex gap-2">
          <input
            type="datetime-local"
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            value={filters.dateRange.start}
            onChange={(e) => updateFilter('dateRange', { ...filters.dateRange, start: e.target.value })}
          />
          <input
            type="datetime-local"
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            value={filters.dateRange.end}
            onChange={(e) => updateFilter('dateRange', { ...filters.dateRange, end: e.target.value })}
          />
        </div>

        {/* Power Range */}
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-yellow-500" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            className="flex-1"
            value={filters.powerRange.max}
            onChange={(e) => updateFilter('powerRange', { ...filters.powerRange, max: parseFloat(e.target.value) })}
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">{filters.powerRange.max.toFixed(2)} kW</span>
        </div>

        {/* Compressor Status */}
        <select
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          value={filters.compressorStatus}
          onChange={(e) => updateFilter('compressorStatus', e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="on">Compressor ON</option>
          <option value="off">Compressor OFF</option>
        </select>
      </div>
    </div>
  );
};
