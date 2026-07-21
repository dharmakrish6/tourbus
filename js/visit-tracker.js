// Counts one site visit per browser session (not per page view), so
// navigating between pages within the same visit doesn't inflate the count.
// The same session key is used everywhere this script runs, so whichever
// page a visitor lands on first is the one that gets counted.
const SITE_VISIT_SESSION_KEY = 'tourbus_visit_counted';

function initVisitTracker() {
  if (typeof isFirebaseReady !== 'function' || !isFirebaseReady()) return;

  let alreadyCounted = false;
  try {
    alreadyCounted = !!sessionStorage.getItem(SITE_VISIT_SESSION_KEY);
    if (!alreadyCounted) {
      sessionStorage.setItem(SITE_VISIT_SESSION_KEY, '1');
    }
  } catch (error) {
    // sessionStorage unavailable (e.g. private browsing) -- track anyway,
    // just without session de-duplication.
  }

  if (alreadyCounted) return;

  incrementSiteVisit().catch(error => {
    console.warn('Visit tracking failed:', error);
  });
}

document.addEventListener('DOMContentLoaded', initVisitTracker);
