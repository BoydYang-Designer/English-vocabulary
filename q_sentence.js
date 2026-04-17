console.log("✅ q_sentence.js loaded (FIXED VERSION)");

// ════════════════════════════════════════════════════════════
//  QUIZ SOUND EFFECTS — 答對 / 答錯音效（Web Audio API 合成）
// ════════════════════════════════════════════════════════════

(function _installQSAudioCtx() {
    const unlock = () => {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        if (!window._quizAC || window._quizAC.state === 'closed') {
            window._quizAC = new AC();
        }
        if (window._quizAC.state === 'suspended') window._quizAC.resume().catch(() => {});
        document.removeEventListener('touchstart', unlock, true);
        document.removeEventListener('click', unlock, true);
    };
    document.addEventListener('touchstart', unlock, true);
    document.addEventListener('click', unlock, true);
})();

function _getQSAC() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!window._quizAC || window._quizAC.state === 'closed') {
        try { window._quizAC = new AC(); } catch (e) { return null; }
    }
    if (window._quizAC.state === 'suspended') window._quizAC.resume().catch(() => {});
    return window._quizAC;
}

/** 答對音效：兩音上升 (E5 → G5) */
function playCorrectSound() {
    const ctx = _getQSAC();
    if (!ctx) return;
    const now = ctx.currentTime;
    [{ freq: 659.25, t: 0 }, { freq: 783.99, t: 0.12 }].forEach(({ freq, t }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + t);
        gain.gain.setValueAtTime(0, now + t);
        gain.gain.linearRampToValueAtTime(0.22, now + t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.28);
        osc.start(now + t); osc.stop(now + t + 0.30);
    });
}

/** 答錯音效：兩音下降 (D4 → C4) */
function playWrongSound() {
    const ctx = _getQSAC();
    if (!ctx) return;
    const now = ctx.currentTime;
    [{ freq: 293.66, t: 0 }, { freq: 261.63, t: 0.10 }].forEach(({ freq, t }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + t);
        gain.gain.setValueAtTime(0, now + t);
        gain.gain.linearRampToValueAtTime(0.18, now + t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.22);
        osc.start(now + t); osc.stop(now + t + 0.25);
    });
}


const GITHUB_JSON_URL = "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Sentence%20file/sentence.json";
const GITHUB_MP3_BASE_URL = "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Sentence%20file/";

let sentenceData = [];
let currentSentenceIndex = 0;
let userAnswers = [];
let incorrectSentences = [];
let importantSentences = [];
let currentQuizSentences = [];
let userConstructedSentences = [];
let sentenceQuizHistory = {};
let selectedSentenceFilters = {
    levels: new Set(),
    primaryCategories: new Set(),
    secondaryCategories: new Set(),
    alphabet: new Set(),
    special: new Set()
};

// 🔧 新增：資料載入狀態追蹤
let sentenceDataLoading = false;
let sentenceDataLoaded = false;

