/**
 * flashcard.js
 * 字卡練習模組 — 單字字卡 & 句子字卡
 * 依賴：wordsData (quiz.js), sentenceData (q_sentence.js),
 *       window.getVocabularyData(), window.persistVocabularyData()
 */

console.log("✅ flashcard.js loaded");

// ─────────────────────────────────────────
//  狀態變數
// ─────────────────────────────────────────
let fcType         = null;   // 'word' | 'sentence'
let fcDeck         = [];     // 本次練習的牌組
let fcIndex        = 0;      // 目前是第幾張（0-based）
let fcResults      = [];     // { id, known: true/false }
let fcHistory      = {};     // 從 vocabularyData 載入的歷史記錄
let fcFilters      = {
    levels:     new Set(),
    categories: new Set(),
    special:    new Set()    // 'important' | 'wrong' | 'unseen'
};
let fcCount        = 10;     // 預設張數

// 音檔基底 URL（與 quiz.js / q_sentence.js 保持一致）
const FC_WORD_AUDIO_BASE     = "https://github.com/BoydYang-Designer/English-vocabulary/raw/main/audio_files/";
const FC_SENTENCE_AUDIO_BASE = "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Sentence%20file/";

let fcCurrentAudio = null;

// ─────────────────────────────────────────
//  初始化入口（從 quiz.html 的第三張卡片呼叫）
// ─────────────────────────────────────────
function navigateToFlashcard() {
    // 隱藏其他區域
    hideAllPanels();
    document.getElementById('flashcardTypePanel').style.display = 'block';
    updateBreadcrumb(['選擇功能', '測驗中心', '字卡練習']);
}

function selectFlashcardType(type) {
    fcType    = type;
    fcFilters = { levels: new Set(), categories: new Set(), special: new Set() };

    hideAllPanels();
    document.getElementById('flashcardSetupPanel').style.display = 'block';

    const label = type === 'word' ? '單字字卡' : '句子字卡';
    updateBreadcrumb(['選擇功能', '測驗中心', '字卡練習', label]);

    buildFlashcardFilters(type);
}

// ─────────────────────────────────────────
//  篩選面板建構
// ─────────────────────────────────────────
function buildFlashcardFilters(type) {
    const levelEl    = document.getElementById('fc-level-buttons');
    const categoryEl = document.getElementById('fc-category-buttons');
    const specialEl  = document.getElementById('fc-special-buttons');

    // 重置
    [levelEl, categoryEl, specialEl].forEach(el => { if (el) el.innerHTML = ''; });

    // === 難易度按鈕 ===
    const standardLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

    if (type === 'word') {
        const usedLevels = new Set((wordsData || []).map(w => w['等級'] || '未分類'));
        const levels = standardLevels.filter(l => usedLevels.has(l));
        if (usedLevels.has('未分類')) levels.push('未分類');
        levelEl.innerHTML = levels.map(l =>
            `<button class="category-button" onclick="fcToggleFilter('levels','${l}',this)">${l}</button>`
        ).join('');
    } else {
        const usedLevels = new Set((sentenceData || []).map(s => s['等級'] || '未分類'));
        const levels = standardLevels.filter(l => usedLevels.has(l));
        if (usedLevels.has('未分類')) levels.push('未分類');
        levelEl.innerHTML = levels.map(l =>
            `<button class="category-button" onclick="fcToggleFilter('levels','${l}',this)">${l}</button>`
        ).join('');
    }

    // === 主題大類按鈕 ===
    if (type === 'word') {
        const cats = [...new Set((wordsData || []).map(w => (w['分類'] && w['分類'][0]) || '未分類').filter(Boolean))];
        categoryEl.innerHTML = cats.map(c =>
            `<button class="category-button" onclick="fcToggleFilter('categories','${c}',this)">${c}</button>`
        ).join('');
    } else {
        const cats = [...new Set((sentenceData || []).map(s => s.primaryCategory).filter(Boolean))];
        categoryEl.innerHTML = cats.map(c =>
            `<button class="category-button" onclick="fcToggleFilter('categories','${c}',this)">${c}</button>`
        ).join('');
    }

    // === 特殊篩選按鈕 ===
    const specialLabel = type === 'word' ? '重要單字' : '重要句子';
    const wrongLabel   = type === 'word' ? '答錯過的單字' : '答錯過的句子';
    specialEl.innerHTML = `
        <button class="category-button" onclick="fcToggleFilter('special','important',this)">${specialLabel}</button>
        <button class="category-button" onclick="fcToggleFilter('special','wrong',this)">${wrongLabel}</button>
        <button class="category-button" onclick="fcToggleFilter('special','unseen',this)">從未練習過</button>
    `;

    // 預設選中張數按鈕
    document.querySelectorAll('.fc-count-btn').forEach(btn => {
        btn.classList.remove('selected');
        if (parseInt(btn.dataset.count) === fcCount) btn.classList.add('selected');
    });
}

