  const API = ''; // empty = same origin. In dev: 'http://localhost:5000'

  async function handleShorten() {
    const url     = document.getElementById('urlInput').value.trim();
    const custom  = document.getElementById('customCode').value.trim();
    const expire  = document.getElementById('expireHours').value.trim();
    const btn     = document.getElementById('shortenBtn');
    const result  = document.getElementById('resultBox');
    const errMsg  = document.getElementById('errorMsg');

    result.classList.remove('show');
    errMsg.classList.remove('show');

    if (!url) { showError('Please enter a URL first.'); return; }

    btn.disabled = true;
    btn.textContent = 'Working...';

    const token = localStorage.getItem('snaplink_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const body = { url };
    if (custom) body.custom_code = custom;
    if (expire) body.expire_hours = parseFloat(expire);

    try {
      const res = await fetch(API + '/links/shorten', {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (!res.ok) {
        // If not logged in, redirect to auth
        if (res.status === 401 || res.status === 422) {
          showError('Login required to shorten links. <a href="auth.html">Login here →</a>');
        } else {
          showError(data.error || 'Something went wrong.');
        }
        return;
      }

      document.getElementById('resultUrl').textContent = data.short_url;
      result.classList.add('show');
    } catch (e) {
      showError('Could not connect to server. Is Flask running?');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Shorten →';
    }
  }

  function showError(msg) {
    const el = document.getElementById('errorMsg');
    el.innerHTML = msg;
    el.classList.add('show');
  }

  function copyResult() {
    const url = document.getElementById('resultUrl').textContent;
    navigator.clipboard.writeText(url).then(() => {
      const btn = document.getElementById('copyBtn');
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = 'Copy', 2000);
    });
  }

  // Allow Enter key on input
  document.getElementById('urlInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleShorten();
  });