// 🔧 新增：全域函數，供其他模組（如 flashcard.js）調用以確保資料載入
window.ensureSentenceDataLoaded = async function() {
    // 如果資料已載入，直接返回
    if (sentenceDataLoaded && sentenceData.length > 0) {
        console.log('✅ sentenceData 已載入，無需重複載入');
        return Promise.resolve(sentenceData);
    }
    
    // 如果正在載入中，等待載入完成
    if (sentenceDataLoading) {
        console.log('⏳ sentenceData 正在載入中，等待完成...');
        return new Promise((resolve, reject) => {
            const checkInterval = setInterval(() => {
                if (sentenceDataLoaded) {
                    clearInterval(checkInterval);
                    resolve(sentenceData);
                } else if (!sentenceDataLoading) {
                    clearInterval(checkInterval);
                    reject(new Error('資料載入失敗'));
                }
            }, 100);
        });
    }
    
    // 開始載入資料
    console.log('📥 開始載入 sentenceData...');
    sentenceDataLoading = true;
    
    try {
        const response = await fetch(GITHUB_JSON_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // 相容兩種格式：物件或陣列
        let rawData = Array.isArray(data) ? data : (data["New Words"] || []);
        if (!Array.isArray(rawData)) {
            throw new Error('資料格式錯誤');
        }
        
        sentenceData = rawData.filter(item => item.句子 && item.中文);
        
        // 處理分類 - 確保分類是陣列格式
        sentenceData.forEach(item => {
            // 如果沒有「分類」欄位，從「分類1/2/3」合併
            if (!item["分類"] && (item["分類1"] || item["分類2"] || item["分類3"])) {
                item["分類"] = [item["分類1"], item["分類2"], item["分類3"]].filter(Boolean);
            }
            // 確保分類是陣列
            if (typeof item["分類"] === "string") {
                item["分類"] = [item["分類"]];
            } else if (!Array.isArray(item["分類"])) {
                item["分類"] = [];
            }
        });
        
        // 📊 調試：顯示前3個句子的分類資訊
        console.log('📊 數據分類處理範例 (前3個句子):');
        sentenceData.slice(0, 3).forEach((item, idx) => {
            console.log(`  句子 ${idx + 1}:`, {
                Words: item.Words,
                分類: item["分類"],
                主分類: item["分類"][0],
                次分類: item["分類"][1]
            });
        });
        
        localStorage.setItem("sentenceData", JSON.stringify(sentenceData));
        window.sentenceData = sentenceData; // 🔧 修復：讓 flashcard.js 可透過 window.sentenceData 存取
        sentenceDataLoaded = true;
        sentenceDataLoading = false;
        
        console.log(`✅ sentenceData 載入成功：${sentenceData.length} 個句子，已掛載至 window.sentenceData`);
        return sentenceData;
        
    } catch (error) {
        console.error("❌ 載入 sentenceData 失敗:", error);
        sentenceDataLoading = false;
        
        // 嘗試從 localStorage 載入
        const savedData = localStorage.getItem("sentenceData");
        if (savedData) {
            try {
                sentenceData = JSON.parse(savedData);
                sentenceDataLoaded = true;
                window.sentenceData = sentenceData; // 🔧 修復：localStorage fallback 也掛載至 window
                console.log("✅ 使用本地儲存的句子資料");
                return sentenceData;
            } catch (e) {
                console.error("❌ 本地資料解析失敗:", e);
            }
        }
        
        throw error;
    }
};


// 🔧 新增：從完整分類名稱中提取中文部分
function extractChineseName(fullName) {
    if (!fullName) return "未分類";
    // 匹配括號內的中文部分：（xxx）
    const match = fullName.match(/（([^）]+)）/);
    if (match && match[1]) {
        return match[1];
    }
    // 如果沒有括號，返回原始名稱
    return fullName;
}

// 🔧 新增：從完整分類名稱中提取英文部分
function extractEnglishName(fullName) {
    if (!fullName) return "";
    // 移除括號及其內容
    return fullName.replace(/（[^）]+）/g, '').trim();
}

// This function can be defined outside
function getUserAnswer(index) {
    return userAnswers[index] || "";
}
window.getUserAnswer = getUserAnswer;

// Listen for the 'auth-ready' event from auth-manager.js
document.addEventListener('auth-ready', function() {
    console.log("Auth is ready on quiz page.");
    // Now it's safe to get the vocabulary data
    const vocabulary = window.getVocabularyData();
    sentenceQuizHistory = vocabulary.sentenceQuizHistory || {};
    incorrectSentences = vocabulary.wrongQS || [];
    console.log("📖 Loaded sentence quiz history:", Object.keys(sentenceQuizHistory).length, "records");
});

document.addEventListener("DOMContentLoaded", function () {
    // Event listeners that don't depend on data can stay here
    const startBtn = document.getElementById("startSentenceQuizBtn");
    if (startBtn) {
        startBtn.addEventListener("click", startSentenceQuiz);
    } else {
        console.warn("Could not find startSentenceQuizBtn");
    }
    
    const reorganizeBtn = document.getElementById("startReorganizeQuizBtn");
    if (reorganizeBtn) {
        reorganizeBtn.addEventListener("click", startReorganizeQuiz);
    }

    // ===== 空白鍵：句子測驗 & 重組測驗 重播 mp3 =====
    document.addEventListener("keydown", function(event) {
        const isInputField = event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA';
        if ((event.key === " " || event.key === "Spacebar") && !isInputField) {
            // 句子測驗區（sentenceQuizArea）
            const sentenceArea = document.getElementById("sentenceQuizArea");
            if (sentenceArea && sentenceArea.style.display === "block") {
                event.preventDefault();
                autoPlayAudio();
                return;
            }
            // 重組測驗區（reorganizeQuizArea）
            const reorganizeArea = document.getElementById("reorganizeQuizArea");
            if (reorganizeArea && reorganizeArea.style.display === "block") {
                event.preventDefault();
                if (currentAudio) {
                    const playBtn = document.getElementById("playReorganizeAudioBtn");
                    if (playBtn) playBtn.classList.add("playing");
                    currentAudio.currentTime = 0;
                    currentAudio.play().catch(err => {
                        console.warn("🔊 空白鍵播放失敗:", err);
                        if (playBtn) playBtn.classList.remove("playing");
                    });
                }
                return;
            }
        }
    });
});


function updateCollapsibleHeaderState(btn) {
    const contentWrapper = btn.closest('.filter-content');
    if (!contentWrapper) return;
    const header = contentWrapper.previousElementSibling;
    if (!header || !header.classList.contains('filter-header')) return;
    const hasSelectedChildren = contentWrapper.querySelector('.category-button.selected') !== null;
    if (hasSelectedChildren) {
        header.classList.add('header-highlight');
    } else {
        header.classList.remove('header-highlight');
    }
}


// 📌 進入 Q Sentence 測驗分類頁面
function showSentenceQuizCategories() {
    // 不修改標題，保持「測驗區」
    
    // 隱藏測驗類型選擇區域
    const quizTypeSelector = document.querySelector(".quiz-type-selector");
    if (quizTypeSelector) {
        quizTypeSelector.style.display = "none";
    }
    
    document.getElementById("sentenceQuizCategories").style.display = "block";
    console.log("✅ 顯示句子測驗分類頁面");

    // 🔧 使用新的載入機制
    window.ensureSentenceDataLoaded()
        .then(() => {
            console.log(`✅ 已載入 ${sentenceData.length} 個句子`);
            generateSentenceCategories(sentenceData);
        })
        .catch(error => {
            console.error("❌ 無法載入 sentence.json:", error);
            alert("❌ 無法載入句子資料，請檢查網路連線。");
        });
}

function handleSentenceSubcategoryClick(subcatBtn, primaryBtnId) {
    // 這個新函式處理次分類按鈕的點擊。
    // 它負責切換次分類的選取狀態，並根據結果更新主分類按鈕的高亮狀態。

    // 1. 切換次分類自身的篩選狀態和高亮
    toggleSentenceSelection('secondaryCategories', subcatBtn.textContent, subcatBtn);

    // 2. 找到對應的主分類按鈕
    const primaryBtn = document.getElementById(primaryBtnId);
    if (!primaryBtn) return;

    // 3. 檢查這個群組內是否還有其他被選中的次分類
    const subcategoryWrapper = subcatBtn.closest('.subcategory-wrapper');
    if (!subcategoryWrapper) return;
    const hasSelectedSubcategories = subcategoryWrapper.querySelector('.category-button.selected') !== null;

    // 4. 根據是否有次分類被選中，來決定主分類按鈕是否要高亮
    if (hasSelectedSubcategories) {
        primaryBtn.classList.add('selected');
    } else {
        primaryBtn.classList.remove('selected');
    }

    // 5. 更新最外層可折疊區塊的標題高亮
    updateCollapsibleHeaderState(primaryBtn);
}


function handleSentencePrimaryCategoryClick(btn, categoryName) {
    // 當用戶點擊主分類按鈕時:
    // 1. 將主分類加入篩選條件
    // 2. 展開/收合次分類列表

    console.log('🔍 點擊主分類:', categoryName);
    console.log('📊 sentenceData 總數:', sentenceData.length);

    let subcategoryWrapperId = `sub-for-sentence-${categoryName.replace(/\s/g, '-')}`;
    let subcategoryWrapper = document.getElementById(subcategoryWrapperId);

    if (!subcategoryWrapper) {
        // 如果次分類容器不存在，則創建它
        subcategoryWrapper = document.createElement('div');
        subcategoryWrapper.className = 'subcategory-wrapper'; 
        subcategoryWrapper.id = subcategoryWrapperId;
        subcategoryWrapper.style.maxHeight = '0px';

        // 🔧 改用與單字測驗相同的邏輯：直接使用 分類[0] 和 分類[1]
        const secondaryCategories = [...new Set(
            sentenceData
                .filter(s => s["分類"] && s["分類"][0] === categoryName && s["分類"][1])
                .map(s => s["分類"][1])
        )];

        console.log('📋 找到的次分類:', secondaryCategories);

        const hasUncategorized = sentenceData.some(s =>
            s["分類"] && s["分類"][0] === categoryName && (!s["分類"][1] || s["分類"][1].trim() === '')
        );

        if (hasUncategorized) {
            secondaryCategories.unshift("未分類");
        }

        console.log('✅ 最終次分類列表:', secondaryCategories);

        if (secondaryCategories.length > 0) {
            // 生成次分類按鈕
            subcategoryWrapper.innerHTML = secondaryCategories.map(subCat =>
                `<button class="category-button" onclick="handleSentenceSubcategoryClick(this, '${btn.id}')">${subCat}</button>`
            ).join('');
            console.log('🎨 生成了', secondaryCategories.length, '個次分類按鈕');
        } else {
            console.warn('⚠️ 沒有找到任何次分類！');
        }
        
        // 找到包裝所有主分類按鈕的 div（filter-content > div），插入其中
        const wrapperDiv = btn.closest('.filter-content > div');
        if (wrapperDiv) {
            wrapperDiv.insertBefore(subcategoryWrapper, btn.nextSibling);
            console.log('✅ 次分類容器已插入到 wrapper div');
        } else {
            btn.parentNode.insertBefore(subcategoryWrapper, btn.nextSibling);
            console.log('✅ 次分類容器已插入到 parent node');
        }
    }

    // 將主分類加入篩選條件
    toggleSentenceSelection('primaryCategories', categoryName, btn);

    // 展開/收合次分類列表
    const isExpanded = subcategoryWrapper.classList.contains('expanded');
    
    if (isExpanded) {
        // 收合次分類
        subcategoryWrapper.classList.remove('expanded');
        subcategoryWrapper.style.maxHeight = '0px';
        console.log('📦 收合次分類');
    } else {
        // 展開次分類
        subcategoryWrapper.classList.add('expanded');
        subcategoryWrapper.style.maxHeight = subcategoryWrapper.scrollHeight + "px";
        console.log('📂 展開次分類，高度:', subcategoryWrapper.scrollHeight);
    }

    // 更新父容器（.filter-content）的高度
    setTimeout(() => {
        const parentFilterContent = btn.closest('.filter-content');
        if (parentFilterContent) {
            // 暫時移除高度限制以計算真實高度
            const currentMaxHeight = parentFilterContent.style.maxHeight;
            parentFilterContent.style.maxHeight = 'none';
            const newHeight = parentFilterContent.scrollHeight;
            parentFilterContent.style.maxHeight = currentMaxHeight;
            
            // 更新為新的高度
            setTimeout(() => {
                parentFilterContent.style.maxHeight = newHeight + 'px';
                console.log('📏 更新父容器高度:', newHeight);
            }, 10);
        }
    }, 50);
}

function generateSentenceCategories(data) {
    const alphabetContainer = document.getElementById("sentenceAlphabetButtons");
    const primaryContainer = document.getElementById("sentencePrimaryCategoryButtons");
    const specialContainer = document.getElementById("sentenceSpecialCategoryButtons");
    const levelContainer = document.getElementById("sentenceLevelButtons");

    if (!alphabetContainer || !primaryContainer || !specialContainer || !levelContainer) {
        console.error("❌ 句子測驗的分類容器未全部找到，請檢查 quiz.html 的 ID。");
        return;
    }

    const levels = new Set();
    const primaryCategories = new Set(); // 🔧 改用 Set 直接儲存完整的主分類名稱
    const alphabetSet = new Set();

    data.forEach(item => {
        levels.add(item.等級 || "未分類");
        const firstLetter = item.句子.charAt(0).toUpperCase();
        if (/[A-Z]/.test(firstLetter)) {
            alphabetSet.add(firstLetter);
        }
        // 🔧 直接使用 分類[0]，與單字測驗邏輯一致
        if (item["分類"] && item["分類"][0]) {
            primaryCategories.add(item["分類"][0]);
        }
    });

    const allLevels = new Set(Array.from(levels));
    const standardLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', '未分類'].filter(l => allLevels.has(l));

    alphabetContainer.innerHTML = [...alphabetSet].sort().map(letter => 
        `<button class="category-button" onclick="toggleSentenceSelection('alphabet', '${letter}', this)">${letter}</button>`
    ).join("");

    // 🔧 生成主分類按鈕，直接使用完整名稱（保持資料原始順序，與 sentence.js 一致）
    const primaryButtonsHtml = [...primaryCategories]
        .map(categoryName => {
            const btnId = `sentence-primary-btn-${categoryName.replace(/\s/g, '-')}`;
            return `<button id="${btnId}" class="category-button" onclick="handleSentencePrimaryCategoryClick(this, '${categoryName}')">${categoryName}</button>`;
        }).join("");
    // 包一層 div 以符合 .filter-content > div 的 CSS 結構
    primaryContainer.innerHTML = `<div>${primaryButtonsHtml}</div>`;
    
    specialContainer.innerHTML = `
        <button class="category-button" onclick="toggleSentenceSelection('special', 'important', this)">⭐ 重要句子</button>
        <button class="category-button" onclick="toggleSentenceSelection('special', 'incorrect', this)">❌ 錯誤句子</button>
        <button class="category-button" onclick="toggleSentenceSelection('special', 'checked', this)">✅ Checked 句子</button>
        <button class="category-button" onclick="toggleSentenceSelection('special', 'word_checked', this)">📝 Checked 單字</button>
    `;

    levelContainer.innerHTML = standardLevels.map(l =>
        `<button class="category-button" onclick="toggleSentenceSelection('levels', '${l}', this)">${l}</button>`
    ).join("");
    
    console.log(`✅ 生成分類按鈕完成: ${primaryCategories.size} 個主分類, ${standardLevels.length} 個等級`);
}



function toggleSentenceSelection(type, value, button) {
    let filterSet = selectedSentenceFilters[type];
    
    if (!button) {
        button = document.querySelector(`button[onclick*="'${type}', '${value}'"]`);
    }

    if (filterSet.has(value)) {
        filterSet.delete(value);
        if(button) button.classList.remove("selected");
    } else {
        filterSet.add(value);
        if(button) button.classList.add("selected");
    }
    console.log(`✅ ${type} 篩選更新:`, [...filterSet]);

    // 觸發區塊標題更新
    if (button) updateCollapsibleHeaderState(button);
}

function startSentenceQuiz() {
    document.getElementById("sentenceQuizCategories").style.display = "none";
    document.getElementById("sentenceQuizArea").style.display = "block";

    console.log("🔍 開始篩選句子...");
    console.log("當前篩選條件:", {
        levels: [...selectedSentenceFilters.levels],
        primaryCategories: [...selectedSentenceFilters.primaryCategories],
        secondaryCategories: [...selectedSentenceFilters.secondaryCategories],
        alphabet: [...selectedSentenceFilters.alphabet],
        special: [...selectedSentenceFilters.special]
    });

    let filteredSentences = sentenceData.filter(item => {
        // 等級篩選
        let levelMatch = selectedSentenceFilters.levels.size === 0 || 
                        selectedSentenceFilters.levels.has(item.等級 || "未分類");
        
        // 🔧 主分類篩選 - 改用 分類[0]，與單字測驗邏輯一致
        let primaryCategoryMatch = selectedSentenceFilters.primaryCategories.size === 0 || 
                                  selectedSentenceFilters.primaryCategories.has(item["分類"] && item["分類"][0]);
        
        // 🔧 次分類篩選 - 改用 分類[1]，與單字測驗邏輯一致
        let secondaryCategoryMatch = selectedSentenceFilters.secondaryCategories.size === 0 ||
            (item["分類"] && item["分類"][1] && selectedSentenceFilters.secondaryCategories.has(item["分類"][1])) ||
            (selectedSentenceFilters.secondaryCategories.has('未分類') && 
             (!item["分類"] || !item["分類"][1] || item["分類"][1].trim() === ''));

        // 字母篩選
        let alphabetMatch = selectedSentenceFilters.alphabet.size === 0 || 
                           selectedSentenceFilters.alphabet.has(item.句子.charAt(0).toUpperCase());
        
        // 特殊篩選
        let specialMatch = true;
        if (selectedSentenceFilters.special.size > 0) {
            const vocabularyData = window.getVocabularyData();
            specialMatch = [...selectedSentenceFilters.special].every(filter => {
                if (filter === 'important') return (vocabularyData.importantSentences || {})[item.Words] === "true";
                if (filter === 'incorrect') return (vocabularyData.wrongQS || []).includes(item.Words);
                if (filter === 'checked') return (vocabularyData.checkedSentences || {})[item.Words] === "true";
                if (filter === 'word_checked') {
                    const baseWord = item.Words.split('-')[0];
                    return (vocabularyData.checkedWords || []).includes(baseWord);
                }
                return true;
            });
        }
        
        return levelMatch && primaryCategoryMatch && secondaryCategoryMatch && alphabetMatch && specialMatch;
    });

    console.log(`✅ 篩選結果: ${filteredSentences.length} 個句子符合條件`);

    if (filteredSentences.length === 0) {
        alert("⚠️ 沒有符合條件的句子！\n\n提示：\n1. 嘗試不選擇任何條件\n2. 避免選擇「特殊分類」(如果是第一次使用)\n3. 檢查是否選擇了過多篩選條件");
        returnToSentenceCategorySelection();
        return;
    }

    // 使用智慧抽題系統（評分低的句子更容易被抽到）
    if (typeof weightedRandomSentences === 'function') {
        currentQuizSentences = weightedRandomSentences(filteredSentences, 10);
        console.log(`✅ 使用智慧抽題，本次測驗句子數: ${currentQuizSentences.length}`);
    } else {
        // 降級方案：使用原有的隨機排序
        filteredSentences.sort((a, b) => {
            const countA = sentenceQuizHistory[a.Words] || 0;
            const countB = sentenceQuizHistory[b.Words] || 0;
            return countA - countB;
        });

        for (let i = filteredSentences.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [filteredSentences[i], filteredSentences[j]] = [filteredSentences[j], filteredSentences[i]];
        }

        currentQuizSentences = filteredSentences.slice(0, 10);
        console.log(`✅ 使用隨機抽題，本次測驗句子數: ${currentQuizSentences.length}`);
    }
    
    currentSentenceIndex = 0;
    userAnswers = [];

    console.log("✅ 本次測驗的句子:", currentQuizSentences.map(s => s.Words));

    localStorage.setItem("currentQuizSentences", JSON.stringify(currentQuizSentences));

    setTimeout(() => {
        loadSentenceQuestion();
        autoPlayAudio();
    }, 100);
}


let currentAudio = null;

function loadSentenceQuestion() {
    let sentenceObj = currentQuizSentences[currentSentenceIndex];
    if (!sentenceObj) {
        console.error("❌ 找不到 sentenceObj！");
        return;
    }

    sentenceQuizHistory[sentenceObj.Words] = (sentenceQuizHistory[sentenceObj.Words] || 0) + 1;
    localStorage.setItem('sentenceQuizHistory', JSON.stringify(sentenceQuizHistory));
    console.log(`📈 更新測驗紀錄: ${sentenceObj.Words}, 次數: ${sentenceQuizHistory[sentenceObj.Words]}`);
    
    let originalSentence = sentenceObj.句子;
    let sentenceText = originalSentence.replace(/\s*\[=[^\]]+\]/g, "").trim();
    let words = sentenceText.match(/\p{L}+(?:'\p{L}+)?|'s|\p{L}+(?:-\p{L}+)+|[.,!?;]|\s+/gu) || [];

    let sentenceInputContainer = document.getElementById("sentenceInput");
    sentenceInputContainer.innerHTML = "";

    let firstInput = null;
    let allInputs = [];

    let maxWordLength = Math.max(...words.filter(w => /\p{L}+/u.test(w)).map(w => w.length));
    let screenWidth = window.innerWidth || document.documentElement.clientWidth;

    words.forEach((word, index) => {
        let wordContainer = document.createElement("div");
        wordContainer.classList.add("word-container");

        if (/\p{L}+/u.test(word)) {
            let chars = Array.from(word);
            chars.forEach((char, letterIndex) => {
                let input = document.createElement("input");
                input.type = "text";
                input.maxLength = 1;
                input.classList.add("letter-input");
                input.dataset.wordIndex = index;
                input.dataset.letterIndex = letterIndex;
                input.addEventListener("input", handleLetterInput);
                input.addEventListener("keydown", handleArrowNavigation);
                wordContainer.appendChild(input);
                allInputs.push(input);

                if (!firstInput) {
                    firstInput = input;
                }
            });
        } else {
            let span = document.createElement("span");
            span.classList.add("punctuation");
            span.innerText = word;
            wordContainer.appendChild(span);
        }

        sentenceInputContainer.appendChild(wordContainer);
    });

    let chineseHint = sentenceObj.中文 || "（無中文提示）";
    document.getElementById("sentenceHint").innerHTML = chineseHint;

    if (firstInput) {
        firstInput.focus();
    }

    document.getElementById("nextSentenceBtn").style.display = "none";

    if (sentenceObj.Words) {
        let audioUrl = GITHUB_MP3_BASE_URL + encodeURIComponent(sentenceObj.Words) + ".mp3";
        console.log("✅ 音頻 URL:", audioUrl);
        if (currentAudio instanceof Audio) {
            currentAudio.pause();
        }
        currentAudio = new Audio(audioUrl);
        const playBtn = document.getElementById("playSentenceAudioBtn");
        if (!playBtn) {
            console.error("❌ 未找到 playSentenceAudioBtn 元素");
            return;
        }
        playBtn.classList.remove("playing");
        playBtn.onclick = () => {
            console.log("✅ 手動點擊播放按鈕");
            if (currentAudio) {
                playBtn.classList.add("playing");
                currentAudio.currentTime = 0;
                currentAudio.play().catch(error => {
                    console.error("🔊 播放失敗:", error);
                    playBtn.classList.remove("playing");
                });
            }
        };
        currentAudio.onended = () => {
            playBtn.classList.remove("playing");
            console.log("✅ 音頻播放結束");
        };
    }

    sentenceObj.filteredSentence = sentenceText;
}

function autoPlayAudio() {
    if (currentAudio) {
        const playBtn = document.getElementById("playSentenceAudioBtn");
        if (!playBtn) {
            console.error("❌ 未找到 playSentenceAudioBtn 元素");
            return;
        }
        playBtn.classList.add("playing");
        currentAudio.currentTime = 0;
        currentAudio.play().catch(error => {
            console.warn("🔊 自動播放失敗:", error);
            playBtn.classList.remove("playing");
        });
    } else {
        console.warn("⚠️ 無音頻可播放");
    }
}


function startReorganizeQuiz() {
    document.getElementById("sentenceQuizCategories").style.display = "none";
    document.getElementById("reorganizeQuizArea").style.display = "block";

    console.log("🔍 開始篩選重組測驗句子...");

    let filteredSentences = sentenceData.filter(item => {
        // 等級篩選
        let levelMatch = selectedSentenceFilters.levels.size === 0 ||
                         selectedSentenceFilters.levels.has(item.等級 || "未分類");

        // 主分類篩選 - 使用 分類[0]
        let primaryMatch = selectedSentenceFilters.primaryCategories.size === 0 ||
                           selectedSentenceFilters.primaryCategories.has(item["分類"] && item["分類"][0]);

        // 次分類篩選 - 使用 分類[1]
        let secondaryMatch = selectedSentenceFilters.secondaryCategories.size === 0 ||
            (item["分類"] && item["分類"][1] && selectedSentenceFilters.secondaryCategories.has(item["分類"][1])) ||
            (selectedSentenceFilters.secondaryCategories.has('未分類') &&
             (!item["分類"] || !item["分類"][1] || item["分類"][1].trim() === ''));

        // 字母篩選
        let alphabetMatch = selectedSentenceFilters.alphabet.size === 0 ||
                            selectedSentenceFilters.alphabet.has(item.句子.charAt(0).toUpperCase());

        // 特殊篩選
        let specialMatch = true;
        if (selectedSentenceFilters.special.size > 0) {
            const vocabularyData = window.getVocabularyData();
            specialMatch = [...selectedSentenceFilters.special].every(filter => {
                if (filter === 'important') return (vocabularyData.importantSentences || {})[item.Words] === "true";
                if (filter === 'incorrect') return (vocabularyData.wrongQS || []).includes(item.Words);
                if (filter === 'checked') return (vocabularyData.checkedSentences || {})[item.Words] === "true";
                if (filter === 'word_checked') {
                    const baseWord = item.Words.split('-')[0];
                    return (vocabularyData.checkedWords || []).includes(baseWord);
                }
                return true;
            });
        }

        return levelMatch && primaryMatch && secondaryMatch && alphabetMatch && specialMatch;
    });

    if (filteredSentences.length === 0) {
        alert("❌ 沒有符合條件的測驗句子");
        returnToSentenceCategorySelection();
        return;
    }

    filteredSentences.sort((a, b) => {
        const countA = sentenceQuizHistory[a.Words] || 0;
        const countB = sentenceQuizHistory[b.Words] || 0;
        return countA - countB;
    });

    currentQuizSentences = filteredSentences.sort(() => Math.random() - 0.5).slice(0, 10);
    currentSentenceIndex = 0;
    userConstructedSentences = [];
    localStorage.setItem("currentQuizSentences", JSON.stringify(currentQuizSentences));
    loadReorganizeQuestion();
}


// ============================================================
//  🖱️  ReorderDrag — 通用重組拖曳模組
//  支援：點擊放開 → 單字往上/往回；點擊後拖移 → 插入指定位置
// ============================================================
if (!window.ReorderDrag) { window.ReorderDrag = class {
    /**
     * @param {string} answerAreaId  答案區容器 ID
     * @param {string} poolId        單字池容器 ID
     */
    constructor(answerAreaId, poolId) {
        this.answerAreaId = answerAreaId;
        this.poolId = poolId;
        this.answerArea = null;
        this.pool = null;

        // 拖曳狀態
        this._dragging = false;
        this._dragEl = null;       // 被拖曳的原始 DOM 按鈕
        this._ghost = null;        // 幽靈元素
        this._indicator = null;    // 插入指示線
        this._startX = 0;
        this._startY = 0;
        this._pointerId = null;
        this._fromAnswer = false;  // 是否從答案區拖出

        // 綁定 document 事件（保存引用方便移除）
        this._onMove = this._onPointerMove.bind(this);
        this._onUp   = this._onPointerUp.bind(this);
        this._onTouchMove = (e) => { if (this._dragging) e.preventDefault(); };

        document.addEventListener('pointermove', this._onMove, { passive: false });
        document.addEventListener('pointerup',   this._onUp,   { passive: false });
        document.addEventListener('touchmove',   this._onTouchMove, { passive: false });
    }

    // ── 初始化答案區 & 單字池（每題重新呼叫）──
    init() {
        this.answerArea = document.getElementById(this.answerAreaId);
        this.pool       = document.getElementById(this.poolId);
        if (!this.answerArea || !this.pool) {
            console.error('ReorderDrag: 找不到容器', this.answerAreaId, this.poolId);
            return;
        }
        // 換用新的 class
        this.answerArea.className = 'reorder-answer-area';
        this.pool.className       = 'reorder-pool';
    }

    // ── 建立一顆單字按鈕並綁定事件 ──
    createWordBtn(text, poolIndex) {
        const btn = document.createElement('button');
        btn.className = 'reorder-word';
        btn.textContent = text;
        btn.dataset.word  = text;
        btn.dataset.idx   = poolIndex;   // 原始索引（處理重複字）

        btn.addEventListener('pointerdown', (e) => this._onPointerDown(e, btn));
        return btn;
    }

    // ── 讀取目前答案區的單字順序 ──
    getAnswer() {
        return Array.from(this.answerArea.querySelectorAll('.reorder-word'))
            .map(btn => btn.dataset.word);
    }

    // ── 銷毀（切題前呼叫，清除幽靈 & 指示線）──
    destroy() {
        this._cleanupDrag();
        document.removeEventListener('pointermove', this._onMove);
        document.removeEventListener('pointerup',   this._onUp);
        document.removeEventListener('touchmove',   this._onTouchMove);
    }

    // ─────────────────────────────────────────────
    //  Private helpers
    // ─────────────────────────────────────────────

    _onPointerDown(e, btn) {
        // 已提交後禁止拖曳
        if (btn.classList.contains('correct') || btn.classList.contains('incorrect')) return;

        e.preventDefault();
        this._dragEl    = btn;
        this._dragging  = false;   // 尚未超過門檻
        this._startX    = e.clientX;
        this._startY    = e.clientY;
        this._pointerId = e.pointerId;
        this._fromAnswer = this.answerArea.contains(btn);

        try { btn.setPointerCapture(e.pointerId); } catch(err) {}
    }

    _onPointerMove(e) {
        if (!this._dragEl) return;
        if (e.pointerId !== this._pointerId) return;

        const dx = e.clientX - this._startX;
        const dy = e.clientY - this._startY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // 超過 6px 才正式觸發拖曳
        if (!this._dragging) {
            if (dist < 6) return;
            this._dragging = true;
            this._startDrag(e);
        }

        // 移動幽靈
        if (this._ghost) {
            this._ghost.style.left = (e.clientX - this._ghost._offX) + 'px';
            this._ghost.style.top  = (e.clientY - this._ghost._offY) + 'px';
        }

        // 更新指示線
        const overAnswer = this._isOverAnswerArea(e.clientX, e.clientY);
        if (overAnswer) {
            this.answerArea.classList.add('drag-over');
            this._updateIndicator(e.clientX, e.clientY);
        } else {
            this.answerArea.classList.remove('drag-over');
            this._removeIndicator();
        }
    }

    _onPointerUp(e) {
        if (!this._dragEl) return;
        if (e.pointerId !== this._pointerId) return;

        if (!this._dragging) {
            // ── 點擊邏輯 ──
            this._handleClick();
        } else {
            // ── 拖曳放開邏輯 ──
            this._handleDrop(e.clientX, e.clientY);
        }

        this._cleanupDrag();
    }

    _startDrag(e) {
        const btn = this._dragEl;
        const rect = btn.getBoundingClientRect();

        // 原始按鈕保留佔位但透明
        btn.classList.add('is-dragging');

        // 建立幽靈
        const ghost = document.createElement('button');
        ghost.className  = 'reorder-drag-ghost';
        ghost.textContent = btn.textContent;
        ghost._offX = e.clientX - rect.left;
        ghost._offY = e.clientY - rect.top;
        ghost.style.left   = (e.clientX - ghost._offX) + 'px';
        ghost.style.top    = (e.clientY - ghost._offY) + 'px';
        ghost.style.width  = rect.width + 'px';
        document.body.appendChild(ghost);
        this._ghost = ghost;
    }

    _handleClick() {
        const btn = this._dragEl;
        if (this._fromAnswer) {
            // 答案區 → 退回單字池
            this._moveToPool(btn);
        } else {
            // 單字池 → 加到答案區尾端
            this._moveToAnswer(btn);
        }
    }

    _handleDrop(x, y) {
        const btn = this._dragEl;
        const overAnswer = this._isOverAnswerArea(x, y);

        if (overAnswer) {
            // 計算插入位置（插入指示線前面）
            const insertPos = this._getInsertPosition(x, y);

            if (this._fromAnswer) {
                // 從答案區內部重新排序
                const children = Array.from(
                    this.answerArea.querySelectorAll('.reorder-word:not(.is-dragging)')
                );
                const originalPos = Array.from(this.answerArea.children).indexOf(btn);
                // 先移除原位
                btn.classList.remove('is-dragging');
                btn.remove();
                // 補正索引
                const finalPos = insertPos > originalPos ? insertPos - 1 : insertPos;
                this._insertAtPosition(btn, finalPos);
            } else {
                // 從單字池拖入答案區
                btn.classList.remove('is-dragging');
                this._markPoolItemUsed(btn);
                // 建立答案區的新按鈕（複製）
                const newBtn = this.createWordBtn(btn.dataset.word, btn.dataset.idx);
                newBtn.classList.add('in-answer');
                this._insertAtPosition(newBtn, insertPos);
            }
        } else {
            // 拖到答案區外
            if (this._fromAnswer) {
                // 退回單字池
                btn.classList.remove('is-dragging');
                this._moveToPool(btn);
            } else {
                // 從池子拖出又放回池子 — 無動作，恢復顯示
                btn.classList.remove('is-dragging');
            }
        }
    }

    _moveToAnswer(poolBtn) {
        this._markPoolItemUsed(poolBtn);
        const newBtn = this.createWordBtn(poolBtn.dataset.word, poolBtn.dataset.idx);
        newBtn.classList.add('in-answer');
        this.answerArea.appendChild(newBtn);
    }

    _moveToPool(answerBtn) {
        answerBtn.remove();
        // 找到對應的 pool 按鈕並恢復
        const idx = answerBtn.dataset.idx;
        const poolBtn = this.pool.querySelector(`.reorder-word[data-idx="${idx}"]`);
        if (poolBtn) {
            poolBtn.classList.remove('is-used');
            poolBtn.style.pointerEvents = '';
        }
    }

    _markPoolItemUsed(poolBtn) {
        poolBtn.classList.add('is-used');
    }

    _insertAtPosition(btn, pos) {
        const answersInArea = this.answerArea.querySelectorAll('.reorder-word');
        if (pos >= answersInArea.length) {
            this.answerArea.appendChild(btn);
        } else {
            this.answerArea.insertBefore(btn, answersInArea[pos]);
        }
    }

    _getInsertPosition(x, y) {
        const words = Array.from(
            this.answerArea.querySelectorAll('.reorder-word:not(.is-dragging)')
        );
        if (words.length === 0) return 0;

        // 按行分組（Y 值相近的為同一行）
        const rows = [];
        words.forEach(w => {
            const r = w.getBoundingClientRect();
            const centerY = r.top + r.height / 2;
            let row = rows.find(row => Math.abs(row.centerY - centerY) < r.height * 0.6);
            if (!row) { row = { centerY, items: [] }; rows.push(row); }
            row.items.push({ el: w, rect: r, domIdx: words.indexOf(w) });
        });
        rows.sort((a, b) => a.centerY - b.centerY);

        // 找最近的行
        let targetRow = rows[0];
        let minDist = Infinity;
        rows.forEach(row => {
            const dist = Math.abs(row.centerY - y);
            if (dist < minDist) { minDist = dist; targetRow = row; }
        });

        // 在該行內找插入位置
        targetRow.items.sort((a, b) => a.rect.left - b.rect.left);
        for (let i = 0; i < targetRow.items.length; i++) {
            const item = targetRow.items[i];
            if (x < item.rect.left + item.rect.width / 2) {
                return item.domIdx;
            }
        }
        // 放到該行末尾
        return targetRow.items[targetRow.items.length - 1].domIdx + 1;
    }

    _updateIndicator(x, y) {
        this._removeIndicator();
        const pos = this._getInsertPosition(x, y);
        const indicator = document.createElement('div');
        indicator.className = 'reorder-insert-indicator';
        this._indicator = indicator;

        const words = this.answerArea.querySelectorAll('.reorder-word:not(.is-dragging)');
        if (pos >= words.length) {
            this.answerArea.appendChild(indicator);
        } else {
            this.answerArea.insertBefore(indicator, words[pos]);
        }
    }

    _removeIndicator() {
        if (this._indicator) {
            this._indicator.remove();
            this._indicator = null;
        }
    }

    _isOverAnswerArea(x, y) {
        const rect = this.answerArea.getBoundingClientRect();
        return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    }

    _cleanupDrag() {
        if (this._ghost) { this._ghost.remove(); this._ghost = null; }
        this._removeIndicator();
        this.answerArea && this.answerArea.classList.remove('drag-over');
        if (this._dragEl) {
            this._dragEl.classList.remove('is-dragging');
        }
        this._dragEl   = null;
        this._dragging  = false;
        this._pointerId = null;
    }
}; }

// 全域拖曳實例
let _reorganizeDrag = null;

function loadReorganizeQuestion() {
    let sentenceObj = currentQuizSentences[currentSentenceIndex];
    if (!sentenceObj || !sentenceObj.句子) {
        console.error("❌ 找不到有效的句子對象！");
        return;
    }

    let sentenceText = sentenceObj.句子.replace(/\s*\[=[^\]]+\]/g, "").trim();
    sentenceObj.filteredSentence = sentenceText;

    let chineseHint = sentenceObj.中文 || "（無中文提示）";
    document.getElementById("reorganizeSentenceHint").innerHTML = chineseHint;

    let blocks = sentenceText.match(/\p{L}+(?:'\p{L}+)?|'s|\p{L}+(?:-\p{L}+)+/gu) || [];

    // 清空容器
    const answerArea = document.getElementById("sentenceConstructionArea");
    const pool = document.getElementById("wordBlocksContainer");
    answerArea.innerHTML = "";
    pool.innerHTML = "";

    // 初始化拖曳系統（每題重建）
    if (_reorganizeDrag) _reorganizeDrag.destroy();
    _reorganizeDrag = new window.ReorderDrag("sentenceConstructionArea", "wordBlocksContainer");
    _reorganizeDrag.init();

    // 洗牌並渲染單字池
    const shuffled = blocks.map((value, index) => ({ value, index })).sort(() => Math.random() - 0.5);
    shuffled.forEach(b => {
        const btn = _reorganizeDrag.createWordBtn(b.value, b.index);
        pool.appendChild(btn);
    });

    // 音頻
    if (sentenceObj.Words) {
        let audioUrl = GITHUB_MP3_BASE_URL + encodeURIComponent(sentenceObj.Words) + ".mp3";
        if (currentAudio instanceof Audio) currentAudio.pause();
        currentAudio = new Audio(audioUrl);

        const playBtn = document.getElementById("playReorganizeAudioBtn");
        playBtn.classList.remove("playing");
        playBtn.onclick = () => {
            if (currentAudio) {
                playBtn.classList.add("playing");
                currentAudio.currentTime = 0;
                currentAudio.play().catch(error => {
                    console.error("🔊 播放失敗:", error);
                    playBtn.classList.remove("playing");
                });
            }
        };
        currentAudio.onended = () => {
            playBtn.classList.remove("playing");
        };

        playBtn.classList.add("playing");
        currentAudio.play().catch(error => {
            console.warn("🔊 自動播放失敗:", error);
            playBtn.classList.remove("playing");
        });
    }

    // 初始化鍵盤重組管理器
    initReorganizeKeyboard(_reorganizeDrag);
}

// 舊的 selectWordBlock 不再使用，保留空函式避免 HTML onclick 殘留報錯
function selectWordBlock(block) {
    // no-op: replaced by ReorderDrag
}

// ═══════════════════════════════════════════════
//  句子重組鍵盤管理器
// ═══════════════════════════════════════════════
let _reorgKeyboard = null;

function initReorganizeKeyboard(dragInstance) {
    if (_reorgKeyboard) {
        _reorgKeyboard.destroy();
    }
    _reorgKeyboard = new ReorganizeKeyboardManager(dragInstance);
    _reorgKeyboard.init();
}

class ReorganizeKeyboardManager {
    constructor(dragInstance) {
        this.drag = dragInstance;
        this.prefix = '';               // 目前累積的字母前綴
        this.candidates = [];           // 符合前綴的 pool btn 陣列
        this.cycleIndex = 0;           // 循環指標（處理重複單字）
        this._handler = this._onKeyDown.bind(this);
    }

    init() {
        document.addEventListener('keydown', this._handler);
    }

    destroy() {
        document.removeEventListener('keydown', this._handler);
        this._clearHighlight();
    }

    _onKeyDown(e) {
        // 只在重組測驗區啟用
        const reorganizeArea = document.getElementById('reorganizeQuizArea');
        if (!reorganizeArea || reorganizeArea.style.display !== 'block') return;

        // 忽略輸入框
        if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

        // 已提交（按鈕有 correct/incorrect 代表已提交）
        const answerArea = document.getElementById('sentenceConstructionArea');
        const isSubmitted = answerArea && answerArea.querySelector('.reorder-word.correct, .reorder-word.incorrect');

        // Enter 鍵：提交前 → 選字/提交；提交後 → 下一題
        if (e.key === 'Enter') {
            e.preventDefault();
            if (isSubmitted) {
                // 提交後按 Enter → 觸發「下一題」按鈕
                const submitBtn = document.getElementById('submitReorganizeBtn');
                if (submitBtn) submitBtn.click();
            } else {
                this._handleEnter(answerArea);
            }
            return;
        }

        if (isSubmitted) return;

        if (e.key === 'Backspace') {
            e.preventDefault();
            this._handleBackspace(answerArea);
            return;
        }

        if (e.key === 'Escape') {
            e.preventDefault();
            this._reset();
            return;
        }

        // 字母鍵 (a-z, A-Z, 含撇號 ' 用於 it's 等)
        if (/^[a-zA-Z']$/.test(e.key)) {
            e.preventDefault();
            this._handleLetter(e.key);
            return;
        }
    }

    _handleLetter(key) {
        const k = key.toLowerCase();
        const newPrefix = this.prefix + k;
        const poolBtns = this._getAvailablePoolBtns();

        // 找出符合新前綴的候選
        const newCandidates = poolBtns.filter(btn =>
            btn.dataset.word.toLowerCase().startsWith(newPrefix)
        );

        if (newCandidates.length > 0) {
            // 正常縮小前綴（例如 a → ap → app）
            this.prefix = newPrefix;
            this.candidates = newCandidates;
            this.cycleIndex = 0;
        } else {
            // 前綴無法繼續縮小 → 用此鍵作為全新首字母搜尋
            const freshCandidates = poolBtns.filter(btn =>
                btn.dataset.word.toLowerCase().startsWith(k)
            );
            if (freshCandidates.length === 0) {
                this._shake();
                return;
            }
            if (this.prefix.charAt(0) === k && this.candidates.length > 0) {
                // 連續按相同首字母 → 循環到下一個
                this.candidates = freshCandidates; // 更新（可能有字被用掉）
                this.cycleIndex = (this.cycleIndex + 1) % this.candidates.length;
            } else {
                // 全新首字母，從頭開始
                this.cycleIndex = 0;
            }
            this.prefix = k;
            this.candidates = freshCandidates;
        }

        this._applyHighlight();
    }

    _handleEnter(answerArea) {
        const poolBtns = this._getAvailablePoolBtns();
        const totalWords = this.drag
            ? Array.from(document.getElementById('wordBlocksContainer')
                .querySelectorAll('.reorder-word')).length
            : 0;
        const answeredCount = answerArea
            ? answerArea.querySelectorAll('.reorder-word').length : 0;
        const totalInPool = poolBtns.length;

        // 如果有 highlight 的候選 → 選中並移入答案區
        if (this.candidates.length > 0) {
            const target = this.candidates[this.cycleIndex] || this.candidates[0];
            if (target && this.drag) {
                this.drag._moveToAnswer(target);
            }
            this._reset();
            return;
        }

        // 沒有候選 → 判斷是否提交
        const allUsed = totalInPool === 0 || poolBtns.length === 0;
        if (allUsed) {
            const submitBtn = document.getElementById('submitReorganizeBtn');
            if (submitBtn) submitBtn.click();
        }
    }

    _handleBackspace(answerArea) {
        if (!answerArea) return;
        this._reset(); // 先清空前綴
        const answerBtns = Array.from(answerArea.querySelectorAll('.reorder-word'));
        if (answerBtns.length === 0) return;
        const last = answerBtns[answerBtns.length - 1];
        if (this.drag) {
            this.drag._moveToPool(last);
        }
    }

    _getAvailablePoolBtns() {
        const pool = document.getElementById('wordBlocksContainer');
        if (!pool) return [];
        return Array.from(pool.querySelectorAll('.reorder-word:not(.is-used)'));
    }

    _applyHighlight() {
        this._clearHighlight();
        // 只 highlight 當前焦點那一個
        const target = this.candidates[this.cycleIndex];
        if (target) {
            target.classList.add('keyboard-focus');
            target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }

    _clearHighlight() {
        document.querySelectorAll('.keyboard-candidate, .keyboard-focus').forEach(el => {
            el.classList.remove('keyboard-candidate', 'keyboard-focus');
        });
    }

    _reset() {
        this.prefix = '';
        this.candidates = [];
        this.cycleIndex = 0;
        this._clearHighlight();
    }

    _shake() {
        // 輕微震動動畫提示無匹配
        const pool = document.getElementById('wordBlocksContainer');
        if (!pool) return;
        pool.classList.add('keyboard-shake');
        setTimeout(() => pool.classList.remove('keyboard-shake'), 300);
    }
}

function submitReorganizeAnswer() {
    let sentenceObj = currentQuizSentences[currentSentenceIndex];
    let correctSentence = sentenceObj.filteredSentence;
    let correctWords = correctSentence.match(/\p{L}+(?:'\p{L}+)?|'s|\p{L}+(?:-\p{L}+)+/gu) || [];

    // 從答案區讀取使用者排列的單字
    const answerArea = document.getElementById("sentenceConstructionArea");
    const answerBtns = Array.from(answerArea.querySelectorAll('.reorder-word'));
    const userWords  = answerBtns.map(b => b.dataset.word);
    let userAnswer   = userWords.join(" ");

    userConstructedSentences[currentSentenceIndex] = userAnswer;

    let normalizedUserAnswer    = normalizeText(userAnswer);
    let normalizedCorrectSentence = normalizeText(correctSentence);
    let isCorrect = normalizedUserAnswer === normalizedCorrectSentence;

    if (!isCorrect && !incorrectSentences.includes(sentenceObj.Words)) {
        incorrectSentences.push(sentenceObj.Words);
        playWrongSound();
    } else if (isCorrect) {
        incorrectSentences = incorrectSentences.filter(w => w !== sentenceObj.Words);
        playCorrectSound();
    }
    localStorage.setItem("wrongQS", JSON.stringify(incorrectSentences));

    // 標記每個按鈕 correct / incorrect，並鎖定拖曳
    answerBtns.forEach((btn, i) => {
        const correctWord = correctWords[i] || "";
        if (normalizeText(btn.dataset.word) === normalizeText(correctWord)) {
            btn.classList.add("correct");
            btn.classList.remove("incorrect");
        } else {
            btn.classList.add("incorrect");
            btn.classList.remove("correct");
        }
    });

    // 鎖定單字池
    document.querySelectorAll('#wordBlocksContainer .reorder-word').forEach(btn => {
        btn.style.pointerEvents = 'none';
    });

    let chineseExplanation = sentenceObj.中文 ? sentenceObj.中文.replace(/\n/g, "<br>") : "無中文解釋";
    document.getElementById("reorganizeSentenceHint").innerHTML = `
        <div>${correctSentence}</div>
        <div class="chinese-explanation">
            <h3>中文解釋</h3>
            <p>${chineseExplanation}</p>
        </div>
    `;

    document.getElementById("submitReorganizeBtn").innerText = "下一題";
    document.getElementById("submitReorganizeBtn").onclick = goToNextReorganizeSentence;
}

function goToNextReorganizeSentence() {
    if (_reorgKeyboard) _reorgKeyboard.destroy();
    _reorgKeyboard = null;
    currentSentenceIndex++;
    if (currentSentenceIndex >= currentQuizSentences.length) {
        alert("🎉 測驗結束！");
        finishReorganizeQuiz();
        return;
    }
    loadReorganizeQuestion();
    document.getElementById("submitReorganizeBtn").innerText = "提交";
    document.getElementById("submitReorganizeBtn").onclick = submitReorganizeAnswer;

    if (currentAudio) {
        const playBtn = document.getElementById("playReorganizeAudioBtn");
        playBtn.classList.add("playing");
        currentAudio.currentTime = 0;
        currentAudio.play().catch(error => {
            console.warn("🔊 自動播放失敗:", error);
            playBtn.classList.remove("playing");
        });
    }
}

function normalizeText(text) {
    return text.toLowerCase().replace(/\s+/g, ' ').replace(/[.,!?;]/g, '').trim();
}

function finishReorganizeQuiz() {
    document.getElementById("sentenceQuizArea").style.display = "none";
    document.getElementById("reorganizeQuizArea").style.display = "none";
    document.getElementById("quizResult").style.display = "block";

    incorrectSentences = JSON.parse(localStorage.getItem("wrongQS")) || incorrectSentences;
    console.log("✅ finishReorganizeQuiz 時的 incorrectSentences:", incorrectSentences);

    let resultContainer = document.getElementById("quizResult");
    resultContainer.innerHTML = "<h2>重組測驗結果</h2>";

    for (let index = 0; index < userConstructedSentences.length; index++) {
        let sentenceObj = currentQuizSentences[index];
        if (!sentenceObj) continue;

        let userAnswer = userConstructedSentences[index] || "(未作答)";
        let correctSentence = sentenceObj.filteredSentence;

        let userWords = userAnswer.match(/[a-zA-Z]+(?:'[a-zA-Z]+)?|'s|[a-zA-Z]+(?:-[a-zA-Z]+)+/g) || [];
        let correctWords = correctSentence.match(/[a-zA-Z]+(?:'[a-zA-Z]+)?|'s|[a-zA-Z]+(?:-[a-zA-Z]+)+/g) || [];

        let highlightedCorrect = correctWords.map((word, i) => {
            return (userWords[i] && normalizeText(userWords[i]) === normalizeText(word))
                ? word
                : `<span style='color: red; font-weight: bold;'>${word}</span>`;
        }).join(' ');

        let isCorrect = normalizeText(userAnswer) === normalizeText(correctSentence);
        let isUnanswered = userAnswer === "(未作答)";
        let resultClass = isCorrect ? "correct" : (isUnanswered ? "unanswered" : "wrong");

        let suggestedRating = isCorrect ? 4 : (isUnanswered ? 3 : 2);
        let importantCheckbox = `<input type="checkbox" class="important-checkbox" onchange="toggleImportantSentence('${sentenceObj.Words}', this)" ${localStorage.getItem('important_sentence_' + sentenceObj.Words) === "true" ? "checked" : ""} />`;
        let sentenceIdentifierLink = `<a href="sentence.html?sentence=${encodeURIComponent(sentenceObj.Words)}&from=quiz&layer=4" class="sentence-link-btn">${sentenceObj.Words}</a>`;
        let wordDetailButton = `<button class="word-detail-btn" onclick="goToWordDetail('${sentenceObj.Words.split("-")[0]}')">單字詳情</button>`;
        let ratingHTML = typeof generateRatingHTML === 'function' ? generateRatingHTML('sentence', sentenceObj.Words, suggestedRating) : '';

        resultContainer.innerHTML += `
            <div class="result-item ${resultClass}">
                ${importantCheckbox}
                <div class="horizontal-group">
                    ${sentenceIdentifierLink}
                    ${wordDetailButton}
                </div>
                <div class="vertical-group">
                    <div><strong>正確答案:</strong> ${highlightedCorrect}</div>
                    <div><strong>您的答案:</strong> ${userAnswer}</div>
                </div>
                ${ratingHTML}
            </div>
        `;
    }

    resultContainer.innerHTML += `
        <div class="result-buttons">
            <button class="action-button" onclick="saveQSResults()">Save</button>
            <button class="action-button" onclick="openSentenceRatingManager()">查看評分記錄</button>
            <button class="action-button" onclick="returnToMainMenu()">Back</button>
        </div>
    `;

    localStorage.setItem("userConstructedSentences", JSON.stringify(userConstructedSentences));
    localStorage.setItem("currentQuizSentences", JSON.stringify(currentQuizSentences));
}

// 以下是其他必要的輔助函數...
function handleLetterInput(e) {
    const input = e.target;
    const wordIndex = parseInt(input.dataset.wordIndex);
    const letterIndex = parseInt(input.dataset.letterIndex);
    
    if (input.value.length === 1) {
        const allInputs = document.querySelectorAll('.letter-input');
        const currentInputIndex = Array.from(allInputs).indexOf(input);
        const nextInput = allInputs[currentInputIndex + 1];
        
        if (nextInput) {
            nextInput.focus();
        }
    }
}

function handleArrowNavigation(e) {
    const allInputs = document.querySelectorAll('.letter-input');
    const currentInputIndex = Array.from(allInputs).indexOf(e.target);
    
    if (e.key === 'ArrowLeft' && currentInputIndex > 0) {
        e.preventDefault();
        allInputs[currentInputIndex - 1].focus();
    } else if (e.key === 'ArrowRight' && currentInputIndex < allInputs.length - 1) {
        e.preventDefault();
        allInputs[currentInputIndex + 1].focus();
    }
}

function submitSentenceAnswer() {
    let sentenceObj = currentQuizSentences[currentSentenceIndex];
    if (!sentenceObj) {
        console.error("❌ 找不到 sentenceObj!");
        return;
    }

    let allInputs = document.querySelectorAll("#sentenceInput .letter-input");
    let userAnswer = "";
    let currentWord = [];

    allInputs.forEach((input) => {
        let char = input.value || "_";
        currentWord.push(char);

        let nextInput = input.nextElementSibling;
        if (!nextInput || !nextInput.classList.contains("letter-input")) {
            userAnswer += currentWord.join("") + " ";
            currentWord = [];
        }
    });

    userAnswer = userAnswer.trim();
    userAnswers[currentSentenceIndex] = userAnswer;
    
    let correctSentence = sentenceObj.filteredSentence;
    let userAnswerNormalized = userAnswer.replace(/\s+/g, " ").replace(/_/g, "").replace(/,\s*/g, ",").trim().toLowerCase();
    let correctSentenceNormalized = correctSentence.replace(/\s+/g, " ").replace(/,\s*/g, ",").trim().toLowerCase();
    let isCorrect = userAnswerNormalized === correctSentenceNormalized;

    if (!isCorrect && !incorrectSentences.includes(sentenceObj.Words)) {
        incorrectSentences.push(sentenceObj.Words);
        playWrongSound();
    } else if (isCorrect) {
        incorrectSentences = incorrectSentences.filter(w => w !== sentenceObj.Words);
        playCorrectSound();
    }
    localStorage.setItem("wrongQS", JSON.stringify(incorrectSentences));

    let correctChars = Array.from(correctSentence);
    let userChars = Array.from(userAnswer.replace(/_/g, ""));

    let inputElements = document.querySelectorAll("#sentenceInput .letter-input");
    let charIndex = 0;

    allInputs.forEach((input) => {
        if (input.classList.contains("letter-input")) {
            let userChar = input.value || "_";
            let correctChar = correctChars[charIndex] || "_";
            charIndex++;

            if (userChar.toLowerCase() === correctChar.toLowerCase()) {
                input.classList.add("correct");
                input.classList.remove("incorrect");
            } else {
                input.classList.add("incorrect");
                input.classList.remove("correct");
            }

            input.value = correctChar;
            input.disabled = true;
        }
    });

    let chineseExplanation = sentenceObj.中文 ? sentenceObj.中文.replace(/\n/g, "<br>") : "無中文解釋";
    document.getElementById("sentenceHint").innerHTML = `
        <div>${correctSentence}</div>
        <div class="chinese-explanation">
            <h3>中文解釋</h3>
            <p>${chineseExplanation}</p>
        </div>
    `;

    let submitBtn = document.getElementById("submitSentenceBtn");
    submitBtn.innerText = "下一題";
    submitBtn.onclick = goToNextSentence;
    submitBtn.dataset.next = "true";
}

function goToNextSentence() {
    currentSentenceIndex++;
    if (currentSentenceIndex >= currentQuizSentences.length) {
        alert("🎉 測驗結束！");
        finishSentenceQuiz();
        return;
    }

    loadSentenceQuestion();

    let submitBtn = document.getElementById("submitSentenceBtn");
    submitBtn.innerText = "提交";
    submitBtn.onclick = submitSentenceAnswer;
    submitBtn.dataset.next = "false";

    autoPlayAudio();
}

function finishSentenceQuiz() {
    document.getElementById("sentenceQuizArea").style.display = "none";
    document.getElementById("quizResult").style.display = "block";

    incorrectSentences = JSON.parse(localStorage.getItem("wrongQS")) || incorrectSentences;
    console.log("✅ finishSentenceQuiz 時的 incorrectSentences:", incorrectSentences);

    let resultContainer = document.getElementById("quizResult");
    resultContainer.innerHTML = "<h2>測驗結果</h2>";

    for (let index = 0; index < userAnswers.length; index++) {
        let sentenceObj = currentQuizSentences[index];
        if (!sentenceObj) continue;

        let userAnswer = getUserAnswer(index) || "(未作答)";
        let correctSentence = sentenceObj.句子;

        let userAnswerNormalized = userAnswer.replace(/\s+/g, " ").replace(/,\s*/g, ",").trim().toLowerCase();
        let correctSentenceNormalized = correctSentence.replace(/\s+/g, " ").replace(/,\s*/g, ",").trim().toLowerCase();
        let isCorrect = userAnswerNormalized === correctSentenceNormalized;
        let isUnanswered = userAnswer === "(未作答)";

        let resultClass = isCorrect ? "correct" : (isUnanswered ? "unanswered" : "wrong");
        
        // 根據答題結果給予建議評分
        let suggestedRating = isCorrect ? 4 : (isUnanswered ? 3 : 2);
        
        let importantCheckbox = `<input type="checkbox" class="important-checkbox" onchange="toggleImportantSentence('${sentenceObj.Words}', this)" ${localStorage.getItem('important_sentence_' + sentenceObj.Words) === "true" ? "checked" : ""} />`;
        let sentenceIdentifierLink = `<a href="sentence.html?sentence=${encodeURIComponent(sentenceObj.Words)}&from=quiz&layer=4" class="sentence-link-btn">${sentenceObj.Words}</a>`;
        let wordDetailButton = `<button class="word-detail-btn" onclick="goToWordDetail('${sentenceObj.Words.split("-")[0]}')">單字詳情</button>`;
        let correctSentenceLink = `<button class="sentence-link-btn" onclick="playSentenceAudio('${sentenceObj.Words}.mp3')">${correctSentence}</button>`;
        let ratingHTML = typeof generateRatingHTML === 'function' ? generateRatingHTML('sentence', sentenceObj.Words, suggestedRating) : '';

        resultContainer.innerHTML += `
            <div class="result-item ${resultClass}">
                ${importantCheckbox}
                <div class="horizontal-group">
                    ${sentenceIdentifierLink}
                    ${wordDetailButton}
                </div>
                <div class="vertical-group">
                    ${correctSentenceLink}
                </div>
                ${ratingHTML}
            </div>
        `;
    }

    resultContainer.innerHTML += `
        <div class="result-buttons">
            <button class="action-button" onclick="saveQSResults()">Save</button>
            <button class="action-button" onclick="openSentenceRatingManager()">查看評分記錄</button>
            <button class="action-button" onclick="returnToMainMenu()">Back</button>
        </div>
    `;

    localStorage.setItem("userAnswers", JSON.stringify(userAnswers));
    localStorage.setItem("currentQuizSentences", JSON.stringify(currentQuizSentences));
    console.log("✅ 測驗結束時保存的資料:", { userAnswers, currentQuizSentences });
}

function saveQSResults() {
    let vocabularyData = window.getVocabularyData();
    // 直接更新全域資料物件中的 wrongQS
    vocabularyData.wrongQS = incorrectSentences;
    window.persistVocabularyData(); // 觸發雲端/本地儲存

    console.log("✅ 錯誤句子已儲存:", vocabularyData.wrongQS);
    alert("測驗結果中的錯誤句子已儲存！");
}

function goToWordDetail(word) {
    let baseWord = word.replace(/-\d+$/, '');
    window.location.href = `index.html?word=${encodeURIComponent(baseWord)}&from=quiz`;
}

function returnToSentenceCategorySelection() {
    document.getElementById("sentenceQuizCategories").style.display = "block";
    document.getElementById("sentenceQuizArea").style.display = "none";
    document.getElementById("reorganizeQuizArea").style.display = "none";
    document.getElementById("quizResult").style.display = "none";
    const vrArea = document.getElementById("voiceReorderArea");
    if (vrArea) { vrArea.style.display = "none"; if (typeof _qsVrStopRecordingSilent === 'function') _qsVrStopRecordingSilent(); }

    // 不顯示測驗類型選擇區域，因為我們是返回到分類頁面
    const quizTypeSelector = document.querySelector(".quiz-type-selector");
    if (quizTypeSelector) {
        quizTypeSelector.style.display = "none";
    }
    
    // 確保標題為「測驗區」
    const header = document.querySelector('.page-title');
    if (header) {
        header.textContent = '測驗區';
    }

    Object.keys(selectedSentenceFilters).forEach(key => selectedSentenceFilters[key].clear());
    
    document.querySelectorAll(".category-button.selected").forEach(button => {
        button.classList.remove("selected");
    });
    
    document.querySelectorAll(".subcategory-wrapper").forEach(wrapper => {
        wrapper.remove();
    });

    console.log("✅ 返回句子測驗分類頁面，重置所有測驗區域");
}

function toggleImportantSentence(word, checkbox) {
    let vocabularyData = window.getVocabularyData();
    if (!vocabularyData.importantSentences) {
        vocabularyData.importantSentences = {}; // 正確：初始化為物件
    }

    if (checkbox.checked) {
        vocabularyData.importantSentences[word] = "true"; // 正確：設定物件屬性
        console.log(`⭐ 句子 ${word} 標記為重要`);
    } else {
        delete vocabularyData.importantSentences[word]; // 正確：刪除物件屬性
        console.log(`❌ 句子 ${word} 取消重要標記`);
    }
    window.persistVocabularyData();
}

function returnToMainMenu() {
    window.location.href = 'index.html';
    
    currentSentenceIndex = 0;
    userAnswers = [];
    userConstructedSentences = [];

    console.log("✅ 返回首頁並重置測驗狀態");
}


// ════════════════════════════════════════════════════════════
//  VOICE REORDER MODE — q_sentence.js 整合
//  流程：聽句子 → 用麥克風說出單字（或手動拖曳 chip）→ 排出正確順序
//  資料來源：sentenceData（JSON）
//  音訊來源：GITHUB_MP3_BASE_URL + sentenceObj.Words + ".mp3"
// ════════════════════════════════════════════════════════════

console.log('✅ Voice Reorder module (q_sentence.js) loading…');

// ── 數字文字 ↔ 阿拉伯數字 對照表 ────────────────────────────
const _QS_VR_NUM_MAP = {
    'zero':'0','one':'1','two':'2','three':'3','four':'4',
    'five':'5','six':'6','seven':'7','eight':'8','nine':'9',
    'ten':'10','eleven':'11','twelve':'12','thirteen':'13','fourteen':'14',
    'fifteen':'15','sixteen':'16','seventeen':'17','eighteen':'18','nineteen':'19',
    'twenty':'20','thirty':'30','forty':'40','fifty':'50',
    'sixty':'60','seventy':'70','eighty':'80','ninety':'90',
    'hundred':'100','thousand':'1000','million':'1000000',
};
const _QS_VR_NUM_MAP_REV = Object.fromEntries(
    Object.entries(_QS_VR_NUM_MAP).map(([k, v]) => [v, k])
);

function _qsVrNormalizeNum(w) {
    if (_QS_VR_NUM_MAP[w]) return _QS_VR_NUM_MAP[w];
    if (_QS_VR_NUM_MAP_REV[w]) return w;
    return w;
}

// ── Levenshtein distance ─────────────────────────────────────
function _qsVrLevenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, (_, i) =>
        Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
    );
    for (let i = 1; i <= m; i++)
        for (let j = 1; j <= n; j++)
            dp[i][j] = a[i-1] === b[j-1]
                ? dp[i-1][j-1]
                : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    return dp[m][n];
}

// ── 語音 Tokenize：去除標點保留連字符單字 ────────────────────
function _qsVrTokenize(sentence) {
    const raw = sentence.match(/\S+/g) || [];
    return raw.map(w => w.replace(/^[.,?!:;'"'""\-]+|[.,?!:;'"'""\-]+$/g, '').trim()).filter(Boolean);
}

// ── 比對用清理 ───────────────────────────────────────────────
function _qsVrClean(w) {
    return w.replace(/[.,?!'"'"";\:\-]/g, '').toLowerCase().trim();
}

// ── State ────────────────────────────────────────────────────
let _qsVrState = {
    sentences: [],       // [{text, wordsKey, chineseHint, audioUrl}]
    qIndex:    0,
    correct:   0,
    total:     0,
    wrongItems: [],      // [{wordsKey, text, userText}]
    // per-question
    words:     [],       // original tokens（display）
    poolOrder: [],       // shuffled indices into words[] still in pool
    answer:    [],       // placed word indices in order
    done:      false,
    skipped:   false,
};

let _qsVrRecognition = null;
let _qsVrIsRecording  = false;
let _qsVrBestTranscript = '';
let _qsVrStrictMode   = true;
let _qsVrWordSpeakEnabled = false;
let _qsVrAudio        = null;   // 目前題目的 Audio 實例

const _QsVrSpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

// ── DOM helper ────────────────────────────────────────────────
function _qsVrEl(id) { return document.getElementById(id); }

// ── 瀏覽器支援 badge（掛在啟動按鈕上）─────────────────────────
(function _qsVrInitCompatBadge() {
    const btn = document.getElementById('startVoiceReorderBtn');
    if (!btn) return;
    const badge = document.createElement('span');
    badge.style.cssText = 'font-size:0.65rem;font-weight:600;padding:1px 6px;border-radius:8px;margin-left:6px;vertical-align:middle;';
    if (_QsVrSpeechRec) {
        badge.textContent = '🎙 支援';
        badge.style.cssText += 'background:#e8f5e9;color:#2e7d32;border:1px solid #a5d6a7;';
        badge.title = '您的瀏覽器支援語音辨識';
    } else {
        badge.textContent = '⚠️ 需要 Chrome';
        badge.style.cssText += 'background:#fff3e0;color:#e65100;border:1px solid #ffcc80;';
        badge.title = '此功能需要 Chrome，Safari/Firefox 不支援語音辨識';
    }
    btn.appendChild(badge);
})();

// ════════════════════════════════════════════════════════════
//  ENTRY POINT
// ════════════════════════════════════════════════════════════
async function startVoiceReorderQuiz() {
    // 確認資料已載入
    await window.ensureSentenceDataLoaded();

    // 用相同篩選邏輯從 sentenceData 抽題
    let filteredSentences = sentenceData.filter(item => {
        let levelMatch = selectedSentenceFilters.levels.size === 0 ||
                         selectedSentenceFilters.levels.has(item.等級 || '未分類');
        let primaryMatch = selectedSentenceFilters.primaryCategories.size === 0 ||
                           selectedSentenceFilters.primaryCategories.has(item['分類'] && item['分類'][0]);
        let secondaryMatch = selectedSentenceFilters.secondaryCategories.size === 0 ||
            (item['分類'] && item['分類'][1] && selectedSentenceFilters.secondaryCategories.has(item['分類'][1])) ||
            (selectedSentenceFilters.secondaryCategories.has('未分類') &&
             (!item['分類'] || !item['分類'][1] || item['分類'][1].trim() === ''));
        let alphabetMatch = selectedSentenceFilters.alphabet.size === 0 ||
                            selectedSentenceFilters.alphabet.has(item.句子.charAt(0).toUpperCase());
        let specialMatch = true;
        if (selectedSentenceFilters.special.size > 0) {
            const vd = window.getVocabularyData ? window.getVocabularyData() : {};
            specialMatch = [...selectedSentenceFilters.special].every(f => {
                if (f === 'important') return (vd.importantSentences || {})[item.Words] === 'true';
                if (f === 'incorrect') return (vd.wrongQS || []).includes(item.Words);
                if (f === 'checked')   return (vd.checkedSentences || {})[item.Words] === 'true';
                if (f === 'word_checked') {
                    const base = item.Words.split('-')[0];
                    return (vd.checkedWords || []).includes(base);
                }
                return true;
            });
        }
        return levelMatch && primaryMatch && secondaryMatch && alphabetMatch && specialMatch;
    });

    if (filteredSentences.length === 0) {
        alert('⚠️ 沒有符合條件的句子！\n請嘗試調整篩選條件。');
        return;
    }

    // 只保留有有效單字的句子（至少2個字）
    filteredSentences = filteredSentences.filter(item => {
        const text = (item.句子 || '').replace(/\s*\[=[^\]]+\]/g, '').trim();
        return _qsVrTokenize(text).length >= 2;
    });

    if (filteredSentences.length === 0) {
        alert('⚠️ 沒有足夠長度的句子可以進行 Voice Reorder。');
        return;
    }

    // 智慧排序：練習次數少的優先（與其他模式對齊）
    filteredSentences.sort((a, b) => {
        const ca = sentenceQuizHistory[a.Words] || 0;
        const cb = sentenceQuizHistory[b.Words] || 0;
        return ca - cb;
    });

    // 隨機抽 10 題
    const shuffled = [...filteredSentences].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, 10);

    // 建立 VR sentences 格式
    _qsVrState.sentences = picked.map(item => {
        const text = (item.句子 || '').replace(/\s*\[=[^\]]+\]/g, '').trim();
        return {
            text,
            wordsKey:    item.Words || '',
            chineseHint: item.中文  || '',
            audioUrl:    item.Words ? (GITHUB_MP3_BASE_URL + encodeURIComponent(item.Words) + '.mp3') : '',
        };
    });

    _qsVrState.qIndex    = 0;
    _qsVrState.correct   = 0;
    _qsVrState.total     = _qsVrState.sentences.length;
    _qsVrState.wrongItems = [];

    // 隱藏所有其他區域，顯示 voiceReorderArea
    _qsVrHideAllAreas();
    const area = _qsVrEl('voiceReorderArea');
    if (area) area.style.display = 'block';

    _qsVrUpdateProgress();
    _qsVrUpdateStrictBtn();
    _qsVrLoadQuestion();

    console.log(`✅ Voice Reorder 開始，共 ${_qsVrState.total} 題`);
}

// ── 隱藏所有 quiz 區塊 ────────────────────────────────────────
function _qsVrHideAllAreas() {
    const ids = [
        'sentenceQuizCategories', 'sentenceQuizArea', 'reorganizeQuizArea',
        'rewordQuizArea', 'quizArea', 'quizCategories',
        'flashcardTypePanel', 'flashcardSetupPanel', 'flashcardArea', 'flashcardResultPanel',
        'quizResult', 'voiceReorderArea'
    ];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    const qs = document.querySelector('.quiz-type-selector');
    if (qs) qs.style.display = 'none';
}

// ════════════════════════════════════════════════════════════
//  LOAD QUESTION
// ════════════════════════════════════════════════════════════
function _qsVrLoadQuestion() {
    _qsVrStopRecordingSilent();
    if (_qsVrAudio) { _qsVrAudio.pause(); _qsVrAudio = null; }

    const item = _qsVrState.sentences[_qsVrState.qIndex];
    if (!item) return;

    _qsVrState.words     = _qsVrTokenize(item.text);
    _qsVrState.poolOrder = _qsVrShuffle(_qsVrState.words.map((_, i) => i));
    _qsVrState.answer    = [];
    _qsVrState.done      = false;
    _qsVrState.skipped   = false;

    // 更新 UI
    const hintEl = _qsVrEl('qs-vr-hint');
    if (hintEl) hintEl.textContent = item.chineseHint || '';

    const fbEl = _qsVrEl('qs-vr-feedback');
    if (fbEl) { fbEl.className = 'vr-feedback'; fbEl.textContent = ''; }

    const heardEl = _qsVrEl('qs-vr-heard-text');
    if (heardEl) heardEl.textContent = '';

    const micLbl = _qsVrEl('qs-vr-mic-label');
    if (micLbl) micLbl.textContent = 'Tap mic & say the whole sentence';

    const checkBtn = _qsVrEl('qs-vr-check-btn');
    if (checkBtn) { checkBtn.textContent = 'Check ✓'; checkBtn.style.display = ''; }

    const answerZone = _qsVrEl('qs-vr-answer-zone');
    if (answerZone) answerZone.classList.remove('vr-correct-flash');

    _qsVrRenderAnswerZone();
    _qsVrRenderPool();

    // 更新測驗歷史
    if (item.wordsKey) {
        sentenceQuizHistory[item.wordsKey] = (sentenceQuizHistory[item.wordsKey] || 0) + 1;
        localStorage.setItem('sentenceQuizHistory', JSON.stringify(sentenceQuizHistory));
    }

    // 自動播放
    _qsVrPlaySentence(true);
}

// ════════════════════════════════════════════════════════════
//  AUDIO PLAYBACK
// ════════════════════════════════════════════════════════════

function _qsVrSetPlayBtnState(state) {
    const replayBtn = _qsVrEl('qs-vr-replay-btn');
    const statusBar  = _qsVrEl('qs-vr-status-bar');
    const statusIcon = _qsVrEl('qs-vr-status-icon');
    const statusText = _qsVrEl('qs-vr-status-text');

    if (replayBtn) {
        if (state === 'loading') {
            replayBtn.classList.add('is-loading'); replayBtn.disabled = true;
        } else {
            replayBtn.classList.remove('is-loading'); replayBtn.disabled = false;
        }
    }

    if (statusBar && statusIcon && statusText) {
        statusBar.classList.remove('vr-status--loading', 'vr-status--playing');
        statusIcon.classList.remove('vr-spin');
        if (state === 'loading') {
            statusBar.classList.add('vr-status--loading');
            statusIcon.textContent = '⏳';
            statusIcon.classList.add('vr-spin');
            statusText.textContent = 'Loading audio…';
        } else if (state === 'playing') {
            statusBar.classList.add('vr-status--playing');
            statusIcon.textContent = '🔊';
            statusText.textContent = 'Playing… listen carefully';
        } else {
            statusIcon.textContent = '▶';
            statusText.textContent = 'Play Sentence / Listen, then say or drag each word';
        }
    }
}

function _qsVrPlaySentence(isAuto) {
    const item = _qsVrState.sentences[_qsVrState.qIndex];
    if (!item) return;

    // 停掉上一個
    if (_qsVrAudio) {
        _qsVrAudio.pause();
        _qsVrAudio.onended = null;
        _qsVrAudio.onerror = null;
        _qsVrAudio = null;
    }

    if (item.audioUrl) {
        // ── 與 Reorganize Quiz 相同：直接 new Audio + play()，不等 canplaythrough ──
        const audio = new Audio(item.audioUrl);
        _qsVrAudio = audio;

        _qsVrSetPlayBtnState('playing');

        audio.onended = () => {
            _qsVrSetPlayBtnState('idle');
        };
        audio.onerror = () => {
            // MP3 載入失敗才降級 TTS
            _qsVrSetPlayBtnState('idle');
            _qsVrPlayTTS(item.text);
        };

        audio.currentTime = 0;
        audio.play().catch(() => {
            // play() 被瀏覽器阻擋（autoplay policy）→ 降級 TTS
            _qsVrSetPlayBtnState('idle');
            _qsVrPlayTTS(item.text);
        });
    } else {
        _qsVrPlayTTS(item.text);
    }
}

function _qsVrPlayTTS(text) {
    if (!('speechSynthesis' in window)) { _qsVrSetPlayBtnState('idle'); return; }
    _qsVrSetPlayBtnState('playing');
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US'; u.rate = 0.85;
    u.onend  = () => { _qsVrSetPlayBtnState('idle'); };
    u.onerror = () => { _qsVrSetPlayBtnState('idle'); };
    speechSynthesis.speak(u);
}

// ── 單字發音（放置 chip 時）──────────────────────────────────
function _qsVrSpeakWord(word) {
    if (!_qsVrWordSpeakEnabled) return;
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(word.toLowerCase());
    u.lang = 'en-US'; u.rate = 0.9;
    speechSynthesis.speak(u);
}

// ── 就緒提示音 ────────────────────────────────────────────────
function _qsVrPlayReadySound() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    let ctx = window._quizAC;
    if (!ctx || ctx.state === 'closed') {
        try { ctx = new AC(); } catch (e) { return; }
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const now = ctx.currentTime;
    [{ freq: 440, t: 0 }, { freq: 523.25, t: 0.1 }].forEach(({ freq, t }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + t);
        gain.gain.setValueAtTime(0, now + t);
        gain.gain.linearRampToValueAtTime(0.12, now + t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.20);
        osc.start(now + t); osc.stop(now + t + 0.22);
    });
}

