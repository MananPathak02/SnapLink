  const API = ''; // empty = same origin. Dev: 'http://localhost:5000'

  // If already logged in, go to dashboard
  if (localStorage.getItem('snaplink_token')) {
    window.location.href = 'dashboard.html';
  }

  function switchTab(tab) {
    const isLogin = tab === 'login';
    document.getElementById('loginForm').style.display    = isLogin ? 'block' : 'none';
    document.getElementById('registerForm').style.display = isLogin ? 'none'  : 'block';
    document.getElementById('tabLogin').classList.toggle('active', isLogin);
    document.getElementById('tabRegister').classList.toggle('active', !isLogin);
    clearFeedback();
  }

  function clearFeedback() {
    ['loginFeedback','registerFeedback'].forEach(id => {
      const el = document.getElementById(id);
      el.className = 'feedback';
      el.textContent = '';
    });
  }

  function showFeedback(id, msg, type) {
    const el = document.getElementById(id);
    el.textContent = msg;
    el.className = 'feedback ' + type;
  }

  function togglePw(inputId, btn) {
    const inp = document.getElementById(inputId);
    inp.type = inp.type === 'password' ? 'text' : 'password';
    btn.textContent = inp.type === 'password' ? '👁' : '🙈';
  }

  function checkStrength(pw) {
    const fill = document.getElementById('strengthFill');
    let score = 0;
    if (pw.length >= 8)  score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    const pct   = ['0%','25%','50%','75%','100%'][score];
    const color = ['#ff3d6b','#ff3d6b','#ffb300','#80d800','#00e5ff'][score];
    fill.style.width = pct;
    fill.style.background = color;
  }

  async function doLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const pw    = document.getElementById('loginPw').value;
    const btn   = document.getElementById('loginBtn');

    if (!email || !pw) { showFeedback('loginFeedback', 'Both fields required.', 'error'); return; }

    btn.disabled = true; btn.textContent = 'Logging in...';

    try {
      const res  = await fetch(API + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pw })
      });
      const data = await res.json();

      if (!res.ok) { showFeedback('loginFeedback', data.error || 'Login failed.', 'error'); return; }

      localStorage.setItem('snaplink_token', data.access_token);
      localStorage.setItem('snaplink_email', email);
      showFeedback('loginFeedback', 'Logged in! Redirecting…', 'success');
      setTimeout(() => window.location.href = 'dashboard.html', 800);
    } catch (e) {
      showFeedback('loginFeedback', 'Cannot connect to server.', 'error');
    } finally {
      btn.disabled = false; btn.textContent = 'Login →';
    }
  }

  async function doRegister() {
    const email = document.getElementById('regEmail').value.trim();
    const pw    = document.getElementById('regPw').value;
    const btn   = document.getElementById('registerBtn');

    if (!email || !pw) { showFeedback('registerFeedback', 'Both fields required.', 'error'); return; }
    if (pw.length < 8) { showFeedback('registerFeedback', 'Password must be at least 8 characters.', 'error'); return; }

    btn.disabled = true; btn.textContent = 'Creating account...';

    try {
      const res  = await fetch(API + '/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pw })
      });
      const data = await res.json();

      if (!res.ok) { showFeedback('registerFeedback', data.error || 'Registration failed.', 'error'); return; }

      showFeedback('registerFeedback', 'Account created! Switching to login…', 'success');
      setTimeout(() => switchTab('login'), 1200);
    } catch (e) {
      showFeedback('registerFeedback', 'Cannot connect to server.', 'error');
    } finally {
      btn.disabled = false; btn.textContent = 'Create Account →';
    }
  }

  // Enter key support
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const loginVisible = document.getElementById('loginForm').style.display !== 'none';
    if (loginVisible) doLogin(); else doRegister();
  });