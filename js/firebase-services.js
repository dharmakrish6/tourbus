function slugify(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '');
}

function isFirebaseReady() {
  return typeof window.isFirebaseConfigured === 'function' && window.isFirebaseConfigured();
}

async function ensureFirebaseAuth() {
  if (!firebase || !firebase.auth) {
    return null;
  }

  if (!window.firebaseAuth) {
    window.firebaseAuth = firebase.auth();
  }

  if (window.firebaseAuth.currentUser) {
    return window.firebaseAuth.currentUser;
  }

  // Wait for Firebase to restore any persisted session before deciding whether
  // to fall back to anonymous auth. On a fresh page load currentUser is null
  // until restoration completes; signing in anonymously too early would clobber
  // a real (e.g. Google) sign-in and make the app think the user is logged out.
  const restoredUser = await new Promise(resolve => {
    const unsubscribe = window.firebaseAuth.onAuthStateChanged(user => {
      unsubscribe();
      resolve(user);
    });
  });

  if (restoredUser) {
    return restoredUser;
  }

  try {
    const result = await window.firebaseAuth.signInAnonymously();
    return result.user;
  } catch (error) {
    console.warn('Anonymous Firebase sign-in failed:', error);
    throw error;
  }
}

function groupBusesByDistrict(buses) {
  const districts = {};

  buses.forEach(rawBus => {
    const bus = {
      ...rawBus,
      district: rawBus.district || rawBus.districtName || 'Custom',
      districtId: rawBus.districtId || slugify(rawBus.district || rawBus.districtName || 'custom')
    };

    if (!districts[bus.districtId]) {
      districts[bus.districtId] = {
        id: bus.districtId,
        name: bus.district,
        buses: []
      };
    }

    districts[bus.districtId].buses.push(bus);
  });

  return Object.values(districts);
}

async function loadFirestoreBusData() {
  if (!isFirebaseReady()) {
    throw new Error('Firebase is not configured or loaded.');
  }

  await ensureFirebaseAuth();
  const snapshot = await firestore.collection('buses').get();
  const buses = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() || {}) }));
  return groupBusesByDistrict(buses);
}

async function fetchAllFirebaseBuses() {
  if (!isFirebaseReady()) {
    throw new Error('Firebase is not configured or loaded.');
  }

  await ensureFirebaseAuth();
  const snapshot = await firestore.collection('buses').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() || {}) }));
}

async function saveBusToFirestore(bus) {
  if (!isFirebaseReady()) {
    throw new Error('Firebase is not configured or loaded.');
  }

  const normalizedBus = {
    ...bus,
    district: bus.district || bus.districtName || 'Custom',
    districtId: bus.districtId || slugify(bus.district || bus.districtName || 'custom'),
    available: typeof bus.available === 'boolean' ? bus.available : Boolean(bus.available),
    seats: Number(bus.seats) || 0,
    perDayRent: Number(bus.perDayRent) || 0,
    rating: Number(bus.rating) || 0,
    amenities: Array.isArray(bus.amenities) ? bus.amenities : (typeof bus.amenities === 'string' ? bus.amenities.split(',').map(item => item.trim()).filter(Boolean) : [])
  };

  const id = normalizedBus.id || slugify(`${normalizedBus.operator}-${Date.now()}`);
  normalizedBus.id = id;

  await ensureFirebaseAuth();
  await firestore.collection('buses').doc(id).set(normalizedBus, { merge: true });
  return normalizedBus;
}

// Returns the current month as a "YYYY-MM" key, e.g. "2026-07".
function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

async function incrementBusClickCount(busId) {
  if (!isFirebaseReady()) {
    return;
  }

  await ensureFirebaseAuth();
  const monthKey = currentMonthKey();
  const analyticsRef = firestore.collection('analytics').doc(busId);
  await analyticsRef.set({
    clicks: firebase.firestore.FieldValue.increment(1),
    // Per-month breakdown so we can chart monthly visits over time.
    monthly: { [monthKey]: firebase.firestore.FieldValue.increment(1) },
    updatedAt: firebase.firestore.Timestamp.now()
  }, { merge: true });
}

async function fetchAnalyticsCountsFromFirestore() {
  if (!isFirebaseReady()) {
    throw new Error('Firebase is not configured or loaded.');
  }

  await ensureFirebaseAuth();
  const snapshot = await firestore.collection('analytics').get();
  const counts = {};

  snapshot.docs.forEach(doc => {
    const data = doc.data() || {};
    counts[doc.id] = typeof data.clicks === 'number' ? data.clicks : 0;
  });

  return counts;
}

// Like fetchAnalyticsCountsFromFirestore, but also returns the per-month
// breakdown for each bus: { [busId]: { clicks, monthly: { "YYYY-MM": n } } }.
async function fetchAnalyticsDetailFromFirestore() {
  if (!isFirebaseReady()) {
    throw new Error('Firebase is not configured or loaded.');
  }

  await ensureFirebaseAuth();
  const snapshot = await firestore.collection('analytics').get();
  const detail = {};

  snapshot.docs.forEach(doc => {
    const data = doc.data() || {};
    detail[doc.id] = {
      clicks: typeof data.clicks === 'number' ? data.clicks : 0,
      monthly: (data.monthly && typeof data.monthly === 'object') ? data.monthly : {}
    };
  });

  return detail;
}

async function clearAnalyticsFirestore() {
  if (!isFirebaseReady()) {
    throw new Error('Firebase is not configured or loaded.');
  }

  await ensureFirebaseAuth();
  const snapshot = await firestore.collection('analytics').get();
  if (snapshot.empty) {
    return;
  }

  const batch = firestore.batch();
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
}