// ════════════════════════════════════════════════════════════
//  DRAG SYSTEM
// ════════════════════════════════════════════════════════════
let _qsVrDrag = {
    active: false, ghost: null, source: null,
    poolIdx: null, answerPos: null, word: null,
    startX: 0, startY: 0, originEl: null,
};
const _QS_VR_DRAG_THRESH = 6;

function _qsVrDragStart(e, source, poolIdx, answerPos, word) {
    if (_qsVrState.done) return;
    const pt = e.touches ? e.touches[0] : e;
    _qsVrDrag.startX    = pt.clientX;
    _qsVrDrag.startY    = pt.clientY;
    _qsVrDrag.source    = source;
    _qsVrDrag.poolIdx   = poolIdx;
    _qsVrDrag.answerPos = answerPos;
    _qsVrDrag.word      = word;
    _qsVrDrag.active    = false;
    _qsVrDrag.originEl  = e.currentTarget;

    const ghost = document.createElement('div');
    ghost.className = 'vr-chip answer-chip vr-drag-ghost';
    ghost.textContent = word;
    ghost.style.display = 'none';
    document.body.appendChild(ghost);
    _qsVrDrag.ghost = ghost;
}

function _qsVrDragMove(e) {
    if (!_qsVrDrag.ghost) return;
    const pt = e.touches ? e.touches[0] : e;
    const dx = pt.clientX - _qsVrDrag.startX;
    const dy = pt.clientY - _qsVrDrag.startY;

    if (!_qsVrDrag.active && Math.sqrt(dx*dx + dy*dy) > _QS_VR_DRAG_THRESH) {
        _qsVrDrag.active = true;
        _qsVrDrag.ghost.style.display = '';
        if (_qsVrDrag.originEl) _qsVrDrag.originEl.classList.add('is-dragging');
        _qsVrUpdateInsertIndicator(pt.clientX, pt.clientY);
    }
    if (_qsVrDrag.active) {
        e.preventDefault();
        _qsVrDrag.ghost.style.left = (pt.clientX - _qsVrDrag.ghost.offsetWidth  / 2) + 'px';
        _qsVrDrag.ghost.style.top  = (pt.clientY - _qsVrDrag.ghost.offsetHeight / 2) + 'px';
        _qsVrUpdateInsertIndicator(pt.clientX, pt.clientY);
    }
}

