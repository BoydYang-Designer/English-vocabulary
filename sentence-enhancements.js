// sentence-enhancements.js - 完整修正版本
// 此文件包含對 sentence.js 的增強功能和 bug 修復

console.log('📦 載入 sentence-enhancements.js...');

// ========== 用戶狀態管理 ==========
function updateUserStatusDisplay() {
    const userInfo = document.getElementById('user-info');
    if (!userInfo) {
        console.warn('❌ user-info 元素不存在');
        return;
    }
    
    console.log('🔍 正在更新用戶狀態...');
    console.log('📋 localStorage 內容:', {
        isGuestMode: localStorage.getItem('isGuestMode'),
        guestMode: localStorage.getItem('guestMode'),
        userEmail: localStorage.getItem('userEmail'),
        userName: localStorage.getItem('userName'),
        user: localStorage.getItem('user')
    });
    
    // 方法1: 檢查各種可能的訪客模式標記
    const isGuest = localStorage.getItem('isGuestMode') === 'true' || 
                    localStorage.getItem('guestMode') === 'true' ||
                    localStorage.getItem('guest') === 'true';
    
    if (isGuest) {
        userInfo.textContent = '訪客模式';
        console.log('✅ 用戶狀態: 訪客模式');
        return;
    }
    
    // 方法2: 檢查用戶名稱
    const userName = localStorage.getItem('userName') || 
                     localStorage.getItem('displayName') ||
                     localStorage.getItem('username');
    
    if (userName && userName !== 'null' && userName !== 'undefined') {
        userInfo.textContent = `歡迎, ${userName}`;
        console.log('✅ 用戶狀態:', userName);
        return;
    }
    
    // 方法3: 檢查用戶 email
    const userEmail = localStorage.getItem('userEmail') || 
                      localStorage.getItem('email');
    
    if (userEmail && userEmail !== 'null' && userEmail !== 'undefined') {
        userInfo.textContent = `歡迎, ${userEmail}`;
        console.log('✅ 用戶狀態:', userEmail);
        return;
    }
    
    // 方法4: 嘗試從 Firebase Auth 獲取
    if (typeof firebase !== 'undefined' && firebase.auth) {
        try {
            const user = firebase.auth().currentUser;
            if (user) {
                const displayName = user.displayName || user.email || '已登入用戶';
                userInfo.textContent = `歡迎, ${displayName}`;
                console.log('✅ 用戶狀態 (Firebase):', displayName);
                return;
            } else {
                // Firebase Auth 顯示未登入，可能是訪客模式
                console.log('🔍 Firebase 未登入，檢查是否為訪客...');
                // 如果 auth-manager 說成功保存了訪客數據，那就是訪客模式
                if (document.querySelector('#guest-mode-btn')) {
                    userInfo.textContent = '訪客模式';
                    console.log('✅ 用戶狀態: 訪客模式 (推測)');
                    return;
                }
            }
        } catch (e) {
            console.warn('Firebase Auth 檢查失敗:', e);
        }
    }
    
    // 如果完全沒有用戶資訊，但有訪客按鈕，假設是訪客模式
    if (document.querySelector('#sign-in-from-guest-btn:not(.is-hidden)')) {
        userInfo.textContent = '訪客模式';
        console.log('✅ 用戶狀態: 訪客模式 (根據按鈕推測)');
        return;
    }
    
    // 最後手段：顯示預設文字
    userInfo.textContent = '訪客模式';
    console.log('⚠️ 無明確用戶資訊，預設顯示訪客模式');
}

// ========== 最近閱讀記錄管理 ==========
const RECENT_SENTENCES_KEY = 'recentSentences';
const MAX_RECENT_SENTENCES = 3;

function getRecentSentences() {
    try {
        const stored = localStorage.getItem(RECENT_SENTENCES_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error('讀取最近閱讀記錄失敗:', e);
        return [];
    }
}

function saveRecentSentence(sentenceData) {
    try {
        let recent = getRecentSentences();
        
        // 移除重複項目
        recent = recent.filter(item => item.word !== sentenceData.word);
        
        // 添加到開頭
        recent.unshift({
            word: sentenceData.word,
            sentence: sentenceData.sentence,
            chinese: sentenceData.chinese,
            timestamp: new Date().toISOString(),
            action: sentenceData.action || 'view' // 'view' 或 'play'
        });
        
        // 只保留最新的 N 條
        recent = recent.slice(0, MAX_RECENT_SENTENCES);
        
        localStorage.setItem(RECENT_SENTENCES_KEY, JSON.stringify(recent));
        console.log('✅ 已保存最近記錄:', sentenceData.word, '動作:', sentenceData.action || 'view');
        
        // 更新顯示
        displayRecentSentences();
    } catch (e) {
        console.error('保存最近記錄失敗:', e);
    }
}

function displayRecentSentences() {
    const container = document.getElementById('recent-sentences-container');
    const list = document.getElementById('recent-sentences-list');
    
    if (!container || !list) return;
    
    const recent = getRecentSentences();
    
    if (recent.length === 0) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'block';
    list.innerHTML = '';
    
    recent.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'recent-sentence-item';
        
        const timeAgo = getTimeAgo(item.timestamp);
        const shortSentence = item.sentence.length > 60 
            ? item.sentence.substring(0, 60) + '...' 
            : item.sentence;
        
        // 動作圖示
        const actionIcon = item.action === 'play' ? '🔊' : '👁️';
        const actionText = item.action === 'play' ? '播放' : '閱讀';
        
        itemDiv.innerHTML = `
            <div class="recent-sentence-word">${actionIcon} ${item.word}</div>
            <div class="recent-sentence-text">${shortSentence}</div>
            <div class="recent-sentence-time">${timeAgo} · ${actionText}</div>
        `;
        
        itemDiv.addEventListener('click', () => {
            navigateToSentence(item.word);
        });
        
        list.appendChild(itemDiv);
    });
}

