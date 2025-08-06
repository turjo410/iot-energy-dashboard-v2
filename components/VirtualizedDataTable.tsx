// components/VirtualizedDataTable.tsx
import React from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';

import { useEnergyStore } from '../store/energyStore';
import { EnergyDataRow } from '../store/energyStore';

const MyComponent = () => {
  const { 
    data, 
    filteredData, 
    analytics, 
    insights,
    setData, 
    updateFilters 
  } = useEnergyStore();

  // Access analytics
  console.log('Average Power:', analytics.averagePower);
  console.log('Efficiency Score:', analytics.trends.efficiencyScore);
  console.log('Insights:', insights);

  // Update filters
  const handleFilterChange = () => {
    updateFilters({
      compressorStatus: 'on',
      powerRange: { min: 0.1, max: 0.5 }
    });
  };

  return (
    <div>
      <p>Total Records: {filteredData.length}</p>
      <p>Avg Power: {analytics.averagePower.toFixed(3)} kW</p>
    </div>
  );
};

interface VirtualizedDataTableProps {
  data: EnergyDataRow[];
  height: number;
}

export const VirtualizedDataTable: React.FC<VirtualizedDataTableProps> = ({ data, height }) => {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
    overscan: 10,
  });

  return (
    <div ref={parentRef} className="overflow-auto" style={{ height }}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const row = data[virtualRow.index];
          return (
            <div
              key={virtualRow.index}
              className="absolute top-0 left-0 w-full flex items-center px-4 py-2 border-b border-gray-200 dark:border-gray-700"
              style={{
                height: virtualRow.size,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div className="flex-1 grid grid-cols-6 gap-4 text-sm">
                <span className="text-gray-900 dark:text-white">{new Date(row.Time).toLocaleString()}</span>
                <span className="text-blue-600 dark:text-blue-400">{row.ActivePower_kW.toFixed(3)} kW</span>
                <span className="text-green-600 dark:text-green-400">{row.Voltage_V.toFixed(1)} V</span>
                <span className="text-yellow-600 dark:text-yellow-400">{row.Current_A.toFixed(3)} A</span>
                <span className="text-purple-600 dark:text-purple-400">{row.PowerFactor.toFixed(3)}</span>
                <span className={`font-medium ${row.Compressor_ON ? 'text-green-500' : 'text-red-500'}`}>
                  {row.Compressor_ON ? 'ON' : 'OFF'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
