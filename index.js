// index.js - 整合優化版本

// ========== 優化功能：全域變數 ==========
window.appEnhancements = {
    searchDebounceTimer: null,
    autoSaveTimer: null,
    currentTheme: localStorage.getItem('theme') || 'light',
    breadcrumbPath: [],
    audioPlayers: new Set(),
    scrollAnimation: null // 用於追蹤滾動動畫
};

// ========== 優化功能：自訂平滑滾動 ==========
// 使用 easeOutCubic 緩動函數，提供更自然的減速效果
function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

// 自訂平滑滾動函數
function smoothScrollTo(element, targetScrollTop, duration = 500) {
    // 如果有正在進行的滾動動畫，取消它
    if (window.appEnhancements.scrollAnimation) {
        cancelAnimationFrame(window.appEnhancements.scrollAnimation);
    }
    
    const startScrollTop = element.scrollTop;
    const distance = targetScrollTop - startScrollTop;
    const startTime = performance.now();
    
    function scroll(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // 使用緩動函數
        const easeProgress = easeOutCubic(progress);
        
        element.scrollTop = startScrollTop + distance * easeProgress;
        
        if (progress < 1) {
            window.appEnhancements.scrollAnimation = requestAnimationFrame(scroll);
        } else {
            window.appEnhancements.scrollAnimation = null;
        }
    }
    
    window.appEnhancements.scrollAnimation = requestAnimationFrame(scroll);
}

// ========== 優化功能：記憶體洩漏防護 ==========
function registerAudioPlayer(audio) {
    window.appEnhancements.audioPlayers.add(audio);
    return audio;
}

function cleanupAudioPlayers() {
    window.appEnhancements.audioPlayers.forEach(audio => {
        try {
            audio.pause();
            audio.src = '';
            audio.load();
        } catch(e) {
            console.warn('清理音訊播放器時發生錯誤:', e);
        }
    });
    window.appEnhancements.audioPlayers.clear();
}

// ========== 優化功能：防抖函數 ==========
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ========== 優化功能：深色模式 ==========
function initTheme() {
    document.documentElement.setAttribute('data-theme', window.appEnhancements.currentTheme);
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
        themeBtn.textContent = window.appEnhancements.currentTheme === 'dark' ? '☀️' : '🌙';
        themeBtn.addEventListener('click', toggleTheme);
    }
}

function toggleTheme() {
    window.appEnhancements.currentTheme = window.appEnhancements.currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', window.appEnhancements.currentTheme);
    localStorage.setItem('theme', window.appEnhancements.currentTheme);
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
        themeBtn.textContent = window.appEnhancements.currentTheme === 'dark' ? '☀️' : '🌙';
    }
    if (typeof showNotification === 'function') {
        showNotification(`已切換至${window.appEnhancements.currentTheme === 'dark' ? '深色' : '淺色'}模式`, 'success');
    }
}

// ========== 優化功能：麵包屑導航 ==========
function updateBreadcrumb(path) {
    if (path) {
        window.appEnhancements.breadcrumbPath = path;
    }
    
    const breadcrumbNav = document.getElementById('breadcrumb-nav');
    if (!breadcrumbNav) return;
    
    // 如果路徑為空，隱藏導航
    if (window.appEnhancements.breadcrumbPath.length === 0) {
        breadcrumbNav.classList.remove('show');
        return;
    }
    
    breadcrumbNav.classList.add('show');
    breadcrumbNav.innerHTML = window.appEnhancements.breadcrumbPath.map((item, index) => {
        const isLast = index === window.appEnhancements.breadcrumbPath.length - 1;
        let onclickAction = "";
        
        // [需求 3] 定義點擊行為：第一層回到選單，其他層級執行 navigateToBreadcrumb
        if (index === 0) {
            onclickAction = "backToMenu()";
        } else {
            onclickAction = `navigateToBreadcrumb(${index})`;
        }
        
        // [需求 3] 所有麵包屑項目都可點擊，包括最後一項
        return `<span class="breadcrumb-item" onclick="${onclickAction}">${item}</span>${!isLast ? '<span class="breadcrumb-separator">›</span>' : ''}`;
    }).join('');
}

// [請在 index.js 中搜尋並替換此函數]
function backToFirstLayer() {
    // 1. 切換顯示區域
    const wordList = document.getElementById('wordList');
    const wordDetails = document.getElementById('wordDetails');
    const mainPage = document.getElementById('mainPageContainer');

    if (wordList) wordList.style.display = 'none';
    if (wordDetails) wordDetails.style.display = 'none';
    if (mainPage) mainPage.style.display = 'block';
    
    // [需求 4 & 5] 在單字庫頁面，隱藏學習列表標題與自動播放按鈕
    const listTitle = document.getElementById("wordListTitle");
    if (listTitle) listTitle.style.display = "none";
    
    const autoPlayBtn = document.getElementById("autoPlayBtn");
    if (autoPlayBtn) autoPlayBtn.style.display = "none";

    // 2. [需求 2] 更新麵包屑：加入第一層「選擇功能」
    if (typeof updateBreadcrumb === 'function') {
        updateBreadcrumb(['選擇功能', '單字庫']);
    }

    // 3. 清除搜尋與重置按鈕
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    
    // 隱藏進度條
    const progressBar = document.getElementById('reading-progress-bar');
    if (progressBar) progressBar.style.width = '0%';
    
    // 4. 禁用 Back 按鈕
    const bButton = document.getElementById('bButton');
    if (bButton) {
        bButton.disabled = true;
        bButton.style.backgroundColor = "#ccc"; 
        bButton.style.cursor = "default";
    }
    
    // 清空歷史堆疊
    historyStack = [];
}

function navigateToBreadcrumb(index) {
    // 更新路徑陣列
    window.appEnhancements.breadcrumbPath = window.appEnhancements.breadcrumbPath.slice(0, index + 1);
    
    // 根據新的層級定義導航行為
    // Index 0: 選擇功能 -> 回到主選單
    // Index 1: 單字庫 -> 回到分類選擇頁
    // Index 2: 學習列表 -> 回到單字列表
    // Index 3: 單字詳情 -> 回到單字詳情（當前頁）
    
    if (index === 0) {
        if (typeof backToMenu === 'function') backToMenu();
    } else if (index === 1) {
        if (typeof backToFirstLayer === 'function') backToFirstLayer();
    } else if (index === 2) {
        if (typeof backToWordList === 'function') backToWordList();
    }
    
    updateBreadcrumb();
}

// ========== 優化功能：進度條 ==========
function showProgress(percent) {
    const progressBar = document.getElementById('progress-bar');
    if (progressBar) {
        progressBar.style.width = Math.min(100, Math.max(0, percent)) + '%';
        if (percent >= 100) {
            setTimeout(() => { progressBar.style.width = '0%'; }, 500);
        }
    }
}

// ========== 優化功能：自動儲存 ==========
function showAutoSaveIndicator() {
    const indicator = document.getElementById('auto-save-indicator');
    if (!indicator) return;
    
    indicator.classList.add('show');
    setTimeout(() => {
        indicator.classList.remove('show');
    }, 2000);
}

function autoSaveNote() {
    if (window.appEnhancements.autoSaveTimer) {
        clearTimeout(window.appEnhancements.autoSaveTimer);
    }
    window.appEnhancements.autoSaveTimer = setTimeout(() => {
        if (typeof saveNote === 'function') {
            saveNote();
            showAutoSaveIndicator();
        }
    }, 2000);
}

// ========== 優化功能：鍵盤快捷鍵 ==========
function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // 當使用者在輸入框或文字區域輸入時,停用快捷鍵
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
            return;
        }
        
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (typeof saveNote === 'function') saveNote();
            return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            const searchInput = document.getElementById('searchInput');
            if (searchInput && !searchInput.closest('.is-hidden')) {
                searchInput.focus();
            }
            return;
        }
        if (e.key === ' ') {
            e.preventDefault();
            const playBtn = document.getElementById('playAudioBtn');
            if (playBtn && playBtn.offsetParent !== null) {
                playBtn.click();
            }
            return;
        }
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            if (typeof adjustAudioTime === 'function') adjustAudioTime(-5);
            return;
        }
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            if (typeof adjustAudioTime === 'function') adjustAudioTime(5);
            return;
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            const wordDetails = document.getElementById('wordDetails');
            const wordList = document.getElementById('wordList');
            if (wordDetails && wordDetails.style.display === 'block') {
                if (typeof backToWordList === 'function') backToWordList();
            } else if (wordList && wordList.style.display === 'block') {
                if (typeof backToFirstLayer === 'function') backToFirstLayer();
            }
            return;
        }
        if (e.key === '?') {
            e.preventDefault();
            showKeyboardShortcutsModal();
            return;
        }
    });
    
    setTimeout(() => {
        const hint = document.getElementById('keyboard-hint');
        if (hint) {
            hint.classList.add('show');
            setTimeout(() => hint.classList.remove('show'), 3000);
        }
    }, 1000);
}

function showKeyboardShortcutsModal() {
    const modal = document.getElementById('keyboard-shortcuts-modal');
    if (modal) modal.classList.remove('is-hidden');
}

function closeKeyboardShortcutsModal() {
    const modal = document.getElementById('keyboard-shortcuts-modal');
    if (modal) modal.classList.add('is-hidden');
}

// ========== 優化功能：搜尋優化 ==========
function setupSearchEnhancements() {
    const searchInput = document.getElementById('searchInput');
    const searchClearBtn = document.getElementById('search-clear-btn');
    const searchCount = document.getElementById('search-count');
    
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            if (searchInput.value.length > 0) {
                if (searchClearBtn) searchClearBtn.style.display = 'block';
            } else {
                if (searchClearBtn) searchClearBtn.style.display = 'none';
                if (searchCount) searchCount.style.display = 'none';
            }
        });
        // 防止快捷鍵監聽干擾輸入框（手機空白鍵問題）
        searchInput.addEventListener('keydown', (e) => {
            e.stopPropagation();
        });
    }
    
    if (searchClearBtn) {
        searchClearBtn.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            searchClearBtn.style.display = 'none';
            if (searchCount) searchCount.style.display = 'none';
            if (typeof filterWords === 'function') filterWords();
        });
    }
    
    const searchInputDetails = document.getElementById('searchInputDetails');
    const searchClearBtnDetails = document.getElementById('search-clear-btn-details');
    const searchCountDetails = document.getElementById('search-count-details');
    
    if (searchInputDetails) {
        searchInputDetails.addEventListener('input', () => {
            if (searchInputDetails.value.length > 0) {
                if (searchClearBtnDetails) searchClearBtnDetails.style.display = 'block';
            } else {
                if (searchClearBtnDetails) searchClearBtnDetails.style.display = 'none';
                if (searchCountDetails) searchCountDetails.style.display = 'none';
            }
        });
        // 防止快捷鍵監聽干擾輸入框（手機空白鍵問題）
        searchInputDetails.addEventListener('keydown', (e) => {
            e.stopPropagation();
        });
    }
    
    if (searchClearBtnDetails) {
        searchClearBtnDetails.addEventListener('click', () => {
            if (searchInputDetails) searchInputDetails.value = '';
            searchClearBtnDetails.style.display = 'none';
            if (searchCountDetails) searchCountDetails.style.display = 'none';
            if (typeof filterWordsInDetails === 'function') filterWordsInDetails();
        });
    }
}


// ========== 優化功能：筆記自動儲存 ==========
function setupNoteAutoSave() {
    const noteTextarea = document.getElementById('wordNote');
    if (noteTextarea) {
        noteTextarea.addEventListener('input', autoSaveNote);
    }
}

// ========== 優化功能：初始化 ==========
function initEnhancements() {
    console.log('🚀 初始化優化功能...');
    initTheme();
    initKeyboardShortcuts();
    setupSearchEnhancements();
    // initPlaybackSpeed(); // 已移除播放速度功能
    setupNoteAutoSave();
    window.addEventListener('beforeunload', cleanupAudioPlayers);
    console.log('✅ 優化功能初始化完成!');
}

// ========== 原始程式碼開始 ==========


// 這些是索引頁面邏輯特有的變數
let wordsData = [];
// let sentenceAudio = new Audio(); // [優化] 由 detailsSentencePlayer 取代
let detailsWordPlayer = new Audio(); // [新增] 專用於內文的單字播放器
let detailsSentencePlayer = new Audio(); // [新增] 專用於內文的句子播放器
let sentenceData = [];
let lastWordListType = "";
let lastWordListValue = "";
let lastSentenceListWord = "";
let isAutoPlaying = false;
let isPaused = false;
let currentAudio = new Audio();
window.currentWordList = [];
let historyStack = [];

// --- 時間戳模式狀態變數 ---
let isTimestampMode = true; // 統一使用 timestamp 模式
let timestampData = [];
let hasTimestampFile = false;
let lastHighlightedSentence = null;
let timestampUpdateRafId = null;
let originalMeaningContent = ""; // 用於儲存 JSON 內容
let isSentenceJumping = false; // [新增] 是否正在跳轉句子（避免畫面跳動）

// 此函數顯示主應用程式視圖
function showAppView(user) {
    const loginView = document.getElementById('login-view');
    const menuView = document.getElementById('menu-view');
    const appContainer = document.getElementById('app-container');
    
    if (loginView) loginView.classList.add('is-hidden');
    if (menuView) menuView.classList.remove('is-hidden');
    if (appContainer) appContainer.classList.add('is-hidden'); // 先隱藏主應用容器

    const isGuest = !user;
    
    // 更新menu-view中的用戶資訊
    const userInfoMenuEl = document.getElementById('user-info-menu');
    const signOutBtnMenu = document.getElementById('sign-out-btn-menu');
    const signInFromGuestBtnMenu = document.getElementById('sign-in-from-guest-btn-menu');
    
    if (!isGuest) {
        if (userInfoMenuEl) userInfoMenuEl.textContent = `歡迎, ${user.displayName || user.email}`;
        if (signOutBtnMenu) signOutBtnMenu.classList.remove('is-hidden');
        if (signInFromGuestBtnMenu) signInFromGuestBtnMenu.classList.add('is-hidden');
    } else {
        if (userInfoMenuEl) userInfoMenuEl.textContent = '訪客模式';
        if (signOutBtnMenu) signOutBtnMenu.classList.add('is-hidden');
        if (signInFromGuestBtnMenu) signInFromGuestBtnMenu.classList.remove('is-hidden');
    }
    
    // 設置menu-view中的按鈕事件
    const gotoVocabularyBtn = document.getElementById('goto-vocabulary-btn');
    const gotoSentenceBtn = document.getElementById('goto-sentence-btn');
    const gotoTestBtn = document.getElementById('goto-test-btn');
    const themeToggleBtnMenu = document.getElementById('theme-toggle-btn-menu');
    const editStorageBtnMenu = document.getElementById('edit-storage-btn-menu');
    
    if (gotoVocabularyBtn) {
        gotoVocabularyBtn.onclick = function() {
            if (menuView) menuView.classList.add('is-hidden');
            if (appContainer) appContainer.classList.remove('is-hidden');
            backToFirstLayer();
        };
    }
    
    if (gotoSentenceBtn) {
        gotoSentenceBtn.onclick = function() {
            window.location.href = 'sentence.html';
        };
    }
    
    if (gotoTestBtn) {
        gotoTestBtn.onclick = function() {
            window.location.href = 'quiz.html';
        };
    }
    
    if (themeToggleBtnMenu) {
        themeToggleBtnMenu.addEventListener('click', toggleTheme);
    }
    
    if (editStorageBtnMenu) {
        editStorageBtnMenu.addEventListener('click', openStorageEditor);
    }
    
    if (signOutBtnMenu) {
        signOutBtnMenu.addEventListener('click', signOutUser);
    }
    
    if (signInFromGuestBtnMenu) {
        signInFromGuestBtnMenu.addEventListener('click', signIn);
    }
    
    // 初始化主題
    initTheme();
    
    // 更新app-container中的用戶資訊(為了當從menu進入時有正確資訊)
    const userInfoEl = document.getElementById('user-info');
    const signOutBtn = document.getElementById('sign-out-btn');
    const signInFromGuestBtn = document.getElementById('sign-in-from-guest-btn');

    if (!isGuest) {
        if (userInfoEl) userInfoEl.textContent = `歡迎, ${user.displayName || user.email}`;
        if (signOutBtn) signOutBtn.classList.remove('is-hidden');
        if (signInFromGuestBtn) signInFromGuestBtn.classList.add('is-hidden');
    } else {
        if (userInfoEl) userInfoEl.textContent = '訪客模式';
        if (signOutBtn) signOutBtn.classList.add('is-hidden');
        if (signInFromGuestBtn) signInFromGuestBtn.classList.remove('is-hidden');
    }
}

// 索引頁面的主要應用程式邏輯
function initializeAppLogic() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
        loadingOverlay.style.opacity = '1';
    }

    // 在 Promise.all 中增加一個 fetch 來獲取 sentence.json
    return Promise.all([
        fetch("https://boydyang-designer.github.io/English-vocabulary/audio_files/Z_total_words.json")
            .then(res => {
                if (!res.ok) throw new Error(`HTTP 錯誤! 狀態: ${res.status}`);
                return res.json();
            }),
        // 新增的 fetch
        fetch("https://boydyang-designer.github.io/English-vocabulary/Sentence%20file/sentence.json")
            .then(res => {
                if (!res.ok) throw new Error(`HTTP 錯誤! 狀態: ${res.status}`);
                return res.json();
            })
    ])
    .then(([wordsJsonData, sentenceJsonData]) => { // 接收兩個 JSON 資料
        let rawWords = wordsJsonData["New Words"] || [];
        sentenceData = Array.isArray(sentenceJsonData) ? sentenceJsonData : (sentenceJsonData["New Words"] || []); // 相容直接陣列或 { "New Words": [] } 格式
        
        // --- [新增] 合併使用者自訂單字 ---
        const userVocabulary = window.getVocabularyData(); // 從 auth-manager 獲取
        const customWords = userVocabulary.customWords || {}; // 結構: { "Apple": { ...wordObj }, "Banana": { ... } }

        // 將原始資料轉換為 Map 以便快速查找 (以單字文字當 key)
        let wordsMap = new Map();
        rawWords.forEach(w => {
            let key = (w.Words || w.word || w["單字"]).trim();
            wordsMap.set(key, w);
        });

        // [新增] 檢測已整合的單字
        const integratedWords = detectIntegratedWords(rawWords, customWords);
        if (integratedWords.length > 0) {
            showIntegratedWordsPrompt(integratedWords);
        }

        // 將使用者的自訂單字覆蓋或新增進去
        Object.keys(customWords).forEach(key => {
            wordsMap.set(key, customWords[key]);
        });

        // 轉回 Array 並賦值給全域變數 wordsData
        wordsData = Array.from(wordsMap.values());
        // -------------------------------
        
        console.log("✅ Z_total_words.json 與 使用者自訂單字 成功合併載入");
        console.log("✅ sentence.json 成功載入"); // 確認句子資料已載入

        wordsData.forEach(w => {
            if (typeof w["分類"] === "string") w["分類"] = [w["分類"]];
            else if (!Array.isArray(w["分類"])) w["分類"] = [];
        });

        createAlphabetButtons();
        createDomainButtons();
        createTopicButtons();
        createSourceButtons();
        createSpecialCategoryButtons();
        createLevelButtons();
        
        console.log("✅ 按鈕成功建立");
        showNotification('✅ 單字資料已載入!', 'success');
        displayWordDetailsFromURL();
    })
    .catch(err => {
        console.error("❌ 資料載入期間發生錯誤:", err);
        showNotification('❌ 載入資料失敗。請檢查網路或檔案路徑。', 'error');
    })
    .finally(() => {
        if (loadingOverlay) {
            loadingOverlay.style.opacity = '0';
            setTimeout(() => { loadingOverlay.style.display = 'none'; }, 500);
        }
    });
}

// 監聽來自 auth-manager.js 的 'auth-ready' 事件
document.addEventListener('auth-ready', function(event) {
    console.log('index.html 上的認證已準備就緒。使用者:', event.detail.user);
    const { user } = event.detail;
    
    // 顯示正確的視圖 (應用程式或登入)
    showAppView(user);
    
    // 初始化主要應用程式邏輯
    initializeAppLogic();
});


