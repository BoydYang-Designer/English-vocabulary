console.log("✅ q_sentence.js loaded (FIXED VERSION)");

// All variable definitions remain at the top level
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
    } else if (isCorrect) {
        incorrectSentences = incorrectSentences.filter(w => w !== sentenceObj.Words);
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
    } else if (isCorrect) {
        incorrectSentences = incorrectSentences.filter(w => w !== sentenceObj.Words);
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
