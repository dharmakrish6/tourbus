const ANALYTICS_STORAGE_KEY = 'tourbus_click_analytics';

function loadAnalyticsCounts() {
  try {
    return JSON.parse(localStorage.getItem(ANALYTICS_STORAGE_KEY)) || {};
  } catch (error) {
    console.warn('Unable to load analytics counts:', error);
    return {};
  }
}

function saveAnalyticsCounts(counts) {
  localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(counts));
}

function clearAnalyticsCounts() {
  saveAnalyticsCounts({});
  renderAnalytics([], {});
}

function formatCount(value) {
  const safeValue = Number(value) || 0;
  return safeValue.toLocaleString('en-IN');
}

function renderAnalytics(buses, counts) {
  const summaryEl = document.getElementById('analytics-summary');
  const tableWrapper = document.getElementById('analytics-table-wrapper');

  if (!summaryEl || !tableWrapper) return;

  const rows = buses.map(bus => ({
    id: bus.id,
    operator: bus.operator,
    district: bus.district,
    clicks: counts[bus.id] || 0
  }));

  const totalClicks = rows.reduce((sum, row) => sum + row.clicks, 0);
  const clickedBusCount = rows.filter(row => row.clicks > 0).length;

  summaryEl.innerHTML = totalClicks === 0
    ? '<strong>No clicks recorded yet.</strong> Use the home page to open bus cards and track activity here.'
    : `<strong>Total clicks:</strong> ${formatCount(totalClicks)} · <strong>Buses clicked:</strong> ${clickedBusCount}`;

  if (rows.length === 0) {
    tableWrapper.innerHTML = '<div class="empty-state"><h3>No buses available</h3></div>';
    return;
  }

  const sortedRows = rows.sort((a, b) => b.clicks - a.clicks || a.operator.localeCompare(b.operator));

  const tableHtml = `
    <table class="analytics-table">
      <thead>
        <tr>
          <th>Rank</th>
          <th>Bus</th>
          <th>District</th>
          <th>Clicks</th>
        </tr>
      </thead>
      <tbody>
        ${sortedRows.map((row, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${row.operator} <span class="card-id">${row.id}</span></td>
            <td>${row.district}</td>
            <td>${formatCount(row.clicks)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  tableWrapper.innerHTML = tableHtml;
}

async function initAnalytics() {
  const resetButton = document.getElementById('reset-analytics');
  if (resetButton) {
    resetButton.addEventListener('click', () => {
      clearAnalyticsCounts();
    });
  }

  try {
    let buses = [];
    let counts = loadAnalyticsCounts();

    if (typeof isFirebaseReady === 'function' && isFirebaseReady()) {
      try {
        buses = await fetchAllFirebaseBuses();
        counts = await fetchAnalyticsCountsFromFirestore();
      } catch (firebaseError) {
        console.warn('Firebase analytics fetch failed:', firebaseError);
      }
    }

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

    renderAnalytics(buses, counts);
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
