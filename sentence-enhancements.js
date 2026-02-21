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
    
    const isGuest = localStorage.getItem('isGuestMode') === 'true' || 
                    localStorage.getItem('guestMode') === 'true' ||
                    localStorage.getItem('guest') === 'true';
    
    if (isGuest) {
        userInfo.textContent = '訪客模式';
        return;
    }
    
    const userName = localStorage.getItem('userName') || 
                     localStorage.getItem('displayName') ||
                     localStorage.getItem('username');
    
    if (userName && userName !== 'null' && userName !== 'undefined') {
        userInfo.textContent = `歡迎, ${userName}`;
        return;
    }
    
    const userEmail = localStorage.getItem('userEmail') || 
                      localStorage.getItem('email');
    
    if (userEmail && userEmail !== 'null' && userEmail !== 'undefined') {
        userInfo.textContent = `歡迎, ${userEmail}`;
        return;
    }
    
    if (typeof firebase !== 'undefined' && firebase.auth) {
        try {
            const user = firebase.auth().currentUser;
            if (user) {
                const displayName = user.displayName || user.email || '已登入用戶';
                userInfo.textContent = `歡迎, ${displayName}`;
                return;
            }
        } catch (e) {
            console.warn('Firebase Auth 檢查失敗:', e);
        }
    }
    
    userInfo.textContent = '訪客模式';
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
        recent = recent.filter(item => item.word !== sentenceData.word);
        recent.unshift({
            word: sentenceData.word,
            sentence: sentenceData.sentence,
            chinese: sentenceData.chinese,
            timestamp: new Date().toISOString(),
            action: sentenceData.action || 'view'
        });
        recent = recent.slice(0, MAX_RECENT_SENTENCES);
        localStorage.setItem(RECENT_SENTENCES_KEY, JSON.stringify(recent));
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
    
    recent.forEach((item) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'recent-sentence-item';
        const timeAgo = getTimeAgo(item.timestamp);
        const shortSentence = item.sentence && item.sentence.length > 60 
            ? item.sentence.substring(0, 60) + '...' 
            : (item.sentence || '');
        const actionIcon = item.action === 'play' ? '🔊' : '👁️';
        const actionText = item.action === 'play' ? '播放' : '閱讀';
        
        itemDiv.innerHTML = `
            <div class="recent-sentence-word">${actionIcon} ${item.word}</div>
            <div class="recent-sentence-text">${shortSentence}</div>
            <div class="recent-sentence-time">${timeAgo} · ${actionText}</div>
        `;
        itemDiv.addEventListener('click', () => { navigateToSentence(item.word); });
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
    if (typeof sentenceData === 'undefined') return;
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
    if (!noteTextarea || !noteCheckbox) return;
    noteCheckbox.checked = noteTextarea.value.trim().length > 0;
}

function handleCheckboxClickFixed() {
    const checkbox = document.getElementById("noteCheckbox");
    const noteTextarea = document.getElementById("sentenceNote");
    if (!checkbox || !noteTextarea) return;
    
    if (!checkbox.checked) {
        let sentenceId = null;
        const sentenceTitle = document.getElementById("sentenceTitle");
        if (sentenceTitle) sentenceId = sentenceTitle.textContent.trim();
        
        if (!sentenceId && typeof currentSentenceList !== 'undefined' && typeof currentSentenceIndex !== 'undefined') {
            const cur = currentSentenceList[currentSentenceIndex];
            if (cur && cur.Words) sentenceId = cur.Words;
        }
        
        if (sentenceId) {
            if (typeof window.getVocabularyData === 'function') {
                let vocabularyData = window.getVocabularyData();
                let noteSentences = vocabularyData.noteSentences || {};
                delete noteSentences[sentenceId];
                window.setNoteSentences(noteSentences);
                window.persistVocabularyData();
                noteTextarea.value = "";
                if (typeof showNotification === 'function') showNotification("🗑️ 筆記已刪除。", "success");
            } else {
                noteTextarea.value = "";
                localStorage.removeItem(`sentence_note_${sentenceId}`);
                if (typeof showNotification === 'function') showNotification("🗑️ 筆記已刪除。", "success");
            }
        } else {
            noteTextarea.value = "";
        }
    }
}

// ========== 管理按鈕功能（取代舊的編輯按鈕）==========
function initManageButton() {
    // manage-btn 已在 HTML 內直接綁定 onclick，這裡做備援綁定
    const manageBtn = document.getElementById('manage-btn');
    if (manageBtn && !manageBtn.dataset.bound) {
        manageBtn.addEventListener('click', () => {
            window.location.href = 'management.html';
        });
        manageBtn.dataset.bound = 'true';
        console.log('✅ 管理按鈕已綁定');
    }
    // 相容舊的 edit-storage-btn（若存在）
    const editBtn = document.getElementById('edit-storage-btn');
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            window.location.href = 'management.html';
        });
    }
}

// ========== 初始化增強功能 ==========
function initEnhancements() {
    console.log('🚀 初始化 sentence 頁面增強功能...');
    updateUserStatusDisplay();
    setTimeout(updateUserStatusDisplay, 500);
    setTimeout(updateUserStatusDisplay, 1500);
    displayRecentSentences();
    initManageButton();
    
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged((user) => {
            setTimeout(updateUserStatusDisplay, 100);
        });
    }
    
    window.updateCheckbox = updateCheckboxFixed;
    window.handleCheckboxClick = handleCheckboxClickFixed;
    
    console.log('✅ sentence 頁面增強功能初始化完成');
}

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
    setGuestMode: function() {
        localStorage.setItem('isGuestMode', 'true');
        updateUserStatusDisplay();
    },
    setUserName: function(name) {
        localStorage.setItem('userName', name);
        localStorage.setItem('isGuestMode', 'false');
        updateUserStatusDisplay();
    },
    debugInfo: function() {
        console.log('=== 除錯資訊 ===');
        console.log('localStorage keys:', Object.keys(localStorage));
        console.log('isGuestMode:', localStorage.getItem('isGuestMode'));
        console.log('userName:', localStorage.getItem('userName'));
        console.log('================');
    }
};

console.log('✅ sentence-enhancements.js 載入完成');
