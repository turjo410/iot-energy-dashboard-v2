// utils/exportUtils.ts
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { EnergyDataRow } from '../store/energyStore';

export class ExportUtils {
  static exportToPDF(data: EnergyDataRow[], title: string) {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text(title, 20, 20);
    
    // Add metadata
    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 40);
    doc.text(`Total Records: ${data.length}`, 20, 50);
    
    // Add table
    const tableData = data.map(row => [
      new Date(row.Time).toLocaleString(),
      row.ActivePower_kW.toFixed(3),
      row.Voltage_V.toFixed(1),
      row.Current_A.toFixed(3),
      row.Energy_kWh.toFixed(3),
      row.Cost_cum_BDT.toFixed(2)
    ]);
    
    (doc as any).autoTable({
      head: [['Time', 'Power (kW)', 'Voltage (V)', 'Current (A)', 'Energy (kWh)', 'Cost (BDT)']],
      body: tableData,
      startY: 60,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }
    });
    
    doc.save(`energy-report-${new Date().toISOString().split('T')[0]}.pdf`);
  }
  
  static exportToExcel(data: EnergyDataRow[], filename: string) {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Energy Data');
    XLSX.writeFile(wb, `${filename}.xlsx`);
  }
  
  static exportChart(chartElement: HTMLElement, filename: string) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Convert SVG to canvas and download
    const svg = chartElement.querySelector('svg');
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        
        const link = document.createElement('a');
        link.download = `${filename}.png`;
        link.href = canvas.toDataURL();
        link.click();
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    }
  }
}
