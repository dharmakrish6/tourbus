// Gates admin/index.html and analytics/index.html behind Google sign-in,
// restricted to an email allowlist. Real enforcement lives in firestore.rules
// (request.auth.token.email) -- this gate only controls what the UI reveals.
const ADMIN_ALLOWED_EMAILS = ['dharmakrish6@gmail.com', 'kgmtravelagency@gmail.com'];

function isAllowedAdminEmail(email) {
  return !!email && ADMIN_ALLOWED_EMAILS.includes(String(email).toLowerCase());
}

function setAdminAuthMessage(message, type) {
  const el = document.getElementById('auth-message');
  if (!el) return;
  el.textContent = message || '';
  el.className = message ? `admin-message ${type || 'error'}` : 'admin-message';
}

function initAdminAuthGate() {
  const gateCard = document.getElementById('auth-gate-card');
  const gatedContent = document.getElementById('gated-content');
  if (!gateCard || !gatedContent) return;

  const googleBtn = document.getElementById('auth-google');
  const signOutBtn = document.getElementById('auth-sign-out');
  const statusText = document.getElementById('auth-status-text');

  function showGate() {
    gateCard.style.display = 'block';
    gatedContent.style.display = 'none';
  }

  function revealGatedContent(email) {
    gateCard.style.display = 'none';
    gatedContent.style.display = 'block';
    if (statusText) statusText.textContent = `Signed in as ${email}`;
    if (typeof window.initAnalytics === 'function') {
      window.initAnalytics();
    }
    if (typeof window.onAdminSignedIn === 'function') {
      window.onAdminSignedIn();
    }
  }

  if (typeof isFirebaseReady !== 'function' || !isFirebaseReady() || !window.firebaseAuth) {
    setAdminAuthMessage('Firebase is not configured. Sign-in is unavailable.', 'error');
    if (googleBtn) googleBtn.disabled = true;
    return;
  }

  if (googleBtn) {
    googleBtn.addEventListener('click', () => {
      setAdminAuthMessage('');
      googleBtn.disabled = true;
      const provider = new firebase.auth.GoogleAuthProvider();
      window.firebaseAuth.signInWithPopup(provider)
        .then(result => {
          const email = result.user && result.user.email;
          if (!isAllowedAdminEmail(email)) {
            setAdminAuthMessage('This Google account is not authorized for admin access.', 'error');
            window.firebaseAuth.signOut();
          }
        })
        .catch(error => {
          console.error('Google sign-in failed:', error);
          setAdminAuthMessage(`Google sign-in failed. ${error && error.message ? error.message : 'Please try again.'}`, 'error');
        })
        .finally(() => {
          googleBtn.disabled = false;
        });
    });
  }

  if (signOutBtn) {
    signOutBtn.addEventListener('click', () => {
      window.firebaseAuth.signOut().then(() => {
        showGate();
        setAdminAuthMessage('');
      });
    });
  }

  window.firebaseAuth.onAuthStateChanged(user => {
    if (user && !user.isAnonymous && isAllowedAdminEmail(user.email)) {
      revealGatedContent(user.email);
    } else {
      showGate();
    }
  });
}

document.addEventListener('DOMContentLoaded', initAdminAuthGate);
