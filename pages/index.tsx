import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useInView, useScroll, useTransform } from 'framer-motion';
import {
    AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
    RadialBarChart, RadialBar, ScatterChart, Scatter, ZAxis, ComposedChart
} from 'recharts';
import {
    Zap, Home, BarChart2, DollarSign, Settings, Bell, User, Search,
    CheckCircle, Wifi, Activity, TrendingUp, AlertTriangle, Lightbulb,
    Cpu, Snowflake, Refrigerator, LayoutDashboard, ChevronRight, HardDrive, 
    MemoryStick, FilePieChart, Power, Quote, Target, BookOpen, BrainCircuit, 
    Scale, Globe, Shield, Leaf, Briefcase, Landmark, Video, Image as ImageIcon, 
    X, FileText, Sheet, Github, ArrowDown, Maximize2, Download, Calendar
} from 'lucide-react';
import CountUp from 'react-countup';
import Papa from 'papaparse';
import { useRouter } from 'next/router';
import { formatTooltipTime, getTodayDate } from '../utils/dateHelpers';
import { formatTimeOnly } from '../utils/dateHelpers';
import { formatChartTooltipTime } from '../utils/dateHelpers';

// Add these imports at the top of your index.tsx
const FORCE_ONLINE_STATUS = true; // Set to false when you want real status
// --- COMPLETE TYPE DEFINITIONS ---
interface EnergyDataRow {
    Time: string;
    Voltage_V: number;
    Frequency_Hz: number;
    Current_A: number;
    ActivePower_kW: number;
    PowerFactor: number;
    ApparentPower_kVA: number;
    ReactivePower_kVAr: number;
    Energy_kWh: number;
    Cost_cum_BDT: number;
    PF_Class: 'Excellent' | 'Good' | 'Poor' | 'Bad';
    Compressor_ON: number;
    'DutyCycle_%_24H': number;
    Cycle_ID: number;
    [key: string]: any;
}

interface RealtimeEnergyData extends EnergyDataRow {
    deviceStatus: 'online' | 'offline';
    lastUpdated: string;
}

interface Device {
    name: string;
    icon: React.ElementType;
    status: 'On' | 'Off';
    power: number;
    details: string;
    basePower: number;
}

interface FilterState {
    search: string;
    dateRange: { start: string; end: string };
    powerRange: { min: number; max: number };
    compressorStatus: 'all' | 'on' | 'off';
}

interface AnalyticsData {
    totalConsumption: number;
    averagePower: number;
    peakPower: number;
    totalCost: number;
    averageVoltage: number;
    averageCurrent: number;
    powerFactor: number;
    compressorDutyCycle: number;
    trends: {
        powerTrend: 'increasing' | 'decreasing' | 'stable';
        costTrend: 'increasing' | 'decreasing' | 'stable';
        efficiencyScore: number;
    };
}

// --- ENHANCED GOOGLE SHEETS SERVICE ---
class GoogleSheetsService {
    private sheetId: string;
    private apiKey: string;
    
    constructor() {
        this.sheetId = process.env.NEXT_PUBLIC_GOOGLE_SHEET_ID || '';
        this.apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '';
    }

    async getLatestData(): Promise<RealtimeEnergyData | null> {
        try {
            if (!this.sheetId || !this.apiKey) {
                console.warn('Google Sheets credentials not found, using CSV fallback');
                return null;
            }

            const response = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}/values/ProcessedData!A:O?key=${this.apiKey}&majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE`
            );
            
            if (!response.ok) throw new Error('Failed to fetch data');
            
            const data = await response.json();
            const rows = data.values;
            
            if (rows && rows.length > 1) {
                const latestRow = rows[rows.length - 1];
                return this.parseRowToRealtimeData(latestRow);
            }
            return null;
        } catch (error) {
            console.error('Error fetching latest data:', error);
            return null;
        }
    }

    async getHistoricalData(selectedDate: string): Promise<EnergyDataRow[]> {
        try {
            if (!this.sheetId || !this.apiKey) {
                return [];
            }

            const response = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}/values/ProcessedData!A:O?key=${this.apiKey}`
            );
            
            const data = await response.json();
            const rows = data.values;
            
