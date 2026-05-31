// ============================================
// APP STATE & DOM REFERENCES
// ============================================

let currentResults = [];
let currentSort = 'rating';

// DOM elements (lazy loaded in initApp)
let districtSelect, typeFilter, availabilityFilter, seatsFilter;
let searchBtn, resetBtn, cardsGrid, emptyState, landingState;
let resultsHeader, sortBtns, modalOverlay, modalContent;

// ============================================
// INITIALIZATION
// ============================================

async function initApp() {
  console.log('🚀 Initializing app...');
  
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
  }
  
  // Load data
  console.log('Loading bus data...');
  await loadBusData();
  
  // Check if data loaded successfully
  if (!window.busData || window.busData.length === 0) {
    console.error('❌ No data loaded! Check console for errors.');
    console.error('window.busData:', window.busData);
    
    // Show error to user
    const landingState = document.getElementById('landing-state');
    if (landingState) {
      landingState.innerHTML = `
        <div class="landing-state">
          <div class="landing-icon">❌</div>
          <h3>Error Loading Data</h3>
          <p>Unable to load bus data from buses.json</p>
          <p style="font-size: 12px; color: #666;">Check browser console (F12) for details. Make sure buses.json is in the same directory as index.html</p>
          <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; cursor: pointer; background: #E8521A; color: white; border: none; border-radius: 8px;">Retry</button>
        </div>
      `;
    }
    return;
  }
  
  console.log(`✓ Data ready: ${window.busData.length} districts`);
  
  // Get DOM elements
  getDOMElements();
  
  // Setup UI
  populateDistricts();
  setupEventListeners();
  
  // Show all buses by default
  currentResults = sortResults(getAllBuses());
  displayResults(currentResults);
  updateUIState(currentResults.length > 0);
  
  console.log('✓ App initialized successfully!');
}

function getDOMElements() {
  districtSelect = document.getElementById('district-select');
  typeFilter = document.getElementById('type-filter');
  availabilityFilter = document.getElementById('availability-filter');
  seatsFilter = document.getElementById('seats-filter');
  searchBtn = document.getElementById('search-btn');
  resetBtn = document.getElementById('reset-btn');
  cardsGrid = document.getElementById('cards-grid');
  emptyState = document.getElementById('empty-state');
  landingState = document.getElementById('landing-state');
  resultsHeader = document.getElementById('results-header');
  sortBtns = document.querySelectorAll('.sort-btn');
  modalOverlay = document.getElementById('modal-overlay');
  modalContent = document.getElementById('modal-content');
}

const ANALYTICS_STORAGE_KEY = 'tourbus_click_analytics';

function loadAnalyticsCounts() {
  try {
    return JSON.parse(localStorage.getItem(ANALYTICS_STORAGE_KEY)) || {};
  } catch (error) {
    console.warn('Unable to parse analytics data:', error);
    return {};
  }
}

function saveAnalyticsCounts(counts) {
  localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(counts));
}

function trackCardClick(busId) {
  const counts = loadAnalyticsCounts();
  counts[busId] = (counts[busId] || 0) + 1;
  saveAnalyticsCounts(counts);
  console.log(`Analytics: ${busId} clicked ${counts[busId]} time(s)`);
}


// ============================================
// DISTRICT POPULATION
// ============================================

function populateDistricts() {
  if (!window.busData || window.busData.length === 0) {
    console.error('❌ No data available to populate districts');
    return;
  }
  
  console.log(`Populating ${window.busData.length} districts...`);
  
  window.busData.forEach(district => {
    const option = document.createElement('option');
    option.value = district.id;
    option.textContent = district.name;
    districtSelect.appendChild(option);
  });
  
  console.log('✓ Districts populated');
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
  searchBtn.addEventListener('click', performSearch);
  resetBtn.addEventListener('click', resetFilters);
  
  sortBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      sortBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentSort = this.dataset.sort;
      displayResults(sortResults(currentResults));
    });
  });
}

// ============================================
// SEARCH & FILTER
// ============================================

function performSearch() {
  const districtId = districtSelect.value;
  const busType = typeFilter.value;
  const availability = availabilityFilter.value;
  const minSeats = seatsFilter.value ? parseInt(seatsFilter.value) : 0;

  let results = getAllBuses();

  // Apply filters
  if (districtId) {
    results = results.filter(bus => bus.districtId === districtId);
  }

  if (busType) {
    results = results.filter(bus => bus.type === busType);
  }

  if (availability !== '') {
    const isAvailable = availability === 'true';
    results = results.filter(bus => bus.available === isAvailable);
  }

  if (minSeats > 0) {
    results = results.filter(bus => bus.seats >= minSeats);
  }

  currentResults = sortResults(results);
  displayResults(currentResults);
  updateUIState(results.length > 0);
}

