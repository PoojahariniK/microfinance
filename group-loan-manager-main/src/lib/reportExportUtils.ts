/**
 * Comprehensive Report Export Utilities
 * Supports segmented PDF and CSV exports for Balance Sheet and P&L.
 */

// ─────────────────────────────────────────────────────
//  GENERIC CSV EXPORT (for table-based reports)
// ─────────────────────────────────────────────────────
export const exportToCSV = (data: any[], filename: string, footer?: any) => {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(obj =>
    headers.map(header => {
      const val = obj[header];
      return typeof val === 'string' && val.includes(',') ? `"${val}"` : (val ?? "");
    }).join(',')
  );
  let csvContent = [headers.join(','), ...rows].join('\n');
  if (footer) {
    const footerRow = headers.map(h => {
      const val = footer[h];
      return typeof val === 'string' && val.includes(',') ? `"${val}"` : (val ?? "");
    }).join(',');
    csvContent += `\n${footerRow}`;
  }
  downloadCSV(csvContent, filename);
};

// ─────────────────────────────────────────────────────
//  GENERIC PDF EXPORT (for table-based reports)
// ─────────────────────────────────────────────────────
export const exportToPDF = (title: string, subtitle: string, headers: string[], rows: any[][], footer?: any[]) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  const tableHeaders = headers.map(h => `<th style="border:1px solid #ccc;padding:8px;background:#f5f5f5;text-align:left;font-size:11px;">${h}</th>`).join('');
  const tableRows = rows.map(row => `<tr>${row.map(cell => `<td style="border:1px solid #ccc;padding:6px;font-size:11px;">${cell}</td>`).join('')}</tr>`).join('');
  const tableFooter = footer ? `<tfoot><tr style="background:#eee;font-weight:bold;">${footer.map(c => `<td style="border:1px solid #ccc;padding:8px;font-size:11px;">${c}</td>`).join('')}</tr></tfoot>` : '';
  printWindow.document.write(basePDFTemplate(title, subtitle, `<table style="width:100%;border-collapse:collapse;margin-top:10px;"><thead><tr>${tableHeaders}</tr></thead><tbody>${tableRows}</tbody>${tableFooter}</table>`));
  printWindow.document.close();
};

// ─────────────────────────────────────────────────────
//  BALANCE SHEET — SEGMENTED CSV
// ─────────────────────────────────────────────────────
export const exportBalanceSheetCSV = (data: any, dateRange: { start: string; end: string }, groupName: string) => {
  // Use plain number format to avoid commas splitting CSV columns
  const fmt = (v: any) => (v || 0).toFixed(2);
  const lines: string[] = [];

  const addHeader = (text: string) => {
    lines.push('');
    lines.push('');
    lines.push(`"${text}"`);
  };

  // Metadata
  lines.push(`"STATEMENT OF FINANCIAL POSITION"`);
  lines.push(`"Group: ${groupName} | Period: ${dateRange.start} to ${dateRange.end}"`);

  // Block I — Assets
  addHeader('I.  ASSETS');
  lines.push('Item,Amount');
  lines.push(`Cash in Hand,${fmt(data.closing.cash)}`);
  lines.push(`Total Pending Loans,${fmt(data.closing.loanOutstanding)}`);
  lines.push(`"== TOTAL ASSETS ==",${fmt(data.closing.total)}`);

  // Block II — Equity & Capital
  addHeader('II.  SOURCE OF FUNDS (EQUITY & CAPITAL)');
  lines.push('Item,Amount');
  lines.push(`Capital Injected,${fmt(data.movement.infusedCapital || 0)}`);
  const retained = (data.closing.total - (data.movement.infusedCapital || 0));
  lines.push(`Retained Earnings (Net),${fmt(retained)}`);
  lines.push(`"== TOTAL EQUITY ==",${fmt(data.closing.total)}`);

  // Block III — Movement / Activity
  addHeader('III.  MOVEMENT SCHEDULE (ACTIVITY)');
  lines.push('Activity,Amount');
  lines.push(`Opening Cash,${fmt(data.opening.cash)}`);
  lines.push(`(+) Capital Added,${fmt(data.movement.infusedCapital || 0)}`);
  lines.push(`(-) Loan Disbursements,-${fmt(data.movement.disbursed)}`);
  lines.push(`(+) Collections / Repayments,${fmt(data.movement.collected)}`);
  lines.push(`(+) Charges Collected,${fmt(data.movement.chargesCollected)}`);
  lines.push(`"== CLOSING CASH ==",${fmt(data.closing.cash)}`);

  downloadCSV(lines.join('\n'), `balance_sheet_${dateRange.start}_to_${dateRange.end}.csv`);
};