            if (rows && rows.length > 1) {
                return rows.slice(1)
                    .map(row => this.parseRowToEnergyData(row))
                    .filter(row => row.Time.startsWith(selectedDate));
            }
            return [];
        } catch (error) {
            console.error('Error fetching historical data:', error);
            return [];
        }
    }

    async getAllProcessedData(): Promise<EnergyDataRow[]> {
        try {
            if (!this.sheetId || !this.apiKey) {
                return [];
            }

            const response = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}/values/ProcessedData!A:O?key=${this.apiKey}`
            );
            
            const data = await response.json();
            const rows = data.values;
            
            if (rows && rows.length > 1) {
                return rows.slice(1).map(row => this.parseRowToEnergyData(row));
            }
            return [];
        } catch (error) {
            console.error('Error fetching all processed data:', error);
            return [];
        }
    }

    private parseRowToRealtimeData(row: any[]): RealtimeEnergyData {
        const energyData = this.parseRowToEnergyData(row);
        const dataTime = new Date(row[0]);
        const now = new Date();
        const diffMinutes = (now.getTime() - dataTime.getTime()) / (1000 * 60);
        
        return {
            ...energyData,
            deviceStatus: diffMinutes <= 10 ? 'online' : 'offline',
            lastUpdated: new Date().toISOString()
        };
    }

    private parseRowToEnergyData(row: any[]): EnergyDataRow {
        return {
            Time: row[0] || '',
            Voltage_V: parseFloat(row[2]) || 0,
            Frequency_Hz: parseFloat(row[3]) || 0,
            Current_A: parseFloat(row[4]) || 0,
            ActivePower_kW: parseFloat(row[5]) || 0,
            PowerFactor: parseFloat(row[6]) || 0,
            ApparentPower_kVA: parseFloat(row[7]) || 0,
            ReactivePower_kVAr: parseFloat(row[8]) || 0,
            Energy_kWh: parseFloat(row[9]) || 0,
            Cost_cum_BDT: parseFloat(row[10]) || 0,
            PF_Class: this.getPFClass(parseFloat(row[6]) || 0),
            Compressor_ON: row[1] === 'ON' ? 1 : 0,
            'DutyCycle_%_24H': parseFloat(row[13]) || 0,
            Cycle_ID: parseInt(row[14]) || 0
        };
    }

    private getPFClass(pf: number): 'Excellent' | 'Good' | 'Poor' | 'Bad' {
        if (pf > 0.95) return 'Excellent';
        if (pf > 0.85) return 'Good';
        if (pf > 0.75) return 'Poor';
        return 'Bad';
    }
}

const googleSheetsService = new GoogleSheetsService();

// --- ENHANCED REAL-TIME DATA HOOK ---
const useRealtimeData = () => {
    const [currentData, setCurrentData] = useState<RealtimeEnergyData | null>(null);
    const [historicalData, setHistoricalData] = useState<EnergyDataRow[]>([]);
    const [allData, setAllData] = useState<EnergyDataRow[]>([]);
    const [isOnline, setIsOnline] = useState(true);
    const [loading, setLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    const fetchLatestData = useCallback(async () => {
        try {
            const data = await googleSheetsService.getLatestData();
            if (data) {
                setCurrentData(data);
                setIsOnline(data.deviceStatus === 'online');
                console.log('✅ Real-time data updated:', data.Time);
            } else {
                setIsOnline(false);
            }
        } catch (error) {
            console.error('Failed to fetch latest data:', error);
            setIsOnline(false);
        }
    }, []);

    const loadHistoricalData = useCallback(async (date: string) => {
        setLoading(true);
        try {
            const data = await googleSheetsService.getHistoricalData(date);
            setHistoricalData(data);
            setSelectedDate(date);
            console.log(`📊 Loaded ${data.length} records for ${date}`);
        } catch (error) {
            console.error('Failed to load historical data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadAllData = useCallback(async () => {
        try {
            const data = await googleSheetsService.getAllProcessedData();
            setAllData(data);
            console.log(`📊 Loaded ${data.length} total records`);
        } catch (error) {
            console.error('Failed to load all data:', error);
        }
    }, []);

    useEffect(() => {
        console.log('🚀 Starting real-time data service...');
        fetchLatestData();
        loadAllData();
        
        const interval = setInterval(() => {
            console.log('🔄 Polling for updates...');
            fetchLatestData();
        }, 30000); // Every 30 seconds

        return () => {
            console.log('🛑 Stopping real-time updates');
            clearInterval(interval);
        };
    }, [fetchLatestData, loadAllData]);

    return {
        currentData: isOnline ? currentData : { ...currentData, ActivePower_kW: 0, Current_A: 0 },
        historicalData,
        allData,
        isOnline,
        loading,
        selectedDate,
        loadHistoricalData,
        refreshData: fetchLatestData,
        loadAllData
    };
};

// --- ENHANCED CHART MODAL COMPONENT ---
const ChartModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    data: EnergyDataRow[];
    chartType: 'power' | 'voltage' | 'current' | 'cost' | 'powerFactor' | 'energy' | 'frequency' | 'apparent' | 'reactive';
    title: string;
}> = ({ isOpen, onClose, data, chartType, title }) => {
    const [showDataPoints, setShowDataPoints] = useState(false);
    const [chartStyle, setChartStyle] = useState<'area' | 'line' | 'bar'>('area');

    const getDataKey = () => {
        switch (chartType) {
            case 'power': return 'ActivePower_kW';
            case 'voltage': return 'Voltage_V';
            case 'current': return 'Current_A';
            case 'cost': return 'Cost_cum_BDT';
            case 'powerFactor': return 'PowerFactor';
            case 'energy': return 'Energy_kWh';
            case 'frequency': return 'Frequency_Hz';
            case 'apparent': return 'ApparentPower_kVA';
            case 'reactive': return 'ReactivePower_kVAr';
            default: return 'ActivePower_kW';
        }
    };

    const getColor = () => {
        switch (chartType) {
            case 'power': return '#3b82f6';
            case 'voltage': return '#10b981';
            case 'current': return '#f59e0b';
            case 'cost': return '#8b5cf6';
            case 'powerFactor': return '#ff7300';
            case 'energy': return '#00ff88';
            case 'frequency': return '#ef4444';
            case 'apparent': return '#06b6d4';
            case 'reactive': return '#f97316';
            default: return '#3b82f6';
        }
    };

    const getUnit = () => {
        switch (chartType) {
            case 'power': return 'kW';
            case 'voltage': return 'V';
            case 'current': return 'A';
            case 'cost': return 'BDT';
            case 'powerFactor': return '';
            case 'energy': return 'kWh';
            case 'frequency': return 'Hz';
            case 'apparent': return 'kVA';
            case 'reactive': return 'kVAr';
            default: return '';
        }
    };

    const exportChart = () => {
        const csvContent = data.map(row => 
            `${row.Time},${row[getDataKey() as keyof EnergyDataRow]}`
        ).join('\n');
        
        const blob = new Blob([`Time,${getDataKey()}\n${csvContent}`], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${chartType}-data-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const renderChart = () => {
        const commonProps = {
            data: data,
            margin: { top: 20, right: 30, left: 20, bottom: 60 }
        };

        switch (chartStyle) {
            case 'line':
                return (
                    <LineChart {...commonProps}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
<XAxis 
                    dataKey="Time" 
                    stroke="#9CA3AF" 
                    fontSize={10}
                />
                <YAxis stroke="#9CA3AF" fontSize={10} domain={['dataMin - 0.1', 'dataMax + 0.1']} />
                <Tooltip 
                    contentStyle={{ 
                        backgroundColor: 'rgba(31, 41, 55, 0.8)', 
                        border: '1px solid #4A5568', 
                        borderRadius: '12px', 
                        color: '#FFF' 
                    }}
                />
                        <Line 
                            type="monotone" 
                            dataKey={getDataKey()} 
                            stroke={getColor()} 
                            strokeWidth={2}
                            dot={showDataPoints ? { fill: getColor(), r: 3 } : false}
                        />
                    </LineChart>
                );
            case 'bar':
                return (
                    <BarChart {...commonProps}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
                    dataKey="Time" 
                    stroke="#9CA3AF" 
                    fontSize={10}
                />
                <YAxis stroke="#9CA3AF" fontSize={10} domain={['dataMin - 0.1', 'dataMax + 0.1']} />
                <Tooltip 
                    contentStyle={{ 
                        backgroundColor: 'rgba(31, 41, 55, 0.8)', 
                        border: '1px solid #4A5568', 
                        borderRadius: '12px', 
                        color: '#FFF' 
                    }}
                />
                        <Bar dataKey={getDataKey()} fill={getColor()} />
                    </BarChart>
                );
            default: // area
                return (
                    <AreaChart {...commonProps}>
                        <defs>
                            <linearGradient id={`gradient-${chartType}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={getColor()} stopOpacity={0.3}/>
                                <stop offset="95%" stopColor={getColor()} stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
<XAxis 
                    dataKey="Time" 
                    stroke="#9CA3AF" 
                    fontSize={10}
                />
                <YAxis stroke="#9CA3AF" fontSize={10} domain={['dataMin - 0.1', 'dataMax + 0.1']} />
                <Tooltip 
                    contentStyle={{ 
                        backgroundColor: 'rgba(31, 41, 55, 0.8)', 
                        border: '1px solid #4A5568', 
                        borderRadius: '12px', 
                        color: '#FFF' 
                    }}
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
                );
        }
    };

    if (!isOpen) return null;

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
                            <div className="flex bg-slate-800 rounded-lg p-1">
                                {(['area', 'line', 'bar'] as const).map((style) => (
                                    <button
                                        key={style}
                                        onClick={() => setChartStyle(style)}
                                        className={`px-3 py-1 rounded-md text-sm transition-colors capitalize ${
                                            chartStyle === style 
                                                ? 'bg-blue-600 text-white' 
                                                : 'text-gray-400 hover:text-white'
                                        }`}
                                    >
                                        {style}
                                    </button>
                                ))}
                            </div>
                            
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
                            {renderChart()}
                        </ResponsiveContainer>
                    </div>

                    <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-white">
                                {data.length > 0 ? Math.max(...data.map(d => d[getDataKey() as keyof EnergyDataRow] as number)).toFixed(3) : '0'}
                            </div>
                            <div className="text-slate-400">Maximum {getUnit()}</div>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-white">
                                {data.length > 0 ? Math.min(...data.map(d => d[getDataKey() as keyof EnergyDataRow] as number)).toFixed(3) : '0'}
                            </div>
                            <div className="text-slate-400">Minimum {getUnit()}</div>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-white">
                                {data.length > 0 ? (data.reduce((sum, d) => sum + (d[getDataKey() as keyof EnergyDataRow] as number), 0) / data.length).toFixed(3) : '0'}
                            </div>
                            <div className="text-slate-400">Average {getUnit()}</div>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-white">{data.length}</div>
                            <div className="text-slate-400">Data Points</div>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-white">
                                {data.length > 0 ? (data.reduce((sum, d) => sum + (d[getDataKey() as keyof EnergyDataRow] as number), 0)).toFixed(3) : '0'}
                            </div>
                            <div className="text-slate-400">Total {getUnit()}</div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

// --- COMPARATIVE CHART COMPONENTS ---
const TimeVsVoltageChart = ({ data, onEnlarge }: { data: EnergyDataRow[], onEnlarge?: () => void }) => (
    <GlassmorphicCard className="relative group">
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
    tickFormatter={formatTimeOnly}  // Shows time like "03:00"
    tickCount={12}                  // Show maximum 12 ticks
    interval="preserveStartEnd"     // Show first, last, and evenly distributed
    minTickGap={20}                 // Minimum 20px gap between ticks
/>
                <YAxis stroke="#9CA3AF" fontSize={10} />
<Tooltip 
    labelFormatter={(time) => formatChartTooltipTime(time)}
/>
                <Line type="monotone" dataKey="Voltage_V" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
        </ResponsiveContainer>
    </GlassmorphicCard>
);

const TimeVsCurrentChart = ({ data, onEnlarge }: { data: EnergyDataRow[], onEnlarge?: () => void }) => (
    <GlassmorphicCard className="relative group">
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
    tickFormatter={formatTimeOnly}  // Shows time like "03:00"
    tickCount={12}                  // Show maximum 12 ticks
    interval="preserveStartEnd"     // Show first, last, and evenly distributed
    minTickGap={20}                 // Minimum 20px gap between ticks
/>

                <YAxis stroke="#9CA3AF" fontSize={10} />
<Tooltip 
    labelFormatter={(time) => formatChartTooltipTime(time)}
/>
                <Line type="monotone" dataKey="Current_A" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
        </ResponsiveContainer>
    </GlassmorphicCard>
);

const TimeVsActivePowerChart = ({ data, onEnlarge }: { data: EnergyDataRow[], onEnlarge?: () => void }) => (
    <GlassmorphicCard className="relative group">
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
                />
                <YAxis stroke="#9CA3AF" fontSize={10} domain={['dataMin - 0.1', 'dataMax + 0.1']} />
                <Tooltip 
                    contentStyle={{ 
                        backgroundColor: 'rgba(31, 41, 55, 0.8)', 
                        border: '1px solid #4A5568', 
                        borderRadius: '12px', 
                        color: '#FFF' 
                    }}
                />
                <Area type="monotone" dataKey="ActivePower_kW" stroke="#3b82f6" strokeWidth={2} fill="url(#powerGradient)" />
            </AreaChart>
        </ResponsiveContainer>
    </GlassmorphicCard>
);

const FrequencyOverTimeChart = ({ data, onEnlarge }: { data: EnergyDataRow[], onEnlarge?: () => void }) => (
    <GlassmorphicCard className="relative group">
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
                />
                <YAxis stroke="#9CA3AF" fontSize={10} domain={['dataMin - 0.1', 'dataMax + 0.1']} />
                <Tooltip 
                    contentStyle={{ 
                        backgroundColor: 'rgba(31, 41, 55, 0.8)', 
                        border: '1px solid #4A5568', 
                        borderRadius: '12px', 
                        color: '#FFF' 
                    }}
                />
                <Line type="monotone" dataKey="Frequency_Hz" stroke="#ef4444" strokeWidth={2} dot={false} />
            </LineChart>
        </ResponsiveContainer>
    </GlassmorphicCard>
);

