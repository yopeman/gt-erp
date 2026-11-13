import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Standard Company Information fallback for GT-ERP Reports
 */
const DEFAULT_COMPANY_INFO = {
  companyName: 'GT PRINTING PRESS PLC',
  tagline: 'Industrial Printing, Packaging & Commercial Publishing Solutions',
  tin: '0012998844',
  vatReg: '998811',
  license: 'BL/AA/2018/00941',
  address: 'Bole Sub-City, Woreda 03, Addis Ababa, Ethiopia',
  phone: '+251 11 661 2345 / +251 91 122 3344',
  email: 'info@gtprintingpress.com',
  website: 'www.gtprintingpress.com'
};

/**
 * Formats standard date-time string
 */
function formatGeneratedDate(date = new Date()) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  const day = pad(d.getDate());
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const hours = pad(d.getHours());
  const mins = pad(d.getMinutes());
  return `${day}-${month}-${year} ${hours}:${mins} EAT`;
}

/**
 * Resolves current user from params or localStorage
 */
function resolveCurrentUser(userParam) {
  if (userParam && (userParam.fullName || userParam.name || userParam.email)) {
    return userParam;
  }
  try {
    const stored = localStorage.getItem('gt_erp_user');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // fallback
  }
  return { fullName: 'Authorized System User', role: 'Operations Auditor' };
}

/**
 * Generates and downloads a standardized, executive-grade ERP Form Format PDF.
 *
 * @param {Object} options
 * @param {string} options.reportTitle - e.g. "CRM & Sales Performance Report"
 * @param {string} [options.reportSubtitle] - High-level scope description
 * @param {string} options.formNumber - Official ERP Form Code (e.g. "FORM-GT-CRM-01")
 * @param {string} [options.moduleName] - Module division (e.g. "CRM & Sales")
 * @param {string} options.timeframeLabel - Selected timeframe (e.g. "Monthly (This Month)")
 * @param {string} [options.filterDetails] - Active filters applied
 * @param {Array<{label: string, value: string|number, subtitle?: string}>} options.summaryCards - Key metrics
 * @param {Array<string>} options.tableHeaders - Array of column header names
 * @param {Array<Array<string|number>>} options.tableRows - Array of data rows
 * @param {Array<Array<string|number>>} [options.tableFooters] - Optional summary footer row
 * @param {Object} [options.columnStyles] - jspdf-autotable column styles override
 * @param {string} [options.fileName] - Download file name
 * @param {Object} [options.user] - Active logged in user
 * @param {Object} [options.companyInfo] - Company settings
 * @param {'landscape'|'portrait'} [options.orientation='landscape'] - Page orientation
 */
