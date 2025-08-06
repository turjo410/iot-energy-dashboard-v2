import { EnergyDataRow } from '../store/energyStore';
import { getTodayDate } from '../utils/dateHelpers';
import { googleSheetsService } from '../services/googleSheetsService';
import { RealtimeEnergyData } from '../services/googleSheetsService';
import { useState, useCallback } from 'react';
// services/googleSheetsService.ts
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

    async getLatestData(): Promise<RealtimeEnergyData | null> {
        try {
            if (!this.sheetId || !this.apiKey) {
                console.warn('Google Sheets credentials not found');
                return null;
            }

            const response = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}/values/ProcessedData!A:O?key=${this.apiKey}&majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE`
            );
            
            if (!response.ok) {
                console.error('Failed to fetch data:', response.status, response.statusText);
                return null;
            }
            
            const data = await response.json();
            const rows = data.values;
            
            if (rows && rows.length > 1) {
                const latestRow = rows[rows.length - 1];
                const energyData = this.parseRowToEnergyData(latestRow);
                
                const dataTime = new Date(energyData.Time);
                const now = new Date();
                const diffMinutes = (now.getTime() - dataTime.getTime()) / (1000 * 60);
                
                return {
                    ...energyData,
                    deviceStatus: diffMinutes <= 10 ? 'online' : 'offline',
                    lastUpdated: new Date().toISOString()
                };
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
                console.warn('Google Sheets credentials not available');
                return [];
            }

            const response = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}/values/ProcessedData!A:O?key=${this.apiKey}`
            );
            
            if (!response.ok) {
                console.error('Failed to fetch historical data:', response.status);
                return [];
            }
            
            const data = await response.json();
            const rows = data.values;
            
            if (rows && rows.length > 1) {
                const filteredData = rows.slice(1)
                    .map(row => this.parseRowToEnergyData(row))
                    .filter(row => {
                        const rowDate = new Date(row.Time).toISOString().split('T')[0];
                        return rowDate === selectedDate;
                    });
                
                console.log(`Found ${filteredData.length} records for ${selectedDate}`);
                return filteredData;
            }
            return [];
        } catch (error) {
            console.error('Error fetching historical data:', error);
            return [];
        }
    }

    async getAllData(): Promise<EnergyDataRow[]> {
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
