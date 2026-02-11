/**
 * quiz-rating-system.js
 * 測驗結果評分系統 - 簡化版
 * 只在測驗結果頁面添加評分功能
 */

console.log("✅ quiz-rating-system.js loaded");

// ═══════════════════════════════════════════════════════════════
//  評分數據結構
// ═══════════════════════════════════════════════════════════════

/**
 * 獲取單字的評分歷史
 */
function getWordRatingHistory(word) {
    const vocab = window.getVocabularyData();
    if (!vocab.wordRatings) vocab.wordRatings = {};
    if (!vocab.wordRatings[word]) {
        vocab.wordRatings[word] = {
            ratings: [],  // 歷史評分記錄 [5, 4, 3, 5, 4...]
            lastRated: null,
            avgRating: 0
        };
    }
    return vocab.wordRatings[word];
}

/**
 * 獲取句子的評分歷史
 */
function getSentenceRatingHistory(sentenceId) {
    const vocab = window.getVocabularyData();
    if (!vocab.sentenceRatings) vocab.sentenceRatings = {};
    if (!vocab.sentenceRatings[sentenceId]) {
        vocab.sentenceRatings[sentenceId] = {
            ratings: [],
            lastRated: null,
            avgRating: 0
        };
    }
    return vocab.sentenceRatings[sentenceId];
}

/**
 * 記錄單字評分 (1-5分)
 */
function rateWord(word, rating) {
    const vocab = window.getVocabularyData();
    if (!vocab.wordRatings) vocab.wordRatings = {};
    if (!vocab.wordRatings[word]) {
        vocab.wordRatings[word] = { ratings: [], lastRated: null, avgRating: 0 };
    }
    
    const history = vocab.wordRatings[word];
    history.ratings.push(rating);
    history.lastRated = new Date().toISOString().split('T')[0];
    
    // 計算平均分數（最近5次）
    const recentRatings = history.ratings.slice(-5);
    history.avgRating = recentRatings.reduce((a, b) => a + b, 0) / recentRatings.length;
    
    window.persistVocabularyData();
    
    // 更新UI顯示
    updateWordRatingDisplay(word);
    
    console.log(`✅ 單字 "${word}" 評分: ${rating}分, 平均: ${history.avgRating.toFixed(1)}分`);
}

/**
 * 記錄句子評分 (1-5分)
 */
function rateSentence(sentenceId, rating) {
    const vocab = window.getVocabularyData();
    if (!vocab.sentenceRatings) vocab.sentenceRatings = {};
    if (!vocab.sentenceRatings[sentenceId]) {
        vocab.sentenceRatings[sentenceId] = { ratings: [], lastRated: null, avgRating: 0 };
    }
    
    const history = vocab.sentenceRatings[sentenceId];
    history.ratings.push(rating);
    history.lastRated = new Date().toISOString().split('T')[0];
    
    // 計算平均分數（最近5次）
    const recentRatings = history.ratings.slice(-5);
    history.avgRating = recentRatings.reduce((a, b) => a + b, 0) / recentRatings.length;
    
    window.persistVocabularyData();
    
    // 更新UI顯示
    updateSentenceRatingDisplay(sentenceId);
    
    console.log(`✅ 句子 "${sentenceId}" 評分: ${rating}分, 平均: ${history.avgRating.toFixed(1)}分`);
}

/**
 * 更新單字評分顯示
 */