function _qsVrDragEnd(e) {
    if (!_qsVrDrag.ghost) return;
    const pt = e.changedTouches ? e.changedTouches[0] : e;
    let _dragPlacedIdx = null;

    if (_qsVrDrag.active) {
        const insertPos = _qsVrGetInsertPosition(pt.clientX, pt.clientY);
        _qsVrRemoveInsertIndicator();
        _qsVrDrag.ghost.remove();
        _qsVrDrag.ghost = null;

        if (insertPos !== null) {
            if (_qsVrDrag.source === 'answer') {
                _qsVrState.answer.splice(_qsVrDrag.answerPos, 1);
                const finalPos = insertPos > _qsVrDrag.answerPos ? insertPos - 1 : insertPos;
                _qsVrState.answer.splice(finalPos, 0, _qsVrDrag.poolIdx);
            } else {
                _qsVrState.poolOrder = _qsVrState.poolOrder.filter(i => i !== _qsVrDrag.poolIdx);
                _qsVrState.answer.splice(insertPos, 0, _qsVrDrag.poolIdx);
                _dragPlacedIdx = _qsVrDrag.poolIdx;
                _qsVrSpeakWord(_qsVrDrag.word);
            }
        } else if (_qsVrDrag.source === 'answer') {
            const wordIdx = _qsVrState.answer.splice(_qsVrDrag.answerPos, 1)[0];
            _qsVrState.poolOrder.push(wordIdx);
        }
        _qsVrDrag.active = false;
    } else {
        _qsVrDrag.ghost.remove();
        _qsVrDrag.ghost = null;
        _qsVrDrag.active = false;

        if (_qsVrDrag.source === 'pool') {
            const idx = _qsVrDrag.poolIdx;
            if (_qsVrState.answer.includes(idx)) { _qsVrResetDrag(); return; }
            _qsVrState.answer.push(idx);
            _qsVrState.poolOrder = _qsVrState.poolOrder.filter(i => i !== idx);
            _qsVrSpeakWord(_qsVrDrag.word);
            _qsVrShowFeedback('', '');
            const heardEl = _qsVrEl('qs-vr-heard-text');
            if (heardEl) heardEl.textContent = '';
            _qsVrRenderAnswerZone(idx);
            _qsVrRenderPool();
            if (_qsVrState.answer.length === _qsVrState.words.length && !_qsVrState.done) {
                _qsVrOnAllPlaced();
            }
            _qsVrResetDrag();
            return;
        } else {
            const wordIdx = _qsVrState.answer.splice(_qsVrDrag.answerPos, 1)[0];
            _qsVrState.poolOrder.push(wordIdx);
        }
    }

    _qsVrShowFeedback('', '');
    const heardEl = _qsVrEl('qs-vr-heard-text');
    if (heardEl) heardEl.textContent = '';
    _qsVrRenderAnswerZone(_dragPlacedIdx ?? undefined);
    _qsVrRenderPool();

    if (_qsVrState.answer.length === _qsVrState.words.length && !_qsVrState.done) {
        _qsVrOnAllPlaced();
    }
    _qsVrResetDrag();
}

