// Drives the standalone login page (login.html): Google or Phone OTP sign-in,
// open to any account (no allowlist), redirecting to app.html on success.
let siteAuthRecaptchaVerifier = null;
let siteAuthConfirmationResult = null;

function normalizeSitePhoneNumber(value) {
  return String(value || '').trim().replace(/[\s-]/g, '');
}

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
  const phoneStep = document.getElementById('site-auth-step-phone');
  const otpStep = document.getElementById('site-auth-step-otp');
  const phoneInput = document.getElementById('site-auth-phone');
  const otpInput = document.getElementById('site-auth-otp');
  const sendBtn = document.getElementById('site-auth-send-otp');
  const verifyBtn = document.getElementById('site-auth-verify-otp');
  const resendBtn = document.getElementById('site-auth-resend');

  if (typeof isFirebaseReady !== 'function' || !isFirebaseReady() || !window.firebaseAuth) {
    setSiteAuthMessage('Firebase is not configured. Sign-in is unavailable.', 'error');
    if (googleBtn) googleBtn.disabled = true;
    if (sendBtn) sendBtn.disabled = true;
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

  function setupRecaptcha() {
    if (siteAuthRecaptchaVerifier) return siteAuthRecaptchaVerifier;
    siteAuthRecaptchaVerifier = new firebase.auth.RecaptchaVerifier('site-recaptcha-container', {
      size: 'invisible'
    });
    return siteAuthRecaptchaVerifier;
  }

  if (sendBtn) {
    sendBtn.addEventListener('click', () => {
      setSiteAuthMessage('');
      const phone = normalizeSitePhoneNumber(phoneInput.value);
      if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
        setSiteAuthMessage('Enter a valid phone number in +countrycode format, e.g. +919876543210.', 'error');
        return;
      }
      sendBtn.disabled = true;
      sendBtn.textContent = 'Sending...';
      window.firebaseAuth.signInWithPhoneNumber(phone, setupRecaptcha())
        .then(result => {
          siteAuthConfirmationResult = result;
          if (phoneStep) phoneStep.style.display = 'none';
          if (otpStep) otpStep.style.display = 'block';
          setSiteAuthMessage('Verification code sent. Enter it below.', 'success');
          if (otpInput) {
            otpInput.value = '';
            otpInput.focus();
          }
        })
        .catch(error => {
          console.error('signInWithPhoneNumber failed:', error);
          setSiteAuthMessage(`Could not send verification code. ${error && error.message ? error.message : 'Please try again.'}`, 'error');
        })
        .finally(() => {
          sendBtn.disabled = false;
          sendBtn.textContent = 'Send Code';
        });
    });
  }

  if (verifyBtn) {
    verifyBtn.addEventListener('click', () => {
      setSiteAuthMessage('');
      const code = otpInput.value.trim();
      if (!siteAuthConfirmationResult || !code) {
        setSiteAuthMessage('Enter the code sent to your phone.', 'error');
        return;
      }
      verifyBtn.disabled = true;
      verifyBtn.textContent = 'Verifying...';
      siteAuthConfirmationResult.confirm(code)
        .then(() => goToApp())
        .catch(error => {
          console.error('OTP verification failed:', error);
          setSiteAuthMessage('Invalid code. Please try again.', 'error');
        })
        .finally(() => {
          verifyBtn.disabled = false;
          verifyBtn.textContent = 'Verify & Continue';
        });
    });
  }

  if (resendBtn) {
    resendBtn.addEventListener('click', () => {
      if (otpStep) otpStep.style.display = 'none';
      if (phoneStep) phoneStep.style.display = 'block';
      otpInput.value = '';
      setSiteAuthMessage('');
      if (phoneInput) phoneInput.focus();
    });
  }

  if (otpInput && verifyBtn) {
    otpInput.addEventListener('input', () => {
      otpInput.value = otpInput.value.replace(/\D/g, '').slice(0, 6);
      if (otpInput.value.length === 6) {
        verifyBtn.click();
      }
    });
  }

  if (phoneInput) {
    phoneInput.focus();
  }

  // If already signed in with a real account, skip the form entirely.
  window.firebaseAuth.onAuthStateChanged(user => {
    if (user && !user.isAnonymous) {
      goToApp();
    }
  });
}

document.addEventListener('DOMContentLoaded', initSiteAuthGate);
