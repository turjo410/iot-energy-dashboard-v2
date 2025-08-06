// components/charts/EnhancedCharts.tsx
import React from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Maximize2 } from 'lucide-react';
import { formatChartTime, formatTooltipTime } from '../../utils/dateHelpers';
import { EnergyDataRow } from '../../services/googleSheetsService';

// Enhanced chart wrapper with proper date formatting
const EnhancedLineChart = ({ data, dataKey, title, description, color, onEnlarge }: {
    data: EnergyDataRow[];
    dataKey: string;
    title: string;
    description: string;
    color: string;
    onEnlarge?: () => void;
}) => (
    <div className="bg-slate-800/40 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700 p-6 relative group">
        <div className="flex justify-between items-center mb-4">
            <div>
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                <p className="text-sm text-slate-400">{description}</p>
            </div>
            {onEnlarge && (
                <button 
                    onClick={onEnlarge}
                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg"
                >
                    <Maximize2 className="h-4 w-4" />
                </button>
            )}
        </div>
        <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                <XAxis 
                    dataKey="Time" 
                    stroke="#9CA3AF" 
                    fontSize={10}
                    tickFormatter={formatChartTime}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                />
                <YAxis stroke="#9CA3AF" fontSize={10} />
                <Tooltip 
                    contentStyle={{ 
                        backgroundColor: 'rgba(31, 41, 55, 0.8)', 
                        border: '1px solid #4A5568', 
                        borderRadius: '12px', 
                        color: '#FFF' 
                    }}
                    labelFormatter={formatTooltipTime}
                />
                <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} />
            </LineChart>
        </ResponsiveContainer>
    </div>
);

// Export enhanced chart components
export const EnhancedTimeVsVoltageChart = ({ data, onEnlarge }: { data: EnergyDataRow[], onEnlarge?: () => void }) => (
    <EnhancedLineChart 
        data={data}
        dataKey="Voltage_V"
        title="Voltage Over Time"
        description="Real-time voltage monitoring (V)"
        color="#10b981"
        onEnlarge={onEnlarge}
    />
);

export const EnhancedTimeVsCurrentChart = ({ data, onEnlarge }: { data: EnergyDataRow[], onEnlarge?: () => void }) => (
    <EnhancedLineChart 
        data={data}
        dataKey="Current_A"
        title="Current Over Time"
        description="Real-time current monitoring (A)"
        color="#f59e0b"
        onEnlarge={onEnlarge}
    />
);

export const EnhancedTimeVsActivePowerChart = ({ data, onEnlarge }: { data: EnergyDataRow[], onEnlarge?: () => void }) => (
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
                    <Maximize2 className="h-4 w-4" />
                </button>
            )}
        </div>
        <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data}>
                <defs>
                    <linearGradient id="powerGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                <XAxis 
                    dataKey="Time" 
                    stroke="#9CA3AF" 
                    fontSize={10}
                    tickFormatter={formatChartTime}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                />
                <YAxis stroke="#9CA3AF" fontSize={10} />
                <Tooltip 
                    contentStyle={{ 
                        backgroundColor: 'rgba(31, 41, 55, 0.8)', 
                        border: '1px solid #4A5568', 
                        borderRadius: '12px', 
                        color: '#FFF' 
                    }}
                    labelFormatter={formatTooltipTime}
                />
                <Area type="monotone" dataKey="ActivePower_kW" stroke="#3b82f6" strokeWidth={2} fill="url(#powerGradient)" />
            </AreaChart>
        </ResponsiveContainer>
    </div>
);