function _qsVrResetDrag() {
    _qsVrDrag = { active:false, ghost:null, source:null, poolIdx:null, answerPos:null, word:null, startX:0, startY:0, originEl:null };
}

// ── 插入位置計算（多行支援）──────────────────────────────────
function _qsVrGetInsertPosition(clientX, clientY) {
    const zone = _qsVrEl('qs-vr-answer-zone');
    if (!zone) return null;
    const rect = zone.getBoundingClientRect();
    if (clientX < rect.left - 40 || clientX > rect.right  + 40 ||
        clientY < rect.top  - 40 || clientY > rect.bottom + 40) return null;

    const chips = [...zone.querySelectorAll('.answer-chip')];
    if (chips.length === 0) return 0;

    const rows = [];
    let curRow = [], curTop = null;
    for (const chip of chips) {
        const r = chip.getBoundingClientRect();
        const midY = r.top + r.height / 2;
        if (curTop === null || Math.abs(midY - curTop) <= 10) {
            curRow.push({ el: chip, rect: r });
            if (curTop === null) curTop = midY;
        } else {
            rows.push(curRow);
            curRow = [{ el: chip, rect: r }];
            curTop = midY;
        }
    }
    if (curRow.length) rows.push(curRow);

    let bestRow = rows[0], bestDist = Infinity;
    for (const row of rows) {
        const top = row[0].rect.top, bot = row[0].rect.bottom;
        const dist = clientY < top ? top - clientY : clientY > bot ? clientY - bot : 0;
        if (dist < bestDist) { bestDist = dist; bestRow = row; }
    }
    for (let k = 0; k < bestRow.length; k++) {
        const r = bestRow[k].rect;
        if (clientX < r.left + r.width / 2) return chips.indexOf(bestRow[k].el);
    }
    return chips.indexOf(bestRow[bestRow.length - 1].el) + 1;
}

