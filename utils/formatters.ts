// utils/formatters.ts
export const formatChartTime = (timeStr: string) => {
    try {
        const date = new Date(timeStr);
        if (isNaN(date.getTime())) {
            return new Date(timeStr.replace(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})/, '$3-$1-$2T$4:$5:$6')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
        console.error('Error formatting time:', timeStr, error);
        return '';
    }
};

export const formatTooltipTime = (timeStr: string) => {
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

export const formatDateOnly = (timeStr: string) => {
    try {
        const date = new Date(timeStr);
        if (isNaN(date.getTime())) {
            return timeStr.split(' ')[0] || timeStr;
        }
        return date.toLocaleDateString();
    } catch (error) {
        return timeStr;
    }
};
