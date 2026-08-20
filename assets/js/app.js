// ================== KONFIGURASI ==================
// Ganti dengan URL Web App hasil deploy Google Apps Script kamu.
// Contoh: https://script.google.com/macros/s/XXXXXXXXXXXXXXXX/exec
// (Site Key reCAPTCHA diatur langsung di index.html pada atribut data-sitekey)
const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbzT16rZe8o6mBWNYj8klbmNK0o6QglZHudJeaVFiBTd2tUsIuviHEulse2Q7fWiXPTB/exec'
};
// ===================================================

const SESSION_KEY = 'vds_session';

const el = {
  viewLogin: document.getElementById('viewLogin'),
  viewSetPassword: document.getElementById('viewSetPassword'),
  viewDashboard: document.getElementById('viewDashboard'),
  btnLogout: document.getElementById('btnLogout'),

  formLogin: document.getElementById('formLogin'),
  inputNisn: document.getElementById('inputNisn'),
  inputPassword: document.getElementById('inputPassword'),
  loginError: document.getElementById('loginError'),
  btnLogin: document.getElementById('btnLogin'),

  formSetPassword: document.getElementById('formSetPassword'),
  inputNewPassword: document.getElementById('inputNewPassword'),
  inputConfirmPassword: document.getElementById('inputConfirmPassword'),
  setPasswordError: document.getElementById('setPasswordError'),
  btnSetPassword: document.getElementById('btnSetPassword'),

  txtNama: document.getElementById('txtNama'),
  txtNisnTop: document.getElementById('txtNisnTop'),
  txtTempatLahir: document.getElementById('txtTempatLahir'),
  txtTanggalLahir: document.getElementById('txtTanggalLahir'),
  stampSlot: document.getElementById('stampSlot'),

  panelBelum: document.getElementById('panelBelumVerifikasi'),
  panelSudah: document.getElementById('panelSudahVerifikasi'),
  catatanWrap: document.getElementById('catatanWrap'),
  inputCatatan: document.getElementById('inputCatatan'),
  submitError: document.getElementById('submitError'),
  btnSimpan: document.getElementById('btnSimpan'),

  statusBannerSlot: document.getElementById('statusBannerSlot'),
  txtWaktuVerifikasi: document.getElementById('txtWaktuVerifikasi'),

  toast: document.getElementById('toast')
};

// -------------------- Util --------------------

function showToast(msg, ms = 3200) {
  el.toast.textContent = msg;
  el.toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.toast.classList.remove('show'), ms);
}

