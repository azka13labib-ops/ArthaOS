/**
 * Utility functions for exporting tabular reports to CSV/Excel and formatted printable documents.
 */

export function exportToCSV(
  filename: string,
  rows: Array<Record<string, unknown>>,
  headers?: Array<{ key: string; label: string }>
) {
  if (!rows || rows.length === 0) {
    alert("Tidak ada data untuk diekspor.");
    return;
  }

  // Determine headers
  const columnKeys = headers ? headers.map((h) => h.key) : Object.keys(rows[0]);
  const columnLabels = headers ? headers.map((h) => h.label) : columnKeys;

  // Build CSV content
  const escapeCsvValue = (val: unknown): string => {
    if (val === null || val === undefined) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvRows: string[] = [];
  // Header row
  csvRows.push(columnLabels.map(escapeCsvValue).join(","));

  // Data rows
  for (const row of rows) {
    const values = columnKeys.map((k) => escapeCsvValue(row[k]));
    csvRows.push(values.join(","));
  }

  // Prepend UTF-8 BOM (\uFEFF) for Microsoft Excel compatibility
  const csvContent = "\uFEFF" + csvRows.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename.endsWith(".csv") ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function printFormattedReport(
  title: string,
  storeName: string,
  periodText: string,
  contentHtml: string
) {
  const printWindow = window.open("", "_blank", "width=800,height=900");
  if (!printWindow) {
    window.print();
    return;
  }

  const currentDate = new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title} - ${storeName}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
            line-height: 1.5;
            margin: 0;
            padding: 20px;
            background: #fff;
          }
          .header {
            border-bottom: 2px solid #0f172a;
            padding-bottom: 12px;
            margin-bottom: 20px;
          }
          .store-name {
            font-size: 20px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #0f172a;
          }
          .report-title {
            font-size: 16px;
            font-weight: 700;
            color: #334155;
            margin-top: 4px;
          }
          .meta-info {
            font-size: 11px;
            color: #64748b;
            margin-top: 4px;
            display: flex;
            justify-content: space-between;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-top: 15px;
          }
          th {
            background-color: #f1f5f9;
            border: 1px solid #cbd5e1;
            padding: 8px 10px;
            text-align: left;
            font-weight: 600;
            color: #334155;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.5px;
          }
          td {
            border: 1px solid #e2e8f0;
            padding: 8px 10px;
          }
          tr:nth-child(even) {
            background-color: #f8fafc;
          }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .summary-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 12px 16px;
            margin-bottom: 16px;
            display: flex;
            justify-content: space-between;
          }
          .summary-item {
            display: flex;
            flex-direction: column;
          }
          .summary-label {
            font-size: 10px;
            text-transform: uppercase;
            color: #64748b;
            font-weight: 600;
          }
          .summary-val {
            font-size: 15px;
            font-weight: 700;
            color: #0f172a;
            margin-top: 2px;
          }
          .footer {
            margin-top: 30px;
            border-top: 1px dashed #cbd5e1;
            padding-top: 8px;
            font-size: 10px;
            color: #94a3b8;
            display: flex;
            justify-content: space-between;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="store-name">${storeName}</div>
          <div class="report-title">${title}</div>
          <div class="meta-info">
            <span>Periode: ${periodText}</span>
            <span>Dicetak pada: ${currentDate}</span>
          </div>
        </div>

        ${contentHtml}

        <div class="footer">
          <span>Dicetak otomatis dari Sistem Kasir ArthaOS</span>
          <span>Dokumen Sah Internal Toko</span>
        </div>

        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
