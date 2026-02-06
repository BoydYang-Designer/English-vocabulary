// menu-navigation.js - 選單頁面導航邏輯 (完整修正版)

// ========== 頁面導航全域變數 ==========
window.navigationState = {
    currentPage: 'menu', // 'menu', 'vocabulary', 'sentence', 'test'
    previousPage: null
};

// ========== 初始化選單頁面 ==========
function initMenuPage() {
    // 綁定選單主要功能按鈕事件
    const gotoVocabularyBtn = document.getElementById('goto-vocabulary-btn');
    const gotoSentenceBtn = document.getElementById('goto-sentence-btn');
    const gotoTestBtn = document.getElementById('goto-test-btn');
    
    if (gotoVocabularyBtn) {
        gotoVocabularyBtn.addEventListener('click', () => navigateToPage('vocabulary'));
    }
    
    if (gotoSentenceBtn) {
        gotoSentenceBtn.addEventListener('click', () => navigateToPage('sentence'));
    }
    
    if (gotoTestBtn) {
        gotoTestBtn.addEventListener('click', () => navigateToPage('test'));
    }
    
    // 同步主題按鈕狀態
    syncThemeButtons();
    
    // 綁定選單頁面的主題切換按鈕
    const themeBtnMenu = document.getElementById('theme-toggle-btn-menu');
    if (themeBtnMenu) {
        themeBtnMenu.addEventListener('click', () => {
            // 呼叫 index.js 中的 toggleTheme
            if (typeof toggleTheme === 'function') {
                toggleTheme();
                syncThemeButtons();
            }
        });
    }
    
    // 綁定選單頁面的編輯按鈕
    const editStorageBtnMenu = document.getElementById('edit-storage-btn-menu');
    if (editStorageBtnMenu) {
        editStorageBtnMenu.addEventListener('click', () => {
            if (typeof openStorageEditor === 'function') {
                openStorageEditor();
            }
        });
    }
    
    // 綁定選單頁面的登出按鈕
    const signOutBtnMenu = document.getElementById('sign-out-btn-menu');
    if (signOutBtnMenu) {
        signOutBtnMenu.addEventListener('click', () => {
            if (typeof signOutUser === 'function') {
                signOutUser();
            }
        });
    }
    
    // 綁定選單頁面的登入按鈕 (訪客轉登入)
    const signInBtnMenu = document.getElementById('sign-in-from-guest-btn-menu');
    if (signInBtnMenu) {
        signInBtnMenu.addEventListener('click', () => {
            if (typeof signInFromGuest === 'function') {
                signInFromGuest();
            }
        });
    }
}

// ========== 同步主題按鈕圖示 ==========
function syncThemeButtons() {
    const themeBtn = document.getElementById('theme-toggle-btn');
    const themeBtnMenu = document.getElementById('theme-toggle-btn-menu');
    
    // 嘗試從全域設定取得目前主題，預設為 light
    const currentTheme = (window.appEnhancements && window.appEnhancements.currentTheme) || 'light';
    const emoji = currentTheme === 'dark' ? '☀️' : '🌙';
    
    if (themeBtn) themeBtn.textContent = emoji;
    if (themeBtnMenu) themeBtnMenu.textContent = emoji;
}

// ========== 頁面導航函數 (核心邏輯) ==========
function navigateToPage(pageName) {
    const menuView = document.getElementById('menu-view');
    const appContainer = document.getElementById('app-container');
    const vocabularyContainer = document.getElementById('vocabulary-page-container');
    const sentenceContainer = document.getElementById('sentence-page-container');
    const testContainer = document.getElementById('test-page-container');
    
    // 1. 先隱藏所有主要視圖容器
    if (menuView) menuView.classList.add('is-hidden');
    if (appContainer) appContainer.classList.add('is-hidden');
    
    // 隱藏 App 內部的子頁面容器
    if (vocabularyContainer) vocabularyContainer.style.display = 'none';
    if (sentenceContainer) sentenceContainer.style.display = 'none';
    if (testContainer) testContainer.style.display = 'none';
    
    // 更新導航狀態紀錄
    window.navigationState.previousPage = window.navigationState.currentPage;
    window.navigationState.currentPage = pageName;
    
    // 2. 根據目標頁面顯示對應內容
    switch(pageName) {
        case 'menu':
            if (menuView) menuView.classList.remove('is-hidden');
            // 回到選單時清空麵包屑
            if (typeof updateBreadcrumb === 'function') updateBreadcrumb([]);
            break;
            
        case 'vocabulary':
            if (appContainer) appContainer.classList.remove('is-hidden');
            if (vocabularyContainer) vocabularyContainer.style.display = 'block';
            if (window.appEnhancements) {
                window.appEnhancements.breadcrumbPath = ['選擇功能', '單字庫'];
            }
            if (typeof updateBreadcrumb === 'function') {
                updateBreadcrumb(['選擇功能', '單字庫']);
            }
            
            // 進入首頁時，確保 Back 按鈕 (bButton) 是禁用的
            const bButton = document.getElementById('bButton');
            if (bButton) {
                bButton.disabled = true;
                bButton.style.backgroundColor = "#ccc";
            }
            break;
            
        case 'sentence':
            // 導航到 sentence.html
            window.location.href = 'sentence.html';
            break;
            
        case 'test':
            // 導航到 quiz.html
            window.location.href = 'quiz.html';
            break;
    }
    
    // 同步使用者資訊顯示 (名稱等)
    syncUserInfo();
}

