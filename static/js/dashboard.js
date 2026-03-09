  const API = ''; // Dev: 'http://localhost:5000'

  // ── Auth guard ──────────────────────────────────────────────────────────
  const token = localStorage.getItem('snaplink_token');
  const email = localStorage.getItem('snaplink_email');
  if (!token) window.location.href = 'auth.html';
  document.getElementById('userEmail').textContent = email || '—';

  const headers = () => ({
    'Content-Type':  'application/json',
    'Authorization': 'Bearer ' + token
  });

  // ── Load links on page load ─────────────────────────────────────────────
  let allLinks = [];
  async function loadLinks() {
    try {
      const res  = await fetch(API + '/links/', { headers: headers() });
      if (res.status === 401) { logout(); return; }
      const data = await res.json();
      allLinks   = data.links || [];
      renderTable(allLinks);
      updateStats(allLinks);
    } catch (e) {
      document.getElementById('linksBody').innerHTML =
        `<tr><td colspan="6"><div class="empty-state">Could not load links. Is the server running?</div></td></tr>`;
    }
  }

  function updateStats(links) {
    const now       = new Date();
    const active    = links.filter(l => !l.expires_at || new Date(l.expires_at) > now);
    const totalClks = links.reduce((s, l) => s + (l.clicks || 0), 0);

    document.getElementById('totalLinks').textContent   = links.length;
    document.getElementById('totalClicks').textContent  = totalClks;
    document.getElementById('activeLinks').textContent  = active.length;
  }

  function renderTable(links) {
    const tbody = document.getElementById('linksBody');
    if (!links.length) {
      tbody.innerHTML = `<tr><td colspan="6">
        <div class="empty-state">
          <span class="big">🔗</span>
          No links yet. Shorten your first URL above!
        </div></td></tr>`;
      return;
    }

    const now = new Date();
    tbody.innerHTML = links.map(l => {
      const shortUrl  = `${window.location.origin}/${l.code}`;
      const expired   = l.expires_at && new Date(l.expires_at) < now;
      const statusBadge = l.expires_at
        ? (expired
          ? `<span class="status-badge expired">Expired</span>`
          : `<span class="status-badge active">Active</span>`)
        : `<span class="status-badge never">No expiry</span>`;
      const createdDate = new Date(l.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short'});

      return `<tr>
        <td>
          <span class="code-chip" onclick="copyToClipboard('${shortUrl}', this)">/${l.code}</span>
        </td>
        <td><span class="long-url" title="${l.long_url}">${l.long_url}</span></td>
        <td><span class="click-badge">${l.clicks || 0}</span></td>
        <td>${statusBadge}</td>
        <td style="color:var(--muted);font-size:.72rem">${createdDate}</td>
        <td>
          <div class="action-btns">
            <button class="btn-analytics" onclick="openAnalytics('${l.code}')">Analytics</button>
            <button class="btn-delete" onclick="deleteLink('${l.code}', this)">Delete</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  function filterTable(q) {
    const filtered = allLinks.filter(l =>
      l.code.toLowerCase().includes(q.toLowerCase()) ||
      l.long_url.toLowerCase().includes(q.toLowerCase())
    );
    renderTable(filtered);
  }

  // ── Shorten ─────────────────────────────────────────────────────────────
  async function shortenLink() {
    const url    = document.getElementById('pUrl').value.trim();
    const custom = document.getElementById('pCode').value.trim();
    const expire = document.getElementById('pExpire').value.trim();
    const btn    = document.getElementById('pBtn');
    const fb     = document.getElementById('pFeedback');

    fb.className = 'panel-feedback';
    if (!url) { fb.textContent = 'URL is required.'; fb.className += ' error'; return; }

    btn.disabled = true; btn.textContent = 'Working…';

    const body = { url };
    if (custom) body.custom_code = custom;
    if (expire) body.expire_hours = parseFloat(expire);

    try {
      const res  = await fetch(API + '/links/shorten', {
        method: 'POST', headers: headers(), body: JSON.stringify(body)
      });
      const data = await res.json();

      if (!res.ok) {
        fb.textContent = data.error || 'Failed.';
        fb.className += ' error';
        return;
      }

      fb.textContent = `✓ Created: ${data.short_url}  (${data.remaining_shortens_this_hour} shortens left this hour)`;
      fb.className += ' success';

      // Update rate bar
      const used = 10 - (data.remaining_shortens_this_hour || 0);
      document.getElementById('rateRemaining').textContent = data.remaining_shortens_this_hour;
      document.getElementById('rateBarFill').style.width   = `${(data.remaining_shortens_this_hour / 10) * 100}%`;
      document.getElementById('rateBarLabel').textContent  = `${used} / 10 shortens used`;

      // Clear inputs
      document.getElementById('pUrl').value    = '';
      document.getElementById('pCode').value   = '';
      document.getElementById('pExpire').value = '';

      await loadLinks(); // refresh table
    } catch (e) {
      fb.textContent = 'Cannot connect to server.';
      fb.className += ' error';
    } finally {
      btn.disabled = false; btn.textContent = 'Shorten →';
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────
  async function deleteLink(code, btn) {
    if (!confirm(`Delete /${code}? This cannot be undone.`)) return;
    btn.textContent = '…'; btn.disabled = true;
    try {
      const res = await fetch(API + '/links/' + code, {
        method: 'DELETE', headers: headers()
      });
      if (res.ok) await loadLinks();
      else btn.textContent = 'Error'; btn.disabled = false;
    } catch { btn.textContent = 'Error'; btn.disabled = false; }
  }

  // ── Analytics Modal ──────────────────────────────────────────────────────
  async function openAnalytics(code) {
    document.getElementById('modalCode').textContent = '/' + code;
    document.getElementById('modalBody').innerHTML = '<div class="modal-loading">Loading analytics…</div>';
    document.getElementById('modalOverlay').classList.add('open');

    try {
      const res  = await fetch(API + '/analytics/' + code, { headers: headers() });
      const data = await res.json();
      if (!res.ok) { document.getElementById('modalBody').innerHTML = `<p style="color:var(--accent2);font-family:var(--mono);font-size:.8rem">${data.error}</p>`; return; }
      renderAnalytics(data);
    } catch (e) {
      document.getElementById('modalBody').innerHTML = '<div class="modal-loading">Failed to load.</div>';
    }
  }

  function renderAnalytics(d) {
    const maxClicks = Math.max(...(d.daily_clicks || []).map(x => x.clicks), 1);

    const dailyBars = (d.daily_clicks || []).length
      ? d.daily_clicks.map(day => `
          <div class="bar-row">
            <span class="bar-date">${day.date}</span>
            <div class="bar-bg"><div class="bar-fill" style="width:${Math.round((day.clicks/maxClicks)*100)}%"></div></div>
            <span class="bar-val">${day.clicks}</span>
          </div>`).join('')
      : '<p style="font-family:var(--mono);font-size:.75rem;color:var(--muted)">No clicks yet.</p>';

    const referrers = (d.top_referrers || []).length
      ? `<ul class="referrer-list">${d.top_referrers.map(r => `
          <li>
            <span class="ref-url" title="${r.referrer}">${r.referrer || 'Direct'}</span>
            <span class="ref-count">${r.clicks}</span>
          </li>`).join('')}</ul>`
      : '<p style="font-family:var(--mono);font-size:.75rem;color:var(--muted)">No referrer data yet.</p>';

    document.getElementById('modalBody').innerHTML = `
      <div class="analytics-stat-row">
        <div class="a-stat"><div class="a-label">TOTAL CLICKS</div><div class="a-val">${d.total_clicks}</div></div>
        <div class="a-stat"><div class="a-label">DAYS TRACKED</div><div class="a-val">${(d.daily_clicks||[]).length}</div></div>
        <div class="a-stat"><div class="a-label">TOP SOURCES</div><div class="a-val">${(d.top_referrers||[]).length}</div></div>
      </div>
      <div class="chart-label">// CLICKS PER DAY</div>
      <div class="bar-chart">${dailyBars}</div>
      <div class="chart-label">// TOP REFERRERS</div>
      ${referrers}
      <p style="margin-top:16px;font-family:var(--mono);font-size:.68rem;color:var(--muted)">
        Long URL: <a href="${d.long_url}" target="_blank" style="color:var(--accent);text-decoration:none">${d.long_url}</a>
      </p>
    `;
  }

  function closeModal(e) {
    if (e.target === document.getElementById('modalOverlay')) closeModalDirect();
  }
  function closeModalDirect() {
    document.getElementById('modalOverlay').classList.remove('open');
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function copyToClipboard(text, el) {
    navigator.clipboard.writeText(text).then(() => {
      const orig = el.textContent;
      el.textContent = 'Copied!';
      setTimeout(() => el.textContent = orig, 1500);
    });
  }

  function logout() {
    localStorage.removeItem('snaplink_token');
    localStorage.removeItem('snaplink_email');
    window.location.href = 'auth.html';
  }

  // Enter to shorten
  document.getElementById('pUrl').addEventListener('keydown', e => {
    if (e.key === 'Enter') shortenLink();
  });

  // ── Init ──────────────────────────────────────────────────────────────────
  loadLinks();