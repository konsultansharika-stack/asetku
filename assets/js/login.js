/* =====================================================================
 * ASSET MANAGEMENT PRO — login.js
 * ===================================================================== */

window.PAGE_INIT = function () {
  'use strict';
  var form = document.getElementById('loginForm');
  var emailEl = document.getElementById('loginEmail');
  var passEl = document.getElementById('loginPass');
  var btn = document.getElementById('loginBtn');

  document.getElementById('showPass').addEventListener('change', function (e) {
    passEl.type = e.target.checked ? 'text' : 'password';
  });

  document.getElementById('registerLink').addEventListener('click', function () {
    if (!window.Swal) return;
    window.Swal.fire({
      title: 'Daftar Akun Baru',
      html:
        '<input id="regName" class="swal2-input" placeholder="Nama lengkap">' +
        '<input id="regEmail" class="swal2-input" placeholder="Email">' +
        '<input id="regPass" class="swal2-input" type="password" placeholder="Kata sandi (min. 6 karakter)">',
      confirmButtonText: 'Daftar',
      confirmButtonColor: '#1e3a5f',
      showCancelButton: true, cancelButtonText: 'Batal',
      preConfirm: function () {
        var name = document.getElementById('regName').value.trim();
        var email = document.getElementById('regEmail').value.trim();
        var pass = document.getElementById('regPass').value;
        if (!name || !email || pass.length < 6) {
          window.Swal.showValidationMessage('Lengkapi semua field, sandi minimal 6 karakter');
          return false;
        }
        return { full_name: name, email: email, password: pass };
      }
    }).then(function (r) {
      if (!r.isConfirmed) return;
      Auth.register(r.value).then(function (res) {
        if (res.ok) {
          UI.toast('success', 'Akun berhasil dibuat. Silakan masuk.');
          emailEl.value = r.value.email; passEl.focus();
        } else {
          UI.toast('error', res.message || 'Gagal mendaftar');
        }
      });
    });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    form.classList.add('was-validated');
    if (!form.checkValidity()) return;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Memproses...';
    Auth.login(emailEl.value, passEl.value).then(function (res) {
      if (res.ok) {
        location.href = 'index.html';
      } else {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-box-arrow-in-right me-1"></i>Masuk';
        UI.toast('error', res.message || 'Login gagal');
        if (window.Swal) window.Swal.fire({
          title: 'Login Gagal', text: res.message || 'Email atau kata sandi salah.',
          icon: 'error', confirmButtonColor: '#1e3a5f'
        });
      }
    }).catch(function (err) {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-box-arrow-in-right me-1"></i>Masuk';
      UI.toast('error', err.message || 'Kesalahan koneksi');
    });
  });
};