const PowerComparisonChart = ({ data, onEnlarge }: { data: EnergyDataRow[], onEnlarge?: () => void }) => (
    <GlassmorphicCard className="relative group">
        <div className="flex justify-between items-center mb-4">
            <div>
                <h3 className="text-lg font-semibold text-white">Power Analysis Comparison</h3>
                <p className="text-sm text-slate-400">Active, Apparent & Reactive Power comparison</p>
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
        <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                <XAxis 
                    dataKey="Time" 
                    stroke="#9CA3AF" 
                    fontSize={10}
                />
                <YAxis stroke="#9CA3AF" fontSize={10} domain={['dataMin - 0.1', 'dataMax + 0.1']} />
                <Tooltip 
                    contentStyle={{ 
                        backgroundColor: 'rgba(31, 41, 55, 0.8)', 
                        border: '1px solid #4A5568', 
                        borderRadius: '12px', 
                        color: '#FFF' 
                    }}
                />
                <Legend />
                <Line type="monotone" dataKey="ActivePower_kW" stroke="#3b82f6" strokeWidth={2} name="Active Power (kW)" />
                <Line type="monotone" dataKey="ApparentPower_kVA" stroke="#06b6d4" strokeWidth={2} name="Apparent Power (kVA)" />
                <Line type="monotone" dataKey="ReactivePower_kVAr" stroke="#f97316" strokeWidth={2} name="Reactive Power (kVAr)" />
            </ComposedChart>
        </ResponsiveContainer>
    </GlassmorphicCard>
);

const EnergyVsCostChart = ({ data, onEnlarge }: { data: EnergyDataRow[], onEnlarge?: () => void }) => (
    <GlassmorphicCard className="relative group">
        <div className="flex justify-between items-center mb-4">
            <div>
                <h3 className="text-lg font-semibold text-white">Energy vs Cost Trends</h3>
                <p className="text-sm text-slate-400">Cumulative energy consumption and cost analysis</p>
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
        <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
<XAxis 
                    dataKey="Time" 
                    stroke="#9CA3AF" 
                    fontSize={10}
                />
                <YAxis stroke="#9CA3AF" fontSize={10} domain={['dataMin - 0.1', 'dataMax + 0.1']} />
                <Tooltip 
                    contentStyle={{ 
                        backgroundColor: 'rgba(31, 41, 55, 0.8)', 
                        border: '1px solid #4A5568', 
                        borderRadius: '12px', 
                        color: '#FFF' 
                    }}
                />
                <YAxis yAxisId="left" stroke="#9CA3AF" fontSize={10} />
                <YAxis yAxisId="right" orientation="right" stroke="#9CA3AF" fontSize={10} />
                <Tooltip 
                    contentStyle={{ 
                        backgroundColor: 'rgba(31, 41, 55, 0.8)', 
                        border: '1px solid #4A5568', 
                        borderRadius: '12px', 
                        color: '#FFF' 
                    }}
                />
                <Legend />
                <Area yAxisId="left" type="monotone" dataKey="Energy_kWh" fill="#00ff88" fillOpacity={0.3} stroke="#00ff88" name="Energy (kWh)" />
                <Line yAxisId="right" type="monotone" dataKey="Cost_cum_BDT" stroke="#8b5cf6" strokeWidth={2} name="Cost (BDT)" />
            </ComposedChart>
        </ResponsiveContainer>
    </GlassmorphicCard>
);

const PowerFactorEfficiencyChart = ({ data, onEnlarge }: { data: EnergyDataRow[], onEnlarge?: () => void }) => (
    <GlassmorphicCard className="relative group">
        <div className="flex justify-between items-center mb-4">
            <div>
                <h3 className="text-lg font-semibold text-white">Power Factor & Duty Cycle</h3>
                <p className="text-sm text-slate-400">Efficiency metrics and compressor duty cycle</p>
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
        <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
<XAxis 
    dataKey="Time" 
    tickFormatter={formatTimeOnly}  // Shows "03:00", "04:00", etc.
/>
                <YAxis yAxisId="left" stroke="#9CA3AF" fontSize={10} />
                <YAxis yAxisId="right" orientation="right" stroke="#9CA3AF" fontSize={10} />
                <Tooltip 
                    contentStyle={{ 
                        backgroundColor: 'rgba(31, 41, 55, 0.8)', 
                        border: '1px solid #4A5568', 
                        borderRadius: '12px', 
                        color: '#FFF' 
                    }}
                />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="PowerFactor" stroke="#ff7300" strokeWidth={2} name="Power Factor" />
                <Bar yAxisId="right" dataKey="DutyCycle_%_24H" fill="#fb923c" fillOpacity={0.6} name="Duty Cycle %" />
            </ComposedChart>
        </ResponsiveContainer>
    </GlassmorphicCard>
);

// --- MAIN APP COMPONENT ---
export default function App() {
    const [energyData, setEnergyData] = useState<EnergyDataRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isClient, setIsClient] = useState(false);
    const [enlargedChart, setEnlargedChart] = useState<{type: string, title: string} | null>(null);
    const router = useRouter(); 

    // Enhanced real-time data hook
    const { 
        currentData, 
        historicalData, 
        allData,
        isOnline, 
        loading, 
        selectedDate, 
        loadHistoricalData,
        refreshData,
        loadAllData
    } = useRealtimeData();
    
    const [viewMode, setViewMode] = useState<'realtime' | 'historical'>('realtime');

    // Fallback CSV loading (existing functionality)
    useEffect(() => {
        setIsClient(true);
        const csvPath = `${router.basePath}/data.csv`;

        Papa.parse(csvPath, {
            download: true,
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => {
                const sortedData = (results.data as EnergyDataRow[]).sort((a, b) => new Date(a.Time).getTime() - new Date(b.Time).getTime());
                setEnergyData(sortedData);
                setIsLoading(false);
            },
            error: (error: any) => {
                console.error("Error fetching or parsing CSV:", error);
                setIsLoading(false);
                alert("Could not load data.csv. Please ensure it's in the /public folder and the basePath in next.config.js is correct.");
            }
        });
    }, [router.basePath]);

    // Enhanced data display logic
    // REPLACE your current displayData useMemo with this:
const displayData = useMemo(() => {
    if (viewMode === 'realtime') {
        // For real-time, show recent data points for better visualization
        if (currentData) {
            return allData.length > 0 ? allData.slice(-50) : [currentData];
        } else {
            return energyData.length > 0 ? energyData.slice(-50) : [];
        }
    } else {
        // For historical, filter energyData by selected date
        return energyData.filter(row => {
            const rowDate = new Date(row.Time).toISOString().split('T')[0];
            return rowDate === selectedDate;
        });
    }
}, [viewMode, currentData, allData, energyData, selectedDate]); // Remove todayData and historicalData from dependencies


    const handleChartEnlarge = (chartType: string, title: string) => {
        setEnlargedChart({ type: chartType, title });
    };

    if (!isClient || (isLoading && displayData.length === 0)) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
                <div className="flex flex-col items-center">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                        <Zap className="h-16 w-16 text-blue-500" />
                    </motion.div>
                    <p className="mt-4 text-xl">Loading Energy Data...</p>
                    <p className="mt-2 text-sm text-slate-400">Connecting to Google Sheets...</p>
                </div>
            </div>
        );
    }

    return (
    <div className="min-h-screen bg-slate-900 text-gray-200 font-sans">
        <DashboardLayout 
            data={displayData}
            isOnline={FORCE_ONLINE_STATUS} // Force online status
            viewMode={viewMode}
            setViewMode={setViewMode}
            selectedDate={selectedDate}
            onDateChange={loadHistoricalData}
            onChartEnlarge={handleChartEnlarge}
            onRefresh={() => {
                refreshData();
                loadAllData();
            }}
        />
        
        {enlargedChart && (
            <ChartModal
                isOpen={!!enlargedChart}
                onClose={() => setEnlargedChart(null)}
                data={displayData}
                chartType={enlargedChart.type as any}
                title={enlargedChart.title}
            />
        )}
    </div>
);
}

