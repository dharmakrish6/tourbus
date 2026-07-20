// Global bus data
window.busData = [];

// Fetches the static base catalog (buses.json), with an XHR fallback for
// environments where fetch() is unavailable/blocked.
async function fetchBusesJsonBase() {
  try {
    const response = await fetch('buses.json');
    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    console.log(`✓ Loaded ${(data.districts || []).length} districts from buses.json`);
    return data.districts || [];
  } catch (error) {
    console.warn('buses.json fetch failed, attempting XMLHttpRequest fallback...', error);
    return await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = function () {
        try {
          if (xhr.status === 0 || xhr.status === 200) {
            const data = JSON.parse(xhr.responseText);
            console.log(`✓ Loaded ${(data.districts || []).length} districts via XMLHttpRequest`);
            resolve(data.districts || []);
          } else {
            reject(new Error(`XHR returned status ${xhr.status}`));
          }
        } catch (parseError) {
          reject(new Error('Failed to parse JSON: ' + parseError.message));
        }
      };
      xhr.onerror = function () {
        reject(new Error('XMLHttpRequest failed'));
      };
      xhr.open('GET', 'buses.json', true);
      xhr.send();
    });
  }
}

// Merges the static buses.json catalog with Firestore documents by bus id:
// a Firestore doc with a matching id overrides that bus's fields (an admin
// edit), a new id adds a bus (created via Admin), and `deleted: true` marks
// a bus as soft-deleted. Firestore is a patch/override layer on top of the
// base catalog -- NOT a full replacement -- so admin editing or deleting a
// handful of buses never hides every other bus that Firestore has no record
// of. Returns a Map keyed by bus id; deleted entries are kept (with
// deleted:true) so admin tooling can still see and restore them.
function buildMergedBusMap(baseDistricts, overrideDocs) {
  const busMap = new Map();

  (baseDistricts || []).forEach(district => {
    (district.buses || []).forEach(bus => {
      busMap.set(bus.id, { ...bus, district: district.name, districtId: district.id, deleted: false });
    });
  });

  (overrideDocs || []).forEach(doc => {
    if (!doc || !doc.id) return;
    const prior = busMap.get(doc.id);
    const district = doc.district || (prior && prior.district) || 'Custom';
    const districtId = doc.districtId || (prior && prior.districtId) || slugify(district);
    busMap.set(doc.id, {
      ...(prior || {}),
      ...doc,
      district,
      districtId,
      deleted: !!doc.deleted
    });
  });

  return busMap;
}
window.buildMergedBusMap = buildMergedBusMap;

// Flattens a merged bus map back into the { id, name, buses: [] } district
// shape the rest of the app expects, dropping soft-deleted buses -- this is
// the public-facing view used by the home page / browse app.
function mergeBusOverrides(baseDistricts, overrideDocs) {
  const busMap = buildMergedBusMap(baseDistricts, overrideDocs);
  const districtsById = {};

  busMap.forEach(bus => {
    if (bus.deleted) return;
    if (!districtsById[bus.districtId]) {
      districtsById[bus.districtId] = { id: bus.districtId, name: bus.district, buses: [] };
    }
    districtsById[bus.districtId].buses.push(bus);
  });

  return Object.values(districtsById);
}
window.mergeBusOverrides = mergeBusOverrides;

// Load bus data: buses.json is always the base catalog; Firestore documents
// (if configured) are layered on top as per-bus overrides/additions/deletes.
async function loadBusData() {
  console.log('🔄 Starting to load bus data...');

  const baseDistricts = await fetchBusesJsonBase().catch(error => {
    console.error('✗ Error loading base bus data:', error);
    return [];
  });

  if (typeof isFirebaseReady === 'function' && isFirebaseReady()) {
    try {
      console.log('Loading Firestore bus overrides...');
      const overrides = await fetchAllFirebaseBuses();
      window.busData = mergeBusOverrides(baseDistricts, overrides);
      console.log(`✓ Merged ${baseDistricts.length} base district(s) with ${overrides.length} Firestore override(s)`);
      return window.busData;
    } catch (firebaseError) {
      console.warn('Firestore overrides load failed, using base catalog only:', firebaseError.message || firebaseError);
    }
  } else {
    console.log('Firebase not configured or unavailable; using buses.json only');
  }

  window.busData = baseDistricts;
  return window.busData;
}

// Get all buses from all districts
function getAllBuses() {
  const allBuses = [];
  if (!window.busData || window.busData.length === 0) {
    console.warn('⚠️ No bus data available');
    return allBuses;
  }

  window.busData.forEach(district => {
    if (district.buses && Array.isArray(district.buses)) {
      district.buses.forEach(bus => {
        allBuses.push({
          ...bus,
          district: district.name,
          districtId: district.id
        });
      });
    }
  });

  console.log(`Retrieved ${allBuses.length} total buses from ${window.busData.length} districts`);
  return allBuses;
}
