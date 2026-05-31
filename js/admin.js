const ADMIN_STORAGE_KEY = 'tourbus_added_buses';

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

function initAdmin() {
  const form = document.getElementById('admin-form');
  const clearButton = document.getElementById('clear-additions');

  if (!form) return;

  form.addEventListener('submit', event => {
    event.preventDefault();
    clearAdminMessage();

    const districtName = document.getElementById('district-name').value.trim();
    const districtId = document.getElementById('district-id').value.trim() || slugify(districtName);
    const id = document.getElementById('bus-id').value.trim();
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
    if (existing.some(bus => bus.id === id)) {
      showAdminMessage('A bus with this ID already exists in added entries.', 'error');
      return;
    }

    const newBus = {
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

    const updated = [...existing, newBus];
    saveAdminBuses(updated);
    showAdminMessage('New bus details saved successfully. Open home to see the updated list.', 'success');
    localStorage.setItem('tourbus_added_buses', JSON.stringify(updated));
    form.reset();
    document.getElementById('available').checked = true;
    document.getElementById('verified').checked = true;
    document.getElementById('paid').checked = true;
  });

  if (clearButton) {
    clearButton.addEventListener('click', () => {
      saveAdminBuses([]);
      showAdminMessage('Added bus entries cleared.', 'success');
    });
  }
}

document.addEventListener('DOMContentLoaded', initAdmin);
