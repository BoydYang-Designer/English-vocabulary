/**
 * auth-manager.js - 備援版本（已修復）
 * 提供基本的資料管理功能，並兼容 Firebase 相關調用
 * 如果您有完整的Firebase auth-manager.js，請使用該版本
 */

console.log("✅ auth-manager.js (備援版本 - 已修復) loaded");

// ============================================
// 模擬 Firebase 用戶物件
// ============================================
const mockUser = {
    isAnonymous: true,
    uid: 'local-user',
    displayName: '訪客模式',
    email: null
};

// 全域變數，模擬 Firebase 的 currentUser
window.currentUser = mockUser;

// ============================================
// 全域資料物件
// ============================================
let vocabularyData = {
    checkedWords: {},        // { "word": "true" }
    importantWords: {},      // { "word": "true" }
    wrongWords: [],          // ["word1", "word2"]
    checkedSentences: {},    // { "sentenceId": "true" }
    importantSentences: {},  // { "sentenceId": "true" }
    wrongQS: [],            // ["sentenceId1", "sentenceId2"]
    wordQuizHistory: {},     // { "word": count }
    sentenceQuizHistory: {}, // { "sentenceId": count }
    wordRatings: {},         // { "word": { ratings: [], lastRated: null, avgRating: 0 } }
    sentenceRatings: {},     // { "sentenceId": { ratings: [], lastRated: null, avgRating: 0 } }
    flashcardHistory: {      // 字卡練習記錄
        word: {},            // { "word": { seen: 0, known: 0, uncertain: 0, unknown: 0, streak: 0 } }
        sentence: {}         // { "sentenceId": { seen: 0, known: 0, uncertain: 0, unknown: 0, streak: 0 } }
    }
};

/**
 * 從 localStorage 載入資料
 */
function loadVocabularyData() {
    try {
        const saved = localStorage.getItem('vocabularyData');
        if (saved) {
            const parsed = JSON.parse(saved);
            vocabularyData = {
                ...vocabularyData,
                ...parsed,
                // 確保陣列欄位是陣列
                wrongWords: Array.isArray(parsed.wrongWords) ? parsed.wrongWords : [],
                wrongQS: Array.isArray(parsed.wrongQS) ? parsed.wrongQS : [],
                // 確保物件欄位是物件
                checkedWords: parsed.checkedWords || {},
                importantWords: parsed.importantWords || {},
                checkedSentences: parsed.checkedSentences || {},
                importantSentences: parsed.importantSentences || {},
                wordQuizHistory: parsed.wordQuizHistory || {},
                sentenceQuizHistory: parsed.sentenceQuizHistory || {},
                wordRatings: parsed.wordRatings || {},
                sentenceRatings: parsed.sentenceRatings || {},
                flashcardHistory: parsed.flashcardHistory || { word: {}, sentence: {} }
            };
            console.log("✅ 從 localStorage 載入資料成功");
        } else {
            console.log("ℹ️ 沒有儲存的資料，使用預設值");
        }
    } catch (error) {
        console.error("❌ 載入資料失敗:", error);
    }
}

/**
 * 儲存資料到 localStorage
 */
function saveVocabularyData() {
    try {
        localStorage.setItem('vocabularyData', JSON.stringify(vocabularyData));
        console.log("✅ 資料已儲存到 localStorage");
    } catch (error) {
        console.error("❌ 儲存資料失敗:", error);
    }
}

/**
 * 提供給其他模組存取資料的函數
 */
window.getVocabularyData = function() {
    return vocabularyData;
};

/**
 * 提供給其他模組儲存資料的函數
 */
window.persistVocabularyData = function() {
    saveVocabularyData();
};

/**
 * 設定錯誤單字（保持相容性）
 */
window.setWrongWords = function(words) {
    vocabularyData.wrongWords = words;
    saveVocabularyData();
};

/**
 * 設定錯誤句子（保持相容性）
 */
window.setWrongQS = function(sentences) {
    vocabularyData.wrongQS = sentences;
    saveVocabularyData();
};

// ============================================
// 模擬 Firebase 認證函數
// ============================================

/**
 * 模擬登入功能
 */
window.signIn = function() {
    console.log('📝 備援模式：登入功能未啟用，使用訪客模式');
    alert('此為備援版本，登入功能未啟用。\n您可以繼續使用訪客模式。');
    // 不執行任何操作，因為已經在訪客模式中
};

/**
 * 模擬訪客模式進入
 */
window.enterGuestMode = function() {
    console.log('✅ 進入訪客模式');
    // 已經在訪客模式中，不需要額外操作
};

/**
 * 模擬登出功能
 */
window.signOutUser = function() {
    console.log('📝 備援模式：登出功能未啟用');
    if (confirm('確定要清除所有資料並重新載入嗎？')) {
        localStorage.clear();
        location.reload();
    }
};

/**
 * 模擬 Firestore 儲存（實際上不執行）
 */
