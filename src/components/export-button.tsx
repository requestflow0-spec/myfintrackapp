"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { format } from "date-fns"

interface ExportButtonProps {
  data: any[];
  filename?: string;
}

export function ExportButton({ data, filename = "export" }: ExportButtonProps) {
  const handleExport = () => {
    if (!data || data.length === 0) return;

    // Get all unique keys from the data to act as columns
    const keys = Array.from(new Set(data.flatMap(item => Object.keys(item))));
    
    // Create CSV header row
    const csvRows = [keys.join(',')];
    
    // Create rows for the data
    for (const row of data) {
      const values = keys.map(key => {
        const val = row[key];
        // Handle special characters and stringify properly
        if (val === null || val === undefined) {
          return '""';
        }
        
        let stringValue = String(val);
        // Handle firestore timestamps specifically if passed
        if (typeof val === 'object' && val.seconds) {
           stringValue = format(new Date(val.seconds * 1000), 'yyyy-MM-dd HH:mm:ss');
        }

        // Escape quotes
        stringValue = stringValue.replace(/"/g, '""');
        return `"${stringValue}"`;
      });
      csvRows.push(values.join(','));
    }
    
    const csvString = csvRows.join('\n');
    
    // Create a Blob and trigger download
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
      <Download className="h-4 w-4" />
      Export CSV
    </Button>
  );
}
