// ==UserScript==
// @name         Study4 TOEIC Audio Loop & Dictation Helper (Ultra-Light)
// @namespace    https://github.com/GiapKun/study4-audio-helper
// @version      2.0.0
// @description  Siêu nhẹ (0% lag): Loop vô hạn, Nghe thụ động tự chuyển câu, Lặp đoạn A-B, Phím tắt và Chép chính tả trên Study4.
// @author       GiapKun
// @match        https://study4.com/tests/*
// @match        https://*.study4.com/tests/*
// @downloadURL  https://raw.githubusercontent.com/GiapKun/study4-audio-helper/main/scripts/audio-loop-dictation/study4-toeic-audio.user.js
// @updateURL    https://raw.githubusercontent.com/GiapKun/study4-audio-helper/main/scripts/audio-loop-dictation/study4-toeic-audio.user.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // Nếu đã chạy bản cũ hoặc bản hiện tại thì dọn dẹp trước khi khởi tạo lại
    if (window.__s4AudioHelperCleanup) {
        try { window.__s4AudioHelperCleanup(); } catch (e) {}
    }

    const CONFIG = {
        seekStep: 2.5,       // Tua 2.5 giây mỗi lần bấm phím tắt
        pauseDelayMs: 1000,  // Nghỉ 1 giây giữa các lần lặp / chuyển câu
        mode: 'loop',        // 'off' (Tắt) | 'loop' (Lặp vô hạn câu đang phát) | 'autonext' (Tự qua câu tiếp theo)
        repeatTarget: 1,     // Số lần lặp mỗi câu trước khi qua câu mới (khi chọn 'autonext')
        speed: 1.0,
        pointA: null,
        pointB: null,
    };

    let activeAudio = null;
    let repeatCount = 0;
    let delayTimer = null;

    // ==================== 1. CSS GỌN NHẸ ====================
    const styleEl = document.createElement('style');
    styleEl.id = 's4-audio-helper-styles';
    styleEl.textContent = `
        #s4-dock-bar {
            background: #f0f7ff;
            border: 1.5px solid #3b82f6;
            border-radius: 8px;
            padding: 8px 10px;
            margin: 6px 0 10px 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 12.5px;
            color: #1e293b;
            box-shadow: 0 2px 6px rgba(37, 99, 235, 0.12);
        }
        .s4-row {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 6px;
        }
        .s4-btn {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px 8px;
            border-radius: 6px;
            border: 1px solid #cbd5e1;
            background: #ffffff;
            color: #334155;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            user-select: none;
            line-height: 1.3;
        }
        .s4-btn:hover { background: #f1f5f9; border-color: #94a3b8; }
        .s4-btn.is-active { background: #2563eb; color: #fff; border-color: #1d4ed8; }
        .s4-btn.is-warn { background: #d97706; color: #fff; border-color: #b45309; }
        .s4-select {
            padding: 3px 6px;
            border-radius: 6px;
            border: 1px solid #cbd5e1;
            background: #fff;
            font-size: 12px;
            color: #334155;
            height: 26px;
        }
        .s4-sep { width: 1px; height: 18px; background: #cbd5e1; margin: 0 2px; }
        .s4-dict-box {
            display: none;
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px dashed #93c5fd;
        }
        .s4-dict-box.is-open { display: block; }
        .s4-textarea {
            width: 100%;
            min-height: 64px;
            padding: 7px 10px;
            border: 1px solid #94a3b8;
            border-radius: 6px;
            font-size: 13.5px;
            line-height: 1.45;
            resize: vertical;
            background: #fff;
            color: #0f172a;
            box-sizing: border-box;
        }
        .s4-textarea:focus { outline: none; border-color: #2563eb; }
        .s4-hint {
            font-size: 11.5px;
            color: #475569;
            margin-top: 5px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 6px;
        }
        .s4-diff {
            margin-top: 8px;
            padding: 8px 10px;
            border-radius: 6px;
            background: #fff;
            border: 1px solid #cbd5e1;
            font-size: 13.5px;
            line-height: 1.6;
            display: none;
        }
        .s4-diff.is-visible { display: block; }
        .s4-ok { color: #15803d; font-weight: 600; }
        .s4-miss { color: #b91c1c; background: #fee2e2; padding: 0 3px; border-radius: 3px; text-decoration: underline wavy #dc2626; }
        .s4-wrong { color: #9a3412; background: #ffedd5; padding: 0 3px; border-radius: 3px; text-decoration: line-through; }
        .s4-blur-target { filter: blur(6px); user-select: none; transition: filter 0.2s; }
        .s4-blur-target:hover { filter: blur(0); }
        .s4-kbd {
            background: #e2e8f0;
            color: #1e293b;
            padding: 1px 4px;
            border-radius: 3px;
            font-family: monospace;
            font-size: 11px;
        }
    `;
    document.head.appendChild(styleEl);

    // ==================== 2. THANH CÔNG CỤ DUY NHẤT (DOCK BAR) ====================
    const dockBar = document.createElement('div');
    dockBar.id = 's4-dock-bar';
    dockBar.innerHTML = `
        <div class="s4-row">
            <button type="button" class="s4-btn" data-act="replay" title="Phát lại từ đầu câu (Alt + R)">🔄 Nghe lại</button>
            <button type="button" class="s4-btn" data-act="back" title="Tua lùi 2.5s (Alt + ←)">⏪ -2.5s</button>
            <button type="button" class="s4-btn" data-act="fwd" title="Tua tiến 2.5s (Alt + →)">⏩ +2.5s</button>

            <span class="s4-sep"></span>

            <select class="s4-select" data-act="mode" title="Chế độ lặp (Alt + L để bật/tắt nhanh)">
                <option value="loop" selected>🔁 Loop vô hạn câu này</option>
                <option value="autonext">⏭️ Nghe thụ động (Tự qua câu)</option>
                <option value="off">⏹️ Phát bình thường (Không lặp)</option>
            </select>

            <select class="s4-select" data-act="repeat-target" title="Số lần lặp mỗi câu trước khi tự chuyển câu" style="display:none;">
                <option value="1">1 lần/câu</option>
                <option value="2">Lặp 2 lần</option>
                <option value="3">Lặp 3 lần</option>
                <option value="5">Lặp 5 lần</option>
            </select>

            <span class="s4-sep"></span>

            <button type="button" class="s4-btn" data-act="set-a" title="Đặt điểm bắt đầu lặp A (Alt + [)">🅰️ <span data-role="txt-a">Điểm A</span></button>
            <button type="button" class="s4-btn" data-act="set-b" title="Đặt điểm kết thúc lặp B (Alt + ])">🅱️ <span data-role="txt-b">Điểm B</span></button>
            <button type="button" class="s4-btn" data-act="clear-ab" title="Xóa đoạn A-B" style="display:none;">✖</button>

            <span class="s4-sep"></span>

            <select class="s4-select" data-act="speed" title="Tốc độ nghe">
                <option value="0.75">0.75x</option>
                <option value="0.9">0.9x</option>
                <option value="1" selected>1.0x</option>
                <option value="1.15">1.15x</option>
                <option value="1.25">1.25x</option>
            </select>

            <button type="button" class="s4-btn" data-act="dictation" title="Mở ô luyện chép chính tả">✍️ Chép chính tả</button>
        </div>

        <div class="s4-dict-box" data-role="dict-box">
            <textarea class="s4-textarea" data-role="dict-input" placeholder="Gõ nội dung bạn nghe được vào đây... (Nhấn phím Tab để Play/Pause, Alt+R nghe lại từ đầu, Alt+←/→ tua 2.5s)"></textarea>
            <div class="s4-hint">
                <span>💡 Phím tắt: <kbd class="s4-kbd">Tab</kbd> Play/Pause | <kbd class="s4-kbd">Alt+R</kbd> Nghe lại | <kbd class="s4-kbd">Alt+←/→</kbd> Tua ±2.5s | <kbd class="s4-kbd">Ctrl+Enter</kbd> Chấm điểm</span>
                <div style="display:flex; gap:6px;">
                    <button type="button" class="s4-btn" data-act="blur-transcript">👁️ Làm mờ Transcript</button>
                    <button type="button" class="s4-btn is-active" data-act="check-dict">✅ Check đáp án</button>
                </div>
            </div>
            <div class="s4-diff" data-role="diff-out"></div>
        </div>
    `;

    const modeSelect = dockBar.querySelector('[data-act="mode"]');
    const repeatSelect = dockBar.querySelector('[data-act="repeat-target"]');
    const speedSelect = dockBar.querySelector('[data-act="speed"]');
    const btnSetA = dockBar.querySelector('[data-act="set-a"]');
    const btnSetB = dockBar.querySelector('[data-act="set-b"]');
    const btnClearAB = dockBar.querySelector('[data-act="clear-ab"]');
    const txtA = dockBar.querySelector('[data-role="txt-a"]');
    const txtB = dockBar.querySelector('[data-role="txt-b"]');
    const dictBox = dockBar.querySelector('[data-role="dict-box"]');
    const dictInput = dockBar.querySelector('[data-role="dict-input"]');
    const diffOut = dockBar.querySelector('[data-role="diff-out"]');

    const fmtTime = (sec) => {
        if (sec === null || isNaN(sec)) return '--:--';
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        const ms = Math.floor((sec % 1) * 10);
        return `${m}:${String(s).padStart(2, '0')}.${ms}`;
    };

    const syncUI = () => {
        modeSelect.value = CONFIG.mode;
        repeatSelect.style.display = CONFIG.mode === 'autonext' ? 'inline-block' : 'none';
        txtA.textContent = CONFIG.pointA !== null ? fmtTime(CONFIG.pointA) : 'Điểm A';
        txtB.textContent = CONFIG.pointB !== null ? fmtTime(CONFIG.pointB) : 'Điểm B';
        btnSetA.classList.toggle('is-warn', CONFIG.pointA !== null);
        btnSetB.classList.toggle('is-warn', CONFIG.pointB !== null);
        btnClearAB.style.display = (CONFIG.pointA !== null || CONFIG.pointB !== null) ? 'inline-flex' : 'none';
    };

    // Gắn thanh công cụ ngay bên dưới Audio đang thao tác
    const dockToAudio = (audioEl) => {
        if (!audioEl || audioEl.closest('.jq-audio-player')) return;
        if (activeAudio !== audioEl) {
            clearTimeout(delayTimer);
            activeAudio = audioEl;
            repeatCount = 0;
            CONFIG.pointA = null;
            CONFIG.pointB = null;
            audioEl.playbackRate = CONFIG.speed;
            diffOut.classList.remove('is-visible');
            syncUI();
        }
        const host = audioEl.closest('.plyr--audio') || audioEl;
        if (host.nextElementSibling !== dockBar) {
            host.insertAdjacentElement('afterend', dockBar);
        }
    };

    // ==================== 3. SO KHỚP CHÉP CHÍNH TẢ ====================
    const getTranscriptForCurrent = () => {
        if (!activeAudio) return '';
        const box = activeAudio.closest('.question-item-wrapper, .question-wrapper, .context-wrapper, .test-questions-wrapper, .modal-body, .card-body')
            || activeAudio.parentElement?.parentElement?.parentElement;
        if (!box) return '';
        const blocks = box.querySelectorAll('.collapse, .context-transcript, .question-explanation-wrapper');
        return Array.from(blocks).map(el => el.innerText.trim()).filter(Boolean).join('\n');
    };

    const checkDictation = () => {
        const raw = getTranscriptForCurrent();
        const norm = (w) => w.toLowerCase().replace(/[^a-z0-9']/g, '');
        const uWords = dictInput.value.trim().split(/\s+/).filter(Boolean);
        const rWords = raw.trim().split(/\s+/).filter(Boolean);

        diffOut.classList.add('is-visible');
        if (rWords.length === 0) {
            diffOut.innerHTML = `<span style="color:#d97706">Hãy bấm mở "Hiện Transcript / Giải thích" của câu này trên trang trước để công cụ lấy văn bản gốc đối chiếu nhé!</span>`;
            return;
        }

        const m = uWords.length, n = rWords.length;
        const dp = Array.from({ length: m + 1 }, () => new Int32Array(n + 1));
        for (let i = 1; i <= m; i++) {
            const uw = norm(uWords[i - 1]);
            for (let j = 1; j <= n; j++) {
                dp[i][j] = (uw && uw === norm(rWords[j - 1])) ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }

        let i = m, j = n, ok = 0;
        const out = [];
        while (i > 0 || j > 0) {
            const uw = i > 0 ? norm(uWords[i - 1]) : '';
            const rw = j > 0 ? norm(rWords[j - 1]) : '';
            if (i > 0 && j > 0 && uw && uw === rw) {
                out.unshift(`<span class="s4-ok">${rWords[j - 1]}</span>`);
                ok++; i--; j--;
            } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
                out.unshift(`<span class="s4-miss">${rWords[j - 1]}</span>`);
                j--;
            } else {
                out.unshift(`<span class="s4-wrong">${uWords[i - 1]}</span>`);
                i--;
            }
        }
        const pct = Math.round((ok / n) * 100);
        diffOut.innerHTML = `<div style="margin-bottom:4px;font-weight:600;">🎯 Đúng: <span style="color:${pct >= 80 ? '#15803d' : '#d97706'}">${pct}%</span> (${ok}/${n} từ)</div><div>${out.join(' ')}</div>`;
    };

    // ==================== 4. XỬ LÝ SỰ KIỆN NÚT BẤM & AUDIO ====================
    dockBar.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-act]');
        if (!btn || !activeAudio) return;
        const act = btn.getAttribute('data-act');

        if (act === 'replay') {
            clearTimeout(delayTimer);
            activeAudio.currentTime = CONFIG.pointA !== null ? CONFIG.pointA : 0;
            activeAudio.play();
        } else if (act === 'back') {
            activeAudio.currentTime = Math.max(0, activeAudio.currentTime - CONFIG.seekStep);
        } else if (act === 'fwd') {
            activeAudio.currentTime = Math.min(activeAudio.duration || 9999, activeAudio.currentTime + CONFIG.seekStep);
        } else if (act === 'set-a') {
            CONFIG.pointA = activeAudio.currentTime;
            if (CONFIG.pointB !== null && CONFIG.pointB <= CONFIG.pointA) CONFIG.pointB = null;
            syncUI();
        } else if (act === 'set-b') {
            if (CONFIG.pointA === null) CONFIG.pointA = 0;
            if (activeAudio.currentTime > CONFIG.pointA) {
                CONFIG.pointB = activeAudio.currentTime;
                CONFIG.mode = 'loop';
            }
            syncUI();
        } else if (act === 'clear-ab') {
            CONFIG.pointA = null;
            CONFIG.pointB = null;
            syncUI();
        } else if (act === 'dictation') {
            dictBox.classList.toggle('is-open');
            btn.classList.toggle('is-active', dictBox.classList.contains('is-open'));
            if (dictBox.classList.contains('is-open')) dictInput.focus();
        } else if (act === 'blur-transcript') {
            const box = activeAudio.closest('.question-item-wrapper, .question-wrapper, .context-wrapper, .card-body') || activeAudio.parentElement?.parentElement;
            if (box) {
                box.querySelectorAll('.collapse, .context-transcript, .question-explanation-wrapper')
                    .forEach(el => el.classList.toggle('s4-blur-target'));
            }
        } else if (act === 'check-dict') {
            checkDictation();
        }
    });

    modeSelect.addEventListener('change', () => {
        CONFIG.mode = modeSelect.value;
        repeatCount = 0;
        syncUI();
    });

    repeatSelect.addEventListener('change', () => {
        CONFIG.repeatTarget = parseInt(repeatSelect.value, 10) || 1;
        repeatCount = 0;
    });

    speedSelect.addEventListener('change', () => {
        CONFIG.speed = parseFloat(speedSelect.value) || 1.0;
        if (activeAudio) activeAudio.playbackRate = CONFIG.speed;
    });

    dictInput.addEventListener('keydown', (e) => {
        if (!activeAudio) return;
        if (e.key === 'Tab') {
            e.preventDefault();
            if (activeAudio.paused) activeAudio.play();
            else activeAudio.pause();
        } else if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            checkDictation();
        }
    });

    // Bắt sự kiện Audio toàn trang bằng Event Capture (0% lag, không cần quét DOM liên tục)
    const onDocPlay = (e) => {
        if (e.target && e.target.tagName === 'AUDIO') {
            dockToAudio(e.target);
        }
    };

    const onDocTimeUpdate = (e) => {
        if (e.target === activeAudio && CONFIG.pointB !== null && activeAudio.currentTime >= CONFIG.pointB) {
            activeAudio.currentTime = CONFIG.pointA !== null ? CONFIG.pointA : 0;
            if (CONFIG.mode === 'off') activeAudio.pause();
        }
    };

    const onDocEnded = (e) => {
        if (e.target !== activeAudio) return;
        const startPos = CONFIG.pointA !== null ? CONFIG.pointA : 0;

        if (CONFIG.mode === 'loop') {
            delayTimer = setTimeout(() => {
                if (!activeAudio) return;
                activeAudio.currentTime = startPos;
                activeAudio.play().catch(() => {});
            }, CONFIG.pauseDelayMs);
        } else if (CONFIG.mode === 'autonext') {
            repeatCount++;
            if (repeatCount < CONFIG.repeatTarget) {
                delayTimer = setTimeout(() => {
                    if (!activeAudio) return;
                    activeAudio.currentTime = startPos;
                    activeAudio.play().catch(() => {});
                }, CONFIG.pauseDelayMs);
            } else {
                repeatCount = 0;
                const allAudios = Array.from(document.querySelectorAll('audio.post-audio-item, .plyr--audio audio'))
                    .filter(a => !a.closest('.jq-audio-player') && a.offsetParent !== null);
                const idx = allAudios.indexOf(activeAudio);
                if (idx !== -1 && idx + 1 < allAudios.length) {
                    const nextAudio = allAudios[idx + 1];
                    delayTimer = setTimeout(() => {
                        dockToAudio(nextAudio);
                        const host = nextAudio.closest('.plyr--audio') || nextAudio;
                        host.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        nextAudio.currentTime = 0;
                        nextAudio.play().catch(() => {});
                    }, CONFIG.pauseDelayMs);
                }
            }
        }
    };

    // Khi người dùng click vào bất kỳ khung player nào thì gắn thanh công cụ vào đó luôn
    const onDocClick = (e) => {
        const plyr = e.target.closest?.('.plyr--audio');
        if (plyr) {
            const aud = plyr.querySelector('audio');
            if (aud) dockToAudio(aud);
        }
    };

    // Phím tắt Alt toàn trang
    const onDocKeyDown = (e) => {
        if (!e.altKey || !activeAudio) return;
        if (e.code === 'Space') {
            e.preventDefault();
            if (activeAudio.paused) activeAudio.play();
            else activeAudio.pause();
        } else if (e.code === 'KeyR') {
            e.preventDefault();
            activeAudio.currentTime = CONFIG.pointA !== null ? CONFIG.pointA : 0;
            activeAudio.play();
        } else if (e.code === 'ArrowLeft') {
            e.preventDefault();
            activeAudio.currentTime = Math.max(0, activeAudio.currentTime - CONFIG.seekStep);
        } else if (e.code === 'ArrowRight') {
            e.preventDefault();
            activeAudio.currentTime = Math.min(activeAudio.duration || 9999, activeAudio.currentTime + CONFIG.seekStep);
        } else if (e.code === 'KeyL') {
            e.preventDefault();
            CONFIG.mode = CONFIG.mode === 'loop' ? 'off' : 'loop';
            syncUI();
        } else if (e.code === 'BracketLeft') {
            e.preventDefault();
            dockBar.querySelector('[data-act="set-a"]').click();
        } else if (e.code === 'BracketRight') {
            e.preventDefault();
            dockBar.querySelector('[data-act="set-b"]').click();
        }
    };

    document.addEventListener('play', onDocPlay, true);
    document.addEventListener('timeupdate', onDocTimeUpdate, true);
    document.addEventListener('ended', onDocEnded, true);
    document.addEventListener('click', onDocClick, true);
    window.addEventListener('keydown', onDocKeyDown);

    // Gắn mặc định vào audio đầu tiên đang hiển thị trên màn hình
    const firstAudio = document.querySelector('audio.post-audio-item, .plyr--audio audio');
    if (firstAudio) dockToAudio(firstAudio);

    // Hàm dọn dẹp nếu chạy lại script
    window.__s4AudioHelperCleanup = () => {
        clearTimeout(delayTimer);
        document.removeEventListener('play', onDocPlay, true);
        document.removeEventListener('timeupdate', onDocTimeUpdate, true);
        document.removeEventListener('ended', onDocEnded, true);
        document.removeEventListener('click', onDocClick, true);
        window.removeEventListener('keydown', onDocKeyDown);
        dockBar.remove();
        styleEl.remove();
    };

    console.log('✅ [Study4 Audio Helper v2.0 Ultra-Light] Đã kích hoạt! Bấm Play ở bất kỳ câu nào để dùng.');
})();
