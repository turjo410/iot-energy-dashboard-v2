// utils/dateHelpers.ts

export const formatTooltipTime = (timeStr: string): string => {
    try {
        const date = new Date(timeStr);
        if (isNaN(date.getTime())) {
            return timeStr;
        }
        return date.toLocaleString();
    } catch (error) {
        return timeStr;
    }
};

export const getTodayDate = (): string => {
    return new Date().toISOString().split('T')[0];
};

export const extractDateFromTimestamp = (timestamp: string): string => {
    try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) {
            return timestamp.split(' ')[0] || timestamp;
        }
        return date.toISOString().split('T')[0];
    } catch (error) {
        return '';
    }
};

export const isDeviceOnline = (lastUpdateTime: string): boolean => {
    if (!lastUpdateTime) return false;
    
    try {
        const lastUpdate = new Date(lastUpdateTime);
        if (isNaN(lastUpdate.getTime())) return false;
        
        const now = new Date();
        const diffMinutes = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
        return diffMinutes <= 10; // Device is online if last update within 10 minutes
    } catch (error) {
        console.error('Error checking device online status:', error);
        return false;
    }
};

// **NEW FUNCTION**: Format time only for x-axis (shows "03:00", "04:00", etc.)
export const formatTimeOnly = (tickItem: string | number | Date): string => {
    try {
        const date = new Date(tickItem);
        if (isNaN(date.getTime())) {
            // Fallback for invalid dates
            return '-';
        }
        // Return time in HH:mm format (24-hour)
        return date.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false // Use 24-hour format
        });
    } catch (error) {
        return '-';
    }
};

// **UPDATED FUNCTION**: Better x-axis date formatting (fallback)
export const formatXAxisTime = (tickItem: string | number | Date): string => {
    try {
        const date = new Date(tickItem);
        if (isNaN(date.getTime())) {
            // Fallback: if it's a string, try to extract date part
            const dateStr = tickItem.toString();
            if (dateStr.includes(' ')) {
                return dateStr.split(' ')[0]; // Get date part
            }
            return dateStr.slice(0, 10); // First 10 characters
        }
        // Format as "7 Aug"
        return date.toLocaleDateString('en-GB', { 
            day: 'numeric', 
            month: 'short' 
        });
    } catch (error) {
        return tickItem ? tickItem.toString().slice(0, 10) : '';
    }
};

// **NEW FUNCTION**: Safe date parsing with multiple fallbacks
export const parseTimestamp = (timestamp: string | number | Date): Date => {
    try {
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) {
            return date;
        }
        
        // Try parsing as string with different formats
        const str = timestamp.toString();
        
        // Try ISO format first
        if (str.includes('T')) {
            const isoDate = new Date(str);
            if (!isNaN(isoDate.getTime())) return isoDate;
        }
        
        // Try space-separated format (YYYY-MM-DD HH:mm:ss)
        if (str.includes(' ')) {
            const spaceSeparated = new Date(str.replace(' ', 'T'));
            if (!isNaN(spaceSeparated.getTime())) return spaceSeparated;
        }
        
        // Return current time as fallback
        return new Date();
    } catch (error) {
        console.warn('Failed to parse timestamp:', timestamp, error);
        return new Date();
    }
};

// **NEW FUNCTION**: Format timestamp for display in tooltips
export const formatChartTooltipTime = (timestamp: string | number | Date): string => {
    try {
        const date = parseTimestamp(timestamp);
        return date.toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    } catch (error) {
        return timestamp.toString();
    }
};

// **NEW FUNCTION**: Check if timestamp is from today
export const isToday = (timestamp: string | number | Date): boolean => {
    try {
        const date = parseTimestamp(timestamp);
        const today = new Date();
        return date.toDateString() === today.toDateString();
    } catch (error) {
        return false;
    }
};

// **NEW FUNCTION**: Get relative time (e.g., "2 minutes ago")
export const getRelativeTime = (timestamp: string | number | Date): string => {
    try {
        const date = parseTimestamp(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        
        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
        
        return date.toLocaleDateString();
    } catch (error) {
        return 'unknown';
    }
};

// **NEW FUNCTION**: Format duration between two timestamps
export const formatDuration = (startTime: string | number | Date, endTime: string | number | Date): string => {
    try {
        const start = parseTimestamp(startTime);
        const end = parseTimestamp(endTime);
        const diffMs = end.getTime() - start.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        
        if (diffMins < 60) return `${diffMins}m`;
        return `${diffHours}h ${diffMins % 60}m`;
    } catch (error) {
        return '0m';
    }
};
