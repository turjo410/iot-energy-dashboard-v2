import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { X, Download, Maximize2 } from 'lucide-react';
import { formatXAxisTime } from '../utils/dateHelpers';
import { EnergyDataRow } from '../store/energyStore';
import { formatTimeOnly } from '../utils/dateHelpers';

interface ChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: EnergyDataRow[];
  chartType: 'power' | 'voltage' | 'current' | 'cost';
  title: string;
}

export const ChartModal: React.FC<ChartModalProps> = ({ 
  isOpen, 
  onClose, 
  data, 
  chartType, 
  title 
}) => {
  const [showDataPoints, setShowDataPoints] = useState(false);

  const getDataKey = () => {
    switch (chartType) {
      case 'power': return 'ActivePower_kW';
      case 'voltage': return 'Voltage_V';
      case 'current': return 'Current_A';
      case 'cost': return 'Cost_cum_BDT';
      default: return 'ActivePower_kW';
    }
  };

  const getColor = () => {
    switch (chartType) {
      case 'power': return '#3b82f6';
      case 'voltage': return '#10b981';
      case 'current': return '#f59e0b';
      case 'cost': return '#8b5cf6';
      default: return '#3b82f6';
    }
  };

  const exportChart = () => {
    const csvContent = data.map(row => 
      `${row.Time},${row[getDataKey()]}`
    ).join('\n');
    
    const blob = new Blob([`Time,${getDataKey()}\n${csvContent}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${chartType}-data-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };



// To this structure:
return (
    <AnimatePresence>
        {isOpen && (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                {/* Rest of your modal content */}
            </motion.div>
        )}
    </AnimatePresence>
);


  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          className="bg-slate-900 rounded-2xl p-6 max-w-7xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-white">{title}</h2>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowDataPoints(!showDataPoints)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {showDataPoints ? 'Hide Points' : 'Show Points'}
              </button>
              <button
                onClick={exportChart}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
              <button
                onClick={onClose}
                className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-6">
            <ResponsiveContainer width="100%" height={600}>
              <AreaChart data={data}>
                <defs>
                  <linearGradient id={`gradient-${chartType}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={getColor()} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={getColor()} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
// Import the helper
import { formatXAxisTime } from '../utils/dateHelpers';

// In ALL your chart components, replace the XAxis like this:
<XAxis 
    dataKey="Time" 
    tickFormatter={formatTimeOnly}  // Shows "03:00", "04:00", etc.
/>

                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(17, 24, 39, 0.95)', 
                    border: '1px solid #374151',
                    borderRadius: '12px',
                    color: '#FFF'
                  }}
                  labelFormatter={(time) => new Date(time).toLocaleString()}
                />
                <Area 
                  type="monotone" 
                  dataKey={getDataKey()} 
                  stroke={getColor()} 
                  strokeWidth={3}
                  fill={`url(#gradient-${chartType})`}
                  dot={showDataPoints ? { fill: getColor(), r: 4 } : false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-800/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">
                {data.length > 0 ? Math.max(...data.map(d => d[getDataKey()])).toFixed(2) : '0'}
              </div>
              <div className="text-slate-400">Maximum</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">
                {data.length > 0 ? Math.min(...data.map(d => d[getDataKey()])).toFixed(2) : '0'}
              </div>
              <div className="text-slate-400">Minimum</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">
                {data.length > 0 ? (data.reduce((sum, d) => sum + d[getDataKey()], 0) / data.length).toFixed(2) : '0'}
              </div>
              <div className="text-slate-400">Average</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">{data.length}</div>
              <div className="text-slate-400">Data Points</div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