function getTimeAgo(timestamp) {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return '剛剛';
    if (diffMins < 60) return `${diffMins} 分鐘前`;
    if (diffHours < 24) return `${diffHours} 小時前`;
    if (diffDays < 7) return `${diffDays} 天前`;
    return past.toLocaleDateString('zh-TW');
}

function navigateToSentence(word) {
    if (typeof sentenceData === 'undefined') {
        console.error('sentenceData 未定義');
        return;
    }
    
    const relatedSentences = sentenceData.filter(s => 
        s.Words && s.Words.startsWith(word + "-")
    );
    
    if (relatedSentences.length > 0 && typeof displaySentenceList === 'function') {
        window.currentSentenceList = relatedSentences;
        displaySentenceList(relatedSentences, `${word} 的句子`);
    }
}

// ========== Checkbox 功能修正 ==========
function updateCheckboxFixed() {
    const noteTextarea = document.getElementById("sentenceNote");
    const noteCheckbox = document.getElementById("noteCheckbox");
    
    if (!noteTextarea || !noteCheckbox) {
        console.warn('⚠️ 筆記元素不存在');
        return;
    }
    
    let note = noteTextarea.value.trim();
    noteCheckbox.checked = note.length > 0;
    console.log('📝 更新 checkbox:', note.length > 0);
}

function handleCheckboxClickFixed() {
    const checkbox = document.getElementById("noteCheckbox");
    const noteTextarea = document.getElementById("sentenceNote");
    
    if (!checkbox || !noteTextarea) {
        console.warn('⚠️ Checkbox 元素不存在');
        return;
    }
    
    console.log('🔘 Checkbox 點擊, checked:', checkbox.checked);
    
    if (!checkbox.checked) {
        // 取消勾選時清除筆記
        // 嘗試多種方式獲取 sentenceId
        let sentenceId = null;
        
        // 方法1: 從 sentenceTitle 獲取
        const sentenceTitle = document.getElementById("sentenceTitle");
        if (sentenceTitle) {
            sentenceId = sentenceTitle.textContent.trim();
        }
        
        // 方法2: 從 sentenceHeader 獲取
        if (!sentenceId) {
            const sentenceHeader = document.getElementById("sentenceHeader");
            if (sentenceHeader) {
                // sentenceHeader 可能包含 HTML，需要提取文字
                const titleDiv = sentenceHeader.querySelector('#sentenceTitle');
                if (titleDiv) {
                    sentenceId = titleDiv.textContent.trim();
                } else {
                    // 直接從 textContent 提取
                    sentenceId = sentenceHeader.textContent.trim().split('\n')[0];
                }
            }
        }
        
        // 方法3: 從全局變量獲取
        if (!sentenceId && typeof currentSentenceList !== 'undefined' && typeof currentSentenceIndex !== 'undefined') {
            const currentSentence = currentSentenceList[currentSentenceIndex];
            if (currentSentence && currentSentence.Words) {
                sentenceId = currentSentence.Words;
            }
        }
        
        console.log('🗑️ 嘗試刪除筆記, sentenceId:', sentenceId);
        
        if (sentenceId) {
            // 確保有 vocabularyData 函數可用
            if (typeof window.getVocabularyData === 'function' && 
                typeof window.setNoteSentences === 'function' &&
                typeof window.persistVocabularyData === 'function') {
                
                let vocabularyData = window.getVocabularyData();
                let noteSentences = vocabularyData.noteSentences || {};
                delete noteSentences[sentenceId];
                window.setNoteSentences(noteSentences);
                window.persistVocabularyData();
                
                noteTextarea.value = "";
                
                if (typeof showNotification === 'function') {
                    showNotification("🗑️ 筆記已刪除。", "success");
                }
                console.log('✅ 筆記已刪除');
            } else {
                // 降級處理
                console.warn('⚠️ vocabularyData 函數不可用,使用 localStorage');
                noteTextarea.value = "";
                try {
                    localStorage.removeItem(`sentence_note_${sentenceId}`);
                    if (typeof showNotification === 'function') {
                        showNotification("🗑️ 筆記已刪除。", "success");
                    }
                    console.log('✅ 筆記已刪除 (localStorage)');
                } catch (e) {
                    console.error('❌ 清除筆記失敗:', e);
                }
            }
        } else {
            console.warn('⚠️ 找不到 sentenceId，無法刪除筆記');
            console.log('💡 嘗試直接清空筆記框...');
            noteTextarea.value = "";
        }
    }
}

