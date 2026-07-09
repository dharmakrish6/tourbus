// Drives the standalone login page (login.html): Google sign-in, open to any
// account (no allowlist), redirecting to app.html on success.
function setSiteAuthMessage(message, type) {
  const el = document.getElementById('site-auth-message');
  if (!el) return;
  el.textContent = message || '';
  el.className = message ? `auth-alert ${type || 'error'}` : 'auth-alert';
}

function initSiteAuthGate() {
  const gateCard = document.getElementById('site-auth-gate-card');
  if (!gateCard) return;

  const googleBtn = document.getElementById('site-auth-google');

  if (typeof isFirebaseReady !== 'function' || !isFirebaseReady() || !window.firebaseAuth) {
    setSiteAuthMessage('Firebase is not configured. Sign-in is unavailable.', 'error');
    if (googleBtn) googleBtn.disabled = true;
    return;
  }

  function goToApp() {
    window.location.href = 'app.html';
  }

  if (googleBtn) {
    googleBtn.addEventListener('click', () => {
      setSiteAuthMessage('');
      googleBtn.disabled = true;
      const provider = new firebase.auth.GoogleAuthProvider();
      window.firebaseAuth.signInWithPopup(provider)
        .then(() => goToApp())
        .catch(error => {
          console.error('Google sign-in failed:', error);
          setSiteAuthMessage(`Google sign-in failed. ${error && error.message ? error.message : 'Please try again.'}`, 'error');
        })
        .finally(() => {
          googleBtn.disabled = false;
        });
    });
  }

  // If already signed in with a real account, skip the form entirely.
  window.firebaseAuth.onAuthStateChanged(user => {
    if (user && !user.isAnonymous) {
      goToApp();
    }
  });
}

document.addEventListener('DOMContentLoaded', initSiteAuthGate);