function sortResults(buses) {
  const sorted = [...buses];
  
  switch(currentSort) {
    case 'rating':
      sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      break;
    case 'price-asc':
      sorted.sort((a, b) => a.perDayRent - b.perDayRent);
      break;
    case 'price-desc':
      sorted.sort((a, b) => b.perDayRent - a.perDayRent);
      break;
    case 'seats':
      sorted.sort((a, b) => b.seats - a.seats);
      break;
    default:
      break;
  }
  
  return sorted;
}

function resetFilters() {
  districtSelect.value = '';
  typeFilter.value = '';
  availabilityFilter.value = '';
  seatsFilter.value = '';
  currentResults = [];
  cardsGrid.innerHTML = '';
  emptyState.style.display = 'none';
  landingState.style.display = 'flex';
  resultsHeader.style.display = 'none';
  sortBtns.forEach(btn => btn.classList.remove('active'));
  const ratingBtn = document.querySelector('[data-sort="rating"]');
  if (ratingBtn) ratingBtn.classList.add('active');
  currentSort = 'rating';
}

// ============================================
// DISPLAY RESULTS
// ============================================

function displayResults(buses) {
  cardsGrid.innerHTML = '';
  
  if (!buses || buses.length === 0) {
    return;
  }
  
  buses.forEach(bus => {
    const card = createBusCard(bus);
    cardsGrid.appendChild(card);
  });

  // Update stats
  const totalBuses = getAllBuses();
  document.getElementById('total-buses').textContent = totalBuses.length;
  document.getElementById('available-count').textContent = totalBuses.filter(b => b.available).length;
  document.getElementById('results-title').textContent = `Found ${buses.length} Bus${buses.length !== 1 ? 'es' : ''}`;
}

function createBusCard(bus) {
  const card = document.createElement('div');
  card.className = 'bus-card';
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', `View details for ${bus.operator}`);

  const rating = bus.rating ? `${bus.rating}/5.0` : 'N/A';
  const price = `₹${bus.perDayRent.toLocaleString('en-IN')}`;
  const amenities = bus.amenities && bus.amenities.length > 0
    ? bus.amenities.slice(0, 3).map(a => `<span class="amenity-tag">${a}</span>`).join('')
    : '<span class="amenity-tag">Details available</span>';

  const statusTags = [];
  if (bus.verified) {
    statusTags.push('<span class="status-tag verified">✅ </span>');
  }

  if (bus.paid) {
    statusTags.push('<span class="status-tag paid-customer">💳 </span>');
  }

  const statusMarkup = statusTags.length ? `<div class="status-tags">${statusTags.join('')}</div>` : '';

  card.innerHTML = `
    <div class="card-header">
      <div class="card-top-row">
        <span class="bus-icon">${bus.busImage || '🚌'}</span>
        <span class="availability-badge ${bus.available ? 'available' : 'unavailable'}">
          ${bus.available ? 'Available' : 'Unavailable'}
        </span>
      </div>
      <div class="operator-meta">
        <h3 class="card-operator">${bus.operator}</h3>
        ${statusMarkup}
      </div>
      <div class="card-type-row">
        <span class="type-tag">${bus.type}</span>
        <span class="card-id">${bus.id}</span>
      </div>
      <div class="card-rating">⭐ ${rating}</div>
    </div>
    <div class="card-body">
      <div class="info-row">
        <span class="info-icon">📍</span>
        <span class="info-text">${bus.location}</span>
      </div>
      <div class="info-row">
        <span class="info-icon">☎️</span>
        <span class="info-text">${bus.contact}</span>
      </div>
      <div class="card-divider"></div>
      <div class="card-stats-row">
        <div class="card-stat">
          <div class="stat-val">${bus.seats}</div>
          <div class="stat-lbl">Seats</div>
        </div>
        <div class="card-stat">
          <div class="stat-val">${price}</div>
          <div class="stat-lbl">Per Day</div>
        </div>
      </div>
      <div class="amenities-row">
        ${amenities}
      </div>
    </div>
    <div class="card-footer">
      <button class="btn-details" type="button">View Details</button>
      <a class="btn-call" href="tel:${bus.contact.replace(/\s/g, '')}" onclick="event.stopPropagation()">Call</a>
    </div>
  `;

  card.addEventListener('click', () => {
    trackCardClick(bus.id);
    showBusModal(bus);
  });
  card.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      trackCardClick(bus.id);
      showBusModal(bus);
    }
  });
  card.querySelector('.btn-details').addEventListener('click', event => {
    event.stopPropagation();
    trackCardClick(bus.id);
    showBusModal(bus);
  });

  return card;
}