// ─────────────────────────────────────────────────────
//  BALANCE SHEET — SEGMENTED EXECUTIVE PDF
// ─────────────────────────────────────────────────────
export const exportBalanceSheetPDF = (data: any, dateRange: { start: string; end: string }, groupName: string) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  const fmt = (v: any) => `₹${(v || 0).toLocaleString('en-IN')}`;

  const sectionTable = (titleNum: string, titleText: string, headers: string[], rows: [string, string][], totalLabel?: string, totalValue?: string) => `
    <div style="margin-bottom:32px;">
      <div style="font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.15em;color:#1a1a2e;margin-bottom:8px;padding:6px 10px;background:#f0f4ff;border-left:4px solid #2563eb;">
        ${titleNum}&nbsp;&nbsp;${titleText}
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr>
            ${headers.map(h => `<th style="padding:8px 12px;background:#f8fafc;border-bottom:2px solid #cbd5e1;text-align:left;font-size:10px;font-weight:800;text-transform:uppercase;color:#64748b;letter-spacing:0.08em;">${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.map(([label, val]) => `
            <tr>
              <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;font-size:11px;color:#374151;">${label}</td>
              <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;font-size:11px;text-align:right;font-weight:600;color:#1e293b;font-family:monospace;">${val}</td>
            </tr>
          `).join('')}
          ${totalLabel ? `
            <tr style="background:#f8fafc;">
              <td style="padding:10px 12px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.05em;color:#1a1a2e;border-top:2px solid #1a1a2e;border-bottom:3px double #1a1a2e;">${totalLabel}</td>
              <td style="padding:10px 12px;font-size:12px;font-weight:900;text-align:right;color:#1a1a2e;font-family:monospace;border-top:2px solid #1a1a2e;border-bottom:3px double #1a1a2e;">${totalValue}</td>
            </tr>
          ` : ''}
        </tbody>
      </table>
    </div>
  `;

  const retained = data.closing.total - (data.movement.infusedCapital || 0);

  const body = `
    ${sectionTable('I.', 'ASSETS', ['Asset', 'Value'],
      [
        ['Cash in Hand', fmt(data.closing.cash)],
        ['Total Pending Loans (Receivable)', fmt(data.closing.loanOutstanding)],
      ],
      'TOTAL ASSETS', fmt(data.closing.total)
    )}

    ${sectionTable('II.', 'SOURCE OF FUNDS — EQUITY & CAPITAL', ['Component', 'Value'],
      [
        ['Capital Injected (Owner Funds)', fmt(data.movement.infusedCapital || 0)],
        ['Retained Earnings / Net Position', fmt(retained)],
      ],
      'TOTAL EQUITY', fmt(data.closing.total)
    )}

    ${sectionTable('III.', 'MOVEMENT SCHEDULE — CASH ACTIVITY', ['Activity', 'Amount'],
      [
        ['Opening Cash Balance', fmt(data.opening.cash)],
        ['(+) Capital Added During Period', fmt(data.movement.infusedCapital || 0)],
        ['(−) Loan Disbursements', `−${fmt(data.movement.disbursed)}`],
        ['(+) Loan Repayments / Collections', fmt(data.movement.collected)],
        ['(+) Charges Collected', fmt(data.movement.chargesCollected)],
      ],
      'CLOSING CASH BALANCE', fmt(data.closing.cash)
    )}
  `;

  const subtitle = `Group: ${groupName} &nbsp;|&nbsp; Period: ${dateRange.start} — ${dateRange.end}`;
  printWindow.document.write(basePDFTemplate('STATEMENT OF FINANCIAL POSITION', subtitle, body));
  printWindow.document.close();
};

// ─────────────────────────────────────────────────────
//  P&L — SEGMENTED CSV
// ─────────────────────────────────────────────────────
export const exportProfitLossCSV = (data: any, dateRange: { start: string; end: string }, groupName: string) => {
  // Use plain number format to avoid commas splitting CSV columns
  const fmt = (v: any) => (v || 0).toFixed(2);
  const lines: string[] = [];

  lines.push(`"PROFIT & LOSS STATEMENT"`);
  lines.push(`"Group: ${groupName} | Period: ${dateRange.start} to ${dateRange.end}"`);

  lines.push('');  
  lines.push('');  
  lines.push('"I.  REVENUE"');
  lines.push('Item,Amount');
  lines.push(`Interest Income,${fmt(data.revenue?.interest)}`);
  lines.push(`Charges Income,${fmt(data.revenue?.charges)}`);
  lines.push(`"== TOTAL REVENUE ==",${fmt(data.revenue?.total)}`);

  lines.push('');
  lines.push('');
  lines.push('"NET PROFIT / (LOSS)"');
  lines.push('Item,Amount');
  lines.push(`Net Profit,${fmt(data.netProfit)}`);

  if (data.trends && data.trends.length > 0) {
    lines.push('');
    lines.push('');
    lines.push('"II.  PERIOD TREND"');
    lines.push('Period,Interest,Charges,Revenue,Growth (%)');
    data.trends.forEach((t: any) => {
      lines.push(`${t.period},${fmt(t.interest)},${fmt(t.charges)},${fmt(t.revenue)},${t.growth === null ? 'Base' : t.growth + '%'}`);
    });
  }

  if (data.loanBreakdowns && data.loanBreakdowns.length > 0) {
    lines.push('');
    lines.push('');
    lines.push('"III.  LOAN-LEVEL BREAKDOWN"');
    lines.push('Group,Loan ID,Interest,Charges,Profit/Loss,Type,% Contribution');
    data.loanBreakdowns.forEach((b: any) => {
      lines.push(`${b.groupName},#${b.loanId},${fmt(b.interestIncome)},${fmt(b.chargesIncome)},${fmt(b.profit)},${b.profit >= 0 ? 'P' : 'L'},${b.profitPercentage}%`);
    });
  }

  downloadCSV(lines.join('\n'), `profit_loss_${dateRange.start}_to_${dateRange.end}.csv`);
};

