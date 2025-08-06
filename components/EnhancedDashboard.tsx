// components/EnhancedDashboard.tsx
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Zap, Activity, TrendingUp, DollarSign } from 'lucide-react';
import { EnergyDataRow } from '../services/googleSheetsService';
import { formatTooltipTime, getTodayDate } from '../utils/dateHelpers';

interface EnhancedDashboardPageProps {
    data: EnergyDataRow[];
    viewMode?: 'realtime' | 'historical';
    selectedDate?: string;
    onChartEnlarge: (type: string, title: string) => void; // Fixed signature
}

const EnhancedDashboardPage: React.FC<EnhancedDashboardPageProps> = ({ 
    data, 
    viewMode = 'realtime', 
    selectedDate = getTodayDate(), 
    onChartEnlarge 
}) => {
    const latest = data.length > 0 ? data[data.length - 1] : null;
    
    // Calculate summary statistics
    const summaryStats = useMemo(() => {
        if (data.length === 0) return null;
        
        const totalRecords = data.length;
        const firstRecord = data[0];
        const lastRecord = data[data.length - 1];
        const avgPower = data.reduce((sum, row) => sum + row.ActivePower_kW, 0) / totalRecords;
        const maxPower = Math.max(...data.map(row => row.ActivePower_kW));
        const minPower = Math.min(...data.map(row => row.ActivePower_kW));
        
        return {
            totalRecords,
            firstRecord: firstRecord.Time,
            lastRecord: lastRecord.Time,
            avgPower,
            maxPower,
            minPower,
            dateRange: viewMode === 'realtime' ? 'Today' : selectedDate
        };
    }, [data, viewMode, selectedDate]);

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.5 }}
            className="space-y-8"
        >
            {/* Data Summary Card */}
            {summaryStats && (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="bg-slate-800/40 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700 p-6"
                >
                    <h3 className="text-xl font-semibold text-white mb-4">
                        Data Summary - {summaryStats.dateRange}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div>
                            <div className="text-2xl font-bold text-white">{summaryStats.totalRecords}</div>
                            <div className="text-slate-400">Total Records</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-white">
                                {formatTooltipTime(summaryStats.firstRecord).split(' ')[1] || 'N/A'}
                            </div>
                            <div className="text-slate-400">First Record</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-white">
                                {formatTooltipTime(summaryStats.lastRecord).split(' ')[1] || 'N/A'}
                            </div>
                            <div className="text-slate-400">Last Record</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-white">
                                {summaryStats.avgPower.toFixed(3)} kW
                            </div>
                            <div className="text-slate-400">Avg Power</div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Key Metrics Cards */}
            {latest && (
                <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
                >
                    <MetricCard title="Active Power" value={latest.ActivePower_kW} unit="kW" icon={Zap} />
                    <MetricCard title="Voltage" value={latest.Voltage_V} unit="V" icon={Activity} />
                    <MetricCard title="Current" value={latest.Current_A} unit="A" icon={TrendingUp} />
                    <MetricCard title="Total Cost" value={latest.Cost_cum_BDT} unit="BDT" icon={DollarSign} />
                </motion.div>
            )}

            {/* Enhanced Charts */}
            <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
                <EnhancedTimeVsVoltageChart 
                    data={data} 
                    onEnlarge={() => onChartEnlarge('voltage', 'Voltage Over Time')} // Fixed call
                />
                <EnhancedTimeVsCurrentChart 
                    data={data} 
                    onEnlarge={() => onChartEnlarge('current', 'Current Over Time')} // Fixed call
                />
            </motion.div>

            <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="grid grid-cols-1"
            >
                <EnhancedTimeVsActivePowerChart 
                    data={data} 
                    onEnlarge={() => onChartEnlarge('power', 'Active Power Over Time')} // Fixed call
                />
            </motion.div>

            {/* Additional Chart Section */}
            <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
                <FrequencyOverTimeChart 
                    data={data} 
                    onEnlarge={() => onChartEnlarge('frequency', 'Frequency Over Time')}
                />
                <PowerFactorChart 
                    data={data} 
                    onEnlarge={() => onChartEnlarge('powerFactor', 'Power Factor Analysis')}
                />
            </motion.div>

            {/* Data Quality Indicator */}
            {data.length === 0 && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-slate-800/40 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700 p-8 text-center"
                >
                    <div className="text-gray-400 text-lg">
                        No data available for {viewMode === 'realtime' ? 'today' : selectedDate}
                    </div>
                    <div className="text-sm text-gray-500 mt-2">
                        Please check your data source or try a different date.
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
};

// Enhanced MetricCard with proper typing and icon support
const MetricCard = ({ 
    title, 
    value, 
    unit, 
    icon: Icon 
}: { 
    title: string; 
    value: number; 
    unit: string; 
    icon: React.ElementType; 
}) => (
    <motion.div 
        whileHover={{ scale: 1.02 }}
        className="bg-slate-800/40 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700 p-6 hover:border-slate-600 transition-colors"
    >
        <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400">{title}</p>
            <Icon className="h-6 w-6 text-slate-500" />
        </div>
        <div className="text-4xl font-bold text-white mt-2">
            {value.toFixed(value < 10 ? 3 : 2)}
            <span className="text-2xl text-gray-400 ml-2">{unit}</span>
        </div>
    </motion.div>
);

// Basic chart components (since the enhanced ones might not exist yet)
const EnhancedTimeVsVoltageChart = ({ data, onEnlarge }: { data: EnergyDataRow[], onEnlarge?: () => void }) => (
    <div className="bg-slate-800/40 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700 p-6 relative group">
        <div className="flex justify-between items-center mb-4">
            <div>
                <h3 className="text-lg font-semibold text-white">Voltage Over Time</h3>
                <p className="text-sm text-slate-400">Real-time voltage monitoring (V)</p>
            </div>
            {onEnlarge && (
                <button 
                    onClick={onEnlarge}
                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg"
                >
                    <Activity className="h-4 w-4" />
                </button>
            )}
        </div>
        <div className="h-64 flex items-center justify-center bg-slate-700/20 rounded-lg">
            <div className="text-slate-400">Voltage Chart - {data.length} data points</div>
        </div>
    </div>
);

const EnhancedTimeVsCurrentChart = ({ data, onEnlarge }: { data: EnergyDataRow[], onEnlarge?: () => void }) => (
    <div className="bg-slate-800/40 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700 p-6 relative group">
        <div className="flex justify-between items-center mb-4">
            <div>
                <h3 className="text-lg font-semibold text-white">Current Over Time</h3>
                <p className="text-sm text-slate-400">Real-time current monitoring (A)</p>
            </div>
            {onEnlarge && (
                <button 
                    onClick={onEnlarge}
                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg"
                >
                    <Activity className="h-4 w-4" />
                </button>
            )}
        </div>
        <div className="h-64 flex items-center justify-center bg-slate-700/20 rounded-lg">
            <div className="text-slate-400">Current Chart - {data.length} data points</div>
        </div>
    </div>
);

const EnhancedTimeVsActivePowerChart = ({ data, onEnlarge }: { data: EnergyDataRow[], onEnlarge?: () => void }) => (
    <div className="bg-slate-800/40 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700 p-6 relative group">
        <div className="flex justify-between items-center mb-4">
            <div>
                <h3 className="text-lg font-semibold text-white">Active Power Over Time</h3>
                <p className="text-sm text-slate-400">Real-time power consumption (kW)</p>
            </div>
            {onEnlarge && (
                <button 
                    onClick={onEnlarge}
                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg"
                >
                    <Activity className="h-4 w-4" />
                </button>
            )}
        </div>
        <div className="h-64 flex items-center justify-center bg-slate-700/20 rounded-lg">
            <div className="text-slate-400">Power Chart - {data.length} data points</div>
        </div>
    </div>
);

const FrequencyOverTimeChart = ({ data, onEnlarge }: { data: EnergyDataRow[], onEnlarge?: () => void }) => (
    <div className="bg-slate-800/40 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700 p-6 relative group">
        <div className="flex justify-between items-center mb-4">
            <div>
                <h3 className="text-lg font-semibold text-white">Frequency Over Time</h3>
                <p className="text-sm text-slate-400">Power grid frequency stability (Hz)</p>
            </div>
            {onEnlarge && (
                <button 
                    onClick={onEnlarge}
                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg"
                >
                    <Activity className="h-4 w-4" />
                </button>
            )}
        </div>
        <div className="h-64 flex items-center justify-center bg-slate-700/20 rounded-lg">
            <div className="text-slate-400">Frequency Chart - {data.length} data points</div>
        </div>
    </div>
);

const PowerFactorChart = ({ data, onEnlarge }: { data: EnergyDataRow[], onEnlarge?: () => void }) => (
    <div className="bg-slate-800/40 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700 p-6 relative group">
        <div className="flex justify-between items-center mb-4">
            <div>
                <h3 className="text-lg font-semibold text-white">Power Factor Analysis</h3>
                <p className="text-sm text-slate-400">Efficiency metrics</p>
            </div>
            {onEnlarge && (
                <button 
                    onClick={onEnlarge}
                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg"
                >
                    <Activity className="h-4 w-4" />
                </button>
            )}
        </div>
        <div className="h-64 flex items-center justify-center bg-slate-700/20 rounded-lg">
            <div className="text-slate-400">Power Factor Chart - {data.length} data points</div>
        </div>
    </div>
);

export default EnhancedDashboardPage;
