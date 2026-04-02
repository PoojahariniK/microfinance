/**
 * Utility to convert an array of objects (DTOs) to a CSV string and trigger a download.
 */
export const exportToCSV = (data: any[], filename: string) => {
  if (!data || data.length === 0) return;

  const headers = Object.keys(data[0]);
  const rows = data.map(obj => 
    headers.map(header => {
      const val = obj[header];
      // Basic escaping for CSV values containing commas
      return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
    }).join(',')
  );

  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Utility to open a print window for a report.
 */
export const exportToPDF = (title: string, subtitle: string, headers: string[], rows: any[][]) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const tableRows = rows.map(row => `
    <tr>
      ${row.map(cell => `<td style="border: 1px solid #000; padding: 6px;">${cell}</td>`).join('')}
    </tr>
  `).join('');

  const tableHeaders = headers.map(header => `
    <th style="border: 1px solid #000; padding: 8px; background-color: #f2f2f2; text-align: left;">${header}</th>
  `).join('');

  printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 11px; padding: 20px; color: #000; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .header h1 { margin: 0; font-size: 18px; text-transform: uppercase; }
          .header p { margin: 5px 0 0; font-size: 10px; font-weight: bold; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .metadata { margin-bottom: 10px; font-weight: bold; }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>MicroFinance Pro</h1>
          <p>${title}</p>
          <p>Generated on: ${new Date().toLocaleString()}</p>
        </div>
        <div class="metadata">${subtitle}</div>
        <table>
          <thead>
            <tr>${tableHeaders}</tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <script>
          window.onload = function() {
            window.print();
            // Optional: window.close();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};
