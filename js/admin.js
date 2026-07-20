const ADMIN_STORAGE_KEY = 'tourbus_added_buses';

// Overrides for districts whose id in buses.json doesn't match a plain slug of the name.
const DISTRICT_ID_OVERRIDES = {
  'Tiruchirappalli': 'trichy',
  'Nilgiris': 'ooty',
  'Kanchipuram': 'kancheepuram',
  'Kanniyakumari': 'kanyakumari',
  'Viluppuram': 'villupuram'
};

function loadAdminBuses() {
  try {
    return JSON.parse(localStorage.getItem(ADMIN_STORAGE_KEY)) || [];
  } catch (error) {
    console.warn('Unable to parse admin bus data:', error);
    return [];
  }
}

function saveAdminBuses(buses) {
  localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(buses));
}

function computeBusId(districtName, phone) {
  const code = (districtName || '').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase();
  const lastThreeDigits = (phone || '').replace(/\D/g, '').slice(-3);
  if (!code || lastThreeDigits.length < 3) return '';
  return `${code}${lastThreeDigits}`;
}

function slugify(text) {
  return text.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '');
}

function showAdminMessage(message, type = 'success') {
  const messageEl = document.getElementById('admin-message');
  if (!messageEl) return;
  messageEl.textContent = message;
  messageEl.className = `admin-message ${type}`;
}

function clearAdminMessage() {
  const messageEl = document.getElementById('admin-message');
  if (!messageEl) return;
  messageEl.textContent = '';
  messageEl.className = 'admin-message';
}

// ============================================
// ADD / EDIT FORM
// ============================================

const ADMIN_FORM_DEFAULT_TITLE = 'Add New Bus';
const ADMIN_FORM_DEFAULT_DESC = "Fill in the details below. New entries are saved to Firestore and merged into the home bus list.";

