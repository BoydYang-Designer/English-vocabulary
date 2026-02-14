/**
 * quiz-memory-manager.js
 * 單字測驗 & 句子測驗 記憶度管理系統
 * 基於 1-5 分評分系統，提供統一的管理介面
 */

console.log("✅ quiz-memory-manager.js loaded");

// ═══════════════════════════════════════════════════════════════
//  單字測驗記憶度管理
// ═══════════════════════════════════════════════════════════════

let wordMgrAllData = [];
let wordMgrFilteredData = [];
let wordMgrActiveCategory = 'all'; // 'all' | 'tested' | 'correct' | 'incorrect'

/**
 * 開啟單字測驗記憶度管理介面
 */
function openWordMemoryManager() {
    hideAllPanels();
    document.getElementById('wordMemoryManagerPanel').style.display = 'block';
    updateBreadcrumb(['選擇功能', '測驗中心', '單字測驗', '記憶度管理']);
    
    wordMgrActiveCategory = 'all';
    wordMgrLoadData();
}

/**
 * 關閉單字測驗記憶度管理介面
 */
function closeWordMemoryManager() {
    hideAllPanels();
    document.getElementById('quizCategories').style.display = 'block';
    updateBreadcrumb(['選擇功能', '測驗中心', '單字測驗']);
}

/**
 * 載入單字測驗資料
 */
function wordMgrLoadData() {
    const vocab = window.getVocabularyData ? window.getVocabularyData() : {};
    const wordRatings = vocab.wordRatings || {};
    
    // 合併所有單字資料
    wordMgrAllData = (wordsData || []).map(item => {
        const word = item.Words;
        const history = wordRatings[word] || {
            ratings: [],
            lastRated: null,
            avgRating: 0
        };
        
        // 計算統計數據
        const testedCount = history.ratings.length;
        const correctCount = history.ratings.filter(r => r >= 4).length; // 4-5分算答對
        const incorrectCount = history.ratings.filter(r => r <= 3).length; // 1-3分算答錯
        
        return {
            word,
            item,
            history,
            testedCount,
            correctCount,
            incorrectCount,
            priority: calculateWordPriority(word)
        };
    });
    
    wordMgrFilterData();
}

/**
 * 篩選資料
 */
function wordMgrFilterData() {
    const searchText = document.getElementById('word-mgr-search').value.toLowerCase().trim();
    const sortBy = document.getElementById('word-mgr-sort').value;
    
    // 第一步：根據分類篩選
    let categoryFiltered = wordMgrAllData;
    
    switch (wordMgrActiveCategory) {
        case 'tested':
            categoryFiltered = wordMgrAllData.filter(d => d.testedCount > 0);
            break;
        case 'correct':
            categoryFiltered = wordMgrAllData.filter(d => d.correctCount > 0);
            break;
        case 'incorrect':
            categoryFiltered = wordMgrAllData.filter(d => d.incorrectCount > 0);
            break;
        case 'all':
        default:
            categoryFiltered = wordMgrAllData;
            break;
    }
    
    // 第二步：根據搜尋文字篩選
    wordMgrFilteredData = categoryFiltered.filter(data => {
        if (!searchText) return true;
        
        const name = data.item.Words || '';
        const chinese = data.item['traditional Chinese'] || '';
        
        return name.toLowerCase().includes(searchText) || 
               chinese.toLowerCase().includes(searchText);
    });
    
    // 第三步：排序
    wordMgrFilteredData.sort((a, b) => {
        switch (sortBy) {
            case 'priority':
                return a.priority - b.priority;
            case 'name':
                return (a.item.Words || '').localeCompare(b.item.Words || '');
            case 'tested-desc':
                return b.testedCount - a.testedCount;
            case 'tested-asc':
                return a.testedCount - b.testedCount;
            case 'rating-desc':
                return b.history.avgRating - a.history.avgRating;
            case 'rating-asc':
                return a.history.avgRating - b.history.avgRating;
            default:
                return 0;
        }
    });
    
    wordMgrRenderData();
}

/**
 * 渲染資料
 */