let _qsVrInsertIndicatorEl = null;

function _qsVrUpdateInsertIndicator(clientX, clientY) {
    const zone = _qsVrEl('qs-vr-answer-zone');
    if (!zone) return;
    const pos = _qsVrGetInsertPosition(clientX, clientY);
    if (pos === null) { _qsVrRemoveInsertIndicator(); zone.classList.remove('drag-over'); return; }
    zone.classList.add('drag-over');

    if (!_qsVrInsertIndicatorEl) {
        _qsVrInsertIndicatorEl = document.createElement('div');
        _qsVrInsertIndicatorEl.className = 'vr-insert-indicator';
    }
    const chips = [...zone.querySelectorAll('.answer-chip')];
    if (chips.length === 0 || pos >= chips.length) {
        zone.appendChild(_qsVrInsertIndicatorEl);
    } else {
        zone.insertBefore(_qsVrInsertIndicatorEl, chips[pos]);
    }
    _qsVrClearNeighborHighlight();
    const left  = chips[pos - 1] ?? null;
    const right = chips[pos]     ?? null;
    if (left)  left.classList.add('is-neighbor-left');
    if (right) right.classList.add('is-neighbor-right');
}

function _qsVrClearNeighborHighlight() {
    const zone = _qsVrEl('qs-vr-answer-zone');
    if (!zone) return;
    zone.querySelectorAll('.is-neighbor-left,.is-neighbor-right').forEach(el => {
        el.classList.remove('is-neighbor-left', 'is-neighbor-right');
    });
}