// Fills the Add/Edit form with an existing bus's details and switches it
// into edit mode (tracked via the hidden #edit-bus-id field).
function populateFormForEdit(bus) {
  document.getElementById('district-name').value = bus.district || '';
  document.getElementById('district-id').value = bus.districtId || '';
  document.getElementById('bus-id').value = bus.id || '';
  document.getElementById('operator').value = bus.operator || '';
  document.getElementById('type').value = bus.type || '';
  document.getElementById('location').value = bus.location || '';
  document.getElementById('contact').value = bus.contact || '';
  document.getElementById('email').value = bus.email || '';
  document.getElementById('seats').value = bus.seats || '';
  document.getElementById('rent').value = bus.perDayRent || '';
  document.getElementById('amenities').value = Array.isArray(bus.amenities) ? bus.amenities.join(', ') : (bus.amenities || '');
  document.getElementById('bus-image').value = bus.busImage || '';
  document.getElementById('rating').value = bus.rating || '';
  document.getElementById('available').checked = !!bus.available;
  document.getElementById('verified').checked = !!bus.verified;
  document.getElementById('paid').checked = !!bus.paid;

  document.getElementById('edit-bus-id').value = bus.id;

  const formTitleEl = document.getElementById('admin-form-title');
  const formDescEl = document.getElementById('admin-form-desc');
  const submitBtn = document.getElementById('admin-form-submit');
  const cancelEditBtn = document.getElementById('cancel-edit');
  if (formTitleEl) formTitleEl.textContent = 'Edit Bus';
  if (formDescEl) formDescEl.textContent = `Editing "${bus.operator}" (${bus.id}). Saving updates this bus everywhere it's listed.`;
  if (submitBtn) submitBtn.textContent = 'Update Bus';
  if (cancelEditBtn) cancelEditBtn.style.display = '';

  clearAdminMessage();
  const formCard = document.getElementById('admin-form-card');
  if (formCard) formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Resets the form back to "Add New Bus" mode, clearing edit state.
function resetToAddMode() {
  const form = document.getElementById('admin-form');
  if (form) form.reset();

  document.getElementById('edit-bus-id').value = '';
  document.getElementById('district-id').value = '';
  document.getElementById('bus-id').value = '';
  document.getElementById('available').checked = true;
  document.getElementById('verified').checked = true;
  document.getElementById('paid').checked = true;

  const formTitleEl = document.getElementById('admin-form-title');
  const formDescEl = document.getElementById('admin-form-desc');
  const submitBtn = document.getElementById('admin-form-submit');
  const cancelEditBtn = document.getElementById('cancel-edit');
  if (formTitleEl) formTitleEl.textContent = ADMIN_FORM_DEFAULT_TITLE;
  if (formDescEl) formDescEl.textContent = ADMIN_FORM_DEFAULT_DESC;
  if (submitBtn) submitBtn.textContent = 'Save Bus';
  if (cancelEditBtn) cancelEditBtn.style.display = 'none';
}

function initAdmin() {
  const form = document.getElementById('admin-form');
  const clearButton = document.getElementById('clear-additions');
  const cancelEditButton = document.getElementById('cancel-edit');
  const statusText = document.getElementById('admin-status');

  if (!form) return;

  const districtNameSelect = document.getElementById('district-name');
  const districtIdInput = document.getElementById('district-id');
  const busIdInput = document.getElementById('bus-id');
  const contactInput = document.getElementById('contact');
  const editBusIdInput = document.getElementById('edit-bus-id');

  const refreshBusId = () => {
    // Don't clobber the original id while editing an existing bus.
    if (!busIdInput || (editBusIdInput && editBusIdInput.value.trim())) return;
    busIdInput.value = computeBusId(districtNameSelect ? districtNameSelect.value : '', contactInput ? contactInput.value : '');
  };

  if (districtNameSelect && districtIdInput) {
    districtNameSelect.addEventListener('change', () => {
      const districtName = districtNameSelect.value;
      districtIdInput.value = districtName
        ? (DISTRICT_ID_OVERRIDES[districtName] || slugify(districtName))
        : '';
      refreshBusId();
    });
  }

  if (contactInput) {
    contactInput.addEventListener('input', refreshBusId);
  }

  if (statusText) {
    statusText.textContent = (typeof isFirebaseReady === 'function' && isFirebaseReady())
      ? 'Connected to Firestore. New buses will be saved to Firebase.'
      : 'Firebase is not configured. New buses save locally only.';
  }

  if (cancelEditButton) {
    cancelEditButton.addEventListener('click', () => {
      resetToAddMode();
      clearAdminMessage();
    });
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    clearAdminMessage();

    const isEditing = !!(editBusIdInput && editBusIdInput.value.trim());

    const districtName = document.getElementById('district-name').value.trim();
    const districtId = document.getElementById('district-id').value.trim() || slugify(districtName);
    const id = isEditing ? editBusIdInput.value.trim() : document.getElementById('bus-id').value.trim();
    const operator = document.getElementById('operator').value.trim();
    const type = document.getElementById('type').value;
    const location = document.getElementById('location').value.trim();
    const contact = document.getElementById('contact').value.trim();
    const email = document.getElementById('email').value.trim();
    const seats = parseInt(document.getElementById('seats').value, 10);
    const perDayRent = parseInt(document.getElementById('rent').value, 10);
    const amenities = document.getElementById('amenities').value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
    const busImage = document.getElementById('bus-image').value.trim() || '🚌';
    const rating = parseFloat(document.getElementById('rating').value) || 0;
    const available = document.getElementById('available').checked;
    const verified = document.getElementById('verified').checked;
    const paid = document.getElementById('paid').checked;

    if (!districtName || !districtId || !id || !operator || !type || !location || !contact || !email || !seats || isNaN(perDayRent)) {
      showAdminMessage('Please fill in all required fields before saving.', 'error');
      return;
    }

    const existing = loadAdminBuses();
    if (!isEditing && existing.some(bus => bus.id === id)) {
      showAdminMessage('A bus with this ID already exists in added entries.', 'error');
      return;
    }

    const busPayload = {
      id,
      operator,
      type,
      location,
      contact,
      email,
      seats,
      perDayRent,
      amenities,
      busImage,
      rating,
      available,
      verified,
      paid,
      districtId,
      district: districtName
    };

    if (isEditing) {
      // Editing an existing catalog bus always goes through Firestore --
      // there's no meaningful way to "edit" a static buses.json entry
      // locally, since Firestore overrides are what make it editable at all.
      if (typeof isFirebaseReady !== 'function' || !isFirebaseReady()) {
        showAdminMessage('Editing requires Firebase to be configured.', 'error');
        return;
      }
      saveBusToFirestore(busPayload)
        .then(() => {
          showAdminMessage(`"${operator}" was updated.`, 'success');
          resetToAddMode();
          if (typeof loadBusManagerData === 'function') loadBusManagerData();
        })
        .catch(firebaseError => {
          console.error('Failed to update bus in Firestore:', firebaseError);
          showAdminMessage('Failed to update bus. Please try again.', 'error');
        });
      return;
    }

    if (typeof isFirebaseReady === 'function' && isFirebaseReady()) {
      saveBusToFirestore(busPayload)
        .then(savedBus => {
          showAdminMessage(`Bus saved to Firestore with ID ${savedBus.id}.`, 'success');
          resetToAddMode();
          if (typeof loadBusManagerData === 'function') loadBusManagerData();
        })
        .catch(firebaseError => {
          console.error('Failed to save bus to Firestore:', firebaseError);
          const updatedLocal = [...existing, busPayload];
          saveAdminBuses(updatedLocal);
          const message = firebaseError && firebaseError.code === 'permission-denied'
            ? 'Firestore permission denied. Update your Firestore rules to allow writes from this app.'
            : 'Firestore save failed; bus stored locally instead.';
          showAdminMessage(message, 'error');
        });
    } else {
      const updatedLocal = [...existing, busPayload];
      saveAdminBuses(updatedLocal);
      showAdminMessage('New bus details saved locally. Open home to see the updated list.', 'success');
      resetToAddMode();
    }
  });

  if (clearButton) {
    clearButton.addEventListener('click', () => {
      saveAdminBuses([]);
      showAdminMessage('Added bus entries cleared.', 'success');
    });
  }
}