// --- ENHANCED DASHBOARD LAYOUT ---
// In your DashboardLayout component, find this section and FIX it:
const DashboardLayout = ({ 
    data, 
    isOnline, 
    viewMode, 
    setViewMode, 
    selectedDate, 
    onDateChange, 
    onChartEnlarge,
    onRefresh
}: { 
    data: EnergyDataRow[], 
    isOnline: boolean,
    viewMode: 'realtime' | 'historical',
    setViewMode: (mode: 'realtime' | 'historical') => void,
    selectedDate: string,
    onDateChange: (date: string) => void,
    onChartEnlarge: (chart: {type: string, title: string}) => void,
    onRefresh?: () => void
}) => {
    const [activeTab, setActiveTab] = useState('dashboard');

    return (
        <div className="flex">
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isOnline={isOnline} />
            <div className="flex-1 flex flex-col h-screen">
                {/* ADD THIS MISSING HEADER */}
                {activeTab !== 'introduction' && (
                    <Header 
                        latestData={data[data.length - 1] || {} as EnergyDataRow} 
                        isOnline={isOnline}
                        viewMode={viewMode}
                        setViewMode={setViewMode}
                        selectedDate={selectedDate}
                        onDateChange={onDateChange}
                        onRefresh={onRefresh}
                        lastUpdateTime={data[data.length - 1]?.Time || ''}
                    />
                )}
                <main className={`flex-1 overflow-y-auto ${activeTab !== 'introduction' ? 'p-8' : ''} bg-slate-900`}>
                    <AnimatePresence mode="wait">
                        {activeTab === 'introduction' && <IntroductionPage key="introduction" onNavigate={() => setActiveTab('dashboard')} />}
                        {activeTab === 'dashboard' && <EnhancedDashboardPage key="dashboard" data={data} onChartEnlarge={onChartEnlarge} />}
                        {activeTab === 'analytics' && <AnalyticsPage key="analytics" data={data} onChartEnlarge={onChartEnlarge} />}
                        {activeTab === 'cost' && <CostPage key="cost" data={data} onChartEnlarge={onChartEnlarge} />}
                        {activeTab === 'devices' && <DevicesPage key="devices" data={data} />}
                        {activeTab === 'report' && <ReportPage key="report" data={data} />}
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
};


// --- SIDEBAR COMPONENT ---
const Sidebar = ({ activeTab, setActiveTab, isOnline }: { 
    activeTab: string, 
    setActiveTab: (tab: string) => void,
    isOnline: boolean
}) => {
    const navItems = [
        { id: 'introduction', name: 'Introduction', icon: BookOpen },
        { id: 'dashboard', name: 'Dashboard', icon: Home },
        { id: 'analytics', name: 'Analytics', icon: BrainCircuit },
        { id: 'cost', name: 'Cost', icon: DollarSign },
        { id: 'devices', name: 'Devices', icon: Settings },
        { id: 'report', name: 'Report', icon: FilePieChart }
    ];

    return (
        <motion.nav
            initial={{ x: -250 }} animate={{ x: 0 }}
            className="bg-slate-800/30 backdrop-blur-md w-64 shadow-2xl border-r border-slate-700 flex-shrink-0 h-screen flex flex-col p-6 z-20"
        >
            <div className="flex items-center mb-12">
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-3 rounded-xl shadow-lg"><Zap className="h-8 w-8 text-white" /></div>
                <h1 className="ml-3 text-2xl font-bold text-white">Energy-Profiling</h1>
            </div>
            <ul className="space-y-3">
                {navItems.map((item) => (
                    <motion.li key={item.id} whileHover={{ scale: 1.05 }}>
                        <button
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center px-4 py-3 rounded-lg transition-all duration-200 text-left relative ${activeTab === item.id ? 'text-white' : 'text-gray-400 hover:bg-slate-700/50 hover:text-white'}`}
                        >
                            {activeTab === item.id && <motion.div layoutId="active-nav-indicator" className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-full" />}
                            <item.icon className="h-5 w-5 mr-4 ml-2" />
                            <span className="font-medium">{item.name}</span>
                        </button>
                    </motion.li>
                ))}
            </ul>

<div className={`mt-auto p-4 rounded-xl border ${
    isOnline ? 'bg-slate-700/50 border-green-500/30' : 'bg-slate-700/50 border-red-500/30'
}`}>
    <div className="flex items-center mb-2">
        <CheckCircle className={`h-5 w-5 mr-2 ${isOnline ? 'text-green-400' : 'text-red-400'}`} />
        <span className={`font-semibold ${isOnline ? 'text-green-300' : 'text-red-300'}`}>
            {isOnline ? 'System Online' : 'System Offline'}
        </span>
    </div>
    <div className="flex items-center mt-2 text-xs">
        <Wifi className={`h-4 w-4 mr-1 ${isOnline ? 'text-green-400' : 'text-red-400'}`} />
        <span className={isOnline ? 'text-green-400' : 'text-red-400'}>
            Google Sheets: {isOnline ? 'Connected' : 'Disconnected'}
        </span>
    </div>
    <div className="mt-2 text-xs text-slate-400">
        Auto-refresh: Every 15s
    </div>
</div>

        </motion.nav>
    );
};

// --- ENHANCED HEADER COMPONENT ---
// Update the Header component to show last update time
const Header = ({ 
    latestData, 
    isOnline, 
    viewMode, 
    setViewMode, 
    selectedDate, 
    onDateChange,
    onRefresh,
    lastUpdateTime
}: {
    latestData: EnergyDataRow,
    isOnline: boolean,
    viewMode: 'realtime' | 'historical',
    setViewMode: (mode: 'realtime' | 'historical') => void,
    selectedDate: string,
    onDateChange: (date: string) => void,
    onRefresh?: () => void,
    lastUpdateTime?: string
}) => (
    <header className="bg-slate-800/30 backdrop-blur-md border-b border-slate-700 px-8 py-4 flex-shrink-0 z-10 sticky top-0">
        <div className="flex items-center justify-between">
            <div>
                <h2 className="text-2xl font-bold text-white">Energy Profiling Dashboard</h2>
                <div className="flex items-center gap-4 mt-1">
                    <p className="text-gray-400">Welcome back, Shahriar Khan!</p>
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                        isOnline ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                    }`}>
                        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'}`} />
                        {isOnline ? 'Device Online' : 'Device Offline'}
                    </div>
                    {lastUpdateTime && (
                        <div className="text-xs text-slate-400">
                            Last update: {formatTooltipTime(lastUpdateTime)}
                        </div>
                    )}
                </div>
            </div>
            
            <div className="flex items-center space-x-4">
                {/* View Mode Toggle */}
                <div className="flex bg-slate-800 rounded-lg p-1">
                    <button
                        onClick={() => setViewMode('realtime')}
                        className={`px-4 py-2 rounded-md text-sm transition-colors ${
                            viewMode === 'realtime' 
                                ? 'bg-blue-600 text-white' 
                                : 'text-gray-300 hover:text-white'
                        }`}
                    >
                        Real-time (Today)
                    </button>
                    <button
                        onClick={() => setViewMode('historical')}
                        className={`px-4 py-2 rounded-md text-sm transition-colors ${
                            viewMode === 'historical' 
                                ? 'bg-blue-600 text-white' 
                                : 'text-gray-300 hover:text-white'
                        }`}
                    >
                        Historical
                    </button>
                </div>

                {/* Date Picker for Historical Mode */}
                {viewMode === 'historical' && (
                    <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <input
                            type="date"
                            value={selectedDate}
                            min="2025-08-01"
                            max={getTodayDate()}
                            onChange={(e) => onDateChange(e.target.value)}
                            className="bg-slate-800 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
                        />
                    </div>
                )}

                {/* Refresh Button */}
                {onRefresh && (
                    <button 
                        onClick={onRefresh}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                    >
                        <Activity className="h-4 w-4" />
                        <span>Refresh</span>
                    </button>
                )}

                {/* External Links */}
                <div className="flex items-center space-x-2">
                    <a href="https://docs.google.com/document/d/1RrEcizQpjPvHIBKMyGJCPc7Ywqc4bi6Mdyh4JXvhsig/edit?usp=sharing" target="_blank" rel="noopener noreferrer" className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg font-medium">
                        <FileText className="h-5 w-5 mr-2" />
                        Report
                    </a>
                    <a href="https://docs.google.com/spreadsheets/d/19XYljUtDynGo5K_1P91lT0pq8jRL-xvNILhiRPAR2tA/edit?gid=347312691#gid=347312691" target="_blank" rel="noopener noreferrer" className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-lg font-medium">
                        <Sheet className="h-5 w-5 mr-2" />
                        Datasheet
                    </a>
                    <a href="https://github.com/turjo410/iot-energy-dashboard" target="_blank" rel="noopener noreferrer" className="flex items-center px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors shadow-lg font-medium">
                        <Github className="h-5 w-5 mr-2" />
                        GitHub
                    </a>
                </div>

                <div className="flex items-center space-x-2 border-l border-slate-600 pl-4">
                    <button className="p-2 rounded-lg hover:bg-slate-700 transition-colors"><Bell className="h-5 w-5 text-gray-400" /></button>
                    <button className="p-2 rounded-lg hover:bg-slate-700 transition-colors"><Search className="h-5 w-5 text-gray-400" /></button>
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-white" />
                    </div>
                </div>
            </div>
        </div>
    </header>
);



// --- ENHANCED DASHBOARD PAGE WITH MULTIPLE COMPARATIVE CHARTS ---
const EnhancedDashboardPage = ({ data, onChartEnlarge }: { 
    data: EnergyDataRow[], 
    onChartEnlarge: (chart: {type: string, title: string}) => void 
}) => {
    const latest = data.length > 0 ? data[data.length - 1] : {} as EnergyDataRow;
    
    return (
        <AnimatedPage>
            <div className="space-y-8">
                {/* Key Metrics Cards */}
                <AnimatedView>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <MetricCard title="Active Power" value={latest.ActivePower_kW || 0} unit="kW" icon={Zap} />
                        <MetricCard title="Voltage" value={latest.Voltage_V || 0} unit="V" icon={Activity} />
                        <MetricCard title="Current" value={latest.Current_A || 0} unit="A" icon={TrendingUp} />
                        <MetricCard title="Total Cost" value={latest.Cost_cum_BDT || 0} unit="BDT" icon={DollarSign} />
                    </div>
                </AnimatedView>

                {/* Live Gauges */}
                <AnimatedView>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <LiveGauge title="Average Wattage" value={(latest.ActivePower_kW || 0) * 1000} max={300} unit="W" color="#3b82f6" />
                        <LiveGauge title="Average Current" value={latest.Current_A || 0} max={2} unit="A" color="#10b981" />
                        <PowerFactorAnalysis data={data} />
                    </div>
                </AnimatedView>

                {/* Primary Comparative Charts */}
                <AnimatedView>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <TimeVsVoltageChart 
                            data={data} 
                            onEnlarge={() => onChartEnlarge({type: 'voltage', title: 'Voltage Over Time'})} 
                        />
                        <TimeVsCurrentChart 
                            data={data} 
                            onEnlarge={() => onChartEnlarge({type: 'current', title: 'Current Over Time'})} 
                        />
                    </div>
                </AnimatedView>

                {/* Active Power and Frequency */}
                <AnimatedView>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <TimeVsActivePowerChart 
                            data={data} 
                            onEnlarge={() => onChartEnlarge({type: 'power', title: 'Active Power Over Time'})} 
                        />
                        <FrequencyOverTimeChart 
                            data={data} 
                            onEnlarge={() => onChartEnlarge({type: 'frequency', title: 'Frequency Over Time'})} 
                        />
                    </div>
                </AnimatedView>

                {/* Power Analysis Comparison */}
                <AnimatedView>
                    <PowerComparisonChart 
                        data={data} 
                        onEnlarge={() => onChartEnlarge({type: 'apparent', title: 'Power Analysis Comparison'})} 
                    />
                </AnimatedView>

                {/* Advanced Analytics */}
                <AnimatedView>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <EnergyVsCostChart 
                            data={data} 
                            onEnlarge={() => onChartEnlarge({type: 'energy', title: 'Energy vs Cost Trends'})} 
                        />
                        <PowerFactorEfficiencyChart 
                            data={data} 
                            onEnlarge={() => onChartEnlarge({type: 'powerFactor', title: 'Power Factor & Efficiency'})} 
                        />
                    </div>
                </AnimatedView>

                {/* Traditional Dashboard Elements */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <PowerOverTimeChart 
                            data={data} 
                            onEnlarge={() => onChartEnlarge({type: 'power', title: 'Power Analysis'})}
                        />
                    </div>
                    <InsightCard quote="The peaks on this graph represent moments of high energy demand. Identifying these patterns is the first step toward optimizing usage and reducing costs." />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <CostAnalysisChart 
                            data={data}
                            onEnlarge={() => onChartEnlarge({type: 'cost', title: 'Cost Analysis'})}
                        />
                    </div>
                    <InsightCard quote="This cost analysis reveals the direct relationship between time and cumulative expense. Monitor these trends to optimize your energy budget." />
                </div>
            </div>
        </AnimatedPage>
    );
};

// --- ALL YOUR EXISTING PAGE COMPONENTS (KEPT INTACT) ---
const AnimatedPage = ({ children }: { children: React.ReactNode }) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5, ease: "easeInOut" }}>
        {children}
    </motion.div>
);

const IntroductionPage = ({ onNavigate }: { onNavigate: () => void }) => {
    const studentInfo = {
        name: "Shahriar Khan", id: "2022-3-60-016", course: "CSE407 - Green Computing",
        instructor: "Rashedul Amin Tuhin (RDA)", title: "IoT Based Real-Time Energy Profiling and Cost Analysis of a Refrigerator"
    };

    const containerVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.2, delayChildren: 0.3 } } };
    const itemVariants = { hidden: { y: 30, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { duration: 0.7, ease: "easeOut" } } };
    
    const scrollRef = useRef(null);
    const { scrollYProgress } = useScroll({ target: scrollRef, offset: ["start start", "end start"] });
    const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
    const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.9]);

    return (
        <AnimatedPage>
            <div ref={scrollRef}>
                <motion.div style={{ opacity: heroOpacity, scale: heroScale }} className="h-screen flex flex-col items-center justify-center text-center p-8 sticky top-0">
                    <div className="absolute inset-0 -z-10 h-full w-full bg-slate-900 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]">
                        <div className="absolute left-1/2 top-1/4 h-[60rem] w-[80rem] -translate-x-1/2 [mask-image:radial-gradient(closest-side,white,transparent)] bg-[radial-gradient(circle_at_50%_50%,#2563eb_0%,#1e3a8a_50%,transparent_100%)] opacity-20"></div>
                    </div>
                    <motion.p variants={itemVariants} className="text-4xl font-semibold leading-8 text-blue-400">{studentInfo.course}</motion.p>
                    <motion.h1 variants={itemVariants} className="mt-4 text-7xl font-bold tracking-tight text-white sm:text-7xl bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">{studentInfo.title}</motion.h1>
                    <motion.div variants={itemVariants} className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-x-16 gap-y-8">
                        <div className="text-left text-4xl"><p className="text-gray-300"><span className="font-semibold text-white">Submitted By:</span> {studentInfo.name}</p><p className="text-gray-300"><span className="font-semibold text-white">Student ID:</span> {studentInfo.id}</p></div>
                        <div className="text-left text-4xl"><p className="text-gray-300"><span className="font-semibold text-white">Submitted To:</span> {studentInfo.instructor}</p></div>
                    </motion.div>
                    <motion.div variants={itemVariants} className="absolute bottom-10 flex flex-col items-center space-y-2">
                        <span className="text-2xl font-bold text-gray-400">Scroll Down</span>
                        <motion.div
                            animate={{ y: [0, 10, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        >
                            <ArrowDown className="h-10 w-10 text-2xl text-gray-400" />
                        </motion.div>
                    </motion.div>
                </motion.div>

                <div className="relative z-10 bg-slate-900">
                    <InfoSection title="About The Project" icon={Target}>
                        This project, for the Green Computing course, demonstrates an end-to-end energy management system. Using IoT, it monitors a refrigerator's consumption, transforming raw data into actionable insights on a dynamic dashboard to promote energy efficiency and cost awareness.
                    </InfoSection>

                    <StickyHardwareSection
                        title="The IoT Device" name="TOMZN Wi-Fi Smart Meter 63A with TUYA APP"
                        imageUrl="https://img.drz.lazcdn.com/static/bd/p/af92c845f03cea3acefe999f63eba721.jpg_720x720q80.jpg_.webp"
                        specs={[
                            { icon: Zap, label: "Voltage Range", value: "AC80-400V" },
                            { icon: Activity, label: "Current Range", value: "1-63A" },
                            { icon: Wifi, label: "Connectivity", value: "2.4GHz Wi-Fi" },
                        ]}
                    >
                        The core of the system is the TOMZN Smart Meter. It measures critical electrical parameters like voltage, current, and active power, transmitting data wirelessly for real-time analysis.
                    </StickyHardwareSection>

                    <StickyHardwareSection
                        title="The Monitored Appliance" name="Sharp SJ-EX315E-SL 253 Liters Inverter Refrigerator"
                        imageUrl="https://www.startech.com.bd/image/cache/catalog/appliance/refrigerator/sj-ex315e-sl/sj-ex315e-sl-01-500x500.webp"
                        specs={[
                            { icon: Snowflake, label: "Type", value: "Direct Cool" },
                            { icon: HardDrive, label: "Capacity", value: "253 Liters" },
                            { icon: MemoryStick, label: "Compressor", value: "R600a" },
                        ]}
                        reverse
                    >
                        A standard household refrigerator was chosen for this study. Its cyclical consumption patterns serve as an excellent case study for identifying energy trends, duty cycles, and efficiency improvements.
                    </StickyHardwareSection>
                    
                    <ProjectGallery />

                    <div className="h-screen flex items-center justify-center flex-col text-center p-8">
                        <InfoSection title="Key Findings & Impact" icon={TrendingUp}>
                            This project proves low-cost IoT devices can yield valuable, high-resolution energy data. The analysis reveals distinct operational cycles, enabling precise calculation of duty cycles and energy costs, empowering users to reduce their carbon footprint and electricity bills.
                        </InfoSection>
                        <motion.button
                            onClick={onNavigate} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            className="bg-blue-600 text-white font-semibold py-4 px-8 rounded-lg hover:bg-blue-700 transition-all duration-300 shadow-lg hover:shadow-blue-500/50 flex items-center justify-center text-xl mx-auto mt-12"
                        >
                            Proceed to Dashboard <ChevronRight className="ml-2 h-6 w-6" />
                        </motion.button>
                    </div>
                </div>
            </div>
        </AnimatedPage>
    );
};

const AnalyticsPage = ({ data, onChartEnlarge }: { 
    data: EnergyDataRow[], 
    onChartEnlarge: (chart: {type: string, title: string}) => void 
}) => {
    const dutyCycle = data.length > 0 ? data[data.length - 1]['DutyCycle_%_24H'] : 0;
    const latestRecord = data.length > 0 ? data[data.length - 1] : null;
    const powerDistribution = latestRecord ? [
        { name: 'Active', value: latestRecord.ActivePower_kW, fill: '#10b981' },
        { name: 'Reactive', value: latestRecord.ReactivePower_kVAr, fill: '#f59e0b' },
        { name: 'Apparent', value: latestRecord.ApparentPower_kVA, fill: '#3b82f6' },
    ] : [];

    return (
        <AnimatedPage>
            <div className="space-y-8">
                <PageHeader title="Advanced Analytics" description="A deeper look into your energy consumption patterns." />
                <AnimatedView>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2"><CompressorCycleChart data={data} /></div>
                        <DutyCycleGauge value={dutyCycle} />
                    </div>
                </AnimatedView>
                <AnimatedView>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <PowerDistributionChart data={powerDistribution} />
                        <CurrentVsPowerChart data={data} />
                    </div>
                </AnimatedView>
            </div>
        </AnimatedPage>
    );
};

const CostPage = ({ data, onChartEnlarge }: { 
    data: EnergyDataRow[], 
    onChartEnlarge: (chart: {type: string, title: string}) => void 
}) => {
    const latest = data.length > 0 ? data[data.length - 1] : null;
    const totalCost = latest?.Cost_cum_BDT || 0;
    const totalKWh = latest?.Energy_kWh || 0;
    const avgCostPerKWh = totalKWh > 0 ? totalCost / totalKWh : 0;
    
    const tariffData = [
        { name: '0-75 kWh', rate: 5.26 }, { name: '76-200 kWh', rate: 7.20 },
        { name: '201-300 kWh', rate: 7.59 }, { name: '301-400 kWh', rate: 8.02 },
        { name: '401-600 kWh', rate: 12.67 }, { name: '601+ kWh', rate: 14.61 },
    ];

    return (
        <AnimatedPage>
            <div className="space-y-8">
                <PageHeader title="Cost Analysis" description="Detailed breakdown of your electricity expenses." />
                <AnimatedView>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <MetricCard title="Total Cumulative Cost" value={totalCost} unit="BDT" icon={DollarSign} />
                        <MetricCard title="Total Energy Used" value={totalKWh} unit="kWh" icon={Zap} />
                        <MetricCard title="Avg. Cost per kWh" value={avgCostPerKWh} unit="BDT" icon={Activity} />
                    </div>
                </AnimatedView>
                <AnimatedView>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <GlassmorphicCard>
                             <h3 className="text-xl font-semibold text-white mb-2">Bangladesh Tariff Structure</h3>
                             <p className="text-md text-slate-400 mb-4">Official residential electricity rates (2024).</p>
                             <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={tariffData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                                    <XAxis 
    dataKey="Time" 
    stroke="#9CA3AF" 
    fontSize={10}
    tickFormatter={formatTimeOnly}
    interval={Math.floor(data.length / 12)}  // Dynamic spacing based on data
    minTickGap={25}                          // Force minimum spacing
/>

                                    <YAxis type="category" dataKey="name" stroke="#9CA3AF" fontSize={10} width={80} />
                                    <Tooltip contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', border: '1px solid #4A5568', borderRadius: '12px', color: '#FFF' }} />
                                    <Bar dataKey="rate" fill="#8b5cf6" name="Rate (BDT/kWh)" />
                                </BarChart>
                             </ResponsiveContainer>
                        </GlassmorphicCard>
                        <GlassmorphicCard>
                            <h3 className="text-xl font-semibold text-white mb-2">Return on Investment (ROI)</h3>
                             <p className="text-md text-slate-400 mb-4">Financial viability of this IoT monitoring solution.</p>
                             <div className="space-y-4 text-slate-300 text-lg">
                                <p>This section analyzes the ROI. Based on the project manual, the payback period is calculated from hardware costs and potential savings.</p>
                                <p className="font-semibold text-white">Example Calculation:</p>
                                <ul className="list-disc list-inside text-md space-y-1">
                                    <li>Hardware Cost: 1,500 BDT</li>
                                    <li>Potential Monthly Savings: 10% of a 1000 BDT bill = 100 BDT</li>
                                    <li className="font-bold text-white">Payback Period: 1500 / 100 = 15 months</li>
                                </ul>
                             </div>
                        </GlassmorphicCard>
                    </div>
                </AnimatedView>
            </div>
        </AnimatedPage>
    );
};

const DevicesPage = ({ data }: { data: EnergyDataRow[] }) => {
    const fridgeData = data.length > 0 ? data[data.length - 1] : null;

    const initialDevices: Device[] = [
        { name: 'Refrigerator', icon: Refrigerator, status: 'On', power: fridgeData?.ActivePower_kW ?? 0, details: 'Main cooling unit, connected to IoT plug.', basePower: fridgeData?.ActivePower_kW ?? 0.150 },
        { name: 'Air Conditioner', icon: Snowflake, status: 'Off', power: 0, details: 'Living room AC unit, currently offline.', basePower: 1.2 },
        { name: 'Computer & Office', icon: Cpu, status: 'Off', power: 0, details: 'Workstation and peripherals, currently offline.', basePower: 0.250 },
    ];

    const [devices, setDevices] = useState<Device[]>(initialDevices);

    const handleToggle = (deviceName: string) => {
        setDevices(currentDevices =>
            currentDevices.map(device => {
                if (device.name === deviceName) {
                    const newStatus = device.status === 'On' ? 'Off' : 'On';
                    let newPower = (newStatus === 'On') ? device.basePower : 0;
                    return { ...device, status: newStatus, power: newPower };
                }
                return device;
            })
        );
    };

    return (
        <AnimatedPage>
            <PageHeader title="Device Management" description="Overview and control of connected appliances." />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {devices.map(device => (
                    <AnimatedView key={device.name}>
                        <GlassmorphicCard className={`border-l-4 ${device.status === 'On' ? 'border-green-500' : 'border-slate-600'}`}>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center">
                                    <device.icon className={`h-8 w-8 mr-4 ${device.status === 'On' ? 'text-green-400' : 'text-slate-500'}`} />
                                    <h3 className="text-xl font-bold text-white">{device.name}</h3>
                                </div>
                                <div className={`px-3 py-1 text-xs font-bold rounded-full ${device.status === 'On' ? 'bg-green-500/20 text-green-300' : 'bg-slate-600/50 text-slate-400'}`}>
                                    {device.status}
                                </div>
                            </div>
                            <p className="text-sm text-slate-400 mb-4 h-10">{device.details}</p>
                            <div className="flex items-center justify-between mt-4">
                                <div className="text-2xl font-semibold text-white">
                                    {device.power?.toFixed(3)} <span className="text-lg text-slate-400">kW</span>
                                </div>
                                 <button onClick={() => handleToggle(device.name)} className={`p-2 rounded-full transition-colors ${device.status === 'On' ? 'bg-green-500/30 hover:bg-green-500/50' : 'bg-slate-600/50 hover:bg-slate-600/80'}`}>
                                    <Power className={`h-6 w-6 ${device.status === 'On' ? 'text-green-300' : 'text-slate-400'}`} />
                                </button>
                            </div>
                        </GlassmorphicCard>
                    </AnimatedView>
                ))}
            </div>
        </AnimatedPage>
    );
};

const ReportPage = ({ data }: { data: EnergyDataRow[] }) => {
    const swot = {
        Strengths: ["Low-cost hardware", "Real-time data visualization", "High-resolution data capture"],
        Weaknesses: ["Dependent on Wi-Fi stability", "Single point of failure (smart plug)", "Requires technical setup"],
        Opportunities: ["Scalable to whole-home monitoring", "Integration with smart assistants", "Predictive maintenance using ML"],
        Threats: ["Data privacy and security concerns", "Competition from utility-provided solutions", "Hardware longevity issues"]
    };
     const pestle = [
        { title: 'Political', icon: Landmark, content: 'Government rebates or policies promoting energy efficiency can increase the value proposition of such monitoring systems.' },
        { title: 'Economic', icon: Briefcase, content: 'Rising electricity tariffs make the cost-saving aspect of this project highly relevant. It provides a clear path to reducing household expenses.' },
        { title: 'Social', icon: Globe, content: 'A growing societal awareness of climate change and carbon footprints drives interest in personal energy management tools.' },
        { title: 'Technological', icon: Cpu, content: 'The decreasing cost and increasing capability of IoT devices make this project feasible for a wide audience. Advances in cloud computing and data analysis enhance its power.' },
        { title: 'Legal', icon: Scale, content: 'Data privacy regulations (like GDPR) must be considered, especially if data is stored in the cloud. The user must have full control and ownership of their data.' },
        { title: 'Environmental', icon: Leaf, content: 'By providing actionable insights, this project directly contributes to green computing principles by enabling users to reduce energy waste and lower their environmental impact.' }
    ];
    const [openAccordion, setOpenAccordion] = useState<string | null>(pestle[0].title);

    return (
        <AnimatedPage>
            <PageHeader title="Project Report Analysis" description="A visual summary of the strategic analyses required for the project." />
            <div className="space-y-12">
                <AnimatedView>
                     <h2 className="text-4xl font-bold text-white mb-8 text-center">SWOT Analysis</h2>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <AnalysisCard title="Strengths" items={swot.Strengths} color="green" />
                        <AnalysisCard title="Weaknesses" items={swot.Weaknesses} color="yellow" />
                        <AnalysisCard title="Opportunities" items={swot.Opportunities} color="blue" />
                        <AnalysisCard title="Threats" items={swot.Threats} color="red" />
                     </div>
                </AnimatedView>
                <AnimatedView>
                     <h2 className="text-4xl font-bold text-white mb-8 text-center">PESTLE Analysis</h2>
                     <div className="space-y-4 max-w-4xl mx-auto">
                        {pestle.map(item => (
                            <AccordionItem 
                                key={item.title} title={item.title} icon={item.icon} content={item.content}
                                isOpen={openAccordion === item.title}
                                setOpen={() => setOpenAccordion(openAccordion === item.title ? null : item.title)}
                            />
                        ))}
                     </div>
                </AnimatedView>
                 <AnimatedView>
                    <GlassmorphicCard>
                        <h3 className="text-3xl font-bold text-white mb-4 text-center">Financial & Business Aspects</h3>
                        <p className="text-lg text-slate-300 text-center max-w-3xl mx-auto">
                            This IoT solution offers a strong business case by directly translating energy data into financial savings. For a typical household, identifying and mitigating appliance inefficiencies can lead to a 10-15% reduction in monthly electricity bills. For businesses, this scales up significantly, impacting operational costs and improving the bottom line. The value proposition is clear: a small, one-time hardware investment provides continuous, long-term returns through optimized energy consumption.
                        </p>
                    </GlassmorphicCard>
                </AnimatedView>
            </div>
        </AnimatedPage>
    );
};

// --- REUSABLE UI COMPONENTS ---
const AnimatedView = ({ children }: { children: React.ReactNode }) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, amount: 0.2 });
    return (
        <motion.div ref={ref} initial={{ opacity: 0, y: 50 }} animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 50 }} transition={{ duration: 0.6, ease: "easeOut" }} >
            {children}
        </motion.div>
    );
};

