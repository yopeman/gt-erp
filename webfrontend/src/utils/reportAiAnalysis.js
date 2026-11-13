/**
 * reportAiAnalysis.js
 * Utility to format enterprise ERP report data into an executive AI prompt
 * and launch ChatGPT in a new tab with the prompt pre-filled via URL parameter.
 */

/**
 * Formats camelCase or snake_case key to Human Readable Title Case
 */
function formatKeyLabel(key) {
  if (!key) return '';
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

/**
 * Formats analytics objects/arrays into concise human-readable bullet points
 */
function formatAnalyticsHighlights(analytics) {
  if (!analytics || typeof analytics !== 'object') return [];
  const lines = [];

  Object.entries(analytics).forEach(([key, val]) => {
    if (Array.isArray(val) && val.length > 0) {
      if (typeof val[0] === 'object' && val[0] !== null) {
        const topSlice = val.slice(0, 5).map((item) => {
          const label =
            item.name ||
            item.service ||
            item.department ||
            item.status ||
            item.reason ||
            item.machineName ||
            item.category ||
            Object.values(item)[0] ||
            'Item';
          const value =
            item.revenue !== undefined
              ? item.revenue
              : item.value !== undefined
              ? item.value
              : item.amount !== undefined
              ? item.amount
              : item.count !== undefined
              ? item.count
              : item.total !== undefined
              ? item.total
              : item.hours !== undefined
              ? `${item.hours} hrs`
              : Object.values(item)[1];
          return `${label}: ${typeof value === 'number' ? value.toLocaleString() : value}`;
        });
        lines.push(`• ${formatKeyLabel(key)}: ${topSlice.join('; ')}`);
      }
    } else if (typeof val === 'object' && val !== null) {
      const summaryItems = Object.entries(val)
        .slice(0, 5)
        .map(([k, v]) => `${formatKeyLabel(k)}: ${typeof v === 'number' ? v.toLocaleString() : v}`);
      if (summaryItems.length > 0) {
        lines.push(`• ${formatKeyLabel(key)}: ${summaryItems.join('; ')}`);
      }
    }
  });

  return lines;
}

/**
 * Builds the comprehensive prompt for ChatGPT
 */
export function buildReportAnalysisPrompt({
  reportTitle = 'Executive Operational Report',
  reportSubtitle = '',
  moduleName = 'Enterprise Operations',
  timeframeLabel = 'Current Period',
  filterDetails = '',
  summaryCards = [],
  tableHeaders = [],
  tableRows = [],
  analytics = null,
  companyName = 'GT Printing Press PLC'
}) {
  const lines = [];

  lines.push(`You are a senior enterprise business intelligence analyst and ERP operations consultant.`);
  lines.push(`Please review the following operational and financial report data for ${companyName} and deliver an executive-level performance audit with actionable recommendations.`);
  lines.push('');
  lines.push(`=== 1. REPORT OVERVIEW ===`);
  lines.push(`• Company: ${companyName}`);
  lines.push(`• ERP Module: ${moduleName}`);
  lines.push(`• Report Name: ${reportTitle}`);
  if (reportSubtitle) {
    lines.push(`• Scope: ${reportSubtitle}`);
  }
  lines.push(`• Period / Timeframe: ${timeframeLabel}`);
  if (filterDetails && filterDetails !== 'All Records' && filterDetails !== 'None') {
    lines.push(`• Filters Applied: ${filterDetails}`);
  }
  lines.push(`• Audit Timestamp: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`);
  lines.push('');

  // Summary KPIs
  if (summaryCards && summaryCards.length > 0) {
    lines.push(`=== 2. KEY PERFORMANCE INDICATORS (KPIs) ===`);
    summaryCards.forEach((c) => {
      const sub = c.subtitle ? ` (${c.subtitle})` : '';
      lines.push(`• ${c.label}: ${c.value}${sub}`);
    });
    lines.push('');
  }

  // Analytics breakdown
  const analyticsLines = formatAnalyticsHighlights(analytics);
  if (analyticsLines.length > 0) {
    lines.push(`=== 3. OPERATIONAL & DISTRIBUTION METRICS ===`);
    lines.push(...analyticsLines);
    lines.push('');
  }

  // Ledger / Table Sample (capped to avoid excessive URL length)
  if (tableHeaders && tableHeaders.length > 0 && tableRows && tableRows.length > 0) {
    const maxSample = Math.min(tableRows.length, 10);
    lines.push(`=== 4. TRANSACTION / AUDIT LEDGER SAMPLE (Top ${maxSample} of ${tableRows.length} records) ===`);
    lines.push(tableHeaders.join(' | '));
    for (let i = 0; i < maxSample; i++) {
      const row = tableRows[i];
      const cleanedRow = row.map((cell) => String(cell ?? '—').replace(/[\r\n]+/g, ' ').trim());
      lines.push(cleanedRow.join(' | '));
    }
    lines.push('');
  }

  lines.push(`=== 5. REQUIRED ANALYSIS OBJECTIVES ===`);
  lines.push(`Please provide a structured, executive-ready response covering:`);
  lines.push(`1. Executive Summary & Health Score: High-level diagnosis of operational and financial performance.`);
  lines.push(`2. Key Strengths & Growth Indicators: Positive trends, throughput efficiency, and high-performing areas.`);
  lines.push(`3. Vulnerabilities, Bottlenecks & Variances: Anomalies, cost overruns, scrap/waste, delayed receivables, or machine downtimes.`);
  lines.push(`4. 3-5 Prioritized Strategic Actions: Concrete, ROI-focused steps management should execute immediately.`);

  return lines.join('\n');
}

/**
 * Copies the prompt to clipboard and opens ChatGPT with the prompt in the URL param
 */
export function analyzeReportWithChatGPT(options) {
  const { summaryCards = [], tableRows = [] } = options || {};

  if ((!summaryCards || summaryCards.length === 0) && (!tableRows || tableRows.length === 0)) {
    alert('No report data available to analyze. Please load or refresh the report first.');
    return;
  }

  const prompt = buildReportAnalysisPrompt(options);

  // Copy full prompt text to clipboard as a helpful backup
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(prompt).catch(() => {});
  }

  // OpenAI ChatGPT query parameter URL
  const chatGptUrl = `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`;

  // Open in a new tab
  if (typeof window !== 'undefined') {
    window.open(chatGptUrl, '_blank', 'noopener,noreferrer');
  }
}