function _qsVrRemoveInsertIndicator() {
    const zone = _qsVrEl('qs-vr-answer-zone');
    if (zone) zone.classList.remove('drag-over');
    if (_qsVrInsertIndicatorEl?.parentNode) _qsVrInsertIndicatorEl.parentNode.removeChild(_qsVrInsertIndicatorEl);
    _qsVrInsertIndicatorEl = null;
    _qsVrClearNeighborHighlight();
}

// 全域 pointer/touch 事件
document.addEventListener('pointermove', (e) => { if (_qsVrDrag.ghost) _qsVrDragMove(e); }, { passive: false });
document.addEventListener('pointerup',   (e) => { if (_qsVrDrag.ghost) _qsVrDragEnd(e); });
document.addEventListener('touchmove',   (e) => { if (_qsVrDrag.ghost && _qsVrDrag.active) e.preventDefault(); }, { passive: false });

// ════════════════════════════════════════════════════════════
//  RENDER
// ════════════════════════════════════════════════════════════
function _qsVrRenderAnswerZone(latestIdx) {
    const zone = _qsVrEl('qs-vr-answer-zone');
    if (!zone) return;
    zone.innerHTML = '';

    if (_qsVrState.answer.length === 0) {
        const hint = document.createElement('span');
        hint.className = 'vr-answer-empty';
        hint.textContent = 'Drag or tap words below to build the sentence…';
        zone.appendChild(hint);
        return;
    }

    const latestPos = (latestIdx !== undefined && latestIdx !== null)
        ? _qsVrState.answer.indexOf(latestIdx) : -1;

    _qsVrState.answer.forEach((wordIdx, pos) => {
        const chip = document.createElement('span');
        let cls = 'vr-chip answer-chip';
        if (wordIdx === latestIdx)         cls += ' just-arrived';
        else if (latestPos >= 0 && pos === latestPos - 1) cls += ' vr-neighbor-left';
        else if (latestPos >= 0 && pos === latestPos + 1) cls += ' vr-neighbor-right';
        chip.className = cls;
        chip.textContent = _qsVrState.words[wordIdx];
        chip.style.touchAction = 'none';

        if (cls.includes('vr-neighbor-')) {
            chip.addEventListener('animationend', () => {
                chip.classList.remove('vr-neighbor-left', 'vr-neighbor-right');
            }, { once: true });
        }

        chip.addEventListener('pointerdown', (e) => {
            if (_qsVrState.done) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            _qsVrDragStart(e, 'answer', wordIdx, pos, _qsVrState.words[wordIdx]);
        });
        zone.appendChild(chip);
    });
}

function _qsVrRenderPool() {
    const pool = _qsVrEl('qs-vr-word-pool');
    if (!pool) return;
    pool.innerHTML = '';

    if (_qsVrState.poolOrder.length === 0) {
        pool.innerHTML = '<div style="padding:8px;color:var(--color-text-light);text-align:center;font-size:0.85em;">All words placed ✓</div>';
        return;
    }
    _qsVrState.poolOrder.forEach(idx => {
        const chip = document.createElement('span');
        chip.className = 'vr-chip pool-chip';
        chip.textContent = _qsVrState.words[idx];
        chip.dataset.wordIdx = idx;
        chip.style.touchAction = 'none';
        chip.addEventListener('pointerdown', (e) => {
            if (_qsVrState.done) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            _qsVrDragStart(e, 'pool', idx, null, _qsVrState.words[idx]);
        });
        pool.appendChild(chip);
    });
}

// ════════════════════════════════════════════════════════════
//  PLACE / UNDO / ALL-PLACED
// ════════════════════════════════════════════════════════════
function _qsVrPlaceWord(wordIdx) {
    if (_qsVrState.done) return;
    if (_qsVrState.answer.includes(wordIdx)) return;
    _qsVrState.answer.push(wordIdx);
    _qsVrState.poolOrder = _qsVrState.poolOrder.filter(i => i !== wordIdx);
    _qsVrShowFeedback('', '');
    const heardEl = _qsVrEl('qs-vr-heard-text');
    if (heardEl) heardEl.textContent = '';
    _qsVrRenderAnswerZone(wordIdx);
    _qsVrRenderPool();
    _qsVrSpeakWord(_qsVrState.words[wordIdx]);
    if (_qsVrState.answer.length === _qsVrState.words.length) {
        _qsVrOnAllPlaced();
    }
}

function _qsVrUndoLast() {
    if (_qsVrState.done || _qsVrState.answer.length === 0) return;
    const last = _qsVrState.answer.pop();
    _qsVrState.poolOrder.push(last);
    _qsVrShowFeedback('', '');
    const heardEl = _qsVrEl('qs-vr-heard-text');
    if (heardEl) heardEl.textContent = '';
    _qsVrRenderAnswerZone();
    _qsVrRenderPool();
}

function _qsVrOnAllPlaced() {
    _qsVrStopRecordingSilent();
    const micLbl = _qsVrEl('qs-vr-mic-label');
    if (micLbl) micLbl.textContent = 'All words placed — tap Check!';
    _qsVrPlayReadySound();
}

// ════════════════════════════════════════════════════════════
//  CHECK ANSWER
// ════════════════════════════════════════════════════════════
function _qsVrCheckAnswer() {
    if (_qsVrState.done) {
        // 進下一題
        _qsVrState.qIndex++;
        if (_qsVrState.qIndex >= _qsVrState.total) {
            _qsVrFinish();
        } else {
            _qsVrUpdateProgress();
            _qsVrLoadQuestion();
        }
        return;
    }

    _qsVrState.done = true;
    _qsVrStopRecordingSilent();

    const userText    = _qsVrState.answer.map(i => _qsVrState.words[i]).join(' ');
    const correctText = _qsVrState.words.join(' ');
    const isCorrect   = !_qsVrState.skipped && userText.toLowerCase() === correctText.toLowerCase();

    if (isCorrect) {
        _qsVrState.correct++;
        const zone = _qsVrEl('qs-vr-answer-zone');
        if (zone) zone.classList.add('vr-correct-flash');
        _qsVrShowFeedback('ok', '✓ Perfect!');
        playCorrectSound();

        // 從錯誤清單移除
        const item = _qsVrState.sentences[_qsVrState.qIndex];
        if (item) {
            incorrectSentences = incorrectSentences.filter(w => w !== item.wordsKey);
            localStorage.setItem('wrongQS', JSON.stringify(incorrectSentences));
        }
    } else {
        _qsVrShowFeedback('wrong', `✗ Answer: ${correctText}`);
        playWrongSound();

        // 記錄錯誤
        const item = _qsVrState.sentences[_qsVrState.qIndex];
        if (item) {
            _qsVrState.wrongItems.push({
                wordsKey:  item.wordsKey,
                text:      correctText,
                userText:  userText,
                audioUrl:  item.audioUrl,
                chineseHint: item.chineseHint,
            });
            if (!incorrectSentences.includes(item.wordsKey)) {
                incorrectSentences.push(item.wordsKey);
            }
            localStorage.setItem('wrongQS', JSON.stringify(incorrectSentences));
        }
    }

    const checkBtn = _qsVrEl('qs-vr-check-btn');
    if (checkBtn) checkBtn.textContent = 'Next →';
    const micLbl = _qsVrEl('qs-vr-mic-label');
    if (micLbl) micLbl.textContent = 'Tap Next for the next sentence.';
}

// ════════════════════════════════════════════════════════════
//  FINISH → 共用 quizResult
// ════════════════════════════════════════════════════════════
function _qsVrFinish() {
    _qsVrStopRecordingSilent();
    if (_qsVrAudio) { _qsVrAudio.pause(); _qsVrAudio = null; }

    const correct = _qsVrState.correct;
    const total   = _qsVrState.total;
    const wrong   = total - correct;

    // 隱藏 voiceReorderArea，顯示 quizResult
    const vrArea = _qsVrEl('voiceReorderArea');
    if (vrArea) vrArea.style.display = 'none';

    const resultEl = _qsVrEl('quizResult');
    if (!resultEl) return;
    resultEl.style.display = 'block';

    // 建立結果 HTML（對齊 finishReorganizeQuiz 格式）
    let html = `<h2>🎙 Voice Reorder 結果</h2>`;
    html += `<div style="text-align:center;font-size:1.2rem;margin-bottom:1rem;">
        得分：<strong>${correct} / ${total}</strong> 
        （${Math.round(correct/total*100)}%）
    </div>`;

    for (let i = 0; i < _qsVrState.sentences.length; i++) {
        const item = _qsVrState.sentences[i];
        // 查找是否答錯
        const wrongEntry = _qsVrState.wrongItems.find(w => w.text === item.text);
        const isCorrect   = !wrongEntry;
        const userAnswer  = wrongEntry ? wrongEntry.userText : item.text;

        // 逐字對比高亮
        const correctWords = item.text.split(' ');
        const userWords    = userAnswer.split(' ');
        const highlightedCorrect = correctWords.map((word, wi) => {
            const match = userWords[wi] && userWords[wi].toLowerCase() === word.toLowerCase();
            return match ? word : `<span style="color:red;font-weight:bold;">${word}</span>`;
        }).join(' ');

        const resultClass = isCorrect ? 'correct' : 'wrong';
        const importantChecked = localStorage.getItem('important_sentence_' + item.wordsKey) === 'true';
        const importantCheckbox = item.wordsKey
            ? `<input type="checkbox" class="important-checkbox" onchange="toggleImportantSentence('${item.wordsKey}', this)" ${importantChecked ? 'checked' : ''} />`
            : '';
        const sentenceLink = item.wordsKey
            ? `<a href="sentence.html?sentence=${encodeURIComponent(item.wordsKey)}&from=quiz&layer=4" class="sentence-link-btn">${item.wordsKey}</a>`
            : '';
        const audioBtn = item.audioUrl
            ? `<button class="control-button audio" style="padding:4px 10px;font-size:0.8rem;" onclick="_qsVrPlayResultAudio('${item.audioUrl}')"><span>🔊</span></button>`
            : '';

        const ratingHTML = typeof generateRatingHTML === 'function' && item.wordsKey
            ? generateRatingHTML('sentence', item.wordsKey, isCorrect ? 4 : 2)
            : '';

        html += `
            <div class="result-item ${resultClass}">
                ${importantCheckbox}
                <div class="horizontal-group">
                    ${sentenceLink}
                    ${audioBtn}
                </div>
                <div class="vertical-group">
                    <div><strong>正確答案:</strong> ${highlightedCorrect}</div>
                    <div><strong>您的答案:</strong> ${userAnswer || '(未作答)'}</div>
                    ${item.chineseHint ? `<div style="color:var(--color-text-secondary);font-size:0.88rem;">${item.chineseHint}</div>` : ''}
                </div>
                ${ratingHTML}
            </div>
        `;
    }

    html += `
        <div class="result-buttons">
            <button class="action-button" onclick="saveQSResults()">Save</button>
            <button class="action-button" onclick="openSentenceRatingManager ? openSentenceRatingManager() : null">查看評分記錄</button>
            <button class="action-button" onclick="_qsVrRetryWrong()">練習錯題</button>
            <button class="action-button" onclick="returnToMainMenu()">Back</button>
        </div>
    `;

    resultEl.innerHTML = html;
    localStorage.setItem('currentQuizSentences', JSON.stringify(_qsVrState.sentences.map(s => ({ Words: s.wordsKey, 句子: s.text, 中文: s.chineseHint }))));
}

