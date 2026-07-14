// Manages auth state on app.html. Bus cards are visible to everyone; viewing
// full details (the modal) requires a signed-in, non-anonymous account.
window.currentAppUser = null;

function describeAppUser(user) {
  return user.email || user.phoneNumber || 'your account';
}

function updateAppAuthUI(user) {
  const statusText = document.getElementById('app-auth-status-text');
  const signOutBtn = document.getElementById('app-sign-out');
  const signInLink = document.getElementById('app-sign-in');

  const signedIn = !!(user && !user.isAnonymous);
  if (statusText) statusText.textContent = signedIn ? `Signed in as ${describeAppUser(user)}` : '';
  if (signOutBtn) signOutBtn.style.display = signedIn ? '' : 'none';
  if (signInLink) signInLink.style.display = signedIn ? 'none' : '';
}

function initAppGuard() {
  const loading = document.getElementById('app-guard-loading');
  const gatedContent = document.getElementById('app-gated-content');
  const signOutBtn = document.getElementById('app-sign-out');

  // Show the bus listings to everyone right away — no login required to browse.
  if (loading) loading.style.display = 'none';
  if (gatedContent) gatedContent.style.display = 'block';
  if (typeof window.startTourBusApp === 'function') {
    window.startTourBusApp();
  }

  if (signOutBtn) {
    signOutBtn.addEventListener('click', () => {
      if (!window.firebaseAuth) return;
      window.firebaseAuth.signOut().then(() => {
        window.location.reload();
      });
    });
  }

  if (typeof isFirebaseReady !== 'function' || !isFirebaseReady() || !window.firebaseAuth) {
    updateAppAuthUI(null);
    return;
  }

  window.firebaseAuth.onAuthStateChanged(user => {
    window.currentAppUser = user && !user.isAnonymous ? user : null;
    updateAppAuthUI(user);
    // Auth may resolve after the app has already rendered; if the visitor was
    // sent to sign in to view a bus, reopen it now.
    if (window.currentAppUser && typeof window.openPendingBusIfReady === 'function') {
      window.openPendingBusIfReady();
    }
  });
}

document.addEventListener('DOMContentLoaded', initAppGuard);
