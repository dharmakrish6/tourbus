// Gates the current page behind Firebase Phone Auth (OTP) plus a phone-number allowlist.
// Real enforcement lives in firestore.rules (request.auth.token.phone_number) -- this
// gate only controls what the UI reveals on an authorized sign-in.
const ADMIN_ALLOWED_PHONE_NUMBERS = ['+917200195895', '+919742379422'];

let phoneAuthRecaptchaVerifier = null;
let phoneAuthConfirmationResult = null;

function normalizePhoneNumber(value) {
  return String(value || '').trim().replace(/[\s-]/g, '');
}

function isAllowedAdminPhone(phoneNumber) {
  return ADMIN_ALLOWED_PHONE_NUMBERS.includes(normalizePhoneNumber(phoneNumber));
}

function setAuthMessage(message, type) {
  const el = document.getElementById('auth-message');
  if (!el) return;
  el.textContent = message || '';
  el.className = message ? `admin-message ${type || 'error'}` : 'admin-message';
}

function initPhoneAuthGate() {
  const gateCard = document.getElementById('auth-gate-card');
  const gatedContent = document.getElementById('gated-content');
  if (!gateCard || !gatedContent) return;

  const phoneStep = document.getElementById('auth-step-phone');
  const otpStep = document.getElementById('auth-step-otp');
  const phoneInput = document.getElementById('auth-phone');
  const otpInput = document.getElementById('auth-otp');
  const sendBtn = document.getElementById('auth-send-otp');
  const verifyBtn = document.getElementById('auth-verify-otp');
  const resendBtn = document.getElementById('auth-resend');
  const signOutBtn = document.getElementById('auth-sign-out');
  const statusText = document.getElementById('auth-status-text');

  function showGate() {
    gateCard.style.display = 'block';
    gatedContent.style.display = 'none';
  }

  function revealGatedContent(phoneNumber) {
    gateCard.style.display = 'none';
    gatedContent.style.display = 'block';
    if (statusText) statusText.textContent = `Signed in as ${phoneNumber}`;
    if (typeof window.initAnalytics === 'function') {
      window.initAnalytics();
    }
  }

  if (typeof isFirebaseReady !== 'function' || !isFirebaseReady() || !window.firebaseAuth) {
    setAuthMessage('Firebase is not configured. Phone sign-in is unavailable.', 'error');
    if (sendBtn) sendBtn.disabled = true;
    return;
  }

  function setupRecaptcha() {
    if (phoneAuthRecaptchaVerifier) return phoneAuthRecaptchaVerifier;
    phoneAuthRecaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
      size: 'invisible'
    });
    return phoneAuthRecaptchaVerifier;
  }

  if (sendBtn) {
    sendBtn.addEventListener('click', () => {
      setAuthMessage('');
      const phone = normalizePhoneNumber(phoneInput.value);
      if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
        setAuthMessage('Enter a valid phone number in +countrycode format, e.g. +919876543210.', 'error');
        return;
      }
      sendBtn.disabled = true;
      sendBtn.textContent = 'Sending...';
      window.firebaseAuth.signInWithPhoneNumber(phone, setupRecaptcha())
        .then(result => {
          phoneAuthConfirmationResult = result;
          if (phoneStep) phoneStep.style.display = 'none';
          if (otpStep) otpStep.style.display = 'block';
          setAuthMessage('Verification code sent. Enter it below.', 'success');
        })
        .catch(error => {
          console.error('signInWithPhoneNumber failed:', error);
          setAuthMessage(`Could not send verification code. ${error && error.message ? error.message : 'Please try again.'}`, 'error');
        })
        .finally(() => {
          sendBtn.disabled = false;
          sendBtn.textContent = 'Send Code';
        });
    });
  }

  if (verifyBtn) {
    verifyBtn.addEventListener('click', () => {
      setAuthMessage('');
      const code = otpInput.value.trim();
      if (!phoneAuthConfirmationResult || !code) {
        setAuthMessage('Enter the code sent to your phone.', 'error');
        return;
      }
      verifyBtn.disabled = true;
      verifyBtn.textContent = 'Verifying...';
      phoneAuthConfirmationResult.confirm(code)
        .then(result => {
          const phoneNumber = result.user && result.user.phoneNumber;
          if (isAllowedAdminPhone(phoneNumber)) {
            revealGatedContent(phoneNumber);
          } else {
            setAuthMessage('This number is not authorized for admin access.', 'error');
            window.firebaseAuth.signOut();
          }
        })
        .catch(error => {
          console.error('OTP verification failed:', error);
          setAuthMessage('Invalid code. Please try again.', 'error');
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
      setAuthMessage('');
    });
  }

  if (signOutBtn) {
    signOutBtn.addEventListener('click', () => {
      window.firebaseAuth.signOut().then(() => {
        phoneInput.value = '';
        otpInput.value = '';
        if (phoneStep) phoneStep.style.display = 'block';
        if (otpStep) otpStep.style.display = 'none';
        showGate();
        setAuthMessage('');
      });
    });
  }

  window.firebaseAuth.onAuthStateChanged(user => {
    if (user && user.phoneNumber && isAllowedAdminPhone(user.phoneNumber)) {
      revealGatedContent(user.phoneNumber);
    }
  });
}

document.addEventListener('DOMContentLoaded', initPhoneAuthGate);
