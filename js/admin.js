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

function initAdmin() {
  const form = document.getElementById('admin-form');
  const clearButton = document.getElementById('clear-additions');
  const statusText = document.getElementById('admin-status');

  if (!form) return;

  const districtNameSelect = document.getElementById('district-name');
  const districtIdInput = document.getElementById('district-id');
  const busIdInput = document.getElementById('bus-id');
  const contactInput = document.getElementById('contact');

  const refreshBusId = () => {
    if (!busIdInput) return;
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

    if (typeof isFirebaseReady === 'function' && isFirebaseReady()) {
      saveBusToFirestore(newBus)
        .then(savedBus => {
          showAdminMessage(`Bus saved to Firestore with ID ${savedBus.id}.`, 'success');
          form.reset();
          document.getElementById('available').checked = true;
          document.getElementById('verified').checked = true;
          document.getElementById('paid').checked = true;
        })
        .catch(firebaseError => {
          console.error('Failed to save bus to Firestore:', firebaseError);
          const updatedLocal = [...existing, newBus];
          saveAdminBuses(updatedLocal);
          localStorage.setItem('tourbus_added_buses', JSON.stringify(updatedLocal));
          const message = firebaseError && firebaseError.code === 'permission-denied'
            ? 'Firestore permission denied. Update your Firestore rules to allow writes from this app.'
            : 'Firestore save failed; bus stored locally instead.';
          showAdminMessage(message, 'error');
        });
    } else {
      const updatedLocal = [...existing, newBus];
      saveAdminBuses(updatedLocal);
      localStorage.setItem('tourbus_added_buses', JSON.stringify(updatedLocal));
      showAdminMessage('New bus details saved locally. Open home to see the updated list.', 'success');
      form.reset();
      document.getElementById('available').checked = true;
      document.getElementById('verified').checked = true;
      document.getElementById('paid').checked = true;
    }
  });

  if (clearButton) {
    clearButton.addEventListener('click', () => {
      saveAdminBuses([]);
      showAdminMessage('Added bus entries cleared.', 'success');
    });
  }
}

// Live bus count shown in the footer -- visible even before admin sign-in,
// pulled the same way the public site does (Firestore first, buses.json fallback).
async function initLiveBusCount() {
  const el = document.getElementById('live-bus-count');
  if (!el) return;

  try {
    let buses = [];

    if (typeof isFirebaseReady === 'function' && isFirebaseReady()) {
      try {
        buses = await fetchAllFirebaseBuses();
      } catch (firebaseError) {
        console.warn('Live bus count: Firestore fetch failed:', firebaseError);
      }
    }

    if (buses.length === 0) {
      const response = await fetch('../buses.json');
      const data = await response.json();
      (data.districts || []).forEach(district => {
        if (Array.isArray(district.buses)) {
          buses.push(...district.buses);
        }
      });
    }

    const count = buses.length;
    el.textContent = `🚌 ${count.toLocaleString('en-IN')} bus${count === 1 ? '' : 'es'} currently live on tourzin.com`;
  } catch (error) {
    console.error('Failed to load live bus count:', error);
    el.textContent = 'Unable to load live site stats.';
  }
}

document.addEventListener('DOMContentLoaded', initAdmin);
document.addEventListener('DOMContentLoaded', initLiveBusCount);
