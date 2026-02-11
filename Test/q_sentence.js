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

    fetch(GITHUB_JSON_URL)
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log("✅ 成功載入 sentence.json");
        if (!data["New Words"] || !Array.isArray(data["New Words"])) {
            console.error("❌ 資料格式錯誤，'New Words' 不是一個數組。");
            return;
        }

        sentenceData = data["New Words"].filter(item => item.句子 && item.中文);
        
        // 🔧 改進的分類處理
        sentenceData.forEach(item => {
            if (typeof item["分類"] === "string") {
                item["分類"] = [item["分類"]];
            } else if (!Array.isArray(item["分類"])) {
                item["分類"] = [];
            }
            
            // 保存完整的主分類名稱（包含英文和中文）- 用於顯示
            item.primaryCategoryFull = item["分類"][0] || "未分類";
            // 提取中文名稱用於匹配
            item.primaryCategory = extractChineseName(item.primaryCategoryFull);
            // 提取英文名稱
            item.primaryCategoryEn = extractEnglishName(item.primaryCategoryFull);
            // 次分類
            item.secondaryCategories = item["分類"].slice(1);
        });

        localStorage.setItem("sentenceData", JSON.stringify(sentenceData));
        console.log(`✅ 已載入 ${sentenceData.length} 個句子`);
        generateSentenceCategories(sentenceData);
    })
    .catch(error => {
    console.error("❌ 無法載入 sentence.json:", error);
    // 靜默處理：不顯示 alert，直接使用備援資料
    
    // 先嘗試從 localStorage 載入之前儲存的資料
    const savedData = localStorage.getItem("sentenceData");
    if (savedData) {
        try {
            sentenceData = JSON.parse(savedData);
            console.log("✅ 使用本地儲存的句子資料");
            generateSentenceCategories(sentenceData);
            return;
        } catch (e) {
            console.error("❌ 本地資料解析失敗:", e);
        }
    }
    
    // 如果 localStorage 也沒有，使用記憶體中的資料（如果有的話）
    if (sentenceData.length > 0) {
        console.log("✅ 使用記憶體中的句子資料");
        generateSentenceCategories(sentenceData);
    } else {
        alert("❌ 無法載入句子資料，請檢查網路連線。");
    }
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

    let subcategoryWrapperId = `sub-for-sentence-${categoryName.replace(/\s/g, '-')}`;
    let subcategoryWrapper = document.getElementById(subcategoryWrapperId);

    if (!subcategoryWrapper) {
        // 如果次分類容器不存在，則創建它
        subcategoryWrapper = document.createElement('div');
        subcategoryWrapper.className = 'subcategory-wrapper'; 
        subcategoryWrapper.id = subcategoryWrapperId;

        const secondaryCategories = [...new Set(
            sentenceData
                .filter(s => s.primaryCategory === categoryName && s.secondaryCategories && s.secondaryCategories.length > 0)
                .flatMap(s => s.secondaryCategories)
        )];

        const hasUncategorized = sentenceData.some(s =>
            s.primaryCategory === categoryName && (!s.secondaryCategories || s.secondaryCategories.length === 0)
        );

        if (hasUncategorized) {
            secondaryCategories.unshift("未分類");
        }

        if (secondaryCategories.length > 0) {
            // 生成次分類按鈕
            subcategoryWrapper.innerHTML = secondaryCategories.map(subCat =>
                `<button class="category-button" onclick="handleSentenceSubcategoryClick(this, '${btn.id}')">${subCat}</button>`
            ).join('');
        }
        
        btn.parentNode.insertBefore(subcategoryWrapper, btn.nextSibling);
    }

    // 將主分類加入篩選條件
    toggleSentenceSelection('primaryCategories', categoryName, btn);

    // 展開/收合次分類列表
    const isExpanded = subcategoryWrapper.style.maxHeight && subcategoryWrapper.style.maxHeight !== '0px';
    if (isExpanded) {
        // 如果已展開，則收合
        subcategoryWrapper.style.maxHeight = '0px';
    } else {
        // 如果已收合，則展開
        subcategoryWrapper.style.maxHeight = subcategoryWrapper.scrollHeight + "px";
    }

    // 🔧 修復：延遲更新父容器高度
    setTimeout(() => {
        const mainFilterContent = btn.closest('.filter-content');
        if (mainFilterContent && mainFilterContent.style.maxHeight !== '0px') {
            // 先移除限制以獲取真實高度
            mainFilterContent.style.maxHeight = 'none';
            const realHeight = mainFilterContent.scrollHeight;
            mainFilterContent.style.maxHeight = realHeight + 'px';
        }
    }, 350); // 等待次分類動畫完成
}

function generateSentenceCategories(data) {
    const alphabetContainer = document.getElementById("sentenceAlphabetButtons");
    const primaryContainer = document.getElementById("sentencePrimaryCategoryButtons");
    const secondaryContainer = document.getElementById("sentenceSecondaryCategoryButtons");
    const specialContainer = document.getElementById("sentenceSpecialCategoryButtons");
    const levelContainer = document.getElementById("sentenceLevelButtons");

    if (!alphabetContainer || !primaryContainer || !specialContainer || !levelContainer) {
        console.error("❌ 句子測驗的分類容器未全部找到，請檢查 quiz.html 的 ID。");
        return;
    }

    const levels = new Set();
    const primaryCategoriesMap = new Map(); // 使用 Map 儲存 中文名稱 -> 完整名稱 的映射
    const alphabetSet = new Set();

    data.forEach(item => {
        levels.add(item.等級 || "未分類");
        const firstLetter = item.句子.charAt(0).toUpperCase();
        if (/[A-Z]/.test(firstLetter)) {
            alphabetSet.add(firstLetter);
        }
        if (item.primaryCategory && item.primaryCategoryFull) {
            // 使用中文名稱作為 key,完整名稱作為 value
            primaryCategoriesMap.set(item.primaryCategory, item.primaryCategoryFull);
        }
    });

    const allLevels = new Set(Array.from(levels));
    const standardLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', '未分類'].filter(l => allLevels.has(l));

    alphabetContainer.innerHTML = [...alphabetSet].sort().map(letter => 
        `<button class="category-button" onclick="toggleSentenceSelection('alphabet', '${letter}', this)">${letter}</button>`
    ).join("");

    // 🔧 渲染主分類按鈕，顯示完整名稱（英文+中文），但用中文名稱作為 key
    primaryContainer.innerHTML = [...primaryCategoriesMap.entries()]
        .sort((a, b) => a[1].localeCompare(b[1])) // 按完整名稱排序
        .map(([chineseName, fullName]) => {
            const btnId = `sentence-primary-btn-${chineseName.replace(/\s/g, '-')}`;
            // 顯示完整名稱，但 onclick 傳遞中文名稱用於匹配
            return `<button id="${btnId}" class="category-button" onclick="handleSentencePrimaryCategoryClick(this, '${chineseName}')">${fullName}</button>`;
        }).join("");

    if (secondaryContainer) {
        secondaryContainer.innerHTML = "";
        secondaryContainer.closest('.filter-group').style.display = 'none';
    }
    
    specialContainer.innerHTML = `
        <button class="category-button" onclick="toggleSentenceSelection('special', 'important', this)">⭐ 重要句子</button>
        <button class="category-button" onclick="toggleSentenceSelection('special', 'incorrect', this)">❌ 錯誤句子</button>
        <button class="category-button" onclick="toggleSentenceSelection('special', 'checked', this)">✅ Checked 句子</button>
        <button class="category-button" onclick="toggleSentenceSelection('special', 'word_checked', this)">📝 Checked 單字</button>
    `;

    levelContainer.innerHTML = standardLevels.map(l =>
        `<button class="category-button" onclick="toggleSentenceSelection('levels', '${l}', this)">${l}</button>`
    ).join("");
    
    console.log(`✅ 生成分類按鈕完成: ${primaryCategoriesMap.size} 個主分類, ${standardLevels.length} 個等級`);
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
        
        // 🔧 主分類篩選 - 使用提取的中文名稱
        let primaryCategoryMatch = selectedSentenceFilters.primaryCategories.size === 0 || 
                                  selectedSentenceFilters.primaryCategories.has(item.primaryCategory);
        
        // 次分類篩選
        let secondaryCategoryMatch = selectedSentenceFilters.secondaryCategories.size === 0 ||
            ((item.secondaryCategories && item.secondaryCategories.length > 0) && 
             item.secondaryCategories.some(cat => selectedSentenceFilters.secondaryCategories.has(cat))) ||
            (selectedSentenceFilters.secondaryCategories.has('未分類') && 
             (!item.secondaryCategories || item.secondaryCategories.length === 0));

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
        let levelMatch = selectedSentenceFilters.levels.size === 0 ||
                         selectedSentenceFilters.levels.has(item.等級 || "未分類(等級)");
        let primaryMatch = selectedSentenceFilters.primaryCategories.size === 0 ||
                           selectedSentenceFilters.primaryCategories.has(item.primaryCategory);
        
        let secondaryMatch = selectedSentenceFilters.secondaryCategories.size === 0 ||
            ((item.secondaryCategories && item.secondaryCategories.length > 0) && item.secondaryCategories.some(cat => selectedSentenceFilters.secondaryCategories.has(cat))) ||
            (selectedSentenceFilters.secondaryCategories.has('未分類') && (!item.secondaryCategories || item.secondaryCategories.length === 0));

        let alphabetMatch = selectedSentenceFilters.alphabet.size === 0 ||
                            selectedSentenceFilters.alphabet.has(item.句子.charAt(0).toUpperCase());
        
        let specialMatch = true;
        if (selectedSentenceFilters.special.size > 0) {
             specialMatch = [...selectedSentenceFilters.special].every(filter => {
                 if (filter === 'important') return localStorage.getItem(`important_sentence_${item.Words}`) === "true";
                 if (filter === 'incorrect') return (JSON.parse(localStorage.getItem("wrongQS")) || []).includes(item.Words);
                 if (filter === 'checked') return localStorage.getItem(`checked_sentence_${item.Words}`) === "true";
                 if (filter === 'word_checked') {
                     const baseWord = item.Words.split('-')[0];
                     return localStorage.getItem(`checked_${baseWord}`) === "true";
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
    
    let shuffledBlocks = blocks.map((value, index) => ({ value, index })).sort(() => Math.random() - 0.5);
    
    let blocksContainer = document.getElementById("wordBlocksContainer");
    blocksContainer.innerHTML = shuffledBlocks
        .map(b => `
            <div class="word-block-placeholder" data-index="${b.index}">
                <div class="word-block" data-value="${b.value}" data-index="${b.index}" onclick="selectWordBlock(this)">${b.value}</div>
            </div>
        `)
        .join("");

    let constructionArea = document.getElementById("sentenceConstructionArea");
    constructionArea.innerHTML = "";

    for (let i = 0; i < blocks.length; i++) {
        let placeholder = document.createElement("div");
        placeholder.classList.add("construction-placeholder");
        placeholder.dataset.position = i;
        constructionArea.appendChild(placeholder);
    }

    if (sentenceObj.Words) {
        let audioUrl = GITHUB_MP3_BASE_URL + encodeURIComponent(sentenceObj.Words) + ".mp3";
        if (currentAudio instanceof Audio) {
            currentAudio.pause();
        }
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
            console.log("✅ 音檔播放結束");
        };

        playBtn.classList.add("playing");
        currentAudio.play().catch(error => {
            console.warn("🔊 自動播放失敗:", error);
            playBtn.classList.remove("playing");
        });
    }
}

function selectWordBlock(block) {
    let constructionArea = document.getElementById("sentenceConstructionArea");
    let placeholder = block.parentNode;

    if (placeholder.classList.contains("word-block-placeholder")) {
        let emptyPlaceholder = Array.from(constructionArea.children).find(
            ph => ph.children.length === 0
        );

        if (emptyPlaceholder) {
            emptyPlaceholder.appendChild(block);
            block.classList.add("selected");
        }
    } else {
        let blockIndex = block.dataset.index;
        let originalPlaceholder = document.querySelector(`.word-block-placeholder[data-index="${blockIndex}"]`);
        if (originalPlaceholder) {
            originalPlaceholder.appendChild(block);
            block.classList.remove("selected");
        }
    }
}

function submitReorganizeAnswer() {
    let constructionArea = document.getElementById("sentenceConstructionArea");
    let userAnswer = Array.from(constructionArea.children).map(b => b.children[0] ? b.children[0].dataset.value : "").join(" ");
    let sentenceObj = currentQuizSentences[currentSentenceIndex];
    let correctSentence = sentenceObj.filteredSentence;

    userConstructedSentences[currentSentenceIndex] = userAnswer;

    let normalizedUserAnswer = normalizeText(userAnswer);
    let normalizedCorrectSentence = normalizeText(correctSentence);

    let isCorrect = normalizedUserAnswer === normalizedCorrectSentence;

    if (!isCorrect && !incorrectSentences.includes(sentenceObj.Words)) {
        incorrectSentences.push(sentenceObj.Words);
    } else if (isCorrect) {
        incorrectSentences = incorrectSentences.filter(w => w !== sentenceObj.Words);
    }
    localStorage.setItem("wrongQS", JSON.stringify(incorrectSentences));

    let placeholders = constructionArea.querySelectorAll(".construction-placeholder");
    let correctWords = correctSentence.match(/\p{L}+(?:'\p{L}+)?|'s|\p{L}+(?:-\p{L}+)+/gu) || [];
    placeholders.forEach((placeholder, i) => {
        let block = placeholder.children[0];
        if (block) {
            let correctWord = correctWords[i] || "";
            if (normalizeText(block.dataset.value) === normalizeText(correctWord)) {
                block.classList.add("correct");
                block.classList.remove("incorrect");
            } else {
                block.classList.add("incorrect");
                block.classList.remove("correct");
            }
        } else {
            placeholder.classList.add("unfilled");
        }
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