document.addEventListener("DOMContentLoaded", function () {
    // --- 綁定登入/登出按鈕事件 ---
    const googleSigninBtn = document.getElementById('google-signin-btn');
    const guestModeBtn = document.getElementById('guest-mode-btn');
    const signOutBtn = document.getElementById('sign-out-btn');
    const signInFromGuestBtn = document.getElementById('sign-in-from-guest-btn');

    if (googleSigninBtn) googleSigninBtn.addEventListener('click', signIn);
    if (guestModeBtn) guestModeBtn.addEventListener('click', enterGuestMode);
    if (signOutBtn) signOutBtn.addEventListener('click', signOutUser);
    if (signInFromGuestBtn) signInFromGuestBtn.addEventListener('click', signIn);
const bButton = document.getElementById('bButton');
    if (bButton) {
        bButton.addEventListener('click', backToPrevious);
        // 設置初始狀態為禁用
        bButton.disabled = true;
        bButton.style.backgroundColor = "#ccc";
    }
    // --- 其他頁面特定的事件綁定 ---
    enableWordCopyOnClick();

    const sentenceButton = document.getElementById("sentencePageBtn");
    if (sentenceButton) sentenceButton.addEventListener("click", () => window.location.href = "sentence.html");

    const quizButton = document.getElementById("startQuizBtn");
    if (quizButton) quizButton.addEventListener("click", () => window.location.href = "quiz.html?show=sentenceCategories&from=index");

    const startLearningButton = document.getElementById("startLearningBtn");
    if (startLearningButton) startLearningButton.addEventListener("click", startLearning);
    
    // 畫重點模式按鈕
    const highlightModeBtn = document.getElementById('highlight-mode-btn');
    if (highlightModeBtn) {
        highlightModeBtn.addEventListener('click', () => {
            loadHighlightedWords();
            enterHighlightModeEnhanced();
        });
    }
    
    // 新增單字按鈕
    const addWordBtn = document.getElementById('add-word-btn');
    if (addWordBtn) {
        addWordBtn.addEventListener('click', () => {
            const searchInput = document.getElementById('searchInput');
            const searchWord = searchInput ? searchInput.value.trim() : '';
            openAddWordModal(searchWord);
        });
    }
    
    const exitHighlightModeBtn = document.getElementById('exit-highlight-mode-btn');
    if (exitHighlightModeBtn) {
        exitHighlightModeBtn.addEventListener('click', exitHighlightMode);
    }
    
    // 畫重點模式中的播放按鈕
    const highlightPlayBtn = document.getElementById('highlight-play-btn');
    if (highlightPlayBtn) {
        highlightPlayBtn.addEventListener('click', () => {
            const audioFile = document.getElementById("wordTitle")?.textContent.trim();
            if (audioFile) {
                playSentenceAudio(audioFile + " - sentence.mp3");
            }
        });
    }
    
    // Storage 編輯器按鈕
    const editStorageBtn = document.getElementById('edit-storage-btn');
    if (editStorageBtn) {
        editStorageBtn.addEventListener('click', openStorageEditor);
    }
    
    const closeStorageEditorBtn = document.getElementById('close-storage-editor-btn');
    if (closeStorageEditorBtn) {
        closeStorageEditorBtn.addEventListener('click', closeStorageEditor);
    }
    
    // Storage 編輯器標籤切換
    document.querySelectorAll('.storage-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            
            // 切換標籤活動狀態
            document.querySelectorAll('.storage-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // 切換內容顯示
            document.querySelectorAll('.storage-tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(`tab-${tabName}`).classList.add('active');
        });
    });
    
    document.querySelectorAll(".collapsible-header").forEach(button => {
        button.addEventListener("click", function() {
            this.classList.toggle("active");
            const content = this.nextElementSibling;
            const section = this.closest('.collapsible-section'); // 新增：獲取分類區域

            if (this.classList.contains('active')) {
                // 新增：滾動到該分類區域
                if (section) {
                    setTimeout(() => {
                        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                }
                
                content.style.maxHeight = content.scrollHeight + "px";
                if (content.scrollHeight > 250) {
                    setTimeout(() => {
                        content.style.maxHeight = '250px'; 
                    }, 10); 
                }
            } else {
                content.style.maxHeight = null;
            }
        });
    });

    // 初始化所有優化功能
    initEnhancements();
});

// --- 所有其他來自原始 index.js 的函數都在這裡 ---

function showNotification(message, type = 'success') {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 4000);
}

function updateCollapsibleHeaderState(btn) {
    const contentWrapper = btn.closest('.collapsible-content');
    if (!contentWrapper) return;
    const header = contentWrapper.previousElementSibling;
    if (!header || !header.classList.contains('collapsible-header')) return;
    const hasSelectedChildren = contentWrapper.querySelector('.letter-btn.selected') !== null;
    if (hasSelectedChildren) {
        header.classList.add('header-highlight');
    } else {
        header.classList.remove('header-highlight');
    }
}

function toggleSelection(btn) {
    btn.classList.toggle('selected');
}

function toggleAndCheckHeader(btn) {
    toggleSelection(btn);
    updateCollapsibleHeaderState(btn);
}

function handleGlobalTopicClick(btn) {
    toggleSelection(btn);
    updateCollapsibleHeaderState(btn);
    const topicValue = btn.dataset.value;
    const isSelected = btn.classList.contains('selected');
    const nestedTopicBtns = document.querySelectorAll(`.subcategory-wrapper .letter-btn[data-value="${topicValue}"]`);
    nestedTopicBtns.forEach(nestedBtn => {
        nestedBtn.classList.toggle('selected', isSelected);
        updateDomainButtonState(nestedBtn);
    });
}

function handleNestedTopicClick(btn) {
    toggleSelection(btn);
    updateDomainButtonState(btn);
    const topicValue = btn.dataset.value;
    const isSelected = btn.classList.contains('selected');
    const globalTopicBtn = document.querySelector(`#topicCategoryButtons .letter-btn[data-value="${topicValue}"]`);
    if (globalTopicBtn) {
        globalTopicBtn.classList.toggle('selected', isSelected);
        updateCollapsibleHeaderState(globalTopicBtn);
    }
}

function updateDomainButtonState(nestedBtn) {
    const subcategoryWrapper = nestedBtn.closest('.subcategory-wrapper');
    if (!subcategoryWrapper) return;
    const domainBtn = subcategoryWrapper.previousElementSibling;
    if (!domainBtn || !domainBtn.classList.contains('letter-btn')) return;
    const hasSelectedSubcategories = subcategoryWrapper.querySelector('.letter-btn.selected') !== null;
    if (hasSelectedSubcategories) {
        domainBtn.classList.add('selected');
    } else {
        domainBtn.classList.remove('selected');
    }
    updateCollapsibleHeaderState(domainBtn);
}

function handleDomainClick(btn, domainName) {
    let parentContainer = btn.closest('.collapsible-content');
    let subcategoryWrapper = document.getElementById(`sub-for-${domainName.replace(/\s/g, '-')}`);
    if (!subcategoryWrapper) {
        subcategoryWrapper = document.createElement('div');
        subcategoryWrapper.className = 'subcategory-wrapper';
        subcategoryWrapper.id = `sub-for-${domainName.replace(/\s/g, '-')}`;
        const topics = [...new Set(
            wordsData
                .filter(w => w["分類"] && w["分類"][0] === domainName && w["分類"][1])
                .map(w => w["分類"][1])
        )];
        if (topics.length > 0) {
            const subWrapper = document.createElement('div');
            subWrapper.className = 'button-wrapper';
            subWrapper.innerHTML = topics.map(topic => {
                const globalTopicBtn = document.querySelector(`#topicCategoryButtons .letter-btn[data-value="${topic}"]`);
                const isSelectedClass = globalTopicBtn && globalTopicBtn.classList.contains('selected') ? 'selected' : '';
                return `<button class="letter-btn ${isSelectedClass}" data-value='${topic}' onclick="handleNestedTopicClick(this)">${topic}</button>`;
            }).join(' ');
            subcategoryWrapper.appendChild(subWrapper);
        }
        btn.parentNode.insertBefore(subcategoryWrapper, btn.nextSibling);
    }
    const mainCollapsibleContent = btn.closest('.collapsible-content');
    if (subcategoryWrapper.style.maxHeight && subcategoryWrapper.style.maxHeight !== '0px') {
        subcategoryWrapper.style.maxHeight = '0px';
    } else {
        subcategoryWrapper.style.maxHeight = subcategoryWrapper.scrollHeight + "px";
    }
    setTimeout(() => {
        if (mainCollapsibleContent.style.maxHeight !== '0px') {
             mainCollapsibleContent.style.maxHeight = mainCollapsibleContent.scrollHeight + "px";
        }
    }, 310);
}

function createAlphabetButtons() {
    const container = document.getElementById("alphabetButtons");
    if (container) {
        const wrapper = document.createElement('div');
        wrapper.className = 'button-wrapper';
        wrapper.innerHTML = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(l =>
            `<button class='letter-btn' data-value='${l.toLowerCase()}' onclick='toggleAndCheckHeader(this)'>${l}</button>`
        ).join(" ");
        container.appendChild(wrapper);
    }
}

function createDomainButtons() {
    if (!wordsData || !Array.isArray(wordsData)) return;
    let domains = [...new Set(wordsData.map(w => (w["分類"] && w["分類"][0]) || null).filter(Boolean))];
    const container = document.getElementById("domainCategoryButtons");
    if (container) {
        container.innerHTML = '';
        const wrapper = document.createElement('div');
        wrapper.className = 'button-wrapper';
        wrapper.innerHTML = domains.map(d => 
            `<button class='letter-btn' data-value='${d}' onclick="handleDomainClick(this, '${d}')">${d}</button>`
        ).join(" ");
        container.appendChild(wrapper);
    }
}

function createTopicButtons() {
    if (!wordsData || !Array.isArray(wordsData)) return;
    let topics = [...new Set(wordsData.map(w => (w["分類"] && w["分類"][1]) || null).filter(Boolean))];
    const container = document.getElementById("topicCategoryButtons");
    if (container) {
        container.innerHTML = '';
        const wrapper = document.createElement('div');
        wrapper.className = 'button-wrapper';
        wrapper.innerHTML = topics.map(t => 
            `<button class='letter-btn' data-value='${t}' onclick='handleGlobalTopicClick(this)'>${t}</button>`
        ).join(" ");
        container.appendChild(wrapper);
    }
}

function createSourceButtons() {
    if (!wordsData || !Array.isArray(wordsData)) return;
    let sources = [...new Set(wordsData.map(w => (w["分類"] && w["分類"][2]) || null).filter(Boolean))];
    const container = document.getElementById("sourceCategoryButtons");
    if (container) {
        container.innerHTML = '';
        const wrapper = document.createElement('div');
        wrapper.className = 'button-wrapper';
        wrapper.innerHTML = sources.map(s => 
            `<button class='letter-btn' data-value='${s}' onclick='toggleAndCheckHeader(this)'>${s}</button>`
        ).join(" ");
        container.appendChild(wrapper);
    }
}

function createSpecialCategoryButtons() {
    const specialCategories = [
        { name: "Checked 單字", value: "checked" },
        { name: "重要單字", value: "important" },
        { name: "錯誤單字", value: "wrong" },
        { name: "備註單字", value: "note" },
        { name: "自訂單字", value: "custom" },
        { name: "畫重點單字", value: "highlighted" },
        // ========== 卡牌練習分類 ==========
        { name: "❌ 再練習", value: "flashcard-unknown" },
        { name: "❓ 不確定", value: "flashcard-uncertain" },
        { name: "✅ 記得！", value: "flashcard-known" },
        { name: "🃏 已練習", value: "flashcard-practiced" }
        // --------------------
    ];
    const specialContainer = document.getElementById("specialCategoryButtons");
    if (specialContainer) {
         specialContainer.innerHTML = '';
         const wrapper = document.createElement('div');
         wrapper.className = 'button-wrapper';
         wrapper.innerHTML = specialCategories.map(c => 
            `<button class='letter-btn' data-value='${c.value}' onclick='toggleAndCheckHeader(this)'>${c.name}</button>`
         ).join(" ");
        specialContainer.appendChild(wrapper);
    }
}

function createLevelButtons() {
    if (!wordsData || !Array.isArray(wordsData)) return;
    let levels = [...new Set(
        wordsData.map(w => (w["等級"] || "未分類").toUpperCase().trim())
    )];
    const levelOrder = ["A1", "A2", "B1", "B2", "C1", "C2", "未分類"];
    levels.sort((a, b) => {
        const indexA = levelOrder.indexOf(a);
        const indexB = levelOrder.indexOf(b);
        return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });
    const container = document.getElementById("levelButtonsContent");
    if (container) {
        container.innerHTML = "";
        const wrapper = document.createElement('div');
        wrapper.className = 'button-wrapper';
        wrapper.innerHTML = levels
            .map(l => `<button class='letter-btn' data-value='${l}' onclick='toggleAndCheckHeader(this)'>${l}</button>`)
            .join(" ");
        container.appendChild(wrapper);
    }
}

