# 🎧 Study4 TOEIC Helper Scripts

Bộ sưu tập các **Userscripts (Tampermonkey)** và công cụ hỗ trợ tự học, luyện đề **TOEIC** hiệu quả hơn trên [Study4](https://study4.com/tests/toeic/).

Dự án được thiết kế theo kiến trúc **modular** (mỗi script nằm trong một thư mục riêng dưới `scripts/`) để dễ dàng mở rộng thêm nhiều tiện ích học TOEIC khác trong tương lai.

---

## 📦 Danh sách các Script hiện có

| Tên Script | Thư mục | Mô tả | Cài đặt nhanh (Tampermonkey) |
| :--- | :--- | :--- | :--- |
| **Audio Loop & Dictation Helper** (`v2.0`) | [`scripts/audio-loop-dictation`](./scripts/audio-loop-dictation) | Tự động lặp lại câu nghe (Loop vô hạn), Nghe thụ động tự chuyển câu (Auto-Next), Lặp đoạn A-B, Phím tắt tua nhanh & Khung luyện chép chính tả (Dictation) chấm điểm tự động. | [**👉 Cài đặt (Raw Link)**](https://raw.githubusercontent.com/GiapKun/study4-audio-helper/main/scripts/audio-loop-dictation/study4-toeic-audio.user.js) |

---

## 🚀 Hướng dẫn sử dụng `Audio Loop & Dictation Helper`

### 1. Tính năng nổi bật
- **⚡ Siêu nhẹ (0% lag):** Sử dụng kiến trúc *Single Dock Bar + HTML5 Capture Events*, chỉ gắn duy nhất 1 thanh điều khiển ngay dưới câu bạn đang bấm nghe — mượt tuyệt đối kể cả trên trang giải chi tiết 200 câu.
- **🔁 Loop vô hạn 1 câu:** Tự động phát lặp đi lặp lại câu đang nghe mà không cần bấm chuột lại.
- **⏭️ Nghe thụ động (Auto-Next):** Lặp mỗi câu `1`, `2`, `3` hoặc `5` lần rồi tự động cuộn mượt xuống câu tiếp theo và phát tiếp.
- **🅰️—🅱️ Lặp đoạn A-B:** Cắt riêng 1 câu/đoạn khó trong bài nghe dài (Part 3, Part 4) để luyện nghe sâu.
- **✍️ Chép chính tả (Dictation) & Chấm điểm:**
  - Làm mờ phần Transcript/Giải thích gốc trên trang để tránh nhìn lộ đáp án.
  - Tự động đối chiếu từng từ bạn gõ với Transcript của câu hỏi và tô màu **từ đúng (xanh)**, **từ thiếu (đỏ)**, **từ gõ sai/dư (cam)**.

### 2. Phím tắt bàn phím

| Phím tắt | Chức năng |
| :--- | :--- |
| `Tab` *(khi đang gõ trong ô Chép chính tả)* | Play / Pause nhanh mà không rời tay khỏi bàn phím |
| `Ctrl + Enter` *(trong ô Chép chính tả)* | Chấm điểm & đối chiếu với Transcript gốc |
| `Alt + Space` | Play / Pause toàn trang |
| `Alt + R` | Nghe lại ngay từ đầu câu (hoặc từ Điểm A) |
| `Alt + ←` / `Alt + →` | Tua lùi / tiến `2.5 giây` |
| `Alt + L` | Bật / tắt nhanh chế độ Loop |
| `Alt + [` và `Alt + ]` | Đặt Điểm A (bắt đầu lặp) và Điểm B (kết thúc lặp) |

---

## 🗂️ Cấu trúc thư mục dự án

```text
study4-audio-helper/
├── README.md                                        # Tài liệu tổng quan & danh sách scripts
├── .gitignore
├── scripts/
│   ├── audio-loop-dictation/                        # Script 1: Luyện nghe Loop & Chép chính tả
│   │   ├── study4-toeic-audio.user.js               # File Userscript chính
│   │   └── demo.html                                # Trang giả lập DOM Study4 để test offline
│   └── (các script học TOEIC tiếp theo...)          # VD: vocab-anki-export, part-timer, reading-helper...
└── shared/
    └── README.md                                    # Thư mục chứa các tiện ích/module dùng chung
```

---

## 🛠️ Cách cài đặt

### Cách 1: Cài qua Tampermonkey (Khuyên dùng - Tự động chạy khi vào Study4)
1. Cài đặt tiện ích mở rộng [Tampermonkey](https://www.tampermonkey.net/) trên Chrome / Edge / Brave / Firefox.
2. Nhấn vào [**Link cài đặt trực tiếp (Raw)**](https://raw.githubusercontent.com/GiapKun/study4-audio-helper/main/scripts/audio-loop-dictation/study4-toeic-audio.user.js) — Tampermonkey sẽ tự động mở màn hình xác nhận **Install**.
3. Mở bất kỳ trang đáp án / luyện đề nào trên `https://study4.com/tests/...` và bấm **Play** ở một câu nghe bất kỳ.

### Cách 2: Dán trực tiếp vào DevTools Console
1. Trên trang bài thi Study4, nhấn `F12` $\rightarrow$ chọn tab **Console**.
2. Nếu chạy lần đầu tiên, gõ `allow pasting` rồi nhấn `Enter`.
3. Copy nội dung file `scripts/audio-loop-dictation/study4-toeic-audio.user.js` dán vào Console và nhấn `Enter`.