// ========== 同步使用者資訊 ==========
function syncUserInfo() {
    const userInfo = document.getElementById('user-info');
    const userInfoMenu = document.getElementById('user-info-menu');
    
    // 將 app 內的 user info 同步到選單頁面
    if (userInfo && userInfoMenu) {
        userInfoMenu.textContent = userInfo.textContent;
    }
}

// ========== 返回選單 (Back To Menu) ==========
function backToMenu() {
    // 1. 切換視圖：顯示選單，隱藏 App
    const menuView = document.getElementById('menu-view');
    const appContainer = document.getElementById('app-container');
    
    if (menuView) menuView.classList.remove('is-hidden');
    if (appContainer) appContainer.classList.add('is-hidden');
    
    // 2. 更新導航狀態
    window.navigationState.currentPage = 'menu';
    
    // 3. 清空並隱藏麵包屑
    if (window.appEnhancements) {
        window.appEnhancements.breadcrumbPath = [];
    }
    if (typeof updateBreadcrumb === 'function') {
        updateBreadcrumb([]); 
    }
    
    // 4. 清理音訊 (避免背景繼續播放)
    if (typeof cleanupAudioPlayers === 'function') {
        cleanupAudioPlayers();
    }
}

// ========== 麵包屑更新函數 (整合返回選單邏輯) ==========
function updateBreadcrumb(path) {
    // 確保 appEnhancements 物件存在，避免報錯
    if (!window.appEnhancements) {
        window.appEnhancements = { breadcrumbPath: [] };
    }

    // 如果有傳入路徑，更新全域狀態
    if (path) {
        window.appEnhancements.breadcrumbPath = path;
    }
    
    const breadcrumbNav = document.getElementById('breadcrumb-nav');
    if (!breadcrumbNav) return;
    
    // 如果路徑為空，隱藏導航列
    if (!window.appEnhancements.breadcrumbPath || window.appEnhancements.breadcrumbPath.length === 0) {
        breadcrumbNav.classList.remove('show');
        return;
    }
    
    // 顯示導航列
    breadcrumbNav.classList.add('show');
    
    // 生成 HTML
    breadcrumbNav.innerHTML = window.appEnhancements.breadcrumbPath.map((item, index) => {
        const isLast = index === window.appEnhancements.breadcrumbPath.length - 1;
        let onclickAction = '';
        
        // [關鍵邏輯] [需求 3] 所有麵包屑項目都可點擊
        // Index 0 (第一層，例如"選擇功能")：點擊後執行 backToMenu() 回到選單
        // Index > 0 (其他層級)：執行 navigateToBreadcrumb() (位於 index.js)
        if (index === 0) {
            onclickAction = `onclick="backToMenu()"`;
        } else {
            // 使用 typeof 檢查避免 index.js 尚未載入時報錯
            onclickAction = `onclick="if(typeof navigateToBreadcrumb === 'function') navigateToBreadcrumb(${index})"`;
        }
        
        // [需求 3] 所有項目都可點擊（包括最後一項）
        return `<span class="breadcrumb-item" ${onclickAction}>${item}</span>${!isLast ? '<span class="breadcrumb-separator">›</span>' : ''}`;
    }).join('');
}

// ========== 頁面載入監聽 ==========
document.addEventListener('DOMContentLoaded', function() {
    // 延遲初始化，確保 index.html 中的元素都已存在
    setTimeout(() => {
        initMenuPage();
        
        // 注意：登入狀態判斷與視圖切換 (Login vs Menu) 
        // 主要由 auth-manager.js 中的 onAuthStateChanged 處理
    }, 100);
});