// ============================================
// MODAL
// ============================================

function showBusModal(bus) {
  if (!modalContent) return;

  const rating = bus.rating ? `${bus.rating}/5.0` : 'N/A';
  const cleanPhone = bus.contact.replace(/\s/g, '');
  
  modalContent.innerHTML = `
    <div class="modal-hero">
      <div class="modal-hero-top">
        <span class="modal-bus-icon">${bus.busImage || '🚌'}</span>
        <div>
          <h2 class="modal-operator">${bus.operator}</h2>
          <span class="modal-type">${bus.type}</span>
          <div class="modal-rating">⭐ ${rating}</div>
        </div>
      </div>
      <div class="modal-stats">
        <div class="modal-stat">
          <div class="val">${bus.seats}</div>
          <div class="lbl">Seats</div>
        </div>
        <div class="modal-stat">
          <div class="val">₹${bus.perDayRent.toLocaleString('en-IN')}</div>
          <div class="lbl">Per Day</div>
        </div>
        <div class="modal-stat">
          <div class="val">${bus.available ? 'Yes' : 'No'}</div>
          <div class="lbl">Available</div>
        </div>
      </div>
    </div>
    <div class="modal-body">
      <h4 class="modal-section-title">Location & Contact</h4>
      <div class="modal-info-item">
        <span class="modal-info-icon">📍</span>
        <div>
          <div class="modal-info-label">Pickup Area</div>
          <div class="modal-info-value">${bus.location}</div>
        </div>
      </div>
      <div class="modal-info-item">
        <span class="modal-info-icon">☎️</span>
        <div>
          <div class="modal-info-label">Phone</div>
          <div class="modal-info-value"><a href="tel:${cleanPhone}">${bus.contact}</a></div>
        </div>
      </div>
      <div class="modal-info-item">
        <span class="modal-info-icon">✉️</span>
        <div>
          <div class="modal-info-label">Email</div>
          <div class="modal-info-value"><a href="mailto:${bus.email}">${bus.email}</a></div>
        </div>
      </div>

      <h4 class="modal-section-title">Amenities</h4>
      <div class="modal-amenities">
        ${bus.amenities && bus.amenities.length > 0
          ? bus.amenities.map(a => `<span class="modal-amenity">${a}</span>`).join('')
          : '<span class="modal-amenity">No amenities listed</span>'}
      </div>

      <div class="modal-actions">
        <a class="modal-btn-primary" href="mailto:${bus.email}?subject=Bus Booking Inquiry - ${encodeURIComponent(bus.operator)}">Send Inquiry</a>
        <a class="modal-btn-secondary" href="tel:${cleanPhone}">Call Now</a>
      </div>
    </div>
  `;
  
  if (modalOverlay) {
    modalOverlay.classList.add('open');
  }
}

function closeModal() {
  if (modalOverlay) {
    modalOverlay.classList.remove('open');
  }
}

// ============================================
// QUICK SELECT
// ============================================

function quickSelect(districtId) {
  if (!districtSelect) return;
  districtSelect.value = districtId;
  performSearch();
}

// ============================================
// UI STATE
// ============================================

function updateUIState(hasResults) {
  if (hasResults) {
    emptyState.style.display = 'none';
    landingState.style.display = 'none';
    resultsHeader.style.display = 'flex';
  } else {
    emptyState.style.display = 'flex';
    landingState.style.display = 'none';
    resultsHeader.style.display = 'none';
  }
}

// ============================================
// START APP
// ============================================

// Start initialization when script loads
initApp().catch(error => {
  console.error('❌ Failed to initialize app:', error);
  console.error('Stack trace:', error.stack);
  
  // Display error in UI
  const landingState = document.getElementById('landing-state');
  if (landingState) {
    landingState.innerHTML = `
      <div class="landing-state">
        <div class="landing-icon">⚠️</div>
        <h3>Application Error</h3>
        <p>Failed to initialize application</p>
        <p style="font-size: 12px; color: #666; word-break: break-word;">Error: ${error.message}</p>
        <p style="font-size: 12px; color: #666;">Check browser console (F12) for full details</p>
        <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; cursor: pointer; background: #E8521A; color: white; border: none; border-radius: 8px;">Retry</button>
      </div>
    `;
  }
});