export function exportReportToPdf({
  reportTitle,
  reportSubtitle = '',
  formNumber = 'FORM-GT-REP-01',
  moduleName = 'Enterprise Operations',
  timeframeLabel = 'All Time',
  filterDetails = 'Filters: None',
  summaryCards = [],
  tableHeaders = [],
  tableRows = [],
  tableFooters = null,
  columnStyles = {},
  fileName = 'GT_ERP_Report.pdf',
  user = null,
  companyInfo = null,
  orientation = 'landscape'
}) {
  const company = { ...DEFAULT_COMPANY_INFO, ...(companyInfo || {}) };
  const currentUser = resolveCurrentUser(user);
  const generatedTimestamp = formatGeneratedDate();

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // 1. Top Brand Banner Accent Strip
  doc.setFillColor(218, 31, 38); // GT Red
  doc.rect(0, 0, pageWidth, 3, 'F');

  // 2. Official Letterhead - Company Information (Left Side)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(company.companyName, margin, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text(company.tagline, margin, 16.5);
  doc.text(`TIN: ${company.tin} | VAT Reg: ${company.vatReg} | Business Lic: ${company.license}`, margin, 20.5);
  doc.text(`${company.address} | Tel: ${company.phone}`, margin, 24.5);

  // 3. Document Reference Dossier Box (Right Side)
  const boxWidth = orientation === 'landscape' ? 70 : 65;
  const boxHeight = 20;
  const boxX = pageWidth - margin - boxWidth;
  const boxY = 7.5;

  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.3);
  doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 1.5, 1.5, 'FD');

  // Inner dossier entries
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(218, 31, 38);
  doc.text(`DOC REF: ${formNumber}`, boxX + 4, boxY + 4.8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text('OFFICIAL ERP AUDIT REPORT', boxX + 4, boxY + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Security: STRICTLY CONFIDENTIAL', boxX + 4, boxY + 13);
  doc.text(`Issued: ${generatedTimestamp}`, boxX + 4, boxY + 17);

  // Separator divider rule
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.3);
  doc.line(margin, 30.5, pageWidth - margin, 30.5);

  // 4. Form Subject & Report Scope Banner
  const titleBarY = 33.5;
  const titleBarHeight = 7;
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(margin, titleBarY, contentWidth, titleBarHeight, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text(reportTitle.toUpperCase(), margin + 4, titleBarY + 4.8);

  if (reportSubtitle) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(203, 213, 225);
    doc.text(reportSubtitle, pageWidth - margin - 4, titleBarY + 4.8, { align: 'right' });
  }

  // Metadata sub-strip below the title bar
  const metaY = titleBarY + titleBarHeight;
  const metaHeight = 7.5;
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(margin, metaY, contentWidth, metaHeight, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(51, 65, 85);

  const colSpan = contentWidth / 4;
  doc.text(`TIMEFRAME: ${timeframeLabel}`, margin + 4, metaY + 4.8);
  doc.text(`SCOPE: ${filterDetails}`, margin + colSpan, metaY + 4.8);
  doc.text(`OPERATOR: ${currentUser.fullName || currentUser.name || 'Admin'} (${currentUser.role || 'Staff'})`, margin + colSpan * 2, metaY + 4.8);
  doc.text(`DIVISION: ${moduleName}`, margin + colSpan * 3, metaY + 4.8);

  let currentY = metaY + metaHeight + 4;

  // 5. Executive KPI Summary Cards Grid
  if (Array.isArray(summaryCards) && summaryCards.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('I. EXECUTIVE SUMMARY & KEY PERFORMANCE METRICS', margin, currentY + 1);

    const kpiY = currentY + 3.5;
    const count = summaryCards.length;
    const gap = 3;
    const cardWidth = (contentWidth - (count - 1) * gap) / count;
    const cardHeight = 14;

    summaryCards.forEach((kpi, idx) => {
      const cx = margin + idx * (cardWidth + gap);

      // Card Container
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(cx, kpiY, cardWidth, cardHeight, 1.2, 1.2, 'FD');

      // Top Red Accent Line
      doc.setFillColor(218, 31, 38);
      doc.rect(cx, kpiY, cardWidth, 1.1, 'F');

      // Label
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(100, 116, 139);
      doc.text(String(kpi.label || '').toUpperCase(), cx + 2.5, kpiY + 4.5);

      // Value
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      const valStr = String(kpi.value || '0');
      doc.text(valStr, cx + 2.5, kpiY + 8.8);

      // Subtitle
      if (kpi.subtitle) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.5);
        doc.setTextColor(148, 163, 184);
        doc.text(String(kpi.subtitle), cx + 2.5, kpiY + 12.2);
      }
    });

    currentY = kpiY + cardHeight + 5;
  }

  // 6. Section Heading for Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('II. DETAILED AUDIT & TRANSACTION LOGS', margin, currentY);

  const tableStartY = currentY + 2;

  // Build rows or empty row
  const rows = tableRows.length > 0
    ? tableRows
    : [[ 'No transaction records found matching the specified timeframe and filter criteria.', ...Array(Math.max(0, tableHeaders.length - 1)).fill('') ]];

  // 7. AutoTable Generation
  autoTable(doc, {
    startY: tableStartY,
    margin: { left: margin, right: margin, top: 15, bottom: 16 },
    head: [tableHeaders],
    body: rows,
    foot: tableFooters ? [tableFooters] : undefined,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontSize: 7.2,
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 2.2
    },
    bodyStyles: {
      fontSize: 6.8,
      textColor: [15, 23, 42],
      cellPadding: 2,
      lineColor: [226, 232, 240]
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] // slate-50
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 7.2,
      cellPadding: 2.2
    },
    columnStyles,
    didParseCell: (data) => {
      // Automatic status styling
      if (data.section === 'body') {
        const raw = String(data.cell.raw || '').toLowerCase().trim();
        if (['completed', 'paid', 'active', 'approved', 'on time', 'good', 'success'].includes(raw)) {
          data.cell.styles.textColor = [16, 185, 129]; // emerald-600
          data.cell.styles.fontStyle = 'bold';
        } else if (['pending', 'in production', 'in_progress', 'partial', 'partially_paid', 'late', 'warning'].includes(raw)) {
          data.cell.styles.textColor = [217, 119, 6]; // amber-600
          data.cell.styles.fontStyle = 'bold';
        } else if (['unpaid', 'cancelled', 'rejected', 'overdue', 'damaged', 'scrap', 'inactive'].includes(raw)) {
          data.cell.styles.textColor = [225, 29, 72]; // rose-600
          data.cell.styles.fontStyle = 'bold';
        }
      }
    }
  });

  // 8. Formal Verification & Authorization Section (Sign-off)
  const signSectionHeight = 30;
  let signY = doc.lastAutoTable.finalY + 6;

  // If near bottom of the page, push to a fresh page to avoid cutting signatures
  if (signY + signSectionHeight > pageHeight - 16) {
    doc.addPage();
    signY = 18;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('III. OFFICIAL VERIFICATION & AUTHORIZATION SIGN-OFF', margin, signY);

  const blockCount = 3;
  const blockGap = 4;
  const blockWidth = (contentWidth - (blockCount - 1) * blockGap) / blockCount;
  const blockHeight = 22;
  const blockTop = signY + 2.5;

  const signBlocks = [
    {
      title: 'PREPARED BY (OPERATOR)',
      name: currentUser.fullName || currentUser.name || 'Authorized Staff',
      role: currentUser.role || 'Operations Officer'
    },
    {
      title: 'VERIFIED & AUDITED BY',
      name: 'Internal Audit Department',
      role: 'Head of Quality & Compliance'
    },
    {
      title: 'AUTHORIZED & APPROVED BY',
      name: 'Executive Management',
      role: 'Managing Director / Plant Manager'
    }
  ];

  signBlocks.forEach((b, idx) => {
    const bx = margin + idx * (blockWidth + blockGap);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.roundedRect(bx, blockTop, blockWidth, blockHeight, 1.2, 1.2, 'FD');

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(218, 31, 38);
    doc.text(b.title, bx + 3, blockTop + 4.5);

    // Name & Role lines
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(71, 85, 105);
    doc.text(`Name: ${b.name}`, bx + 3, blockTop + 9);
    doc.text(`Title: ${b.role}`, bx + 3, blockTop + 13);
    doc.text('Signature & Date: ________________________________', bx + 3, blockTop + 18);
  });

  // 9. Running Headers (Pages 2+) & Running Footers (All Pages)
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    // Running Header (pages > 1)
    if (p > 1) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);
      doc.text(company.companyName, margin, 8.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(100, 116, 139);
      doc.text(`—  ${reportTitle}`, margin + 38, 8.5);
      doc.text(`DOC REF: ${formNumber}  •  ${timeframeLabel}`, pageWidth - margin, 8.5, { align: 'right' });

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(margin, 10.5, pageWidth - margin, 10.5);
    }

    // Running Footer (every page)
    const footerY = pageHeight - 10;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY, pageWidth - margin, footerY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184);
    doc.text(
      'CONFIDENTIAL  •  GT-ERP OPERATIONAL AUDIT SYSTEM  •  UNAUTHORIZED REPRODUCTION IS STRICTLY PROHIBITED',
      margin,
      footerY + 4.5
    );

    doc.text(
      `REF: ${formNumber}`,
      pageWidth / 2,
      footerY + 4.5,
      { align: 'center' }
    );

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(
      `Page ${p} of ${totalPages}`,
      pageWidth - margin,
      footerY + 4.5,
      { align: 'right' }
    );
  }

  // 10. Save and trigger download
  doc.save(fileName);
  return doc;
}

export default exportReportToPdf;