const GlassmorphicCard = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={`bg-slate-800/40 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700 p-6 ${className || ''}`}>
        {children}
    </div>
);

const PageHeader = ({ title, description }: { title: string, description: string }) => (
    <AnimatedView>
        <div className="mb-8">
            <h1 className="text-4xl font-bold text-white">{title}</h1>
            <p className="text-lg text-slate-400 mt-1">{description}</p>
        </div>
    </AnimatedView>
);

const MetricCard = ({ title, value, unit, icon: Icon }: { title: string, value: number, unit: string, icon: React.ElementType }) => (
    <GlassmorphicCard>
        <div className="flex items-center justify-between"><p className="text-gray-400">{title}</p><Icon className="h-6 w-6 text-slate-500" /></div>
        <div className="text-4xl font-bold text-white mt-2">
            <CountUp end={value || 0} duration={2} decimals={value < 10 ? 3 : 2} preserveValue />
            <span className="text-2xl text-gray-400 ml-2">{unit}</span>
        </div>
    </GlassmorphicCard>
);

const InfoSection = ({ title, icon: Icon, children }: { title: string, icon: React.ElementType, children: React.ReactNode }) => (
    <AnimatedView>
        <div className="mx-auto max-w-4xl text-center py-16">
            <div className="flex items-center justify-center gap-x-4 mb-6">
                <Icon className="h-12 w-12 text-blue-400" />
                <h2 className="text-5xl font-bold text-white">{title}</h2>
            </div>
            <p className="text-2xl text-gray-300">{children}</p>
        </div>
    </AnimatedView>
);

