// ==UserScript==
// @name         Study4 TOEIC Reading & Part 5 Helper (Speed Drill, Retry & Anki)
// @namespace    https://github.com/GiapKun/study4-audio-helper
// @version      1.0.0
// @description  Trợ thủ luyện Reading TOEIC (Part 5, 6, 7) trên Study4: Đồng hồ 25s/câu, Phím tắt chọn A/B/C/D tự qua câu, Lọc & Che đáp án làm lại câu sai, Bôi đen từ vựng đẩy 1-click vào Anki.
// @author       GiapKun
// @match        https://study4.com/tests/*
// @match        https://*.study4.com/tests/*
// @downloadURL  https://raw.githubusercontent.com/GiapKun/study4-audio-helper/main/scripts/reading-part5-helper/study4-toeic-reading.user.js
// @updateURL    https://raw.githubusercontent.com/GiapKun/study4-audio-helper/main/scripts/reading-part5-helper/study4-toeic-reading.user.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    if (window.__s4ReadingHelperCleanup) {
        try { window.__s4ReadingHelperCleanup(); } catch (e) {}
    }

    // ==================== CẤU HÌNH ====================
    const CONFIG = {
        warnSec: 20,           // Từ 20s chuyển sang màu cam
        dangerSec: 30,         // Từ 30s chuyển sang màu đỏ nhấp nháy
        timerRunning: true,
        autoNextOnKey: true,   // Bấm phím A/B/C/D tự động cuộn xuống câu tiếp theo
        blindRetry: false,     // Chế độ che đáp án đúng trên trang Giải chi tiết để tự làm lại
        filterMode: 'all',     // 'all' | 'wrong' (Sai + Chưa làm) | 'correct'
        ankiUrl: 'http://127.0.0.1:8765',
        ankiDeck: localStorage.getItem('s4_anki_deck') || 'Default',
        ankiModel: localStorage.getItem('s4_anki_model') || 'Basic',
    };

    let activeQuestion = null;
    let elapsedDeciSec = 0; // Đếm theo 0.1 giây
    let timerInterval = null;
    let currentSelectionInfo = null;

    // ==================== 1. CSS GIAO DIỆN ====================
    const styleEl = document.createElement('style');
    styleEl.id = 's4-reading-helper-styles';
    styleEl.textContent = `
        /* Thanh điều khiển nổi gọn nhẹ */
        #s4-reading-bar {
            position: fixed;
            bottom: 16px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 99990;
            background: #0f172a;
            color: #f8fafc;
            border: 1px solid #334155;
            border-radius: 12px;
            padding: 8px 14px;
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 8px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 12.5px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.28);
            max-width: 96vw;
        }
        #s4-reading-bar.is-minimized .s4-rb-content {
            display: none !important;
        }
        .s4-rb-content {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 8px;
        }
        .s4-rb-btn {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 5px 9px;
            border-radius: 6px;
            border: 1px solid #475569;
            background: #1e293b;
            color: #e2e8f0;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            user-select: none;
            transition: all 0.15s;
        }
        .s4-rb-btn:hover { background: #334155; }
        .s4-rb-btn.is-active { background: #2563eb; border-color: #3b82f6; color: #fff; }
        .s4-rb-select {
            padding: 4px 8px;
            border-radius: 6px;
            border: 1px solid #475569;
            background: #1e293b;
            color: #f8fafc;
            font-size: 12px;
            height: 28px;
        }
        .s4-rb-sep { width: 1px; height: 20px; background: #334155; }

        /* Đồng hồ Pacing 25s/câu */
        .s4-timer-badge {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 4px 10px;
            border-radius: 999px;
            font-weight: 700;
            font-size: 13px;
            font-variant-numeric: tabular-nums;
            background: #065f46;
            color: #ecfdf5;
            border: 1px solid #10b981;
            cursor: pointer;
        }
        .s4-timer-badge.is-warn {
            background: #92400e;
            color: #fffbeb;
            border-color: #f59e0b;
        }
        .s4-timer-badge.is-danger {
            background: #991b1b;
            color: #fef2f2;
            border-color: #ef4444;
            animation: s4-pulse 0.8s infinite alternate;
        }
        @keyframes s4-pulse {
            from { transform: scale(1); }
            to { transform: scale(1.06); }
        }

        /* Viền nổi bật cho câu hỏi đang đứng */
        .question-wrapper.s4-active-q,
        .question-item-wrapper.s4-active-q {
            outline: 2px solid #3b82f6 !important;
            outline-offset: 4px;
            border-radius: 8px;
            background-color: rgba(59, 130, 246, 0.03) !important;
        }

        /* Chế độ Blind Retry (Che đáp án đúng trên trang Giải chi tiết để tự chọn lại) */
        body.s4-blind-retry .question-wrapper:not(.s4-revealed) .question-number.correct strong,
        body.s4-blind-retry .question-wrapper:not(.s4-revealed) .question-number.wrong strong {
            background-color: #e0f2fe !important;
            color: #0284c7 !important;
            border-color: transparent !important;
        }
        body.s4-blind-retry .question-wrapper:not(.s4-revealed) input[type="radio"].correct + .form-check-label,
        body.s4-blind-retry .question-wrapper:not(.s4-revealed) input[type="radio"].wrong + .form-check-label {
            background-color: transparent !important;
            color: inherit !important;
            font-weight: normal !important;
        }
        body.s4-blind-retry .question-wrapper:not(.s4-revealed) input[type="radio"] {
            opacity: 0.25;
        }
        body.s4-blind-retry .question-wrapper:not(.s4-revealed) .text-answerkey,
        body.s4-blind-retry .question-wrapper:not(.s4-revealed) .text-success,
        body.s4-blind-retry .question-wrapper:not(.s4-revealed) .text-correct,
        body.s4-blind-retry .question-wrapper:not(.s4-revealed) .text-wrong,
        body.s4-blind-retry .question-wrapper:not(.s4-revealed) .question-explanation-wrapper,
        body.s4-blind-retry .question-wrapper:not(.s4-revealed) .collapse.show {
            display: none !important;
        }
        body.s4-blind-retry .question-wrapper .form-check {
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 6px;
            transition: background 0.15s;
        }
        body.s4-blind-retry .question-wrapper .form-check:hover {
            background: rgba(37, 99, 235, 0.08);
        }
        .s4-retry-feedback {
            margin-top: 6px;
            padding: 6px 10px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
        }
        .s4-retry-feedback.is-ok {
            background: #dcfce7;
            color: #166534;
            border: 1px solid #86efac;
        }
        .s4-retry-feedback.is-err {
            background: #fee2e2;
            color: #991b1b;
            border: 1px solid #fca5a5;
        }

        /* Nút nổi +Anki khi bôi đen từ vựng */
        #s4-anki-SelectionBtn {
            position: fixed;
            z-index: 99998;
            display: none;
            background: #2563eb;
            color: #fff;
            border: 1px solid #1d4ed8;
            border-radius: 6px;
            padding: 4px 10px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        #s4-anki-SelectionBtn:hover { background: #1d4ed8; }

        /* Modal tạo thẻ Anki nhanh */
        #s4-anki-modal-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.55);
            z-index: 99999;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 16px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        #s4-anki-modal-backdrop.is-open { display: flex; }
        .s4-anki-modal {
            background: #fff;
            color: #0f172a;
            width: 100%;
            max-width: 520px;
            border-radius: 12px;
            padding: 18px 20px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }
        .s4-anki-field { margin-bottom: 12px; }
        .s4-anki-field label {
            display: block;
            font-size: 12px;
            font-weight: 600;
            color: #475569;
            margin-bottom: 4px;
        }
        .s4-anki-input, .s4-anki-textarea, .s4-anki-select {
            width: 100%;
            padding: 7px 10px;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            font-size: 13.5px;
            color: #0f172a;
            box-sizing: border-box;
        }
        .s4-anki-textarea { min-height: 68px; resize: vertical; line-height: 1.45; }
    `;
    document.head.appendChild(styleEl);

    // ==================== 2. QUẢN LÝ DANH SÁCH CÂU HỎI & PACING TIMER ====================
    const getVisibleQuestions = () => {
        return Array.from(document.querySelectorAll('.question-wrapper'))
            .filter(q => q.offsetParent !== null);
    };

    const getQuestionNumberText = (qEl) => {
        const numEl = qEl?.querySelector('.question-number strong, .question-number');
        return numEl ? numEl.textContent.trim() : '?';
    };

    const updateTimerUI = () => {
        const badge = document.getElementById('s4-rb-timer');
        if (!badge) return;
        const sec = (elapsedDeciSec / 10).toFixed(1);
        const qNum = activeQuestion ? `Câu ${getQuestionNumberText(activeQuestion)}` : 'Chưa chọn câu';
        badge.textContent = `⏱️ ${qNum}: ${sec}s`;
        badge.classList.toggle('is-warn', elapsedDeciSec >= CONFIG.warnSec * 10 && elapsedDeciSec < CONFIG.dangerSec * 10);
        badge.classList.toggle('is-danger', elapsedDeciSec >= CONFIG.dangerSec * 10);
    };

    const setActiveQuestion = (qEl, shouldScroll = false) => {
        if (!qEl) return;
        if (activeQuestion !== qEl) {
            if (activeQuestion) activeQuestion.classList.remove('s4-active-q');
            activeQuestion = qEl;
            activeQuestion.classList.add('s4-active-q');
            elapsedDeciSec = 0;
            updateTimerUI();
        }
        if (shouldScroll) {
            qEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    const moveQuestion = (delta) => {
        const list = getVisibleQuestions();
        if (list.length === 0) return;
        const idx = activeQuestion ? list.indexOf(activeQuestion) : -1;
        const nextIdx = idx === -1 ? 0 : Math.min(list.length - 1, Math.max(0, idx + delta));
        setActiveQuestion(list[nextIdx], true);
    };

    // ==================== 3. LỌC CÂU SAI & CHẾ ĐỘ BLIND RETRY ====================
    const applyQuestionFilter = () => {
        const allQuestions = document.querySelectorAll('.question-wrapper');
        let shownCount = 0;

        allQuestions.forEach(q => {
            const numBadge = q.querySelector('.question-number');
            const isCorrect = numBadge?.classList.contains('correct') || !!q.querySelector('input[type="radio"].correct:checked');
            const isWrong = numBadge?.classList.contains('wrong') || !isCorrect;

            let show = true;
            if (CONFIG.filterMode === 'wrong') show = isWrong;
            else if (CONFIG.filterMode === 'correct') show = isCorrect;

            const wrapper = q.closest('.question-item-wrapper') || q;
            wrapper.style.display = show ? '' : 'none';
            if (show) shownCount++;
        });

        const countEl = document.getElementById('s4-rb-count');
        if (countEl) countEl.textContent = `${shownCount}/${allQuestions.length} câu`;
    };

    // Kiểm tra đáp án khi người dùng chọn 1 phương án (A/B/C/D)
    const selectOptionOnActiveQuestion = (optionIndex) => {
        if (!activeQuestion) {
            const first = getVisibleQuestions()[0];
            if (first) setActiveQuestion(first, false);
            else return;
        }

        const checks = activeQuestion.querySelectorAll('.form-check');
        if (!checks || optionIndex < 0 || optionIndex >= checks.length) return;

        const targetCheck = checks[optionIndex];
        const radio = targetCheck.querySelector('input[type="radio"]');

        // Nếu đang ở chế độ Blind Retry trên trang Giải chi tiết
        if (CONFIG.blindRetry) {
            handleBlindRetryAttempt(activeQuestion, targetCheck, radio);
            return;
        }

        // Nếu đang ở trang Làm bài thi bình thường
        if (radio && !radio.disabled) {
            radio.click();
        } else {
            const label = targetCheck.querySelector('label');
            if (label) label.click();
        }

        if (CONFIG.autoNextOnKey) {
            setTimeout(() => moveQuestion(1), 180);
        }
    };

    const handleBlindRetryAttempt = (qEl, chosenFormCheck, chosenRadio) => {
        // Tìm đáp án đúng của câu này trên trang Giải chi tiết
        let isCorrectAttempt = false;
        const chosenText = chosenFormCheck.innerText.trim();
        const chosenLetterMatch = chosenText.match(/^([A-D])\b/i);
        const chosenLetter = chosenLetterMatch ? chosenLetterMatch[1].toUpperCase() : '';

        // Cách 1: Study4 gắn class .correct vào input[type=radio] của đáp án đúng
        if (chosenRadio?.classList.contains('correct')) {
            isCorrectAttempt = true;
        } else {
            // Cách 2: Đọc từ dòng "Đáp án đúng: B" (.text-answerkey / .text-success)
            const keyEl = qEl.querySelector('.text-answerkey, .text-success, .question-explanation-wrapper');
            if (keyEl && chosenLetter) {
                const keyMatch = keyEl.innerText.match(/Đáp án đúng\s*:\s*([A-D])/i);
                if (keyMatch && keyMatch[1].toUpperCase() === chosenLetter) {
                    isCorrectAttempt = true;
                }
            }
        }

        let fb = qEl.querySelector('.s4-retry-feedback');
        if (!fb) {
            fb = document.createElement('div');
            fb.className = 's4-retry-feedback';
            const contentBox = qEl.querySelector('.question-content') || qEl;
            contentBox.appendChild(fb);
        }

        const sec = (elapsedDeciSec / 10).toFixed(1);
        if (isCorrectAttempt) {
            fb.className = 's4-retry-feedback is-ok';
            fb.innerHTML = `🎉 <b>Chính xác (${chosenLetter || 'Đúng'})!</b> Phản xạ trong <b>${sec}s</b>. Đã mở giải thích chi tiết bên dưới.`;
            qEl.classList.add('s4-revealed');
            if (CONFIG.autoNextOnKey) {
                setTimeout(() => moveQuestion(1), 900);
            }
        } else {
            fb.className = 's4-retry-feedback is-err';
            fb.innerHTML = `❌ <b>Chưa đúng (${chosenLetter || 'Sai'})!</b> Hãy thử suy nghĩ chọn lại hoặc <a href="#" data-s4-reveal="1" style="text-decoration:underline;color:#991b1b;">bấm vào đây để xem đáp án</a>.`;
            const revealLink = fb.querySelector('[data-s4-reveal]');
            if (revealLink) {
                revealLink.onclick = (ev) => {
                    ev.preventDefault();
                    qEl.classList.add('s4-revealed');
                };
            }
        }
    };

    // ==================== 4. TÍCH HỢP ANKICONNECT 1-CLICK ====================
    const ankiInvoke = async (action, params = {}) => {
        const res = await fetch(CONFIG.ankiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, version: 6, params }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        return data.result;
    };

    const createAnkiModalAndButton = () => {
        const selBtn = document.createElement('button');
        selBtn.id = 's4-anki-SelectionBtn';
        selBtn.type = 'button';
        selBtn.innerHTML = '🃏 +Anki / Note';
        document.body.appendChild(selBtn);

        const backdrop = document.createElement('div');
        backdrop.id = 's4-anki-modal-backdrop';
        backdrop.innerHTML = `
            <div class="s4-anki-modal">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                    <h3 style="margin:0;font-size:16px;">🃏 Lưu Từ vựng / Collocation Part 5-7 vào Anki</h3>
                    <button type="button" class="s4-rb-btn" data-anki-act="close" style="background:#f1f5f9;color:#334155;border-color:#cbd5e1;">✖</button>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;" class="s4-anki-field">
                    <div>
                        <label>Bộ thẻ (Deck):</label>
                        <input type="text" class="s4-anki-input" id="s4-anki-deck" value="${CONFIG.ankiDeck}" placeholder="VD: TOEIC::Part 5">
                    </div>
                    <div>
                        <label>Mẫu thẻ (Note Type):</label>
                        <input type="text" class="s4-anki-input" id="s4-anki-model" value="${CONFIG.ankiModel}" placeholder="VD: Basic">
                    </div>
                </div>

                <div class="s4-anki-field">
                    <label>Mặt trước (Từ vựng / Cụm Collocation):</label>
                    <input type="text" class="s4-anki-input" id="s4-anki-front">
                </div>

                <div class="s4-anki-field">
                    <label>Câu ngữ cảnh gốc trong đề (Context / Ví dụ):</label>
                    <textarea class="s4-anki-textarea" id="s4-anki-context"></textarea>
                </div>

                <div class="s4-anki-field">
                    <label>Mặt sau (Nghĩa tiếng Việt / Giải thích ngữ pháp):</label>
                    <textarea class="s4-anki-textarea" id="s4-anki-back" placeholder="Nhập nghĩa hoặc cấu trúc ngữ pháp cần nhớ..."></textarea>
                </div>

                <div id="s4-anki-status" style="font-size:12.5px;margin-bottom:10px;"></div>

                <div style="display:flex;justify-content:flex-end;gap:8px;">
                    <button type="button" class="s4-rb-btn" data-anki-act="copy" style="background:#f1f5f9;color:#1e293b;border-color:#cbd5e1;">
                        📋 Copy Flashcard
                    </button>
                    <button type="button" class="s4-rb-btn is-active" data-anki-act="save">
                        ➕ Đẩy vào Anki (Ctrl+Enter)
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(backdrop);

        // Khi bôi đen văn bản trong câu hỏi / giải thích
        document.addEventListener('mouseup', (e) => {
            if (e.target.closest('#s4-anki-modal-backdrop, #s4-reading-bar, #s4-anki-SelectionBtn')) return;
            setTimeout(() => {
                const sel = window.getSelection();
                const text = sel ? sel.toString().trim() : '';
                if (text.length >= 2 && text.length <= 120) {
                    const qBox = e.target.closest?.('.question-wrapper, .question-item-wrapper, .context-wrapper');
                    if (!qBox) {
                        selBtn.style.display = 'none';
                        return;
                    }
                    const qTextEl = qBox.querySelector('.question-text') || qBox;
                    const expEl = qBox.querySelector('.question-explanation-wrapper, .collapse.show');
                    currentSelectionInfo = {
                        term: text,
                        context: qTextEl.innerText.trim().replace(/\s+/g, ' '),
                        explanation: expEl ? expEl.innerText.trim() : '',
                    };
                    selBtn.style.left = `${Math.min(window.innerWidth - 130, e.clientX + 8)}px`;
                    selBtn.style.top = `${Math.max(10, e.clientY - 36)}px`;
                    selBtn.style.display = 'block';
                } else {
                    selBtn.style.display = 'none';
                }
            }, 20);
        });

        selBtn.addEventListener('click', () => {
            if (!currentSelectionInfo) return;
            selBtn.style.display = 'none';
            document.getElementById('s4-anki-front').value = currentSelectionInfo.term;
            document.getElementById('s4-anki-context').value = currentSelectionInfo.context;
            document.getElementById('s4-anki-back').value = currentSelectionInfo.explanation;
            document.getElementById('s4-anki-status').textContent = '';
            backdrop.classList.add('is-open');
            document.getElementById('s4-anki-back').focus();
        });

        backdrop.addEventListener('click', async (e) => {
            const btn = e.target.closest('[data-anki-act]');
            if (e.target === backdrop || btn?.getAttribute('data-anki-act') === 'close') {
                backdrop.classList.remove('is-open');
                return;
            }
            if (!btn) return;
            const act = btn.getAttribute('data-anki-act');
            const deck = document.getElementById('s4-anki-deck').value.trim() || 'Default';
            const model = document.getElementById('s4-anki-model').value.trim() || 'Basic';
            const front = document.getElementById('s4-anki-front').value.trim();
            const context = document.getElementById('s4-anki-context').value.trim();
            const back = document.getElementById('s4-anki-back').value.trim();
            const statusEl = document.getElementById('s4-anki-status');

            localStorage.setItem('s4_anki_deck', deck);
            localStorage.setItem('s4_anki_model', model);

            const highlightedContext = context.replace(
                new RegExp(`(${front.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'),
                '<b>$1</b>'
            );
            const fullFront = `<div style="font-size:18px;font-weight:bold;color:#1d4ed8;margin-bottom:8px;">${front}</div><div style="font-size:14px;color:#334155;">${highlightedContext}</div>`;
            const fullBack = back.replace(/\n/g, '<br>');

            if (act === 'copy') {
                await navigator.clipboard.writeText(`${front} — ${context}\t${back.replace(/\s+/g, ' ')}`);
                statusEl.innerHTML = `<span style="color:#15803d;font-weight:600;">✅ Đã copy vào Clipboard (định dạng TSV nạp nhanh vào Anki/Quizlet)!</span>`;
            } else if (act === 'save') {
                try {
                    statusEl.innerHTML = `<span style="color:#2563eb;">⏳ Đang kết nối AnkiConnect (127.0.0.1:8765)...</span>`;
                    const fieldsMap = await ankiInvoke('modelFieldNames', { modelName: model });
                    const f1 = fieldsMap?.[0] || 'Front';
                    const f2 = fieldsMap?.[1] || 'Back';
                    await ankiInvoke('createDeck', { deck });
                    await ankiInvoke('addNote', {
                        note: {
                            deckName: deck,
                            modelName: model,
                            fields: { [f1]: fullFront, [f2]: fullBack },
                            tags: ['study4', 'toeic-reading'],
                        },
                    });
                    statusEl.innerHTML = `<span style="color:#15803d;font-weight:600;">🎉 Đã thêm thẻ "${front}" vào bộ thẻ "${deck}" thành công!</span>`;
                    setTimeout(() => backdrop.classList.remove('is-open'), 900);
                } catch (err) {
                    statusEl.innerHTML = `<span style="color:#b91c1c;">⚠️ Không kết nối được AnkiConnect (${err.message}). Hãy bật phần mềm Anki + cài addon AnkiConnect (2055492159) và thêm <code>https://study4.com</code> vào <code>webCorsOriginList</code>, hoặc bấm nút <b>Copy Flashcard</b> bên cạnh nhé!</span>`;
                }
            }
        });
    };

    // ==================== 5. THANH CÔNG CỤ CHÍNH & PHÍM TẮT ====================
    const bar = document.createElement('div');
    bar.id = 's4-reading-bar';
    bar.innerHTML = `
        <span class="s4-rb-btn" data-rb-act="minimize" title="Thu gọn / Mở rộng thanh Reading Helper" style="font-weight:700;">
            📖 Reading Helper
        </span>
        <div class="s4-rb-content">
            <span id="s4-rb-timer" class="s4-timer-badge" title="Click để Reset đồng hồ câu hiện tại (Xanh <20s, Cam 20-30s, Đỏ >30s)">
                ⏱️ Câu ?: 0.0s
            </span>

            <button type="button" class="s4-rb-btn" data-rb-act="prev" title="Câu trước (Phím K)">⬆ Câu trước</button>
            <button type="button" class="s4-rb-btn" data-rb-act="next" title="Câu tiếp theo (Phím J)">⬇ Câu kế</button>

            <span class="s4-rb-sep"></span>

            <button type="button" class="s4-rb-btn" data-rb-act="blind-retry" title="Ẩn đáp án đúng & lời giải trên trang Đáp án để tự chọn lại A/B/C/D">
                🙈 Che đáp án (Làm lại)
            </button>

            <select class="s4-rb-select" data-rb-act="filter" title="Lọc danh sách câu hỏi trên trang Giải chi tiết">
                <option value="all">📋 Hiện tất cả câu</option>
                <option value="wrong">❌ Chỉ hiện câu Sai / Bỏ trống</option>
                <option value="correct">✅ Chỉ hiện câu Đúng</option>
            </select>
            <span id="s4-rb-count" style="font-size:11.5px;color:#94a3b8;"></span>

            <span class="s4-rb-sep"></span>

            <label style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;font-size:12px;" title="Khi bấm phím tắt 1/2/3/4 hoặc A/B/C/D sẽ tự nhảy sang câu kế tiếp">
                <input type="checkbox" id="s4-rb-autonext" checked>
                Phím A/B/C/D tự qua câu
            </label>
        </div>
    `;
    document.body.appendChild(bar);

    bar.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-rb-act]');
        if (e.target.id === 's4-rb-timer') {
            elapsedDeciSec = 0;
            updateTimerUI();
            return;
        }
        if (!btn) return;
        const act = btn.getAttribute('data-rb-act');
        if (act === 'minimize') {
            bar.classList.toggle('is-minimized');
        } else if (act === 'prev') {
            moveQuestion(-1);
        } else if (act === 'next') {
            moveQuestion(1);
        } else if (act === 'blind-retry') {
            CONFIG.blindRetry = !CONFIG.blindRetry;
            document.body.classList.toggle('s4-blind-retry', CONFIG.blindRetry);
            btn.classList.toggle('is-active', CONFIG.blindRetry);
            if (CONFIG.blindRetry) {
                document.querySelectorAll('.question-wrapper.s4-revealed').forEach(el => el.classList.remove('s4-revealed'));
                document.querySelectorAll('.s4-retry-feedback').forEach(el => el.remove());
            }
        }
    });

    const filterSelect = bar.querySelector('[data-rb-act="filter"]');
    filterSelect.addEventListener('change', () => {
        CONFIG.filterMode = filterSelect.value;
        applyQuestionFilter();
        const first = getVisibleQuestions()[0];
        if (first) setActiveQuestion(first, true);
    });

    const autoNextCheckbox = document.getElementById('s4-rb-autonext');
    autoNextCheckbox.addEventListener('change', () => {
        CONFIG.autoNextOnKey = autoNextCheckbox.checked;
    });

    // Click vào câu hỏi bất kỳ trên trang -> đặt làm Active Question & xử lý Blind Retry nếu click vào đáp án
    const onDocClick = (e) => {
        const qEl = e.target.closest?.('.question-wrapper');
        if (!qEl) return;
        setActiveQuestion(qEl, false);

        if (CONFIG.blindRetry && !qEl.classList.contains('s4-revealed')) {
            const formCheck = e.target.closest?.('.form-check');
            if (formCheck && qEl.contains(formCheck)) {
                e.preventDefault();
                e.stopPropagation();
                const radio = formCheck.querySelector('input[type="radio"]');
                handleBlindRetryAttempt(qEl, formCheck, radio);
            }
        }
    };

    // Phím tắt bàn phím cho Speed Drill Part 5 (A/B/C/D hoặc 1/2/3/4, J/K chuyển câu)
    const onDocKeyDown = (e) => {
        const tag = e.target?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) {
            if (e.ctrlKey && e.key === 'Enter' && document.getElementById('s4-anki-modal-backdrop')?.classList.contains('is-open')) {
                e.preventDefault();
                document.querySelector('[data-anki-act="save"]')?.click();
            }
            return;
        }
        if (e.ctrlKey || e.altKey || e.metaKey) return;

        const key = e.key.toUpperCase();
        if (key === '1' || key === 'A') {
            e.preventDefault();
            selectOptionOnActiveQuestion(0);
        } else if (key === '2' || key === 'B') {
            e.preventDefault();
            selectOptionOnActiveQuestion(1);
        } else if (key === '3' || key === 'C') {
            e.preventDefault();
            selectOptionOnActiveQuestion(2);
        } else if (key === '4' || key === 'D') {
            e.preventDefault();
            selectOptionOnActiveQuestion(3);
        } else if (key === 'J') {
            e.preventDefault();
            moveQuestion(1);
        } else if (key === 'K') {
            e.preventDefault();
            moveQuestion(-1);
        }
    };

    document.addEventListener('click', onDocClick, true);
    window.addEventListener('keydown', onDocKeyDown);
    createAnkiModalAndButton();

    // Khởi động bộ đếm nhịp 0.1s nhẹ nhàng
    timerInterval = setInterval(() => {
        if (CONFIG.timerRunning && activeQuestion && !document.hidden) {
            elapsedDeciSec++;
            updateTimerUI();
        }
    }, 100);

    // Chọn câu đầu tiên và cập nhật số lượng
    const firstQ = getVisibleQuestions()[0];
    if (firstQ) setActiveQuestion(firstQ, false);
    applyQuestionFilter();

    window.__s4ReadingHelperCleanup = () => {
        clearInterval(timerInterval);
        document.removeEventListener('click', onDocClick, true);
        window.removeEventListener('keydown', onDocKeyDown);
        bar.remove();
        styleEl.remove();
        document.getElementById('s4-anki-SelectionBtn')?.remove();
        document.getElementById('s4-anki-modal-backdrop')?.remove();
    };

    console.log('✅ [Study4 Reading & Part 5 Helper v1.0] Đã kích hoạt! Dùng phím A/B/C/D (hoặc 1/2/3/4) để chọn đáp án nhanh, J/K để chuyển câu.');
})();
