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
    // 🔧 新增：檢查基礎資料是否已載入
    const wordDataReady = typeof window.wordsData !== 'undefined' && window.wordsData.length > 0;
    const sentenceDataReady = typeof window.sentenceData !== 'undefined' && window.sentenceData.length > 0;
    
    console.log('📊 字卡資料載入狀態：', {
        wordsData: wordDataReady ? `${window.wordsData.length} 筆` : '未載入',
        sentenceData: sentenceDataReady ? `${window.sentenceData?.length || 0} 筆` : '未載入'
    });
    
    // 如果單字資料未載入，顯示警告（句子資料可以延遲載入）
    if (!wordDataReady) {
        alert('⚠️ 單字資料尚未載入完成\n\n請稍候 2-3 秒後再試，或重新整理頁面。\n\n提示：確保 quiz.js 已正確載入。');
        console.error('❌ wordsData 未載入');
        return;
    }
    
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

    // 🔧 句子字卡：確保資料已載入
    if (type === 'sentence') {
        if (typeof window.ensureSentenceDataLoaded === 'function') {
            console.log('📥 開始載入句子資料...');
            window.ensureSentenceDataLoaded()
                .then(() => {
                    console.log(`✅ 句子資料已就緒：${sentenceData.length} 筆`);
                    buildFlashcardFilters(type);
                })
                .catch((error) => {
                    console.error('❌ 句子資料載入失敗:', error);
                    alert('⚠️ 句子資料載入失敗\n\n請檢查網路連線後重試。');
                    hideAllPanels();
                    document.getElementById('flashcardTypePanel').style.display = 'block';
                });
        } else {
            const dataSource = window.sentenceData || sentenceData;
            if (!dataSource || dataSource.length === 0) {
                alert('⚠️ 句子資料尚未載入\n\n請先進入「句子測驗」頁面載入資料，或重新整理頁面。');
                hideAllPanels();
                document.getElementById('flashcardTypePanel').style.display = 'block';
            } else {
                console.log(`✅ 使用已載入的句子資料：${dataSource.length} 筆`);
                buildFlashcardFilters(type);
            }
        }
    } 
    // 🔧 單字字卡：檢查資料
    else {
        const dataSource = window.wordsData || wordsData;
        if (!dataSource || dataSource.length === 0) {
            alert('⚠️ 單字資料尚未載入完成\n\n請稍候 2-3 秒後再試。');
            hideAllPanels();
            document.getElementById('flashcardTypePanel').style.display = 'block';
        } else {
            console.log(`✅ 單字字卡類型已選擇，資料筆數：${dataSource.length}`);
            buildFlashcardFilters(type);
        }
    }
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

    // 🔧 新增：檢查資料是否已載入
    const dataSource = type === 'word' ? window.wordsData : window.sentenceData;
    const dataName = type === 'word' ? 'wordsData' : 'sentenceData';
    
    if (!dataSource || dataSource.length === 0) {
        const warningMsg = `
            <div style="padding: 1rem; background: #fff3cd; border-radius: 8px; color: #856404; margin: 1rem 0;">
                <strong>⚠️ 資料尚未載入</strong><br>
                <small>請稍候 2-3 秒讓資料從伺服器載入完成，然後重新選擇字卡類型。</small>
            </div>
        `;
        [levelEl, categoryEl, specialEl].forEach(el => { 
            if (el) el.innerHTML = warningMsg; 
        });
        console.warn(`❌ ${dataName} 尚未載入或為空陣列`);
        return;
    }

    console.log(`✅ 正在建構 ${type} 字卡篩選器，資料筆數：${dataSource.length}`);

    // === 難易度按鈕 ===
    const standardLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

    if (type === 'word') {
        const usedLevels = new Set((window.wordsData || []).map(w => w['等級'] || '未分類'));
        const levels = standardLevels.filter(l => usedLevels.has(l));
        if (usedLevels.has('未分類')) levels.push('未分類');
        levelEl.innerHTML = levels.map(l =>
            `<button class="category-button" onclick="fcToggleFilter('levels','${l}',this)">${l}</button>`
        ).join('');
    } else {
        const usedLevels = new Set((window.sentenceData || []).map(s => s['等級'] || '未分類'));
        const levels = standardLevels.filter(l => usedLevels.has(l));
        if (usedLevels.has('未分類')) levels.push('未分類');
        levelEl.innerHTML = levels.map(l =>
            `<button class="category-button" onclick="fcToggleFilter('levels','${l}',this)">${l}</button>`
        ).join('');
    }

    // === 主題大類按鈕 ===
    if (type === 'word') {
        const cats = [...new Set((window.wordsData || []).map(w => (w['分類'] && w['分類'][0]) || '未分類').filter(Boolean))];
        categoryEl.innerHTML = cats.map(c =>
            `<button class="category-button" onclick="fcToggleFilter('categories','${c}',this)">${c}</button>`
        ).join('');
    } else {
        const cats = [...new Set((window.sentenceData || []).map(s => s.primaryCategory).filter(Boolean))];
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
        ? (window.wordsData || [])
        : (window.sentenceData || []);

    // 🔧 改進的資料檢查邏輯，提供更明確的錯誤訊息
    if (!pool || pool.length === 0) {
        if (fcType === 'word') {
            // 檢查 wordsData 是否已定義但為空
            if (typeof window.wordsData === 'undefined') {
                alert('⚠️ 單字資料模組尚未載入\n\n原因：quiz.js 可能尚未正確載入\n解決方法：請重新整理頁面後再試');
                console.error('❌ wordsData 未定義 - quiz.js 可能未載入');
            } else if (window.wordsData.length === 0) {
                alert('⚠️ 單字資料尚未從伺服器載入完成\n\n請稍候 2-3 秒後再點擊「開始練習」\n\n如果問題持續，請檢查：\n1. 網路連線是否正常\n2. 瀏覽器控制台是否有錯誤訊息');
                console.error('❌ wordsData 長度為 0 - 資料尚未從 GitHub 載入');
            } else {
                alert('⚠️ 無法取得單字資料，請重新整理頁面');
                console.error('❌ 無法取得 wordsData');
            }
        } else {
            // 句子字卡
            if (typeof window.sentenceData === 'undefined') {
                alert('⚠️ 句子資料模組尚未載入\n\n原因：q_sentence.js 可能尚未正確載入\n解決方法：請重新整理頁面後再試');
                console.error('❌ sentenceData 未定義 - q_sentence.js 可能未載入');
            } else if (window.sentenceData.length === 0) {
                alert('⚠️ 句子資料尚未從伺服器載入完成\n\n請稍候 2-3 秒後再點擊「開始練習」\n\n如果問題持續，請檢查：\n1. 網路連線是否正常\n2. 瀏覽器控制台是否有錯誤訊息');
                console.error('❌ sentenceData 長度為 0 - 資料尚未從 GitHub 載入');
            } else {
                alert('⚠️ 無法取得句子資料，請重新整理頁面');
                console.error('❌ 無法取得 sentenceData');
            }
        }
        return;
    }

    console.log(`✅ 字卡資料已就緒：${pool.length} 個${fcType === 'word' ? '單字' : '句子'}`);


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
    // 新增「不確定」狀態的考量，讓系統更智慧地安排複習頻率
    function priorityScore(item) {
        const id   = item.Words;
        const hist = fcHistory[id] || { 
            seen: 0, 
            known: 0, 
            uncertain: 0, 
            unknown: 0, 
            streak: 0 
        };
        
        // 從未見過 → 最高優先
        if (hist.seen === 0) return 0;
        
        // 計算答對率和不確定率
        const total = hist.known + hist.uncertain + hist.unknown;
        if (total === 0) return 0;
        
        const knownRate = hist.known / total;
        const uncertainRate = hist.uncertain / total;
        const unknownRate = hist.unknown / total;
        
        // 🔴 優先級 1：一直記不住（答錯率 > 50%）
        if (unknownRate > 0.5 && hist.unknown >= 2) return 1;
        
        // 🟠 優先級 2：不穩定（不確定率 > 40% 或答錯率 30-50%）
        if (uncertainRate > 0.4 || (unknownRate >= 0.3 && unknownRate <= 0.5)) return 2;
        
        // 🟡 優先級 3：最近才記住，需要鞏固（連續正確 1-2 次）
        if (hist.streak >= 1 && hist.streak <= 2) return 3;
        
        // 🟢 優先級 4：相對穩定（答對率 > 60%，但未完全熟練）
        if (knownRate > 0.6 && hist.streak < 5) return 4;
        
        // 🔵 優先級 5：已熟練（連續正確 5 次以上）
        if (hist.streak >= 5) return 5;
        
        // 預設：一般優先級
        return 3;
    }

    // Fisher-Yates 洗牌後依優先級排序
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    pool.sort((a, b) => priorityScore(a) - priorityScore(b));

    // 智慧配分：根據優先級分配卡片比例
    // 高優先（0-2）：70%
    // 中優先（3-4）：25%
    // 低優先（5+）：5%
    const highPriority = pool.filter(item => priorityScore(item) <= 2);
    const midPriority  = pool.filter(item => priorityScore(item) >= 3 && priorityScore(item) <= 4);
    const lowPriority  = pool.filter(item => priorityScore(item) >= 5);
    
    const highCount = Math.min(Math.ceil(fcCount * 0.7), highPriority.length);
    const midCount  = Math.min(Math.ceil(fcCount * 0.25), midPriority.length);
    const lowCount  = Math.min(fcCount - highCount - midCount, lowPriority.length);
    
    const combined = [
        ...highPriority.slice(0, highCount), 
        ...midPriority.slice(0, midCount),
        ...lowPriority.slice(0, lowCount)
    ];

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
        // status: 0=再練習, 1=不確定, 2=記得
        let dotClass = 'fc-dot ';
        if (result.status === 2) {
            dotClass += 'fc-dot-known';
        } else if (result.status === 1) {
            dotClass += 'fc-dot-uncertain';
        } else {
            dotClass += 'fc-dot-unknown';
        }
        return `<span class="${dotClass}"></span>`;
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
//  評分：記得 / 不確定 / 再練習
// ─────────────────────────────────────────
function fcMarkKnown(status) {
    // status: 0=再練習, 1=不確定, 2=記得
    const item = fcDeck[fcIndex];
    if (!item) return;

    const id   = item.Words;
    const hist = fcHistory[id] || { seen: 0, known: 0, uncertain: 0, unknown: 0, streak: 0, lastSeen: null };

    hist.seen++;
    hist.lastSeen = new Date().toISOString().split('T')[0];

    if (status === 2) {
        // 記得
        hist.known++;
        hist.streak = (hist.streak || 0) + 1;
    } else if (status === 1) {
        // 不確定
        hist.uncertain = (hist.uncertain || 0) + 1;
        hist.streak = Math.max(0, (hist.streak || 0) - 1); // 稍微降低連續記錄
    } else {
        // 再練習
        hist.unknown++;
        hist.streak = 0;
    }

    fcHistory[id] = hist;
    fcResults.push({ id, item, status });

    // 立即更新這一顆圓點
    updateDot(fcIndex, status);

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

function updateDot(index, status) {
    // status: 0=再練習, 1=不確定, 2=記得
    const dots = document.querySelectorAll('.fc-dot');
    if (dots[index]) {
        let className = 'fc-dot ';
        if (status === 2) {
            className += 'fc-dot-known';
        } else if (status === 1) {
            className += 'fc-dot-uncertain';
        } else {
            className += 'fc-dot-unknown';
        }
        dots[index].className = className;
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

    const knownItems     = fcResults.filter(r => r.status === 2); // 記得
    const uncertainItems = fcResults.filter(r => r.status === 1); // 不確定
    const unknownItems   = fcResults.filter(r => r.status === 0); // 再練習

    const knownCount     = knownItems.length;
    const uncertainCount = uncertainItems.length;
    const unknownCount   = unknownItems.length;
    const total          = fcResults.length;
    const pct            = total > 0 ? Math.round((knownCount / total) * 100) : 0;

    // 評語
    let comment = '';
    if (pct === 100)      comment = '🏆 完美！全部記住了！';
    else if (pct >= 80)   comment = '🎉 非常好！幾乎全部記住了！';
    else if (pct >= 60)   comment = '👍 不錯！繼續加油！';
    else if (pct >= 40)   comment = '💪 加油！多練習幾次就會記住！';
    else                  comment = '📚 還需要多加練習，別放棄！';

    document.getElementById('fc-result-comment').textContent   = comment;
    document.getElementById('fc-result-known').textContent     = knownCount;
    document.getElementById('fc-result-uncertain').textContent = uncertainCount;
    document.getElementById('fc-result-unknown').textContent   = unknownCount;
    document.getElementById('fc-result-pct').textContent       = pct + '%';

    // 列出需要複習的字（包含「再練習」和「不確定」）
    const reviewList = document.getElementById('fc-review-list');
    const needReview = [...unknownItems, ...uncertainItems];
    
    if (needReview.length === 0) {
        reviewList.innerHTML = '<p class="fc-all-good">🎊 沒有需要複習的字卡！</p>';
    } else {
        reviewList.innerHTML = needReview.map(r => {
            const item     = r.item;
            const display  = fcType === 'word' ? item.Words : item['句子'];
            const sub      = fcType === 'word'
                ? (item['traditional Chinese'] || '').split('\n')[0]
                : (item['中文'] || '');
            const cleanDisp = display ? display.replace(/\s*\[=[^\]]+\]/g, '').trim() : '';
            const statusIcon = r.status === 1 ? '❓' : '❌';
            return `
                <div class="fc-review-item">
                    <span style="font-size: 1.2rem; margin-right: 8px;">${statusIcon}</span>
                    <div class="fc-review-main">${cleanDisp}</div>
                    <div class="fc-review-sub">${sub}</div>
                    <button class="fc-audio-btn" onclick="fcPlayItemAudio('${item.Words}')">🔊</button>
                </div>
            `;
        }).join('');
    }

    // 控制「再練習答錯的」按鈕（包含不確定和答錯的）
    const retryBtn = document.getElementById('fc-retry-wrong-btn');
    if (retryBtn) retryBtn.style.display = needReview.length > 0 ? 'inline-flex' : 'none';

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
    // 只練習答錯的和不確定的（status 0 或 1）
    const wrongItems = fcResults.filter(r => r.status === 0 || r.status === 1).map(r => r.item);
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
        'flashcardArea', 'flashcardResultPanel', 'flashcardManagerPanel'
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
    // 翻牌後的評分快捷鍵
    if (isFlipped) {
        if (e.code === 'ArrowLeft') {
            e.preventDefault();
            fcMarkKnown(0); // 再練習
        }
        if (e.code === 'ArrowDown') {
            e.preventDefault();
            fcMarkKnown(1); // 不確定
        }
        if (e.code === 'ArrowRight') {
            e.preventDefault();
            fcMarkKnown(2); // 記得
        }
    }
});

// ═════════════════════════════════════════════════════════════
//  ⚙️ 記憶度管理功能
// ═════════════════════════════════════════════════════════════

let fcMgrCurrentType = 'word'; // 'word' | 'sentence'
let fcMgrAllData = [];
let fcMgrFilteredData = [];
let fcMgrActiveCategory = 'all'; // 'all' | 'practiced' | 'mastered' | 'struggling'

// ─────────────────────────────────────────
//  開啟管理介面
// ─────────────────────────────────────────
function openFlashcardManager() {
    hideAllPanels();
    document.getElementById('flashcardManagerPanel').style.display = 'block';
    updateBreadcrumb(['選擇功能', '測驗中心', '字卡練習', '記憶度管理']);
    
    fcMgrCurrentType = 'word';
    fcMgrActiveCategory = 'all';
    fcMgrLoadData();
}

function fcCloseManager() {
    hideAllPanels();
    document.getElementById('flashcardTypePanel').style.display = 'block';
    updateBreadcrumb(['選擇功能', '測驗中心', '字卡練習']);
}

// ─────────────────────────────────────────
//  切換類型（單字/句子）
// ─────────────────────────────────────────
function fcMgrSwitchType(type) {
    fcMgrCurrentType = type;
    fcMgrActiveCategory = 'all'; // 切換類型時重置篩選
    
    // 更新標籤樣式
    document.getElementById('mgr-word-tab').classList.toggle('active', type === 'word');
    document.getElementById('mgr-sentence-tab').classList.toggle('active', type === 'sentence');
    
    fcMgrLoadData();
}

// ─────────────────────────────────────────
//  載入資料
// ─────────────────────────────────────────
function fcMgrLoadData() {
    // 取得所有字卡資料
    const sourceData = fcMgrCurrentType === 'word' ? (window.wordsData || []) : (window.sentenceData || []);
    
    // 取得歷史記錄
    const vocab = window.getVocabularyData ? window.getVocabularyData() : {};
    const history = (vocab.flashcardHistory && vocab.flashcardHistory[fcMgrCurrentType]) || {};
    
    // 合併資料和歷史記錄
    fcMgrAllData = sourceData.map(item => {
        const id = fcMgrCurrentType === 'word' ? item.Words : item.Words;
        const hist = history[id] || {
            seen: 0,
            known: 0,
            uncertain: 0,
            unknown: 0,
            streak: 0,
            lastSeen: null
        };
        
        return {
            id,
            item,
            history: hist,
            priority: fcMgrCalculatePriority(hist)
        };
    });
    
    fcMgrFilterData();
}

// ─────────────────────────────────────────
//  計算優先級（與 startFlashcardSession 中的邏輯一致）
// ─────────────────────────────────────────
function fcMgrCalculatePriority(hist) {
    if (hist.seen === 0) return 0;
    
    const total = hist.known + hist.uncertain + hist.unknown;
    if (total === 0) return 0;
    
    const knownRate = hist.known / total;
    const uncertainRate = hist.uncertain / total;
    const unknownRate = hist.unknown / total;
    
    if (unknownRate > 0.5 && hist.unknown >= 2) return 1;
    if (uncertainRate > 0.4 || (unknownRate >= 0.3 && unknownRate <= 0.5)) return 2;
    if (hist.streak >= 1 && hist.streak <= 2) return 3;
    if (knownRate > 0.6 && hist.streak < 5) return 4;
    if (hist.streak >= 5) return 5;
    
    return 3;
}

// ─────────────────────────────────────────
//  篩選和排序資料
// ─────────────────────────────────────────
function fcMgrFilterData() {
    const searchText = document.getElementById('fc-mgr-search').value.toLowerCase().trim();
    const sortBy = document.getElementById('fc-mgr-sort').value;
    
    // 第一步：根據分類篩選
    let categoryFiltered = fcMgrAllData;
    
    switch (fcMgrActiveCategory) {
        case 'practiced':
            categoryFiltered = fcMgrAllData.filter(d => d.history.seen > 0);
            break;
        case 'mastered':
            categoryFiltered = fcMgrAllData.filter(d => d.priority === 5);
            break;
        case 'struggling':
            categoryFiltered = fcMgrAllData.filter(d => d.priority <= 2 && d.history.seen > 0);
            break;
        case 'all':
        default:
            categoryFiltered = fcMgrAllData;
            break;
    }
    
    // 第二步：根據搜尋文字篩選
    fcMgrFilteredData = categoryFiltered.filter(data => {
        if (!searchText) return true;
        
        const name = fcMgrCurrentType === 'word' 
            ? data.item.Words || ''
            : data.item['句子'] || '';
        const chinese = fcMgrCurrentType === 'word'
            ? data.item['traditional Chinese'] || ''
            : data.item['中文'] || '';
            
        return name.toLowerCase().includes(searchText) || 
               chinese.toLowerCase().includes(searchText);
    });
    
    // 第三步：排序
    fcMgrFilteredData.sort((a, b) => {
        switch (sortBy) {
            case 'priority':
                return a.priority - b.priority;
            case 'name':
                const nameA = fcMgrCurrentType === 'word' ? a.item.Words : a.item['句子'];
                const nameB = fcMgrCurrentType === 'word' ? b.item.Words : b.item['句子'];
                return (nameA || '').localeCompare(nameB || '');
            case 'seen-desc':
                return b.history.seen - a.history.seen;
            case 'seen-asc':
                return a.history.seen - b.history.seen;
            case 'rate-desc':
                return fcMgrGetRate(b.history) - fcMgrGetRate(a.history);
            case 'rate-asc':
                return fcMgrGetRate(a.history) - fcMgrGetRate(b.history);
            default:
                return 0;
        }
    });
    
    fcMgrRenderData();
}

function fcMgrGetRate(hist) {
    const total = hist.known + hist.uncertain + hist.unknown;
    return total > 0 ? (hist.known / total) : 0;
}

// ─────────────────────────────────────────
//  渲染資料
// ─────────────────────────────────────────
function fcMgrRenderData() {
    const listEl = document.getElementById('fc-mgr-list');
    
    // 更新統計
    const total = fcMgrAllData.length;
    const practiced = fcMgrAllData.filter(d => d.history.seen > 0).length;
    const mastered = fcMgrAllData.filter(d => d.priority === 5).length;
    const struggling = fcMgrAllData.filter(d => d.priority <= 2 && d.history.seen > 0).length;
    
    document.getElementById('mgr-total').textContent = total;
    document.getElementById('mgr-practiced').textContent = practiced;
    document.getElementById('mgr-mastered').textContent = mastered;
    document.getElementById('mgr-struggling').textContent = struggling;
    
    // 更新統計卡片的 active 狀態
    document.querySelectorAll('.fc-mgr-stat').forEach((btn, index) => {
        const categories = ['all', 'practiced', 'mastered', 'struggling'];
        btn.classList.toggle('active', fcMgrActiveCategory === categories[index]);
    });
    
    // 更新篩選提示
    const filterHint = document.getElementById('fc-mgr-filter-hint');
    const filterText = document.querySelector('.fc-mgr-filter-text');
    
    if (fcMgrActiveCategory !== 'all') {
        const categoryLabels = {
            'practiced': `顯示已練習的字卡（${fcMgrFilteredData.length} 張）`,
            'mastered': `顯示已熟練的字卡（${fcMgrFilteredData.length} 張）`,
            'struggling': `顯示需加強的字卡（${fcMgrFilteredData.length} 張）`
        };
        filterText.textContent = categoryLabels[fcMgrActiveCategory] || '';
        filterHint.style.display = 'flex';
    } else {
        filterHint.style.display = 'none';
    }
    
    // 渲染列表
    if (fcMgrFilteredData.length === 0) {
        const categoryLabels = {
            'all': '所有字卡',
            'practiced': '已練習的字卡',
            'mastered': '已熟練的字卡',
            'struggling': '需加強的字卡'
        };
        const label = categoryLabels[fcMgrActiveCategory] || '符合條件的資料';
        listEl.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--color-text-light);">沒有${label}</div>`;
        return;
    }
    
    listEl.innerHTML = fcMgrFilteredData.map(data => {
        const hist = data.history;
        const item = data.item;
        const name = fcMgrCurrentType === 'word' ? item.Words : item['句子'];
        const chinese = fcMgrCurrentType === 'word'
            ? (item['traditional Chinese'] || '').split('\n')[0]
            : item['中文'] || '';
        const cleanName = name ? name.replace(/\s*\[=[^\]]+\]/g, '').trim() : '';
        
        const total = hist.known + hist.uncertain + hist.unknown;
        const rate = total > 0 ? Math.round((hist.known / total) * 100) : 0;
        
        const priorityLabels = ['新', '弱', '不穩', '鞏固', '穩定', '熟練'];
        const priorityLabel = priorityLabels[data.priority] || '新';
        
        return `
            <div class="fc-mgr-item">
                <div class="fc-mgr-item-info">
                    <div class="fc-mgr-item-name">
                        <span class="fc-mgr-priority-badge fc-mgr-priority-${data.priority}">${priorityLabel}</span>
                        <span>${cleanName}</span>
                    </div>
                    <div class="fc-mgr-item-sub">${chinese}</div>
                    <div class="fc-mgr-item-stats">
                        <span class="fc-mgr-stat-mini">練習：<strong>${hist.seen}</strong> 次</span>
                        <span class="fc-mgr-stat-mini">記得：<strong>${hist.known}</strong></span>
                        <span class="fc-mgr-stat-mini">不確定：<strong>${hist.uncertain || 0}</strong></span>
                        <span class="fc-mgr-stat-mini">再練習：<strong>${hist.unknown}</strong></span>
                        <span class="fc-mgr-stat-mini">連續：<strong>${hist.streak}</strong></span>
                        <span class="fc-mgr-stat-mini">正確率：<strong>${rate}%</strong></span>
                    </div>
                </div>
                <div class="fc-mgr-item-actions">
                    <button class="fc-mgr-btn" onclick='fcMgrEditItem(${JSON.stringify(data.id)})'>
                        ✏️ 編輯
                    </button>
                    <button class="fc-mgr-btn fc-mgr-btn-danger" onclick='fcMgrResetItem(${JSON.stringify(data.id)})'>
                        🔄 重置
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// ─────────────────────────────────────────
//  編輯單一項目
// ─────────────────────────────────────────
function fcMgrEditItem(id) {
    const data = fcMgrAllData.find(d => d.id === id);
    if (!data) return;
    
    const hist = data.history;
    const item = data.item;
    const name = fcMgrCurrentType === 'word' ? item.Words : item['句子'];
    
    // 建立模態框
    const modal = document.createElement('div');
    modal.className = 'fc-mgr-modal';
    modal.innerHTML = `
        <div class="fc-mgr-modal-content">
            <div class="fc-mgr-modal-header">編輯記憶度記錄</div>
            
            <div class="fc-mgr-form-group">
                <div class="fc-mgr-form-label">字卡名稱</div>
                <div style="padding: var(--spacing-sm); background: var(--color-bg); border-radius: var(--radius-md); font-weight: 600;">
                    ${name}
                </div>
            </div>
            
            <div class="fc-mgr-form-group">
                <label class="fc-mgr-form-label">已練習次數</label>
                <input type="number" id="edit-seen" class="fc-mgr-form-input" value="${hist.seen}" min="0">
                <div class="fc-mgr-form-hint">總共練習了幾次</div>
            </div>
            
            <div class="fc-mgr-form-group">
                <label class="fc-mgr-form-label">記得次數 ✅</label>
                <input type="number" id="edit-known" class="fc-mgr-form-input" value="${hist.known}" min="0">
            </div>
            
            <div class="fc-mgr-form-group">
                <label class="fc-mgr-form-label">不確定次數 ❓</label>
                <input type="number" id="edit-uncertain" class="fc-mgr-form-input" value="${hist.uncertain || 0}" min="0">
            </div>
            
            <div class="fc-mgr-form-group">
                <label class="fc-mgr-form-label">再練習次數 ❌</label>
                <input type="number" id="edit-unknown" class="fc-mgr-form-input" value="${hist.unknown}" min="0">
            </div>
            
            <div class="fc-mgr-form-group">
                <label class="fc-mgr-form-label">連續答對次數</label>
                <input type="number" id="edit-streak" class="fc-mgr-form-input" value="${hist.streak}" min="0">
                <div class="fc-mgr-form-hint">連續答對的次數（影響優先級）</div>
            </div>
            
            <div class="fc-mgr-modal-actions">
                <button class="control-button" onclick="this.closest('.fc-mgr-modal').remove()">
                    取消
                </button>
                <button class="control-button primary" onclick="fcMgrSaveEdit('${id}')">
                    儲存
                </button>
            </div>
        </div>
    `;
    
    // 點擊背景關閉
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
    
    document.body.appendChild(modal);
}

function fcMgrSaveEdit(id) {
    const seen = parseInt(document.getElementById('edit-seen').value) || 0;
    const known = parseInt(document.getElementById('edit-known').value) || 0;
    const uncertain = parseInt(document.getElementById('edit-uncertain').value) || 0;
    const unknown = parseInt(document.getElementById('edit-unknown').value) || 0;
    const streak = parseInt(document.getElementById('edit-streak').value) || 0;
    
    // 更新資料
    const vocab = window.getVocabularyData();
    if (!vocab.flashcardHistory) vocab.flashcardHistory = {};
    if (!vocab.flashcardHistory[fcMgrCurrentType]) vocab.flashcardHistory[fcMgrCurrentType] = {};
    
    vocab.flashcardHistory[fcMgrCurrentType][id] = {
        seen,
        known,
        uncertain,
        unknown,
        streak,
        lastSeen: new Date().toISOString().split('T')[0]
    };
    
    window.persistVocabularyData();
    
    // 關閉模態框並重新載入（保持當前篩選）
    document.querySelector('.fc-mgr-modal').remove();
    const currentCategory = fcMgrActiveCategory; // 保存當前篩選
    fcMgrLoadData();
    fcMgrActiveCategory = currentCategory; // 恢復篩選
    fcMgrFilterData();
    
    showToast('✅ 已儲存變更', 'success');
}

// ─────────────────────────────────────────
//  重置單一項目
// ─────────────────────────────────────────
function fcMgrResetItem(id) {
    if (!confirm('確定要重置此字卡的所有記錄嗎？')) return;
    
    const vocab = window.getVocabularyData();
    if (vocab.flashcardHistory && vocab.flashcardHistory[fcMgrCurrentType]) {
        delete vocab.flashcardHistory[fcMgrCurrentType][id];
        window.persistVocabularyData();
    }
    
    const currentCategory = fcMgrActiveCategory; // 保存當前篩選
    fcMgrLoadData();
    fcMgrActiveCategory = currentCategory; // 恢復篩選
    fcMgrFilterData();
    
    showToast('✅ 已重置記錄', 'success');
}

// ─────────────────────────────────────────
//  重置所有記錄
// ─────────────────────────────────────────
function fcMgrResetAll() {
    const typeLabel = fcMgrCurrentType === 'word' ? '單字' : '句子';
    if (!confirm(`確定要重置所有${typeLabel}字卡的記錄嗎？此操作無法復原！`)) return;
    
    const vocab = window.getVocabularyData();
    if (vocab.flashcardHistory) {
        vocab.flashcardHistory[fcMgrCurrentType] = {};
        window.persistVocabularyData();
    }
    
    fcMgrLoadData();
    showToast('✅ 已重置所有記錄', 'success');
}

// ─────────────────────────────────────────
//  匯出資料
// ─────────────────────────────────────────
function fcMgrExportData() {
    const vocab = window.getVocabularyData();
    const history = (vocab.flashcardHistory && vocab.flashcardHistory[fcMgrCurrentType]) || {};
    
    const exportData = fcMgrAllData.map(data => {
        const item = data.item;
        const hist = data.history;
        const total = hist.known + hist.uncertain + hist.unknown;
        const rate = total > 0 ? Math.round((hist.known / total) * 100) : 0;
        
        return {
            名稱: fcMgrCurrentType === 'word' ? item.Words : item['句子'],
            中文: fcMgrCurrentType === 'word' ? item['traditional Chinese'] : item['中文'],
            優先級: data.priority,
            已練習: hist.seen,
            記得: hist.known,
            不確定: hist.uncertain || 0,
            再練習: hist.unknown,
            連續答對: hist.streak,
            正確率: rate + '%',
            最後練習: hist.lastSeen || '未練習'
        };
    });
    
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `字卡記憶度_${fcMgrCurrentType}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('✅ 已匯出資料', 'success');
}

// ─────────────────────────────────────────
//  點擊統計卡片進行分類篩選
// ─────────────────────────────────────────
function fcMgrFilterByCategory(category) {
    fcMgrActiveCategory = category;
    
    // 重置搜尋框（可選）
    // document.getElementById('fc-mgr-search').value = '';
    
    fcMgrFilterData();
}