// ============================================
// MANAGE BUSES: list, filter, edit, soft delete/restore
// ============================================

let busManagerAllBuses = [];

async function fetchBusesJsonBaseForAdmin() {
  const response = await fetch('../buses.json');
  if (!response.ok) {
    throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
  }
  const data = await response.json();
  return data.districts || [];
}

function escapeHtmlForAdmin(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function busManagerStatusBadge(bus) {
  if (bus.deleted) return '<span class="status-badge status-deleted">Deleted</span>';
  return bus.available
    ? '<span class="status-badge status-available">Available</span>'
    : '<span class="status-badge status-unavailable">Unavailable</span>';
}

function renderBusManagerTable(buses) {
  const wrapper = document.getElementById('bus-manager-table-wrapper');
  const summaryEl = document.getElementById('bus-manager-summary');
  if (!wrapper) return;

  if (summaryEl) {
    summaryEl.innerHTML = `<strong>${buses.length}</strong> bus${buses.length === 1 ? '' : 'es'} matching filters, out of <strong>${busManagerAllBuses.length}</strong> total.`;
  }

  if (buses.length === 0) {
    wrapper.innerHTML = '<div class="empty-state"><h3>No buses match these filters</h3></div>';
    return;
  }

  const sorted = [...buses].sort((a, b) => (a.operator || '').localeCompare(b.operator || ''));

  wrapper.innerHTML = `
    <table class="analytics-table">
      <thead>
        <tr>
          <th>Bus</th>
          <th>District</th>
          <th>Type</th>
          <th>Seats</th>
          <th>Per Day</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${sorted.map(bus => `
          <tr data-bus-id="${escapeHtmlForAdmin(bus.id)}">
            <td>${escapeHtmlForAdmin(bus.operator)} <span class="card-id">${escapeHtmlForAdmin(bus.id)}</span></td>
            <td>${escapeHtmlForAdmin(bus.district)}</td>
            <td>${escapeHtmlForAdmin(bus.type)}</td>
            <td>${escapeHtmlForAdmin(bus.seats)}</td>
            <td>₹${Number(bus.perDayRent || 0).toLocaleString('en-IN')}</td>
            <td>${busManagerStatusBadge(bus)}</td>
            <td class="bus-manager-actions">
              <button type="button" class="btn-reset btn-sm" data-action="edit">Edit</button>
              ${bus.deleted
                ? '<button type="button" class="btn-reset btn-sm" data-action="restore">Restore</button>'
                : '<button type="button" class="btn-reset btn-sm btn-danger" data-action="delete">Delete</button>'}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  wrapper.querySelectorAll('button[data-action]').forEach(button => {
    button.addEventListener('click', () => {
      const row = button.closest('tr');
      const busId = row ? row.getAttribute('data-bus-id') : null;
      const bus = busManagerAllBuses.find(b => String(b.id) === busId);
      if (!bus) return;

      const action = button.getAttribute('data-action');
      if (action === 'edit') populateFormForEdit(bus);
      else if (action === 'delete') handleBusDelete(bus);
      else if (action === 'restore') handleBusRestore(bus);
    });
  });
}

function applyBusManagerFilters() {
  const search = (document.getElementById('bus-filter-search').value || '').trim().toLowerCase();
  const district = document.getElementById('bus-filter-district').value;
  const type = document.getElementById('bus-filter-type').value;
  const status = document.getElementById('bus-filter-status').value;

  const filtered = busManagerAllBuses.filter(bus => {
    if (status === 'active' && bus.deleted) return false;
    if (status === 'deleted' && !bus.deleted) return false;
    if (district && bus.districtId !== district) return false;
    if (type && bus.type !== type) return false;
    if (search) {
      const haystack = `${bus.operator || ''} ${bus.id || ''}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });

  renderBusManagerTable(filtered);
}

function populateBusManagerDistrictFilter() {
  const select = document.getElementById('bus-filter-district');
  if (!select) return;
  const current = select.value;

  const districts = new Map();
  busManagerAllBuses.forEach(bus => {
    if (bus.districtId && !districts.has(bus.districtId)) {
      districts.set(bus.districtId, bus.district || bus.districtId);
    }
  });

  const sortedDistricts = [...districts.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  select.innerHTML = '<option value="">All Districts</option>' +
    sortedDistricts.map(([id, name]) => `<option value="${escapeHtmlForAdmin(id)}">${escapeHtmlForAdmin(name)}</option>`).join('');
  select.value = current;
}

async function handleBusDelete(bus) {
  const confirmed = window.confirm(
    `Delete "${bus.operator}" (${bus.id})?\n\nThis hides it from the live site immediately. It's a soft delete -- you can restore it anytime from the "Deleted only" filter.`
  );
  if (!confirmed) return;

  try {
    await softDeleteBusInFirestore(bus);
    showAdminMessage(`"${bus.operator}" was deleted (hidden from the site).`, 'success');
    await loadBusManagerData();
  } catch (error) {
    console.error('Failed to delete bus:', error);
    showAdminMessage('Failed to delete bus. Please try again.', 'error');
  }
}

async function handleBusRestore(bus) {
  const confirmed = window.confirm(`Restore "${bus.operator}" (${bus.id})? It will become visible on the live site again.`);
  if (!confirmed) return;

  try {
    await restoreBusInFirestore(bus);
    showAdminMessage(`"${bus.operator}" was restored.`, 'success');
    await loadBusManagerData();
  } catch (error) {
    console.error('Failed to restore bus:', error);
    showAdminMessage('Failed to restore bus. Please try again.', 'error');
  }
}

async function loadBusManagerData() {
  const summaryEl = document.getElementById('bus-manager-summary');
  const wrapper = document.getElementById('bus-manager-table-wrapper');
  if (!wrapper) return;

  if (typeof isFirebaseReady !== 'function' || !isFirebaseReady()) {
    if (summaryEl) summaryEl.innerHTML = '<strong>Firebase is not configured.</strong> Managing buses requires Firestore.';
    wrapper.innerHTML = '';
    return;
  }

  wrapper.innerHTML = '<div class="empty-state"><h3>Loading buses…</h3></div>';

  try {
    const [baseDistricts, overrides] = await Promise.all([
      fetchBusesJsonBaseForAdmin(),
      fetchAllFirebaseBuses()
    ]);

    const merged = window.buildMergedBusMap(baseDistricts, overrides);
    busManagerAllBuses = [...merged.values()];

    populateBusManagerDistrictFilter();
    applyBusManagerFilters();
  } catch (error) {
    console.error('Failed to load buses for management:', error);
    if (summaryEl) summaryEl.innerHTML = '<strong>Unable to load buses.</strong> Please refresh and try again.';
    wrapper.innerHTML = '';
  }
}

function initBusManager() {
  if (initBusManager.initialized) {
    loadBusManagerData();
    return;
  }
  initBusManager.initialized = true;

  const searchInput = document.getElementById('bus-filter-search');
  const districtSelect = document.getElementById('bus-filter-district');
  const typeSelect = document.getElementById('bus-filter-type');
  const statusSelect = document.getElementById('bus-filter-status');
  const refreshButton = document.getElementById('bus-manager-refresh');

  if (searchInput) searchInput.addEventListener('input', applyBusManagerFilters);
  if (districtSelect) districtSelect.addEventListener('change', applyBusManagerFilters);
  if (typeSelect) typeSelect.addEventListener('change', applyBusManagerFilters);
  if (statusSelect) statusSelect.addEventListener('change', applyBusManagerFilters);
  if (refreshButton) refreshButton.addEventListener('click', loadBusManagerData);

  loadBusManagerData();
}

// Runs once the admin has actually signed in (see js/admin-auth.js) -- the
// Firestore /buses read rule requires a real, non-anonymous session, so
// pre-sign-in fetches (e.g. the footer count below) may have been denied
// and need a refresh now that a real session exists.
window.onAdminSignedIn = function onAdminSignedIn() {
  initBusManager();
  initLiveBusCount();
};

// ============================================
// LIVE BUS COUNT (footer)
// ============================================

// Live bus count shown in the footer -- visible even before admin sign-in,
// merged the same way the public site does (buses.json base + Firestore overrides).
async function initLiveBusCount() {
  const el = document.getElementById('live-bus-count');
  if (!el) return;

  try {
    const baseDistricts = await fetchBusesJsonBaseForAdmin();
    let overrides = [];

    if (typeof isFirebaseReady === 'function' && isFirebaseReady()) {
      try {
        overrides = await fetchAllFirebaseBuses();
      } catch (firebaseError) {
        console.warn('Live bus count: Firestore fetch failed:', firebaseError);
      }
    }

    const merged = window.mergeBusOverrides(baseDistricts, overrides);
    const count = merged.reduce((sum, district) => sum + (district.buses ? district.buses.length : 0), 0);
    el.textContent = `🚌 ${count.toLocaleString('en-IN')} bus${count === 1 ? '' : 'es'} currently live on tourzin.com`;
  } catch (error) {
    console.error('Failed to load live bus count:', error);
    el.textContent = 'Unable to load live site stats.';
  }
}

document.addEventListener('DOMContentLoaded', initAdmin);
document.addEventListener('DOMContentLoaded', initLiveBusCount);
