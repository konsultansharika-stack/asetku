/* =====================================================================
 * ASSET MANAGEMENT PRO — demo-data.js
 * Generator data contoh untuk MODE DEMO (tidak dipakai di mode Supabase).
 * Meniru struktur tabel Supabase sehingga seluruh modul bekerja identik.
 * ===================================================================== */

window.AMP_DEMO_SEED = function () {
  'use strict';
  var _id = 0;
  function id(p) { _id++; return p + '-' + String(_id).padStart(4, '0'); }
  function now() { return new Date(); }
  function iso(d) { return d.toISOString(); }
  function daysAgo(n) { var d = now(); d.setDate(d.getDate() - n); return iso(d); }
  function daysAhead(n) { var d = now(); d.setDate(d.getDate() + n); return iso(d); }
  function monthShift(n) { var d = now(); d.setMonth(d.getMonth() + n); return iso(d); }
  function dstr(isoStr) { return isoStr ? isoStr.slice(0, 10) : null; }
  var NOW = iso(now());
  function row(o) { return Object.assign({ created_at: NOW, updated_at: NOW }, o); }

  /* ---------------- ORGANISASI & STRUKTUR ---------------- */
  var org = row({ id: 'org-1', name: 'Yayasan Pendidikan Nusantara', code: 'YPN',
    address: 'Jl. Pendidikan Raya No. 45, Bandung, Jawa Barat', phone: '(022) 8765-4321',
    email: 'info@ypn-or.id', logo_url: null, is_active: true });
  var organizations = [org];

  var units = [
    row({ id: 'unit-ky', organization_id: org.id, parent_unit_id: null, name: 'Kantor Yayasan', code: 'KY', unit_type: 'kantor_pusat', manager_id: 'prof-manajer', is_active: true }),
    row({ id: 'unit-sd', organization_id: org.id, parent_unit_id: null, name: 'SD Nusantara', code: 'SD', unit_type: 'satuan_pendidikan', manager_id: 'prof-pegawai', is_active: true }),
    row({ id: 'unit-smp', organization_id: org.id, parent_unit_id: null, name: 'SMP Nusantara', code: 'SMP', unit_type: 'satuan_pendidikan', manager_id: 'prof-pegawai2', is_active: true }),
    row({ id: 'unit-sma', organization_id: org.id, parent_unit_id: null, name: 'SMA Nusantara', code: 'SMA', unit_type: 'satuan_pendidikan', manager_id: 'prof-manajer', is_active: true })
  ];
  var departments = [
    row({ id: 'dep-keu', organization_id: org.id, unit_id: 'unit-ky', name: 'Keuangan', code: 'KEU', is_active: true }),
    row({ id: 'dep-sar', organization_id: org.id, unit_id: 'unit-ky', name: 'Sarana & Prasarana', code: 'SAR', is_active: true }),
    row({ id: 'dep-sd-ak', organization_id: org.id, unit_id: 'unit-sd', name: 'Akademik SD', code: 'SD-AK', is_active: true }),
    row({ id: 'dep-smp-ak', organization_id: org.id, unit_id: 'unit-smp', name: 'Akademik SMP', code: 'SMP-AK', is_active: true }),
    row({ id: 'dep-sma-ak', organization_id: org.id, unit_id: 'unit-sma', name: 'Akademik SMA', code: 'SMA-AK', is_active: true })
  ];
  var divisions = [
    row({ id: 'div-it', organization_id: org.id, department_id: 'dep-sar', name: 'Dukungan IT', code: 'IT', is_active: true }),
    row({ id: 'div-per', organization_id: org.id, department_id: 'dep-sma-ak', name: 'Perpustakaan', code: 'PER', is_active: true })
  ];

  /* ---------------- PENGGUNA ---------------- */
  var roles = [
    row({ id: 'role-super', name: 'Super Admin', description: 'Akses seluruh sistem dan konfigurasi', role_key: 'super_admin' }),
    row({ id: 'role-pimpinan', name: 'Pimpinan Yayasan', description: 'Dashboard, laporan, persetujuan penghapusan', role_key: 'pimpinan' }),
    row({ id: 'role-direktur', name: 'Direktur', description: 'Memantau aset dan menyetujui transaksi', role_key: 'direktur' }),
    row({ id: 'role-manajer', name: 'Manajer Departemen', description: 'Mengajukan kebutuhan dan menyetujui transaksi unit', role_key: 'manajer' }),
    row({ id: 'role-pengelola', name: 'Pengelola Inventaris', description: 'Mengelola data aset, QR, peminjaman, opname', role_key: 'pengelola' }),
    row({ id: 'role-gudang', name: 'Petugas Gudang', description: 'Penerimaan barang dan pengelolaan stok', role_key: 'gudang' }),
    row({ id: 'role-teknisi', name: 'Teknisi', description: 'Mengerjakan tiket pemeliharaan', role_key: 'teknisi' }),
    row({ id: 'role-keuangan', name: 'Keuangan', description: 'Penyusutan, nilai buku, data pengadaan', role_key: 'keuangan' }),
    row({ id: 'role-pegawai', name: 'Pegawai', description: 'Mengajukan peminjaman dan melaporkan kerusakan', role_key: 'pegawai' })
  ];

  var people = [
    ['prof-super', 'Dr. H. Ahmad Fauzi, S.Kom', 'superadmin@demo.id', '19850001', 'unit-ky', 'dep-sar', null],
    ['prof-pimpinan', 'Hj. Ratna Wijaya, M.Pd', 'pimpinan@demo.id', '19800002', 'unit-ky', 'dep-sar', null],
    ['prof-direktur', 'Drs. Bambang Sutrisno', 'direktur@demo.id', '19820003', 'unit-ky', 'dep-sar', null],
    ['prof-manajer', 'Ir. Surya Pratama, M.M', 'manajer@demo.id', '19870004', 'unit-ky', 'dep-sar', 'div-it'],
    ['prof-pengelola', 'Dewi Anggraini, S.Si', 'pengelola@demo.id', '19920005', 'unit-ky', 'dep-sar', 'div-it'],
    ['prof-gudang', 'Budi Santoso', 'gudang@demo.id', '19940006', 'unit-ky', 'dep-sar', null],
    ['prof-teknisi', 'Rudi Hartono', 'teknisi@demo.id', '19950007', 'unit-ky', 'dep-sar', 'div-it'],
    ['prof-keuangan', 'Siti Rahmawati, S.E', 'keuangan@demo.id', '19930008', 'unit-ky', 'dep-keu', null],
    ['prof-pegawai', 'Andi Prasetyo, S.Pd', 'pegawai@demo.id', '19960009', 'unit-smp', 'dep-smp-ak', null],
    ['prof-pegawai2', 'Lestari Handayani, S.Pd', 'guru2@demo.id', '19970010', 'unit-sma', 'dep-sma-ak', 'div-per'],
    ['prof-pegawai3', 'Agus Salim', 'lab@demo.id', '19980011', 'unit-sma', 'dep-sma-ak', 'div-it']
  ];
  var profiles = people.map(function (p, i) {
    return row({ id: p[0], organization_id: org.id, full_name: p[1], email: p[2], phone: '08' + (1212345678 + i),
      employee_number: p[3], unit_id: p[4], department_id: p[5], division_id: p[6], is_active: true });
  });
  var roleMap = { 'prof-super': 'role-super', 'prof-pimpinan': 'role-pimpinan', 'prof-direktur': 'role-direktur',
    'prof-manajer': 'role-manajer', 'prof-pengelola': 'role-pengelola', 'prof-gudang': 'role-gudang',
    'prof-teknisi': 'role-teknisi', 'prof-keuangan': 'role-keuangan', 'prof-pegawai': 'role-pegawai',
    'prof-pegawai2': 'role-manajer', 'prof-pegawai3': 'role-pegawai' };
  var user_roles = Object.keys(roleMap).map(function (uid2) {
    return row({ id: id('ur'), user_id: uid2, role_id: roleMap[uid2], organization_id: org.id });
  });
  var auth_users = people.map(function (p) {
    return row({ id: p[0], user_id: p[0], email: p[2], password: 'demo123' }); // khusus mode demo
  });

  /* ---------------- MASTER LAIN ---------------- */
  var asset_conditions = [
    row({ id: 'cond-baru', condition_name: 'Baru', condition_code: 'BRU', description: 'Kondisi baru belum digunakan' }),
    row({ id: 'cond-baik', condition_name: 'Baik', condition_code: 'BIK', description: 'Kondisi baik dan berfungsi normal' }),
    row({ id: 'cond-cb', condition_name: 'Cukup Baik', condition_code: 'CKB', description: 'Berfungsi dengan penurunan kualitas ringan' }),
    row({ id: 'cond-rr', condition_name: 'Rusak Ringan', condition_code: 'RRG', description: 'Kerusakan ringan, masih dapat diperbaiki' }),
    row({ id: 'cond-rb', condition_name: 'Rusak Berat', condition_code: 'RBG', description: 'Kerusakan berat, tidak layak pakai' }),
    row({ id: 'cond-tf', condition_name: 'Tidak Berfungsi', condition_code: 'TFG', description: 'Tidak berfungsi sama sekali' }),
    row({ id: 'cond-hilang', condition_name: 'Hilang', condition_code: 'HLG', description: 'Barang tidak ditemukan' }),
    row({ id: 'cond-hapus', condition_name: 'Dihapuskan', condition_code: 'DHP', description: 'Telah dihapuskan dari daftar aset' })
  ];
  var units_of_measure = [
    row({ id: 'uom-unit', name: 'Unit', symbol: 'unit' }), row({ id: 'uom-buah', name: 'Buah', symbol: 'bh' }),
    row({ id: 'uom-set', name: 'Set', symbol: 'set' }), row({ id: 'uom-paket', name: 'Paket', symbol: 'pkt' }),
    row({ id: 'uom-m', name: 'Meter', symbol: 'm' }), row({ id: 'uom-m2', name: 'Meter Persegi', symbol: 'm²' }),
    row({ id: 'uom-l', name: 'Liter', symbol: 'L' }), row({ id: 'uom-kg', name: 'Kilogram', symbol: 'kg' }),
    row({ id: 'uom-rim', name: 'Rim', symbol: 'rim' }), row({ id: 'uom-lain', name: 'Lainnya', symbol: '-' })
  ];
  var CATS = [
    ['cat-tnh', 'TNH', 'Tanah', true, false], ['cat-bdg', 'BDG', 'Bangunan', true, false],
    ['cat-knd', 'KND', 'Kendaraan', true, false], ['cat-kmp', 'KMP', 'Komputer dan Laptop', false, false],
    ['cat-prt', 'PRT', 'Printer dan Scanner', false, false], ['cat-pkt', 'PKT', 'Peralatan Kantor', false, false],
    ['cat-mbl', 'MBL', 'Meubelair', false, false], ['cat-pkl', 'PKL', 'Peralatan Kelas', false, false],
    ['cat-plb', 'PLB', 'Peralatan Laboratorium', false, false], ['cat-por', 'POR', 'Peralatan Olahraga', false, false],
    ['cat-pdr', 'PDR', 'Peralatan Dapur', false, false], ['cat-psr', 'PSR', 'Peralatan Asrama', false, false],
    ['cat-plt', 'PLT', 'Peralatan Listrik', false, false], ['cat-pel', 'PEL', 'Peralatan Elektronik', false, false],
    ['cat-pjr', 'PJR', 'Peralatan Jaringan', false, false], ['cat-pks', 'PKS', 'Peralatan Kesehatan', false, false],
    ['cat-pkm', 'PKM', 'Peralatan Keamanan', false, false], ['cat-bpk', 'BPK', 'Buku dan Perpustakaan', false, false],
    ['cat-bhp', 'BHP', 'Barang Habis Pakai', false, true]
  ];
  var asset_categories = CATS.map(function (c) {
    return row({ id: c[0], organization_id: org.id, parent_id: null, category_code: c[1], category_name: c[2],
      description: null, is_fixed_asset: c[3], is_consumable: c[4], is_active: true });
  });
  var funding_sources = [
    row({ id: 'fund-bos', organization_id: org.id, name: 'Dana BOS', description: 'Bantuan Operasional Sekolah', is_active: true }),
    row({ id: 'fund-yayasan', organization_id: org.id, name: 'Kas Yayasan', description: 'Pembiayaan internal yayasan', is_active: true }),
    row({ id: 'fund-hibah', organization_id: org.id, name: 'Hibah / Bantuan', description: 'Hibah pihak ketiga', is_active: true }),
    row({ id: 'fund-komite', organization_id: org.id, name: 'Dana Komite', description: 'Iuran komite orang tua', is_active: true })
  ];
  var suppliers = [
    row({ id: 'sup-1', organization_id: org.id, supplier_code: 'SPL-001', supplier_name: 'PT Sumber Teknologi Nusantara',
      address: 'Jl. Asia Afrika 88, Bandung', phone: '(022) 4211-100', email: 'sales@sumber-teknologi.co.id',
      contact_person: 'Hendra Wijaya', tax_number: '01.234.567.8-091.000', is_active: true }),
    row({ id: 'sup-2', organization_id: org.id, supplier_code: 'SPL-002', supplier_name: 'CV Aneka Meubel Jaya',
      address: 'Jl. Cibaduyut 12, Bandung', phone: '(022) 5234-221', email: 'order@anekameubel.co.id',
      contact_person: 'Sutarno', tax_number: '02.345.678.9-052.000', is_active: true }),
    row({ id: 'sup-3', organization_id: org.id, supplier_code: 'SPL-003', supplier_name: 'PT Mitra Komputer Indonesia',
      address: 'Jl. Braga 45, Bandung', phone: '(022) 8765-330', email: 'info@mitrakomputer.co.id',
      contact_person: 'Lina Marlina', tax_number: '03.456.789.0-431.000', is_active: true }),
    row({ id: 'sup-4', organization_id: org.id, supplier_code: 'SPL-004', supplier_name: 'Toko Buku Cendekia',
      address: 'Jl. Dago 21, Bandung', phone: '(022) 2501-441', email: 'cs@bukucendekia.co.id',
      contact_person: 'Ratih Kusuma', tax_number: null, is_active: true })
  ];

  /* ---------------- LOKASI ---------------- */
  var locations = [
    row({ id: 'loc-gda', organization_id: org.id, parent_location_id: null, location_code: 'GDA', location_name: 'Gedung A', location_type: 'gedung', building: 'Gedung A', floor: '-', room: '-', description: 'Gedung pembelajaran utama 2 lantai', responsible_user_id: 'prof-manajer', is_active: true }),
    row({ id: 'loc-gdb', organization_id: org.id, parent_location_id: null, location_code: 'GDB', location_name: 'Gedung B', location_type: 'gedung', building: 'Gedung B', floor: '-', room: '-', description: 'Gedung administrasi dan gudang', responsible_user_id: 'prof-gudang', is_active: true }),
    row({ id: 'loc-ky', organization_id: org.id, parent_location_id: null, location_code: 'KY', location_name: 'Kantor Yayasan', location_type: 'gedung', building: 'Kantor Yayasan', floor: '-', room: '-', description: 'Kantor pusat yayasan', responsible_user_id: 'prof-super', is_active: true }),
    row({ id: 'loc-lap', organization_id: org.id, parent_location_id: null, location_code: 'LAP', location_name: 'Area Lapangan', location_type: 'area', building: 'Lapangan', floor: '-', room: '-', description: 'Lapangan olahraga', responsible_user_id: 'prof-pegawai', is_active: true }),
    row({ id: 'loc-a1', organization_id: org.id, parent_location_id: 'loc-gda', location_code: 'GDA-1A', location_name: 'Ruang Kelas 1A', location_type: 'ruangan', building: 'Gedung A', floor: '1', room: 'Ruang Kelas 1A', description: 'Kelas 1A SMA', responsible_user_id: 'prof-pegawai2', capacity: 36, is_active: true }),
    row({ id: 'loc-a2', organization_id: org.id, parent_location_id: 'loc-gda', location_code: 'GDA-1B', location_name: 'Ruang Kelas 1B', location_type: 'ruangan', building: 'Gedung A', floor: '1', room: 'Ruang Kelas 1B', description: 'Kelas 1B SMP', responsible_user_id: 'prof-pegawai', capacity: 36, is_active: true }),
    row({ id: 'loc-a3', organization_id: org.id, parent_location_id: 'loc-gda', location_code: 'GDA-RG', location_name: 'Ruang Guru', location_type: 'ruangan', building: 'Gedung A', floor: '1', room: 'Ruang Guru', description: 'Ruang guru', responsible_user_id: 'prof-pegawai2', capacity: 24, is_active: true }),
    row({ id: 'loc-a4', organization_id: org.id, parent_location_id: 'loc-gda', location_code: 'GDA-KS', location_name: 'Ruang Kepala Sekolah', location_type: 'ruangan', building: 'Gedung A', floor: '1', room: 'Ruang Kepala Sekolah', description: 'Kepala sekolah SD', responsible_user_id: 'prof-pegawai', capacity: 6, is_active: true }),
    row({ id: 'loc-a5', organization_id: org.id, parent_location_id: 'loc-gda', location_code: 'GDA-PER', location_name: 'Perpustakaan', location_type: 'ruangan', building: 'Gedung A', floor: '1', room: 'Perpustakaan', description: 'Perpustakaan SMA', responsible_user_id: 'prof-pegawai2', capacity: 40, is_active: true }),
    row({ id: 'loc-b1', organization_id: org.id, parent_location_id: 'loc-gda', location_code: 'GDA-LK', location_name: 'Lab Komputer', location_type: 'ruangan', building: 'Gedung A', floor: '2', room: 'Lab Komputer', description: 'Laboratorium komputer', responsible_user_id: 'prof-pegawai3', capacity: 36, is_active: true }),
    row({ id: 'loc-b2', organization_id: org.id, parent_location_id: 'loc-gda', location_code: 'GDA-LI', location_name: 'Lab IPA', location_type: 'ruangan', building: 'Gedung A', floor: '2', room: 'Lab IPA', description: 'Laboratorium IPA', responsible_user_id: 'prof-pegawai', capacity: 36, is_active: true }),
    row({ id: 'loc-b3', organization_id: org.id, parent_location_id: 'loc-gda', location_code: 'GDA-RR', location_name: 'Ruang Rapat', location_type: 'ruangan', building: 'Gedung A', floor: '2', room: 'Ruang Rapat', description: 'Ruang rapat yayasan', responsible_user_id: 'prof-manajer', capacity: 30, is_active: true }),
    row({ id: 'loc-c1', organization_id: org.id, parent_location_id: 'loc-gdb', location_code: 'GDB-GU', location_name: 'Gudang Utama', location_type: 'ruangan', building: 'Gedung B', floor: '1', room: 'Gudang Utama', description: 'Gudang penyimpanan barang', responsible_user_id: 'prof-gudang', capacity: 200, is_active: true }),
    row({ id: 'loc-c2', organization_id: org.id, parent_location_id: 'loc-gdb', location_code: 'GDB-TU', location_name: 'Ruang Tata Usaha', location_type: 'ruangan', building: 'Gedung B', floor: '1', room: 'Ruang Tata Usaha', description: 'Tata usaha SMA', responsible_user_id: 'prof-pegawai2', capacity: 12, is_active: true }),
    row({ id: 'loc-c3', organization_id: org.id, parent_location_id: 'loc-gdb', location_code: 'GDB-AUL', location_name: 'Aula', location_type: 'ruangan', building: 'Gedung B', floor: '1', room: 'Aula', description: 'Aula serbaguna', responsible_user_id: 'prof-manajer', capacity: 250, is_active: true }),
    row({ id: 'loc-e1', organization_id: org.id, parent_location_id: 'loc-ky', location_code: 'KY-RD', location_name: 'Ruang Direktur', location_type: 'ruangan', building: 'Kantor Yayasan', floor: '1', room: 'Ruang Direktur', description: null, responsible_user_id: 'prof-direktur', capacity: 8, is_active: true }),
    row({ id: 'loc-e2', organization_id: org.id, parent_location_id: 'loc-ky', location_code: 'KY-RK', location_name: 'Ruang Keuangan', location_type: 'ruangan', building: 'Kantor Yayasan', floor: '1', room: 'Ruang Keuangan', description: null, responsible_user_id: 'prof-keuangan', capacity: 8, is_active: true })
  ];

  /* ---------------- ASET ---------------- */
  var assets = [], asset_seq = {};
  function assetCode(catCode, year) {
    asset_seq[catCode] = (asset_seq[catCode] || 0) + 1;
    return catCode + '/' + year + '/' + String(asset_seq[catCode]).padStart(4, '0');
  }
  function mkAsset(o) {
    var cat = CATS.find(function (c) { return c[1] === o.cat; });
    var a = row({
      id: o.id, organization_id: org.id,
      asset_code: o.code || assetCode(o.cat, o.year),
      asset_name: o.name, category_id: cat ? cat[0] : null,
      unit_of_measure_id: o.qty > 1 ? 'uom-buah' : 'uom-unit',
      brand: o.brand || null, model: o.model || null, serial_number: o.serial || null,
      specification: o.spec || null, description: o.desc || null,
      asset_type: cat ? (cat[3] ? 'fixed' : cat[4] ? 'consumable' : 'inventory') : 'inventory',
      acquisition_date: o.year + '-' + String(1 + (asset_seq[o.cat] % 12)).padStart(2, '0') + '-05',
      acquisition_cost: o.cost, quantity: o.qty || 1,
      current_condition_id: o.cond, current_location_id: o.loc, unit_id: o.unit,
      department_id: o.dep || null, division_id: null,
      responsible_user_id: o.pj || 'prof-pengelola', user_id: o.pengguna || null,
      supplier_id: o.sup || null, funding_source_id: o.fund || 'fund-yayasan',
      invoice_number: o.inv || ('INV/' + o.year + '/' + String(1000 + asset_seq[o.cat])),
      procurement_number: null, warranty_start_date: o.year + '-01-01',
      warranty_end_date: (o.year + 2) + '-01-01',
      photo_path: null, qr_token: o.noqr ? null : id('qrt'),
      asset_status: o.status || 'Aktif', is_active: (o.status || 'Aktif') !== 'Dihapuskan',
      ownership_status: 'Dimiliki Sendiri'
    });
    assets.push(a);
    return a;
  }
  var KMP = 'cat-kmp', PRT = 'cat-prt', PEL = 'cat-pel', PLT = 'cat-plt', MBL = 'cat-mbl';

  mkAsset({ id: 'as-lap1', cat: 'KMP', name: 'Laptop Lenovo ThinkPad E14', brand: 'Lenovo', model: 'ThinkPad E14 Gen 4', serial: 'PF2XR8L1', spec: 'Core i5-1235U, 16GB RAM, SSD 512GB, 14" FHD', year: 2023, cost: 12500000, cond: 'cond-baik', loc: 'loc-b1', unit: 'unit-sma', dep: 'dep-sma-ak', sup: 'sup-3', pj: 'prof-pegawai3' });
  mkAsset({ id: 'as-lap2', cat: 'KMP', name: 'Laptop Lenovo V15 G4', brand: 'Lenovo', model: 'V15 G4 IRU', serial: 'PF4YT2K9', spec: 'Core i5-1335U, 16GB RAM, SSD 512GB, 15.6" FHD', year: 2026, cost: 9200000, cond: 'cond-baru', loc: 'loc-c2', unit: 'unit-sma', dep: 'dep-sma-ak', sup: 'sup-1', pj: 'prof-pengelola', status: 'Menunggu Verifikasi' });
  mkAsset({ id: 'as-lap3', cat: 'KMP', name: 'Laptop HP ProBook 450 G9', brand: 'HP', model: 'ProBook 450 G9', serial: '5CD341XQ12', spec: 'Core i5-1235U, 8GB RAM, SSD 512GB, 15.6" FHD', year: 2024, cost: 14000000, cond: 'cond-baik', loc: 'loc-e1', unit: 'unit-ky', dep: 'dep-sar', sup: 'sup-3', pj: 'prof-direktur', status: 'Dipinjam' });
  mkAsset({ id: 'as-lap4', cat: 'KMP', name: 'Laptop ASUS Vivobook 15', brand: 'ASUS', model: 'X1502ZA', serial: 'N4HXCV00L1', spec: 'Core i5-1240P, 8GB RAM, SSD 512GB, 15.6" FHD', year: 2024, cost: 8500000, cond: 'cond-cb', loc: 'loc-a3', unit: 'unit-smp', dep: 'dep-smp-ak', sup: 'sup-3', pj: 'prof-pegawai' });
  mkAsset({ id: 'as-lap5', cat: 'KMP', name: 'Laptop Acer TravelMate P2', brand: 'Acer', model: 'TMP214-53', serial: 'NXVGMAL001', spec: 'Core i5-1135G7, 8GB RAM, SSD 256GB, 14" FHD', year: 2023, cost: 9800000, cond: 'cond-baik', loc: 'loc-a4', unit: 'unit-sd', dep: 'dep-sd-ak', sup: 'sup-3', pj: 'prof-pegawai' });
  mkAsset({ id: 'as-lap6', cat: 'KMP', name: 'Laptop Dell Latitude 3420', brand: 'Dell', model: 'Latitude 3420', serial: 'DL3420X99', spec: 'Core i5-1135G7, 8GB RAM, SSD 256GB, 14" HD', year: 2022, cost: 11000000, cond: 'cond-hilang', loc: 'loc-c1', unit: 'unit-sma', dep: 'dep-sma-ak', sup: 'sup-3', pj: 'prof-pegawai2', status: 'Hilang' });
  mkAsset({ id: 'as-lap7', cat: 'KMP', name: 'Laptop Lenovo IdeaPad Slim 3', brand: 'Lenovo', model: '15ITL6', serial: 'PF5UD2LM01', spec: 'Core i3-1115G4, 8GB RAM, SSD 256GB, 15.6" FHD', year: 2026, cost: 7900000, cond: 'cond-baru', loc: 'loc-c1', unit: 'unit-sma', dep: 'dep-sma-ak', sup: 'sup-1', pj: 'prof-gudang', status: 'Draft', noqr: true });

  var pcNames = ['PC Lab Komputer 01', 'PC Lab Komputer 02', 'PC Lab Komputer 03', 'PC Lab Komputer 04', 'PC Lab Komputer 05', 'PC Lab Komputer 06', 'PC Lab Komputer 07', 'PC Lab Komputer 08'];
  pcNames.forEach(function (nm, i) {
    mkAsset({ id: 'as-pc' + (i + 1), cat: 'KMP', name: nm, brand: 'Lenovo', model: 'ThinkCentre M720q', serial: 'PC720-' + (1001 + i), spec: 'Core i5-8400T, 8GB RAM, SSD 256GB (Tiny)', year: 2022, cost: 7500000, cond: i === 7 ? 'cond-cb' : 'cond-baik', loc: 'loc-b1', unit: 'unit-sma', dep: 'dep-sma-ak', sup: 'sup-3', pj: 'prof-pegawai3' });
  });

  mkAsset({ id: 'as-prt1', cat: 'PRT', name: 'Printer Epson EcoTank L3210', brand: 'Epson', model: 'L3210 AIO', serial: 'EP3210-8821', spec: 'Print/Scan/Copy, USB, tinta tank', year: 2024, cost: 2900000, cond: 'cond-baik', loc: 'loc-c2', unit: 'unit-sma', dep: 'dep-sma-ak', sup: 'sup-1', pj: 'prof-pegawai2' });
  mkAsset({ id: 'as-prt2', cat: 'PRT', name: 'Printer Canon PIXMA G2010', brand: 'Canon', model: 'PIXMA G2010', serial: 'CN2010-4432', spec: 'AIO tinta tank, USB', year: 2023, cost: 2600000, cond: 'cond-rr', loc: 'loc-a3', unit: 'unit-smp', dep: 'dep-smp-ak', sup: 'sup-1', pj: 'prof-pegawai' });
  mkAsset({ id: 'as-prt3', cat: 'PRT', name: 'Printer Epson EcoTank M1120', brand: 'Epson', model: 'M1120', serial: 'EP1120-1102', spec: 'Monokrom Wi-Fi, tinta tank', year: 2026, cost: 2400000, cond: 'cond-baru', loc: 'loc-e2', unit: 'unit-ky', dep: 'dep-keu', sup: 'sup-1', pj: 'prof-keuangan', status: 'Menunggu Verifikasi' });
  mkAsset({ id: 'as-prt4', cat: 'PRT', name: 'Printer Epson LX-310 Dot Matrix', brand: 'Epson', model: 'LX-310', serial: 'EP310-7781', spec: 'Dot matrix 9 pin, USB + Serial', year: 2020, cost: 2100000, cond: 'cond-rb', loc: 'loc-c2', unit: 'unit-sma', dep: 'dep-sma-ak', sup: 'sup-1', pj: 'prof-pegawai2' });
  mkAsset({ id: 'as-prt5', cat: 'PRT', name: 'Printer Epson Stylus T60 (Lama)', brand: 'Epson', model: 'Stylus T60', serial: 'EPT60-2001', spec: 'AIO foto, USB', year: 2019, cost: 3200000, cond: 'cond-hapus', loc: 'loc-c1', unit: 'unit-sma', dep: 'dep-sma-ak', sup: 'sup-1', pj: 'prof-gudang', status: 'Dihapuskan' });

  mkAsset({ id: 'as-pro1', cat: 'PEL', name: 'Proyektor Epson EB-X51', brand: 'Epson', model: 'EB-X51', serial: 'EPX51-3310', spec: 'XGA 3LCD 3.400 ANSI lumen', year: 2024, cost: 6800000, cond: 'cond-baik', loc: 'loc-a1', unit: 'unit-sma', dep: 'dep-sma-ak', sup: 'sup-1', pj: 'prof-pegawai2', status: 'Dipinjam' });
  mkAsset({ id: 'as-pro2', cat: 'PEL', name: 'Proyektor BenQ MX560', brand: 'BenQ', model: 'MX560', serial: 'BN560-2205', spec: 'XGA DLP 4.000 ANSI lumen', year: 2023, cost: 6200000, cond: 'cond-baik', loc: 'loc-a2', unit: 'unit-smp', dep: 'dep-smp-ak', sup: 'sup-1', pj: 'prof-pegawai' });
  mkAsset({ id: 'as-pro3', cat: 'PEL', name: 'Proyektor Panasonic PT-LB305', brand: 'Panasonic', model: 'PT-LB305', serial: 'PN305-1108', spec: 'XGA 3.100 lumen, portabel', year: 2022, cost: 7400000, cond: 'cond-rr', loc: 'loc-c3', unit: 'unit-ky', dep: 'dep-sar', sup: 'sup-1', pj: 'prof-manajer' });

  mkAsset({ id: 'as-tv1', cat: 'PEL', name: 'Smart TV LED 43 inci', brand: 'LG', model: '43UR7800', serial: 'LG43-9012', spec: '4K UHD Smart TV', year: 2024, cost: 5500000, cond: 'cond-baik', loc: 'loc-a5', unit: 'unit-sma', dep: 'dep-sma-ak', sup: 'sup-1', pj: 'prof-pegawai2' });
  mkAsset({ id: 'as-snd1', cat: 'PEL', name: 'Sound System Aula', brand: 'Yamaha', model: 'Stagepas 600BT', serial: 'YH600-5567', spec: 'Speaker aktif 680W + mixer 8 channel', year: 2021, cost: 15000000, cond: 'cond-baik', loc: 'loc-c3', unit: 'unit-ky', dep: 'dep-sar', sup: 'sup-1', pj: 'prof-manajer' });

  mkAsset({ id: 'as-ac1', cat: 'PLT', name: 'AC Split 1 PK Gree', brand: 'Gree', model: 'GWC-09QEC', serial: 'GR09-7781', spec: '1 PK Standard R32', year: 2023, cost: 4200000, cond: 'cond-baik', loc: 'loc-a1', unit: 'unit-sma', dep: 'dep-sma-ak', sup: 'sup-2', pj: 'prof-pegawai2' });
  mkAsset({ id: 'as-ac2', cat: 'PLT', name: 'AC Split 1 PK Daikin', brand: 'Daikin', model: 'FTKC25Q2V14', serial: 'DK25-4410', spec: '1 PK Inverter R32', year: 2024, cost: 5100000, cond: 'cond-baik', loc: 'loc-a3', unit: 'unit-smp', dep: 'dep-smp-ak', sup: 'sup-2', pj: 'prof-pegawai' });
  mkAsset({ id: 'as-ac3', cat: 'PLT', name: 'AC Split 1/2 PK Sharp', brand: 'Sharp', model: 'AH-A5SEY', serial: 'SH05-2210', spec: '1/2 PK Standard R32', year: 2022, cost: 3800000, cond: 'cond-baik', loc: 'loc-a4', unit: 'unit-sd', dep: 'dep-sd-ak', sup: 'sup-2', pj: 'prof-pegawai' });
  mkAsset({ id: 'as-ac4', cat: 'PLT', name: 'AC Split 1 PK Panasonic', brand: 'Panasonic', model: 'CS-YP9ZKW', serial: 'PN09-6654', spec: '1 PK Inverter Nanoe-X', year: 2023, cost: 4900000, cond: 'cond-cb', loc: 'loc-b1', unit: 'unit-sma', dep: 'dep-sma-ak', sup: 'sup-2', pj: 'prof-pegawai3', status: 'Dalam Pemeliharaan' });
  mkAsset({ id: 'as-ac5', cat: 'PLT', name: 'AC Split 3/4 PK LG', brand: 'LG', model: 'T09EV-24', serial: 'LG09-1120', spec: '3/4 PK Dual Inverter', year: 2021, cost: 4100000, cond: 'cond-rr', loc: 'loc-c2', unit: 'unit-sma', dep: 'dep-sma-ak', sup: 'sup-2', pj: 'prof-pegawai2' });

  mkAsset({ id: 'as-gen1', cat: 'PLT', name: 'Genset 5.000 Watt', brand: 'Honda', model: 'EU50is', serial: 'HN50-3307', spec: 'Inverter 5 kVA bensin', year: 2020, cost: 18500000, cond: 'cond-baik', loc: 'loc-c1', unit: 'unit-ky', dep: 'dep-sar', sup: 'sup-2', pj: 'prof-gudang' });
  mkAsset({ id: 'as-pnl1', cat: 'PLT', name: 'Panel Listrik Distribusi Utama', brand: 'Schneider', model: 'Acti9 12 Group', serial: 'SC12-0918', spec: 'MCB 12 grup + kWh meter', year: 2019, cost: 6500000, cond: 'cond-baik', loc: 'loc-gda', unit: 'unit-ky', dep: 'dep-sar', sup: 'sup-2', pj: 'prof-teknisi' });

  mkAsset({ id: 'as-cct1', cat: 'PKM', name: 'CCTV Set 4 Kamera Hikvision', brand: 'Hikvision', model: 'DS-2CE16H0T + NVR', serial: 'HK4C-2043', spec: '4 kamera 5MP + NVR 1TB', year: 2023, cost: 8900000, cond: 'cond-baik', loc: 'loc-gda', unit: 'unit-ky', dep: 'dep-sar', sup: 'sup-2', pj: 'prof-teknisi' });
  mkAsset({ id: 'as-cct2', cat: 'PKM', name: 'CCTV Set 2 Kamera', brand: 'Hikvision', model: 'DS-2CE16D0T + DVR', serial: 'HK2C-1145', spec: '2 kamera 2MP + DVR 500GB', year: 2024, cost: 5400000, cond: 'cond-baik', loc: 'loc-gdb', unit: 'unit-ky', dep: 'dep-sar', sup: 'sup-2', pj: 'prof-teknisi' });

  mkAsset({ id: 'as-rtr1', cat: 'PJR', name: 'Router Mikrotik hEX RB750Gr3', brand: 'Mikrotik', model: 'RB750Gr3', serial: 'MK750-8812', spec: '5 port Gigabit RouterOS L4', year: 2024, cost: 1600000, cond: 'cond-baik', loc: 'loc-b1', unit: 'unit-sma', dep: 'dep-sma-ak', sup: 'sup-3', pj: 'prof-pegawai3' });
  mkAsset({ id: 'as-swt1', cat: 'PJR', name: 'Switch TP-Link 24 Port Gigabit', brand: 'TP-Link', model: 'TL-SG1024', serial: 'TP24-5561', spec: '24 port gigabit rackmount', year: 2023, cost: 2800000, cond: 'cond-baik', loc: 'loc-b1', unit: 'unit-sma', dep: 'dep-sma-ak', sup: 'sup-3', pj: 'prof-pegawai3' });
  mkAsset({ id: 'as-ap1', cat: 'PJR', name: 'Access Point Ubiquiti UniFi UAP-AC-LR', brand: 'Ubiquiti', model: 'UAP-AC-LR', serial: 'UBIAC-3321', spec: 'Wi-Fi 5 AC dual band, PoE', year: 2024, cost: 2200000, cond: 'cond-baik', loc: 'loc-gda', unit: 'unit-ky', dep: 'dep-sar', sup: 'sup-3', pj: 'prof-pegawai3' });

  mkAsset({ id: 'as-fot1', cat: 'PKT', name: 'Mesin Fotokopi Sharp AR-6020NV', brand: 'Sharp', model: 'AR-6020NV', serial: 'SH6020-4410', spec: 'A3 20ppm, ADF, duplex, jaringan', year: 2022, cost: 18900000, cond: 'cond-baik', loc: 'loc-c2', unit: 'unit-sma', dep: 'dep-sma-ak', sup: 'sup-1', pj: 'prof-pegawai2' });
  mkAsset({ id: 'as-shr1', cat: 'PKT', name: 'Mesin Penghancur Dokumen', brand: 'Ideal', model: '2265 CC', serial: 'ID2265-1102', spec: 'Cross cut P-4, 22 lembar', year: 2023, cost: 4700000, cond: 'cond-baik', loc: 'loc-e2', unit: 'unit-ky', dep: 'dep-keu', sup: 'sup-1', pj: 'prof-keuangan' });
  mkAsset({ id: 'as-dsp1', cat: 'PKT', name: 'Dispenser Air Galon', brand: 'Sharp', model: 'SWD-T90L', serial: 'SHDW-7782', spec: 'Panas/dingin', year: 2024, cost: 1300000, cond: 'cond-baik', loc: 'loc-a3', unit: 'unit-smp', dep: 'dep-smp-ak', sup: 'sup-2', pj: 'prof-pegawai' });

  mkAsset({ id: 'as-mjg1', cat: 'MBL', name: 'Meja Guru Kayu Jati', brand: 'Lokal', model: 'MG-150', serial: null, spec: '150x70x75 cm, kayu jati solid', year: 2020, cost: 2500000, cond: 'cond-cb', loc: 'loc-a3', unit: 'unit-smp', dep: 'dep-smp-ak', sup: 'sup-2', pj: 'prof-pegawai', status: 'Dalam Mutasi' });
  mkAsset({ id: 'as-lma1', cat: 'MBL', name: 'Lemari Arsip 4 Pintu Besi', brand: 'Brother', model: 'BA-4P', serial: 'BR4P-3320', spec: '4 pintu sliding, sekrup anti maling', year: 2021, cost: 3900000, cond: 'cond-baik', loc: 'loc-c2', unit: 'unit-sma', dep: 'dep-sma-ak', sup: 'sup-2', pj: 'prof-pegawai2' });
  mkAsset({ id: 'as-krs1', cat: 'MBL', name: 'Kursi Siswa', brand: 'Lokal', model: 'KS-STD', serial: null, spec: 'Besi hollow + triplek duco', year: 2022, cost: 38400000, qty: 120, cond: 'cond-baik', loc: 'loc-a1', unit: 'unit-sma', dep: 'dep-sma-ak', sup: 'sup-2', pj: 'prof-pegawai2' });
  mkAsset({ id: 'as-mjs1', cat: 'MBL', name: 'Meja Siswa', brand: 'Lokal', model: 'MJ-STD', serial: null, spec: '120x60x75 cm, kayu solid', year: 2022, cost: 28000000, qty: 40, cond: 'cond-baik', loc: 'loc-a2', unit: 'unit-smp', dep: 'dep-smp-ak', sup: 'sup-2', pj: 'prof-pegawai' });
  mkAsset({ id: 'as-mjp1', cat: 'MBL', name: 'Meja Perpustakaan Reading Table', brand: 'Lokal', model: 'MJ-PER', serial: null, spec: '200x100x75 cm kap 8 orang', year: 2021, cost: 4200000, cond: 'cond-baik', loc: 'loc-a5', unit: 'unit-sma', dep: 'dep-sma-ak', sup: 'sup-2', pj: 'prof-pegawai2' });

  mkAsset({ id: 'as-mik1', cat: 'PLB', name: 'Mikroskop Binokuler Olympus CX23', brand: 'Olympus', model: 'CX23', serial: 'OLCX23-1102', spec: 'Perbesaran 40x-1000x, LED', year: 2022, cost: 12800000, cond: 'cond-baik', loc: 'loc-b2', unit: 'unit-smp', dep: 'dep-smp-ak', sup: 'sup-4', pj: 'prof-pegawai' });
  mkAsset({ id: 'as-lbk1', cat: 'PLB', name: 'Set Alat Laboratorium Kimia', brand: 'Pyrex', model: 'Lab Kit-C', serial: null, spec: 'Set gelas kimia, buret, erlenmeyer, standar', year: 2023, cost: 9600000, cond: 'cond-baik', loc: 'loc-b2', unit: 'unit-sma', dep: 'dep-sma-ak', sup: 'sup-4', pj: 'prof-pegawai2' });

  mkAsset({ id: 'as-bvl1', cat: 'POR', name: 'Bola Voli Mikasa (6 pcs)', brand: 'Mikasa', model: 'MVA200', serial: null, spec: 'Bola voli indoor ukuran 5', year: 2024, cost: 3600000, qty: 6, cond: 'cond-baik', loc: 'loc-lap', unit: 'unit-ky', dep: 'dep-sar', sup: 'sup-4', pj: 'prof-pegawai' });
  mkAsset({ id: 'as-mtr1', cat: 'POR', name: 'Matras Senam', brand: 'Lokal', model: 'MT-200', serial: null, spec: '200x100x10 cm busa rapat', year: 2022, cost: 4800000, qty: 2, cond: 'cond-baik', loc: 'loc-lap', unit: 'unit-ky', dep: 'dep-sar', sup: 'sup-2', pj: 'prof-pegawai' });
  mkAsset({ id: 'as-rng1', cat: 'POR', name: 'Ring Basket Portable', brand: 'Lokal', model: 'RB-305', serial: null, spec: 'Tinggi 3,05 m, roda portable', year: 2020, cost: 7200000, cond: 'cond-rr', loc: 'loc-lap', unit: 'unit-ky', dep: 'dep-sar', sup: 'sup-2', pj: 'prof-pegawai' });

  mkAsset({ id: 'as-kmp1', cat: 'PDR', name: 'Kompor Gas 2 Tungku', brand: 'Rinnai', model: 'RI-522', serial: 'RN522-2210', spec: '2 tungku stainless', year: 2023, cost: 1800000, cond: 'cond-baik', loc: 'loc-c1', unit: 'unit-ky', dep: 'dep-sar', sup: 'sup-2', pj: 'prof-gudang' });
  mkAsset({ id: 'as-lmr1', cat: 'PDR', name: 'Lemari Pendingin Chiller', brand: 'GEA', model: 'AB-388', serial: 'GEA388-1104', spec: 'Kapasitas 388 L', year: 2022, cost: 8300000, cond: 'cond-baik', loc: 'loc-c1', unit: 'unit-ky', dep: 'dep-sar', sup: 'sup-2', pj: 'prof-gudang' });

  mkAsset({ id: 'as-p3k1', cat: 'PKS', name: 'Kotak P3K Lengkap', brand: 'Onemed', model: 'P3K-STD', serial: null, spec: 'Isi standar APAR pendidikan', year: 2025, cost: 900000, cond: 'cond-baik', loc: 'loc-a4', unit: 'unit-sd', dep: 'dep-sd-ak', sup: 'sup-4', pj: 'prof-pegawai' });
  mkAsset({ id: 'as-ten1', cat: 'PKS', name: 'Tensimeter Digital Omron', brand: 'Omron', model: 'HEM-7120', serial: 'OM7120-6621', spec: 'Digital upper arm', year: 2024, cost: 700000, cond: 'cond-baik', loc: 'loc-a3', unit: 'unit-smp', dep: 'dep-smp-ak', sup: 'sup-4', pj: 'prof-pegawai' });

  mkAsset({ id: 'as-bku1', cat: 'BPK', name: 'Buku Paket Bahasa Indonesia (300 eks)', brand: 'Kemdikbud', model: 'Kurikulum Merdeka', serial: null, spec: 'Kelas X, cetakan 2025', year: 2025, cost: 15000000, qty: 300, cond: 'cond-baik', loc: 'loc-a5', unit: 'unit-sma', dep: 'dep-sma-ak', sup: 'sup-4', pj: 'prof-pegawai2' });
  mkAsset({ id: 'as-bku2', cat: 'BPK', name: 'Ensiklopedia Sains (50 jilid)', brand: 'Erlangga', model: 'ENS-SNS', serial: null, spec: '50 jilid hardcover', year: 2023, cost: 7500000, qty: 50, cond: 'cond-baik', loc: 'loc-a5', unit: 'unit-sma', dep: 'dep-sma-ak', sup: 'sup-4', pj: 'prof-pegawai2' });

  mkAsset({ id: 'as-tnh1', cat: 'TNH', name: 'Tanah Kampus Utama', brand: null, model: null, serial: 'SHM-1985/0041', spec: 'Luas 2.500 m², SHM atas nama Yayasan', year: 2015, cost: 2500000000, cond: 'cond-baik', loc: null, unit: 'unit-ky', dep: 'dep-sar', sup: null, fund: 'fund-yayasan', pj: 'prof-super' });
  mkAsset({ id: 'as-bdg1', cat: 'BDG', name: 'Gedung A (2 Lantai)', brand: null, model: null, serial: 'IMB-2018/009', spec: '8 ruang kelas, 2 lab, luas 640 m²', year: 2018, cost: 3800000000, cond: 'cond-baik', loc: 'loc-gda', unit: 'unit-ky', dep: 'dep-sar', sup: null, fund: 'fund-yayasan', pj: 'prof-manajer' });
  mkAsset({ id: 'as-knd1', cat: 'KND', name: 'Mobil Operasional Toyota Avanza', brand: 'Toyota', model: 'Avanza 1.5 G MT', serial: 'MHKVAB12G01-77882', spec: 'MPV 1.500 cc manual 2019', year: 2022, cost: 215000000, cond: 'cond-baik', loc: 'loc-c1', unit: 'unit-ky', dep: 'dep-sar', sup: null, pj: 'prof-manajer' });
  mkAsset({ id: 'as-knd2', cat: 'KND', name: 'Motor Operasional Honda Vario 125', brand: 'Honda', model: 'Vario 125 CBS', serial: 'MH1KVC41KN2-118827', spec: '125 cc CBS ISS 2023', year: 2023, cost: 22500000, cond: 'cond-baik', loc: 'loc-c1', unit: 'unit-ky', dep: 'dep-sar', sup: null, pj: 'prof-gudang' });
  mkAsset({ id: 'as-psr1', cat: 'PSR', name: 'Rak Baju Asrama (20 set)', brand: 'Lokal', model: 'RK-BJ20', serial: null, spec: 'Rak besi 4 tingkat', year: 2021, cost: 6000000, qty: 20, cond: 'cond-cb', loc: 'loc-c1', unit: 'unit-ky', dep: 'dep-sar', sup: 'sup-2', pj: 'prof-gudang' });
  mkAsset({ id: 'as-pkl1', cat: 'PKL', name: 'Whiteboard 120x240 cm', brand: 'Sakana', model: 'WB-1224', serial: null, spec: 'Papan tulis magnetik aluminium', year: 2022, cost: 1100000, cond: 'cond-baik', loc: 'loc-a1', unit: 'unit-sma', dep: 'dep-sma-ak', sup: 'sup-2', pj: 'prof-pegawai2' });
  mkAsset({ id: 'as-pkl2', cat: 'PKL', name: 'Meja Praktikum Lab IPA', brand: 'Lokal', model: 'MJ-LAB12', serial: null, spec: '12 meja kerja tahan asam + sink', year: 2022, cost: 5600000, cond: 'cond-baik', loc: 'loc-b2', unit: 'unit-smp', dep: 'dep-smp-ak', sup: 'sup-2', pj: 'prof-pegawai' });

  /* Barang habis pakai (stok kuantitas) */
  mkAsset({ id: 'as-bhp1', cat: 'BHP', name: 'Kertas HVS A4 80 gr', brand: 'Sidu', model: 'A4-80', spec: 'A4 80 g/m², 500 lembar per rim', year: 2026, cost: 55000, qty: 85, cond: 'cond-baik', loc: 'loc-c1', unit: 'unit-ky', dep: 'dep-sar', sup: 'sup-1', pj: 'prof-gudang' });
  mkAsset({ id: 'as-bhp2', cat: 'BHP', name: 'Tinta Printer Epson 003', brand: 'Epson', model: 'T00V', spec: 'Botol tinta 65 ml warna', year: 2026, cost: 95000, qty: 24, cond: 'cond-baik', loc: 'loc-c1', unit: 'unit-ky', dep: 'dep-sar', sup: 'sup-1', pj: 'prof-gudang' });
  mkAsset({ id: 'as-bhp3', cat: 'BHP', name: 'Spidol Whiteboard', brand: 'Snowman', model: 'SX-WB', spec: 'Hitam, isi 2mm', year: 2026, cost: 12000, qty: 60, cond: 'cond-baik', loc: 'loc-c1', unit: 'unit-ky', dep: 'dep-sar', sup: 'sup-4', pj: 'prof-gudang' });
  mkAsset({ id: 'as-bhp4', cat: 'BHP', name: 'Toner Fotokopi AR-6020', brand: 'Sharp', model: 'AR-016ST', spec: 'Toner cartridge original', year: 2026, cost: 450000, qty: 10, cond: 'cond-baik', loc: 'loc-c1', unit: 'unit-ky', dep: 'dep-sar', sup: 'sup-1', pj: 'prof-gudang' });

  /* Riwayat kondisi & lokasi awal */
  var asset_condition_histories = [
    row({ id: 'ach-1', asset_id: 'as-prt2', old_condition_id: 'cond-baik', new_condition_id: 'cond-rr', inspection_date: dstr(daysAgo(12)), notes: 'Head printer tersumbat, hasil cetak bergaris.', photo_path: null, inspected_by: 'prof-pegawai' }),
    row({ id: 'ach-2', asset_id: 'as-pro3', old_condition_id: 'cond-baik', new_condition_id: 'cond-rr', inspection_date: dstr(daysAgo(20)), notes: 'Lampu proyektor meredup, perlu penggantian lampu.', photo_path: null, inspected_by: 'prof-manajer' }),
    row({ id: 'ach-3', asset_id: 'as-lap6', old_condition_id: 'cond-baik', new_condition_id: 'cond-hilang', inspection_date: dstr(daysAgo(35)), notes: 'Tidak ditemukan saat pemeriksaan gudang, dilaporkan kehilangan.', photo_path: null, inspected_by: 'prof-pengelola' }),
    row({ id: 'ach-4', asset_id: 'as-rng1', old_condition_id: 'cond-baik', new_condition_id: 'cond-rr', inspection_date: dstr(daysAgo(15)), notes: 'Papan ring lapuk dan jaring sobek.', photo_path: null, inspected_by: 'prof-pegawai' })
  ];
  var asset_location_histories = [
    row({ id: 'alh-1', asset_id: 'as-ac1', old_location_id: 'loc-c1', new_location_id: 'loc-a1', old_unit_id: 'unit-ky', new_unit_id: 'unit-sma', movement_date: dstr(daysAgo(120)), notes: 'Mutasi selesai, AC dipasang di Ruang Kelas 1A.', approved_by: 'prof-manajer' })
  ];

  /* ---------------- PENGADAAN ---------------- */
  var pr1 = row({ id: 'prr-1', organization_id: org.id, request_number: 'REQ-2026-08-0001', request_date: dstr(daysAgo(70)),
    requester_id: 'prof-manajer', unit_id: 'unit-sma', department_id: 'dep-sma-ak',
    purpose: 'Pengadaan perangkat IT tambahan untuk administrasi dan lab', priority: 'Tinggi',
    estimated_total: 32400000, status: 'Approved', notes: 'Disetujui penuh, dilanjutkan ke pembelian.' });
  var pr2 = row({ id: 'prr-2', organization_id: org.id, request_number: 'REQ-2026-11-0002', request_date: dstr(daysAgo(6)),
    requester_id: 'prof-pegawai', unit_id: 'unit-smp', department_id: 'dep-smp-ak',
    purpose: 'Penggantian kursi siswa kelas 1B dan whiteboard', priority: 'Sedang',
    estimated_total: 18400000, status: 'Submitted', notes: 'Menunggu review atasan.' });
  var pr3 = row({ id: 'prr-3', organization_id: org.id, request_number: 'REQ-2026-09-0003', request_date: dstr(daysAgo(45)),
    requester_id: 'prof-pegawai2', unit_id: 'unit-sma', department_id: 'dep-sma-ak',
    purpose: 'Tambahan proyektor untuk ruang kelas', priority: 'Rendah',
    estimated_total: 13600000, status: 'Rejected', notes: 'Ditolak: belum ada anggaran tersisa tahun berjalan.' });
  var procurement_requests = [pr1, pr2, pr3];
  var procurement_request_items = [
    row({ id: id('pri'), request_id: 'prr-1', category_id: KMP, item_name: 'Laptop Lenovo V15 G4', specification: 'Core i5-1335U, 16GB, SSD 512GB', quantity: 1, estimated_unit_price: 9200000, estimated_total: 9200000 }),
    row({ id: id('pri'), request_id: 'prr-1', category_id: PRT, item_name: 'Printer Epson EcoTank M1120', specification: 'Monokrom Wi-Fi tinta tank', quantity: 1, estimated_unit_price: 2400000, estimated_total: 2400000 }),
    row({ id: id('pri'), request_id: 'prr-1', category_id: KMP, item_name: 'Laptop Lenovo IdeaPad Slim 3', specification: 'Core i3-1115G4, 8GB, SSD 256GB', quantity: 2, estimated_unit_price: 7900000, estimated_total: 15800000 }),
    row({ id: id('pri'), request_id: 'prr-2', category_id: MBL, item_name: 'Kursi Siswa', specification: 'Besi hollow + triplek duco', quantity: 40, estimated_unit_price: 320000, estimated_total: 12800000 }),
    row({ id: id('pri'), request_id: 'prr-2', category_id: 'cat-pkl', item_name: 'Whiteboard 120x240', specification: 'Magnetik aluminium', quantity: 5, estimated_unit_price: 1120000, estimated_total: 5600000 }),
    row({ id: id('pri'), request_id: 'prr-3', category_id: PEL, item_name: 'Proyektor BenQ MX560', specification: 'XGA DLP 4.000 lumen', quantity: 2, estimated_unit_price: 6800000, estimated_total: 13600000 })
  ];

  var proc1 = row({ id: 'prc-1', organization_id: org.id, procurement_number: 'PO-2026-09-0001', request_id: 'prr-1',
    supplier_id: 'sup-1', procurement_date: dstr(daysAgo(55)), invoice_number: 'INV/STN/2026/0912',
    tax_amount: 3240000, discount_amount: 0, additional_cost: 150000, total_amount: 32890000,
    funding_source_id: 'fund-yayasan', status: 'Completed', notes: 'Barang diterima lengkap, pembayaran lunas.' });
  var procurements = [proc1];
  var procurement_items = [
    row({ id: id('pi'), procurement_id: 'prc-1', item_name: 'Laptop Lenovo V15 G4', category_id: KMP, quantity: 1, unit_price: 9200000, total_price: 9200000 }),
    row({ id: id('pi'), procurement_id: 'prc-1', item_name: 'Printer Epson EcoTank M1120', category_id: PRT, quantity: 1, unit_price: 2400000, total_price: 2400000 }),
    row({ id: id('pi'), procurement_id: 'prc-1', item_name: 'Laptop Lenovo IdeaPad Slim 3', category_id: KMP, quantity: 2, unit_price: 7900000, total_price: 15800000 }),
    row({ id: id('pi'), procurement_id: 'prc-1', item_name: 'Tas laptop + mouse (bonus)', category_id: KMP, quantity: 3, unit_price: 96667, total_price: 290000 })
  ];

  var gr1 = row({ id: 'gr-1', organization_id: org.id, receipt_number: 'GRN-2026-09-0001', procurement_id: 'prc-1',
    receipt_date: dstr(daysAgo(50)), received_by: 'prof-gudang', inspection_status: 'Verified',
    notes: 'Jumlah dan spesifikasi sesuai PO. Berita acara penerimaan ditandatangani.' });
  var goods_receipts = [gr1];
  var goods_receipt_items = [
    row({ id: id('gri'), receipt_id: 'gr-1', procurement_item_id: null, item_name: 'Laptop Lenovo V15 G4', quantity_ordered: 1, quantity_received: 1, quantity_rejected: 0, condition_id: 'cond-baru', notes: 'Segel utuh, sesuai spesifikasi' }),
    row({ id: id('gri'), receipt_id: 'gr-1', procurement_item_id: null, item_name: 'Printer Epson EcoTank M1120', quantity_ordered: 1, quantity_received: 1, quantity_rejected: 0, condition_id: 'cond-baru', notes: 'Sesuai' }),
    row({ id: id('gri'), receipt_id: 'gr-1', procurement_item_id: null, item_name: 'Laptop Lenovo IdeaPad Slim 3', quantity_ordered: 2, quantity_received: 2, quantity_rejected: 0, condition_id: 'cond-baru', notes: 'Sesuai' })
  ];

  /* ---------------- PEMINJAMAN ---------------- */
  var loan_requests = [
    row({ id: 'ln-1', organization_id: org.id, loan_number: 'LN-2026-09-0001', borrower_id: 'prof-pegawai2',
      unit_id: 'unit-sma', request_date: dstr(daysAgo(45)), planned_return_date: dstr(daysAgo(40)),
      purpose: 'Kegiatan ospek panitia di aula', status: 'Dikembalikan',
      approved_by: 'prof-manajer', approved_at: daysAgo(44), notes: 'Sudah dikembalikan lengkap.' }),
    row({ id: 'ln-2', organization_id: org.id, loan_number: 'LN-2026-11-0002', borrower_id: 'prof-direktur',
      unit_id: 'unit-ky', request_date: dstr(daysAgo(5)), planned_return_date: dstr(daysAhead(9)),
      purpose: 'Rapat kerja sama dengan mitra di luar kantor', status: 'Dipinjam',
      approved_by: 'prof-manajer', approved_at: daysAgo(5), notes: null }),
    row({ id: 'ln-3', organization_id: org.id, loan_number: 'LN-2026-10-0003', borrower_id: 'prof-pegawai',
      unit_id: 'unit-smp', request_date: dstr(daysAgo(20)), planned_return_date: dstr(daysAgo(6)),
      purpose: 'Persiapan lomba siswa di gedung olahraga kabupaten', status: 'Dipinjam',
      approved_by: 'prof-manajer', approved_at: daysAgo(20), notes: 'Melewati batas pengembalian - perlu tindak lanjut.' }),
    row({ id: 'ln-4', organization_id: org.id, loan_number: 'LN-2026-11-0004', borrower_id: 'prof-pegawai3',
      unit_id: 'unit-sma', request_date: dstr(daysAgo(1)), planned_return_date: dstr(daysAhead(7)),
      purpose: 'Pelatihan UKS untuk siswa', status: 'Menunggu Persetujuan',
      approved_by: null, approved_at: null, notes: null })
  ];
  var loan_items = [
    row({ id: 'li-1', loan_id: 'ln-1', asset_id: 'as-pro1', quantity: 1, condition_before_id: 'cond-baik', notes: 'Proyektor SMA' }),
    row({ id: 'li-2', loan_id: 'ln-2', asset_id: 'as-lap3', quantity: 1, condition_before_id: 'cond-baik', notes: 'Laptop direktur' }),
    row({ id: 'li-3', loan_id: 'ln-3', asset_id: 'as-pro2', quantity: 1, condition_before_id: 'cond-baik', notes: 'Proyektor SMP' }),
    row({ id: 'li-4', loan_id: 'ln-4', asset_id: 'as-lap1', quantity: 1, condition_before_id: 'cond-baik', notes: 'Laptop lab' })
  ];
  var loan_returns = [
    row({ id: 'lret-1', organization_id: org.id, return_number: 'RTN-2026-10-0001', loan_id: 'ln-1',
      return_date: dstr(daysAgo(40)), received_by: 'prof-pengelola', notes: 'Kondisi baik', status: 'Completed' })
  ];
  var loan_return_items = [
    row({ id: id('lri'), return_id: 'lret-1', loan_item_id: 'li-1', asset_id: 'as-pro1', quantity_returned: 1,
      condition_after_id: 'cond-baik', damage_notes: null, photo_path: null })
  ];
  var loan_status_histories = [
    row({ id: id('lsh'), loan_id: 'ln-1', old_status: null, new_status: 'Submitted', changed_by: 'prof-pegawai2', notes: 'Pengajuan dibuat', created_at: daysAgo(45) }),
    row({ id: id('lsh'), loan_id: 'ln-1', old_status: 'Submitted', new_status: 'Disetujui', changed_by: 'prof-manajer', notes: 'Disetujui atasan', created_at: daysAgo(44) }),
    row({ id: id('lsh'), loan_id: 'ln-1', old_status: 'Disetujui', new_status: 'Dipinjam', changed_by: 'prof-pengelola', notes: 'Barang diserahkan', created_at: daysAgo(43) }),
    row({ id: id('lsh'), loan_id: 'ln-1', old_status: 'Dipinjam', new_status: 'Dikembalikan', changed_by: 'prof-pengelola', notes: 'Dikembalikan kondisi baik', created_at: daysAgo(40) }),
    row({ id: id('lsh'), loan_id: 'ln-2', old_status: 'Submitted', new_status: 'Disetujui', changed_by: 'prof-manajer', notes: 'Disetujui', created_at: daysAgo(5) }),
    row({ id: id('lsh'), loan_id: 'ln-2', old_status: 'Disetujui', new_status: 'Dipinjam', changed_by: 'prof-pengelola', notes: 'Serah terima', created_at: daysAgo(5) }),
    row({ id: id('lsh'), loan_id: 'ln-3', old_status: 'Submitted', new_status: 'Disetujui', changed_by: 'prof-manajer', notes: 'Disetujui', created_at: daysAgo(20) }),
    row({ id: id('lsh'), loan_id: 'ln-3', old_status: 'Disetujui', new_status: 'Dipinjam', changed_by: 'prof-pengelola', notes: 'Serah terima', created_at: daysAgo(20) }),
    row({ id: id('lsh'), loan_id: 'ln-4', old_status: null, new_status: 'Submitted', changed_by: 'prof-pegawai3', notes: 'Pengajuan dibuat', created_at: daysAgo(1) })
  ];

  /* ---------------- MUTASI ---------------- */
  var asset_transfers = [
    row({ id: 'trf-1', organization_id: org.id, transfer_number: 'MUT-2026-08-0001', transfer_date: dstr(daysAgo(35)),
      requested_by: 'prof-manajer', source_location_id: 'loc-c1', destination_location_id: 'loc-a1',
      source_unit_id: 'unit-ky', destination_unit_id: 'unit-sma',
      reason: 'Ruang kelas 1A membutuhkan tambahan unit AC', status: 'Selesai',
      approved_by: 'prof-direktur', petugas_kirim: 'prof-gudang', petugas_terima: 'prof-pegawai2' }),
    row({ id: 'trf-2', organization_id: org.id, transfer_number: 'MUT-2026-11-0002', transfer_date: dstr(daysAgo(3)),
      requested_by: 'prof-pegawai', source_location_id: 'loc-a3', destination_location_id: 'loc-a4',
      source_unit_id: 'unit-smp', destination_unit_id: 'unit-sd',
      reason: 'Meja guru untuk ruang kepala sekolah SD (ruang guru SMP kelebihan unit)', status: 'Penerimaan',
      approved_by: 'prof-manajer', petugas_kirim: 'prof-gudang', petugas_terima: null })
  ];
  var asset_transfer_items = [
    row({ id: id('tri'), transfer_id: 'trf-1', asset_id: 'as-ac1', condition_before_id: 'cond-baik', condition_after_id: 'cond-baik', notes: 'Terpasang baik' }),
    row({ id: id('tri'), transfer_id: 'trf-2', asset_id: 'as-mjg1', condition_before_id: 'cond-cb', condition_after_id: null, notes: 'Menunggu serah terima fisik' })
  ];

  /* ---------------- PEMELIHARAAN ---------------- */
  var maintenance_requests = [
    row({ id: 'mr-1', organization_id: org.id, ticket_number: 'TKT-2026-10-0001', asset_id: 'as-prt1',
      reported_by: 'prof-pegawai2', report_date: dstr(daysAgo(30)), damage_description: 'Hasil cetak bergaris dan warna tidak keluar',
      priority: 'Sedang', status: 'Verified', assigned_to: 'prof-teknisi', completion_date: dstr(daysAgo(27)),
      verification_by: 'prof-pegawai2', verification_date: dstr(daysAgo(26)), maintenance_type: 'Corrective Maintenance' }),
    row({ id: 'mr-2', organization_id: org.id, ticket_number: 'TKT-2026-11-0002', asset_id: 'as-ac4',
      reported_by: 'prof-pegawai3', report_date: dstr(daysAgo(3)), damage_description: 'AC lab komputer tidak dingin, kemungkinan refrigeran habis',
      priority: 'Tinggi', status: 'In Progress', assigned_to: 'prof-teknisi', completion_date: null,
      verification_by: null, verification_date: null, maintenance_type: 'Corrective Maintenance' }),
    row({ id: 'mr-3', organization_id: org.id, ticket_number: 'TKT-2026-11-0003', asset_id: 'as-prt2',
      reported_by: 'prof-pegawai', report_date: dstr(daysAgo(1)), damage_description: 'Head printer tersumbat, hasil cetak bergaris putih',
      priority: 'Rendah', status: 'Open', assigned_to: null, completion_date: null,
      verification_by: null, verification_date: null, maintenance_type: 'Corrective Maintenance' })
  ];
  var maintenance_schedules = [
    row({ id: 'ms-1', organization_id: org.id, asset_id: 'as-ac2', maintenance_type: 'Preventive Maintenance',
      schedule_date: dstr(daysAhead(20)), recurrence_type: 'months', recurrence_interval: 6,
      responsible_user_id: 'prof-teknisi', status: 'Terjadwal', notes: 'Servis berkala AC ruang guru' }),
    row({ id: 'ms-2', organization_id: org.id, asset_id: 'as-gen1', maintenance_type: 'Preventive Maintenance',
      schedule_date: dstr(daysAgo(5)), recurrence_type: 'months', recurrence_interval: 3,
      responsible_user_id: 'prof-teknisi', status: 'Terlambat', notes: 'Test run genset bulanan' }),
    row({ id: 'ms-3', organization_id: org.id, asset_id: 'as-knd1', maintenance_type: 'Servis Berkala',
      schedule_date: dstr(daysAhead(100)), recurrence_type: 'months', recurrence_interval: 12,
      responsible_user_id: 'prof-gudang', status: 'Terjadwal', notes: 'Servis kendaraan tahunan' }),
    row({ id: 'ms-4', organization_id: org.id, asset_id: 'as-cct1', maintenance_type: 'Inspeksi Rutin',
      schedule_date: dstr(daysAhead(45)), recurrence_type: 'months', recurrence_interval: 6,
      responsible_user_id: 'prof-teknisi', status: 'Terjadwal', notes: 'Inspeksi CCTV dan NVR' })
  ];
  var maintenance_records = [
    row({ id: 'mrec-1', organization_id: org.id, maintenance_id: 'mr-1', asset_id: 'as-prt1', maintenance_date: dstr(daysAgo(28)),
      work_description: 'Cleaning head printer, penggantian selang tinta, test print', technician_id: 'prof-teknisi', vendor_id: null,
      labor_cost: 150000, material_cost: 350000, total_cost: 500000, result: 'Perbaikan berhasil, hasil cetak normal kembali',
      before_photo_path: null, after_photo_path: null }),
    row({ id: 'mrec-2', organization_id: org.id, maintenance_id: null, asset_id: 'as-ac2', maintenance_date: dstr(daysAgo(185)),
      work_description: 'Servis berkala 6 bulanan: cleaning indoor/outdoor, cek freon', technician_id: 'prof-teknisi', vendor_id: null,
      labor_cost: 200000, material_cost: 250000, total_cost: 450000, result: 'AC dingin normal', before_photo_path: null, after_photo_path: null })
  ];
  var maintenance_parts = [
    row({ id: id('mp'), maintenance_record_id: 'mrec-1', part_name: 'Selang tinta Epson set', quantity: 1, unit_price: 200000, total_price: 200000 }),
    row({ id: id('mp'), maintenance_record_id: 'mrec-1', part_name: 'Cairan cleaner head', quantity: 2, unit_price: 75000, total_price: 150000 }),
    row({ id: id('mp'), maintenance_record_id: 'mrec-2', part_name: 'Freon R32 (kg)', quantity: 1, unit_price: 250000, total_price: 250000 })
  ];

  /* ---------------- PENYUSUTAN ---------------- */
  var depreciation_settings = [
    row({ id: 'depset-1', organization_id: org.id, category_id: 'cat-knd', depreciation_method: 'straight_line',
      default_useful_life_months: 60, default_residual_percentage: 10, start_policy: 'acquisition_month', is_active: true }),
    row({ id: 'depset-2', organization_id: org.id, category_id: 'cat-bdg', depreciation_method: 'straight_line',
      default_useful_life_months: 240, default_residual_percentage: 10, start_policy: 'acquisition_month', is_active: true }),
    row({ id: 'depset-3', organization_id: org.id, category_id: 'cat-kmp', depreciation_method: 'straight_line',
      default_useful_life_months: 48, default_residual_percentage: 10, start_policy: 'acquisition_month', is_active: true }),
    row({ id: 'depset-4', organization_id: org.id, category_id: null, depreciation_method: 'straight_line',
      default_useful_life_months: 48, default_residual_percentage: 10, start_policy: 'acquisition_month', is_active: true })
  ];
  var depreciation_periods = [];
  for (var m = 9; m >= 0; m--) {
    var dd = new Date(); dd.setDate(1); dd.setMonth(dd.getMonth() - m);
    var y = dd.getFullYear(), mo = dd.getMonth() + 1;
    depreciation_periods.push(row({
      id: 'dper-' + y + '-' + String(mo).padStart(2, '0'), organization_id: org.id,
      period_year: y, period_month: mo, period_start: iso(dd).slice(0, 10),
      period_end: iso(new Date(y, mo, 0)).slice(0, 10),
      status: m === 0 ? 'Open' : 'Closed', closed_by: m === 0 ? null : 'prof-keuangan', closed_at: m === 0 ? null : iso(new Date(y, mo, 0))
    }));
  }
  var FIXED_CATS = { 'cat-tnh': 0, 'cat-bdg': 240, 'cat-knd': 60 };
  function monthsBetween(d1, d2) {
    return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
  }
  var asset_depreciations = [], depreciation_entries = [];
  assets.forEach(function (a) {
    if (a.asset_type !== 'fixed' && a.category_id !== KMP && a.category_id !== PRT) return;
    if (a.category_id === 'cat-tnh') return; // tanah tidak disusutkan
    if (a.asset_status === 'Dihapuskan' || a.asset_status === 'Hilang') return;
    var life = FIXED_CATS[a.category_id] || 48;
    var method = 'straight_line';
    var residual = Math.round(a.acquisition_cost * 0.10);
    var depreciable = a.acquisition_cost - residual;
    var monthly = Math.round(depreciable / life);
    var start = new Date(a.acquisition_date + 'T00:00:00');
    var elapsed = monthsBetween(start, now());
    var accumulated = 0, bookValue = a.acquisition_cost;
    if (method === 'straight_line') {
      var eff = Math.min(Math.max(elapsed, 0), life);
      accumulated = eff * monthly;
      bookValue = a.acquisition_cost - accumulated;
    }
    var ad = row({
      id: 'adep-' + a.id, organization_id: org.id, asset_id: a.id,
      acquisition_cost: a.acquisition_cost, residual_value: residual, depreciable_amount: depreciable,
      useful_life_months: life, depreciation_method: method,
      depreciation_start_date: a.acquisition_date,
      monthly_depreciation: monthly, annual_depreciation: monthly * 12,
      accumulated_depreciation: Math.min(accumulated, depreciable),
      current_book_value: Math.max(bookValue, residual),
      depreciation_status: elapsed >= life ? 'Selesai Disusutkan' : 'Aktif'
    });
    asset_depreciations.push(ad);
    // Entri 6 bulan terakhir
    depreciation_periods.forEach(function (per) {
      var pd = new Date(per.period_year, per.period_month - 1, 15);
      var mm = monthsBetween(start, pd);
      if (mm < 0 || mm >= life || per.status !== 'Closed') return;
      var accBefore = mm * monthly;
      var depAmt = monthly;
      if (accBefore + depAmt > depreciable) depAmt = depreciable - accBefore;
      if (depAmt <= 0) return;
      depreciation_entries.push(row({
        id: id('de'), organization_id: org.id, asset_depreciation_id: ad.id,
        period_id: per.id, depreciation_amount: depAmt,
        accumulated_before: accBefore, accumulated_after: accBefore + depAmt,
        book_value_after: a.acquisition_cost - (accBefore + depAmt),
        posted_at: per.period_end + 'T23:00:00', posted_by: 'prof-keuangan'
      }));
    });
  });

  /* ---------------- STOCK OPNAME ---------------- */
  var gdaAssets = assets.filter(function (a) { return a.current_location_id && ['loc-a1','loc-a2','loc-a3','loc-a4','loc-a5','loc-b1','loc-b2','loc-b3'].indexOf(a.current_location_id) >= 0; });
  var so1 = row({ id: 'so-1', organization_id: org.id, opname_number: 'SO-2026-10-0001', opname_name: 'Stock Opname Gedung A Oktober 2026',
    period_start: dstr(daysAgo(25)), period_end: dstr(daysAgo(23)), unit_id: null, location_id: 'loc-gda',
    status: 'Selesai', created_by: 'prof-pengelola' });
  var so2 = row({ id: 'so-2', organization_id: org.id, opname_number: 'SO-2026-11-0002', opname_name: 'Stock Opname Gedung B November 2026',
    period_start: dstr(daysAgo(2)), period_end: dstr(daysAhead(12)), unit_id: null, location_id: 'loc-gdb',
    status: 'Berlangsung', created_by: 'prof-pengelola' });
  var stock_opnames = [so1, so2];
  var stock_opname_items = [];
  gdaAssets.forEach(function (a, i) {
    var result = 'Sesuai data';
    var actualLoc = a.current_location_id, actualCond = a.current_condition_id, actualQty = a.quantity;
    if (a.id === 'as-krs1') { result = 'Barang ditemukan di lokasi berbeda'; actualLoc = 'loc-c1'; }
    else if (a.id === 'as-prt1') { result = 'Kondisi berubah'; actualCond = 'cond-rr'; }
    else if (a.id === 'as-pc8') { result = 'Jumlah tidak sesuai'; actualQty = 7; }
    if (i === 6 && result === 'Sesuai data') result = 'Data tidak sesuai';
    stock_opname_items.push(row({
      id: id('soi'), opname_id: 'so-1', asset_id: a.id, asset_code_snapshot: a.asset_code, asset_name_snapshot: a.asset_name,
      expected_location_id: a.current_location_id, actual_location_id: actualLoc,
      expected_condition_id: a.current_condition_id, actual_condition_id: actualCond,
      expected_quantity: a.quantity, actual_quantity: actualQty, result_status: result,
      photo_path: null, notes: result !== 'Sesuai data' ? 'Ditemukan selisih saat pemeriksaan fisik.' : null,
      inspected_by: 'prof-pengelola', inspected_at: daysAgo(24)
    }));
  });
  var gdbAssets = assets.filter(function (a) { return a.current_location_id && ['loc-c1','loc-c2','loc-c3'].indexOf(a.current_location_id) >= 0 && a.asset_status === 'Aktif'; });
  gdbAssets.slice(0, 4).forEach(function (a) {
    stock_opname_items.push(row({
      id: id('soi'), opname_id: 'so-2', asset_id: a.id, asset_code_snapshot: a.asset_code, asset_name_snapshot: a.asset_name,
      expected_location_id: a.current_location_id, actual_location_id: a.current_location_id,
      expected_condition_id: a.current_condition_id, actual_condition_id: a.current_condition_id,
      expected_quantity: a.quantity, actual_quantity: a.quantity, result_status: 'Sesuai data',
      photo_path: null, notes: null, inspected_by: 'prof-gudang', inspected_at: daysAgo(1)
    }));
  });
  var soiDiff = stock_opname_items.filter(function (i) { return i.opname_id === 'so-1' && i.result_status !== 'Sesuai data'; });
  var stock_opname_adjustments = [
    row({ id: id('soa'), opname_item_id: soiDiff[0].id, adjustment_type: 'Mutasi Lokasi', adjustment_reason: 'Kursi ditemukan di gudang utama, sesuai mutasi tidak tercatat.',
      approval_status: 'Approved', approved_by: 'prof-manajer', approved_at: daysAgo(20) }),
    row({ id: id('soa'), opname_item_id: soiDiff[1].id, adjustment_type: 'Koreksi Kondisi', adjustment_reason: 'Kondisi printer menurun menjadi rusak ringan.',
      approval_status: 'Approved', approved_by: 'prof-manajer', approved_at: daysAgo(20) }),
    row({ id: id('soa'), opname_item_id: soiDiff[2] ? soiDiff[2].id : null, adjustment_type: 'Selisih Jumlah', adjustment_reason: 'Selisih 1 unit PC lab, perlu klarifikasi petugas.',
      approval_status: 'Menunggu', approved_by: null, approved_at: null })
  ];

  /* ---------------- PENGHAPUSAN ---------------- */
  var asset_disposals = [
    row({ id: 'dsp-1', organization_id: org.id, disposal_number: 'DHO-2026-08-0001', disposal_date: dstr(daysAgo(90)),
      reason: 'Rusak berat dan tidak ekonomis diperbaiki', proposed_by: 'prof-pengelola',
      reviewed_by: 'prof-manajer', approved_by: 'prof-pimpinan', disposal_method: 'Dibuang (ditemani berita acara)',
      selling_price: 0, book_value_at_disposal: 450000, status: 'Selesai',
      notes: 'Berita acara penghapusan No. BA-08/2026/YPN telah ditandatangani.' }),
    row({ id: 'dsp-2', organization_id: org.id, disposal_number: 'DHO-2026-11-0002', disposal_date: dstr(daysAgo(4)),
      reason: 'Rusak berat', proposed_by: 'prof-pengelola', reviewed_by: 'prof-manajer', approved_by: null,
      disposal_method: 'Dijual', selling_price: 300000, book_value_at_disposal: 795000, status: 'Pengajuan',
      notes: 'Menunggu persetujuan pimpinan yayasan.' })
  ];
  var asset_disposal_items = [
    row({ id: id('di'), disposal_id: 'dsp-1', asset_id: 'as-prt5', condition_id: 'cond-hapus', book_value: 450000, selling_price: 0, notes: 'Diarsipkan' }),
    row({ id: id('di'), disposal_id: 'dsp-2', asset_id: 'as-prt4', condition_id: 'cond-rb', book_value: 795000, selling_price: 300000, notes: 'Cadangan suku cadang masih berguna' })
  ];

  /* ---------------- APPROVAL HISTORIES ---------------- */
  var approval_histories = [
    row({ id: id('aph'), transaction_type: 'procurement_request', transaction_id: 'prr-1', step_order: 1, approver_id: 'prof-manajer', decision: 'Approved', notes: 'Kebutuhan valid sesuai RKAP', decided_at: daysAgo(66) }),
    row({ id: id('aph'), transaction_type: 'procurement_request', transaction_id: 'prr-1', step_order: 2, approver_id: 'prof-keuangan', decision: 'Approved', notes: 'Anggaran tersedia', decided_at: daysAgo(64) }),
    row({ id: id('aph'), transaction_type: 'procurement_request', transaction_id: 'prr-1', step_order: 3, approver_id: 'prof-pimpinan', decision: 'Approved', notes: 'Silakan realisasikan', decided_at: daysAgo(62) }),
    row({ id: id('aph'), transaction_type: 'procurement_request', transaction_id: 'prr-3', step_order: 1, approver_id: 'prof-manajer', decision: 'Approved', notes: 'Diteruskan ke keuangan', decided_at: daysAgo(43) }),
    row({ id: id('aph'), transaction_type: 'procurement_request', transaction_id: 'prr-3', step_order: 2, approver_id: 'prof-keuangan', decision: 'Rejected', notes: 'Anggaran habis, usulkan tahun depan', decided_at: daysAgo(42) }),
    row({ id: id('aph'), transaction_type: 'disposal', transaction_id: 'dsp-1', step_order: 1, approver_id: 'prof-pimpinan', decision: 'Approved', notes: 'Setuju dihapuskan', decided_at: daysAgo(88) }),
    row({ id: id('aph'), transaction_type: 'loan', transaction_id: 'ln-1', step_order: 1, approver_id: 'prof-manajer', decision: 'Approved', notes: null, decided_at: daysAgo(44) }),
    row({ id: id('aph'), transaction_type: 'loan', transaction_id: 'ln-2', step_order: 1, approver_id: 'prof-manajer', decision: 'Approved', notes: null, decided_at: daysAgo(5) }),
    row({ id: id('aph'), transaction_type: 'transfer', transaction_id: 'trf-1', step_order: 1, approver_id: 'prof-direktur', decision: 'Approved', notes: 'Setuju', decided_at: daysAgo(34) })
  ];

  /* ---------------- DOKUMEN ASET ---------------- */
  var asset_documents = [
    row({ id: id('adoc'), asset_id: 'as-tnh1', document_type: 'Sertifikat', document_number: 'SHM-1985/0041', file_path: null, description: 'Sertifikat hak milik atas nama yayasan', uploaded_by: 'prof-super', created_at: daysAgo(400) }),
    row({ id: id('adoc'), asset_id: 'as-bdg1', document_type: 'IMB', document_number: 'IMB-2018/009', file_path: null, description: 'Izin mendirikan bangunan Gedung A', uploaded_by: 'prof-manajer', created_at: daysAgo(300) }),
    row({ id: id('adoc'), asset_id: 'as-knd1', document_type: 'STNK', document_number: 'B 1872 YPA', file_path: null, description: 'STNK berlaku s.d. 11/2026', uploaded_by: 'prof-manajer', created_at: daysAgo(150) })
  ];

  /* ---------------- NOTIFIKASI ---------------- */
  var notifications = [
    row({ id: id('ntf'), user_id: 'prof-pengelola', title: 'Peminjaman terlambat', message: 'LN-2026-10-0003 (Proyektor BenQ MX560) melewati batas pengembalian 6 hari.', notification_type: 'loan_overdue', related_table: 'loan_requests', related_id: 'ln-3', is_read: false, created_at: daysAgo(6) }),
    row({ id: id('ntf'), user_id: 'prof-manajer', title: 'Peminjaman menunggu persetujuan', message: 'LN-2026-11-0004 oleh Agus Salim menunggu persetujuan Anda.', notification_type: 'loan_pending', related_table: 'loan_requests', related_id: 'ln-4', is_read: false, created_at: daysAgo(1) }),
    row({ id: id('ntf'), user_id: 'prof-pimpinan', title: 'Penghapusan menunggu persetujuan', message: 'DHO-2026-11-0002 (Printer Epson LX-310) menunggu persetujuan pimpinan.', notification_type: 'disposal_pending', related_table: 'asset_disposals', related_id: 'dsp-2', is_read: false, created_at: daysAgo(4) }),
    row({ id: id('ntf'), user_id: 'prof-teknisi', title: 'Tiket pemeliharaan baru', message: 'TKT-2026-11-0002: AC lab komputer tidak dingin (prioritas tinggi).', notification_type: 'maintenance_new', related_table: 'maintenance_requests', related_id: 'mr-2', is_read: false, created_at: daysAgo(3) }),
    row({ id: id('ntf'), user_id: 'prof-pengelola', title: 'Jadwal pemeliharaan terlambat', message: 'Test run genset (MS Genset 5000W) telah melewati tanggal jadwal.', notification_type: 'schedule_due', related_table: 'maintenance_schedules', related_id: 'ms-2', is_read: false, created_at: daysAgo(5) }),
    row({ id: id('ntf'), user_id: 'prof-pengelola', title: 'Aset belum diverifikasi', message: '2 barang hasil penerimaan GRN-2026-09-0001 belum diverifikasi.', notification_type: 'asset_unverified', related_table: 'assets', related_id: null, is_read: false, created_at: daysAgo(50) }),
    row({ id: id('ntf'), user_id: 'prof-gudang', title: 'Stock opname berlangsung', message: 'SO-2026-11-0002 Gedung B sedang berlangsung s.d. 12 hari lagi.', notification_type: 'opname_active', related_table: 'stock_opnames', related_id: 'so-2', is_read: true, created_at: daysAgo(2) }),
    row({ id: id('ntf'), user_id: 'prof-keuangan', title: 'Periode penyusutan terbuka', message: 'Periode berjalan siap diposting. Periode sebelumnya telah ditutup.', notification_type: 'depreciation_period', related_table: 'depreciation_periods', related_id: null, is_read: true, created_at: daysAgo(2) })
  ];

  /* ---------------- AUDIT LOG ---------------- */
  var audit_logs = [
    row({ id: id('aud'), organization_id: org.id, user_id: 'prof-gudang', user_name: 'Budi Santoso', action: 'INSERT', table_name: 'goods_receipts', record_id: 'gr-1', old_data: null, new_data: null, ip_address: null, created_at: daysAgo(50) }),
    row({ id: id('aud'), organization_id: org.id, user_id: 'prof-pengelola', user_name: 'Dewi Anggraini', action: 'UPDATE', table_name: 'assets', record_id: 'as-pro1', old_data: null, new_data: null, ip_address: null, created_at: daysAgo(43) }),
    row({ id: id('aud'), organization_id: org.id, user_id: 'prof-keuangan', user_name: 'Siti Rahmawati', action: 'POST_DEPRECIATION', table_name: 'depreciation_periods', record_id: null, old_data: null, new_data: null, ip_address: null, created_at: daysAgo(31) }),
    row({ id: id('aud'), organization_id: org.id, user_id: 'prof-manajer', user_name: 'Surya Pratama', action: 'APPROVE', table_name: 'loan_requests', record_id: 'ln-2', old_data: null, new_data: null, ip_address: null, created_at: daysAgo(5) })
  ];

  /* ---------------- PENGATURAN ---------------- */
  var app_settings = [
    row({ id: id('set'), organization_id: org.id, setting_key: 'app.currency', setting_value: { code: 'IDR', symbol: 'Rp' }, updated_by: 'prof-super', updated_at: NOW }),
    row({ id: id('set'), organization_id: org.id, setting_key: 'loan.fine_per_day', setting_value: { amount: 5000 }, updated_by: 'prof-super', updated_at: NOW }),
    row({ id: id('set'), organization_id: org.id, setting_key: 'procurement.approval_steps', setting_value: { steps: ['Review Atasan', 'Review Keuangan', 'Approval Pimpinan'] }, updated_by: 'prof-super', updated_at: NOW }),
    row({ id: id('set'), organization_id: org.id, setting_key: 'depreciation.default_residual_pct', setting_value: { value: 10 }, updated_by: 'prof-super', updated_at: NOW }),
    row({ id: id('set'), organization_id: org.id, setting_key: 'asset.code_format', setting_value: { pattern: 'KODE/TAHUN/SEQ' }, updated_by: 'prof-super', updated_at: NOW })
  ];

  /* ---------------- ASSEMBLE ---------------- */
  // Kursi yang ditemukan di gudang (hasil opname disetujui) — catat riwayat lokasi
  asset_location_histories.push(row({
    id: 'alh-2', asset_id: 'as-krs1', old_location_id: 'loc-a1', new_location_id: 'loc-a1',
    old_unit_id: 'unit-sma', new_unit_id: 'unit-sma', movement_date: dstr(daysAgo(20)),
    notes: 'Catatan opname: sebagian kursi ditemukan di gudang utama (sudah diklarifikasi).', approved_by: 'prof-manajer'
  }));
  // riwayat scan QR contoh
  var asset_qr_logs = [
    row({ id: id('aql'), asset_id: 'as-lap1', scanned_by: 'prof-pengelola', scanned_at: daysAgo(10), scan_action: 'view_detail', device_info: 'Android 14 · Chrome Mobile' }),
    row({ id: id('aql'), asset_id: 'as-ac1', scanned_by: 'prof-gudang', scanned_at: daysAgo(24), scan_action: 'opname_check', device_info: 'iPhone 15 · Safari' }),
    row({ id: id('aql'), asset_id: 'as-pro2', scanned_by: 'prof-pengelola', scanned_at: daysAgo(6), scan_action: 'view_detail', device_info: 'Redmi Note 12 · Chrome Mobile' })
  ];

  return {
    organizations: organizations, units: units, departments: departments, divisions: divisions,
    profiles: profiles, roles: roles, user_roles: user_roles, auth_users: auth_users,
    asset_categories: asset_categories, units_of_measure: units_of_measure, locations: locations,
    suppliers: suppliers, funding_sources: funding_sources, asset_conditions: asset_conditions,
    assets: assets, asset_documents: asset_documents, asset_condition_histories: asset_condition_histories,
    asset_location_histories: asset_location_histories, asset_qr_logs: asset_qr_logs,
    procurement_requests: procurement_requests, procurement_request_items: procurement_request_items,
    procurements: procurements, procurement_items: procurement_items,
    goods_receipts: goods_receipts, goods_receipt_items: goods_receipt_items,
    loan_requests: loan_requests, loan_items: loan_items, loan_returns: loan_returns,
    loan_return_items: loan_return_items, loan_status_histories: loan_status_histories,
    asset_transfers: asset_transfers, asset_transfer_items: asset_transfer_items,
    maintenance_requests: maintenance_requests, maintenance_schedules: maintenance_schedules,
    maintenance_records: maintenance_records, maintenance_parts: maintenance_parts,
    depreciation_settings: depreciation_settings, asset_depreciations: asset_depreciations,
    depreciation_periods: depreciation_periods, depreciation_entries: depreciation_entries,
    stock_opnames: stock_opnames, stock_opname_items: stock_opname_items,
    stock_opname_adjustments: stock_opname_adjustments,
    asset_disposals: asset_disposals, asset_disposal_items: asset_disposal_items,
    approval_histories: approval_histories, notifications: notifications,
    audit_logs: audit_logs, app_settings: app_settings
  };
};