window.saveWordsToFirestore = function() {
    console.log('ℹ️ 備援模式：Firestore 儲存功能未啟用，資料已儲存到 localStorage');
    // 在備援模式中，資料已經透過 localStorage 儲存
};

// ============================================
// 初始化
// ============================================

// 頁面載入時立即載入資料
loadVocabularyData();

// 發送 'auth-ready' 事件，通知其他模組可以開始使用資料
document.addEventListener('DOMContentLoaded', function() {
    // 延遲發送事件，確保其他腳本已載入
    setTimeout(() => {
        const event = new CustomEvent('auth-ready', {
            detail: {
                user: mockUser
            }
        });
        document.dispatchEvent(event);
        console.log("✅ auth-ready 事件已發送（含模擬用戶資料）");
    }, 100);
});

// 頁面關閉前儲存資料
window.addEventListener('beforeunload', function() {
    saveVocabularyData();
});

/**
 * 資料遷移函數 - 將舊格式轉換為新格式
 */
function migrateOldData() {
    let migrated = false;
    
    // 遷移 checkedWords 從陣列到物件
    if (Array.isArray(vocabularyData.checkedWords)) {
        const newCheckedWords = {};
        vocabularyData.checkedWords.forEach(word => {
            newCheckedWords[word] = "true";
        });
        vocabularyData.checkedWords = newCheckedWords;
        migrated = true;
        console.log("✅ checkedWords 已從陣列遷移到物件");
    }
    
    // 遷移 importantWords 從陣列到物件
    if (Array.isArray(vocabularyData.importantWords)) {
        const newImportantWords = {};
        vocabularyData.importantWords.forEach(word => {
            newImportantWords[word] = "true";
        });
        vocabularyData.importantWords = newImportantWords;
        migrated = true;
        console.log("✅ importantWords 已從陣列遷移到物件");
    }
    
    // 遷移 checkedSentences 從陣列到物件
    if (Array.isArray(vocabularyData.checkedSentences)) {
        const newCheckedSentences = {};
        vocabularyData.checkedSentences.forEach(sentence => {
            newCheckedSentences[sentence] = "true";
        });
        vocabularyData.checkedSentences = newCheckedSentences;
        migrated = true;
        console.log("✅ checkedSentences 已從陣列遷移到物件");
    }
    
    // 遷移 importantSentences 從陣列到物件
    if (Array.isArray(vocabularyData.importantSentences)) {
        const newImportantSentences = {};
        vocabularyData.importantSentences.forEach(sentence => {
            newImportantSentences[sentence] = "true";
        });
        vocabularyData.importantSentences = newImportantSentences;
        migrated = true;
        console.log("✅ importantSentences 已從陣列遷移到物件");
    }
    
    if (migrated) {
        saveVocabularyData();
        console.log("✅ 資料遷移完成並已儲存");
    }
}

// 執行資料遷移
migrateOldData();

/**
 * 輔助函數：重置所有資料（僅供開發/測試使用）
 */
window.resetVocabularyData = function() {
    if (confirm('確定要重置所有資料嗎？此操作無法復原！')) {
        vocabularyData = {
            checkedWords: {},
            importantWords: {},
            wrongWords: [],
            checkedSentences: {},
            importantSentences: {},
            wrongQS: [],
            wordQuizHistory: {},
            sentenceQuizHistory: {},
            wordRatings: {},
            sentenceRatings: {},
            flashcardHistory: { word: {}, sentence: {} }
        };
        saveVocabularyData();
        alert('✅ 資料已重置');
        location.reload();
    }
};

/**
 * 輔助函數：匯出資料為JSON檔案
 */
window.exportVocabularyData = function() {
    const dataStr = JSON.stringify(vocabularyData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vocabulary-data-${new Date().toISOString().slice(0,10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    console.log('✅ 資料已匯出');
};

/**
 * 輔助函數：從JSON檔案匯入資料
 */
window.importVocabularyData = function(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            vocabularyData = {
                ...vocabularyData,
                ...imported
            };
            saveVocabularyData();
            alert('✅ 資料匯入成功！頁面將重新載入。');
            location.reload();
        } catch (error) {
            console.error('❌ 匯入失敗:', error);
            alert('❌ 匯入失敗，請確認檔案格式正確');
        }
    };
    reader.readAsText(file);
};

console.log("✅ Auth Manager 初始化完成");
console.log("📊 當前資料統計:", {
    checkedWords: Object.keys(vocabularyData.checkedWords).length,
    importantWords: Object.keys(vocabularyData.importantWords).length,
    wrongWords: vocabularyData.wrongWords.length,
    wordQuizHistory: Object.keys(vocabularyData.wordQuizHistory).length,
    sentenceQuizHistory: Object.keys(vocabularyData.sentenceQuizHistory).length
});
console.log("👤 當前用戶模式: 訪客模式（備援版本）");