function updateWordRatingDisplay(word) {
    const history = getWordRatingHistory(word);
    const container = document.querySelector(`[data-rating-word="${word}"]`);
    if (!container) return;
    
    // 更新星星顯示
    const stars = container.querySelectorAll('.rating-star');
    stars.forEach((star, index) => {
        const value = index + 1;
        if (value <= Math.round(history.avgRating)) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
    
    // 顯示評分次數
    const countEl = container.querySelector('.rating-count');
    if (countEl) {
        countEl.textContent = `(${history.ratings.length}次)`;
    }
}

/**
 * 更新句子評分顯示
 */
function updateSentenceRatingDisplay(sentenceId) {
    const history = getSentenceRatingHistory(sentenceId);
    const container = document.querySelector(`[data-rating-sentence="${sentenceId}"]`);
    if (!container) return;
    
    // 更新星星顯示
    const stars = container.querySelectorAll('.rating-star');
    stars.forEach((star, index) => {
        const value = index + 1;
        if (value <= Math.round(history.avgRating)) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
    
    // 顯示評分次數
    const countEl = container.querySelector('.rating-count');
    if (countEl) {
        countEl.textContent = `(${history.ratings.length}次)`;
    }
}

/**
 * 生成評分UI HTML
 */
function generateRatingHTML(type, id, currentRating = 0) {
    const history = type === 'word' ? getWordRatingHistory(id) : getSentenceRatingHistory(id);
    const avgRating = Math.round(history.avgRating) || currentRating;
    
    return `
        <div class="rating-container" data-rating-${type}="${id}">
            <div class="rating-stars">
                ${[1, 2, 3, 4, 5].map(value => `
                    <span class="rating-star ${value <= avgRating ? 'active' : ''}" 
                          onclick="rate${type === 'word' ? 'Word' : 'Sentence'}('${id}', ${value})"
                          title="${value}分">
                        ★
                    </span>
                `).join('')}
            </div>
            <span class="rating-count">(${history.ratings.length}次)</span>
        </div>
    `;
}

// ═══════════════════════════════════════════════════════════════
//  智慧抽題系統 - 根據評分調整出現機率
// ═══════════════════════════════════════════════════════════════

/**
 * 計算單字的優先權重（分數越低，權重越高）
 */
function calculateWordPriority(word) {
    const history = getWordRatingHistory(word);
    
    // 從未評分過 → 最高優先
    if (history.ratings.length === 0) return 1000;
    
    // 根據平均分數計算權重
    // 1分 → 權重 500
    // 2分 → 權重 300
    // 3分 → 權重 150
    // 4分 → 權重 50
    // 5分 → 權重 10
    const baseWeight = {
        1: 500,
        2: 300,
        3: 150,
        4: 50,
        5: 10
    };
    
    const avgRating = Math.round(history.avgRating);
    let weight = baseWeight[avgRating] || 100;
    
    // 最近評分很低 → 加倍權重
    const lastRating = history.ratings[history.ratings.length - 1];
    if (lastRating <= 2) {
        weight *= 2;
    }
    
    return weight;
}

/**
 * 計算句子的優先權重
 */
function calculateSentencePriority(sentenceId) {
    const history = getSentenceRatingHistory(sentenceId);
    
    if (history.ratings.length === 0) return 1000;
    
    const baseWeight = {
        1: 500,
        2: 300,
        3: 150,
        4: 50,
        5: 10
    };
    
    const avgRating = Math.round(history.avgRating);
    let weight = baseWeight[avgRating] || 100;
    
    const lastRating = history.ratings[history.ratings.length - 1];
    if (lastRating <= 2) {
        weight *= 2;
    }
    
    return weight;
}

/**
 * 加權隨機抽取單字（低分單字更容易被抽到）
 */
function weightedRandomWords(words, count = 10) {
    // 計算每個單字的權重
    const weighted = words.map(word => ({
        word: word,
        weight: calculateWordPriority(word.Words)
    }));
    
    // 按權重排序
    weighted.sort((a, b) => b.weight - a.weight);
    
    // 使用加權隨機選擇
    const selected = [];
    const pool = [...weighted];
    
    for (let i = 0; i < Math.min(count, pool.length); i++) {
        // 計算總權重
        const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
        
        // 隨機選擇
        let random = Math.random() * totalWeight;
        let selectedIndex = 0;
        
        for (let j = 0; j < pool.length; j++) {
            random -= pool[j].weight;
            if (random <= 0) {
                selectedIndex = j;
                break;
            }
        }
        
        selected.push(pool[selectedIndex].word);
        pool.splice(selectedIndex, 1);
    }
    
    return selected;
}

/**
 * 加權隨機抽取句子
 */
function weightedRandomSentences(sentences, count = 10) {
    const weighted = sentences.map(sentence => ({
        sentence: sentence,
        weight: calculateSentencePriority(sentence.Words || sentence['句子'])
    }));
    
    weighted.sort((a, b) => b.weight - a.weight);
    
    const selected = [];
    const pool = [...weighted];
    
    for (let i = 0; i < Math.min(count, pool.length); i++) {
        const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
        let random = Math.random() * totalWeight;
        let selectedIndex = 0;
        
        for (let j = 0; j < pool.length; j++) {
            random -= pool[j].weight;
            if (random <= 0) {
                selectedIndex = j;
                break;
            }
        }
        
        selected.push(pool[selectedIndex].sentence);
        pool.splice(selectedIndex, 1);
    }
    
    return selected;
}

// ═══════════════════════════════════════════════════════════════
//  管理介面
// ═══════════════════════════════════════════════════════════════

/**
 * 打開單字評分管理器
 */
function openWordRatingManager() {
    window.lastQuizType = 'word'; // 記錄來源
    hideAllPanels();
    showWordRatingManager();
}

/**
 * 打開句子評分管理器
 */
function openSentenceRatingManager() {
    window.lastQuizType = 'sentence'; // 記錄來源
    hideAllPanels();
    showSentenceRatingManager();
}

/**
 * 顯示單字評分管理器
 */
function showWordRatingManager() {
    const vocab = window.getVocabularyData();
    const ratings = vocab.wordRatings || {};
    
    // 收集所有有評分記錄的單字
    const ratedWords = Object.entries(ratings)
        .map(([word, history]) => {
            const wordData = wordsData.find(w => w.Words === word);
            return {
                word,
                history,
                data: wordData,
                priority: calculateWordPriority(word)
            };
        })
        .sort((a, b) => b.priority - a.priority); // 按優先級排序
    
    let html = `
        <div class="categories-panel" style="display:block;">
            <button class="back-button" onclick="closeRatingManager()">← 返回</button>
            <h2>單字評分管理</h2>
            <p class="subtitle">已評分單字：${ratedWords.length} 個</p>
            
            <div class="rating-manager-list">
    `;
    
    if (ratedWords.length === 0) {
        html += '<p class="empty-message">尚未評分任何單字</p>';
    } else {
        ratedWords.forEach(({ word, history, data, priority }) => {
            const chinese = data ? data['traditional Chinese'].split('\n')[0] : '無中文';
            const avgRating = history.avgRating.toFixed(1);
            const ratingCount = history.ratings.length;
            
            html += `
                <div class="rating-manager-item">
                    <div class="item-info">
                        <div class="item-word">${word}</div>
                        <div class="item-chinese">${chinese}</div>
                        <div class="item-stats">
                            <span>評分次數：${ratingCount}</span>
                            <span>平均分數：${avgRating}</span>
                            <span>優先級：${priority}</span>
                        </div>
                    </div>
                    <div class="item-rating">
                        ${generateRatingHTML('word', word)}
                    </div>
                </div>
            `;
        });
    }
    
    html += `
            </div>
            <div class="button-group">
                <button class="button" onclick="resetAllWordRatings()">清除所有評分</button>
                <button class="button" onclick="exportWordRatings()">匯出資料</button>
            </div>
        </div>
    `;
    
    const container = document.createElement('div');
    container.id = 'ratingManagerPanel';
    container.innerHTML = html;
    document.querySelector('.container').appendChild(container);
}

/**
 * 顯示句子評分管理器
 */
function showSentenceRatingManager() {
    const vocab = window.getVocabularyData();
    const ratings = vocab.sentenceRatings || {};
    
    const ratedSentences = Object.entries(ratings)
        .map(([sentenceId, history]) => {
            const sentenceData = sentenceData?.find(s => (s.Words || s['句子']) === sentenceId);
            return {
                sentenceId,
                history,
                data: sentenceData,
                priority: calculateSentencePriority(sentenceId)
            };
        })
        .sort((a, b) => b.priority - a.priority);
    
    let html = `
        <div class="categories-panel" style="display:block;">
            <button class="back-button" onclick="closeRatingManager()">← 返回</button>
            <h2>句子評分管理</h2>
            <p class="subtitle">已評分句子：${ratedSentences.length} 個</p>
            
            <div class="rating-manager-list">
    `;
    
    if (ratedSentences.length === 0) {
        html += '<p class="empty-message">尚未評分任何句子</p>';
    } else {
        ratedSentences.forEach(({ sentenceId, history, data, priority }) => {
            const sentence = data ? data['句子'] : sentenceId;
            const chinese = data ? data['中文'] : '無中文';
            const avgRating = history.avgRating.toFixed(1);
            const ratingCount = history.ratings.length;
            
            html += `
                <div class="rating-manager-item">
                    <div class="item-info">
                        <div class="item-word">${sentence}</div>
                        <div class="item-chinese">${chinese}</div>
                        <div class="item-stats">
                            <span>評分次數：${ratingCount}</span>
                            <span>平均分數：${avgRating}</span>
                            <span>優先級：${priority}</span>
                        </div>
                    </div>
                    <div class="item-rating">
                        ${generateRatingHTML('sentence', sentenceId)}
                    </div>
                </div>
            `;
        });
    }
    
    html += `
            </div>
            <div class="button-group">
                <button class="button" onclick="resetAllSentenceRatings()">清除所有評分</button>
                <button class="button" onclick="exportSentenceRatings()">匯出資料</button>
            </div>
        </div>
    `;
    
    const container = document.createElement('div');
    container.id = 'ratingManagerPanel';
    container.innerHTML = html;
    document.querySelector('.container').appendChild(container);
}

/**
 * 關閉管理器
 */
function closeRatingManager() {
    const panel = document.getElementById('ratingManagerPanel');
    if (panel) panel.remove();
    
    // 先隱藏所有面板
    hideAllPanels();
    
    // 根據當前管理的類型返回對應頁面
    const quizTypeSelector = document.querySelector('.quiz-type-selector');
    const quizCategories = document.getElementById('quizCategories');
    const sentenceCategories = document.getElementById('sentenceQuizCategories');
    
    // 檢查是從哪個測驗進來的
    if (window.lastQuizType === 'word') {
        quizCategories.style.display = 'block';
        updateBreadcrumb(['選擇功能', '測驗中心', '單字測驗']);
    } else if (window.lastQuizType === 'sentence') {
        sentenceCategories.style.display = 'block';
        updateBreadcrumb(['選擇功能', '測驗中心', '句子測驗']);
    } else {
        // 預設返回測驗中心
        if (quizTypeSelector) quizTypeSelector.style.display = 'flex';
        updateBreadcrumb(['選擇功能', '測驗中心']);
    }
}

/**
 * 清除所有單字評分
 */
function resetAllWordRatings() {
    if (!confirm('確定要清除所有單字評分記錄嗎？此操作無法復原！')) return;
    
    const vocab = window.getVocabularyData();
    vocab.wordRatings = {};
    window.persistVocabularyData();
    
    closeRatingManager();
    showToast('✅ 已清除所有評分', 'success');
}

/**
 * 清除所有句子評分
 */
function resetAllSentenceRatings() {
    if (!confirm('確定要清除所有句子評分記錄嗎？此操作無法復原！')) return;
    
    const vocab = window.getVocabularyData();
    vocab.sentenceRatings = {};
    window.persistVocabularyData();
    
    closeRatingManager();
    showToast('✅ 已清除所有評分', 'success');
}

/**
 * 匯出單字評分資料
 */
function exportWordRatings() {
    const vocab = window.getVocabularyData();
    const ratings = vocab.wordRatings || {};
    
    const exportData = Object.entries(ratings).map(([word, history]) => {
        const wordData = wordsData.find(w => w.Words === word);
        return {
            單字: word,
            中文: wordData ? wordData['traditional Chinese'] : '',
            評分次數: history.ratings.length,
            平均分數: history.avgRating.toFixed(2),
            歷史評分: history.ratings.join(', '),
            最後評分日期: history.lastRated
        };
    });
    
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `單字評分_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('✅ 已匯出資料', 'success');
}

/**
 * 匯出句子評分資料
 */
function exportSentenceRatings() {
    const vocab = window.getVocabularyData();
    const ratings = vocab.sentenceRatings || {};
    
    const exportData = Object.entries(ratings).map(([sentenceId, history]) => {
        const sentenceItem = sentenceData?.find(s => (s.Words || s['句子']) === sentenceId);
        return {
            句子ID: sentenceId,
            句子: sentenceItem ? sentenceItem['句子'] : '',
            中文: sentenceItem ? sentenceItem['中文'] : '',
            評分次數: history.ratings.length,
            平均分數: history.avgRating.toFixed(2),
            歷史評分: history.ratings.join(', '),
            最後評分日期: history.lastRated
        };
    });
    
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `句子評分_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('✅ 已匯出資料', 'success');
}

console.log("✅ Quiz rating system initialized");