function fcToggleFilter(type, value, btn) {
    const set = fcFilters[type];
    if (set.has(value)) {
        set.delete(value);
        btn.classList.remove('selected');
    } else {
        set.add(value);
        btn.classList.add('selected');
    }
}

function fcSelectCount(n, btn) {
    fcCount = n;
    document.querySelectorAll('.fc-count-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
}

// ─────────────────────────────────────────
//  抽牌邏輯（加權優先）
// ─────────────────────────────────────────
function startFlashcardSession() {
    // 讀取最新歷史記錄
    const vocab  = window.getVocabularyData ? window.getVocabularyData() : {};
    fcHistory    = (vocab.flashcardHistory && vocab.flashcardHistory[fcType]) || {};

    // 根據類型取得原始資料集
    let pool = fcType === 'word'
        ? (wordsData || [])
        : (sentenceData || []);

    if (!pool || pool.length === 0) {
        alert('⚠️ 資料尚未載入，請稍後再試。');
        return;
    }

    // === 套用篩選 ===
    pool = pool.filter(item => {
        const level    = item['等級'] || '未分類';
        const category = fcType === 'word'
            ? (item['分類'] && item['分類'][0]) || '未分類'
            : (item.primaryCategory || '未分類');
        const id       = fcType === 'word' ? item.Words : item.Words;
        const hist     = fcHistory[id] || {};

        if (fcFilters.levels.size > 0 && !fcFilters.levels.has(level)) return false;
        if (fcFilters.categories.size > 0 && !fcFilters.categories.has(category)) return false;

        if (fcFilters.special.size > 0) {
            const vocabData = window.getVocabularyData ? window.getVocabularyData() : {};
            for (const f of fcFilters.special) {
                if (f === 'important') {
                    const imp = fcType === 'word'
                        ? (vocabData.importantWords || {})[id] === 'true'
                        : (vocabData.importantSentences || {})[id] === 'true';
                    if (!imp) return false;
                }
                if (f === 'wrong') {
                    const wrng = fcType === 'word'
                        ? (vocabData.wrongWords || []).includes(id)
                        : (vocabData.wrongQS || []).includes(id);
                    if (!wrng) return false;
                }
                if (f === 'unseen') {
                    if (hist.seen > 0) return false;
                }
            }
        }
        return true;
    });

    if (pool.length === 0) {
        alert('⚠️ 沒有符合條件的字卡，請調整篩選條件。');
        return;
    }

    // === 加權排序（智慧抽牌）===
    // 優先級分數越低，越優先出現
    function priorityScore(item) {
        const id   = item.Words;
        const hist = fcHistory[id] || { seen: 0, known: 0, unknown: 0, streak: 0 };
        if (hist.seen === 0)             return 0;  // 🟠 從未見過 → 最高優先
        if (hist.streak === 0 && hist.unknown >= 2) return 1;  // 🔴 一直記不住
        if (hist.streak === 1)           return 2;  // 🟡 剛記住一次
        if (hist.streak >= 3)            return 4;  // 🟢 熟練
        return 3;                                   // 普通
    }

    // Fisher-Yates 洗牌後依優先級排序
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    pool.sort((a, b) => priorityScore(a) - priorityScore(b));

    // 取前 N 張（60% 高優先 + 40% 其他，最多 fcCount 張）
    const highPriority = pool.filter(item => priorityScore(item) <= 1);
    const others       = pool.filter(item => priorityScore(item) > 1);
    const highCount    = Math.min(Math.ceil(fcCount * 0.6), highPriority.length);
    const otherCount   = Math.min(fcCount - highCount, others.length);
    const combined     = [...highPriority.slice(0, highCount), ...others.slice(0, otherCount)];

    // 再次洗牌，讓高優先不全部集中前面
    for (let i = combined.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [combined[i], combined[j]] = [combined[j], combined[i]];
    }

    fcDeck   = combined;
    fcIndex  = 0;
    fcResults = [];

    if (fcDeck.length === 0) {
        alert('⚠️ 沒有足夠的字卡可以練習，請擴大篩選條件。');
        return;
    }

    // 顯示字卡練習畫面
    hideAllPanels();
    document.getElementById('flashcardArea').style.display = 'block';
    const label = fcType === 'word' ? '單字字卡' : '句子字卡';
    updateBreadcrumb(['選擇功能', '測驗中心', '字卡練習', label]);

    renderFlashcard();
}

// ─────────────────────────────────────────
//  字卡渲染
// ─────────────────────────────────────────
function renderFlashcard() {
    if (fcIndex >= fcDeck.length) {
        showFlashcardResult();
        return;
    }

    const item     = fcDeck[fcIndex];
    const total    = fcDeck.length;
    const progress = fcIndex + 1;

    // 進度條
    const progressBar  = document.getElementById('fc-progress-bar');
    const progressText = document.getElementById('fc-progress-text');
    if (progressBar)  progressBar.style.width = `${(fcIndex / total) * 100}%`;
    if (progressText) progressText.textContent = `${progress} / ${total}`;

    // 圓點進度
    renderDots(total);

    // 重置翻牌狀態
    const card = document.getElementById('fc-card');
    if (card) card.classList.remove('flipped');

    // 按鈕狀態重置
    const actionBtns = document.getElementById('fc-action-buttons');
    if (actionBtns) actionBtns.style.display = 'none';
    const flipHint = document.getElementById('fc-flip-hint');
    if (flipHint) flipHint.style.display = 'flex';

    // 建立正面內容
    const frontEl = document.getElementById('fc-front-content');
    const backEl  = document.getElementById('fc-back-content');

    if (fcType === 'word') {
        const word       = item.Words || '';
        const chinese    = item['traditional Chinese'] || '（無中文）';
        const ph1        = item['pronunciation-1'] || '';
        const ph2        = item['pronunciation-2'] || '';
        const phonetics  = ph2 ? `${ph1} / ${ph2}` : ph1;
        const category   = (item['分類'] && item['分類'][0]) || '';
        const level      = item['等級'] || '';

        frontEl.innerHTML = `
            <div class="fc-tags">
                ${level    ? `<span class="fc-tag fc-tag-level">${level}</span>` : ''}
                ${category ? `<span class="fc-tag fc-tag-cat">${category}</span>` : ''}
            </div>
            <div class="fc-word">${word}</div>
            <div class="fc-phonetics-front">${phonetics || '&nbsp;'}</div>
            <button class="fc-play-btn" onclick="event.stopPropagation(); fcPlayAudio()" title="播放發音">
                🔊 <span>播放</span>
            </button>
        `;

        backEl.innerHTML = `
            <div class="fc-tags">
                ${level    ? `<span class="fc-tag fc-tag-level">${level}</span>` : ''}
                ${category ? `<span class="fc-tag fc-tag-cat">${category}</span>` : ''}
            </div>
            <div class="fc-word">${word}</div>
            <div class="fc-phonetics" title="點擊播放發音" onclick="fcPlayAudio()">
                ${phonetics ? `🔊 ${phonetics}` : '🔊 播放'}
            </div>
            <div class="fc-chinese">${chinese.replace(/\n/g, '<br>')}</div>
        `;
    } else {
        // 句子字卡
        const sentence  = item['句子'] || '';
        const chinese   = item['中文'] || '（無中文翻譯）';
        const category  = item.primaryCategory || '';
        const level     = item['等級'] || '';
        // 去除 [=...] 標記
        const cleanSent = sentence.replace(/\s*\[=[^\]]+\]/g, '').trim();

        // 取句子前 3 個單字作為提示
        const words     = cleanSent.split(/\s+/);
        const hintWords = words.slice(0, 3);
        const restCount = words.length - hintWords.length;

        frontEl.innerHTML = `
            <div class="fc-tags">
                ${level    ? `<span class="fc-tag fc-tag-level">${level}</span>` : ''}
                ${category ? `<span class="fc-tag fc-tag-cat">${category}</span>` : ''}
            </div>
            <div class="fc-sentence-hint">
                <span class="fc-hint-known">${hintWords.join(' ')}</span>
                <span class="fc-hint-blanks">${'_ '.repeat(restCount).trim()}</span>
            </div>
            <div class="fc-hint-label">完成這個句子 →</div>
            <div class="fc-chinese-sub">${chinese}</div>
            <button class="fc-play-btn" onclick="event.stopPropagation(); fcPlayAudio()" title="播放發音">
                🔊 <span>播放</span>
            </button>
        `;

        backEl.innerHTML = `
            <div class="fc-tags">
                ${level    ? `<span class="fc-tag fc-tag-level">${level}</span>` : ''}
                ${category ? `<span class="fc-tag fc-tag-cat">${category}</span>` : ''}
            </div>
            <div class="fc-sentence" onclick="fcPlayAudio()" title="點擊播放發音">
                🔊 ${cleanSent}
            </div>
            <div class="fc-divider"></div>
            <div class="fc-chinese">${chinese}</div>
        `;
    }

    // 準備音檔並自動播放
    fcPrepareAudio(item);
}

