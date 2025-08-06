// hooks/useRealtimeData.ts
import { useState, useEffect, useCallback } from 'react';
import { googleSheetsService, EnergyDataRow, RealtimeEnergyData } from '../services/googleSheetsService';
import { isDeviceOnline, getTodayDate } from '../utils/dateHelpers';

export const useRealtimeData = () => {
    const [currentData, setCurrentData] = useState<RealtimeEnergyData | null>(null);
    const [historicalData, setHistoricalData] = useState<EnergyDataRow[]>([]);
    const [allData, setAllData] = useState<EnergyDataRow[]>([]);
    const [todayData, setTodayData] = useState<EnergyDataRow[]>([]);
    const [isOnline, setIsOnline] = useState(false);
    const [loading, setLoading] = useState(false);
    const [lastUpdateTime, setLastUpdateTime] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState(getTodayDate());

    // In your useRealtimeData hook, update the fetchLatestData function:
const fetchLatestData = useCallback(async () => {
    try {
        const data = await googleSheetsService.getLatestData();
        if (data) {
            setCurrentData(data);
            
            // Fix: Better online detection logic
            const dataTime = new Date(data.Time);
            const now = new Date();
            const diffMinutes = (now.getTime() - dataTime.getTime()) / (1000 * 60);
            const deviceOnline = diffMinutes <= 10; // 10 minutes threshold
            
            setIsOnline(deviceOnline);
            console.log('✅ Real-time data updated:', data.Time, 'Device Online:', deviceOnline);
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
        setSelectedDate(date);
        
        try {
            console.log(`📊 Loading historical data for ${date}...`);
            const data = await googleSheetsService.getHistoricalData(date);
            setHistoricalData(data);
            console.log(`✅ Loaded ${data.length} historical records for ${date}`);
        } catch (error) {
            console.error('Failed to load historical data:', error);
            setHistoricalData([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadTodayData = useCallback(async () => {
        try {
            console.log('📊 Loading today\'s data...');
            const data = await googleSheetsService.getTodayData();
            setTodayData(data);
            console.log(`✅ Loaded ${data.length} records for today`);
        } catch (error) {
            console.error('Failed to load today data:', error);
            setTodayData([]);
        }
    }, []);

    const loadAllData = useCallback(async () => {
        try {
            console.log('📊 Loading all data...');
            const data = await googleSheetsService.getAllProcessedData();
            setAllData(data);
            console.log(`✅ Loaded ${data.length} total records`);
        } catch (error) {
            console.error('Failed to load all data:', error);
            setAllData([]);
        }
    }, []);

    // Check device status periodically
    const checkDeviceStatus = useCallback(() => {
        if (lastUpdateTime) {
            const deviceOnline = isDeviceOnline(lastUpdateTime);
            setIsOnline(deviceOnline);
            console.log(`🔍 Device status check: ${deviceOnline ? 'Online' : 'Offline'}`);
        }
    }, [lastUpdateTime]);

    // Initial data load and periodic updates
    useEffect(() => {
        console.log('🚀 Starting real-time data service...');
        
        // Initial load
        fetchLatestData();
        loadAllData();
        loadTodayData();
        
        // Set up polling intervals
        const dataInterval = setInterval(() => {
            console.log('🔄 Polling for new data...');
            fetchLatestData();
            loadTodayData(); // Refresh today's data
        }, 30000); // Every 30 seconds

        const statusInterval = setInterval(checkDeviceStatus, 60000); // Every minute

        return () => {
            console.log('🛑 Stopping real-time updates');
            clearInterval(dataInterval);
            clearInterval(statusInterval);
        };
    }, [fetchLatestData, loadAllData, loadTodayData, checkDeviceStatus]);

    return {
        currentData,
        historicalData,
        allData,
        todayData,
        isOnline,
        loading,
        selectedDate,
        lastUpdateTime,
        loadHistoricalData,
        refreshData: fetchLatestData,
        loadAllData,
        loadTodayData
    };
};
