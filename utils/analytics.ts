// utils/analytics.ts
import { EnergyDataRow } from '../store/energyStore';

export class EnergyAnalytics {
  static calculateTrends(data: EnergyDataRow[]) {
    const recentData = data.slice(-48); // Last 48 readings (4 hours)
    
    const powerTrend = this.calculateLinearTrend(recentData.map(d => d.ActivePower_kW));
    const costProjection = this.projectDailyCost(recentData);
    const efficiencyScore = this.calculateEfficiencyScore(recentData);
    
    return {
      powerTrend: {
        direction: powerTrend > 0 ? 'increasing' : 'decreasing',
        rate: Math.abs(powerTrend),
        confidence: this.calculateConfidence(recentData)
      },
      costProjection: {
        daily: costProjection.daily,
        monthly: costProjection.monthly,
        savings: costProjection.potentialSavings
      },
      efficiencyScore,
      recommendations: this.generateRecommendations(recentData)
    };
  }

  // ✅ MISSING METHOD: projectDailyCost
  private static projectDailyCost(data: EnergyDataRow[]) {
    if (data.length === 0) {
      return { daily: 0, monthly: 0, potentialSavings: 0 };
    }

    // Calculate cost difference over the data period
    const startCost = data[0]?.Cost_cum_BDT || 0;
    const endCost = data[data.length - 1]?.Cost_cum_BDT || 0;
    const costDifference = endCost - startCost;

    // Calculate time span in hours (assuming 5-minute intervals)
    const intervalHours = (data.length * 5) / 60;

    // Project daily cost
    const dailyCost = intervalHours > 0 ? (costDifference / intervalHours) * 24 : 0;
    const monthlyCost = dailyCost * 30;
    const potentialSavings = dailyCost * 0.15; // Assume 15% potential savings

    return {
      daily: Math.max(0, dailyCost),
      monthly: Math.max(0, monthlyCost),
      potentialSavings: Math.max(0, potentialSavings)
    };
  }

  // ✅ MISSING METHOD: calculateEfficiencyScore
  private static calculateEfficiencyScore(data: EnergyDataRow[]): number {
    if (data.length === 0) return 0;

    // Calculate various efficiency metrics
    const avgPowerFactor = data.reduce((sum, d) => sum + d.PowerFactor, 0) / data.length;
    const avgVoltage = data.reduce((sum, d) => sum + d.Voltage_V, 0) / data.length;
    const compressorOnRatio = data.filter(d => d.Compressor_ON === 1).length / data.length;
    
    // Efficiency score calculation (0-100)
    let score = 0;
    
    // Power Factor Score (40% weight)
    score += (avgPowerFactor * 40);
    
    // Voltage Stability Score (30% weight) - ideal voltage is around 220V
    const voltageStability = Math.max(0, 1 - Math.abs(avgVoltage - 220) / 220);
    score += (voltageStability * 30);
    
    // Compressor Efficiency Score (30% weight) - lower duty cycle is better for efficiency
    const compressorEfficiency = Math.max(0, 1 - compressorOnRatio);
    score += (compressorEfficiency * 30);

    return Math.min(100, Math.max(0, score));
  }

  // ✅ MISSING METHOD: calculateConfidence
  private static calculateConfidence(data: EnergyDataRow[]): number {
    if (data.length < 10) return 0.3; // Low confidence for small datasets
    
    // Calculate variance in power readings to determine confidence
    const powers = data.map(d => d.ActivePower_kW);
    const avgPower = powers.reduce((sum, p) => sum + p, 0) / powers.length;
    const variance = powers.reduce((sum, p) => sum + Math.pow(p - avgPower, 2), 0) / powers.length;
    
    // Lower variance = higher confidence
    const confidence = Math.max(0.4, Math.min(0.95, 1 - (variance * 10)));
    return confidence;
  }

  private static calculateLinearTrend(values: number[]): number {
    const n = values.length;
    if (n < 2) return 0;
    
    const x = Array.from({ length: n }, (_, i) => i);
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const denominator = (n * sumXX - sumX * sumX);
    if (denominator === 0) return 0;
    
    return (n * sumXY - sumX * sumY) / denominator;
  }

  private static generateRecommendations(data: EnergyDataRow[]): string[] {
    const recommendations: string[] = [];
    
    if (data.length === 0) return recommendations;
    
    const avgPowerFactor = data.reduce((sum, d) => sum + d.PowerFactor, 0) / data.length;
    if (avgPowerFactor < 0.9) {
      recommendations.push("⚡ Consider power factor correction to improve efficiency and reduce costs");
    }
    
    const peakHours = data.filter(d => {
      const hour = new Date(d.Time).getHours();
      return hour >= 18 && hour <= 22; // 6 PM to 10 PM
    });
    
    if (peakHours.some(d => d.ActivePower_kW > 0.15)) {
      recommendations.push("🕐 Reduce usage during peak hours (6-10 PM) to save on electricity costs");
    }
    
    const avgVoltage = data.reduce((sum, d) => sum + d.Voltage_V, 0) / data.length;
    if (avgVoltage < 210 || avgVoltage > 230) {
      recommendations.push("⚠️ Voltage instability detected. Consider installing a voltage stabilizer");
    }
    
    const compressorDutyCycle = (data.filter(d => d.Compressor_ON === 1).length / data.length) * 100;
    if (compressorDutyCycle > 70) {
      recommendations.push("🌡️ High compressor activity detected. Check refrigerator temperature settings");
    }
    
    return recommendations;
  }

  // ✅ ADDITIONAL UTILITY METHODS
  static getEnergyInsights(data: EnergyDataRow[]): {
    totalConsumption: number;
    averagePower: number;
    peakPower: number;
    costPerKWh: number;
  } {
    if (data.length === 0) {
      return { totalConsumption: 0, averagePower: 0, peakPower: 0, costPerKWh: 0 };
    }

    const totalEnergy = data[data.length - 1]?.Energy_kWh || 0;
    const totalCost = data[data.length - 1]?.Cost_cum_BDT || 0;
    const averagePower = data.reduce((sum, d) => sum + d.ActivePower_kW, 0) / data.length;
    const peakPower = Math.max(...data.map(d => d.ActivePower_kW));
    const costPerKWh = totalEnergy > 0 ? totalCost / totalEnergy : 0;

    return {
      totalConsumption: totalEnergy,
      averagePower,
      peakPower,
      costPerKWh
    };
  }

  static detectAnomalies(data: EnergyDataRow[]): string[] {
    const anomalies: string[] = [];
    
    if (data.length < 10) return anomalies;

    // Detect voltage spikes/drops
    const voltages = data.map(d => d.Voltage_V);
    const avgVoltage = voltages.reduce((sum, v) => sum + v, 0) / voltages.length;
    
    voltages.forEach((voltage, index) => {
      if (Math.abs(voltage - avgVoltage) > 20) {
        anomalies.push(`⚠️ Voltage anomaly detected at ${data[index].Time}: ${voltage}V`);
      }
    });

    // Detect power spikes
    const powers = data.map(d => d.ActivePower_kW);
    const avgPower = powers.reduce((sum, p) => sum + p, 0) / powers.length;
    
    powers.forEach((power, index) => {
      if (power > avgPower * 2) {
        anomalies.push(`⚡ Power spike detected at ${data[index].Time}: ${power.toFixed(3)}kW`);
      }
    });

    return anomalies.slice(0, 5); // Return max 5 anomalies
  }
}
