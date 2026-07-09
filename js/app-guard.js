// Guards app.html: redirects to login.html unless a real (non-anonymous) user is signed in.
function describeAppUser(user) {
  return user.email || user.phoneNumber || 'your account';
}

function initAppGuard() {
  const loading = document.getElementById('app-guard-loading');
  const gatedContent = document.getElementById('app-gated-content');
  const statusText = document.getElementById('app-auth-status-text');
  const signOutBtn = document.getElementById('app-sign-out');

  if (typeof isFirebaseReady !== 'function' || !isFirebaseReady() || !window.firebaseAuth) {
    if (loading) loading.textContent = 'Firebase is not configured. Unable to verify sign-in.';
    return;
  }

  if (signOutBtn) {
    signOutBtn.addEventListener('click', () => {
      window.firebaseAuth.signOut().then(() => {
        window.location.href = 'login.html';
      });
    });
  }

  window.firebaseAuth.onAuthStateChanged(user => {
    if (user && !user.isAnonymous) {
      if (loading) loading.style.display = 'none';
      if (gatedContent) gatedContent.style.display = 'block';
      if (statusText) statusText.textContent = `Signed in as ${describeAppUser(user)}`;
      if (typeof window.startTourBusApp === 'function') {
        window.startTourBusApp();
      }
    } else {
      window.location.href = 'login.html';
    }
  });
}

document.addEventListener('DOMContentLoaded', initAppGuard);
