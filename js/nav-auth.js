// Reflects sign-in state in the public site nav: when a real (non-anonymous)
// account is signed in, the "Log In" button becomes a greeting with the user's
// name that links to the app. Auth state is only observed here -- this never
// triggers a sign-in, so logged-out visitors keep the default "Log In" link.
function initNavAuth() {
  const loginBtn = document.querySelector('.btn-nav-login');
  if (!loginBtn || !window.firebaseAuth) return;

  function firstNameOf(user) {
    if (user.displayName) return user.displayName.split(' ')[0];
    if (user.email) return user.email.split('@')[0];
    return 'Account';
  }

  window.firebaseAuth.onAuthStateChanged(user => {
    if (user && !user.isAnonymous) {
      loginBtn.textContent = `Hi, ${firstNameOf(user)}`;
      loginBtn.setAttribute('href', 'app.html');
      loginBtn.setAttribute('title', user.email || user.displayName || '');
    } else {
      loginBtn.textContent = 'Log In';
      loginBtn.setAttribute('href', 'login.html');
    }
  });
}

document.addEventListener('DOMContentLoaded', initNavAuth);
