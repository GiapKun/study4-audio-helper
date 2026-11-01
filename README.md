# 🎧📖 Study4 TOEIC Helper Scripts

Bộ sưu tập các **Userscripts (Tampermonkey)** và công cụ hỗ trợ tự học, luyện đề **TOEIC (Listening & Reading)** hiệu quả hơn trên [Study4](https://study4.com/tests/toeic/).

Dự án được thiết kế theo kiến trúc **modular** (mỗi script nằm trong một thư mục riêng dưới `scripts/`) để dễ dàng mở rộng và quản lý.

---

## 📦 Danh sách các Script hiện có

| Tên Script | Thư mục | Mô tả | Cài đặt nhanh (Tampermonkey) |
| :--- | :--- | :--- | :--- |
| **1. Audio Loop & Dictation Helper** (`v2.0`) | [`scripts/audio-loop-dictation`](./scripts/audio-loop-dictation) | Tự động lặp lại câu nghe (Loop vô hạn), Nghe thụ động tự chuyển câu (Auto-Next), Lặp đoạn A-B, Phím tắt tua nhanh & Khung luyện chép chính tả (Dictation) chấm điểm tự động. | [**👉 Cài đặt (Raw Link)**](https://raw.githubusercontent.com/GiapKun/study4-audio-helper/main/scripts/audio-loop-dictation/study4-toeic-audio.user.js) |
| **2. Reading & Part 5 Helper** (`v1.0`) | [`scripts/reading-part5-helper`](./scripts/reading-part5-helper) | Luyện tốc độ Part 5 (Đồng hồ cảnh báo 20s–30s/câu + Phím tắt `A/B/C/D` chọn đáp án tự qua câu), Lọc câu sai, Chế độ **Che đáp án để làm lại câu sai** & Bôi đen từ vựng đẩy 1-click vào **Anki**. | [**👉 Cài đặt (Raw Link)**](https://raw.githubusercontent.com/GiapKun/study4-audio-helper/main/scripts/reading-part5-helper/study4-toeic-reading.user.js) |

---

## 🎧 1. Hướng dẫn `Audio Loop & Dictation Helper` (Listening Part 1–4)

### Tính năng nổi bật
- **⚡ Siêu nhẹ (0% lag):** Chỉ gắn duy nhất 1 thanh điều khiển ngay dưới câu bạn đang bấm nghe.
- **🔁 Loop vô hạn 1 câu:** Tự động phát lặp đi lặp lại câu đang nghe mà không cần bấm chuột lại.
- **⏭️ Nghe thụ động (Auto-Next):** Lặp mỗi câu `1`, `2`, `3` hoặc `5` lần rồi tự động cuộn mượt xuống câu tiếp theo và phát tiếp.
- **🅰️—🅱️ Lặp đoạn A-B:** Cắt riêng 1 câu/đoạn khó trong bài nghe dài (Part 3, Part 4) để luyện nghe sâu.
- **✍️ Chép chính tả (Dictation) & Chấm điểm:** Làm mờ Transcript gốc và đối chiếu từng từ bạn gõ với Transcript của câu hỏi.

| Phím tắt (Listening) | Chức năng |
| :--- | :--- |
| `Tab` *(trong ô Chép chính tả)* | Play / Pause nhanh mà không rời tay khỏi bàn phím |
| `Ctrl + Enter` *(trong ô Chép chính tả)* | Chấm điểm & đối chiếu với Transcript gốc |
| `Alt + Space` | Play / Pause toàn trang |
| `Alt + R` | Nghe lại ngay từ đầu câu (hoặc từ Điểm A) |
| `Alt + ←` / `Alt + →` | Tua lùi / tiến `2.5 giây` |
| `Alt + L` | Bật / tắt nhanh chế độ Loop |
| `Alt + [` và `Alt + ]` | Đặt Điểm A (bắt đầu lặp) và Điểm B (kết thúc lặp) |

---

## 📖 2. Hướng dẫn `Reading & Part 5 Helper` (Reading Part 5–7)

### Tính năng nổi bật
- **⏱️ Đồng hồ Pacing Timer từng câu (20s–30s):** Tự động đếm thời gian bạn suy nghĩ ở câu đang chọn (`< 20s` màu xanh, `20–30s` màu cam, `> 30s` nháy đỏ cảnh báo để không bị lố giờ làm Part 7).
- **⌨️ Phím tắt Speed Drill (`A/B/C/D` hoặc `1/2/3/4`):** Bấm phím để chọn ngay đáp án A/B/C/D của câu đang đứng và **tự động cuộn mượt xuống câu tiếp theo**.
- **🙈 Chế độ "Che đáp án để làm lại" (Active Recall / Blind Retry):**
  - Ngay trên trang *Xem đáp án / Giải chi tiết*, bấm **`🙈 Che đáp án (Làm lại)`** để ẩn toàn bộ đáp án đúng và lời giải thích.
  - Kết hợp với bộ lọc **`❌ Chỉ hiện câu Sai / Bỏ trống`** để tự chọn lại đáp án các câu sai: chọn đúng sẽ báo xanh và bung lời giải ra ngay; chọn sai sẽ nhắc thử lại!
- **🃏 Bôi đen Từ vựng / Collocation $\rightarrow$ Lưu 1-Click vào Anki:**
  - Bôi đen bất kỳ từ/cụm từ nào trong câu hỏi hoặc lời giải thích $\rightarrow$ bấm nút **`🃏 +Anki / Note`** hiện ngay cạnh con trỏ chuột.
  - Tự động trích xuất nguyên câu hỏi làm ngữ cảnh ví dụ (in đậm từ vựng) và đẩy thẳng vào phần mềm **Anki** (qua AnkiConnect) hoặc copy TSV vào Clipboard.

| Phím tắt (Reading) | Chức năng |
| :--- | :--- |
| `A / B / C / D` hoặc `1 / 2 / 3 / 4` | Chọn đáp án tương ứng của câu đang đứng (& tự qua câu kế tiếp) |
| `J` / `K` | Chuyển nhanh xuống câu tiếp theo (`J`) / lên câu trước (`K`) |
| `Ctrl + Enter` *(trong popup Anki)* | Lưu nhanh thẻ từ vựng vào Anki |

---

## 🗂️ Cấu trúc thư mục dự án

```text
study4-audio-helper/
├── README.md                                        # Tài liệu tổng quan & danh sách scripts
├── .gitignore
├── scripts/
│   ├── audio-loop-dictation/                        # Script 1: Luyện nghe Loop & Chép chính tả (Part 1-4)
│   │   ├── study4-toeic-audio.user.js
│   │   └── demo.html
│   └── reading-part5-helper/                        # Script 2: Luyện tốc độ Part 5, Làm lại câu sai & Anki (Part 5-7)
│       ├── study4-toeic-reading.user.js
│       └── demo.html
└── shared/
    └── README.md                                    # Thư mục chứa các tiện ích/module dùng chung
```
