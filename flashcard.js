/**
 * flashcard.js
 * 字卡練習模組 — 單字字卡 & 句子字卡
 * 依賴：wordsData (quiz.js), sentenceData (q_sentence.js),
 * window.getVocabularyData(), window.persistVocabularyData()
 */

console.log("✅ flashcard.js loaded (FIXED VERSION)");

// ─────────────────────────────────────────
//  工具函數
// ─────────────────────────────────────────

// 初始化全域物件（如果不存在）
window.quizEnhancements = window.quizEnhancements || {
    breadcrumbPath: [],
    currentQuizType: null
};

// 隱藏所有面板
function hideAllPanels() {
    const panels = [
        'quizCategories',
        'sentenceQuizCategories', 
        'quizArea',
        'sentenceQuizArea',
        'rewordQuizArea',
        'reorganizeQuizArea',
        'quizResult',
        'flashcardTypePanel',
        'flashcardSetupPanel',
        'flashcardArea',
        'flashcardResultPanel',
        'flashcardManagerPanel'
    ];
    
    panels.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    
    // 隱藏測驗類型選擇器
    const quizTypeSelector = document.querySelector('.quiz-type-selector');
    if (quizTypeSelector) quizTypeSelector.style.display = 'none';
}

// 更新麵包屑導航
function updateBreadcrumb(path) {
    if (path) {
        window.quizEnhancements.breadcrumbPath = path;
    }
    
    const breadcrumbNav = document.getElementById('breadcrumb-nav');
    const breadcrumbContent = breadcrumbNav?.querySelector('.breadcrumb-content');
    if (!breadcrumbNav || !breadcrumbContent) return;
    
    if (!window.quizEnhancements.breadcrumbPath || window.quizEnhancements.breadcrumbPath.length === 0) {
        breadcrumbNav.classList.remove('visible');
        return;
    }
    
    breadcrumbNav.classList.add('visible');
    breadcrumbContent.innerHTML = window.quizEnhancements.breadcrumbPath.map((item, index) => {
        const isLast = index === window.quizEnhancements.breadcrumbPath.length - 1;
        let onclickAction = '';
        
        if (index === 0) {
            onclickAction = 'backToMenu()';
        } else if (index === 1) {
            onclickAction = 'backToQuizSelection()';
        } else if (index === 2) {
            onclickAction = 'fcBackToTypeSelection()';
        } else if (index === 3) {
            onclickAction = 'fcBackToSetup()';
        }
        
        return `<span class="breadcrumb-item ${isLast ? 'current' : ''}" onclick="${onclickAction}">${item}</span>${!isLast ? '<span class="breadcrumb-separator">›</span>' : ''}`;
    }).join('');
}

// 返回主選單
function backToMenu() {
    window.location.href = 'index.html';
}

// 返回測驗選擇
function backToQuizSelection() {
    hideAllPanels();
    const quizTypeSelector = document.querySelector('.quiz-type-selector');
    if (quizTypeSelector) quizTypeSelector.style.display = 'grid';
    
    const header = document.querySelector('.page-title');
    if (header) header.textContent = '測驗區';
    
    updateBreadcrumb(['選擇功能', '測驗中心']);
}

// 字卡返回主選單（別名）
function fcBackToMenu() {
    backToQuizSelection();
}

// 開啟字卡記憶度管理
function openFlashcardManager() {
    navigateToFlashcardManager();
}

