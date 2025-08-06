// hooks/useRealtimeData.ts
import { useState, useEffect, useCallback } from 'react';
import { getTodayDate, isDeviceOnline } from '../utils/dateHelpers';

// ----------  Types used in this file  ----------
export interface RealtimeEnergyData {
  Time: string;
  ActivePower_kW: number;
  Solar_kW: number;
  Temperature: number;
  Humidity: number;
}

export interface EnergyDataRow extends RealtimeEnergyData {}

/* ----------  Helper to read the JSON cached by GitHub Actions ---------- */
async function fetchJson(): Promise<{ values: string[][] } | null> {
  try {
    const res = await fetch('./data/energy-data.json?' + Date.now()); // cache-buster
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  } catch (err) {
    console.error('Unable to load JSON file:', err);
    return null;
  }
}

/* ----------  Convert Google-Sheets style response to typed rows ---------- */
function rowsToObjects(sheet: { values: string[][] } | null): EnergyDataRow[] {
  if (!sheet || !sheet.values || sheet.values.length < 2) return [];
  const [header, ...rows] = sheet.values;
  const idx = (key: string) => header.indexOf(key);

  return rows.map(r => ({
    Time:           r[idx('Timestamp')]        ?? '',
    ActivePower_kW: parseFloat(r[idx('Energy Usage')]      ?? '0'),
    Solar_kW:       parseFloat(r[idx('Solar Generation')]  ?? '0'),
    Temperature:    parseFloat(r[idx('Temperature')]       ?? '0'),
    Humidity:       parseFloat(r[idx('Humidity')]          ?? '0')
  }));
}

/* ----------  Main React hook ---------- */
export const useRealtimeData = () => {
  const [currentData,     setCurrentData]     = useState<RealtimeEnergyData | null>(null);
  const [historicalData,  setHistoricalData]  = useState<EnergyDataRow[]>([]);
  const [allData,         setAllData]         = useState<EnergyDataRow[]>([]);
  const [todayData,       setTodayData]       = useState<EnergyDataRow[]>([]);
  const [isOnline,        setIsOnline]        = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [lastUpdateTime,  setLastUpdateTime]  = useState('');
  const [selectedDate,    setSelectedDate]    = useState(getTodayDate());

  /* ----------  Load & process the JSON once ---------- */
  const loadJsonFile = useCallback(async () => {
    const sheet = await fetchJson();
    const objects = rowsToObjects(sheet);

    setAllData(objects);
    setTodayData(objects.filter(r => r.Time.startsWith(getTodayDate())));
    setHistoricalData(objects.filter(r => r.Time.startsWith(selectedDate)));

    if (objects.length) {
      const latest = objects[objects.length - 1];
      setCurrentData(latest);
      setLastUpdateTime(latest.Time);
      setIsOnline(isDeviceOnline(latest.Time));
    }
  }, [selectedDate]);

  /* ----------  Public helpers ---------- */
  const refreshData = useCallback(() => loadJsonFile(), [loadJsonFile]);
  const loadHistoricalData = useCallback(
    (date: string) => {
      setSelectedDate(date);
      setHistoricalData(allData.filter(r => r.Time.startsWith(date)));
    },
    [allData]
  );

  /* ----------  Initial load + polling ---------- */
  useEffect(() => {
    setLoading(true);
    loadJsonFile().finally(() => setLoading(false));

    const poll = setInterval(loadJsonFile, 5 * 60_000); // every 5 min
    return () => clearInterval(poll);
  }, [loadJsonFile]);

  /* ----------  Device-online heartbeat ---------- */
  useEffect(() => {
    const hb = setInterval(() => {
      if (lastUpdateTime) setIsOnline(isDeviceOnline(lastUpdateTime));
    }, 60_000); // every min
    return () => clearInterval(hb);
  }, [lastUpdateTime]);

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
    refreshData,
    loadAllData:      loadJsonFile,
    loadTodayData:    loadJsonFile
  };
};