function setLoading(btn, loading, labelDefault) {
  if (loading) {
    btn.disabled = true;
    btn.innerHTML = '<span class="loader-dot"></span><span class="loader-dot"></span><span class="loader-dot"></span>';
  } else {
    btn.disabled = false;
    btn.innerHTML = '<span class="btn-text">' + labelDefault + '</span>';
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

async function callApi(payload) {
  if (!CONFIG.API_URL || CONFIG.API_URL.indexOf('GANTI_DENGAN') !== -1) {
    throw new Error('API_URL belum diatur. Buka assets/js/app.js dan isi CONFIG.API_URL dengan URL Web App GAS kamu.');
  }
  const res = await fetch(CONFIG.API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // hindari CORS preflight ke GAS
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Gagal menghubungi server (status ' + res.status + ').');
  return res.json();
}

function getSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
  } catch (e) {
    return null;
  }
}

function setSession(data) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

function resetRecaptcha() {
  if (typeof grecaptcha !== 'undefined' && grecaptcha.reset) {
    try { grecaptcha.reset(); } catch (e) { /* belum siap, abaikan */ }
  }
}

// -------------------- Views --------------------

function showView(name) {
  el.viewLogin.classList.toggle('hidden', name !== 'login');
  el.viewSetPassword.classList.toggle('hidden', name !== 'setPassword');
  el.viewDashboard.classList.toggle('hidden', name !== 'dashboard');
  el.btnLogout.classList.toggle('hidden', name !== 'dashboard');
}

function renderDashboard(data) {
  el.txtNama.textContent = data.nama || '-';
  el.txtNisnTop.textContent = data.nisn || '-';
  el.txtTempatLahir.textContent = data.tempatLahir || '-';
  el.txtTanggalLahir.textContent = data.tanggalLahir || '-';

  const sudahVerifikasi = !!data.statusVerifikasi;

  if (sudahVerifikasi) {
    el.panelBelum.classList.add('hidden');
    el.panelSudah.classList.remove('hidden');
    renderStamp(data.statusVerifikasi);
    renderStatusBanner(data.statusVerifikasi, data.catatan);
    el.txtWaktuVerifikasi.textContent = data.tanggalVerifikasi
      ? 'Diverifikasi pada ' + data.tanggalVerifikasi
      : '';
    showToast('Anda sudah melakukan verifikasi data.');
  } else {
    el.panelSudah.classList.add('hidden');
    el.panelBelum.classList.remove('hidden');
    el.stampSlot.innerHTML = '';
  }

  showView('dashboard');
}

function renderSetPasswordScreen() {
  el.formSetPassword.reset();
  el.setPasswordError.style.display = 'none';
  showView('setPassword');
}

function renderStamp(status) {
  const isValid = status === 'Valid';
  el.stampSlot.innerHTML =
    '<div class="stamp ' + (isValid ? 'valid' : 'tidak') + '">' +
    (isValid ? 'Data<br>Terverifikasi' : 'Perlu<br>Perbaikan') +
    '</div>';
}

function renderStatusBanner(status, catatan) {
  const isValid = status === 'Valid';
  const icon = isValid
    ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4 10-10" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
  const text = isValid ? 'Data Anda tercatat Valid / Sesuai.' : 'Data Anda tercatat Tidak Sesuai. Admin sudah diberitahu untuk memperbaiki data.';

  let html =
    '<div class="status-banner ' + (isValid ? 'valid' : 'tidak') + '">' +
    '<span class="icon-circle">' + icon + '</span>' +
    '<span>' + text + '</span>' +
    '</div>';

  if (!isValid && catatan) {
    html += '<div class="status-meta">Catatan Anda: &ldquo;' + escapeHtml(catatan) + '&rdquo;</div>';
  }

  el.statusBannerSlot.innerHTML = html;
}

function resetToLogin(message) {
  el.formLogin.reset();
  el.loginError.style.display = 'none';
  resetRecaptcha();
  showView('login');
  if (message) showToast(message);
}

// -------------------- Handlers: Login --------------------

el.formLogin.addEventListener('submit', async (e) => {
  e.preventDefault();
  el.loginError.style.display = 'none';

  const nisn = el.inputNisn.value.trim();
  const password = el.inputPassword.value.trim();

  if (!nisn || !password) {
    el.loginError.textContent = 'NISN dan password wajib diisi.';
    el.loginError.style.display = 'block';
    return;
  }

  const recaptchaToken = (typeof grecaptcha !== 'undefined') ? grecaptcha.getResponse() : '';
  if (!recaptchaToken) {
    el.loginError.textContent = 'Mohon centang kotak reCAPTCHA terlebih dahulu.';
    el.loginError.style.display = 'block';
    return;
  }

  setLoading(el.btnLogin, true, 'Masuk');
  try {
    const res = await callApi({ action: 'login', nisn, password, recaptchaToken });
    if (res.status === 'success') {
      setSession(res.data);
      if (res.data.needSetup) {
        renderSetPasswordScreen();
      } else {
        renderDashboard(res.data);
      }
    } else {
      el.loginError.textContent = res.message || 'NISN atau password salah.';
      el.loginError.style.display = 'block';
    }
  } catch (err) {
    el.loginError.textContent = err.message || 'Terjadi kesalahan, silakan coba lagi.';
    el.loginError.style.display = 'block';
  } finally {
    setLoading(el.btnLogin, false, 'Masuk');
    resetRecaptcha();
  }
});

// -------------------- Handlers: Buat password baru --------------------

el.formSetPassword.addEventListener('submit', async (e) => {
  e.preventDefault();
  el.setPasswordError.style.display = 'none';

  const session = getSession();
  if (!session) { resetToLogin('Sesi Anda telah berakhir, silakan login ulang.'); return; }

  const newPassword = el.inputNewPassword.value;
  const confirmPassword = el.inputConfirmPassword.value;

  if (newPassword.length < 6) {
    el.setPasswordError.textContent = 'Password minimal 6 karakter.';
    el.setPasswordError.style.display = 'block';
    return;
  }
  if (newPassword !== confirmPassword) {
    el.setPasswordError.textContent = 'Konfirmasi password tidak sama.';
    el.setPasswordError.style.display = 'block';
    return;
  }

  setLoading(el.btnSetPassword, true, 'Simpan Password');
  try {
    const res = await callApi({
      action: 'setPassword',
      nisn: session.nisn,
      token: session.token,
      newPassword,
      confirmPassword
    });

    if (res.status === 'success') {
      setSession(res.data);
      showToast('Password berhasil dibuat.');
      renderDashboard(res.data);
    } else if (res.sessionExpired) {
      clearSession();
      resetToLogin(res.message || 'Sesi Anda telah berakhir, silakan login ulang.');
    } else {
      el.setPasswordError.textContent = res.message || 'Gagal membuat password.';
      el.setPasswordError.style.display = 'block';
    }
  } catch (err) {
    el.setPasswordError.textContent = err.message || 'Terjadi kesalahan, silakan coba lagi.';
    el.setPasswordError.style.display = 'block';
  } finally {
    setLoading(el.btnSetPassword, false, 'Simpan Password');
  }
});

// -------------------- Handlers: Pilihan valid/tidak --------------------

document.querySelectorAll('input[name="statusData"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    el.btnSimpan.disabled = false;
    el.submitError.style.display = 'none';
    const isTidak = radio.value === 'Tidak Valid';
    el.catatanWrap.classList.toggle('hidden', !isTidak);
    if (!isTidak) el.inputCatatan.value = '';
  });
});

