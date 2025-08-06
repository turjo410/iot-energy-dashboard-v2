// store/energyStore.ts
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// --- MISSING TYPE DEFINITIONS ---
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

// --- ENERGY ANALYTICS UTILITY CLASS ---
class EnergyAnalytics {
  static calculateTrends(data: EnergyDataRow[]): AnalyticsData {
    if (data.length === 0) {
      return {
        totalConsumption: 0,
        averagePower: 0,
        peakPower: 0,
        totalCost: 0,
        averageVoltage: 0,
        averageCurrent: 0,
        powerFactor: 0,
        compressorDutyCycle: 0,
        trends: {
          powerTrend: 'stable',
          costTrend: 'stable',
          efficiencyScore: 0
        }
      };
    }

    // Calculate basic statistics
    const totalConsumption = data.reduce((sum, item) => sum + item.Energy_kWh, 0);
    const averagePower = data.reduce((sum, item) => sum + item.ActivePower_kW, 0) / data.length;
    const peakPower = Math.max(...data.map(item => item.ActivePower_kW));
    const totalCost = data[data.length - 1]?.Cost_cum_BDT || 0;
    const averageVoltage = data.reduce((sum, item) => sum + item.Voltage_V, 0) / data.length;
    const averageCurrent = data.reduce((sum, item) => sum + item.Current_A, 0) / data.length;
    const powerFactor = data.reduce((sum, item) => sum + item.PowerFactor, 0) / data.length;
    
    // Calculate compressor duty cycle
    const compressorOnCount = data.filter(item => item.Compressor_ON === 1).length;
    const compressorDutyCycle = (compressorOnCount / data.length) * 100;

    // Calculate trends (simple implementation)
    const midpoint = Math.floor(data.length / 2);
    const firstHalfAvgPower = data.slice(0, midpoint).reduce((sum, item) => sum + item.ActivePower_kW, 0) / midpoint;
    const secondHalfAvgPower = data.slice(midpoint).reduce((sum, item) => sum + item.ActivePower_kW, 0) / (data.length - midpoint);
    
    const powerTrend = secondHalfAvgPower > firstHalfAvgPower * 1.05 ? 'increasing' : 
                      secondHalfAvgPower < firstHalfAvgPower * 0.95 ? 'decreasing' : 'stable';

    const firstHalfCost = data[midpoint - 1]?.Cost_cum_BDT || 0;
    const lastCost = data[data.length - 1]?.Cost_cum_BDT || 0;
    const costTrend = lastCost > firstHalfCost * 1.1 ? 'increasing' : 
                     lastCost < firstHalfCost * 0.9 ? 'decreasing' : 'stable';

    // Calculate efficiency score (0-100)
    const efficiencyScore = Math.min(100, Math.max(0, 
      (powerFactor * 50) + // Power factor contributes 50%
      ((1 - (compressorDutyCycle / 100)) * 30) + // Lower duty cycle is better (30%)
      ((averageVoltage > 220 ? 20 : 10)) // Stable voltage (20%)
    ));

    return {
      totalConsumption,
      averagePower,
      peakPower,
      totalCost,
      averageVoltage,
      averageCurrent,
      powerFactor,
      compressorDutyCycle,
      trends: {
        powerTrend,
        costTrend,
        efficiencyScore
      }
    };
  }

  static getInsights(data: EnergyDataRow[]): string[] {
    const analytics = this.calculateTrends(data);
    const insights: string[] = [];

    if (analytics.powerFactor < 0.85) {
      insights.push("⚠️ Low power factor detected. Consider power factor correction to reduce costs.");
    }

    if (analytics.compressorDutyCycle > 80) {
      insights.push("🌡️ High compressor duty cycle. Check refrigerator temperature settings.");
    }

    if (analytics.trends.efficiencyScore < 60) {
      insights.push("📉 Energy efficiency could be improved. Consider maintenance or upgrades.");
    }

    if (analytics.trends.powerTrend === 'increasing') {
      insights.push("📈 Power consumption is trending upward. Monitor usage patterns.");
    }

    return insights;
  }
}

// --- ZUSTAND STORE INTERFACE ---
interface EnergyStore {
  data: EnergyDataRow[];
  isLoading: boolean;
  error: string | null;
  filters: FilterState;
  theme: 'light' | 'dark';
  
  // Actions
  setData: (data: EnergyDataRow[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateFilters: (filters: Partial<FilterState>) => void;
  toggleTheme: () => void;
  
  // Computed values
  filteredData: EnergyDataRow[];
  analytics: AnalyticsData;
  insights: string[];
}

// --- ZUSTAND STORE IMPLEMENTATION ---
export const useEnergyStore = create<EnergyStore>()(
  subscribeWithSelector((set, get) => ({
    data: [],
    isLoading: false,
    error: null,
    filters: {
      search: '',
      dateRange: { start: '', end: '' },
      powerRange: { min: 0, max: 1 },
      compressorStatus: 'all'
    },
    theme: 'dark',
    
    setData: (data) => set({ data }),
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),
    updateFilters: (newFilters) => set((state) => ({ 
      filters: { ...state.filters, ...newFilters } 
    })),
    toggleTheme: () => set((state) => ({ 
      theme: state.theme === 'light' ? 'dark' : 'light' 
    })),
    
    get filteredData() {
      const { data, filters } = get();
      return data.filter(item => {
        // Search filter
        if (filters.search && !item.Time.toLowerCase().includes(filters.search.toLowerCase())) {
          return false;
        }
        
        // Date range filter
        if (filters.dateRange.start && item.Time < filters.dateRange.start) {
          return false;
        }
        if (filters.dateRange.end && item.Time > filters.dateRange.end) {
          return false;
        }
        
        // Power range filter
        if (item.ActivePower_kW < filters.powerRange.min || item.ActivePower_kW > filters.powerRange.max) {
          return false;
        }
        
        // Compressor status filter
        if (filters.compressorStatus !== 'all') {
          const isOn = Boolean(item.Compressor_ON);
          if ((filters.compressorStatus === 'on') !== isOn) {
            return false;
          }
        }
        
        return true;
      });
    },
    
    get analytics() {
      const { filteredData } = get();
      return EnergyAnalytics.calculateTrends(filteredData);
    },

    get insights() {
      const { filteredData } = get();
      return EnergyAnalytics.getInsights(filteredData);
    }
  }))
);

// --- EXPORT TYPES FOR USE IN OTHER FILES ---
export type { EnergyDataRow, FilterState, AnalyticsData };
