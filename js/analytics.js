const ANALYTICS_STORAGE_KEY = 'tourbus_click_analytics';
const ANALYTICS_MONTHLY_STORAGE_KEY = 'tourbus_click_analytics_monthly';

function loadAnalyticsCounts() {
  try {
    return JSON.parse(localStorage.getItem(ANALYTICS_STORAGE_KEY)) || {};
  } catch (error) {
    console.warn('Unable to load analytics counts:', error);
    return {};
  }
}

function loadAnalyticsMonthly() {
  try {
    return JSON.parse(localStorage.getItem(ANALYTICS_MONTHLY_STORAGE_KEY)) || {};
  } catch (error) {
    console.warn('Unable to load monthly analytics counts:', error);
    return {};
  }
}

function saveAnalyticsCounts(counts) {
  localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(counts));
}

function clearAnalyticsCounts() {
  saveAnalyticsCounts({});
  localStorage.setItem(ANALYTICS_MONTHLY_STORAGE_KEY, JSON.stringify({}));
  renderAnalytics([], {}, getLast3MonthKeys());
}

function formatCount(value) {
  const safeValue = Number(value) || 0;
  return safeValue.toLocaleString('en-IN');
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Returns the last three months (oldest first) as { key: "YYYY-MM", label: "May 2026" }.
function getLast3MonthKeys() {
  const keys = [];
  const now = new Date();
  for (let i = 2; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('en-IN', { month: 'short', year: 'numeric' })
    });
  }
  return keys;
}

// Builds a vertical bar chart of total visits per month across all buses.
function renderMonthlyChart(monthKeys, monthTotals) {
  const max = Math.max(1, ...monthTotals);
  const bars = monthKeys.map((m, i) => {
    const value = monthTotals[i];
    const heightPct = Math.round((value / max) * 100);
    return `
      <div class="month-bar-col">
        <div class="month-bar-track">
          <div class="month-bar-fill" style="height:${value > 0 ? Math.max(heightPct, 4) : 0}%">
            <span class="month-bar-value">${formatCount(value)}</span>
          </div>
        </div>
        <div class="month-bar-label">${escapeHtml(m.label)}</div>
      </div>
    `;
  }).join('');

  return `<div class="month-chart" role="img" aria-label="Total bus card views for the last three months">${bars}</div>`;
}

// Builds a small inline sparkline (3 mini bars) for a single bus row.
function renderSparkline(values) {
  const max = Math.max(1, ...values);
  const bars = values.map(v => {
    const heightPct = v > 0 ? Math.max(Math.round((v / max) * 100), 8) : 0;
    return `<span class="spark-bar" style="height:${heightPct}%" title="${formatCount(v)}"></span>`;
  }).join('');
  return `<span class="spark">${bars}</span>`;
}