// 結果頁播放音訊
function _qsVrPlayResultAudio(url) {
    if (!url) return;
    const audio = new Audio(url);
    audio.play().catch(() => {});
}

// 練習錯題
function _qsVrRetryWrong() {
    if (_qsVrState.wrongItems.length === 0) {
        alert('🎉 沒有錯誤的題目！');
        return;
    }

    _qsVrState.sentences = _qsVrShuffle([..._qsVrState.wrongItems]).map(w => ({
        text:        w.text,
        wordsKey:    w.wordsKey,
        chineseHint: w.chineseHint || '',
        audioUrl:    w.audioUrl   || '',
    }));
    _qsVrState.qIndex    = 0;
    _qsVrState.correct   = 0;
    _qsVrState.total     = _qsVrState.sentences.length;
    _qsVrState.wrongItems = [];

    const resultEl = _qsVrEl('quizResult');
    if (resultEl) resultEl.style.display = 'none';

    const area = _qsVrEl('voiceReorderArea');
    if (area) area.style.display = 'block';

    _qsVrUpdateProgress();
    _qsVrUpdateStrictBtn();
    _qsVrLoadQuestion();
}

// ════════════════════════════════════════════════════════════
//  SPEECH RECOGNITION
// ════════════════════════════════════════════════════════════
function _qsVrStartRecording() {
    if (!_QsVrSpeechRec) {
        alert('⚠️ 您的瀏覽器不支援語音辨識，請使用 Chrome。\n您仍可用拖曳/點擊方式排列單字。');
        return;
    }
    if (_qsVrRecognition) {
        try { _qsVrRecognition.stop(); } catch(e) {}
        _qsVrRecognition = null;
    }
    _qsVrBestTranscript = '';

    _qsVrRecognition = new _QsVrSpeechRec();
    _qsVrRecognition.lang            = 'en-US';
    _qsVrRecognition.continuous      = true;
    _qsVrRecognition.interimResults  = true;
    _qsVrRecognition.maxAlternatives = 1;

    _qsVrRecognition.onresult = (e) => {
        let current = '';
        for (let i = 0; i < e.results.length; i++) {
            current += ' ' + e.results[i][0].transcript;
        }
        current = current.trim();
        const curWords  = current.split(/\s+/).filter(Boolean).length;
        const bestWords = _qsVrBestTranscript.split(/\s+/).filter(Boolean).length;
        if (curWords >= bestWords) _qsVrBestTranscript = current;

        const heardEl = _qsVrEl('qs-vr-heard-text');
        if (heardEl && _qsVrBestTranscript) {
            heardEl.textContent = `Heard: "${_qsVrBestTranscript}"…`;
        }
    };

    _qsVrRecognition.onerror = (e) => {
        if (e.error === 'no-speech') return;
        _qsVrStopRecordingSilent();
        if (e.error === 'not-allowed') alert('麥克風權限被拒絕，請在瀏覽器設定中允許使用麥克風。');
    };

    _qsVrRecognition.onend = () => {
        if (_qsVrIsRecording && !_qsVrState.done) {
            try { _qsVrRecognition.start(); } catch(e) { _qsVrSetMicOff(); }
        }
    };

    try {
        _qsVrRecognition.start();
        _qsVrIsRecording = true;
        const micBtn = _qsVrEl('qs-vr-mic-btn');
        if (micBtn) micBtn.classList.add('is-recording');
        const micLbl = _qsVrEl('qs-vr-mic-label');
        if (micLbl) micLbl.textContent = '🔴 Recording… tap to stop';
    } catch(e) {
        alert('無法啟動麥克風，請再試一次。');
    }
}

function _qsVrStopRecordingSilent() {
    _qsVrIsRecording = false;
    if (_qsVrRecognition) {
        try { _qsVrRecognition.stop(); } catch(e) {}
        _qsVrRecognition = null;
    }
    _qsVrBestTranscript = '';
    _qsVrSetMicOff();
}

function _qsVrStopRecording() {
    _qsVrIsRecording = false;
    if (_qsVrRecognition) {
        try { _qsVrRecognition.stop(); } catch(e) {}
        _qsVrRecognition = null;
    }
    _qsVrSetMicOff();
    const heard = _qsVrBestTranscript.trim();
    const heardEl = _qsVrEl('qs-vr-heard-text');
    if (heard) {
        if (heardEl) heardEl.textContent = `Heard: "${heard}"`;
        _qsVrProcessSpeech(heard);
    }
    _qsVrBestTranscript = '';
}

function _qsVrSetMicOff() {
    const btn = _qsVrEl('qs-vr-mic-btn');
    if (btn) btn.classList.remove('is-recording');
    const lbl = _qsVrEl('qs-vr-mic-label');
    if (lbl && !_qsVrState.done) lbl.textContent = 'Tap mic & say the whole sentence';
}

// ── 語音比對與放字 ────────────────────────────────────────────
function _qsVrProcessSpeech(heard) {
    if (_qsVrState.done) return;

    const heardTokens = heard.toLowerCase()
        .replace(/[.,?!'"'"";\:]/g, '')
        .split(/\s+/)
        .filter(Boolean);

    if (heardTokens.length === 0) {
        _qsVrShowFeedback('warn', 'No speech detected — tap mic and try again.');
        return;
    }

    function _approxEq(a, b) {
        const na = _qsVrNormalizeNum(a), nb = _qsVrNormalizeNum(b);
        if (na === nb) return true;
        if (_qsVrStrictMode) return false;
        const thresh = nb.length <= 3 ? 1 : nb.length <= 6 ? 2 : 3;
        return _qsVrLevenshtein(na, nb) <= thresh;
    }

    const workingPool = [..._qsVrState.poolOrder];
    const toPlace = [];

    let t = 0;
    while (t < heardTokens.length) {
        const token = _qsVrClean(heardTokens[t]);
        let foundAt = -1;

        for (let k = 0; k < workingPool.length; k++) {
            const poolWord = _qsVrClean(_qsVrState.words[workingPool[k]]);
            if (_approxEq(token, poolWord)) { foundAt = k; break; }
        }

        if (foundAt !== -1) {
            toPlace.push(workingPool[foundAt]);
            workingPool.splice(foundAt, 1);
            t++;
            continue;
        }

        // 嘗試合併相鄰 token（匹配連字符單字）
        let merged = token, consumed = 1, mergedFound = false;
        for (let extra = t + 1; extra < Math.min(t + 4, heardTokens.length); extra++) {
            merged += _qsVrClean(heardTokens[extra]);
            consumed++;
            for (let k = 0; k < workingPool.length; k++) {
                const poolWord = _qsVrClean(_qsVrState.words[workingPool[k]]);
                if (_approxEq(merged, poolWord)) {
                    toPlace.push(workingPool[k]);
                    workingPool.splice(k, 1);
                    t += consumed;
                    mergedFound = true;
                    break;
                }
            }
            if (mergedFound) break;
        }
        if (!mergedFound) t++;
    }

    if (toPlace.length === 0) {
        _qsVrShowFeedback('warn', "Couldn't match any words — try speaking more clearly.");
        return;
    }

    toPlace.forEach(wordIdx => {
        _qsVrState.answer.push(wordIdx);
        _qsVrState.poolOrder = _qsVrState.poolOrder.filter(x => x !== wordIdx);
    });

    _qsVrRenderAnswerZone(toPlace[toPlace.length - 1]);
    _qsVrRenderPool();

    if (_qsVrState.answer.length === _qsVrState.words.length) {
        _qsVrShowFeedback('', '');
        _qsVrOnAllPlaced();
    } else {
        const remaining = _qsVrState.words.length - _qsVrState.answer.length;
        _qsVrShowFeedback('warn',
            `${toPlace.length} word${toPlace.length > 1 ? 's' : ''} placed — ${remaining} more to go.`
        );
    }
}

// _qsVrNormalizeNum is defined at the top of this module

// ── Feedback ──────────────────────────────────────────────────
function _qsVrShowFeedback(type, msg) {
    const el = _qsVrEl('qs-vr-feedback');
    if (!el) return;
    if (!msg) { el.className = 'vr-feedback'; el.textContent = ''; return; }
    const cls = type === 'ok' ? 'correct' : type === 'wrong' ? 'wrong' : type === 'warn' ? 'loading-hint' : '';
    el.className = `vr-feedback is-visible ${cls}`;
    el.textContent = msg;
}

// ── Progress ──────────────────────────────────────────────────
function _qsVrUpdateProgress() {
    const done  = _qsVrState.qIndex;
    const total = _qsVrState.total;
    const pct   = total > 0 ? Math.round(((done + 1) / total) * 100) : 0;
    const fillEl = _qsVrEl('qs-vr-progress-fill');
    const textEl = _qsVrEl('qs-vr-progress-text');
    if (fillEl) fillEl.style.width = pct + '%';
    if (textEl) textEl.textContent = `${done + 1} / ${total}`;
}

// ── Strict / Fuzzy toggle ────────────────────────────────────
function _qsVrUpdateStrictBtn() {
    const btn    = _qsVrEl('qs-vr-strict-toggle');
    const lblEl  = _qsVrEl('qs-vr-strict-label');
    if (!btn) return;
    if (_qsVrStrictMode) {
        btn.classList.add('is-strict');
        btn.querySelector('span').textContent = '🎯';
        if (lblEl) lblEl.textContent = 'Strict';
    } else {
        btn.classList.remove('is-strict');
        btn.querySelector('span').textContent = '🌊';
        if (lblEl) lblEl.textContent = 'Fuzzy';
    }
}

// ── Utility ──────────────────────────────────────────────────
function _qsVrShuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// ════════════════════════════════════════════════════════════
//  EVENT LISTENERS（DOMContentLoaded 後綁定）
// ════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {

    // 啟動按鈕
    const startBtn = document.getElementById('startVoiceReorderBtn');
    if (startBtn) startBtn.addEventListener('click', startVoiceReorderQuiz);

    // Replay
    const replayBtn = _qsVrEl('qs-vr-replay-btn');
    if (replayBtn) replayBtn.addEventListener('click', () => _qsVrPlaySentence(false));

    // Mic toggle
    const micBtn = _qsVrEl('qs-vr-mic-btn');
    if (micBtn) micBtn.addEventListener('click', () => {
        if (_qsVrState.done) return;
        if (_qsVrIsRecording) {
            _qsVrStopRecording();
        } else {
            // 重說：清空答案區
            if (_qsVrState.answer.length > 0) {
                while (_qsVrState.answer.length > 0) {
                    _qsVrState.poolOrder.push(_qsVrState.answer.pop());
                }
                const heardEl = _qsVrEl('qs-vr-heard-text');
                if (heardEl) heardEl.textContent = '';
                _qsVrShowFeedback('', '');
                _qsVrRenderAnswerZone();
                _qsVrRenderPool();
            }
            _qsVrStartRecording();
        }
    });

    // Undo
    const undoBtn = _qsVrEl('qs-vr-undo-btn');
    if (undoBtn) undoBtn.addEventListener('click', _qsVrUndoLast);

    // Clear all
    const clearBtn = _qsVrEl('qs-vr-clear-btn');
    if (clearBtn) clearBtn.addEventListener('click', () => {
        if (_qsVrState.done) return;
        while (_qsVrState.answer.length > 0) {
            _qsVrState.poolOrder.push(_qsVrState.answer.pop());
        }
        _qsVrShowFeedback('', '');
        const heardEl = _qsVrEl('qs-vr-heard-text');
        if (heardEl) heardEl.textContent = '';
        _qsVrRenderAnswerZone();
        _qsVrRenderPool();
    });

    // Check / Next
    const checkBtn = _qsVrEl('qs-vr-check-btn');
    if (checkBtn) checkBtn.addEventListener('click', _qsVrCheckAnswer);

    // Strict toggle
    const strictBtn = _qsVrEl('qs-vr-strict-toggle');
    if (strictBtn) strictBtn.addEventListener('click', () => {
        _qsVrStrictMode = !_qsVrStrictMode;
        _qsVrUpdateStrictBtn();
    });

    // 鍵盤快捷鍵（只在 voiceReorderArea 可見時有效）
    document.addEventListener('keydown', (e) => {
        const vrArea = document.getElementById('voiceReorderArea');
        if (!vrArea || vrArea.style.display === 'none') return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        if (e.code === 'Space') {
            e.preventDefault();
            if (replayBtn && !replayBtn.disabled) replayBtn.click();
        } else if (e.code === 'Enter') {
            e.preventDefault();
            if (checkBtn && checkBtn.style.display !== 'none') checkBtn.click();
        } else if (e.code === 'KeyM') {
            e.preventDefault();
            if (micBtn && !_qsVrState.done) micBtn.click();
        } else if (e.code === 'KeyZ') {
            e.preventDefault();
            if (!_qsVrState.done) _qsVrUndoLast();
        } else if (e.code === 'KeyX') {
            e.preventDefault();
            if (clearBtn && !_qsVrState.done) clearBtn.click();
        } else if (e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) {
            e.preventDefault();
        }
    });
});

console.log('✅ Voice Reorder module (q_sentence.js) loaded.');
