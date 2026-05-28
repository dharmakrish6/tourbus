// Global bus data
window.busData = [];

// Load bus data from JSON using multiple methods
async function loadBusData() {
  try {
    console.log('🔄 Starting to load buses.json...');
    console.log('Current location:', window.location.href);
    
    // Method 1: Try fetch
    try {
      console.log('Attempting fetch method...');
      const response = await fetch('buses.json');
      
      console.log('Fetch response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✓ JSON parsed successfully via fetch');
      
      window.busData = data.districts || [];
      
      console.log(`✓ Successfully loaded ${window.busData.length} districts via fetch`);
      console.log('Districts:', window.busData.map(d => d.name).join(', '));
      
      return window.busData;
    } catch (fetchError) {
      console.warn('Fetch method failed:', fetchError.message);
      console.log('Trying XMLHttpRequest method...');
      
      // Method 2: Try XMLHttpRequest (more compatible with file://)
      return new Promise((resolve, reject) => {
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
    }
  } catch (error) {
    console.error('✗ Error loading bus data:', error);
    console.error('Error type:', error.name);
    console.error('Error message:', error.message);
    console.error('Stack:', error.stack);
    return [];
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
