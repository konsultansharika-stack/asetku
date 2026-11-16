/* =====================================================================
 * ASSET MANAGEMENT PRO — qr-code.js
 * Helper QR Code: generate, unduh PNG, cetak label tunggal/beramai-ramai.
 * QR berisi token referensi unik, BUKAN data pribadi/aset lengkap.
 * ===================================================================== */

var QRA = (function () {
  'use strict';

  function ensureToken(asset) {
    return asset.qr_token || asset.id;
  }

  function render(el, text, size) {
    if (!window.QRCode) { el.textContent = 'Library QR belum termuat'; return null; }
    el.innerHTML = '';
    try {
      return new QRCode(el, {
        text: text, width: size || 120, height: size || 120,
        colorDark: '#0b1f3a', colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
    } catch (e) { el.textContent = 'QR gagal dibuat'; return null; }
  }

  function download(asset) {
    var holder = document.createElement('div');
    render(holder, ensureToken(asset), 240);
    setTimeout(function () {
      var canvas = holder.querySelector('canvas');
      if (!canvas) { UI.toast('error', 'QR tidak dapat dibuat'); return; }
      var a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = 'qr-' + (asset.asset_code || asset.id).replace(/[\\/]/g, '-') + '.png';
      a.click();
      UI.toast('success', 'QR Code diunduh');
    }, 120);
  }

  /**
   * Cetak label beramai-ramai dengan QR ter-render:
   * membuka jendela, menulis HTML, membuat QR per label, lalu print.
   */
  function printLabels(assets, orgName) {
    if (!assets.length) { UI.toast('warning', 'Tidak ada aset terpilih'); return; }
    if (!window.QRCode) { UI.toast('error', 'Library QR belum termuat'); return; }
    var w = window.open('', '_blank', 'width=1000,height=760');
    if (!w) { UI.toast('error', 'Pop-up diblokir. Izinkan pop-up untuk mencetak.'); return; }
    var items = assets.map(function (a, i) {
      return '<div class="amp-label"><div id="qrph' + i + '"></div>' +
        '<div class="amp-label-info"><strong>' + UI.esc(a.asset_name) + '</strong>' +
        '<span class="amp-label-code">' + UI.esc(a.asset_code) + '</span><br>' +
        UI.esc(orgName || '') + '<br>Lokasi: ' + UI.esc(a.location_name || '-') +
        '<br>PJ: ' + UI.esc(a.responsible_name || '-') + '</div></div>';
    }).join('');
    w.document.write('<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Label QR Aset</title>' +
      '<style>body{font-family:Arial,Helvetica,sans-serif;color:#111}' +
      '.amp-label-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;padding:12px}' +
      '.amp-label{border:1px solid #333;border-radius:8px;padding:8px;display:flex;gap:8px;align-items:center;page-break-inside:avoid;background:#fff}' +
      '.amp-label-info{font-size:10px;line-height:1.3}.amp-label-info strong{font-size:11px;display:block;margin-bottom:2px}' +
      '.amp-label-code{font-family:monospace;font-size:10px;color:#333}' +
      'img,canvas{width:72px;height:72px}</style></head><body>' +
      '<div style="padding:12px 12px 0"><h5 class="mb-1">Label QR Code Aset</h5>' +
      '<div style="color:#666;font-size:12px">' + UI.esc(orgName || '') + ' · ' + assets.length + ' label · ' +
      new Date().toLocaleString('id-ID') + '</div></div>' +
      '<div class="amp-label-grid">' + items + '</div></body></html>');
    w.document.close();
    assets.forEach(function (a, i) {
      try { new w.QRCode(w.document.getElementById('qrph' + i), { text: a.qr_token || a.id, width: 72, height: 72, colorDark: '#111', colorLight: '#fff', correctLevel: 1 }); }
      catch (e) { /* ignore */ }
    });
    setTimeout(function () { w.print(); }, 700);
  }

  function printCard(asset, orgName, lookupText) {
    var w = window.open('', '_blank', 'width=760,height=560');
    if (!w) { UI.toast('error', 'Pop-up diblokir.'); return; }
    w.document.write('<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Kartu Inventaris</title>' +
      '<style>body{font-family:Arial;color:#111;padding:18px;font-size:12px}' +
      'table{border-collapse:collapse;width:100%}td,th{border:1px solid #555;padding:6px 8px;font-size:11px;text-align:left}' +
      'th{background:#eee;width:22%}h4{margin:0 0 4px}.hdr{border-bottom:2px solid #111;padding-bottom:6px;margin-bottom:12px}</style></head><body>' +
      '<div class="hdr"><h4>KARTU INVENTARIS BARANG</h4><div>' + UI.esc(orgName || '') + '</div></div>' +
      '<table><tr><th>Kode Inventaris</th><td>' + UI.esc(asset.asset_code) + '</td><th>Nama Barang</th><td>' + UI.esc(asset.asset_name) + '</td></tr>' +
      '<tr><th>Kategori</th><td>' + UI.esc(asset.category_name || '-') + '</td><th>Merek/Tipe</th><td>' + UI.esc([asset.brand, asset.model].filter(Boolean).join(' - ') || '-') + '</td></tr>' +
      '<tr><th>Nomor Seri</th><td>' + UI.esc(asset.serial_number || '-') + '</td><th>Tahun Perolehan</th><td>' + UI.esc(asset.acquisition_date || '-') + '</td></tr>' +
      '<tr><th>Nilai Perolehan</th><td>' + UI.rp(asset.acquisition_cost) + '</td><th>Lokasi</th><td>' + UI.esc(asset.location_name || '-') + '</td></tr>' +
      '<tr><th>Penanggung Jawab</th><td>' + UI.esc(asset.responsible_name || '-') + '</td><th>Kondisi</th><td>' + UI.esc(asset.condition_name || '-') + '</td></tr>' +
      '<tr><th>Keterangan</th><td colspan="3">' + UI.esc(lookupText || asset.specification || '-') + '</td></tr></table>' +
      '<div style="margin-top:10px" id="qrbox"></div>' +
      '<div style="margin-top:26px;display:flex;justify-content:space-between"><div>Petugas Inventaris<br><br><br>_____________________</div>' +
      '<div>Penanggung Jawab<br><br><br>_____________________</div></div></body></html>');
    w.document.close();
    try { new w.QRCode(w.document.getElementById('qrbox'), { text: asset.qr_token || asset.id, width: 90, height: 90, colorDark: '#111', colorLight: '#fff' }); } catch (e) {}
  }

  return { render: render, download: download, printLabels: printLabels, printCard: printCard, ensureToken: ensureToken };
})();
window.QRA = QRA;