function renderDots(total) {
    const dotsEl = document.getElementById('fc-dots');
    if (!dotsEl) return;
    dotsEl.innerHTML = Array.from({ length: total }, (_, i) => {
        const result = fcResults[i];
        if (result === undefined) {
            return `<span class="fc-dot ${i === fcIndex ? 'fc-dot-current' : 'fc-dot-pending'}"></span>`;
        }
        return `<span class="fc-dot ${result.known ? 'fc-dot-known' : 'fc-dot-unknown'}"></span>`;
    }).join('');
}

// ─────────────────────────────────────────
//  翻牌
// ─────────────────────────────────────────
function fcFlipCard() {
    const card = document.getElementById('fc-card');
    if (!card) return;
    card.classList.toggle('flipped');

    const isFlipped  = card.classList.contains('flipped');
    const actionBtns = document.getElementById('fc-action-buttons');
    const flipHint   = document.getElementById('fc-flip-hint');

    if (actionBtns) actionBtns.style.display = isFlipped ? 'flex' : 'none';
    if (flipHint)   flipHint.style.display   = isFlipped ? 'none' : 'flex';
}

// ─────────────────────────────────────────
//  音檔
// ─────────────────────────────────────────
function fcPrepareAudio(item) {
    if (fcCurrentAudio instanceof Audio) {
        fcCurrentAudio.pause();
        fcCurrentAudio = null;
    }
    const audioUrl = fcType === 'word'
        ? `${FC_WORD_AUDIO_BASE}${item.Words}.mp3`
        : `${FC_SENTENCE_AUDIO_BASE}${encodeURIComponent(item.Words)}.mp3`;

    fcCurrentAudio = new Audio(audioUrl);

    // 正面出現時自動播放
    fcCurrentAudio.play().catch(err => {
        // 瀏覽器 autoplay 政策封鎖時靜默失敗，使用者可點按鈕手動播放
        console.warn('🔊 自動播放被封鎖，請點播放鍵:', err.name);
    });
}