// ─────────────────────────────────────────
//  狀態變數
// ─────────────────────────────────────────
let fcType         = null;   // 'word' | 'sentence'
let fcDeck         = [];     // 本次練習的牌組
let fcIndex        = 0;      // 目前是第幾張(0-based)
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
    // 🔧 檢查基礎資料是否已載入
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
                    // 確保 window.sentenceData 已同步
                    if (!window.sentenceData && sentenceData) window.sentenceData = sentenceData;
                    console.log(`✅ 句子資料已就緒：${window.sentenceData.length} 筆`);
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

    // 🔧 檢查資料是否已載入
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

    // 取得所有資料中的等級
    const usedLevels = new Set(dataSource.map(item => item['等級'] || '未分類'));
    const levels = standardLevels.filter(l => usedLevels.has(l));
    if (usedLevels.has('未分類')) levels.push('未分類');
    
    levelEl.innerHTML = levels.map(l =>
        `<button class="category-button" onclick="fcToggleFilter('levels','${l}',this)">${l}</button>`
    ).join('');

    // === 主題大類按鈕 (主要修正點) ===
    let cats = [];
    if (type === 'word') {
        cats = [...new Set(dataSource.map(w => (w['分類'] && w['分類'][0]) || '未分類').filter(Boolean))];
    } else {
        // 🔧 修正：句子資料分類讀取邏輯
        // 優先讀取 ['分類'][0] (q_sentence.js 處理過的陣列)，其次讀取 '分類1' (原始 JSON)
        cats = [...new Set(dataSource.map(s => {
            if (s['分類'] && Array.isArray(s['分類']) && s['分類'].length > 0) {
                return s['分類'][0];
            }
            return s['分類1'] || '未分類';
        }).filter(Boolean))];
    }

    // 排序並過濾掉空值
    cats = cats.filter(c => c !== '未分類').sort();
    // 確保有未分類選項
    if (dataSource.some(d => !d['分類'] && !d['分類1'])) {
       // cats.push('未分類'); // 視需求決定是否顯示未分類按鈕
    }

    if (cats.length === 0) {
        categoryEl.innerHTML = '<span style="color: #666; font-size: 0.9em;">無分類資料</span>';
    } else {
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
//  開始字卡練習
// ─────────────────────────────────────────
function startFlashcardPractice() {
    const dataSource = fcType === 'word' ? window.wordsData : window.sentenceData;
    if (!dataSource || dataSource.length === 0) {
        alert('資料尚未載入完成，請稍後再試。');
        return;
    }

    // 取得 vocabularyData
    const vocab = window.getVocabularyData();
    if (!vocab.flashcardHistory) vocab.flashcardHistory = {};
    if (!vocab.flashcardHistory[fcType]) vocab.flashcardHistory[fcType] = {};
    fcHistory = vocab.flashcardHistory[fcType];

    // 1️⃣ 先根據 level / category 篩選
    let filtered = dataSource;
    if (fcFilters.levels.size > 0) {
        filtered = filtered.filter(d => fcFilters.levels.has(d['等級']));
    }
    if (fcFilters.categories.size > 0) {
        filtered = filtered.filter(d => {
            const cats = d['分類'];
            if (!cats) return false;
            if (Array.isArray(cats)) {
                return cats.some(c => fcFilters.categories.has(c));
            } else {
                return fcFilters.categories.has(cats);
            }
        });
    }

    // 2️⃣ 特殊條件（重要 / 答錯 / 從未練過）
    if (fcFilters.special.has('important')) {
        if (fcType === 'word') {
            const importantWords = new Set(vocab.importantWords || []);
            filtered = filtered.filter(d => importantWords.has(d.Words));
        } else {
            const importantSentences = new Set(vocab.importantSentences || []);
            filtered = filtered.filter(d => importantSentences.has(d['句子']));
        }
    }
    if (fcFilters.special.has('wrong')) {
        if (fcType === 'word') {
            const wrongWords = new Set(vocab.wrongWords || []);
            filtered = filtered.filter(d => wrongWords.has(d.Words));
        } else {
            // 句子沒有 wrongSentences，可以從 quizHistory 中獲取
            const wrongSentences = new Set();
            const quizHist = vocab.quizHistory?.sentence || {};
            for (const [key, val] of Object.entries(quizHist)) {
                if (val.wrong > 0) wrongSentences.add(key);
            }
            filtered = filtered.filter(d => wrongSentences.has(d['句子']));
        }
    }
    if (fcFilters.special.has('unseen')) {
        filtered = filtered.filter(d => {
            const id = d.Words || d['句子'];
            return !fcHistory[id] || fcHistory[id].seen === 0;
        });
    }

    // 3️⃣ 建立優先級（越不熟悉的越優先）
    const prioritized = filtered.map(item => {
        const id   = item.Words || item['句子'];
        const hist = fcHistory[id] || { seen: 0, known: 0, uncertain: 0, unknown: 0, streak: 0 };

        // 計算優先級（priority 越高越優先）
        let priority = 100;
        
        // 從未見過優先
        if (hist.seen === 0) priority += 50;

        // 連續答對降低優先（很熟悉了）
        priority -= hist.streak * 5;

        // 答錯次數提高優先
        priority += hist.unknown * 10;

        // 不確定也稍微提高
        priority += (hist.uncertain || 0) * 3;

        // 正確率低優先
        const total = hist.known + hist.uncertain + hist.unknown;
        if (total > 0) {
            const acc = hist.known / total;
            priority += (1 - acc) * 20;
        }

        return { item, priority, id };
    });

    prioritized.sort((a, b) => b.priority - a.priority);

    // 4️⃣ 根據優先級挑選牌組（高優先 70% + 低優先 30% 混合）
    const highCount = Math.ceil(fcCount * 0.7);
    const lowCount  = fcCount - highCount;
    const highPriority = prioritized.slice(0, prioritized.length / 2);
    const lowPriority  = prioritized.slice(prioritized.length / 2);

    const combined = [
        ...highPriority.slice(0, highCount),
        ...lowPriority.slice(0, lowCount)
    ];

    // 再次洗牌，讓高優先不全部集中前面
    for (let i = combined.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [combined[i], combined[j]] = [combined[j], combined[i]];
    }

    fcDeck   = combined.map(c => c.item);
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

        // ✅ 修正：背面音標點擊只播放，不翻卡
        backEl.innerHTML = `
            <div class="fc-tags">
                ${level    ? `<span class="fc-tag fc-tag-level">${level}</span>` : ''}
                ${category ? `<span class="fc-tag fc-tag-cat">${category}</span>` : ''}
            </div>
            <div class="fc-word">${word}</div>
            <div class="fc-phonetics" title="點擊播放發音" onclick="event.stopPropagation(); fcPlayAudio()">
                ${phonetics ? `🔊 ${phonetics}` : '🔊 播放'}
            </div>
            <div class="fc-chinese">${chinese.replace(/\n/g, '<br>')}</div>
        `;
    } else {
        // 句子字卡
        const sentence  = item['句子'] || '';
        const chinese   = item['中文'] || '（無中文翻譯）';
        
        // 🔧 修正：渲染時正確讀取句子分類
        let category = '';
        if (item['分類'] && Array.isArray(item['分類']) && item['分類'].length > 0) {
            category = item['分類'][0];
        } else {
            category = item['分類1'] || '';
        }
        
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
                <span class="fc-hint-blanks">${'_ '.repeat(Math.max(0, restCount)).trim()}</span>
            </div>
            <div class="fc-hint-label">完成這個句子 →</div>
            <button class="fc-play-btn" onclick="event.stopPropagation(); fcPlayAudio()" title="播放發音">
                🔊 <span>播放</span>
            </button>
        `;

        // ✅ 修正：背面句子點擊只播放，不翻卡
        backEl.innerHTML = `
            <div class="fc-tags">
                ${level    ? `<span class="fc-tag fc-tag-level">${level}</span>` : ''}
                ${category ? `<span class="fc-tag fc-tag-cat">${category}</span>` : ''}
            </div>
            <div class="fc-sentence" onclick="event.stopPropagation(); fcPlayAudio()" title="點擊播放發音">
                🔊 ${cleanSent}
            </div>
            <div class="fc-divider"></div>
            <div class="fc-chinese">${chinese}</div>
        `;
    }

    // 準備音檔並自動播放
    fcPrepareAudio(item);
    
    // 🎯 自動滾動到合適位置（卡片和按鈕都可見）
    setTimeout(() => {
        const cardElement = document.querySelector('.fc-scene');
        if (cardElement) {
            cardElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
        }
    }, 100);
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
    
    // 🎯 翻牌後確保按鈕可見
    if (isFlipped) {
        setTimeout(() => {
            const cardElement = document.querySelector('.fc-scene');
            if (cardElement) {
                cardElement.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
            }
        }, 300); // 等待翻牌動畫完成
    }
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

    const id   = fcType === 'word' ? item.Words : item['句子'];
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
            const audioId = fcType === 'word' ? item.Words : item.Words;
            return `
                <div class="fc-review-item">
                    <span style="font-size: 1.2rem; margin-right: 8px;">${statusIcon}</span>
                    <div class="fc-review-main">${cleanDisp}</div>
                    <div class="fc-review-sub">${sub}</div>
                    <button class="fc-audio-btn" onclick="fcPlayItemAudio('${audioId}')">🔊</button>
                </div>
            `;
        }).join('');
    }

    // 控制「再練習答錯的」按鈕（包含不確定和答錯的）
    const retryBtn = document.getElementById('fc-retry-wrong-btn');
    if (retryBtn) retryBtn.style.display = needReview.length > 0 ? 'inline-flex' : 'none';

    updateBreadcrumb(['選擇功能', '測驗中心', '字卡練習', '練習結果']);
}

function fcPlayItemAudio(id) {
    const audioUrl = fcType === 'word'
        ? `${FC_WORD_AUDIO_BASE}${id}.mp3`
        : `${FC_SENTENCE_AUDIO_BASE}${encodeURIComponent(id)}.mp3`;
    const audio = new Audio(audioUrl);
    audio.play().catch(err => console.warn('🔊 播放失敗:', err));
}

function fcRetryWrong() {
    // 從本次結果中挑出「再練習」和「不確定」的字卡
    const needRetry = fcResults.filter(r => r.status === 0 || r.status === 1);
    if (needRetry.length === 0) {
        alert('沒有需要複習的字卡！');
        return;
    }

    fcDeck    = needRetry.map(r => r.item);
    fcIndex   = 0;
    fcResults = [];

    // 重新顯示字卡練習畫面
    hideAllPanels();
    document.getElementById('flashcardArea').style.display = 'block';
    const label = fcType === 'word' ? '單字字卡' : '句子字卡';
    updateBreadcrumb(['選擇功能', '測驗中心', '字卡練習', label, '複習']);

    renderFlashcard();
}

function fcContinuePractice() {
    // 繼續用相同的篩選條件再練一輪
    startFlashcardPractice();
}

function fcBackToSetup() {
    hideAllPanels();
    document.getElementById('flashcardSetupPanel').style.display = 'block';
    const label = fcType === 'word' ? '單字字卡' : '句子字卡';
    updateBreadcrumb(['選擇功能', '測驗中心', '字卡練習', label]);
}

function fcBackToTypeSelection() {
    hideAllPanels();
    document.getElementById('flashcardTypePanel').style.display = 'block';
    updateBreadcrumb(['選擇功能', '測驗中心', '字卡練習']);
}

// ─────────────────────────────────────────
//  記憶度管理面板
// ─────────────────────────────────────────
let fcMgrCurrentType = 'word';   // 'word' | 'sentence'
let fcMgrAllData     = [];       // 所有項目 { id, item, history, priority }
let fcMgrFiltered    = [];       // 篩選後的項目
let fcMgrActiveCategory = 'all'; // 'all', 'high', 'medium', 'low', 'mastered'

function navigateToFlashcardManager() {
    hideAllPanels();
    document.getElementById('flashcardManagerPanel').style.display = 'block';
    updateBreadcrumb(['選擇功能', '測驗中心', '字卡練習', '記憶度管理']);

    // 預設顯示單字資料
    fcMgrSelectType('word');
}

function fcMgrSelectType(type) {
    fcMgrCurrentType = type;
    
    // 🔧 修正：更新標籤按鈕狀態（使用正確的 class）
    document.querySelectorAll('.fc-mgr-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 根據類型添加 active class
    const activeTab = type === 'word' ? 
        document.getElementById('mgr-word-tab') : 
        document.getElementById('mgr-sentence-tab');
    
    if (activeTab) {
        activeTab.classList.add('active');
    }

    fcMgrLoadData();
}

function fcMgrLoadData() {
    const dataSource = fcMgrCurrentType === 'word' ? window.wordsData : window.sentenceData;
    if (!dataSource || dataSource.length === 0) {
        document.getElementById('fc-mgr-list').innerHTML = 
            '<p style="text-align: center; color: var(--color-text-secondary); padding: 2rem;">資料尚未載入</p>';
        return;
    }

    const vocab = window.getVocabularyData();
    const history = (vocab.flashcardHistory && vocab.flashcardHistory[fcMgrCurrentType]) || {};

    // 建立完整資料清單（包含優先級）
    fcMgrAllData = dataSource.map(item => {
        const id = fcMgrCurrentType === 'word' ? item.Words : item['句子'];
        const hist = history[id] || { seen: 0, known: 0, uncertain: 0, unknown: 0, streak: 0, lastSeen: null };

        // 計算優先級
        let priority = 100;
        if (hist.seen === 0) priority += 50;
        priority -= hist.streak * 5;
        priority += hist.unknown * 10;
        priority += (hist.uncertain || 0) * 3;
        const total = hist.known + hist.uncertain + hist.unknown;
        if (total > 0) {
            const acc = hist.known / total;
            priority += (1 - acc) * 20;
        }

        return { id, item, history: hist, priority };
    });

    // 根據優先級排序
    fcMgrAllData.sort((a, b) => b.priority - a.priority);

    // 計算統計數據
    fcMgrUpdateStats();

    // 渲染清單（預設顯示全部）
    fcMgrActiveCategory = 'all';
    fcMgrFilterData();
}

function fcMgrUpdateStats() {
    // 🔧 修正：根據 HTML 中實際的統計分類重新計算
    const total = fcMgrAllData.length;
    const practiced = fcMgrAllData.filter(d => d.history.seen > 0).length;
    const mastered = fcMgrAllData.filter(d => d.priority < 50).length;
    const struggling = fcMgrAllData.filter(d => d.priority >= 120).length;

    // 🔧 修正：使用正確的 ID
    const totalEl = document.getElementById('mgr-total');
    const practicedEl = document.getElementById('mgr-practiced');
    const masteredEl = document.getElementById('mgr-mastered');
    const strugglingEl = document.getElementById('mgr-struggling');

    if (totalEl) totalEl.textContent = total;
    if (practicedEl) practicedEl.textContent = practiced;
    if (masteredEl) masteredEl.textContent = mastered;
    if (strugglingEl) strugglingEl.textContent = struggling;

    // 更新統計卡片點擊事件
    document.querySelectorAll('.fc-mgr-stat').forEach(card => {
        if (card.onclick) return; // 已經有 onclick 就跳過
        const category = card.getAttribute('onclick')?.match(/fcMgrFilterByCategory\('(.+?)'\)/)?.[1];
        if (category) {
            card.onclick = () => fcMgrFilterByCategory(category);
        }
    });
}

function fcMgrFilterData() {
    const searchTerm = document.getElementById('fc-mgr-search')?.value.toLowerCase() || '';
    
    // 🔧 修正：先根據類別篩選（對應 HTML 中的分類）
    let filtered = fcMgrAllData;
    if (fcMgrActiveCategory === 'practiced') {
        filtered = fcMgrAllData.filter(d => d.history.seen > 0);
    } else if (fcMgrActiveCategory === 'mastered') {
        filtered = fcMgrAllData.filter(d => d.priority < 50);
    } else if (fcMgrActiveCategory === 'struggling') {
        filtered = fcMgrAllData.filter(d => d.priority >= 120);
    }
    // 'all' 不需要篩選

    // 再根據搜尋詞篩選
    if (searchTerm) {
        filtered = filtered.filter(data => {
            const name = fcMgrCurrentType === 'word' 
                ? data.item.Words 
                : data.item['句子'];
            return name.toLowerCase().includes(searchTerm);
        });
    }

    fcMgrFiltered = filtered;
    fcMgrRenderList();
}

function fcMgrRenderList() {
    const listEl = document.getElementById('fc-mgr-list');
    
    if (fcMgrFiltered.length === 0) {
        listEl.innerHTML = '<p style="text-align: center; color: var(--color-text-secondary); padding: 2rem;">沒有符合條件的資料</p>';
        return;
    }

    // 只顯示前 100 筆（避免效能問題）
    const displayData = fcMgrFiltered.slice(0, 100);
    
    listEl.innerHTML = displayData.map(data => {
        const item = data.item;
        const hist = data.history;
        const name = fcMgrCurrentType === 'word' ? item.Words : item['句子'];
        const sub = fcMgrCurrentType === 'word' 
            ? (item['traditional Chinese'] || '').split('\n')[0]
            : (item['中文'] || '');

        // 優先級顏色
        let priorityColor = '#48bb78'; // 低優先 = 綠色（很熟悉）
        if (data.priority >= 120) priorityColor = '#fc8181'; // 高優先 = 紅色
        else if (data.priority >= 80) priorityColor = '#f59e0b'; // 中優先 = 橙色

        // 正確率
        const total = hist.known + hist.uncertain + hist.unknown;
        const rate = total > 0 ? Math.round((hist.known / total) * 100) : 0;

        return `
            <div class="fc-mgr-item">
                <div class="fc-mgr-item-header">
                    <div class="fc-mgr-item-name">${name}</div>
                    <div class="fc-mgr-priority" style="background-color: ${priorityColor}; color: white; padding: 0.25rem 0.5rem; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 600;">
                        優先級: ${Math.round(data.priority)}
                    </div>
                </div>
                <div class="fc-mgr-item-sub">${sub}</div>
                <div class="fc-mgr-item-details">
                    <div class="fc-mgr-stats-row">
                        <span class="fc-mgr-stat-mini">已練習：<strong>${hist.seen}</strong></span>
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
    
    // ✅ 修正：確保立即更新並持久化
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
    
    // ✅ 立即觸發持久化
    window.persistVocabularyData();
    
    // 關閉模態框並重新載入（保持當前篩選）
    document.querySelector('.fc-mgr-modal').remove();
    
    // ✅ 延遲重新載入，確保資料已儲存
    setTimeout(() => {
        const currentCategory = fcMgrActiveCategory;
        fcMgrLoadData();
        fcMgrActiveCategory = currentCategory;
        fcMgrFilterData();
        showToast('✅ 已儲存變更', 'success');
    }, 100);
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
    
    setTimeout(() => {
        const currentCategory = fcMgrActiveCategory;
        fcMgrLoadData();
        fcMgrActiveCategory = currentCategory;
        fcMgrFilterData();
        showToast('✅ 已重置記錄', 'success');
    }, 100);
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
    
    // 🔧 修正：更新統計卡片的選中狀態（使用正確的 class）
    document.querySelectorAll('.fc-mgr-stat').forEach(button => {
        // 從 onclick 屬性中提取 category
        const btnCategory = button.getAttribute('onclick')?.match(/fcMgrFilterByCategory\('(.+?)'\)/)?.[1];
        button.classList.toggle('active', btnCategory === category);
    });
    
    fcMgrFilterData();
}

// ─────────────────────────────────────────
//  顯示 Toast 通知
// ─────────────────────────────────────────
function showToast(message, type = 'success') {
    const container = document.getElementById('notification-container');
    if (!container) {
        // 如果沒有通知容器，創建一個
        const newContainer = document.createElement('div');
        newContainer.id = 'notification-container';
        newContainer.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 10000;';
        document.body.appendChild(newContainer);
        showToast(message, type);
        return;
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toast.style.cssText = 'padding: 1rem 1.5rem; margin-bottom: 0.5rem; border-radius: 0.5rem; background: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1); animation: slideIn 0.3s ease;';
    
    if (type === 'success') {
        toast.style.borderLeft = '4px solid #48bb78';
    } else if (type === 'error') {
        toast.style.borderLeft = '4px solid #fc8181';
    }
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ─────────────────────────────────────────
//  確保函數在全域作用域中可用
// ─────────────────────────────────────────
// 將關鍵函數掛載到 window 物件，確保 HTML onclick 能夠存取
window.fcBackToMenu = fcBackToMenu;
window.openFlashcardManager = openFlashcardManager;
window.navigateToFlashcard = navigateToFlashcard;
window.selectFlashcardType = selectFlashcardType;
window.fcStartPractice = fcStartPractice;
window.fcShowAnswer = fcShowAnswer;
window.fcMarkCard = fcMarkCard;
window.fcBackToTypeSelection = fcBackToTypeSelection;
window.fcBackToSetup = fcBackToSetup;
window.fcBackToPractice = fcBackToPractice;
window.fcRestartPractice = fcRestartPractice;
window.navigateToFlashcardManager = navigateToFlashcardManager;
window.fcMgrSwitchType = fcMgrSwitchType;
window.fcMgrEditItem = fcMgrEditItem;
window.fcMgrSaveEdit = fcMgrSaveEdit;
window.fcMgrResetItem = fcMgrResetItem;
window.fcMgrResetAll = fcMgrResetAll;
window.fcMgrExportData = fcMgrExportData;
window.fcMgrFilterByCategory = fcMgrFilterByCategory;

// 🔧 加入 HTML 中使用但名稱不同的函數別名
window.startFlashcardSession = startFlashcardPractice;  // HTML 使用 startFlashcardSession
window.fcBackToTypeSelect = fcBackToTypeSelection;      // HTML 使用 fcBackToTypeSelect
window.fcSelectCount = fcSelectCount;
window.fcFlipCard = fcFlipCard;
window.fcMarkKnown = fcMarkKnown;
window.fcRetryWrong = fcRetryWrong;
window.fcRestartSame = fcRestartPractice;               // HTML 使用 fcRestartSame
window.fcCloseManager = fcBackToMenu;                   // HTML 使用 fcCloseManager

// 🔧 處理舊版本的管理器函數（如果存在的話）
if (typeof wordMgrFilterByCategory !== 'undefined') {
    window.wordMgrFilterByCategory = wordMgrFilterByCategory;
}
if (typeof sentenceMgrFilterByCategory !== 'undefined') {
    window.sentenceMgrFilterByCategory = sentenceMgrFilterByCategory;
}

console.log("✅ flashcard.js - 所有函數已掛載到 window 物件");
