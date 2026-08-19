// ================== KONFIGURASI ==================
// Ganti dengan URL Web App hasil deploy Google Apps Script kamu.
// Contoh: https://script.google.com/macros/s/XXXXXXXXXXXXXXXX/exec
const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbzT16rZe8o6mBWNYj8klbmNK0o6QglZHudJeaVFiBTd2tUsIuviHEulse2Q7fWiXPTB/exec'
};
// ===================================================

const SESSION_KEY = 'vds_session';

const el = {
  viewLogin: document.getElementById('viewLogin'),
  viewDashboard: document.getElementById('viewDashboard'),
  btnLogout: document.getElementById('btnLogout'),

  formLogin: document.getElementById('formLogin'),
  inputNisn: document.getElementById('inputNisn'),
  inputPassword: document.getElementById('inputPassword'),
  loginError: document.getElementById('loginError'),
  btnLogin: document.getElementById('btnLogin'),

  txtNama: document.getElementById('txtNama'),
  txtNisnTop: document.getElementById('txtNisnTop'),
  txtTempatLahir: document.getElementById('txtTempatLahir'),
  txtTanggalLahir: document.getElementById('txtTanggalLahir'),
  stampSlot: document.getElementById('stampSlot'),

  panelBelum: document.getElementById('panelBelumVerifikasi'),
  panelSudah: document.getElementById('panelSudahVerifikasi'),
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

// -------------------- Render --------------------

function renderDashboard(data) {
  el.txtNama.textContent = data.nama || '-';
  el.txtNisnTop.textContent = 'NISN: ' + data.nisn;
  el.txtTempatLahir.textContent = data.tempatLahir || '-';
  el.txtTanggalLahir.textContent = data.tanggalLahir || '-';

  const sudahVerifikasi = !!data.statusVerifikasi;

  if (sudahVerifikasi) {
    el.panelBelum.classList.add('hidden');
    el.panelSudah.classList.remove('hidden');
    renderStamp(data.statusVerifikasi);
    renderStatusBanner(data.statusVerifikasi);
    el.txtWaktuVerifikasi.textContent = data.tanggalVerifikasi
      ? 'Diverifikasi pada ' + data.tanggalVerifikasi
      : '';
    showToast('Anda sudah melakukan verifikasi data.');
  } else {
    el.panelSudah.classList.add('hidden');
    el.panelBelum.classList.remove('hidden');
    el.stampSlot.innerHTML = '';
  }

  el.viewLogin.classList.add('hidden');
  el.viewDashboard.classList.remove('hidden');
  el.btnLogout.classList.remove('hidden');
}

function renderStamp(status) {
  const isValid = status === 'Valid';
  el.stampSlot.innerHTML =
    '<div class="stamp ' + (isValid ? 'valid' : 'tidak') + '">' +
    (isValid ? 'Data<br>Terverifikasi' : 'Perlu<br>Perbaikan') +
    '</div>';
}

function renderStatusBanner(status) {
  const isValid = status === 'Valid';
  const icon = isValid
    ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4 10-10" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
  const text = isValid ? 'Data Anda tercatat Valid / Sesuai.' : 'Data Anda tercatat Tidak Sesuai. Admin sudah diberitahu untuk memperbaiki data.';

  el.statusBannerSlot.innerHTML =
    '<div class="status-banner ' + (isValid ? 'valid' : 'tidak') + '">' +
    '<span class="icon-circle">' + icon + '</span>' +
    '<span>' + text + '</span>' +
    '</div>';
}

function resetToLogin() {
  el.viewDashboard.classList.add('hidden');
  el.viewLogin.classList.remove('hidden');
  el.btnLogout.classList.add('hidden');
  el.formLogin.reset();
  el.loginError.style.display = 'none';
}

// -------------------- Handlers --------------------

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

  setLoading(el.btnLogin, true, 'Masuk');
  try {
    const res = await callApi({ action: 'login', nisn, password });
    if (res.status === 'success') {
      setSession(res.data);
      renderDashboard(res.data);
    } else {
      el.loginError.textContent = res.message || 'NISN atau password salah.';
      el.loginError.style.display = 'block';
    }
  } catch (err) {
    el.loginError.textContent = err.message || 'Terjadi kesalahan, silakan coba lagi.';
    el.loginError.style.display = 'block';
  } finally {
    setLoading(el.btnLogin, false, 'Masuk');
  }
});

document.querySelectorAll('input[name="statusData"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    el.btnSimpan.disabled = false;
  });
});

el.btnSimpan.addEventListener('click', async () => {
  const selected = document.querySelector('input[name="statusData"]:checked');
  if (!selected) return;

  const session = getSession();
  if (!session) { resetToLogin(); return; }

  el.submitError.style.display = 'none';
  setLoading(el.btnSimpan, true, 'Simpan');

  try {
    const res = await callApi({
      action: 'submitValidation',
      nisn: session.nisn,
      statusVerifikasi: selected.value
    });

    if (res.status === 'success') {
      const updated = Object.assign({}, session, {
        statusVerifikasi: selected.value,
        tanggalVerifikasi: res.tanggalVerifikasi || ''
      });
      setSession(updated);
      showToast('Data tersimpan.');
      renderDashboard(updated);
    } else {
      el.submitError.textContent = res.message || 'Gagal menyimpan data.';
      el.submitError.style.display = 'block';
      if (res.alreadyVerified) {
        // Sinkronkan ulang dari server bila ternyata sudah pernah verifikasi
        const fresh = Object.assign({}, session, { statusVerifikasi: 'Valid' });
        renderDashboard(fresh);
      }
    }
  } catch (err) {
    el.submitError.textContent = err.message || 'Terjadi kesalahan, silakan coba lagi.';
    el.submitError.style.display = 'block';
  } finally {
    setLoading(el.btnSimpan, false, 'Simpan');
  }
});

el.btnLogout.addEventListener('click', () => {
  clearSession();
  resetToLogin();
});

// -------------------- Init --------------------

(function init() {
  const session = getSession();
  if (session) {
    renderDashboard(session);
  }
})();