// ========== 增強的句子詳情顯示 ==========
// 攔截並增強原始的 displaySentenceDetails 函數
const originalDisplaySentenceDetails = window.displaySentenceDetails;

window.displaySentenceDetails = function(sentence) {
    // 調用原始函數
    if (originalDisplaySentenceDetails) {
        originalDisplaySentenceDetails.call(this, sentence);
    }
    
    // 保存到最近閱讀
    if (sentence && sentence.Words && sentence.Sentence) {
        console.log('💾 保存到最近記錄:', sentence.Words, '(閱讀)');
        saveRecentSentence({
            word: sentence.Words,
            sentence: sentence.Sentence,
            chinese: sentence.Chinese || '',
            action: 'view'
        });
    }
    
    // 確保 checkbox 正確更新
    setTimeout(() => {
        updateCheckboxFixed();
    }, 100);
};

// 攔截音檔播放函數
const originalPlaySentenceAudio = window.playSentenceAudio;

window.playSentenceAudio = function(audioFile) {
    // 調用原始函數
    if (originalPlaySentenceAudio) {
        originalPlaySentenceAudio.call(this, audioFile);
    }
    
    // 從當前句子列表獲取正在播放的句子資訊
    if (typeof currentSentenceList !== 'undefined' && 
        typeof currentSentenceIndex !== 'undefined' &&
        currentSentenceList[currentSentenceIndex]) {
        
        const sentence = currentSentenceList[currentSentenceIndex];
        console.log('🔊 記錄播放:', sentence.Words);
        
        saveRecentSentence({
            word: sentence.Words,
            sentence: sentence.Sentence,
            chinese: sentence.Chinese || '',
            action: 'play'
        });
    }
};

// ========== 初始化增強功能 ==========
function initEnhancements() {
    console.log('🚀 初始化 sentence 頁面增強功能...');
    
    // 立即更新一次用戶狀態
    updateUserStatusDisplay();
    
    // 延遲再更新一次(確保 Firebase 已載入)
    setTimeout(updateUserStatusDisplay, 500);
    setTimeout(updateUserStatusDisplay, 1500);
    
    // 顯示最近閱讀記錄
    displayRecentSentences();
    
    // 監聽 Firebase Auth 狀態變化
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged((user) => {
            console.log('🔄 Auth 狀態變化:', user ? '已登入' : '未登入');
            setTimeout(updateUserStatusDisplay, 100);
        });
    }
    
    // 覆蓋原始的 checkbox 函數
    window.updateCheckbox = updateCheckboxFixed;
    window.handleCheckboxClick = handleCheckboxClickFixed;
    
    console.log('✅ sentence 頁面增強功能初始化完成');
}

// 多重初始化確保載入
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEnhancements);
} else {
    initEnhancements();
}

window.addEventListener('load', () => {
    setTimeout(initEnhancements, 500);
});

// 導出函數供外部使用
window.sentenceEnhancements = {
    updateUserStatusDisplay,
    saveRecentSentence,
    displayRecentSentences,
    navigateToSentence,
    updateCheckboxFixed,
    handleCheckboxClickFixed,
    // 測試工具
    setGuestMode: function() {
        localStorage.setItem('isGuestMode', 'true');
        updateUserStatusDisplay();
        console.log('✅ 已設置為訪客模式');
    },
    setUserName: function(name) {
        localStorage.setItem('userName', name);
        localStorage.setItem('isGuestMode', 'false');
        updateUserStatusDisplay();
        console.log('✅ 已設置用戶名:', name);
    },
    debugInfo: function() {
        console.log('=== 除錯資訊 ===');
        console.log('localStorage keys:', Object.keys(localStorage));
        console.log('user-info element:', document.getElementById('user-info'));
        console.log('user-info text:', document.getElementById('user-info')?.textContent);
        console.log('isGuestMode:', localStorage.getItem('isGuestMode'));
        console.log('userName:', localStorage.getItem('userName'));
        console.log('userEmail:', localStorage.getItem('userEmail'));
        console.log('Firebase user:', firebase?.auth()?.currentUser);
        console.log('================');
    }
};

console.log('✅ sentence-enhancements.js 載入完成');
console.log('💡 提示: 執行 sentenceEnhancements.debugInfo() 查看除錯資訊');
