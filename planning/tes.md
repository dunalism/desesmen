## Fullscreen API (Utama)

API utama sistem proteksi.

Digunakan untuk memastikan peserta tetap berada pada mode fullscreen.

### API

```ts
element.requestFullscreen();

document.exitFullscreen();

document.fullscreenElement;

fullscreenchange;
```

---

## Page Visibility API (Utama)

Digunakan untuk mendeteksi ketika halaman tidak lagi aktif.

### API

```ts
visibilitychange;

document.visibilityState;
```

Status yang digunakan:

- visible
- hidden

Event ini menjadi indikator utama bahwa peserta meninggalkan halaman ujian.

---

## Keyboard Event

Menggunakan

```ts
keydown;
```

Tidak menggunakan

```ts
keypress;
```

karena telah deprecated.

---

## Context Menu

Menggunakan

```ts
contextmenu;
```

Hanya sebagai lapisan tambahan.

---

# API yang Tidak Digunakan

Karena sudah deprecated atau tidak direkomendasikan.

- unload
- keypress
- keyCode
- document.onkeypress

---

# Flow Memulai Ujian

```
Klik Mulai Ujian
        │
        ▼
requestFullscreen()
        │
        ▼
Berhasil?
        │
 ├──────────────┐
 │              │
Ya            Tidak
 │              │
 ▼              ▼
Pasang       Tolak Memulai
Listener     Ujian
 │
 ▼
Ujian Dimulai
```

Peserta **tidak dapat memulai ujian** apabila browser menolak masuk ke mode fullscreen.

---

# Event Listener

Saat ujian dimulai, sistem memasang listener berikut:

- fullscreenchange
- visibilitychange
- keydown
- contextmenu

Semua listener dilepas ketika ujian selesai.

---

# Monitoring Fullscreen

```
fullscreenchange
        │
        ▼
Masih Fullscreen?
        │
 ├──────────────┐
 │              │
Ya            Tidak
 │              │
 ▼              ▼
Lanjut      Tambah Violation
            Tampilkan Dialog
```

Keluar dari fullscreen dianggap sebagai satu pelanggaran.

---

# Monitoring Halaman

```
visibilitychange
        │
        ▼
hidden?
        │
 ├──────────────┐
 │              │
Tidak         Ya
 │              │
 ▼              ▼
Lanjut      Tambah Violation
            Catat Waktu
```

Event ini menjadi indikator utama bahwa peserta meninggalkan halaman ujian.

---

# Sistem Pelanggaran

Menggunakan satu counter sederhana.

```
violationCount
```

Contoh:

```
Keluar Fullscreen

↓

Violation +1

------------------

Pindah Tab

↓

Violation +1

------------------

Meninggalkan Halaman Lagi

↓

Violation +1
```

---

# Penyimpanan Data Pelanggaran

## React State

Digunakan untuk memperbarui UI.

```
violationCount
```

---

## Session Storage

Digunakan sebagai cadangan apabila halaman di-refresh.

```
cbt-session-{token}
```

Data yang disimpan:

- violationCount
- violationLog
- jawaban peserta

Session Storage dipilih karena:

- Bertahan saat refresh.
- Otomatis hilang ketika tab ditutup.
- Sesuai dengan konsep satu sesi ujian.

---

## Local Storage

**Tidak digunakan** sebagai penyimpanan utama.

Alasan:

- Berpotensi meninggalkan data lama.
- Tidak sesuai dengan konsep satu sesi ujian.
- Berisiko menyebabkan bug apabila ujian berikutnya menggunakan browser yang sama.

---

# Batas Pelanggaran

Contoh konfigurasi:

| Pelanggaran | Konsekuensi         |
| ----------- | ------------------- |
| 1           | Peringatan pertama  |
| 2           | Peringatan kedua    |
| 3           | Peringatan terakhir |
| 4           | Auto Submit         |

---

# Dialog Peringatan

Contoh:

```
PERINGATAN

Anda telah meninggalkan halaman ujian.

Pelanggaran:
2 dari 3.

Jika pelanggaran terjadi kembali,
ujian akan dikirim otomatis.
```

---

# Keyboard Protection

Menggunakan event:

```
keydown
```

Shortcut yang diblokir:

- F12
- Ctrl + Shift + I
- Ctrl + Shift + J
- Ctrl + U

---

# Edge Cases

## ESC Keluar Fullscreen

```
ESC

↓

fullscreenchange

↓

Violation +1
```

---

## Alt + Tab

Browser tidak menyediakan API untuk mendeteksi Alt + Tab secara langsung.

Yang dapat dideteksi hanyalah dampaknya:

- visibilitychange
- fullscreenchange

---

## Browser Menolak Fullscreen

```
requestFullscreen()

↓

Ditolak

↓

Peserta tidak dapat memulai ujian
```

---
