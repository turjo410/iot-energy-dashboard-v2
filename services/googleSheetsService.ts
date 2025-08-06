// services/googleSheetsService.ts
import { getTodayDate } from '../utils/dateHelpers';

export interface EnergyDataRow {
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

export interface RealtimeEnergyData extends EnergyDataRow {
    deviceStatus: 'online' | 'offline';
    lastUpdated: string;
}

class GoogleSheetsService {
    private sheetId: string;
    private apiKey: string;
    
    constructor() {
        this.sheetId = process.env.NEXT_PUBLIC_GOOGLE_SHEET_ID || '';
        this.apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '';
    }

    // Fetch JSON data from local file created by GitHub Actions
    private async fetchLocalData(): Promise<{ values: string[][] } | null> {
        try {
            const response = await fetch('./data/energy-data.json?' + Date.now());
            
            if (!response.ok) {
                console.warn('Local data file not available yet');
                return null;
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error loading local data:', error);
            return null;
        }
    }

    async getLatestData(): Promise<RealtimeEnergyData | null> {
        try {
            console.log('🔄 Fetching latest data from local file...');
            const data = await this.fetchLocalData();
            
            if (!data || !data.values || data.values.length < 2) {
                console.warn('No data available in local file');
                return null;
            }
            
            const rows = data.values;
            const latestRow = rows[rows.length - 1]; // Get last row (most recent)
            const energyData = this.parseRowToEnergyData(latestRow);
            
            // Check if device is online based on last update time
            const dataTime = new Date(energyData.Time);
            const now = new Date();
            const diffMinutes = (now.getTime() - dataTime.getTime()) / (1000 * 60);
            
            const realtimeData: RealtimeEnergyData = {
                ...energyData,
                deviceStatus: diffMinutes <= 10 ? 'online' : 'offline',
                lastUpdated: new Date().toISOString()
            };
            
            console.log('✅ Latest data loaded:', {
                time: energyData.Time,
                power: energyData.ActivePower_kW,
                status: realtimeData.deviceStatus
            });
            
            return realtimeData;
        } catch (error) {
            console.error('Error fetching latest data:', error);
            return null;
        }
    }

    async getHistoricalData(selectedDate: string): Promise<EnergyDataRow[]> {
        try {
            console.log(`📊 Loading historical data for ${selectedDate}...`);
            const data = await this.fetchLocalData();
            
            if (!data || !data.values || data.values.length < 2) {
                console.warn('No historical data available');
                return [];
            }
            
            const rows = data.values;
            const dataRows = rows.slice(1); // Skip header row
            
            const filteredData = dataRows
                .map(row => this.parseRowToEnergyData(row))
                .filter(row => {
                    const rowDate = new Date(row.Time).toISOString().split('T')[0];
                    return rowDate === selectedDate;
                })
                .sort((a, b) => new Date(a.Time).getTime() - new Date(b.Time).getTime());
            
            console.log(`✅ Found ${filteredData.length} records for ${selectedDate}`);
            return filteredData;
        } catch (error) {
            console.error('Error fetching historical data:', error);
            return [];
        }
    }

    async getAllProcessedData(): Promise<EnergyDataRow[]> {
        try {
            console.log('📊 Loading all processed data...');
            const data = await this.fetchLocalData();
            
            if (!data || !data.values || data.values.length < 2) {
                console.warn('No processed data available');
                return [];
            }
            
            const rows = data.values;
            const dataRows = rows.slice(1); // Skip header row
            
            const allData = dataRows
                .map(row => this.parseRowToEnergyData(row))
                .sort((a, b) => new Date(a.Time).getTime() - new Date(b.Time).getTime());
            
            console.log(`✅ Loaded ${allData.length} total records`);
            return allData;
        } catch (error) {
            console.error('Error fetching all processed data:', error);
            return [];
        }
    }

    // Alias for compatibility with existing code
    async getAllData(): Promise<EnergyDataRow[]> {
        return this.getAllProcessedData();
    }

    // Get today's data specifically
    async getTodayData(): Promise<EnergyDataRow[]> {
        const todayDate = getTodayDate();
        return this.getHistoricalData(todayDate);
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

    // Development/fallback method - returns sample data when JSON isn't available
    private getSampleData(): EnergyDataRow {
        return {
            Time: new Date().toISOString(),
            Voltage_V: 230,
            Frequency_Hz: 50,
            Current_A: 10.5,
            ActivePower_kW: 2.4,
            PowerFactor: 0.95,
            ApparentPower_kVA: 2.5,
            ReactivePower_kVAr: 0.75,
            Energy_kWh: 1234.5,
            Cost_cum_BDT: 456.78,
            PF_Class: 'Excellent',
            Compressor_ON: 1,
            'DutyCycle_%_24H': 75.2,
            Cycle_ID: 1
        };
    }
}

export const googleSheetsService = new GoogleSheetsService();
