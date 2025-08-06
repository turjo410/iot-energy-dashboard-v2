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
        // Add your actual values here
        this.sheetId = '19XYljUtDynGo5K_1P91lT0pq8jRL-xvNILhiRPAR2tA'; // Replace with your sheet ID
        this.apiKey = 'AIzaSyB--11q8sOLlEzCgNndwKbjZkoFgaZUzzc';   // Replace with your API key
    }

    // Direct API call to Google Sheets
    private async fetchFromGoogleSheets(): Promise<{ values: string[][] } | null> {
        try {
            console.log('🔄 Fetching data directly from Google Sheets...');
            
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}/values/ProcessedData!A:O?key=${this.apiKey}&majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE`;
            
            const response = await fetch(url);
            
            if (!response.ok) {
                console.error('❌ API Error:', response.status, response.statusText);
                throw new Error(`Google Sheets API error: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('✅ Successfully fetched', data.values?.length || 0, 'rows');
            return data;
            
        } catch (error) {
            console.error('💥 Error fetching from Google Sheets:', error);
            return null;
        }
    }

    async getLatestData(): Promise<RealtimeEnergyData | null> {
        try {
            const data = await this.fetchFromGoogleSheets();
            
            if (!data || !data.values || data.values.length < 2) {
                console.warn('No data available from Google Sheets');
                return null;
            }
            
            const rows = data.values;
            const latestRow = rows[rows.length - 1]; // Get last row
            const energyData = this.parseRowToEnergyData(latestRow);
            
            // Check device status
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
            const data = await this.fetchFromGoogleSheets();
            
            if (!data || !data.values || data.values.length < 2) {
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
            console.log('📊 Loading all data...');
            const data = await this.fetchFromGoogleSheets();
            
            if (!data || !data.values || data.values.length < 2) {
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
            console.error('Error fetching all data:', error);
            return [];
        }
    }

    // Alias methods for compatibility
    async getAllData(): Promise<EnergyDataRow[]> {
        return this.getAllProcessedData();
    }

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
}

export const googleSheetsService = new GoogleSheetsService();