function startLearning() {
    const selectedLetters = Array.from(document.querySelectorAll('#alphabetButtons .letter-btn.selected')).map(btn => btn.dataset.value);
    const selectedDomains = Array.from(document.querySelectorAll('#domainCategoryButtons > .button-wrapper > .letter-btn.selected')).map(btn => btn.dataset.value);
    const selectedTopics = Array.from(document.querySelectorAll('#topicCategoryButtons .letter-btn.selected')).map(btn => btn.dataset.value);
    const selectedSources = Array.from(document.querySelectorAll('#sourceCategoryButtons .letter-btn.selected')).map(btn => btn.dataset.value);
    const selectedLevels = Array.from(document.querySelectorAll('#levelButtonsContent .letter-btn.selected')).map(btn => btn.dataset.value);
    const selectedSpecials = Array.from(document.querySelectorAll('#specialCategoryButtons .letter-btn.selected')).map(btn => btn.dataset.value);
    
    let filteredWords = wordsData;

    // 1. 字母篩選
    if (selectedLetters.length > 0) {
        filteredWords = filteredWords.filter(w => {
            const word = w.Words || w.word || w["單字"] || "";
            return word && selectedLetters.includes(word.charAt(0).toLowerCase());
        });
    }
    
    // 2. 領域與主題篩選
    if (selectedDomains.length > 0) {
        filteredWords = filteredWords.filter(w => {
            const domain = (w["分類"] && w["分類"][0]) || null;
            const topic = (w["分類"] && w["分類"][1]) || null;
            if (selectedTopics.length === 0) {
                return selectedDomains.includes(domain);
            }
            return selectedDomains.includes(domain) && selectedTopics.includes(topic);
        });
    } else if (selectedTopics.length > 0) {
         filteredWords = filteredWords.filter(w => {
            const topic = (w["分類"] && w["分類"][1]) || null;
            return selectedTopics.includes(topic);
        });
    }
    
    // 3. 來源篩選
    if (selectedSources.length > 0) {
        filteredWords = filteredWords.filter(w => {
            const source = (w["分類"] && w["分類"][2]) || null;
            return selectedSources.includes(source);
        });
    }
    
    // 4. 等級篩選
    if (selectedLevels.length > 0) {
        filteredWords = filteredWords.filter(w => {
            const level = w["等級"] || "未分類";
            return selectedLevels.includes(level);
        });
    }
    
    // 5. 特殊分類篩選 (勾選、重點、錯字等)
    if (selectedSpecials.length > 0) {
        const specialWordsSet = new Set();
        const vocabularyData = window.getVocabularyData(); 
        selectedSpecials.forEach(specialType => {
            switch (specialType) {
                case 'checked':
                    (vocabularyData.checkedWords || []).forEach(word => specialWordsSet.add(word));
                    break;
                case 'important':
                    (vocabularyData.importantWords || []).forEach(word => specialWordsSet.add(word));
                    break;
                case 'wrong':
                    (vocabularyData.wrongWords || []).forEach(word => specialWordsSet.add(word));
                    break;
                case 'note':
                    Object.keys(vocabularyData.notes || {}).forEach(word => specialWordsSet.add(word));
                    break;
                case 'highlighted':
                    Object.keys(vocabularyData.highlightedWords || {}).forEach(word => specialWordsSet.add(word));
                    break;
                case 'custom': 
                    const customWordsObj = vocabularyData.customWords || {};
                    Object.keys(customWordsObj).forEach(word => specialWordsSet.add(word));
                    break;
                // ========== 卡牌練習分類篩選 ==========
                case 'flashcard-unknown':
                    // 篩選標記為「再練習」的單字
                    const flashcardHistory = vocabularyData.flashcardHistory?.word || {};
                    Object.keys(flashcardHistory).forEach(word => {
                        const hist = flashcardHistory[word];
                        if (hist.unknown > 0) specialWordsSet.add(word);
                    });
                    break;
                case 'flashcard-uncertain':
                    // 篩選標記為「不確定」的單字
                    const flashcardHistoryUncertain = vocabularyData.flashcardHistory?.word || {};
                    Object.keys(flashcardHistoryUncertain).forEach(word => {
                        const hist = flashcardHistoryUncertain[word];
                        if (hist.uncertain > 0) specialWordsSet.add(word);
                    });
                    break;
                case 'flashcard-known':
                    // 篩選標記為「記得！」的單字
                    const flashcardHistoryKnown = vocabularyData.flashcardHistory?.word || {};
                    Object.keys(flashcardHistoryKnown).forEach(word => {
                        const hist = flashcardHistoryKnown[word];
                        if (hist.known > 0) specialWordsSet.add(word);
                    });
                    break;
                case 'flashcard-practiced':
                    // 篩選所有練習過的單字（seen > 0）
                    const flashcardHistoryPracticed = vocabularyData.flashcardHistory?.word || {};
                    Object.keys(flashcardHistoryPracticed).forEach(word => {
                        const hist = flashcardHistoryPracticed[word];
                        if (hist.seen > 0) specialWordsSet.add(word);
                    });
                    break;
            }
        });
        filteredWords = filteredWords.filter(w => {
            const wordText = w.Words || w.word || w["單字"] || "";
            return specialWordsSet.has(wordText);
        });
    }

    // 6. 結果檢查與視圖切換
    if (filteredWords.length === 0) {
        showNotification("⚠️ 找不到符合的單字。", "error");
        return;
    }

// 執行顯示列表
    displayWordList(filteredWords, "學習列表");
    
    // [需求 5] 在"單字庫›學習列表"時隱藏 h2 id="wordListTitle" 
    const listTitle = document.getElementById("wordListTitle");
    if (listTitle) listTitle.style.display = "none";

    // ========== [新增/修改內容] ==========
    
    // A. 確保選單區域隱藏，列表區域顯示
    const mainPage = document.getElementById('mainPageContainer');
    if (mainPage) mainPage.style.display = 'none';
    
    document.getElementById('wordList').style.display = 'block';

    // B. [需求 2] 更新麵包屑路徑：加入「選擇功能」
    updateBreadcrumb(['選擇功能', '單字庫', '學習列表']);

    // C. 啟用 Back 按鈕 (bButton)，讓它可以點擊回到 selectionArea
    const bButton = document.getElementById('bButton');
    if (bButton) {
        bButton.disabled = false;
        bButton.style.backgroundColor = ""; // 恢復顏色
        bButton.style.cursor = "pointer";
    }
    
    // D. 捲動到頂部
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function displayWordList(words, title) {
    // [需求 5] 隱藏學習列表標題
    const wordListTitle = document.getElementById("wordListTitle");
    if (wordListTitle) {
        wordListTitle.innerText = title;
        wordListTitle.style.display = "none"; // 始終隱藏
    }
    
    document.getElementById("mainPageContainer").style.display = "none";
    
    // [需求 4] 隱藏自動播放按鈕
    const autoPlayBtn = document.getElementById("autoPlayBtn");
    if (autoPlayBtn) autoPlayBtn.style.display = "none";
    
    let listContainer = document.getElementById("wordList");
    let wordItems = document.getElementById("wordItems");
    wordItems.innerHTML = "";

    // 按字母順序排序單字 (A-Z)
    words = words.sort((a, b) => {
        const wordA = (a.Words || a.word || a["單字"] || "").toLowerCase();
        const wordB = (b.Words || b.word || b["單字"] || "").toLowerCase();
        return wordA.localeCompare(wordB);
    });

    window.currentWordList = words;
    const vocabularyData = window.getVocabularyData(); // 從 auth-manager 獲取資料
    
    if (words.length === 0) {
        wordItems.innerHTML = "<p>⚠️ 找不到符合的單字</p>";
    } else {
        words.forEach(word => {
            let wordText = word.Words || word.word || word["單字"];
            let isChecked = (vocabularyData.checkedWords || []).includes(wordText);
            let isImportant = (vocabularyData.importantWords || []).includes(wordText);
            let isCustom = vocabularyData.customWords && vocabularyData.customWords[wordText];
            let editedIconHtml = isCustom ? `<span class="edited-icon" title="已編輯/自訂">✎</span>` : '';
            let iconSrc = isChecked ? "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/checked-icon.svg" : "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/check-icon.svg";

            let item = document.createElement('div');
            item.className = 'word-item-container';
            if (isChecked) item.classList.add("checked");

            item.innerHTML = `
                <input type='checkbox' class='important-checkbox' onchange='toggleImportant("${wordText}", this)' ${isImportant ? "checked" : ""}>
                <p class='word-item' data-word="${wordText}">
                    ${wordText}
                    ${editedIconHtml} 
                </p>
                <button class='play-word-btn' onclick='playSingleWord(event, "${wordText}")'>
                    <img src="https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/play.svg" alt="Play">
                </button>
                <button class='check-button' onclick='toggleCheck("${wordText}", this)'>
                    <img src="${iconSrc}" class="check-icon" alt="Check" width="24" height="24">
                </button>
            `;
            wordItems.appendChild(item);
        });
    }
    
    listContainer.style.display = "block";
    document.getElementById("wordDetails").style.display = "none";

    setTimeout(() => {
        document.querySelectorAll(".word-item").forEach(button => {
            button.addEventListener("click", function () {
                let wordText = this.dataset.word.trim();
                let wordObj = wordsData.find(w => (w.Words || w.word || w["單字"]).trim().toLowerCase() === wordText.toLowerCase());
                if (wordObj) showDetails(wordObj);
            });
        });
    }, 300);

    lastWordListType = "custom_selection";
}




function backToWordList() {
    if (isAutoPlaying) {
        isAutoPlaying = false;
        isPaused = false;
        updateAutoPlayButton();
    }
    // [優化] 使用 detailsSentencePlayer
    if (detailsSentencePlayer && !detailsSentencePlayer.paused) {
        detailsSentencePlayer.pause();
        detailsSentencePlayer.currentTime = 0;
    }

    if (timestampUpdateRafId) {
        cancelAnimationFrame(timestampUpdateRafId);
        timestampUpdateRafId = null;
    }

    document.getElementById("wordDetails").style.display = "none";
    document.getElementById("wordList").style.display = "block";
    
    // [需求 5] 隱藏學習列表標題
    const wordListTitle = document.getElementById("wordListTitle");
    if (wordListTitle) wordListTitle.style.display = "none";
    
    // [需求 4] 隱藏自動播放按鈕
    const autoPlayBtn = document.getElementById("autoPlayBtn");
    if (autoPlayBtn) autoPlayBtn.style.display = "none";
    
    document.getElementById("mainPageContainer").style.display = "none";
    
    // 更新麵包屑為學習列表
    if (typeof updateBreadcrumb === 'function') {
        updateBreadcrumb(['選擇功能', '單字庫', '學習列表']);
    }
}

function navigateTo(state) {
    if (historyStack.length === 0 || historyStack[historyStack.length - 1].word !== state.word) {
        historyStack.push(state);
    }
    if (historyStack.length > 10) {
        historyStack.shift();
    }
    console.log("📌 已新增至歷史紀錄:", historyStack);
}

function filterWords() {
    let input = document.getElementById("searchInput").value.toLowerCase();
    if (!wordsData || wordsData.length === 0) {
        console.error("❌ wordsData 為空，請檢查 JSON 是否成功載入");
        return;
    }

    let filtered = wordsData.filter(w => {
        let word = w.Words || w.word || w["單字"] || "";
        return word.toLowerCase().startsWith(input);
    });

    let searchResults = document.getElementById("searchResults");
    if (!searchResults) {
        searchResults = document.createElement("div");
        searchResults.id = "searchResults";
        document.getElementById("searchContainer").appendChild(searchResults);
    }

    if (input === "") {
        searchResults.innerHTML = "";
        return;
    }

    searchResults.innerHTML = filtered.length > 0
        ? filtered.map((w, index) => {
            let word = w.Words || w.word || w["單字"] || "";
            return `<p class='word-item' data-index='${index}'>${word}</p>`;
        }).join("")
        : "<p>⚠️ 找不到符合的單字</p>";

    document.querySelectorAll('.word-item').forEach((item, index) => {
        item.addEventListener("click", function () {
            showDetails(filtered[index]);
        });
    });
}

function filterWordsInDetails() {
    let input = document.getElementById("searchInputDetails").value.toLowerCase();
    let searchResults = document.getElementById("searchResultsDetails");
    let bButton = document.getElementById("bButton");

    if (!wordsData || wordsData.length === 0) {
        console.error("❌ wordsData 未載入");
        return;
    }

    if (!searchResults) return;

    if (input === "") {
        searchResults.innerHTML = "";
        bButton.disabled = true;
        bButton.style.backgroundColor = "#ccc";
        return;
    }

    bButton.disabled = false;
    bButton.style.backgroundColor = "#6c757d";

    let filtered = wordsData.filter(w => {
        let word = w.Words || w.word || w["單字"] || "";
        return word.toLowerCase().startsWith(input);
    });

    searchResults.innerHTML = "";
    if (filtered.length === 0) {
        searchResults.innerHTML = "<p>⚠️ 找不到符合的單字</p>";
    } else {
        filtered.forEach((wordObj, index) => {
            let word = wordObj.Words || wordObj.word || word["單字"] || "";
            let item = document.createElement("p");
            item.className = "word-item";
            item.textContent = word;
            item.addEventListener("click", function () {
                showDetails(wordObj);
            });
            searchResults.appendChild(item);
        });
    }
}

function toggleAutoPlay() {
    if (document.getElementById("wordList").style.display === "block") {
        if (!isAutoPlaying) startListAutoPlay();
        else if (!isPaused) pauseAutoPlay();
        else resumeAutoPlay();
    } else if (document.getElementById("wordDetails").style.display === "block") {
        if (!isAutoPlaying) startAutoPlay();
        else if (!isPaused) pauseAutoPlay();
        else resumeAutoPlay();
    }
    updateAutoPlayButton();
}

function startListAutoPlay() {
    if (!window.currentWordList || window.currentWordList.length === 0) {
        alert("單字列表為空，無法播放！");
        return;
    }
    isAutoPlaying = true;
    isPaused = false;
    if (typeof window.currentIndex === 'undefined' || window.currentIndex >= window.currentWordList.length) {
        window.currentIndex = 0;
    }
    let testAudio = new Audio();
    testAudio.play().catch(() => {
        alert("請手動點擊頁面以啟用自動播放 (瀏覽器限制)");
        isAutoPlaying = false;
        updateAutoPlayButton();
    });
    playNextWord();
}

function playSingleWord(event, wordText) {
    event.stopPropagation();
    if (isAutoPlaying) {
        isAutoPlaying = false;
        isPaused = false;
        updateAutoPlayButton();
    }
    if (currentAudio && !currentAudio.paused) currentAudio.pause();
    const wordIndex = window.currentWordList.findIndex(w => (w.Words || w.word || w["單字"]).trim().toLowerCase() === wordText.trim().toLowerCase());
    if (wordIndex === -1) return;
    window.currentIndex = wordIndex;
    highlightWord(wordText);
    const audioFile = `${encodeURIComponent(wordText)}.mp3`;
    currentAudio.src = `https://github.com/BoydYang-Designer/English-vocabulary/raw/main/audio_files/${audioFile}`;
    currentAudio.play().catch(err => removeHighlight(wordText));
    currentAudio.onended = () => removeHighlight(wordText);
}

function playNextWord() {
    if (window.currentIndex >= window.currentWordList.length) {
        isAutoPlaying = false;
        updateAutoPlayButton();
        return;
    }
    let wordObj = window.currentWordList[window.currentIndex];
    let wordText = (wordObj.Words || wordObj.word || wordObj["單字"] || "").trim();
    highlightWord(wordText);
    const itemElement = document.querySelector(`.word-item[data-word="${wordText}"]`)?.closest('.word-item-container');
    if (itemElement) {
        itemElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    currentAudio.src = `https://github.com/BoydYang-Designer/English-vocabulary/raw/main/audio_files/${encodeURIComponent(wordText)}.mp3`;
    let retryCount = 0;
    const maxRetries = 2;
    function attemptPlay() {
        currentAudio.play().then(() => {
            currentAudio.onended = () => {
                removeHighlight(wordText);
                if (!isPaused && isAutoPlaying) setTimeout(proceedToNextWord, 500);
            };
        }).catch(err => {
            retryCount++;
            if (retryCount <= maxRetries) setTimeout(attemptPlay, 1000);
            else proceedToNextWord();
        });
    }
    attemptPlay();
}

function proceedToNextWord() {
    window.currentIndex++;
    if (isAutoPlaying && !isPaused) playNextWord();
}

function highlightWord(wordText) {
    const currentActive = document.querySelector('.word-item-container.playing');
    if (currentActive) currentActive.classList.remove('playing');
    const item = document.querySelector(`.word-item[data-word="${wordText}"]`)?.closest('.word-item-container');
    if (item) item.classList.add('playing');
}

function removeHighlight(wordText) {
    const item = document.querySelector(`.word-item[data-word="${wordText}"]`)?.closest('.word-item-container');
    if (item) item.classList.remove('playing');
}

// --- [優化] 新增的輔助函數 ---

/**
 * [新增] 異步播放音訊的輔助函數
 * 它會回傳一個 Promise，在音訊播放結束、被暫停或出錯時解析 (resolve)。
 */
function playAudioAsync(audioPlayer) {
    return new Promise((resolve) => {
        // 檢查是否已經載入並可以播放
        audioPlayer.play().then(() => {
            // 正常結束
            audioPlayer.onended = () => {
                audioPlayer.onended = null;
                audioPlayer.onpause = null;
                audioPlayer.onerror = null;
                resolve();
            };
            
            // 被 'pauseAutoPlay' 呼叫暫停
            audioPlayer.onpause = () => {
                if (isPaused) { // 只有在 'isPaused' 標記為 true 時才視為暫停
                    audioPlayer.onended = null;
                    audioPlayer.onpause = null;
                    audioPlayer.onerror = null;
                    resolve();
                }
                // 否則，這可能是其他原因的暫停 (例如切換標籤頁)，播放器將保持暫停狀態
            };

            // 播放失敗
            audioPlayer.onerror = (e) => {
                console.warn(`音訊播放錯誤: ${audioPlayer.src}`, e);
                audioPlayer.onended = null;
                audioPlayer.onpause = null;
                audioPlayer.onerror = null;
                resolve(); // 出錯也 resolve，讓循環繼續
            };

        }).catch(e => {
            // 'play()' 呼叫本身失敗 (例如，音訊尚未載入完成)
             console.warn(`audio.play() 失敗: ${audioPlayer.src}`, e);
             resolve(); // 同樣 resolve 讓循環繼續
        });
    });
}

/**
 * [新增] 依序播放單字和句子的新函數
 * 這取代了 'playAudioSequentially' 的核心邏輯
 */
async function playWordAndSentenceSequence(word) {
    // 檢查是否在開始前就已經被暫停
    if (isPaused || !isAutoPlaying) return;

    // --- 1. UI 設置 ---
    const playBtn = document.getElementById("playAudioBtn");
    const pauseBtn = document.getElementById("pauseResumeBtn");
    if (playBtn) playBtn.classList.add("playing");
    if (pauseBtn) {
        pauseBtn.innerHTML = `<img src="https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/pause.svg" alt="Pause" width="24" height="24" />`;
        pauseBtn.classList.remove("playing");
    }
    document.getElementById('meaningContainer').scrollIntoView({ behavior: 'smooth', block: 'start' });

    // --- 2. 播放單字 ---
    detailsWordPlayer.src = `https://github.com/BoydYang-Designer/English-vocabulary/raw/main/audio_files/${encodeURIComponent(word.Words)}.mp3`;
    await playAudioAsync(detailsWordPlayer);

    // --- 檢查是否在播放單字時被暫停 ---
    if (isPaused || !isAutoPlaying) {
         if (playBtn) playBtn.classList.remove("playing"); // 重置UI
         return; 
    }

    // --- 3. 播放句子 ---
    detailsSentencePlayer.src = `https://github.com/BoydYang-Designer/English-vocabulary/raw/main/audio_files/${encodeURIComponent(word.Words)} - sentence.mp3`;
    
    // 播放前附加監聽器
    if (isTimestampMode) {
        if (timestampUpdateRafId) cancelAnimationFrame(timestampUpdateRafId);
        timestampUpdateLoop(); // 此函數會自我管理（檢查 paused 狀態）
    } else {
        detailsSentencePlayer.addEventListener('timeupdate', handleAutoScroll);
    }
    
    // 等待句子播放完畢
    await playAudioAsync(detailsSentencePlayer);

    // --- 4. 清理 ---
    detailsSentencePlayer.removeEventListener('timeupdate', handleAutoScroll);
    if (timestampUpdateRafId) cancelAnimationFrame(timestampUpdateRafId);
    timestampUpdateRafId = null;

    if (playBtn) playBtn.classList.remove("playing");
    if (pauseBtn) {
        pauseBtn.innerHTML = `<img src="https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/play-circle.svg" alt="Play" width="24" height="24" />`;
        pauseBtn.classList.add("playing");
    }
}

/**
 * [新增] 內文自動播放的主循環 (Loop)
 */
async function runDetailsAutoPlayLoop() {
    // 循環條件：自動播放開啟且未暫停
    while (isAutoPlaying && !isPaused) {
        
        // 檢查是否播完列表
        if (window.currentIndex >= window.currentWordList.length) {
            isAutoPlaying = false;
            updateAutoPlayButton();
            break; // 結束循環
        }

        const currentWord = window.currentWordList[window.currentIndex];
        
        // 1. 顯示UI (只顯示，不觸發播放)
        showDetails(currentWord);

        // 2. 播放音訊 (等待播放完畢)
        await playWordAndSentenceSequence(currentWord);

        // 3. 檢查是否在播放過程中被暫停或停止
        if (isPaused || !isAutoPlaying) {
            break; // 退出循環
        }

        // 4. 播放完畢，準備下一個
        window.currentIndex++;
        
        // 在單字之間加入短暫延遲 (例如 0.5 秒)
        // 再次檢查狀態，防止在 setTimeout 期間被暫停
        if (isAutoPlaying && !isPaused) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
}

// --- [優化] 修改過的控制函數 ---

function startAutoPlay() {
    if (!window.currentWordList || window.currentWordList.length === 0) {
        alert("開始自動播放前請先選擇一個單字列表！");
        return;
    }
    
    // 設置起始索引
    if (window.currentIndex < 0 || window.currentIndex >= window.currentWordList.length) {
        window.currentIndex = 0;
    }

    isAutoPlaying = true;
    isPaused = false;
    updateAutoPlayButton();

    // [修改] 呼叫新的循環函數
    runDetailsAutoPlayLoop();
}

function pauseAutoPlay() {
    isPaused = true;
    if (document.getElementById("wordList").style.display === "block") {
        if (currentAudio && !currentAudio.paused) {
            currentAudio.pause();
        }
    } else if (document.getElementById("wordDetails").style.display === "block") {
        // [修改] 暫停兩個全域播放器
        if (detailsWordPlayer && !detailsWordPlayer.paused) {
            detailsWordPlayer.pause();
        }
        if (detailsSentencePlayer && !detailsSentencePlayer.paused) {
            detailsSentencePlayer.pause();
        }
    }
    updateAutoPlayButton();
}

function resumeAutoPlay() {
    isPaused = false;
    updateAutoPlayButton(); // 先更新UI

    if (document.getElementById("wordList").style.display === "block") {
        playNextWord(); // 列表頁邏輯不變
    } else if (document.getElementById("wordDetails").style.display === "block") {
        // [修改] 重新啟動主循環
        // 循環會自動從 'window.currentIndex' 繼續
        runDetailsAutoPlayLoop();
    }
}

function toggleCheck(word, button) {
    const vocabularyData = window.getVocabularyData();
    if (!vocabularyData.checkedWords) vocabularyData.checkedWords = [];

    const isChecked = vocabularyData.checkedWords.includes(word);
    let icon = button.querySelector("img");
    let wordItemContainer = button.closest(".word-item-container");

    if (isChecked) {
        vocabularyData.checkedWords = vocabularyData.checkedWords.filter(w => w !== word);
        icon.src = "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/check-icon.svg";
        wordItemContainer.classList.remove("checked");
    } else {
        vocabularyData.checkedWords.push(word);
        icon.src = "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/checked-icon.svg";
        wordItemContainer.classList.add("checked");
    }
    window.setCheckedWords(vocabularyData.checkedWords);
    window.persistVocabularyData();
}

function createWordVariationsRegex(baseWord) {
    let stem = baseWord.toLowerCase();
    let pattern;
    if (stem.endsWith('e')) {
        stem = stem.slice(0, -1);
        pattern = `\\b${stem}(e|es|ed|ing)\\b`;
    } else if (stem.endsWith('y')) {
        stem = stem.slice(0, -1);
        pattern = `\\b${stem}(y|ies|ied|ier|iest|ying)\\b`;
    } else if (stem.endsWith('l')) {
        pattern = `\\b${stem}(s|led|ling)?\\b`;
    } else {
        pattern = `\\b${stem}(s|es|ed|ing)?\\b`;
    }
    return new RegExp(pattern, 'gi');
}

// 將時間字串 (hh:mm:ss.sss 或 mm:ss.sss) 轉換為秒的輔助函數
function timeToSeconds(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(':').reverse();
    let seconds = 0;
    if (parts[0]) seconds += parseFloat(parts[0]);
    if (parts[1]) seconds += parseInt(parts[1], 10) * 60;
    if (parts[2]) seconds += parseInt(parts[2], 10) * 3600;
    return seconds;
}

// 解析時間戳 TXT 內容的輔助函數
function parseTimestampText(text) {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    const data = [];
    const regex = /\[((?:\d{1,2}:)?\d{1,2}:\d{2}\.\d{3})\s*-->\s*((?:\d{1,2}:)?\d{1,2}:\d{2}\.\d{3})\]\s*(.*)/;
    
    for (const line of lines) {
        const match = line.match(regex);
        if (match) {
            data.push({
                start: timeToSeconds(match[1]),
                end: timeToSeconds(match[2]),
                sentence: match[3].trim()
            });
        } else {
            console.warn("無法解析的時間戳行:", line);
        }
    }
    return data;
}

// 時間戳模式的更新循環 (高亮和滾動)
function timestampUpdateLoop() {
    // [優化] 使用 detailsSentencePlayer
    if (!isTimestampMode || detailsSentencePlayer.paused || !detailsSentencePlayer.duration) {
        if (timestampUpdateRafId) {
            cancelAnimationFrame(timestampUpdateRafId);
            timestampUpdateRafId = null;
        }
        return;
    }

    // [修復] 如果正在跳轉句子，跳過這一幀的更新
    if (isSentenceJumping) {
        timestampUpdateRafId = requestAnimationFrame(timestampUpdateLoop);
        return;
    }

    const currentTime = detailsSentencePlayer.currentTime; // [優化]
    
    // 根據當前模式選擇容器
    const container = highlightModeActive 
        ? document.getElementById('highlight-meaning-container')
        : document.getElementById('meaningContainer');
    
    if (!container) return;

    // --- 1. 高亮邏輯 ---
    const currentSentenceData = timestampData.find(
        (item) => currentTime >= item.start && currentTime < item.end
    );
    
    let currentSentenceEl = null;
    if (currentSentenceData) {
        currentSentenceEl = container.querySelector(`.timestamp-sentence[data-start="${currentSentenceData.start}"]`);
    }

    // [優化] 只有在切換到新句子時才執行高亮和滾動
    if (currentSentenceEl !== lastHighlightedSentence) {
        // 移除前一個句子的高亮
        if (lastHighlightedSentence) {
            lastHighlightedSentence.classList.remove('is-current');
        }
        
        // 高亮當前句子並平滑滾動到固定位置
        if (currentSentenceEl) {
            currentSentenceEl.classList.add('is-current');
            
            // 計算滾動位置：讓句子固定在螢幕上方 1/3 處
            const containerHeight = container.clientHeight;
            const sentenceTop = currentSentenceEl.offsetTop;
            
            // 目標位置 = 句子頂部 - 容器高度的 1/3
            // 這樣句子就會出現在螢幕上方 1/3 的位置
            const targetScrollTop = sentenceTop - (containerHeight / 3);
            
            // 確保滾動位置在有效範圍內
            const maxScroll = container.scrollHeight - containerHeight;
            const finalScrollTop = Math.max(0, Math.min(targetScrollTop, maxScroll));
            
            // 🎯 微延遲後開始滾動，讓高亮動畫先啟動，視覺更自然
            setTimeout(() => {
                // 🌊 使用自訂的平滑滾動，提供更自然的緩動效果
                smoothScrollTo(container, finalScrollTop, 600);
            }, 50);
        }
        
        // 更新追蹤變數
        lastHighlightedSentence = currentSentenceEl;
    }

    timestampUpdateRafId = requestAnimationFrame(timestampUpdateLoop);
}


// [已修改] 渲染時間戳模式的內容
function renderTimestampContent() {
    const container = document.getElementById('meaningContainer');
    if (!container) return;

    container.innerHTML = '';
    const frag = document.createDocumentFragment();

    timestampData.forEach(item => {
        const p = document.createElement('p');
        p.className = 'timestamp-sentence';
        p.dataset.start = item.start;

        // 將句子拆分為單字和空白，然後將單字包裹在 span 中
        item.sentence.split(/(\s+)/).forEach(part => {
            if (part.trim() !== '') {
                const span = document.createElement('span');
                span.className = 'clickable-word';
                span.textContent = part;
                p.appendChild(span);
            } else {
                // 將空白作為文字節點附加以保持間距
                p.appendChild(document.createTextNode(part));
            }
        });
        frag.appendChild(p);
    });

    container.appendChild(frag);
}


// 在 JSON 和時間戳模式之間切換
function showDetails(word) {
    // 在顯示新單字時重置時間戳模式狀態
    isTimestampMode = true; // 統一使用 timestamp 模式
    hasTimestampFile = false;
    timestampData = [];
    if (timestampUpdateRafId) cancelAnimationFrame(timestampUpdateRafId);
    timestampUpdateRafId = null;
    lastHighlightedSentence = null;
    originalMeaningContent = "";
    
    let bButton = document.getElementById("bButton");
    let params = new URLSearchParams(window.location.search);
    lastSentenceListWord = word.Words;
    
    // [需求 4] 隱藏自動播放按鈕
    const autoPlayBtn = document.getElementById("autoPlayBtn");
    if (autoPlayBtn) autoPlayBtn.style.display = "none";
    
    if (document.getElementById("searchInputDetails").value.trim() !== "" || params.get('from') === "sentence") {
        bButton.disabled = false;
        bButton.style.backgroundColor = "#6c757d";
    }
    navigateTo({ page: "wordDetails", word: word });
    document.getElementById("mainPageContainer").style.display = "none";
    document.getElementById("wordList").style.display = "none";
    document.getElementById("wordDetails").style.display = "block";
    window.currentIndex = window.currentWordList.findIndex(w => (w.Words || w.word || w["單字"] || "").trim().toLowerCase() === (word.Words || word.word || word["單字"] || "").trim().toLowerCase());
    document.getElementById("searchInputDetails").value = "";
    document.getElementById("searchResultsDetails").innerHTML = "";
    let audioControls = document.querySelector(".audio-controls");
    if (audioControls) audioControls.style.display = "flex";
    let playButton = document.getElementById("playAudioBtn");
    if (playButton) {
        let audioFile = `${encodeURIComponent(word.Words)} - sentence.mp3`;
        playButton.setAttribute("onclick", `playSentenceAudio("${audioFile}")`);
        playButton.classList.remove("playing");
    }
    let pauseButton = document.getElementById("pauseResumeBtn");
    if (pauseButton) {
        pauseButton.classList.remove("playing");
        pauseButton.innerHTML = `<img src="https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/play-circle.svg" alt="Play" width="24" height="24" />`;
    }
    
    const vocabularyData = window.getVocabularyData();
    const isImportant = (vocabularyData.importantWords || []).includes(word.Words);
    
    const isCustomOrEdited = vocabularyData.customWords && vocabularyData.customWords[word.Words];

    let phonetics = `<div class="phonetics-container" style="display: flex; align-items: center; gap: 10px;">
        <input type='checkbox' class='important-checkbox' onchange='toggleImportant("${word.Words}", this)' ${isImportant ? "checked" : ""}>
        <div id="wordTitle" style="font-size: 20px; font-weight: bold;">${word.Words}</div>
        <button class="button" style="width: auto; height: 30px; font-size: 14px; padding: 0 10px; background-color: #A1887F;" onclick='openCurrentWordEdit()'>Edit</button>`;
    if (word["pronunciation-1"]) phonetics += `<button class='button' onclick='playAudio("${encodeURIComponent(word.Words)}.mp3")'>${word["pronunciation-1"]}</button>`;
    if (word["pronunciation-2"]) phonetics += `<button class='button' onclick='playAudio("${encodeURIComponent(word.Words)}-2.mp3")'>${word["pronunciation-2"]}</button>`;
    phonetics += `</div>`;
    
    let displayTagsHTML = '';
    const level = word["等級"];
    const categories = word["分類"];

    if (isCustomOrEdited) {
        displayTagsHTML += `<span class="category-tag edited-tag">✎ 已編輯</span>`;
    }
    if (level) displayTagsHTML += `<span class="level-tag">${level}</span>`;
    if (categories && Array.isArray(categories) && categories.length > 0) {
        displayTagsHTML += categories.map(cat => `<span class="category-tag">${cat}</span>`).join('');
    }
    
    let finalDisplayHTML = displayTagsHTML ? `<div class="category-display">${displayTagsHTML}</div>` : '';
    let formattedChinese = (word["traditional Chinese"] || "").replace(/(\d+)\./g, "<br><strong>$1.</strong> ").replace(/\s*([nN]\.|[vV]\.|[aA][dD][jJ]\.|[aA][dD][vV]\.|[pP][rR][eE][pP]\.|[cC][oO][nN][jJ]\.|[pP][rR][oO][nN]\.|[iI][nN][tT]\.)/g, "<br>$1 ").replace(/^<br>/, "");
    let chinese = `${finalDisplayHTML}<div>${formattedChinese}</div>`;
    let rawMeaning = word["English meaning"] || "";
    let formattedMeaning = rawMeaning.replace(/^Summary:?/gim, "<h3>Summary</h3>").replace(/Related Words:/gi, "<h3>Related Words:</h3>").replace(/Antonyms:/gi, "<h3>Antonyms:</h3>").replace(/Synonyms:/gi, "<h3>Synonyms:</h3>");
    formattedMeaning = formattedMeaning.replace(/(\s*\/?\s*As a (?:verb|noun|adjective|adverb|preposition|conjunction)\s*:?)/gi, "<br><br>$&");
    formattedMeaning = formattedMeaning.replace(/\n(\d+\.)/g, '</p><h4 class="meaning-number">$1</h4><p>');
    formattedMeaning = formattedMeaning.replace(/\n(E\.g\.|Example):/gi, '</p><p class="example"><strong>$1:</strong>');
    formattedMeaning = formattedMeaning.replace(/\n/g, "<br>");
    let meaning = `<div><p>${formattedMeaning.trim()}</p></div>`;
    meaning = meaning.replace(/<p><\/p>/g, '');
    const highlightRegex = createWordVariationsRegex(word.Words);
    meaning = meaning.replace(highlightRegex, match => `<span class="highlight-word">${match}</span>`);
    
    document.getElementById("phoneticContainer").innerHTML = phonetics;
    document.getElementById("chineseContainer").innerHTML = chinese;
    
    originalMeaningContent = meaning;
    document.getElementById("meaningContainer").innerHTML = meaning;

    const timestampUrl = `https://boydyang-designer.github.io/English-vocabulary/audio_files/${encodeURIComponent(word.Words)} - sentence Timestamp.txt`;
    
    fetch(timestampUrl)
        .then(response => {
            if (!response.ok) {
                if (response.status === 404) console.warn(`找不到 ${word.Words} 的時間戳檔案`);
                throw new Error('時間戳檔案不可用');
            }
            return response.text();
        })
        .then(text => {
            timestampData = parseTimestampText(text);
            if (timestampData.length > 0) {
                hasTimestampFile = true;
                
                // 自動渲染 timestamp 內容
                renderTimestampContent();
                if (!detailsSentencePlayer.paused) {
                    if (timestampUpdateRafId) cancelAnimationFrame(timestampUpdateRafId);
                    timestampUpdateLoop();
                }
            } else {
                console.warn(`${word.Words} 的時間戳檔案為空或無法解析。`);
            }
        })
        .catch(error => {
            hasTimestampFile = false; 
            console.error('載入時間戳檔案時出錯:', error.message);
        });

    document.getElementById("wordTitle").textContent = word.Words;
    displayNote();
    updateBackButton();
    loadHighlightedWords(); // 載入該單字的高亮標記
    
    const sentenceLinkBtn = document.getElementById("sentenceLinkBtn");
    if (sentenceLinkBtn) {
        sentenceLinkBtn.onclick = () => {
            const wordText = word.Words || word.word || word["單字"];
            if (wordText) {
                const relatedSentences = sentenceData.filter(s =>
                    s.Words && s.Words.startsWith(wordText + "-")
                );

                if (relatedSentences.length > 0) {
                    window.location.href = `sentence.html?showSentencesForWord=${encodeURIComponent(wordText)}&from=index`;
                } else {
                    showNotification(`⚠️ 找不到單字 "${wordText}" 的相關句子。`, 'error');
                }
            }
        };
    }

    // [優化] 刪除: if (isAutoPlaying && !isPaused) playAudioSequentially(word);
    // 播放邏輯現在由 runDetailsAutoPlayLoop 集中管理
    
    // [需求 2 & 6] 更新麵包屑：選擇功能›單字庫›學習列表›單字名稱
    if (typeof updateBreadcrumb === 'function') {
        const wordText = word.Words || word.word || word["單字"];
        updateBreadcrumb(['選擇功能', '單字庫', '學習列表', wordText]);
    }
}

// [優化] 刪除舊的 playAudioSequentially 函數
/*
function playAudioSequentially(word) {
    // ... 此函數已被刪除並由 playWordAndSentenceSequence 取代 ...
}
*/


function getFromPage() {
    return new URLSearchParams(window.location.search).get('from');
}

function updateAutoPlayButton() {
    let autoPlayBtn = document.getElementById("autoPlayBtn");
    let autoPlayDetailsBtn = document.getElementById("autoPlayDetailsBtn");

    if (document.getElementById("wordList").style.display === "block" && autoPlayBtn) {
        autoPlayBtn.textContent = isAutoPlaying ? (isPaused ? "繼續播放" : "停止播放") : "自動播放單字";
        autoPlayBtn.classList.toggle("playing", isAutoPlaying && !isPaused);
    } else if (document.getElementById("wordDetails").style.display === "block" && autoPlayDetailsBtn) {
        autoPlayDetailsBtn.textContent = isAutoPlaying ? (isPaused ? "繼續自動播放" : "暫停自動播放") : "自動播放內容";
        autoPlayDetailsBtn.classList.toggle("playing", isAutoPlaying && !isPaused);
    }
}


// --- 這裡是唯一的修改 ---
/**
 * [已修改] 更新 "Back" 按鈕的行為
 * - 來自 'quiz'：返回 quiz.html
 * - 來自 'story'：返回詞彙庫主頁 (backToFirstLayer)
 * - 預設 (來自詞彙庫內部)：返回單字列表 (backToWordList)
 */
function updateBackButton() {
    let fromPage = getFromPage(); //
    let backButton = null;

    // 尋找 "Back" 按鈕
    document.querySelectorAll('#wordDetails .button').forEach(button => {
        if (button.textContent.trim() === 'Back') {
            backButton = button;
        }
    });

    if (!backButton) return; // 沒找到按鈕就退出

    // 根據 'from' 參數設置不同的點擊行為
    if (fromPage === 'quiz') {
        backButton.onclick = returnToQuiz; //
        backButton.style.display = 'inline-block';
    } else if (fromPage === 'story') {
        // [方案一] 如果來自 story.js，"Back" 按鈕返回詞彙庫的主頁
        backButton.onclick = backToFirstLayer; //
        backButton.style.display = 'inline-block';
    } else {
        // 預設行為：返回單字列表
        backButton.onclick = backToWordList; //
        backButton.style.display = 'inline-block';
    }
}
// --- 修改結束 ---


function returnToQuiz() {
    window.location.href = 'quiz.html?returning=true';
}

function playAudio(filename) {
    new Audio("https://github.com/BoydYang-Designer/English-vocabulary/raw/main/audio_files/" + filename).play();
}

function playSentenceAudio(audioFile) {
    isAutoPlaying = false;
    isPaused = false;
    updateAutoPlayButton();
    // [優化] 使用 detailsSentencePlayer
    if (detailsSentencePlayer && !detailsSentencePlayer.paused) {
        detailsSentencePlayer.pause();
        detailsSentencePlayer.currentTime = 0;
        detailsSentencePlayer.removeEventListener('timeupdate', handleAutoScroll);
        if (timestampUpdateRafId) cancelAnimationFrame(timestampUpdateRafId);
        timestampUpdateRafId = null;
    }

    document.getElementById('meaningContainer').scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    detailsSentencePlayer.src = `https://github.com/BoydYang-Designer/English-vocabulary/raw/main/audio_files/${audioFile}`; // [優化]
    
    detailsSentencePlayer.addEventListener('play', () => { // [優化]
        if (isTimestampMode) {
            if (timestampUpdateRafId) cancelAnimationFrame(timestampUpdateRafId);
            timestampUpdateLoop();
        }
    });
    detailsSentencePlayer.addEventListener('pause', () => { // [優化]
        if (timestampUpdateRafId) cancelAnimationFrame(timestampUpdateRafId);
        timestampUpdateRafId = null;
    });
    detailsSentencePlayer.addEventListener('ended', () => { // [優化]
        if (timestampUpdateRafId) cancelAnimationFrame(timestampUpdateRafId);
        timestampUpdateRafId = null;
        if (lastHighlightedSentence) {
            lastHighlightedSentence.classList.remove('is-current');
            lastHighlightedSentence = null;
        }
        // [修復] 重置追蹤變數
        lastTrackedSentence = null;
    });

    detailsSentencePlayer.play().then(() => {
        // [修改] 移除舊的監聽器
        detailsSentencePlayer.removeEventListener('timeupdate', handleAutoScroll);
        detailsSentencePlayer.removeEventListener('timeupdate', handleTextTracking);
        
        // [新增] 添加文字追蹤（支援兩個容器）
        detailsSentencePlayer.addEventListener('timeupdate', handleTextTracking);

        let playBtn = document.getElementById("playAudioBtn");
        let pauseBtn = document.getElementById("pauseResumeBtn");
        if (playBtn) playBtn.classList.add("playing");
        if (pauseBtn) {
            pauseBtn.innerHTML = `<img src="https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/pause.svg" alt="Pause" width="24" height="24" />`;
            pauseBtn.classList.remove("playing");
        }
        detailsSentencePlayer.onended = () => {
            detailsSentencePlayer.removeEventListener('timeupdate', handleAutoScroll);
            detailsSentencePlayer.removeEventListener('timeupdate', handleTextTracking);
            // [修復] 重置追蹤變數
            lastTrackedSentence = null;
            if (playBtn) playBtn.classList.remove("playing");
            if (pauseBtn) {
                pauseBtn.innerHTML = `<img src="https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/play-circle.svg" alt="Play" width="24" height="24" />`;
                pauseBtn.classList.add("playing");
            }
        };
    }).catch(err => console.error("❌ 音訊播放失敗:", err));
}

function togglePauseAudio(button) {
    const playBtn = document.getElementById("playAudioBtn");
    const pauseBtn = button;
    // [優化] 使用 detailsSentencePlayer
    if (detailsSentencePlayer.paused || detailsSentencePlayer.ended) {
        document.getElementById('meaningContainer').scrollIntoView({ behavior: 'smooth', block: 'start' });
        detailsSentencePlayer.play().then(() => {
            if (playBtn) playBtn.classList.add("playing");
            if (pauseBtn) pauseBtn.classList.remove("playing");
            pauseBtn.innerHTML = `<img src="https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/pause.svg" alt="Pause" width="24" height="24" />`;
        });
    } else {
        detailsSentencePlayer.pause();
        // [修復] 暫停時立即停止更新循環並清除跳轉標記
        if (timestampUpdateRafId) {
            cancelAnimationFrame(timestampUpdateRafId);
            timestampUpdateRafId = null;
        }
        isSentenceJumping = false;
        if (playBtn) playBtn.classList.remove("playing");
        if (pauseBtn) pauseBtn.classList.add("playing");
        pauseBtn.innerHTML = `<img src="https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/play-circle.svg" alt="Play" width="24" height="24" />`;
    }
}

// --- [新增] Timestamp 模式跳轉輔助函數 ---

function skipToNextSentence() {
    // 使用 detailsSentencePlayer 作為播放器
    if (!timestampData || timestampData.length === 0 || !detailsSentencePlayer) return;
    
    // [修復] 設置跳轉標記，暫停更新循環
    isSentenceJumping = true;
    // [修復] 重置追蹤變數，確保滾動會執行
    lastTrackedSentence = null;
    
    const currentTime = detailsSentencePlayer.currentTime;
    // 找到第一個 "開始時間" 晚於當前時間的句子 (加 0.2s 緩衝)
    const nextSent = timestampData.find(line => line.start > currentTime + 0.2);
    
    if (nextSent) {
        detailsSentencePlayer.currentTime = nextSent.start;
    } else {
        // 找不到則跳到結束
        detailsSentencePlayer.currentTime = detailsSentencePlayer.duration;
    }
    
    // [修復] 延遲 100ms 後清除跳轉標記，讓更新循環恢復
    setTimeout(() => {
        isSentenceJumping = false;
    }, 100);
}

function skipToPrevSentence() {
    if (!timestampData || timestampData.length === 0 || !detailsSentencePlayer) return;

    // [修復] 設置跳轉標記，暫停更新循環
    isSentenceJumping = true;
    // [修復] 重置追蹤變數，確保滾動會執行
    lastTrackedSentence = null;

    const currentTime = detailsSentencePlayer.currentTime;
    
    // 1. 找出目前播放句子的索引
    let currentIndex = -1;
    for (let i = 0; i < timestampData.length; i++) {
        if (timestampData[i].start <= currentTime + 0.2) {
            currentIndex = i;
        } else {
            break; 
        }
    }

    if (currentIndex === -1) {
        detailsSentencePlayer.currentTime = 0;
        // [修復] 延遲後清除跳轉標記
        setTimeout(() => {
            isSentenceJumping = false;
        }, 100);
        return;
    }

    const currentSent = timestampData[currentIndex];

    // 2. 判斷邏輯：
    // 如果播放超過該句開頭 1.5 秒，按「倒轉」是重聽這一句
    // 如果剛開始播不到 1.5 秒，按「倒轉」是跳到上一句
    if (currentTime > currentSent.start + 1.5) {
        detailsSentencePlayer.currentTime = currentSent.start;
    } else {
        if (currentIndex > 0) {
            detailsSentencePlayer.currentTime = timestampData[currentIndex - 1].start;
        } else {
            detailsSentencePlayer.currentTime = 0;
        }
    }
    
    // [修復] 延遲 100ms 後清除跳轉標記，讓更新循環恢復
    setTimeout(() => {
        isSentenceJumping = false;
    }, 100);
}

function adjustAudioTime(seconds) {
    // 檢查播放器是否存在
    if (!detailsSentencePlayer || isNaN(detailsSentencePlayer.duration)) return;

    // [修改邏輯] 檢查是否為 Timestamp 模式且有資料
    if (isTimestampMode && hasTimestampFile && timestampData.length > 0) {
        if (seconds > 0) {
            // 正數代表快轉按鈕 -> 下一句
            skipToNextSentence();
        } else {
            // 負數代表倒轉按鈕 -> 上一句
            skipToPrevSentence();
        }
    } else {
        // [原始邏輯] 一般模式：增加或減少秒數
        detailsSentencePlayer.currentTime = Math.max(0, Math.min(detailsSentencePlayer.duration, detailsSentencePlayer.currentTime + seconds));
    }
}

function backToPrevious() {
    let params = new URLSearchParams(window.location.search);
    if (params.get('from') === "sentence" && params.get('sentenceId')) {
        window.location.href = `sentence.html?sentence=${encodeURIComponent(params.get('sentenceId'))}&layer=4`;
    } else if (historyStack.length > 1) {
        historyStack.pop();
        let previousState = historyStack[historyStack.length - 1];
        if (previousState.page === "wordDetails") showDetails(previousState.word);
    }
    if (historyStack.length <= 1) {
        let bButton = document.getElementById("bButton");
        bButton.disabled = true;
        bButton.style.backgroundColor = "#ccc";
    }
}

function toggleImportant(word, checkbox) {
    const vocabularyData = window.getVocabularyData();
    if (!vocabularyData.importantWords) vocabularyData.importantWords = [];

    if (checkbox.checked) {
        if (!vocabularyData.importantWords.includes(word)) {
            vocabularyData.importantWords.push(word);
        }
    } else {
        vocabularyData.importantWords = vocabularyData.importantWords.filter(w => w !== word);
    }
    window.setImportantWords(vocabularyData.importantWords);
    window.persistVocabularyData();
}

function saveNote(word = null, note = null, isTimestampAdd = false) {
    const currentWord = word || document.getElementById("wordTitle")?.textContent.trim();
    let noteToSave;

    if (!currentWord) return;

    const vocabularyData = window.getVocabularyData();
    if (!vocabularyData.notes) vocabularyData.notes = {};
    const existingNote = vocabularyData.notes[currentWord] || "";

    if (isTimestampAdd) {
        if (note && !existingNote.includes(note)) {
            noteToSave = existingNote + (existingNote ? "\n" : "") + note;
        } else {
            return; // 不重複添加
        }
    } else {
        noteToSave = document.getElementById("wordNote").value.trim();
    }
    
    if (noteToSave && noteToSave.length > 0) {
        vocabularyData.notes[currentWord] = noteToSave;
        if (!isTimestampAdd) showNotification("✅ 筆記已儲存!", 'success');
    } else {
        delete vocabularyData.notes[currentWord];
        if (!isTimestampAdd) showNotification("🗑️ 筆記已刪除!", 'success');
    }
    
    window.setNotes(vocabularyData.notes);
    window.persistVocabularyData();
    document.getElementById("wordNote").value = vocabularyData.notes[currentWord] || "";

    if (lastWordListType === "noteWords") showNoteWords();
}

function displayNote() {
    let word = document.getElementById("wordTitle")?.textContent.trim();
    if (word) {
        const vocabularyData = window.getVocabularyData();
        document.getElementById("wordNote").value = (vocabularyData.notes && vocabularyData.notes[word]) || "";
    }
}

document.addEventListener("keydown", function (event) {
    // [優化] 使用 detailsSentencePlayer
    if (!detailsSentencePlayer || isNaN(detailsSentencePlayer.duration) || document.activeElement === document.getElementById("wordNote")) return;
    switch (event.code) {
        case "Space":
            event.preventDefault();
            togglePauseAudio(document.getElementById('pauseResumeBtn'));
            break;
        case "ArrowRight":
            adjustAudioTime(5);
            break;
        case "ArrowLeft":
            adjustAudioTime(-5);
            break;
    }
});

function exportAllData() {
    try {
        const data = window.getVocabularyData();
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "my_english_learning_backup.json";
        a.click();
        URL.revokeObjectURL(url);
        showNotification("✅ 學習資料匯出成功!", "success");
    } catch (error) {
        showNotification("❌ 資料匯出失敗!", "error");
    }
}

function importAllData() {
    // 建立確認對話框
    const confirmImport = confirm(
        "⚠️ 匯入資料將會覆蓋現有的學習資料。\n\n" +
        "建議先匯出當前資料作為備份。\n\n" +
        "確定要繼續匯入嗎？"
    );
    
    if (!confirmImport) {
        return;
    }
    
    let input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = e => {
        let file = e.target.files[0];
        if (!file) return;
        
        // 檢查檔案大小（限制 10MB）
        if (file.size > 10 * 1024 * 1024) {
            showNotification("❌ 檔案太大！請選擇小於 10MB 的檔案。", "error");
            return;
        }
        
        let reader = new FileReader();
        reader.onload = event => {
            try {
                const data = JSON.parse(event.target.result);
                let importedCount = 0;
                
                // 驗證資料格式
                if (typeof data !== 'object' || data === null) {
                    throw new Error('無效的資料格式');
                }
                
                // 匯入各類資料
                if (data.checkedWords) {
                    window.setCheckedWords(data.checkedWords);
                    importedCount++;
                }
                
                if (data.importantWords) {
                    window.setImportantWords(data.importantWords);
                    importedCount++;
                }
                
                if (data.wrongWords) {
                    window.setWrongWords(data.wrongWords);
                    importedCount++;
                }
                
                if (data.notes) {
                    window.setNotes(data.notes);
                    importedCount++;
                }
                
                if (data.customWords) {
                    const vocab = window.getVocabularyData();
                    vocab.customWords = data.customWords;
                    importedCount++;
                }
                
                // 匯入畫重點資料
                if (data.highlightedWords) {
                    const vocab = window.getVocabularyData();
                    vocab.highlightedWords = data.highlightedWords;
                    importedCount++;
                }
                
                // 儲存所有變更
                window.persistVocabularyData();
                
                // 顯示成功訊息
                const message = importedCount > 0 
                    ? `✅ 學習資料匯入成功！共匯入 ${importedCount} 類資料。` 
                    : "⚠️ 檔案中沒有可匯入的資料。";
                
                showNotification(message, importedCount > 0 ? "success" : "warning");
                
                if (importedCount > 0) {
                    setTimeout(() => location.reload(), 1500);
                }
            } catch (error) {
                console.error('匯入錯誤:', error);
                showNotification(
                    "❌ 檔案匯入失敗！\n" + 
                    (error.message || "請確認檔案格式正確。"), 
                    "error"
                );
            }
        };
        
        reader.onerror = () => {
            showNotification("❌ 讀取檔案失敗！", "error");
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}


function displayWordDetailsFromURL() {
    let wordName = new URLSearchParams(window.location.search).get('word');
    if (!wordName || !wordsData || wordsData.length === 0) return;
    let wordData = wordsData.find(w => (w.Words || w.word || w["單字"]).toLowerCase() === wordName.toLowerCase());
    if (wordData) {
        showDetails(wordData);
    }
}

// [新增] 一般模式下的文字追蹤函數（用於 highlight-meaning-container）
// [新增] 用於追蹤上次高亮的句子（避免重複滾動）
let lastTrackedSentence = null;

function handleTextTracking() {
    if (!detailsSentencePlayer || detailsSentencePlayer.paused || !detailsSentencePlayer.duration) {
        return;
    }
    
    const currentTime = detailsSentencePlayer.currentTime;
    
    // 同時追蹤兩個容器
    const containers = [
        document.getElementById('meaningContainer'),
        document.getElementById('highlight-meaning-container')
    ].filter(c => c && c.style.display !== 'none');
    
    containers.forEach(container => {
        // [修改] 如果有 timestamp 資料，無論是否在 timestamp 模式都顯示句子高亮
        if (hasTimestampFile && timestampData && timestampData.length > 0) {
            const currentSentenceData = timestampData.find(
                (item) => currentTime >= item.start && currentTime < item.end
            );
            
            let currentSentenceEl = null;
            if (currentSentenceData) {
                currentSentenceEl = container.querySelector(`.timestamp-sentence[data-start="${currentSentenceData.start}"]`);
            }
            
            // [優化] 只有在切換到新句子時才更新高亮和滾動
            if (currentSentenceEl !== lastTrackedSentence) {
                // 移除之前的高亮
                const prevHighlighted = container.querySelector('.timestamp-sentence.is-current');
                if (prevHighlighted) {
                    prevHighlighted.classList.remove('is-current');
                }
                
                // 添加當前高亮並平滑滾動到固定位置
                if (currentSentenceEl) {
                    currentSentenceEl.classList.add('is-current');
                    
                    // 計算滾動位置：讓句子固定在螢幕上方 1/3 處
                    const containerHeight = container.clientHeight;
                    const sentenceTop = currentSentenceEl.offsetTop;
                    
                    // 目標位置 = 句子頂部 - 容器高度的 1/3
                    const targetScrollTop = sentenceTop - (containerHeight / 3);
                    
                    // 確保滾動位置在有效範圍內
                    const maxScroll = container.scrollHeight - containerHeight;
                    const finalScrollTop = Math.max(0, Math.min(targetScrollTop, maxScroll));
                    
                    // 🎯 微延遲後開始滾動，讓高亮動畫先啟動
                    setTimeout(() => {
                        // 🌊 使用自訂的平滑滾動，提供更自然的緩動效果
                        smoothScrollTo(container, finalScrollTop, 600);
                    }, 50);
                }
                
                // 更新追蹤變數
                lastTrackedSentence = currentSentenceEl;
            }
        } else if (!isTimestampMode) {
            // 一般模式且無 timestamp：使用自動滾動
            const scrollableHeight = container.scrollHeight - container.clientHeight;
            if (scrollableHeight > 0 && detailsSentencePlayer.duration > 0) {
                const scrollPosition = (currentTime / detailsSentencePlayer.duration) * scrollableHeight;
                container.scrollTo({ top: scrollPosition, behavior: 'smooth' });
            }
        }
    });
}

function handleAutoScroll() {
    const container = document.getElementById('meaningContainer');
    // [優化] 使用 detailsSentencePlayer
    if (!container || !detailsSentencePlayer || isNaN(detailsSentencePlayer.duration) || detailsSentencePlayer.duration === 0) return;
    const scrollableHeight = container.scrollHeight - container.clientHeight;
    if (scrollableHeight <= 0) return;
    const scrollPosition = (detailsSentencePlayer.currentTime / detailsSentencePlayer.duration) * scrollableHeight;
    container.scrollTo({ top: scrollPosition, behavior: 'smooth' });
}

// [已修改] 處理內文點擊的核心函數
function enableWordCopyOnClick() {
    const meaningContainer = document.getElementById("meaningContainer");
    if (!meaningContainer) return;

    meaningContainer.addEventListener('click', function(event) {
        // 總是在使用者用滑鼠選取文字時忽略點擊
        if (window.getSelection().toString().length > 0) return;

        if (isTimestampMode) {
            // --- TIMESTAMP 模式邏輯 ---
            if (detailsSentencePlayer && !detailsSentencePlayer.paused) { // [優化]
                // 播放中：點擊句子以跳轉音訊，不做其他事。
                const sentenceEl = event.target.closest('.timestamp-sentence');
                if (sentenceEl) {
                    const startTime = parseFloat(sentenceEl.dataset.start);
                    if (!isNaN(startTime)) {
                        detailsSentencePlayer.currentTime = startTime; // [優化]
                    }
                }
            } else {
                // [修改] 暫停中：點擊句子以複製句子內容。
                const sentenceEl = event.target.closest('.timestamp-sentence');
                if (sentenceEl) {
                    const sentenceText = sentenceEl.textContent.trim();
                    if (!sentenceText) return;

                    // 1. 複製到剪貼簿
                    navigator.clipboard.writeText(sentenceText)
                        .then(() => {
                            // 顯示成功通知
                            showNotification('✅ 句子已複製!', 'success');
                        })
                        .catch(err => {
                            console.error('❌ 複製失敗:', err);
                            showNotification('⚠️ 複製失敗，請手動複製', 'error');
                        });
                    
                    // 2. 點擊高亮效果 (使用現有的 CSS class)
                    sentenceEl.classList.add('word-click-highlight');
                    setTimeout(() => {
                        sentenceEl.classList.remove('word-click-highlight');
                    }, 600);
                }
            }
        } else {
            // --- 原始 JSON 模式邏輯 (保持不變) ---
            if (event.target.tagName !== 'P' && event.target.tagName !== 'DIV' && event.target.tagName !== 'SPAN') {
                return;
            }

            const range = document.caretRangeFromPoint(event.clientX, event.clientY);
            if (!range) return; 
            const textNode = range.startContainer;
            if (textNode.nodeType !== Node.TEXT_NODE) return; 

            const text = textNode.textContent;
            const offset = range.startOffset;

            let start = offset;
            let end = offset;
            const wordRegex = /[a-zA-Z]/; 

            while (start > 0 && wordRegex.test(text[start - 1])) {
                start--;
            }
            while (end < text.length && wordRegex.test(text[end])) {
                end++;
            }

            if (start === end) return; 
            const wordRange = document.createRange();
            wordRange.setStart(textNode, start);
            wordRange.setEnd(textNode, end);
            
            const selectedWord = wordRange.toString();
            const highlightSpan = document.createElement('span');
            highlightSpan.className = 'word-click-highlight';
            
            try {
                wordRange.surroundContents(highlightSpan);
                setTimeout(() => {
                    if (highlightSpan.parentNode) {
                        const parent = highlightSpan.parentNode;
                        while (highlightSpan.firstChild) {
                            parent.insertBefore(highlightSpan.firstChild, highlightSpan);
                        }
                        parent.removeChild(highlightSpan);
                        parent.normalize(); 
                    }
                }, 600); 
            } catch (e) {
                console.error("高亮效果失敗:", e);
            }

            // 複製單字到搜尋框
            navigator.clipboard.writeText(selectedWord)
                .then(() => {
                    const searchInput = document.getElementById('searchInputDetails');
                    if (searchInput) {
                        searchInput.value = selectedWord;
                        searchInput.focus(); 
                        filterWordsInDetails(); 
                    }
                })
                .catch(err => {
                    console.error('❌ 複製失敗:', err);
                    showNotification('⚠️ 複製失敗，請手動複製', 'error');
                });
        }
    });
}

function openCurrentWordEdit() {
    const wordTitle = document.getElementById("wordTitle").textContent.trim();
    const wordObj = wordsData.find(w => (w.Words || w.word || w["單字"]) === wordTitle);
    if (wordObj) {
        openEditModal(wordObj);
    }
}

// --- 自訂/編輯單字功能 ---

function openEditModal(wordObj = null) {
    const modal = document.getElementById('wordEditorModal');
    const deleteBtn = document.getElementById('btn-delete-word');
    const title = document.getElementById('modalTitle');
    
    // 填充分類下拉選單
    populateCategoryDataLists();
    
    // 清空或填入表單
    if (wordObj) {
        // 編輯模式
        title.textContent = "編輯單字";
        document.getElementById('edit-word').value = wordObj.Words || wordObj.word || wordObj["單字"];
        document.getElementById('edit-word').disabled = true; 
        
        document.getElementById('edit-chinese').value = wordObj["traditional Chinese"] || "";
        document.getElementById('edit-meaning').value = wordObj["English meaning"] || "";
        
        let cats = wordObj["分類"] || [];
        
        // 設定 domain
        const domainSelect = document.getElementById('edit-domain-select');
        const domainInput = document.getElementById('edit-domain');
        if (cats[0]) {
            domainSelect.value = cats[0];
            domainInput.value = cats[0];
            domainInput.style.display = 'none';
        } else {
            domainSelect.value = "";
            domainInput.value = "";
            domainInput.style.display = 'none';
        }
        
        // 設定 topic
        const topicSelect = document.getElementById('edit-topic-select');
        const topicInput = document.getElementById('edit-topic');
        if (cats[1]) {
            topicSelect.value = cats[1];
            topicInput.value = cats[1];
            topicInput.style.display = 'none';
        } else {
            topicSelect.value = "";
            topicInput.value = "";
            topicInput.style.display = 'none';
        }
        
        // 設定 source
        const sourceSelect = document.getElementById('edit-source-select');
        const sourceInput = document.getElementById('edit-source');
        if (cats[2]) {
            sourceSelect.value = cats[2];
            sourceInput.value = cats[2];
            sourceInput.style.display = 'none';
        } else {
            sourceSelect.value = "";
            sourceInput.value = "";
            sourceInput.style.display = 'none';
        }
        
        document.getElementById('edit-level').value = wordObj["等級"] || "未分類";
        
        // ... (刪除按鈕的邏輯保持不變) ...
        const vocabData = window.getVocabularyData();
        const wordKey = (wordObj.Words || wordObj.word || wordObj["單字"]).trim();
        if (vocabData.customWords && vocabData.customWords[wordKey]) {
            deleteBtn.style.display = 'block';
            deleteBtn.setAttribute('data-word', wordKey);
        } else {
            deleteBtn.style.display = 'none';
        }

    } else {
        // 新增模式
        title.textContent = "新增單字";
        document.getElementById('edit-word').value = "";
        document.getElementById('edit-word').disabled = false;
        document.getElementById('edit-chinese').value = "";
        document.getElementById('edit-meaning').value = "";
        
        // 重置所有選單
        document.getElementById('edit-domain-select').value = "";
        document.getElementById('edit-domain').value = "";
        document.getElementById('edit-domain').style.display = 'none';
        
        document.getElementById('edit-topic-select').value = "";
        document.getElementById('edit-topic').value = "";
        document.getElementById('edit-topic').style.display = 'none';
        
        document.getElementById('edit-source-select').value = "";
        document.getElementById('edit-source').value = "";
        document.getElementById('edit-source').style.display = 'none';
        
        document.getElementById('edit-level').value = "未分類";
        deleteBtn.style.display = 'none';
    }

    modal.classList.remove('is-hidden');
}
function closeEditModal() {
    document.getElementById('wordEditorModal').classList.add('is-hidden');
}

// 儲存單字
function saveCustomWord() {
    const wordText = document.getElementById('edit-word').value.trim();
    if (!wordText) {
        alert("請輸入單字！");
        return;
    }

    // [修改] 獲取來源輸入框的值，如果為空則預設為 "UserCustom" 或空字串
    const sourceValue = document.getElementById('edit-source').value.trim();

    const newWordObj = {
        "Words": wordText,
        "traditional Chinese": document.getElementById('edit-chinese').value.trim(),
        "English meaning": document.getElementById('edit-meaning').value.trim(),
        "分類": [
            document.getElementById('edit-domain').value.trim(),
            document.getElementById('edit-topic').value.trim(),
            sourceValue || "UserCustom" // [修改] 使用輸入的值，若無輸入則標記為 UserCustom
        ],
        "等級": document.getElementById('edit-level').value,
        "lastModified": new Date().toISOString()
    };

    // 1. 更新 LocalStorage
    const vocabData = window.getVocabularyData();
    if (!vocabData.customWords) vocabData.customWords = {};
    
    vocabData.customWords[wordText] = newWordObj;
    window.persistVocabularyData(); 

    // 2. 更新記憶體中的 wordsData
    const existingIndex = wordsData.findIndex(w => (w.Words || w.word || w["單字"]) === wordText);
    if (existingIndex !== -1) {
        wordsData[existingIndex] = newWordObj; // 更新
    } else {
        wordsData.push(newWordObj); // 新增
    }

    showNotification(`✅ 單字 ${wordText} 已儲存！`, 'success');
    closeEditModal();

    // 3. 刷新介面
    if (document.getElementById('wordDetails').style.display === 'block') {
        showDetails(newWordObj);
    }
    // [修改] 重新建立所有分類按鈕，包含來源按鈕
    createDomainButtons();
    createTopicButtons();
    createSourceButtons(); // [新增] 確保來源按鈕也會更新
}

// 刪除自訂單字 (回復原狀或刪除)
function deleteCustomWord() {
    const btn = document.getElementById('btn-delete-word');
    const wordText = btn.getAttribute('data-word');
    
    if (!confirm(`確定要刪除自訂單字 "${wordText}" 嗎？\n如果這是系統原有單字，將會回復到預設值。`)) return;

    const vocabData = window.getVocabularyData();
    if (vocabData.customWords && vocabData.customWords[wordText]) {
        delete vocabData.customWords[wordText];
        window.persistVocabularyData();
        
        showNotification("🗑️ 已移除自訂內容，請重新整理頁面以載入原始資料 (如果有)。", "success");
        closeEditModal();
        
        setTimeout(() => location.reload(), 1500);
    }
}
// ========== 畫重點模式功能 ==========
let highlightModeActive = false;
let highlightedWords = new Set(); // 儲存被標記為重點的單字
let wordLongPressTimer = null;
let wordLongPressTarget = null;

// [新增] 片語拖曳選擇的變數
let isDraggingPhrase = false;
let dragStartElement = null;
let selectedPhraseElements = [];

function enterHighlightModeEnhanced() {
    highlightModeActive = true;
    const container = document.getElementById('highlight-mode-container');
    const meaningContainer = document.getElementById('meaningContainer');
    const highlightMeaningContainer = document.getElementById('highlight-meaning-container');
    
    if (container && meaningContainer && highlightMeaningContainer) {
        // 複製內容到畫重點模式容器
        highlightMeaningContainer.innerHTML = meaningContainer.innerHTML;
        
        // 將所有單字包裝成可點擊和長按的元素
        wrapWordsInHighlightMode(highlightMeaningContainer);
        
        // 恢復之前的高亮狀態
        restoreHighlightedWords(highlightMeaningContainer);
        
        container.classList.add('active');
        
        // [新增] 全域 mouseup 事件監聽器 - 處理在容器外放開的情況
        document.addEventListener('mouseup', handleGlobalMouseUp);
    }
}

// [新增] 全域 mouseup 處理函數
function handleGlobalMouseUp(e) {
    if (isDraggingPhrase && selectedPhraseElements.length > 0) {
        handlePhraseSelection(selectedPhraseElements);
        isDraggingPhrase = false;
        dragStartElement = null;
        selectedPhraseElements = [];
    }
    if (wordLongPressTimer) {
        clearTimeout(wordLongPressTimer);
        wordLongPressTimer = null;
    }
}

function exitHighlightMode() {
    highlightModeActive = false;
    const container = document.getElementById('highlight-mode-container');
    if (container) {
        container.classList.remove('active');
    }
    
    // 停止播放
    if (detailsSentencePlayer && !detailsSentencePlayer.paused) {
        detailsSentencePlayer.pause();
    
    }
    // [新增] 移除全域事件監聽器
    document.removeEventListener('mouseup', handleGlobalMouseUp);
    
    // [新增] 清理拖曳狀態
    if (isDraggingPhrase) {
        selectedPhraseElements.forEach(el => el.classList.remove('phrase-selecting'));
        isDraggingPhrase = false;
        dragStartElement = null;
        selectedPhraseElements = [];
    }
    
    // [新增] 退出時同步高亮到 meaningContainer
    const meaningContainer = document.getElementById('meaningContainer');
    if (meaningContainer) {
        // 確保 meaningContainer 已包裹單字
        wrapWordsInMeaningContainer(meaningContainer);
        // 恢復高亮
        restoreHighlightedWords(meaningContainer);
    }
}

// [新增] 包裹 meaningContainer 中的單字（一般模式）
function wrapWordsInMeaningContainer(container) {
    // 如果已經包裹過了，就不要重複包裹
    if (container.querySelector('.highlight-mode-word')) {
        return;
    }
    
    // 一般模式:包裝所有單字,分離標點符號
    const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    
    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
        if (node.parentElement.tagName !== 'SCRIPT' && 
            node.parentElement.tagName !== 'STYLE' &&
            !node.parentElement.classList.contains('highlight-mode-word') &&
            !node.parentElement.classList.contains('phrase-highlight-wrapper')) {
            textNodes.push(node);
        }
    }
    
    textNodes.forEach(textNode => {
        const text = textNode.textContent;
        // 使用更精確的正則表達式分割:保留空格、單字和標點符號
        // 匹配: 單字(含可能的撇號) | 空格 | 標點符號
        const parts = text.split(/(\s+|[a-zA-Z']+|[.,!?;:"""''()—–-])/);
        const fragment = document.createDocumentFragment();
        
        parts.forEach(part => {
            if (!part) return; // 跳過空字串
            
            // 判斷是否為單字(只包含字母和撇號)
            if (/^[a-zA-Z']+$/.test(part)) {
                const span = document.createElement('span');
                span.className = 'highlight-mode-word';
                span.textContent = part;
                fragment.appendChild(span);
            } else {
                // 空格或標點符號,直接作為文本節點
                fragment.appendChild(document.createTextNode(part));
            }
        });
        
        if (fragment.childNodes.length > 0) {
            textNode.parentNode.replaceChild(fragment, textNode);
        }
    });
}

function wrapWordsInHighlightMode(container) {
    if (isTimestampMode) {
        // Timestamp 模式:只包裝可點擊的單字
        const clickableWords = container.querySelectorAll('.clickable-word');
        clickableWords.forEach(span => {
            span.classList.add('highlight-mode-word');
            setupWordInteraction(span);
        });
    } else {
        // 一般模式:包裝所有單字,分離標點符號
        const walker = document.createTreeWalker(
            container,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
            if (node.parentElement.tagName !== 'SCRIPT' && 
                node.parentElement.tagName !== 'STYLE' &&
                !node.parentElement.classList.contains('highlight-mode-word') &&
                !node.parentElement.classList.contains('phrase-highlight-wrapper')) {
                textNodes.push(node);
            }
        }
        
        textNodes.forEach(textNode => {
            const text = textNode.textContent;
            // [修改] 使用更精確的正則表達式分割:保留空格、單字和標點符號
            // 匹配: 單字(含可能的撇號) | 空格 | 標點符號
            const parts = text.split(/(\s+|[a-zA-Z']+|[.,!?;:"""''()—–-])/);
            const fragment = document.createDocumentFragment();
            
            parts.forEach(part => {
                if (!part) return; // 跳過空字串
                
                // 判斷是否為單字(只包含字母和撇號)
                if (/^[a-zA-Z']+$/.test(part)) {
                    const span = document.createElement('span');
                    span.className = 'highlight-mode-word';
                    span.textContent = part;
                    setupWordInteraction(span);
                    fragment.appendChild(span);
                } else {
                    // 空格或標點符號,直接作為文本節點
                    fragment.appendChild(document.createTextNode(part));
                }
            });
            
            if (fragment.childNodes.length > 0) {
                textNode.parentNode.replaceChild(fragment, textNode);
            }
        });
    }
}

function setupWordInteraction(wordElement) {
    // 點擊事件
    wordElement.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!isDraggingPhrase) {
            handleWordClick(wordElement);
        }
    });
    
    // [修改] 長按+拖曳事件 - 支援片語選擇
    wordElement.addEventListener('mousedown', (e) => {
        e.preventDefault();
        wordLongPressTarget = wordElement;
        dragStartElement = wordElement;
        
        wordLongPressTimer = setTimeout(() => {
            // 長按0.8秒觸發:進入畫重點模式(顯示淺黃底預覽)
            isDraggingPhrase = true;
            selectedPhraseElements = [wordElement];
            wordElement.classList.add('phrase-selecting');
        }, 800); // 800ms (0.8秒) 為長按
    });
    
    // [新增] 拖曳選擇邏輯
    wordElement.addEventListener('mouseenter', (e) => {
        if (isDraggingPhrase && dragStartElement) {
            // 在拖曳模式下,加入這個單字到選擇範圍
            if (!selectedPhraseElements.includes(wordElement)) {
                selectedPhraseElements.push(wordElement);
                wordElement.classList.add('phrase-selecting');
            }
        }
    });
    
    wordElement.addEventListener('mouseup', () => {
        if (wordLongPressTimer) {
            clearTimeout(wordLongPressTimer);
            wordLongPressTimer = null;
        }
        
        // [修改] 如果處於拖曳模式,放開時才完成高亮
        if (isDraggingPhrase && selectedPhraseElements.length > 0) {
            handlePhraseSelection(selectedPhraseElements);
            isDraggingPhrase = false;
            dragStartElement = null;
            selectedPhraseElements = [];
        }
    });
    
    wordElement.addEventListener('mouseleave', () => {
        if (wordLongPressTimer && !isDraggingPhrase) {
            clearTimeout(wordLongPressTimer);
            wordLongPressTimer = null;
        }
    });
    
    // 觸控支援
    wordElement.addEventListener('touchstart', (e) => {
        e.preventDefault();
        wordLongPressTarget = wordElement;
        dragStartElement = wordElement;
        wordLongPressTimer = setTimeout(() => {
            // 觸控長按:進入畫重點模式
            isDraggingPhrase = true;
            selectedPhraseElements = [wordElement];
            wordElement.classList.add('phrase-selecting');
        }, 800);
    });
    
    wordElement.addEventListener('touchmove', (e) => {
        if (isDraggingPhrase) {
            // 取得觸控點下的元素
            const touch = e.touches[0];
            const elementAtPoint = document.elementFromPoint(touch.clientX, touch.clientY);
            
            if (elementAtPoint && elementAtPoint.classList.contains('highlight-mode-word')) {
                if (!selectedPhraseElements.includes(elementAtPoint)) {
                    selectedPhraseElements.push(elementAtPoint);
                    elementAtPoint.classList.add('phrase-selecting');
                }
            }
        }
    });
    
    wordElement.addEventListener('touchend', () => {
        if (wordLongPressTimer) {
            clearTimeout(wordLongPressTimer);
            wordLongPressTimer = null;
        }
        
        // 觸控放開時完成高亮
        if (isDraggingPhrase && selectedPhraseElements.length > 0) {
            handlePhraseSelection(selectedPhraseElements);
            isDraggingPhrase = false;
            dragStartElement = null;
            selectedPhraseElements = [];
        } else if (wordLongPressTarget === wordElement) {
            // 如果沒有觸發長按,視為點擊
            handleWordClick(wordElement);
        }
        
        wordLongPressTarget = null;
    });
}


// [新增] 同步高亮到 meaningContainer
function syncHighlightToMeaningContainer(phrase, isHighlighted) {
    const meaningContainer = document.getElementById('meaningContainer');
    if (!meaningContainer) return;
    
    const words = phrase.split(' ');
    const phraseKey = words.join('-').toLowerCase();
    
    if (isHighlighted) {
        // 添加高亮
        if (words.length === 1) {
            // 單字高亮
            const wordElements = meaningContainer.querySelectorAll('.highlight-mode-word');
            wordElements.forEach(wordEl => {
                if (wordEl.textContent.trim() === phrase) {
                    wordEl.classList.add('highlighted');
                }
            });
        } else {
            // 片語高亮
            const allWords = Array.from(meaningContainer.querySelectorAll('.highlight-mode-word'));
            
            for (let i = 0; i < allWords.length; i++) {
                let match = true;
                const phraseElements = [];
                
                for (let j = 0; j < words.length && i + j < allWords.length; j++) {
                    const wordText = allWords[i + j].textContent.trim();
                    if (wordText.toLowerCase() === words[j].toLowerCase()) {
                        phraseElements.push(allWords[i + j]);
                    } else {
                        match = false;
                        break;
                    }
                }
                
                if (match && phraseElements.length === words.length) {
                    wrapPhraseElements(phraseElements, phrase, phraseKey);
                    i += words.length - 1;
                }
            }
        }
    } else {
        // 移除高亮
        if (words.length === 1) {
            const wordElements = meaningContainer.querySelectorAll('.highlight-mode-word');
            wordElements.forEach(wordEl => {
                if (wordEl.textContent.trim() === phrase) {
                    wordEl.classList.remove('highlighted');
                }
            });
        } else {
            // 移除片語高亮
            const phraseWrappers = meaningContainer.querySelectorAll('.phrase-highlight-wrapper');
            phraseWrappers.forEach(wrapper => {
                if (wrapper.getAttribute('data-phrase') === phrase) {
                    const parent = wrapper.parentNode;
                    const textContent = wrapper.textContent;
                    const textNode = document.createTextNode(textContent);
                    parent.replaceChild(textNode, wrapper);
                }
            });
        }
    }
}
// [新增] 處理片語選擇的函數
function handlePhraseSelection(phraseElements) {
    // 移除選擇預覽效果(淺黃底)
    phraseElements.forEach(el => el.classList.remove('phrase-selecting'));
    
    // 取得所有單字,過濾掉標點符號
    const words = phraseElements
        .map(el => el.textContent.trim())
        .filter(w => w && /[a-zA-Z]/.test(w)); // 只保留包含字母的內容
    
    if (words.length === 0) return;
    
    // 組成片語或單字
    const phrase = words.join(' ');
    const phraseKey = words.join('-').toLowerCase(); // 例如: in-search-of
    
    // 檢查是否已經被標記為片語
    const existingPhraseSpan = phraseElements[0].closest('.phrase-highlight-wrapper');
    
    if (existingPhraseSpan) {
        // 已經是片語,取消高亮
        const parent = existingPhraseSpan.parentNode;
        const textContent = existingPhraseSpan.textContent;
        
        // 恢復為普通文本
        const textNode = document.createTextNode(textContent);
        parent.replaceChild(textNode, existingPhraseSpan);
        
        // 從記錄中移除
        highlightedWords.delete(phrase);
        removePhraseMapping(phraseElements);
        
        // [新增] 同步移除 meaningContainer 的高亮
        syncHighlightToMeaningContainer(phrase, false);
        
        if (words.length === 1) {
            showNotification(`已取消重點: ${phrase}`, 'info');
        } else {
            showNotification(`已取消片語重點: ${phrase}`, 'info');
        }
    } else {
        // 新增高亮
        if (words.length === 1) {
            // 單字高亮 - 保持原樣,不用包裹
            phraseElements.forEach(el => el.classList.add('highlighted'));
            highlightedWords.add(phrase);
            showNotification(`✨ 已標記重點: ${phrase}`, 'success');
        } else {
            // 片語高亮 - 用連續的span包裹
            wrapPhraseElements(phraseElements, phrase, phraseKey);
            highlightedWords.add(phrase);
            showNotification(`✨ 已標記片語重點: ${phrase}`, 'success');
            playPhrasePronunciation(phraseKey);
            addPhraseToCustomWords(phrase, phraseKey);
        }
        
        // [新增] 同步添加 meaningContainer 的高亮
        syncHighlightToMeaningContainer(phrase, true);
    }
    
    // 儲存到localStorage
    saveHighlightedWords();
}

// [新增] 將片語元素包裹成一個連續的高亮區塊
function wrapPhraseElements(phraseElements, phrase, phraseKey) {
    if (phraseElements.length === 0) return;
    
    // 找到第一個和最後一個元素
    const firstElement = phraseElements[0];
    const lastElement = phraseElements[phraseElements.length - 1];
    
    // 創建包裹的span
    const phraseSpan = document.createElement('span');
    phraseSpan.className = 'phrase-highlight-wrapper highlighted';
    phraseSpan.setAttribute('data-phrase', phrase);
    phraseSpan.setAttribute('data-phrase-key', phraseKey);
    
    // 收集所有要包裹的內容
    let currentNode = firstElement;
    const nodesToWrap = [];
    
    while (currentNode) {
        nodesToWrap.push(currentNode);
        if (currentNode === lastElement) break;
        currentNode = currentNode.nextSibling;
    }
    
    // 將所有節點移到新的span中
    const parent = firstElement.parentNode;
    
    // 在移除節點之前，先保存插入位置的參考
    const insertBeforeNode = firstElement;
    
    nodesToWrap.forEach(node => {
        phraseSpan.appendChild(node.cloneNode(true));
    });
    
    // 在移除原始節點之前插入新的包裹span
    parent.insertBefore(phraseSpan, insertBeforeNode);
    
    // 然後移除原始節點
    nodesToWrap.forEach(node => node.remove());
    
    // 為片語span添加點擊事件
    phraseSpan.addEventListener('click', (e) => {
        e.stopPropagation();
        if (detailsSentencePlayer.paused) {
            playPhrasePronunciation(phraseKey);
            copyToClipboard(phrase);
            // 添加閃爍效果
            phraseSpan.classList.add('word-flash');
            setTimeout(() => {
                phraseSpan.classList.remove('word-flash');
            }, 300);
        }
    });
    
    // 儲存片語映射關係(用於點擊時識別)
    storePhraseMapping(phraseSpan, phrase, phraseKey);
}

// [新增] 儲存片語映射關係
function storePhraseMapping(element, phrase, phraseKey) {
    if (!window.phraseElementMap) {
        window.phraseElementMap = new WeakMap();
    }
    window.phraseElementMap.set(element, { phrase, phraseKey });
}

// [新增] 移除片語映射
function removePhraseMapping(elements) {
    if (!window.phraseElementMap) return;
    elements.forEach(el => {
        const wrapper = el.closest('.phrase-highlight-wrapper');
        if (wrapper && window.phraseElementMap.has(wrapper)) {
            window.phraseElementMap.delete(wrapper);
        }
    });
}

// [新增] 播放片語發音
function playPhrasePronunciation(phraseKey) {
    const audioUrl = `https://github.com/BoydYang-Designer/English-vocabulary/raw/main/audio_files/${encodeURIComponent(phraseKey)}.mp3`;
    const audio = new Audio(audioUrl);
    
    audio.play().catch(error => {
        console.log(`片語 MP3 (${phraseKey}.mp3) 未找到`);
        // 如果片語MP3不存在,可以依序播放各個單字的發音
        // (未來可擴展)
    });
}

// [新增] 將片語添加到自訂單字區
function addPhraseToCustomWords(phrase, phraseKey) {
    const vocabData = window.getVocabularyData();
    if (!vocabData.customWords) vocabData.customWords = {};
    
    // 檢查是否已存在
    if (vocabData.customWords[phrase]) {
        console.log(`片語 "${phrase}" 已存在於自訂單字區`);
        return;
    }
    
    // 創建新的片語物件
    const newPhraseObj = {
        "Words": phrase,
        "traditional Chinese": "", // 使用者可以之後編輯
        "English meaning": `Phrase: ${phrase}`, // 預設說明
        "分類": [
            "Phrases（片語）",
            "User Highlighted",
            "UserCustom"
        ],
        "等級": "片語",
        "lastModified": new Date().toISOString(),
        "phraseKey": phraseKey // 儲存用於播放MP3的key
    };
    
    // 添加到customWords
    vocabData.customWords[phrase] = newPhraseObj;
    window.persistVocabularyData();
    
    // 添加到wordsData以便即時使用
    const existingIndex = wordsData.findIndex(w => (w.Words || w.word || w["單字"]) === phrase);
    if (existingIndex === -1) {
        wordsData.push(newPhraseObj);
    }
    
    console.log(`✅ 片語 "${phrase}" 已自動新增到自訂單字區`);
}

function handleWordClick(wordElement) {
    // 只在暫停狀態下才播放單字發音
    if (detailsSentencePlayer.paused) {
        // [新增] 檢查是否屬於片語高亮
        const phraseWrapper = wordElement.closest('.phrase-highlight-wrapper');
        
        if (phraseWrapper) {
            // 點擊的是片語中的單字,播放整個片語的MP3
            const phrase = phraseWrapper.getAttribute('data-phrase');
            const phraseKey = phraseWrapper.getAttribute('data-phrase-key');
            
            if (phraseKey) {
                playPhrasePronunciation(phraseKey);
                copyToClipboard(phrase);
                // 添加閃爍效果到整個片語
                phraseWrapper.classList.add('word-flash');
                setTimeout(() => {
                    phraseWrapper.classList.remove('word-flash');
                }, 300);
            }
        } else {
            // 普通單字,播放單字發音
            const word = wordElement.textContent.trim().replace(/[^a-zA-Z]/g, '');
            if (word) {
                playWordPronunciation(word);
                copyToClipboard(word);
                // 添加閃爍效果
                wordElement.classList.add('word-flash');
                setTimeout(() => {
                    wordElement.classList.remove('word-flash');
                }, 300);
            }
        }
    }
}

function handleWordLongPress(wordElement) {
    // 切換高亮狀態
    const word = wordElement.textContent.trim();
    wordElement.classList.toggle('highlighted');
    
    if (wordElement.classList.contains('highlighted')) {
        highlightedWords.add(word);
        showNotification(`✨ 已標記重點: ${word}`, 'success');
    } else {
        highlightedWords.delete(word);
        showNotification(`已取消重點: ${word}`, 'info');
    }
    
    // 儲存到當前單字的備註中
    saveHighlightedWords();
}

function restoreHighlightedWords(container) {
    console.log('🔄 [restoreHighlightedWords] 開始恢復高亮');
    console.log('🔄 [restoreHighlightedWords] highlightedWords:', Array.from(highlightedWords));
    
    // 恢復單字和片語的高亮狀態
    highlightedWords.forEach(phrase => {
        const words = phrase.split(' ');
        console.log('🔄 [restoreHighlightedWords] 處理:', phrase, '(單字數:', words.length + ')');
        
        if (words.length === 1) {
            // 單字高亮
            const wordElements = container.querySelectorAll('.highlight-mode-word');
            let foundCount = 0;
            wordElements.forEach(wordEl => {
                if (wordEl.textContent.trim() === phrase) {
                    wordEl.classList.add('highlighted');
                    foundCount++;
                }
            });
            console.log('✅ [restoreHighlightedWords] 單字', phrase, '找到', foundCount, '個匹配');
        } else {
            // 片語高亮 - 需要找到連續的單字並包裹
            const phraseKey = words.join('-').toLowerCase();
            const allWords = Array.from(container.querySelectorAll('.highlight-mode-word'));
            console.log('🔍 [restoreHighlightedWords] 在', allWords.length, '個單字中尋找片語:', phrase);
            
            // 找到符合的連續單字序列
            for (let i = 0; i < allWords.length; i++) {
                let match = true;
                const phraseElements = [];
                
                for (let j = 0; j < words.length && i + j < allWords.length; j++) {
                    const wordText = allWords[i + j].textContent.trim();
                    if (wordText.toLowerCase() === words[j].toLowerCase()) {
                        phraseElements.push(allWords[i + j]);
                    } else {
                        match = false;
                        break;
                    }
                }
                
                if (match && phraseElements.length === words.length) {
                    // 找到匹配的片語,用包裹元素包起來
                    console.log('✅ [restoreHighlightedWords] 找到片語匹配，位置:', i);
                    wrapPhraseElements(phraseElements, phrase, phraseKey);
                    i += words.length - 1; // 跳過已處理的單字
                }
            }
        }
    });
    
    console.log('🔄 [restoreHighlightedWords] 恢復完成');
}

function playWordPronunciation(word) {
    // 先嘗試小寫的 MP3，如果失敗再嘗試原始大小寫
    const lowerCaseWord = word.toLowerCase();
    const audioUrlLower = `https://github.com/BoydYang-Designer/English-vocabulary/raw/main/audio_files/${encodeURIComponent(lowerCaseWord)}.mp3`;
    const audio = new Audio(audioUrlLower);
    
    audio.play().catch(error => {
        // 如果小寫失敗，嘗試原始大小寫
        console.log('Lowercase MP3 not found, trying original case');
        const audioUrlOriginal = `https://github.com/BoydYang-Designer/English-vocabulary/raw/main/audio_files/${encodeURIComponent(word)}.mp3`;
        const audioOriginal = new Audio(audioUrlOriginal);
        
        audioOriginal.play().catch(error2 => {
            // 如果 MP3 都不存在,使用瀏覽器的語音合成
            console.log('MP3 not found, using Web Speech API');
            useBrowserSpeech(word);
        });
    });
}

function useBrowserSpeech(word) {
    if ('speechSynthesis' in window) {
        // 在手機上，需要用戶交互才能觸發 speechSynthesis
        // 檢查是否已經有語音正在播放
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }
        
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'en-US';
        utterance.rate = 0.9; // 稍微慢一點，更清楚
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        // 添加錯誤處理
        utterance.onerror = function(event) {
            console.error('Speech synthesis error:', event);
        };
        
        // 確保在移動設備上也能工作
        utterance.onend = function() {
            console.log('Speech finished');
        };
        
        // iOS 特別處理: 直接播放，不使用 setTimeout
        // 因為 iOS 要求語音合成必須在直接的用戶互動事件中觸發
        try {
            window.speechSynthesis.speak(utterance);
        } catch (error) {
            console.error('Speech synthesis failed:', error);
        }
        
    } else {
        console.warn('此瀏覽器不支援語音功能');
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        // 不顯示通知,只用閃爍效果
    }).catch(err => {
        console.error('複製失敗:', err);
    });
}

function saveHighlightedWords() {
    const currentWord = document.getElementById("wordTitle")?.textContent.trim();
    if (!currentWord) return;
    
    console.log('💾 [saveHighlightedWords] 當前單字:', currentWord);
    console.log('💾 [saveHighlightedWords] highlightedWords:', Array.from(highlightedWords));
    
    const vocabularyData = window.getVocabularyData();
    if (!vocabularyData.highlightedWords) vocabularyData.highlightedWords = {};
    
    // [修改] 改為以被畫重點的單字/片語為 key
    // 先清除所有與當前主單字相關的舊記錄（避免重複）
    Object.keys(vocabularyData.highlightedWords).forEach(key => {
        if (vocabularyData.highlightedWords[key] === currentWord) {
            console.log('🗑️ [saveHighlightedWords] 刪除舊記錄:', key);
            delete vocabularyData.highlightedWords[key];
        }
    });
    
    // 儲存每個被畫重點的單字/片語
    if (highlightedWords.size > 0) {
        highlightedWords.forEach(word => {
            // 將片語轉換為連字符形式作為 key
            const wordKey = word.includes(' ') ? word.split(' ').join('-').toLowerCase() : word;
            console.log('✅ [saveHighlightedWords] 儲存:', wordKey, '→', currentWord);
            vocabularyData.highlightedWords[wordKey] = currentWord; // 值為主單字
        });
    }
    
    console.log('📦 [saveHighlightedWords] 最終 vocabularyData.highlightedWords:', vocabularyData.highlightedWords);
    window.persistVocabularyData();
}

function loadHighlightedWords() {
    const currentWord = document.getElementById("wordTitle")?.textContent.trim();
    if (!currentWord) return;
    
    const vocabularyData = window.getVocabularyData();
    highlightedWords = new Set();
    
    console.log('🔍 [loadHighlightedWords] 當前單字:', currentWord);
    console.log('📦 [loadHighlightedWords] vocabularyData.highlightedWords:', vocabularyData.highlightedWords);
    
    // [修改] 從新的儲存格式載入：找出所有值為當前主單字的項目
    if (vocabularyData.highlightedWords) {
        Object.entries(vocabularyData.highlightedWords).forEach(([highlightedWord, mainWord]) => {
            if (mainWord === currentWord) {
                // 將連字符形式轉回空格形式（如果是片語）
                // 判斷: 如果包含連字符且不是常見的連字符單字，就轉換為空格
                const isPhrase = highlightedWord.includes('-') && highlightedWord.split('-').length >= 2;
                const originalWord = isPhrase ? highlightedWord.split('-').join(' ') : highlightedWord;
                
                console.log('✅ [loadHighlightedWords] 載入:', highlightedWord, '→', originalWord);
                highlightedWords.add(originalWord);
            }
        });
    }
    
    console.log('📝 [loadHighlightedWords] 最終 highlightedWords:', Array.from(highlightedWords));
    
    // [新增] 包裹 meaningContainer 的單字並恢復高亮
    const meaningContainer = document.getElementById('meaningContainer');
    if (meaningContainer && highlightedWords.size > 0) {
        wrapWordsInMeaningContainer(meaningContainer);
        restoreHighlightedWords(meaningContainer);
    }
}

// ========== LocalStorage 編輯器功能 ==========
function openStorageEditor() {
    const modal = document.getElementById('storage-editor-modal');
    if (modal) {
        modal.classList.add('active');
        refreshStorageEditor();
    }
}

function closeStorageEditor() {
    const modal = document.getElementById('storage-editor-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function refreshStorageEditor() {
    const vocabularyData = window.getVocabularyData();
    
    // 更新計數
    document.getElementById('notes-count').textContent = Object.keys(vocabularyData.notes || {}).length;
    document.getElementById('custom-count').textContent = Object.keys(vocabularyData.customWords || {}).length;
    document.getElementById('highlighted-count').textContent = Object.keys(vocabularyData.highlightedWords || {}).length;
    document.getElementById('checked-count').textContent = (vocabularyData.checkedWords || []).length;
    document.getElementById('important-count').textContent = (vocabularyData.importantWords || []).length;
    document.getElementById('wrong-count').textContent = (vocabularyData.wrongWords || []).length;
    
    // 渲染各個標籤頁內容
    renderNotesTab(vocabularyData.notes || {});
    renderCustomWordsTab(vocabularyData.customWords || {});
    renderHighlightedWordsTab(vocabularyData.highlightedWords || {});
    renderWordListTab('checked', vocabularyData.checkedWords || []);
    renderWordListTab('important', vocabularyData.importantWords || []);
    renderWordListTab('wrong', vocabularyData.wrongWords || []);
}

function renderNotesTab(notes) {
    const container = document.getElementById('tab-notes');
    container.innerHTML = '';
    
    if (Object.keys(notes).length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">目前沒有備註</p>';
        return;
    }
    
    Object.entries(notes).forEach(([word, note]) => {
        const item = document.createElement('div');
        item.className = 'storage-item';
        item.innerHTML = `
            <div class="storage-item-header">
                <div class="storage-item-word">${word}</div>
                <div class="storage-item-buttons">
                    <button class="storage-item-btn btn-edit" onclick="editNote('${word}')">編輯</button>
                    <button class="storage-item-btn btn-delete" onclick="deleteNote('${word}')">刪除</button>
                </div>
            </div>
            <div style="margin-top: 10px; white-space: pre-wrap; color: var(--text-secondary);">${note}</div>
        `;
        container.appendChild(item);
    });
}

function renderCustomWordsTab(customWords) {
    const container = document.getElementById('tab-custom');
    container.innerHTML = '';
    
    if (Object.keys(customWords).length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">目前沒有自訂單字</p>';
        return;
    }
    
    Object.entries(customWords).forEach(([word, wordObj]) => {
        const item = document.createElement('div');
        item.className = 'storage-item';
        
        const chinese = wordObj["traditional Chinese"] || '';
        const meaning = wordObj["English meaning"] || '';
        const preview = meaning.substring(0, 100) + (meaning.length > 100 ? '...' : '');
        
        item.innerHTML = `
            <div class="storage-item-header">
                <div class="storage-item-word">${word}</div>
                <div class="storage-item-buttons">
                    <button class="storage-item-btn btn-edit" onclick="editCustomWord('${word}')">編輯</button>
                    <button class="storage-item-btn btn-delete" onclick="deleteCustomWordFromEditor('${word}')">刪除</button>
                </div>
            </div>
            ${chinese ? `<div style="margin-top: 5px; color: var(--text-secondary);">${chinese}</div>` : ''}
            ${preview ? `<div style="margin-top: 5px; color: var(--text-tertiary); font-size: 14px;">${preview}</div>` : ''}
        `;
        container.appendChild(item);
    });
}

function renderHighlightedWordsTab(highlightedWords) {
    const container = document.getElementById('tab-highlighted');
    container.innerHTML = '';
    
    if (Object.keys(highlightedWords).length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">目前沒有畫重點的單字</p>';
        return;
    }
    
    // [修改] 新格式：key 是被畫重點的單字/片語，value 是主單字
    // 按主單字分組
    const groupedByMainWord = {};
    Object.entries(highlightedWords).forEach(([highlightedWord, mainWord]) => {
        if (!groupedByMainWord[mainWord]) {
            groupedByMainWord[mainWord] = [];
        }
        groupedByMainWord[mainWord].push(highlightedWord);
    });
    
    Object.entries(groupedByMainWord).forEach(([mainWord, highlightedList]) => {
        const item = document.createElement('div');
        item.className = 'storage-item';
        
        // 創建高亮單字的標籤顯示（已經是連字符形式）
        const highlightedTags = highlightedList.map(word => 
            `<span style="background-color: #FFEB3B; color: #000; padding: 3px 8px; border-radius: 4px; margin: 2px; display: inline-block; font-size: 14px;">${word}</span>`
        ).join(' ');
        
        item.innerHTML = `
            <div class="storage-item-header">
                <div class="storage-item-word">${mainWord}</div>
                <div class="storage-item-buttons">
                    <button class="storage-item-btn btn-edit" onclick="viewWordWithHighlights('${mainWord}')">查看</button>
                    <button class="storage-item-btn btn-delete" onclick="deleteHighlightedWords('${mainWord}')">清除全部</button>
                </div>
            </div>
            <div style="margin-top: 10px; padding: 10px; background: var(--bg-quaternary); border-radius: 5px;">
                <div style="margin-bottom: 5px; color: var(--text-secondary); font-size: 12px;">已畫重點的單字 (${highlightedList.length}):</div>
                <div>${highlightedTags}</div>
            </div>
        `;
        container.appendChild(item);
    });
}
function renderWordListTab(type, words) {
    const container = document.getElementById(`tab-${type}`);
    container.innerHTML = '';
    
    if (words.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: var(--text-secondary); padding: 20px;">目前沒有${type === 'checked' ? 'checked' : type === 'important' ? '重要' : '錯誤'}單字</p>`;
        return;
    }
    
    words.forEach(word => {
        const item = document.createElement('div');
        item.className = 'storage-item';
        item.innerHTML = `
            <div class="storage-item-header">
                <div class="storage-item-word">${word}</div>
                <div class="storage-item-buttons">
                    <button class="storage-item-btn btn-delete" onclick="removeWordFrom('${type}', '${word}')">移除</button>
                </div>
            </div>
        `;
        container.appendChild(item);
    });
}

function editNote(word) {
    const vocabularyData = window.getVocabularyData();
    const note = vocabularyData.notes[word] || '';
    
    const newNote = prompt(`編輯 "${word}" 的備註:`, note);
    if (newNote !== null) {
        if (newNote.trim()) {
            vocabularyData.notes[word] = newNote.trim();
        } else {
            delete vocabularyData.notes[word];
        }
        window.persistVocabularyData();
        refreshStorageEditor();
        showNotification('✅ 備註已更新', 'success');
    }
}

function deleteNote(word) {
    if (confirm(`確定要刪除 "${word}" 的備註嗎?`)) {
        const vocabularyData = window.getVocabularyData();
        delete vocabularyData.notes[word];
        window.persistVocabularyData();
        refreshStorageEditor();
        showNotification('🗑️ 備註已刪除', 'success');
    }
}

function editCustomWord(word) {
    const wordObj = wordsData.find(w => (w.Words || w.word || w["單字"]) === word);
    if (wordObj) {
        closeStorageEditor();
        openEditModal(wordObj);
    }
}

function deleteCustomWordFromEditor(word) {
    if (confirm(`確定要刪除自訂單字 "${word}" 嗎?`)) {
        const vocabularyData = window.getVocabularyData();
        if (vocabularyData.customWords) {
            delete vocabularyData.customWords[word];
            window.persistVocabularyData();
            
            // 從 wordsData 中移除
            const index = wordsData.findIndex(w => (w.Words || w.word || w["單字"]) === word);
            if (index !== -1) {
                wordsData.splice(index, 1);
            }
            
            refreshStorageEditor();
            showNotification('🗑️ 自訂單字已刪除', 'success');
        }
    }
}

function removeWordFrom(type, word) {
    if (confirm(`確定要從${type === 'checked' ? 'checked' : type === 'important' ? '重要' : '錯誤'}列表移除 "${word}" 嗎?`)) {
        const vocabularyData = window.getVocabularyData();
        const listName = type + 'Words';
        
        if (vocabularyData[listName]) {
            vocabularyData[listName] = vocabularyData[listName].filter(w => w !== word);
            window.persistVocabularyData();
            refreshStorageEditor();
            showNotification('✅ 已移除', 'success');
        }
    }
}

function clearAllStorageData() {
    if (confirm('⚠️ 警告:這將清空所有學習資料,包括備註、自訂單字、重要標記等。此操作無法復原!\n\n確定要繼續嗎?')) {
        if (confirm('再次確認:真的要清空所有資料嗎?')) {
            localStorage.clear();
            showNotification('🗑️ 所有資料已清空', 'success');
            setTimeout(() => location.reload(), 1500);
        }
    }
}

// 在 renderTimestampContent 函數之後添加畫重點模式的渲染函數
function renderTimestampContentInHighlightMode() {
    const container = document.getElementById('highlight-meaning-container');
    if (!container) return;

    container.innerHTML = '';
    const frag = document.createDocumentFragment();

    timestampData.forEach(item => {
        const p = document.createElement('p');
        p.className = 'timestamp-sentence';
        p.dataset.start = item.start;

        // 將句子拆分為單字並包裝
        item.sentence.split(/(\s+)/).forEach(part => {
            if (part.trim() !== '') {
                const span = document.createElement('span');
                span.className = 'clickable-word highlight-mode-word';
                span.textContent = part;
                setupWordInteraction(span);
                p.appendChild(span);
            } else {
                p.appendChild(document.createTextNode(part));
            }
        });
        frag.appendChild(p);
    });

    container.appendChild(frag);
    restoreHighlightedWords(container);
}

// 修改 enterHighlightMode 函數以正確處理 timestamp 模式
function enterHighlightModeEnhanced() {
    highlightModeActive = true;
    const container = document.getElementById('highlight-mode-container');
    const meaningContainer = document.getElementById('meaningContainer');
    const highlightMeaningContainer = document.getElementById('highlight-meaning-container');
    
    if (container && meaningContainer && highlightMeaningContainer) {
        // 如果有 timestamp 資料，總是渲染 timestamp 內容以支持句子高亮
        if (hasTimestampFile && timestampData && timestampData.length > 0) {
            renderTimestampContentInHighlightMode();
        } else {
            // 複製內容到畫重點模式容器
            highlightMeaningContainer.innerHTML = meaningContainer.innerHTML;
            wrapWordsInHighlightMode(highlightMeaningContainer);
            restoreHighlightedWords(highlightMeaningContainer);
        }
        
        container.classList.add('active');
    }
}

// 畫重點模式中確保 timestamp 已渲染
function toggleTimestampModeInHighlight() {
    if (!hasTimestampFile) return;

    const container = document.getElementById('highlight-meaning-container');
    if (!container) return;

    renderTimestampContentInHighlightMode();
    detailsSentencePlayer.removeEventListener('timeupdate', handleAutoScroll);
    if (!detailsSentencePlayer.paused) {
        if (timestampUpdateRafId) cancelAnimationFrame(timestampUpdateRafId);
        timestampUpdateLoop();
    }
}

// 高亮單字管理函數
function viewWordWithHighlights(word) {
    // 關閉編輯器
    closeStorageEditor();
    
    // 查找並顯示該單字
    const wordObj = wordsData.find(w => (w.Words || w.word || w["單字"]) === word);
    if (wordObj) {
        showDetails(wordObj);
        // 自動進入畫重點模式
        setTimeout(() => {
            loadHighlightedWords();
            enterHighlightModeEnhanced();
        }, 300);
    } else {
        showNotification(`⚠️ 找不到單字 "${word}"`, 'error');
    }
}

function deleteHighlightedWords(mainWord) {
    if (confirm(`確定要清除 "${mainWord}" 的所有畫重點標記嗎?`)) {
        const vocabularyData = window.getVocabularyData();
        if (vocabularyData.highlightedWords) {
            // [修改] 刪除所有值為該主單字的項目
            const keysToDelete = [];
            Object.entries(vocabularyData.highlightedWords).forEach(([key, value]) => {
                if (value === mainWord) {
                    keysToDelete.push(key);
                }
            });
            
            keysToDelete.forEach(key => {
                delete vocabularyData.highlightedWords[key];
            });
            
            window.persistVocabularyData();
            refreshStorageEditor();
            showNotification('🗑️ 畫重點標記已清除', 'success');
        }
    }
}

// ========== 新增單字功能 ==========

// 填充分類下拉選單
function populateCategoryDataLists() {
    console.log('🔍 開始填充分類下拉選單...');
    console.log('wordsData 長度:', wordsData ? wordsData.length : 0);
    
    // 獲取所有現有的分類
    const domains = new Set();
    const topics = new Set();
    const sources = new Set();
    
    // 從 JSON 檔案的 wordsData 中收集分類
    if (wordsData && wordsData.length > 0) {
        wordsData.forEach(word => {
            const categories = word["分類"] || [];
            if (categories[0]) domains.add(categories[0]);
            if (categories[1]) topics.add(categories[1]);
            if (categories[2]) sources.add(categories[2]);
        });
    }
    
    console.log('從 wordsData 收集到的 domains:', Array.from(domains));
    console.log('從 wordsData 收集到的 topics:', Array.from(topics));
    console.log('從 wordsData 收集到的 sources:', Array.from(sources));
    
    // 從 localStorage 的自訂單字中收集分類
    const vocabularyData = window.getVocabularyData();
    if (vocabularyData && vocabularyData.customWords) {
        console.log('customWords 數量:', Object.keys(vocabularyData.customWords).length);
        // customWords 是物件格式: { "Apple": {...}, "Banana": {...} }
        Object.values(vocabularyData.customWords).forEach(word => {
            const categories = word["分類"] || [];
            if (categories[0]) domains.add(categories[0]);
            if (categories[1]) topics.add(categories[1]);
            if (categories[2]) sources.add(categories[2]);
        });
    }
    
    console.log('合併後 domains 總數:', domains.size);
    console.log('合併後 topics 總數:', topics.size);
    console.log('合併後 sources 總數:', sources.size);
    
    // 填充 domain select
    const domainSelect = document.getElementById('edit-domain-select');
    if (domainSelect) {
        domainSelect.innerHTML = '<option value="">-- 選擇分類 --</option><option value="__custom__">✏️ 手動輸入新分類</option>';
        Array.from(domains).sort().forEach(domain => {
            const option = document.createElement('option');
            option.value = domain;
            option.textContent = domain;
            domainSelect.appendChild(option);
        });
        console.log('✅ domain-select 填充完成,選項數:', domainSelect.children.length);
    }
    
    // 填充 topic select
    const topicSelect = document.getElementById('edit-topic-select');
    if (topicSelect) {
        topicSelect.innerHTML = '<option value="">-- 選擇主題 --</option><option value="__custom__">✏️ 手動輸入新主題</option>';
        Array.from(topics).sort().forEach(topic => {
            const option = document.createElement('option');
            option.value = topic;
            option.textContent = topic;
            topicSelect.appendChild(option);
        });
        console.log('✅ topic-select 填充完成,選項數:', topicSelect.children.length);
    }
    
    // 填充 source select
    const sourceSelect = document.getElementById('edit-source-select');
    if (sourceSelect) {
        sourceSelect.innerHTML = '<option value="">-- 選擇來源 --</option><option value="__custom__">✏️ 手動輸入新來源</option>';
        Array.from(sources).sort().forEach(source => {
            const option = document.createElement('option');
            option.value = source;
            option.textContent = source;
            sourceSelect.appendChild(option);
        });
        console.log('✅ source-select 填充完成,選項數:', sourceSelect.children.length);
    }
    
    // 設置選單事件監聽器
    setupCategorySelectListeners();
}

// 設置分類選單的事件監聽器
function setupCategorySelectListeners() {
    const domainSelect = document.getElementById('edit-domain-select');
    const domainInput = document.getElementById('edit-domain');
    const topicSelect = document.getElementById('edit-topic-select');
    const topicInput = document.getElementById('edit-topic');
    const sourceSelect = document.getElementById('edit-source-select');
    const sourceInput = document.getElementById('edit-source');
    
    if (domainSelect && domainInput) {
        domainSelect.addEventListener('change', function() {
            if (this.value === '__custom__') {
                domainInput.style.display = 'block';
                domainInput.value = '';
                domainInput.focus();
            } else {
                domainInput.style.display = 'none';
                domainInput.value = this.value;
            }
        });
    }
    
    if (topicSelect && topicInput) {
        topicSelect.addEventListener('change', function() {
            if (this.value === '__custom__') {
                topicInput.style.display = 'block';
                topicInput.value = '';
                topicInput.focus();
            } else {
                topicInput.style.display = 'none';
                topicInput.value = this.value;
            }
        });
    }
    
    if (sourceSelect && sourceInput) {
        sourceSelect.addEventListener('change', function() {
            if (this.value === '__custom__') {
                sourceInput.style.display = 'block';
                sourceInput.value = '';
                sourceInput.focus();
            } else {
                sourceInput.style.display = 'none';
                sourceInput.value = this.value;
            }
        });
    }
}

// 開啟新增單字的 Modal
function openAddWordModal(prefilledWord = '') {
    openEditModal(null); // 開啟空白的編輯 Modal
    
    // 如果有預填的單字,填入並自動獲取資訊
    if (prefilledWord) {
        const wordInput = document.getElementById('edit-word');
        if (wordInput) {
            wordInput.value = prefilledWord;
            wordInput.disabled = false; // 確保可以編輯
        }
        
        // 自動填充單字資訊
        autoFillWordInformation(prefilledWord);
    }
}

// ========== 自動填充單字資訊 ==========

/**
 * 自動填充單字資訊
 * 使用 Free Dictionary API 獲取英文定義
 * 使用簡單的等級判斷邏輯
 */
async function autoFillWordInformation(word) {
    if (!word || word.trim() === '') return;
    
    const cleanWord = word.trim().toLowerCase();
    
    // 顯示載入指示器
    const loader = document.getElementById('auto-fill-loader');
    if (loader) {
        loader.style.display = 'inline-block';
    }
    
    // 顯示載入提示
    showNotification('🔍 正在查詢單字資訊...', 'info');
    
    try {
        // 1. 獲取英文定義和詳細資訊
        const wordData = await fetchWordDefinition(cleanWord);
        
        if (wordData) {
            // 填入英文定義
            if (wordData.meaning) {
                document.getElementById('edit-meaning').value = wordData.meaning;
            }
            
            // 填入中文翻譯
            if (wordData.chineseTranslation) {
                document.getElementById('edit-chinese').value = wordData.chineseTranslation;
            }
            
            // 判斷並填入等級
            const level = determineWordLevel(cleanWord, wordData);
            document.getElementById('edit-level').value = level;
            
            // 嘗試自動分類
            const category = categorizeWord(wordData);
            if (category.domain) {
                const domainSelect = document.getElementById('edit-domain-select');
                const domainInput = document.getElementById('edit-domain');
                
                // 檢查是否存在於下拉選單中
                const optionExists = Array.from(domainSelect.options).some(
                    option => option.value === category.domain
                );
                
                if (optionExists) {
                    domainSelect.value = category.domain;
                    domainInput.value = category.domain;
                } else {
                    // 如果不存在,使用自訂輸入
                    domainSelect.value = "custom";
                    domainInput.value = category.domain;
                    domainInput.style.display = 'block';
                }
            }
            
            if (category.topic) {
                const topicSelect = document.getElementById('edit-topic-select');
                const topicInput = document.getElementById('edit-topic');
                
                const optionExists = Array.from(topicSelect.options).some(
                    option => option.value === category.topic
                );
                
                if (optionExists) {
                    topicSelect.value = category.topic;
                    topicInput.value = category.topic;
                } else {
                    topicSelect.value = "custom";
                    topicInput.value = category.topic;
                    topicInput.style.display = 'block';
                }
            }
            
            showNotification('✅ 已自動填入單字資訊！', 'success');
        } else {
            showNotification('⚠️ 無法找到此單字的資訊,請手動填寫', 'warning');
        }
    } catch (error) {
        console.error('獲取單字資訊時發生錯誤:', error);
        showNotification('❌ 查詢失敗,請手動填寫', 'error');
    } finally {
        // 隱藏載入指示器
        if (loader) {
            loader.style.display = 'none';
        }
    }
}

/**
 * 從 Free Dictionary API 獲取單字定義
 */
async function fetchWordDefinition(word) {
    try {
        // 使用 Free Dictionary API
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        
        if (!response.ok) {
            return null;
        }
        
        const data = await response.json();
        
        if (!data || data.length === 0) {
            return null;
        }
        
        const entry = data[0];
        const meanings = entry.meanings || [];
        
        // 提取定義
        let meaningText = '';
        let partOfSpeech = '';
        
        if (meanings.length > 0) {
            partOfSpeech = meanings[0].partOfSpeech || '';
            const definitions = meanings[0].definitions || [];
            
            if (definitions.length > 0) {
                // 格式化定義
                meaningText = formatDefinition(word, partOfSpeech, meanings);
            }
        }
        
        // 獲取中文翻譯
        const chineseTranslation = await fetchChineseTranslation(word, partOfSpeech);
        
        return {
            word: word,
            partOfSpeech: partOfSpeech,
            meaning: meaningText,
            chineseTranslation: chineseTranslation,
            rawData: entry
        };
    } catch (error) {
        console.error('API 查詢錯誤:', error);
        return null;
    }
}

/**
 * 格式化英文定義
 */
function formatDefinition(word, partOfSpeech, meanings) {
    let formatted = '';
    
    // 添加詞性說明
    if (partOfSpeech) {
        const posMap = {
            'noun': 'Noun',
            'verb': 'Verb',
            'adjective': 'Adjective',
            'adverb': 'Adverb',
            'pronoun': 'Pronoun',
            'preposition': 'Preposition',
            'conjunction': 'Conjunction',
            'interjection': 'Interjection'
        };
        const posText = posMap[partOfSpeech.toLowerCase()] || partOfSpeech;
        formatted += `${word.charAt(0).toUpperCase() + word.slice(1)} as a ${posText}:\n\n`;
    }
    
    // 添加定義 (最多3個)
    meanings.slice(0, 2).forEach((meaning, index) => {
        const pos = meaning.partOfSpeech;
        const definitions = meaning.definitions.slice(0, 2); // 每個詞性最多2個定義
        
        if (meanings.length > 1) {
            formatted += `${index + 1}. As a ${pos}:\n`;
        }
        
        definitions.forEach((def, defIndex) => {
            formatted += `${meanings.length > 1 ? '   ' : ''}${defIndex + 1}. ${def.definition}\n`;
            
            // 添加例句
            if (def.example) {
                formatted += `${meanings.length > 1 ? '   ' : ''}   E.g. ${def.example}\n`;
            }
        });
        
        formatted += '\n';
    });
    
    return formatted.trim();
}

/**
 * 獲取中文翻譯
 * 使用 MyMemory Translation API (免費，無需 API key)
 */
async function fetchChineseTranslation(word, partOfSpeech) {
    try {
        const posMap = {
            'noun': 'n.',
            'verb': 'v.',
            'adjective': 'adj.',
            'adverb': 'adv.',
            'pronoun': 'pron.',
            'preposition': 'prep.',
            'conjunction': 'conj.',
            'interjection': 'interj.'
        };
        
        const posAbbr = posMap[partOfSpeech.toLowerCase()] || '';
        
        // 使用 MyMemory Translation API 獲取中文翻譯
        const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|zh-TW`;
        
        try {
            const response = await fetch(apiUrl);
            if (response.ok) {
                const data = await response.json();
                
                if (data && data.responseData && data.responseData.translatedText) {
                    const translation = data.responseData.translatedText;
                    
                    // 如果翻譯成功且不是原文，組合詞性和翻譯
                    if (translation && translation !== word) {
                        return posAbbr ? `${posAbbr} ${translation}` : translation;
                    }
                }
            }
        } catch (apiError) {
            console.log('MyMemory API 失敗，嘗試使用 LibreTranslate');
            
            // 備用方案：使用 LibreTranslate (另一個免費API)
            try {
                const libreUrl = 'https://libretranslate.de/translate';
                const libreResponse = await fetch(libreUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        q: word,
                        source: 'en',
                        target: 'zh',
                        format: 'text'
                    })
                });
                
                if (libreResponse.ok) {
                    const libreData = await libreResponse.json();
                    if (libreData && libreData.translatedText) {
                        const translation = libreData.translatedText;
                        if (translation && translation !== word) {
                            return posAbbr ? `${posAbbr} ${translation}` : translation;
                        }
                    }
                }
            } catch (libreError) {
                console.error('LibreTranslate API 也失敗:', libreError);
            }
        }
        
        // 如果所有翻譯API都失敗，至少返回詞性
        return posAbbr ? `${posAbbr} ` : '';
        
    } catch (error) {
        console.error('翻譯查詢錯誤:', error);
        return '';
    }
}

/**
 * 判斷單字等級
 * 基於單字長度、複雜度等因素
 */
function determineWordLevel(word, wordData) {
    const length = word.length;
    
    // 常見單字列表 (A1-A2)
    const basicWords = ['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'I',
        'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
        'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
        'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
        'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
        'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
        'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other',
        'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
        'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way',
        'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us',
        'cat', 'dog', 'house', 'school', 'book', 'water', 'food', 'family', 'friend', 'happy'];
    
    // 檢查是否為基礎單字
    if (basicWords.includes(word.toLowerCase())) {
        return 'A1';
    }
    
    // 根據長度和複雜度判斷
    if (length <= 4) {
        return 'A2';
    } else if (length <= 6) {
        return 'B1';
    } else if (length <= 8) {
        return 'B2';
    } else if (length <= 10) {
        return 'C1';
    } else {
        return 'C2';
    }
}

/**
 * 嘗試自動分類單字
 */
function categorizeWord(wordData) {
    const category = {
        domain: '',
        topic: ''
    };
    
    if (!wordData || !wordData.rawData) {
        return category;
    }
    
    const meanings = wordData.rawData.meanings || [];
    
    // 根據詞性和定義內容進行簡單分類
    for (const meaning of meanings) {
        const partOfSpeech = meaning.partOfSpeech;
        const definitions = meaning.definitions || [];
        
        for (const def of definitions) {
            const text = (def.definition + ' ' + (def.example || '')).toLowerCase();
            
            // 科技相關
            if (text.includes('computer') || text.includes('technology') || 
                text.includes('software') || text.includes('digital')) {
                category.domain = 'Technology & Innovation（科技與創新）';
                category.topic = 'Computer Science';
                return category;
            }
            
            // 商業相關
            if (text.includes('business') || text.includes('company') || 
                text.includes('market') || text.includes('economy')) {
                category.domain = 'Business & Economics（商業與經濟）';
                category.topic = 'Business';
                return category;
            }
            
            // 科學相關
            if (text.includes('science') || text.includes('research') || 
                text.includes('experiment') || text.includes('theory')) {
                category.domain = 'Science & Research（科學與研究）';
                category.topic = 'General Science';
                return category;
            }
            
            // 藝術相關
            if (text.includes('art') || text.includes('design') || 
                text.includes('creative') || text.includes('aesthetic')) {
                category.domain = 'Arts, Design & Aesthetics（藝術與設計）';
                category.topic = 'Arts';
                return category;
            }
        }
    }
    
    return category;
}


// ========== 檢測已整合的單字 ==========

/**
 * 比較兩個單字物件是否相同
 */
function areWordsSame(word1, word2) {
    // 比較重要欄位
    const fieldsToCompare = ['traditional Chinese', 'English meaning', '等級'];
    
    for (let field of fieldsToCompare) {
        if (word1[field] !== word2[field]) {
            return false;
        }
    }
    
    // 比較分類
    const cat1 = JSON.stringify(word1['分類'] || []);
    const cat2 = JSON.stringify(word2['分類'] || []);
    
    return cat1 === cat2;
}

/**
 * 檢測哪些 localStorage 單字已經被整合到內建 JSON
 */
function detectIntegratedWords(builtInWords, customWords) {
    const integrated = [];
    
    // 建立內建單字的 Map
    const builtInMap = new Map();
    builtInWords.forEach(w => {
        const key = (w.Words || w.word || w["單字"]).trim();
        builtInMap.set(key, w);
    });
    
    // 檢查每個自訂單字
    Object.entries(customWords).forEach(([wordText, customWord]) => {
        const builtInWord = builtInMap.get(wordText);
        
        if (builtInWord) {
            // 單字存在於內建 JSON 中,比較內容是否相同
            if (areWordsSame(customWord, builtInWord)) {
                integrated.push({
                    word: wordText,
                    type: '完全相同',
                    customWord: customWord,
                    builtInWord: builtInWord
                });
            } else {
                // 內容不同,可能是修改過的
                integrated.push({
                    word: wordText,
                    type: '已修改',
                    customWord: customWord,
                    builtInWord: builtInWord
                });
            }
        }
    });
    
    console.log('🔍 檢測到已整合的單字:', integrated);
    return integrated;
}

/**
 * 顯示已整合單字的提示 Modal
 */
function showIntegratedWordsPrompt(integratedWords) {
    // 創建 Modal
    const modalHtml = `
        <div id="integrated-words-modal" class="modal" style="display: block;">
            <div class="modal-content" style="max-width: 600px;">
                <h2>🔄 發現已整合的單字</h2>
                <p>以下單字已經整合到內建資料庫中,是否要從 localStorage 移除?</p>
                
                <div style="max-height: 400px; overflow-y: auto; margin: 20px 0;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: var(--bg-tertiary); position: sticky; top: 0;">
                                <th style="padding: 10px; text-align: left; border: 1px solid var(--border-color);">
                                    <input type="checkbox" id="select-all-integrated" onchange="toggleAllIntegratedWords(this)">
                                </th>
                                <th style="padding: 10px; text-align: left; border: 1px solid var(--border-color);">單字</th>
                                <th style="padding: 10px; text-align: left; border: 1px solid var(--border-color);">狀態</th>
                            </tr>
                        </thead>
                        <tbody id="integrated-words-list">
                            ${integratedWords.map((item, index) => `
                                <tr>
                                    <td style="padding: 10px; border: 1px solid var(--border-color);">
                                        <input type="checkbox" class="integrated-word-checkbox" data-word="${item.word}" checked>
                                    </td>
                                    <td style="padding: 10px; border: 1px solid var(--border-color);">
                                        <strong>${item.word}</strong>
                                    </td>
                                    <td style="padding: 10px; border: 1px solid var(--border-color);">
                                        ${item.type === '完全相同' 
                                            ? '<span style="color: #4CAF50;">✅ 已完全整合</span>' 
                                            : '<span style="color: #FF9800;">⚠️ 內容已更新</span>'}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                
                <div style="margin-top: 20px; padding: 15px; background: var(--bg-tertiary); border-radius: 8px;">
                    <p style="margin: 0; font-size: 14px; color: var(--text-secondary);">
                        💡 提示: 移除後這些單字仍會保留在內建資料庫中,不會遺失資料。
                    </p>
                </div>
                
                <div class="modal-actions" style="margin-top: 20px;">
                    <button class="button" onclick="closeIntegratedWordsModal()" style="background: var(--bg-tertiary); color: var(--text-primary);">
                        稍後處理
                    </button>
                    <button class="button" onclick="removeIntegratedWords()">
                        移除選中的單字
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // 添加到頁面
    const existingModal = document.getElementById('integrated-words-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

/**
 * 切換全選/取消全選
 */
function toggleAllIntegratedWords(checkbox) {
    const checkboxes = document.querySelectorAll('.integrated-word-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = checkbox.checked;
    });
}

/**
 * 移除已整合的單字
 */
function removeIntegratedWords() {
    const checkboxes = document.querySelectorAll('.integrated-word-checkbox:checked');
    const wordsToRemove = Array.from(checkboxes).map(cb => cb.dataset.word);
    
    if (wordsToRemove.length === 0) {
        showNotification('❌ 請選擇要移除的單字', 'error');
        return;
    }
    
    if (!confirm(`確定要移除 ${wordsToRemove.length} 個單字嗎?\n\n這些單字:\n${wordsToRemove.join(', ')}\n\n將從 localStorage 中移除,但會保留在內建資料庫中。`)) {
        return;
    }
    
    // 從 localStorage 移除
    const vocabularyData = window.getVocabularyData();
    let removedCount = 0;
    
    wordsToRemove.forEach(word => {
        if (vocabularyData.customWords && vocabularyData.customWords[word]) {
            delete vocabularyData.customWords[word];
            removedCount++;
        }
    });
    
    // 儲存更新
    window.persistVocabularyData();
    
    // 關閉 Modal
    closeIntegratedWordsModal();
    
    // 顯示通知
    showNotification(`✅ 已移除 ${removedCount} 個單字`, 'success');
    
    // 重新載入頁面以更新顯示
    setTimeout(() => {
        location.reload();
    }, 1500);
}

/**
 * 關閉已整合單字的 Modal
 */
function closeIntegratedWordsModal() {
    const modal = document.getElementById('integrated-words-modal');
    if (modal) {
        modal.remove();
    }
}