function renderAnalytics(buses, detail, monthKeys) {
  const summaryEl = document.getElementById('analytics-summary');
  const chartWrapper = document.getElementById('analytics-chart-wrapper');
  const tableWrapper = document.getElementById('analytics-table-wrapper');

  if (!summaryEl || !tableWrapper) return;

  const rows = buses.map(bus => {
    const busDetail = detail[bus.id] || {};
    const monthly = busDetail.monthly || {};
    const months = monthKeys.map(m => Number(monthly[m.key]) || 0);
    const last3Total = months.reduce((sum, v) => sum + v, 0);
    return {
      id: bus.id,
      operator: bus.operator,
      district: bus.district,
      months,
      last3Total,
      allTime: Number(busDetail.clicks) || 0
    };
  });

  const monthTotals = monthKeys.map((m, i) => rows.reduce((sum, row) => sum + row.months[i], 0));
  const last3Grand = monthTotals.reduce((sum, v) => sum + v, 0);
  const allTimeGrand = rows.reduce((sum, row) => sum + row.allTime, 0);
  const activeBuses = rows.filter(row => row.last3Total > 0).length;

  summaryEl.innerHTML = last3Grand === 0
    ? '<strong>No visits recorded in the last 3 months.</strong> Open bus cards on the home page to start tracking monthly views here.'
    : `<strong>Last 3 months:</strong> ${formatCount(last3Grand)} views · <strong>Buses viewed:</strong> ${activeBuses} · <strong>All-time views:</strong> ${formatCount(allTimeGrand)}`;

  if (chartWrapper) {
    chartWrapper.innerHTML = renderMonthlyChart(monthKeys, monthTotals);
  }

  if (rows.length === 0) {
    tableWrapper.innerHTML = '<div class="empty-state"><h3>No buses available</h3></div>';
    return;
  }

  // Most-viewed (last 3 months) first, then all-time, then alphabetical.
  const sortedRows = rows.sort((a, b) =>
    b.last3Total - a.last3Total ||
    b.allTime - a.allTime ||
    a.operator.localeCompare(b.operator)
  );

  const monthHeaders = monthKeys.map(m => `<th>${escapeHtml(m.label)}</th>`).join('');

  const tableHtml = `
    <table class="analytics-table">
      <thead>
        <tr>
          <th>Rank</th>
          <th>Bus Service</th>
          <th>District</th>
          ${monthHeaders}
          <th>Trend</th>
          <th>3-Mo Total</th>
          <th>All-Time</th>
        </tr>
      </thead>
      <tbody>
        ${sortedRows.map((row, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(row.operator)} <span class="card-id">${escapeHtml(row.id)}</span></td>
            <td>${escapeHtml(row.district)}</td>
            ${row.months.map(v => `<td>${formatCount(v)}</td>`).join('')}
            <td>${renderSparkline(row.months)}</td>
            <td><strong>${formatCount(row.last3Total)}</strong></td>
            <td>${formatCount(row.allTime)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  tableWrapper.innerHTML = tableHtml;
}

async function initAnalytics() {
  const monthKeys = getLast3MonthKeys();

  const resetButton = document.getElementById('reset-analytics');
  if (resetButton) {
    resetButton.addEventListener('click', () => {
      clearAnalyticsCounts();
    });
  }

  try {
    let buses = [];
    let detail = {};

    if (typeof isFirebaseReady === 'function' && isFirebaseReady()) {
      try {
        buses = await fetchAllFirebaseBuses();
        detail = await fetchAnalyticsDetailFromFirestore();
      } catch (firebaseError) {
        console.warn('Firebase analytics fetch failed:', firebaseError);
      }
    }

    // Fall back to buses.json + local storage when Firebase is unavailable.
    if (buses.length === 0) {
      const response = await fetch('../buses.json');
      const data = await response.json();
      (data.districts || []).forEach(district => {
        if (Array.isArray(district.buses)) {
          district.buses.forEach(bus => {
            buses.push({
              ...bus,
              district: district.name,
              districtId: district.id
            });
          });
        }
      });
    }

    if (!detail || Object.keys(detail).length === 0) {
      const counts = loadAnalyticsCounts();
      const monthly = loadAnalyticsMonthly();
      const ids = new Set([...Object.keys(counts), ...Object.keys(monthly)]);
      ids.forEach(id => {
        detail[id] = {
          clicks: Number(counts[id]) || 0,
          monthly: monthly[id] || {}
        };
      });
    }

    renderAnalytics(buses, detail, monthKeys);
  } catch (error) {
    const summaryEl = document.getElementById('analytics-summary');
    const tableWrapper = document.getElementById('analytics-table-wrapper');
    if (summaryEl) {
      summaryEl.innerHTML = '<strong>Unable to load analytics data.</strong> Please reload and try again.';
    }
    if (tableWrapper) {
      tableWrapper.innerHTML = '<div class="empty-state"><h3>Error loading buses.json</h3></div>';
    }
    console.error('Analytics page failed to load:', error);
  }
}

window.initAnalytics = initAnalytics;