// ─────────────────────────────────────────────────────
//  P&L — SEGMENTED EXECUTIVE PDF
// ─────────────────────────────────────────────────────
export const exportProfitLossPDF = (data: any, dateRange: { start: string; end: string }, groupName: string) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  const fmt = (v: any) => `₹${(v || 0).toLocaleString('en-IN')}`;
  const isProfit = (data.netProfit || 0) >= 0;

  const sectionHeader = (num: string, text: string) => `
    <div style="font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.15em;color:#1a1a2e;margin-bottom:8px;padding:6px 10px;background:#f0f4ff;border-left:4px solid #2563eb;">
      ${num}&nbsp;&nbsp;${text}
    </div>
  `;

  const revenueTable = `
    <div style="margin-bottom:32px;">
      ${sectionHeader('I.', 'REVENUE')}
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr>
          <th style="padding:8px 12px;background:#f8fafc;border-bottom:2px solid #cbd5e1;text-align:left;font-size:10px;font-weight:800;text-transform:uppercase;color:#64748b;">Item</th>
          <th style="padding:8px 12px;background:#f8fafc;border-bottom:2px solid #cbd5e1;text-align:right;font-size:10px;font-weight:800;text-transform:uppercase;color:#64748b;">Amount</th>
        </tr></thead>
        <tbody>
          <tr><td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;font-size:11px;color:#374151;">Interest Income</td><td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;font-size:11px;text-align:right;font-family:monospace;font-weight:600;">${fmt(data.revenue?.interest)}</td></tr>
          <tr><td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;font-size:11px;color:#374151;">Charges Income</td><td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;font-size:11px;text-align:right;font-family:monospace;font-weight:600;">${fmt(data.revenue?.charges)}</td></tr>
          <tr style="background:#f8fafc;"><td style="padding:10px 12px;font-size:11px;font-weight:900;text-transform:uppercase;border-top:2px solid #1a1a2e;border-bottom:3px double #1a1a2e;">TOTAL REVENUE</td><td style="padding:10px 12px;font-size:12px;font-weight:900;text-align:right;font-family:monospace;border-top:2px solid #1a1a2e;border-bottom:3px double #1a1a2e;">${fmt(data.revenue?.total)}</td></tr>
        </tbody>
      </table>

      <div style="margin-top:20px;padding:16px 20px;border-radius:8px;background:${isProfit ? '#f0fdf4' : '#fff1f2'};border:1px solid ${isProfit ? '#bbf7d0' : '#fecdd3'};">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.15em;color:${isProfit ? '#166534' : '#991b1b'};">NET ${isProfit ? 'PROFIT' : 'LOSS'}</div>
            <div style="font-size:9px;color:#6b7280;margin-top:2px;">BOTTOM LINE RESULT</div>
          </div>
          <div style="font-size:22px;font-weight:900;font-family:monospace;color:${isProfit ? '#15803d' : '#dc2626'};">${fmt(data.netProfit)}</div>
        </div>
      </div>
    </div>
  `;

  const trendsTable = data.trends && data.trends.length > 0 ? `
    <div style="margin-bottom:32px;">
      ${sectionHeader('II.', 'COMPARATIVE PERFORMANCE TREND')}
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr>
          ${['Period', 'Interest', 'Charges', 'Revenue', 'Growth %'].map(h => `<th style="padding:8px 12px;background:#f8fafc;border-bottom:2px solid #cbd5e1;text-align:${h === 'Period' ? 'left' : 'right'};font-size:10px;font-weight:800;text-transform:uppercase;color:#64748b;">${h}</th>`).join('')}
        </tr></thead>
        <tbody>
          ${data.trends.map((t: any, i: number) => `
            <tr style="${i % 2 === 0 ? '' : 'background:#fafafa'}">
              <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;font-size:11px;font-weight:600;">${t.period}</td>
              <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;font-size:11px;text-align:right;font-family:monospace;">${fmt(t.interest)}</td>
              <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;font-size:11px;text-align:right;font-family:monospace;">${fmt(t.charges)}</td>
              <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;font-size:11px;text-align:right;font-family:monospace;font-weight:700;">${fmt(t.revenue)}</td>
              <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;font-size:11px;text-align:right;font-weight:700;color:${t.growth === null ? '#9ca3af' : t.growth >= 0 ? '#16a34a' : '#dc2626'};">${t.growth === null ? '—' : (t.growth > 0 ? '+' : '') + t.growth + '%'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  ` : '';

  const breakdownTable = data.loanBreakdowns && data.loanBreakdowns.length > 0 ? `
    <div style="margin-bottom:32px;">
      ${sectionHeader('III.', 'LOAN-LEVEL PROFIT BREAKDOWN')}
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr>
          ${['Group', 'Loan ID', 'Interest', 'Charges', 'Profit/Loss', 'Type', '% Contrib.'].map(h => `<th style="padding:8px 12px;background:#f8fafc;border-bottom:2px solid #cbd5e1;text-align:${h === 'Group' ? 'left' : 'right'};font-size:10px;font-weight:800;text-transform:uppercase;color:#64748b;">${h}</th>`).join('')}
        </tr></thead>
        <tbody>
          ${data.loanBreakdowns.map((b: any, i: number) => `
            <tr style="${i % 2 === 0 ? '' : 'background:#fafafa'}">
              <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;font-size:11px;font-weight:600;">${b.groupName}</td>
              <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;font-size:11px;text-align:right;font-family:monospace;color:#2563eb;font-weight:700;">#${b.loanId}</td>
              <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;font-size:11px;text-align:right;font-family:monospace;">${fmt(b.interestIncome)}</td>
              <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;font-size:11px;text-align:right;font-family:monospace;">${fmt(b.chargesIncome)}</td>
              <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;font-size:11px;text-align:right;font-family:monospace;font-weight:700;">${fmt(b.profit)}</td>
              <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;font-size:11px;text-align:right;">
                <span style="padding:2px 8px;border-radius:4px;font-weight:800;font-size:10px;background:${b.profit >= 0 ? '#dcfce7' : '#fee2e2'};color:${b.profit >= 0 ? '#166534' : '#991b1b'};">${b.profit >= 0 ? 'P' : 'L'}</span>
              </td>
              <td style="padding:7px 12px;border-bottom:1px solid #f1f5f9;font-size:11px;text-align:right;font-weight:700;color:#059669;">${b.profitPercentage}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  ` : '';

  const subtitle = `Group: ${groupName} &nbsp;|&nbsp; Period: ${dateRange.start} — ${dateRange.end}`;
  printWindow.document.write(basePDFTemplate('PROFIT & LOSS STATEMENT', subtitle, revenueTable + trendsTable + breakdownTable));
  printWindow.document.close();
};

// ─────────────────────────────────────────────────────
//  INTERNAL HELPERS
// ─────────────────────────────────────────────────────
function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.setAttribute('href', URL.createObjectURL(blob));
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function basePDFTemplate(title: string, subtitle: string, body: string): string {
  return `<html>
    <head>
      <title>${title}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 32px 40px; color: #1a1a2e; background: #fff; }
        .page-header { text-align: center; margin-bottom: 32px; padding-bottom: 16px; border-bottom: 2px solid #1a1a2e; }
        .page-header h1 { font-size: 17px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em; color: #1a1a2e; }
        .page-header p { font-size: 10px; font-weight: 600; color: #64748b; margin-top: 6px; }
        .page-footer { text-align: center; font-size: 9px; color: #94a3b8; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 12px; }
        @media print { body { padding: 16px 24px; } }
      </style>
    </head>
    <body>
      <div class="page-header">
        <h1>MicroFinance Pro &mdash; ${title}</h1>
        <p>${subtitle}</p>
        <p style="margin-top:4px;">Generated: ${new Date().toLocaleString()}</p>
      </div>
      ${body}
      <div class="page-footer">This document was generated automatically by MicroFinance Pro. For official use only.</div>
      <script>window.onload = function() { window.print(); };</script>
    </body>
  </html>`;
}