function fcPlayAudio() {
    if (!fcCurrentAudio) return;
    fcCurrentAudio.currentTime = 0;
    fcCurrentAudio.play().catch(err => console.warn('🔊 播放失敗:', err));
}

// ─────────────────────────────────────────
//  評分：記得 / 再練習
// ─────────────────────────────────────────
function fcMarkKnown(known) {
    const item = fcDeck[fcIndex];
    if (!item) return;

    const id   = item.Words;
    const hist = fcHistory[id] || { seen: 0, known: 0, unknown: 0, streak: 0, lastSeen: null };

    hist.seen++;
    hist.lastSeen = new Date().toISOString().split('T')[0];

    if (known) {
        hist.known++;
        hist.streak = (hist.streak || 0) + 1;
    } else {
        hist.unknown++;
        hist.streak = 0;
    }

    fcHistory[id] = hist;
    fcResults.push({ id, item, known });

    // 立即更新這一顆圓點
    updateDot(fcIndex, known);

    // 儲存到 vocabularyData
    fcSaveHistory();

    // 下一張
    fcIndex++;

    setTimeout(() => {
        // 翻回正面後再渲染下一張
        const card = document.getElementById('fc-card');
        if (card) card.classList.remove('flipped');
        setTimeout(renderFlashcard, 120);
    }, 200);
}