// -------------------- Handlers: Simpan --------------------

el.btnSimpan.addEventListener('click', async () => {
  const selected = document.querySelector('input[name="statusData"]:checked');
  if (!selected) return;

  const session = getSession();
  if (!session) { resetToLogin('Sesi Anda telah berakhir, silakan login ulang.'); return; }

  el.submitError.style.display = 'none';

  let catatan = '';
  if (selected.value === 'Tidak Valid') {
    catatan = el.inputCatatan.value.trim();
    if (!catatan) {
      el.submitError.textContent = 'Mohon jelaskan bagian data yang tidak sesuai.';
      el.submitError.style.display = 'block';
      el.inputCatatan.focus();
      return;
    }
  }

  setLoading(el.btnSimpan, true, 'Simpan');

  try {
    const res = await callApi({
      action: 'submitValidation',
      nisn: session.nisn,
      token: session.token,
      statusVerifikasi: selected.value,
      catatan
    });

    if (res.status === 'success') {
      const updated = Object.assign({}, session, {
        statusVerifikasi: selected.value,
        tanggalVerifikasi: res.tanggalVerifikasi || '',
        catatan
      });
      setSession(updated);
      showToast('Data tersimpan.');
      renderDashboard(updated);
    } else if (res.sessionExpired) {
      clearSession();
      resetToLogin(res.message || 'Sesi Anda telah berakhir, silakan login ulang.');
    } else {
      el.submitError.textContent = res.message || 'Gagal menyimpan data.';
      el.submitError.style.display = 'block';
    }
  } catch (err) {
    el.submitError.textContent = err.message || 'Terjadi kesalahan, silakan coba lagi.';
    el.submitError.style.display = 'block';
  } finally {
    setLoading(el.btnSimpan, false, 'Simpan');
  }
});

// -------------------- Handlers: Logout --------------------

el.btnLogout.addEventListener('click', async () => {
  const session = getSession();
  clearSession();
  resetToLogin();
  if (session && session.token) {
    try { await callApi({ action: 'logout', nisn: session.nisn, token: session.token }); } catch (e) { /* abaikan */ }
  }
});

// -------------------- Init --------------------
// Setiap kali halaman dimuat, validasi ulang token ke server (bukan hanya
// mengandalkan data lokal) — token kedaluwarsa otomatis memaksa login ulang.

(async function init() {
  const session = getSession();
  if (!session || !session.token) return;

  try {
    const res = await callApi({ action: 'checkSession', nisn: session.nisn, token: session.token });
    if (res.status === 'success') {
      const merged = Object.assign({}, session, res.data);
      setSession(merged);
      renderDashboard(merged);
    } else {
      clearSession();
      if (res.sessionExpired) showToast('Sesi Anda telah berakhir, silakan login kembali.');
    }
  } catch (err) {
    // Gagal cek sesi (mis. offline) — biarkan tampilan login normal, jangan blokir halaman.
  }
})();