const StickyHardwareSection = ({ title, name, imageUrl, specs, children, reverse = false }: { title:string, name:string, imageUrl:string, specs: {icon: React.ElementType, label: string, value: string}[], children: React.ReactNode, reverse?: boolean}) => {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
    const imageY = useTransform(scrollYProgress, [0, 1], ['-10%', '10%']);

    return (
        <div ref={ref} className="h-[120vh] grid grid-cols-1 lg:grid-cols-2 lg:gap-x-16 items-center px-8 relative">
            <div className="absolute inset-0 -z-10 h-full w-full bg-slate-900 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>
            <motion.div style={{ y: imageY }} className={`h-[80vh] sticky top-[10vh] flex items-center justify-center ${reverse ? 'lg:order-last' : ''}`}>
                <img src={imageUrl} alt={name} className="max-h-full w-auto object-contain" />
            </motion.div>
            <div className={`flex flex-col justify-center ${reverse ? 'lg:order-first' : ''}`}>
                <p className="text-lg font-semibold leading-7 text-blue-500">{title}</p>
                <h3 className="mt-2 text-4xl font-bold tracking-tight text-white sm:text-6xl">{name}</h3>
                <p className="mt-6 text-xl text-gray-300">{children}</p>
                <dl className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 text-lg leading-7 text-gray-300">
                    {specs.map((spec) => (
                        <div key={spec.label} className="flex gap-x-4">
                            <dt className="flex-none"><spec.icon className="h-7 w-6 text-blue-400" aria-hidden="true" /></dt>
                            <dd>{spec.label}: <span className="font-semibold text-white">{spec.value}</span></dd>
                        </div>
                    ))}
                </dl>
            </div>
        </div>
    );
};