function updateDot(index, known) {
    const dots = document.querySelectorAll('.fc-dot');
    if (dots[index]) {
        dots[index].className = `fc-dot ${known ? 'fc-dot-known' : 'fc-dot-unknown'}`;
    }
}

// ─────────────────────────────────────────
//  儲存歷史記錄
// ─────────────────────────────────────────
function fcSaveHistory() {
    if (!window.getVocabularyData || !window.persistVocabularyData) return;
    const vocab = window.getVocabularyData();
    if (!vocab.flashcardHistory) vocab.flashcardHistory = {};
    vocab.flashcardHistory[fcType] = fcHistory;
    // 直接修改後觸發存檔
    window.persistVocabularyData();
}

// ─────────────────────────────────────────
//  結果頁
// ─────────────────────────────────────────
function showFlashcardResult() {
    hideAllPanels();
    document.getElementById('flashcardResultPanel').style.display = 'block';

    const knownItems   = fcResults.filter(r => r.known);
    const unknownItems = fcResults.filter(r => !r.known);

    const knownCount   = knownItems.length;
    const unknownCount = unknownItems.length;
    const total        = fcResults.length;
    const pct          = total > 0 ? Math.round((knownCount / total) * 100) : 0;

    // 評語
    let comment = '';
    if (pct === 100)      comment = '🏆 完美！全部記住了！';
    else if (pct >= 80)   comment = '🎉 非常好！幾乎全部記住了！';
    else if (pct >= 60)   comment = '👍 不錯！繼續加油！';
    else if (pct >= 40)   comment = '💪 加油！多練習幾次就會記住！';
    else                  comment = '📚 還需要多加練習，別放棄！';

    document.getElementById('fc-result-comment').textContent = comment;
    document.getElementById('fc-result-known').textContent   = knownCount;
    document.getElementById('fc-result-unknown').textContent = unknownCount;
    document.getElementById('fc-result-pct').textContent     = pct + '%';

    // 列出需要複習的字
    const reviewList = document.getElementById('fc-review-list');
    if (unknownItems.length === 0) {
        reviewList.innerHTML = '<p class="fc-all-good">🎊 沒有需要複習的字卡！</p>';
    } else {
        reviewList.innerHTML = unknownItems.map(r => {
            const item     = r.item;
            const display  = fcType === 'word' ? item.Words : item['句子'];
            const sub      = fcType === 'word'
                ? (item['traditional Chinese'] || '').split('\n')[0]
                : (item['中文'] || '');
            const cleanDisp = display ? display.replace(/\s*\[=[^\]]+\]/g, '').trim() : '';
            return `
                <div class="fc-review-item">
                    <div class="fc-review-main">${cleanDisp}</div>
                    <div class="fc-review-sub">${sub}</div>
                    <button class="fc-audio-btn" onclick="fcPlayItemAudio('${item.Words}')">🔊</button>
                </div>
            `;
        }).join('');
    }

    // 控制「再練習答錯的」按鈕
    const retryBtn = document.getElementById('fc-retry-wrong-btn');
    if (retryBtn) retryBtn.style.display = unknownItems.length > 0 ? 'inline-flex' : 'none';

    updateBreadcrumb(['選擇功能', '測驗中心', '字卡練習', '練習結果']);
}

