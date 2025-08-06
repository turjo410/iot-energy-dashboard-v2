// components/charts/AdvancedPowerChart.tsx
import React from 'react';
import { Group } from '@visx/group';
import { LinePath, AreaClosed } from '@visx/shape';
import { scaleTime, scaleLinear } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { GridRows, GridColumns } from '@visx/grid';
import { withTooltip, TooltipWithBounds, WithTooltipProvidedProps } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { curveMonotoneX } from '@visx/curve';
import { EnergyDataRow } from '../../store/energyStore';

// ✅ FIX: Proper interface with explicit tooltipData typing
interface ChartProps {
  data: EnergyDataRow[];
  width: number;
  height: number;
}

// ✅ FIX: Combined props type
type AdvancedPowerChartProps = ChartProps & WithTooltipProvidedProps<EnergyDataRow>;

const margin = { top: 20, right: 20, bottom: 40, left: 60 };

// ✅ FIX: Component with explicit typing for tooltipData
const AdvancedPowerChartBase = ({
  data,
  width,
  height,
  tooltipData,
  tooltipLeft,
  tooltipTop,
  showTooltip,
  hideTooltip
}: AdvancedPowerChartProps) => {
  // Handle empty data
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ width, height }}>
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  const xMax = width - margin.left - margin.right;
  const yMax = height - margin.top - margin.bottom;

  // Scales
  const timeScale = scaleTime({
    range: [0, xMax],
    domain: [new Date(data[0]?.Time), new Date(data[data.length - 1]?.Time)],
  });

  const powerScale = scaleLinear({
    range: [yMax, 0],
    domain: [0, Math.max(...data.map(d => d.ActivePower_kW))],
    nice: true,
  });

  // Mouse event handler
  const handleTooltip = React.useCallback(
    (event: React.TouchEvent<SVGRectElement> | React.MouseEvent<SVGRectElement>) => {
      const { x } = localPoint(event) || { x: 0 };
      const x0 = timeScale.invert(x - margin.left);
      
      // Find closest data point
      const bisectDate = (data: EnergyDataRow[], x0: Date) => {
        let left = 0;
        let right = data.length - 1;
        
        while (left < right) {
          const mid = Math.floor((left + right) / 2);
          if (new Date(data[mid].Time) < x0) {
            left = mid + 1;
          } else {
            right = mid;
          }
        }
        return left;
      };
      
      const index = bisectDate(data, x0);
      const d = data[Math.max(0, Math.min(data.length - 1, index))];
      
      if (d) {
        showTooltip({
          tooltipData: d,
          tooltipLeft: timeScale(new Date(d.Time)) + margin.left,
          tooltipTop: powerScale(d.ActivePower_kW) + margin.top,
        });
      }
    },
    [data, timeScale, powerScale, showTooltip]
  );

  return (
    <div className="relative">
      <svg width={width} height={height}>
        <Group left={margin.left} top={margin.top}>
          {/* Grid */}
          <GridRows 
            scale={powerScale} 
            width={xMax} 
            strokeDasharray="2,2" 
            stroke="#374151" 
            strokeOpacity={0.3}
          />
          <GridColumns 
            scale={timeScale} 
            height={yMax} 
            strokeDasharray="2,2" 
            stroke="#374151" 
            strokeOpacity={0.3}
          />
          
          {/* Area fill */}
          <AreaClosed
            data={data}
            x={(d: EnergyDataRow) => timeScale(new Date(d.Time))}
            y={(d: EnergyDataRow) => powerScale(d.ActivePower_kW)}
            yScale={powerScale}
            strokeWidth={0}
            stroke="transparent"
            fill="url(#power-gradient)"
            curve={curveMonotoneX}
          />
          
          {/* Line path */}
          <LinePath
            data={data}
            x={(d: EnergyDataRow) => timeScale(new Date(d.Time))}
            y={(d: EnergyDataRow) => powerScale(d.ActivePower_kW)}
            stroke="#3b82f6"
            strokeWidth={2}
            curve={curveMonotoneX}
          />
          
          {/* Axes */}
          <AxisBottom 
            top={yMax} 
            scale={timeScale} 
            stroke="#9CA3AF"
            tickStroke="#9CA3AF"
            tickLabelProps={{
              fill: '#9CA3AF',
              fontSize: 11,
              textAnchor: 'middle',
            }}
          />
          <AxisLeft 
            scale={powerScale} 
            stroke="#9CA3AF"
            tickStroke="#9CA3AF"
            tickLabelProps={{
              fill: '#9CA3AF',
              fontSize: 11,
              textAnchor: 'end',
            }}
            label="Power (kW)"
            labelProps={{
              fill: '#9CA3AF',
              textAnchor: 'middle',
              fontSize: 12,
            }}
          />

          {/* Invisible overlay for mouse events */}
          <rect
            x={0}
            y={0}
            width={xMax}
            height={yMax}
            fill="transparent"
            onTouchStart={handleTooltip}
            onTouchMove={handleTooltip}
            onMouseMove={handleTooltip}
            onMouseLeave={() => hideTooltip()}
          />
        </Group>
        
        {/* Gradient definitions */}
        <defs>
          <linearGradient id="power-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
      </svg>
      
      {/* ✅ FIX: Proper type guard and property access */}
      {tooltipData && (
        <TooltipWithBounds top={tooltipTop} left={tooltipLeft}>
          <div className="bg-gray-900/95 backdrop-blur text-white p-3 rounded-lg shadow-xl border border-gray-700">
            <div className="text-xs text-gray-300 mb-1">
              {new Date(tooltipData.Time).toLocaleString()}
            </div>
            <div className="font-semibold text-blue-400">
              {tooltipData.ActivePower_kW.toFixed(3)} kW
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Voltage: {tooltipData.Voltage_V.toFixed(1)}V
            </div>
            <div className="text-xs text-gray-400">
              Current: {tooltipData.Current_A.toFixed(3)}A
            </div>
          </div>
        </TooltipWithBounds>
      )}
    </div>
  );
};

// ✅ FIX: Properly typed withTooltip HOC
const AdvancedPowerChart = withTooltip<ChartProps, EnergyDataRow>(AdvancedPowerChartBase);

export default AdvancedPowerChart;