const ProjectGallery = () => {
    const [selectedMedia, setSelectedMedia] = useState<{src: string, type: string} | null>(null);
    const router = useRouter();
    
    const galleryItems = [
        { type: 'video', src: `${router.basePath}/gallery/video1.mp4`, thumbnail: 'https://placehold.co/600x800/1e293b/9ca3af?text=Project+Video+1' },
        { type: 'image', src: `${router.basePath}/gallery/image1.jpg`, thumbnail: `${router.basePath}/gallery/image1.jpg` },
        { type: 'image', src: `${router.basePath}/gallery/image2.jpg`, thumbnail: `${router.basePath}/gallery/image2.jpg` },
        { type: 'video', src: `${router.basePath}/gallery/video2.mp4`, thumbnail: 'https://placehold.co/600x800/1e293b/9ca3af?text=Project+Video+2' },
        { type: 'image', src: `${router.basePath}/gallery/image3.jpg`, thumbnail: `${router.basePath}/gallery/image3.jpg` },
    ];

    return (
        <InfoSection title="Project in Action" icon={ImageIcon}>
            <p className="mb-12">A collection of photos and videos showcasing the project setup and the dashboard in operation.</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {galleryItems.map((item, index) => (
                    <motion.div
                        key={index}
                        className="relative overflow-hidden rounded-xl shadow-lg group cursor-pointer aspect-[3/4]"
                        whileHover={{ scale: 1.03 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                        onClick={() => setSelectedMedia(item)}
                        layoutId={`gallery-item-${index}`}
                    >
                        <img src={item.thumbnail} alt={`Gallery item ${index + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            {item.type === 'video' ? <Video className="h-16 w-16 text-white" /> : <ImageIcon className="h-16 w-16 text-white" />}
                        </div>
                    </motion.div>
                ))}
            </div>
            <AnimatePresence>
                {selectedMedia && (
                    <motion.div
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
                        onClick={() => setSelectedMedia(null)}
                    >
                        {selectedMedia.type === 'image' ? (
                             <motion.img 
                                layoutId={`gallery-item-${galleryItems.findIndex(i => i.src === selectedMedia.src)}`} 
                                src={selectedMedia.src} 
                                className="max-w-[90vw] max-h-[90vh] rounded-lg" 
                            />
                        ) : (
                            <video 
                                src={selectedMedia.src} 
                                controls 
                                autoPlay 
                                className="max-w-[90vw] max-h-[90vh] rounded-lg" 
                                onClick={(e) => e.stopPropagation()} 
                            />
                        )}
                        <motion.button
                            initial={{ scale: 0 }} 
                            animate={{ scale: 1 }}
                            className="absolute top-4 right-4 p-2 bg-white/20 rounded-full"
                            onClick={() => setSelectedMedia(null)}
                        >
                            <X className="h-6 w-6 text-white" />
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>
        </InfoSection>
    );
};

const InsightCard = ({ quote }: { quote: string }) => (
    <GlassmorphicCard className="flex flex-col justify-center items-center text-center">
        <Quote className="h-12 w-12 text-blue-500 mb-4" />
        <p className="text-lg text-slate-300 italic">{quote}</p>
    </GlassmorphicCard>
);

const AnalysisCard = ({ title, items, color }: { title: string, items: string[], color: string }) => {
    const colors: { [key: string]: string } = {
        green: 'border-green-500 text-green-300', yellow: 'border-yellow-500 text-yellow-300',
        blue: 'border-blue-500 text-blue-300', red: 'border-red-500 text-red-300',
    };
    return (
        <div className={`bg-slate-800/50 p-8 rounded-xl border-t-4 ${colors[color]}`}>
            <h4 className={`text-3xl font-bold mb-4 ${colors[color]}`}>{title}</h4>
            <ul className="space-y-3 list-disc list-inside text-xl text-slate-200">
                {items.map(item => <li key={item}>{item}</li>)}
            </ul>
        </div>
    );
};

const AccordionItem = ({ title, icon: Icon, content, isOpen, setOpen }: { title:string, icon: React.ElementType, content:string, isOpen:boolean, setOpen:()=>void }) => (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700">
        <button onClick={setOpen} className="w-full flex justify-between items-center p-6 text-left">
            <div className="flex items-center">
                <Icon className="h-8 w-8 text-blue-400 mr-4" />
                <span className="text-2xl font-semibold text-white">{title}</span>
            </div>
            <motion.div animate={{ rotate: isOpen ? 90 : 0 }}><ChevronRight className="h-8 w-8 text-slate-400" /></motion.div>
        </button>
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: 'easeInOut' }}>
                    <p className="p-6 pt-0 text-xl text-slate-300">{content}</p>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
);

// --- CHART COMPONENTS ---
const LiveGauge = ({ title, value, max, unit, color }: { title: string, value: number, max: number, unit: string, color: string }) => (
    <GlassmorphicCard className="flex flex-col items-center justify-center">
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <ResponsiveContainer width="100%" height={150}>
            <RadialBarChart innerRadius="70%" outerRadius="100%" data={[{ value }]} startAngle={180} endAngle={0} barSize={20}>
                <RadialBar dataKey="value" cornerRadius={10} fill={color} background={{ fill: '#374151' }} />
                <text x="50%" y="75%" textAnchor="middle" dominantBaseline="middle" className="text-4xl font-bold fill-white">{value.toFixed(value > 10 ? 0 : 2)}</text>
                 <text x="50%" y="95%" textAnchor="middle" dominantBaseline="middle" className="text-lg font-semibold" fill={color}>{unit}</text>
            </RadialBarChart>
        </ResponsiveContainer>
    </GlassmorphicCard>
);

const PowerOverTimeChart = ({ data, onEnlarge }: { data: EnergyDataRow[], onEnlarge?: () => void }) => (
    <GlassmorphicCard className="h-full relative group">
        {onEnlarge && (
            <button 
                onClick={onEnlarge}
                className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg"
            >
                <Maximize2 className="h-4 w-4" />
            </button>
        )}
        <h3 className="text-lg font-semibold text-white mb-1">Active Power Over Time</h3>
        <p className="text-sm text-slate-400 mb-4">Tracks the real-time power consumption in kilowatts (kW).</p>
        <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
                <defs><linearGradient id="powerGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563eb" stopOpacity={0.4}/><stop offset="95%" stopColor="#2563eb" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                <XAxis 
    dataKey="Time" 
    stroke="#9CA3AF" 
    fontSize={10}
    tickFormatter={formatTimeOnly}
    interval={Math.floor(data.length / 12)}  // Dynamic spacing based on data
    minTickGap={25}                          // Force minimum spacing
/>

                <YAxis stroke="#9CA3AF" fontSize={10} domain={[0, 'dataMax + 0.1']} />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', border: '1px solid #4A5568', borderRadius: '12px', color: '#FFF' }} labelFormatter={(label) => new Date(label).toLocaleString()} />
                <Area type="monotone" dataKey="ActivePower_kW" stroke="#3b82f6" strokeWidth={2} fill="url(#powerGradient)" />
            </AreaChart>
        </ResponsiveContainer>
    </GlassmorphicCard>
);

const PowerFactorAnalysis = ({ data }: { data: EnergyDataRow[] }) => {
    const avgPF = data.length > 0 ? data.reduce((acc, d) => acc + d.PowerFactor, 0) / data.length : 0;
    const pfClass = avgPF > 0.95 ? 'Excellent' : avgPF > 0.9 ? 'Good' : 'Poor';
    const colorMap = { Excellent: '#10b981', Good: '#3b82f6', Poor: '#f59e0b' };

    return (
        <GlassmorphicCard className="h-full flex flex-col">
            <h3 className="text-lg font-semibold text-white mb-1">Power Factor Analysis</h3>
            <p className="text-sm text-slate-400 mb-2">Measures the efficiency of your power usage.</p>
             <ResponsiveContainer width="100%" height={200}>
                <RadialBarChart innerRadius="70%" outerRadius="100%" data={[{ value: avgPF * 100 }]} startAngle={90} endAngle={-270}>
                    <RadialBar dataKey="value" cornerRadius={10} fill={colorMap[pfClass]} background={{ fill: '#374151' }} />
                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-4xl font-bold fill-white">{avgPF.toFixed(2)}</text>
                     <text x="50%" y="65%" textAnchor="middle" dominantBaseline="middle" className="text-lg font-bold" fill={colorMap[pfClass]}>{pfClass}</text>
                </RadialBarChart>
            </ResponsiveContainer>
            <div className="mt-auto bg-slate-700/50 p-3 rounded-lg flex items-start">
                <Lightbulb className="h-5 w-5 text-yellow-300 mr-3 mt-1 flex-shrink-0" />
                <div>
                    <h4 className="font-semibold text-yellow-300">Analytics Tip</h4>
                    <p className="text-xs text-slate-300">A power factor below 0.95 may lead to higher utility bills. Improving it can lead to significant savings.</p>
                </div>
            </div>
        </GlassmorphicCard>
    );
};

const CostAnalysisChart = ({ data, onEnlarge }: { data: EnergyDataRow[], onEnlarge?: () => void }) => (
    <GlassmorphicCard className="relative group">
        {onEnlarge && (
            <button 
                onClick={onEnlarge}
                className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg"
            >
                <Maximize2 className="h-4 w-4" />
            </button>
        )}
        <h3 className="text-lg font-semibold text-white mb-1">Cumulative Cost Over Time</h3>
        <p className="text-sm text-slate-400 mb-4">Shows the total electricity cost in BDT accumulating over the dataset period.</p>
        <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                <XAxis dataKey="Time" stroke="#9CA3AF" fontSize={10} tickFormatter={(time) => new Date(time).toLocaleDateString([], { month: 'short', day: 'numeric' })} />
                <YAxis stroke="#9CA3AF" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', border: '1px solid #4A5568', borderRadius: '12px', color: '#FFF' }} labelFormatter={(label) => new Date(label).toLocaleString()} />
                <Bar dataKey="Cost_cum_BDT" fill="#8b5cf6" />
            </BarChart>
        </ResponsiveContainer>
    </GlassmorphicCard>
);

const CompressorCycleChart = ({ data }: { data: EnergyDataRow[] }) => (
    <GlassmorphicCard>
        <h3 className="text-lg font-semibold text-white mb-1">Compressor On/Off Cycles</h3>
        <p className="text-sm text-slate-400 mb-4">Visualizes the refrigerator's compressor activity, key to understanding its consumption pattern.</p>
        <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                <XAxis dataKey="Time" stroke="#9CA3AF" fontSize={10} tickFormatter={(time) => new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} />
                <YAxis tickCount={2} stroke="#9CA3AF" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', border: '1px solid #4A5568', borderRadius: '12px', color: '#FFF' }} />
                <Area type="step" dataKey="Compressor_ON" stroke="#fb923c" fill="#fb923c" fillOpacity={0.3} name="Compressor Status" />
            </AreaChart>
        </ResponsiveContainer>
    </GlassmorphicCard>
);

const DutyCycleGauge = ({ value }: { value: number }) => (
    <GlassmorphicCard className="flex flex-col items-center justify-center">
        <h3 className="text-lg font-semibold text-white mb-2">24H Duty Cycle</h3>
        <p className="text-sm text-slate-400 mb-4 text-center">The percentage of time the compressor was active.</p>
        <ResponsiveContainer width="100%" height={150}>
            <RadialBarChart innerRadius="70%" outerRadius="100%" data={[{ value }]} startAngle={180} endAngle={0} barSize={20}>
                <RadialBar dataKey="value" cornerRadius={10} fill="#fb923c" background={{ fill: '#374151' }} />
                <text x="50%" y="75%" textAnchor="middle" dominantBaseline="middle" className="text-4xl font-bold fill-white">
                    {value.toFixed(1)}%
                </text>
            </RadialBarChart>
        </ResponsiveContainer>
    </GlassmorphicCard>
);

const PowerDistributionChart = ({ data }: { data: { name: string, value: number, fill: string }[] }) => (
    <GlassmorphicCard>
        <h3 className="text-lg font-semibold text-white mb-1">Power Type Distribution</h3>
        <p className="text-sm text-slate-400 mb-4">Breakdown of the different power components in your system. Active power is the useful power, while reactive power is required by inductive loads.</p>
        <ResponsiveContainer width="100%" height={300}>
            <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} fill="#8884d8">
                    {data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', border: '1px solid #4A5568', borderRadius: '12px', color: '#FFF' }} />
                <Legend />
            </PieChart>
        </ResponsiveContainer>
    </GlassmorphicCard>
);

const CurrentVsPowerChart = ({ data }: { data: EnergyDataRow[] }) => (
    <GlassmorphicCard>
        <h3 className="text-lg font-semibold text-white mb-1">Current vs. Power Correlation</h3>
        <p className="text-sm text-slate-400 mb-4">This scatter plot shows the direct relationship between current drawn (Amps) and the active power consumed (kW).</p>
        <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
                 <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                 <XAxis type="number" dataKey="Current_A" name="Current" unit="A" stroke="#9CA3AF" fontSize={10} />
                 <YAxis type="number" dataKey="ActivePower_kW" name="Active Power" unit="kW" stroke="#9CA3AF" fontSize={10} />
                 <ZAxis type="number" range={[10, 200]} />
                 <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', border: '1px solid #4A5568', borderRadius: '12px', color: '#FFF' }} />
                 <Scatter data={data} fill="#8b5cf6" opacity={0.6} shape="circle" />
            </ScatterChart>
        </ResponsiveContainer>
    </GlassmorphicCard>
);

