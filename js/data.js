// Global bus data
window.busData = [];

// Load bus data from JSON using multiple methods
async function loadBusData() {
  try {
    console.log('🔄 Starting to load bus data...');

    if (typeof isFirebaseReady === 'function' && isFirebaseReady()) {
      try {
        console.log('Attempting to load data from Firestore...');
        const districts = await loadFirestoreBusData();
        if (districts && districts.length > 0) {
          window.busData = districts;
          console.log(`✓ Loaded ${window.busData.length} districts from Firestore`);
          return window.busData;
        }
        console.warn('Firestore returned no districts; falling back to buses.json');
      } catch (firebaseError) {
        console.warn('Firestore load failed:', firebaseError.message || firebaseError);
      }
    } else {
      console.log('Firebase not configured or unavailable; falling back to buses.json');
    }

    console.log('Loading bus data from buses.json...');
    const response = await fetch('buses.json');

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    window.busData = data.districts || [];
    console.log(`✓ Successfully loaded ${window.busData.length} districts via buses.json`);
    return window.busData;
  } catch (error) {
    console.warn('buses.json fetch failed, attempting XMLHttpRequest fallback...');

    try {
      return await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function() {
          try {
            if (xhr.status === 0 || xhr.status === 200) {
              const data = JSON.parse(xhr.responseText);
              window.busData = data.districts || [];
              console.log(`✓ Successfully loaded ${window.busData.length} districts via XMLHttpRequest`);
              resolve(window.busData);
            } else {
              reject(new Error(`XHR returned status ${xhr.status}`));
            }
          } catch (parseError) {
            reject(new Error('Failed to parse JSON: ' + parseError.message));
          }
        };
        xhr.onerror = function() {
          reject(new Error('XMLHttpRequest failed'));
        };
        xhr.open('GET', 'buses.json', true);
        xhr.send();
      });
    } catch (fallbackError) {
      console.error('✗ Error loading bus data:', fallbackError);
      return [];
    }
  }
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