function wordMgrRenderData() {
    const listEl = document.getElementById('word-mgr-list');
    
    // 更新統計
    const total = wordMgrAllData.length;
    const tested = wordMgrAllData.filter(d => d.testedCount > 0).length;
    const correct = wordMgrAllData.filter(d => d.correctCount > 0).length;
    const incorrect = wordMgrAllData.filter(d => d.incorrectCount > 0).length;
    
    document.getElementById('word-mgr-total').textContent = total;
    document.getElementById('word-mgr-tested').textContent = tested;
    document.getElementById('word-mgr-correct').textContent = correct;
    document.getElementById('word-mgr-incorrect').textContent = incorrect;
    
    // 更新統計卡片的 active 狀態
    document.querySelectorAll('#wordMemoryManagerPanel .fc-mgr-stat').forEach((btn, index) => {
        const categories = ['all', 'tested', 'correct', 'incorrect'];
        btn.classList.toggle('active', wordMgrActiveCategory === categories[index]);
    });
    
    // 更新篩選提示
    const filterHint = document.getElementById('word-mgr-filter-hint');
    const filterText = filterHint.querySelector('.fc-mgr-filter-text');
    
    if (wordMgrActiveCategory !== 'all') {
        const labels = {
            'tested': '已測驗過',
            'correct': '已答對',
            'incorrect': '已答錯'
        };
        filterText.textContent = `目前篩選：${labels[wordMgrActiveCategory]} (${wordMgrFilteredData.length} 個)`;
        filterHint.style.display = 'flex';
    } else {
        filterHint.style.display = 'none';
    }
    
    // 渲染列表
    if (wordMgrFilteredData.length === 0) {
        listEl.innerHTML = '<div class="fc-mgr-empty">沒有符合條件的單字</div>';
        return;
    }
    
    listEl.innerHTML = wordMgrFilteredData.map(data => {
        const chinese = data.item['traditional Chinese']?.split('\n')[0] || '無中文';
        const avgRating = data.history.avgRating.toFixed(1);
        const priorityLabel = getPriorityLabel(data.priority);
        
        return `
            <div class="fc-mgr-item" data-word="${data.word}">
                <div class="fc-mgr-item-header" onclick="wordMgrPlayAudio('${data.word}')" style="cursor: pointer;" title="點擊播放發音">
                    <div class="fc-mgr-item-title">
                        <span class="fc-mgr-word">🔊 ${data.word}</span>
                        <span class="fc-mgr-chinese">${chinese}</span>
                    </div>
                    <div class="fc-mgr-item-priority priority-${data.priority}">
                        ${priorityLabel}
                    </div>
                </div>
                <div class="fc-mgr-item-stats">
                    <div class="stat-group">
                        <span class="stat-label">測驗次數</span>
                        <span class="stat-value">${data.testedCount}</span>
                    </div>
                    <div class="stat-group">
                        <span class="stat-label">答對次數</span>
                        <span class="stat-value">${data.correctCount}</span>
                    </div>
                    <div class="stat-group">
                        <span class="stat-label">答錯次數</span>
                        <span class="stat-value">${data.incorrectCount}</span>
                    </div>
                    <div class="stat-group">
                        <span class="stat-label">平均分數</span>
                        <span class="stat-value">${avgRating}</span>
                    </div>
                </div>
                <div class="fc-mgr-item-actions">
                    <button class="btn-audio" onclick="event.stopPropagation(); wordMgrPlayAudio('${data.word}')" title="播放發音">🔊</button>
                    <button class="btn-edit" onclick="wordMgrEditItem('${data.word}')">編輯</button>
                    <button class="btn-reset" onclick="wordMgrResetItem('${data.word}')">重置</button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * 根據分類篩選
 */
function wordMgrFilterByCategory(category) {
    wordMgrActiveCategory = category;
    wordMgrFilterData();
}

/**
 * 編輯單字記錄
 */
function wordMgrEditItem(word) {
    const vocab = window.getVocabularyData();
    const history = vocab.wordRatings[word] || { ratings: [], lastRated: null, avgRating: 0 };
    
    const newRating = prompt(
        `編輯單字「${word}」的評分\n\n` +
        `目前測驗次數：${history.ratings.length}\n` +
        `平均分數：${history.avgRating.toFixed(1)}\n` +
        `歷史評分：${history.ratings.join(', ')}\n\n` +
        `請輸入新的評分 (1-5)：`
    );
    
    if (newRating && !isNaN(newRating)) {
        const rating = Math.max(1, Math.min(5, parseInt(newRating)));
        rateWord(word, rating);
        wordMgrLoadData();
        showToast(`已為「${word}」添加評分：${rating}分`);
    }
}

/**
 * 重置單字記錄
 */
function wordMgrResetItem(word) {
    if (!confirm(`確定要重置「${word}」的所有測驗記錄嗎？`)) return;
    
    const vocab = window.getVocabularyData();
    if (vocab.wordRatings && vocab.wordRatings[word]) {
        delete vocab.wordRatings[word];
        window.persistVocabularyData();
        wordMgrLoadData();
        showToast(`已重置「${word}」的測驗記錄`);
    }
}

/**
 * 重置所有記錄
 */
function wordMgrResetAll() {
    if (!confirm('確定要重置所有單字的測驗記錄嗎？此操作無法復原！')) return;
    
    const vocab = window.getVocabularyData();
    vocab.wordRatings = {};
    window.persistVocabularyData();
    wordMgrLoadData();
    showToast('已重置所有單字測驗記錄');
}

/**
 * 匯出資料
 */
function wordMgrExportData() {
    const vocab = window.getVocabularyData();
    const data = {
        exportDate: new Date().toISOString(),
        type: 'word-quiz-ratings',
        ratings: vocab.wordRatings || {}
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `單字測驗記錄_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('已匯出單字測驗資料');
}

// ═══════════════════════════════════════════════════════════════
//  句子測驗記憶度管理
// ═══════════════════════════════════════════════════════════════

let sentenceMgrAllData = [];
let sentenceMgrFilteredData = [];
let sentenceMgrActiveCategory = 'all';

/**
 * 開啟句子測驗記憶度管理介面
 */
function openSentenceMemoryManager() {
    hideAllPanels();
    document.getElementById('sentenceMemoryManagerPanel').style.display = 'block';
    updateBreadcrumb(['選擇功能', '測驗中心', '句子測驗', '記憶度管理']);
    
    sentenceMgrActiveCategory = 'all';
    sentenceMgrLoadData();
}

/**
 * 關閉句子測驗記憶度管理介面
 */
function closeSentenceMemoryManager() {
    hideAllPanels();
    document.getElementById('sentenceQuizCategories').style.display = 'block';
    updateBreadcrumb(['選擇功能', '測驗中心', '句子測驗']);
}

/**
 * 載入句子測驗資料
 */
function sentenceMgrLoadData() {
    const vocab = window.getVocabularyData ? window.getVocabularyData() : {};
    const sentenceRatings = vocab.sentenceRatings || {};
    
    sentenceMgrAllData = (sentenceData || []).map(item => {
        const sentenceId = item.Words || item['句子'];
        const history = sentenceRatings[sentenceId] || {
            ratings: [],
            lastRated: null,
            avgRating: 0
        };
        
        const testedCount = history.ratings.length;
        const correctCount = history.ratings.filter(r => r >= 4).length;
        const incorrectCount = history.ratings.filter(r => r <= 3).length;
        
        return {
            sentenceId,
            item,
            history,
            testedCount,
            correctCount,
            incorrectCount,
            priority: calculateSentencePriority(sentenceId)
        };
    });
    
    sentenceMgrFilterData();
}

/**
 * 篩選資料
 */
function sentenceMgrFilterData() {
    const searchText = document.getElementById('sentence-mgr-search').value.toLowerCase().trim();
    const sortBy = document.getElementById('sentence-mgr-sort').value;
    
    let categoryFiltered = sentenceMgrAllData;
    
    switch (sentenceMgrActiveCategory) {
        case 'tested':
            categoryFiltered = sentenceMgrAllData.filter(d => d.testedCount > 0);
            break;
        case 'correct':
            categoryFiltered = sentenceMgrAllData.filter(d => d.correctCount > 0);
            break;
        case 'incorrect':
            categoryFiltered = sentenceMgrAllData.filter(d => d.incorrectCount > 0);
            break;
        case 'all':
        default:
            categoryFiltered = sentenceMgrAllData;
            break;
    }
    
    sentenceMgrFilteredData = categoryFiltered.filter(data => {
        if (!searchText) return true;
        
        const sentence = data.item['句子'] || '';
        const chinese = data.item['中文'] || '';
        
        return sentence.toLowerCase().includes(searchText) || 
               chinese.toLowerCase().includes(searchText);
    });
    
    sentenceMgrFilteredData.sort((a, b) => {
        switch (sortBy) {
            case 'priority':
                return a.priority - b.priority;
            case 'name':
                return (a.item['句子'] || '').localeCompare(b.item['句子'] || '');
            case 'tested-desc':
                return b.testedCount - a.testedCount;
            case 'tested-asc':
                return a.testedCount - b.testedCount;
            case 'rating-desc':
                return b.history.avgRating - a.history.avgRating;
            case 'rating-asc':
                return a.history.avgRating - b.history.avgRating;
            default:
                return 0;
        }
    });
    
    sentenceMgrRenderData();
}

/**
 * 渲染資料
 */
function sentenceMgrRenderData() {
    const listEl = document.getElementById('sentence-mgr-list');
    
    const total = sentenceMgrAllData.length;
    const tested = sentenceMgrAllData.filter(d => d.testedCount > 0).length;
    const correct = sentenceMgrAllData.filter(d => d.correctCount > 0).length;
    const incorrect = sentenceMgrAllData.filter(d => d.incorrectCount > 0).length;
    
    document.getElementById('sentence-mgr-total').textContent = total;
    document.getElementById('sentence-mgr-tested').textContent = tested;
    document.getElementById('sentence-mgr-correct').textContent = correct;
    document.getElementById('sentence-mgr-incorrect').textContent = incorrect;
    
    document.querySelectorAll('#sentenceMemoryManagerPanel .fc-mgr-stat').forEach((btn, index) => {
        const categories = ['all', 'tested', 'correct', 'incorrect'];
        btn.classList.toggle('active', sentenceMgrActiveCategory === categories[index]);
    });
    
    const filterHint = document.getElementById('sentence-mgr-filter-hint');
    const filterText = filterHint.querySelector('.fc-mgr-filter-text');
    
    if (sentenceMgrActiveCategory !== 'all') {
        const labels = {
            'tested': '已測驗過',
            'correct': '已答對',
            'incorrect': '已答錯'
        };
        filterText.textContent = `目前篩選：${labels[sentenceMgrActiveCategory]} (${sentenceMgrFilteredData.length} 個)`;
        filterHint.style.display = 'flex';
    } else {
        filterHint.style.display = 'none';
    }
    
    if (sentenceMgrFilteredData.length === 0) {
        listEl.innerHTML = '<div class="fc-mgr-empty">沒有符合條件的句子</div>';
        return;
    }
    
    listEl.innerHTML = sentenceMgrFilteredData.map(data => {
        const sentence = data.item['句子'] || '';
        const chinese = data.item['中文'] || '';
        const avgRating = data.history.avgRating.toFixed(1);
        const priorityLabel = getPriorityLabel(data.priority);
        const audioId = data.item.Words || sentence; // 使用 Words 欄位作為音檔名稱
        
        return `
            <div class="fc-mgr-item" data-sentence="${data.sentenceId}">
                <div class="fc-mgr-item-header" onclick="sentenceMgrPlayAudio('${escapeSingleQuote(audioId)}')" style="cursor: pointer;" title="點擊播放發音">
                    <div class="fc-mgr-item-title">
                        <span class="fc-mgr-word">🔊 ${sentence}</span>
                        <span class="fc-mgr-chinese">${chinese}</span>
                    </div>
                    <div class="fc-mgr-item-priority priority-${data.priority}">
                        ${priorityLabel}
                    </div>
                </div>
                <div class="fc-mgr-item-stats">
                    <div class="stat-group">
                        <span class="stat-label">測驗次數</span>
                        <span class="stat-value">${data.testedCount}</span>
                    </div>
                    <div class="stat-group">
                        <span class="stat-label">答對次數</span>
                        <span class="stat-value">${data.correctCount}</span>
                    </div>
                    <div class="stat-group">
                        <span class="stat-label">答錯次數</span>
                        <span class="stat-value">${data.incorrectCount}</span>
                    </div>
                    <div class="stat-group">
                        <span class="stat-label">平均分數</span>
                        <span class="stat-value">${avgRating}</span>
                    </div>
                </div>
                <div class="fc-mgr-item-actions">
                    <button class="btn-audio" onclick="event.stopPropagation(); sentenceMgrPlayAudio('${escapeSingleQuote(audioId)}')" title="播放發音">🔊</button>
                    <button class="btn-edit" onclick="sentenceMgrEditItem('${escapeSingleQuote(data.sentenceId)}')">編輯</button>
                    <button class="btn-reset" onclick="sentenceMgrResetItem('${escapeSingleQuote(data.sentenceId)}')">重置</button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * 根據分類篩選
 */
function sentenceMgrFilterByCategory(category) {
    sentenceMgrActiveCategory = category;
    sentenceMgrFilterData();
}

/**
 * 編輯句子記錄
 */
function sentenceMgrEditItem(sentenceId) {
    const vocab = window.getVocabularyData();
    const history = vocab.sentenceRatings[sentenceId] || { ratings: [], lastRated: null, avgRating: 0 };
    
    const newRating = prompt(
        `編輯句子的評分\n\n` +
        `目前測驗次數：${history.ratings.length}\n` +
        `平均分數：${history.avgRating.toFixed(1)}\n` +
        `歷史評分：${history.ratings.join(', ')}\n\n` +
        `請輸入新的評分 (1-5)：`
    );
    
    if (newRating && !isNaN(newRating)) {
        const rating = Math.max(1, Math.min(5, parseInt(newRating)));
        rateSentence(sentenceId, rating);
        sentenceMgrLoadData();
        showToast(`已添加評分：${rating}分`);
    }
}

/**
 * 重置句子記錄
 */
function sentenceMgrResetItem(sentenceId) {
    if (!confirm(`確定要重置此句子的所有測驗記錄嗎？`)) return;
    
    const vocab = window.getVocabularyData();
    if (vocab.sentenceRatings && vocab.sentenceRatings[sentenceId]) {
        delete vocab.sentenceRatings[sentenceId];
        window.persistVocabularyData();
        sentenceMgrLoadData();
        showToast('已重置測驗記錄');
    }
}

/**
 * 重置所有記錄
 */
function sentenceMgrResetAll() {
    if (!confirm('確定要重置所有句子的測驗記錄嗎？此操作無法復原！')) return;
    
    const vocab = window.getVocabularyData();
    vocab.sentenceRatings = {};
    window.persistVocabularyData();
    sentenceMgrLoadData();
    showToast('已重置所有句子測驗記錄');
}

/**
 * 匯出資料
 */
function sentenceMgrExportData() {
    const vocab = window.getVocabularyData();
    const data = {
        exportDate: new Date().toISOString(),
        type: 'sentence-quiz-ratings',
        ratings: vocab.sentenceRatings || {}
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `句子測驗記錄_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('已匯出句子測驗資料');
}

// ═══════════════════════════════════════════════════════════════
//  共用輔助函數
// ═══════════════════════════════════════════════════════════════

/**
 * 獲取優先級標籤
 */
function getPriorityLabel(priority) {
    const labels = {
        1: '需加強',
        2: '待改進',
        3: '尚可',
        4: '良好',
        5: '精通'
    };
    return labels[priority] || '未評分';
}

/**
 * 跳脫單引號
 */
function escapeSingleQuote(str) {
    return str.replace(/'/g, "\\'");
}

/**
 * 顯示提示訊息
 */
function showToast(message) {
    const toast = document.getElementById('toastNotification');
    if (toast) {
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
}

// ═══════════════════════════════════════════════════════════════
//  音檔播放功能
// ═══════════════════════════════════════════════════════════════

// 音檔基礎路徑（與 quiz.js 中相同）
const WORD_AUDIO_BASE = 'https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/mp3/%E5%96%AE%E5%AD%97%E9%9F%B3%E6%AA%94/';
const SENTENCE_AUDIO_BASE = 'https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/mp3/%E5%8F%A5%E5%AD%90%E9%9F%B3%E6%AA%94/';

/**
 * 播放單字音檔
 */
function wordMgrPlayAudio(word) {
    const audioUrl = `${WORD_AUDIO_BASE}${word}.mp3`;
    const audio = new Audio(audioUrl);
    audio.play().catch(err => {
        console.warn('🔊 播放失敗:', err);
        showToast('無法播放音檔');
    });
}

/**
 * 播放句子音檔
 */
function sentenceMgrPlayAudio(audioId) {
    const audioUrl = `${SENTENCE_AUDIO_BASE}${encodeURIComponent(audioId)}.mp3`;
    const audio = new Audio(audioUrl);
    audio.play().catch(err => {
        console.warn('🔊 播放失敗:', err);
        showToast('無法播放音檔');
    });
}