function fcPlayItemAudio(wordKey) {
    const url = fcType === 'word'
        ? `${FC_WORD_AUDIO_BASE}${wordKey}.mp3`
        : `${FC_SENTENCE_AUDIO_BASE}${encodeURIComponent(wordKey)}.mp3`;
    new Audio(url).play().catch(e => console.warn('🔊 播放失敗:', e));
}

// ─────────────────────────────────────────
//  結果頁按鈕動作
// ─────────────────────────────────────────
function fcRetryWrong() {
    // 只練習答錯的
    const wrongItems = fcResults.filter(r => !r.known).map(r => r.item);
    if (wrongItems.length === 0) return;

    // 洗牌
    for (let i = wrongItems.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [wrongItems[i], wrongItems[j]] = [wrongItems[j], wrongItems[i]];
    }

    fcDeck    = wrongItems;
    fcIndex   = 0;
    fcResults = [];

    hideAllPanels();
    document.getElementById('flashcardArea').style.display = 'block';
    renderFlashcard();
}

function fcRestartSame() {
    // 重新開始（相同篩選條件）
    startFlashcardSession();
}

function fcBackToMenu() {
    hideAllPanels();
    // 顯示測驗類型選擇器
    const selector = document.querySelector('.quiz-type-selector');
    if (selector) selector.style.display = 'grid';
    updateBreadcrumb(['選擇功能', '測驗中心']);
}

function fcBackToSetup() {
    hideAllPanels();
    document.getElementById('flashcardSetupPanel').style.display = 'block';
}

function fcBackToTypeSelect() {
    hideAllPanels();
    document.getElementById('flashcardTypePanel').style.display = 'block';
    updateBreadcrumb(['選擇功能', '測驗中心', '字卡練習']);
}

// ─────────────────────────────────────────
//  工具函式
// ─────────────────────────────────────────
function hideAllPanels() {
    const ids = [
        'quizCategories', 'sentenceQuizCategories',
        'quizArea', 'sentenceQuizArea',
        'rewordQuizArea', 'reorganizeQuizArea',
        'quizResult',
        'flashcardTypePanel', 'flashcardSetupPanel',
        'flashcardArea', 'flashcardResultPanel'
    ];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    const selector = document.querySelector('.quiz-type-selector');
    if (selector) selector.style.display = 'none';
}

// ─────────────────────────────────────────
//  鍵盤快捷鍵支援
// ─────────────────────────────────────────
document.addEventListener('keydown', function(e) {
    const area = document.getElementById('flashcardArea');
    if (!area || area.style.display === 'none') return;

    const card = document.getElementById('fc-card');
    const isFlipped = card && card.classList.contains('flipped');

    if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        if (!isFlipped) {
            fcFlipCard();
        } else {
            fcPlayAudio();
        }
    }
    if (e.code === 'ArrowRight' && isFlipped) {
        e.preventDefault();
        fcMarkKnown(true);
    }
    if (e.code === 'ArrowLeft' && isFlipped) {
        e.preventDefault();
        fcMarkKnown(false);
    }
});
