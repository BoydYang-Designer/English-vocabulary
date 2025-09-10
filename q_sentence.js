console.log("✅ q_sentence.js 已載入");

const GITHUB_JSON_URL = "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Sentence%20file/sentence.json";
const GITHUB_MP3_BASE_URL = "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Sentence%20file/";

// 初始化變數，但不直接從 localStorage 讀取
let sentenceData = []; // 延遲到 DOMContentLoaded 時載入
let currentSentenceIndex = 0;
let userAnswers = []; // 延遲到 DOMContentLoaded 時載入
let incorrectSentences = []; // 設為空陣列，稍後動態載入
let importantSentences = []; // 延遲到 DOMContentLoaded 時載入
let currentQuizSentences = []; // 新增變數來儲存本次測驗的句子
let userConstructedSentences = [];

let sentenceQuizHistory = {};

let selectedSentenceFilters = {
    levels: new Set(),
    primaryCategories: new Set(),
    secondaryCategories: new Set(),
    alphabet: new Set(),
    special: new Set()
};

function getUserAnswer(index) {
    return userAnswers[index] || "";
}
window.getUserAnswer = getUserAnswer;

document.addEventListener("DOMContentLoaded", function () {
    // 載入句子測驗歷史
    sentenceQuizHistory = JSON.parse(localStorage.getItem('sentenceQuizHistory')) || {};

    sentenceData = JSON.parse(localStorage.getItem("sentenceData")) || [];
    userAnswers = JSON.parse(localStorage.getItem("userAnswers")) || [];
    incorrectSentences = JSON.parse(localStorage.getItem("wrongQS")) || [];
    importantSentences = JSON.parse(localStorage.getItem("importantSentences")) || [];
    currentQuizSentences = JSON.parse(localStorage.getItem("currentQuizSentences")) || [];

    console.log("✅ 頁面載入時恢復的資料：", {
        sentenceDataLength: sentenceData.length,
        userAnswersLength: userAnswers.length,
        incorrectSentences: incorrectSentences,
        importantSentences: importantSentences,
        currentQuizSentencesLength: currentQuizSentences.length
    });
    console.log("📖 已載入句子測驗歷史:", Object.keys(sentenceQuizHistory).length, "筆");

    document.getElementById("startSentenceQuizBtn").addEventListener("click", startSentenceQuiz);
});

// 📌 進入 Q Sentence 測驗分類頁面
function showSentenceQuizCategories() {
    document.querySelector("h1").textContent = "句子測驗區";
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
        console.log("✅ 成功載入 sentence.json", data);
        if (!data["New Words"] || !Array.isArray(data["New Words"])) {
            console.error("❌ 資料格式錯誤，'New Words' 不是一個數組。");
            return;
        }

        sentenceData = data["New Words"].filter(item => item.句子 && item.中文);
        sentenceData.forEach(item => {
            if (typeof item["分類"] === "string") {
                item["分類"] = [item["分類"]];
            } else if (!Array.isArray(item["分類"])) {
                item["分類"] = [];
            }
            item.primaryCategory = item["分類"][0] || "未分類";
            item.secondaryCategories = item["分類"].slice(1);
        });

        localStorage.setItem("sentenceData", JSON.stringify(sentenceData));
        generateSentenceCategories(sentenceData);
    })
    .catch(error => {
    console.error("❌ 無法載入 sentence.json:", error);
    alert("⚠️ 無法載入句子資料，請檢查網路或 URL 是否正確。使用本地儲存的資料（如果可用）。");
    if (sentenceData.length > 0) {
        generateSentenceCategories(sentenceData); // 使用本地 fallback
    } else {
        // 添加臨時樣本資料（使用您提供的 JSON 片段）
        sentenceData = [
            {
                "等級": "B2",
                "Words": "absorb-1",
                "名人": "Barack Obama",
                "句子": "A great leader absorbs criticism, not as a wound, but as a lesson to grow stronger.",
                "中文": "（偉大的領袖吸收批評，不是當作傷害，而是當作讓自己更強大的課程。）",
                "分類": ["藝術與美學", "Design"]
            },
            {
                "等級": "B2",
                "Words": "absorb-10",
                "句子": "The towel absorbed the spilled water quickly",
                "中文": "（毛巾迅速吸收了灑出的水。）",
                "分類": ["藝術與美學", "Design"]
            }
        ];
        console.log("✅ 使用臨時樣本資料載入分類");
        generateSentenceCategories(sentenceData); // 使用樣本資料生成分類
        localStorage.setItem("sentenceData", JSON.stringify(sentenceData)); // 儲存到 localStorage 以便下次使用
    }
});
}

// ▼▼▼ [新增] 處理主分類點擊、動態生成次分類的函式 ▼▼▼
function handleSentencePrimaryCategoryClick(btn, categoryName) {
    toggleSentenceSelection('primaryCategories', categoryName, btn);

    // 尋找或創建次分類容器
    let subcategoryWrapperId = `sub-for-sentence-${categoryName.replace(/\s/g, '-')}`;
    let subcategoryWrapper = document.getElementById(subcategoryWrapperId);

    if (!subcategoryWrapper) {
        subcategoryWrapper = document.createElement('div');
        // 使用與 sentence.css 和 quiz.css 相同的 class 以保持樣式一致
        subcategoryWrapper.className = 'subcategory-wrapper'; 
        subcategoryWrapper.id = subcategoryWrapperId;

        // 找出此主分類下的所有次分類
        const secondaryCategories = [...new Set(
            sentenceData
                .filter(s => s.primaryCategory === categoryName && s.secondaryCategories && s.secondaryCategories.length > 0)
                .flatMap(s => s.secondaryCategories)
        )];

        // 檢查是否存在沒有次分類的項目
        const hasUncategorized = sentenceData.some(s =>
            s.primaryCategory === categoryName && (!s.secondaryCategories || s.secondaryCategories.length === 0)
        );

        if (hasUncategorized) {
            secondaryCategories.unshift("未分類"); // 將「未分類」加到最前面
        }

        // 如果有次分類，則生成按鈕
        if (secondaryCategories.length > 0) {
            subcategoryWrapper.innerHTML = secondaryCategories.map(subCat =>
                `<button class="category-button" onclick="toggleSentenceSelection('secondaryCategories', '${subCat}', this)">${subCat}</button>`
            ).join('');
        }
        
        // 將次分類容器插入到主分類按鈕之後
        btn.parentNode.insertBefore(subcategoryWrapper, btn.nextSibling);
    }

    // 透過控制 maxHeight 來實現展開/收合的動畫效果
    if (subcategoryWrapper.style.maxHeight && subcategoryWrapper.style.maxHeight !== '0px') {
        subcategoryWrapper.style.maxHeight = '0px';
    } else {
        subcategoryWrapper.style.maxHeight = subcategoryWrapper.scrollHeight + "px";
    }

    // 延遲後重新計算父容器的高度，以確保能容納展開的次分類
    setTimeout(() => {
        const mainCollapsibleContent = btn.closest('.collapsible-content');
        if (mainCollapsibleContent && mainCollapsibleContent.style.maxHeight !== '0px') {
             mainCollapsibleContent.style.maxHeight = mainCollapsibleContent.scrollHeight + "px";
        }
    }, 310); // 延遲時間略大於 CSS transition 時間 (0.3s)
}
// ▲▲▲ [新增] 函式結束 ▲▲▲

// ▼▼▼ [修改] 分類按鈕生成函式 ▼▼▼
function generateSentenceCategories(data) {
    const alphabetContainer = document.getElementById("sentenceAlphabetButtons");
    const primaryContainer = document.getElementById("sentencePrimaryCategoryButtons");
    const secondaryContainer = document.getElementById("sentenceSecondaryCategoryButtons"); // 這個容器將不再被使用
    const specialContainer = document.getElementById("sentenceSpecialCategoryButtons");
    const levelContainer = document.getElementById("sentenceLevelButtons");

    if (!alphabetContainer || !primaryContainer || !specialContainer || !levelContainer) {
        console.error("❌ 句子測驗的分類容器未全部找到，請檢查 quiz.html 的 ID。");
        return;
    }

    // 提取所有分類
    const levels = new Set();
    const primaryCategories = new Set();
    const alphabetSet = new Set();

    data.forEach(item => {
        levels.add(item.等級 || "未分類(等級)");
        const firstLetter = item.句子.charAt(0).toUpperCase();
        if (/[A-Z]/.test(firstLetter)) {
            alphabetSet.add(firstLetter);
        }
        if (item.primaryCategory) {
            primaryCategories.add(item.primaryCategory);
        }
    });

    // 渲染字母按鈕
    alphabetContainer.innerHTML = [...alphabetSet].sort().map(letter => 
        `<button class="category-button" onclick="toggleSentenceSelection('alphabet', '${letter}', this)">${letter}</button>`
    ).join("");

    // 渲染主分類按鈕，並將 onclick 事件指向新的處理函式
    primaryContainer.innerHTML = [...primaryCategories].map(c =>
        `<button class="category-button" onclick="handleSentencePrimaryCategoryClick(this, '${c}')">${c}</button>`
    ).join("");

    // 清空並隱藏舊的次分類容器
    if (secondaryContainer) {
        secondaryContainer.innerHTML = "";
        secondaryContainer.closest('.collapsible-section').style.display = 'none'; // 直接隱藏整個區塊
    }
    
    // 渲染特殊分類按鈕
    specialContainer.innerHTML = `
        <button class="category-button" onclick="toggleSentenceSelection('special', 'important', this)">重要句子</button>
        <button class="category-button" onclick="toggleSentenceSelection('special', 'incorrect', this)">錯誤句子</button>
        <button class="category-button" onclick="toggleSentenceSelection('special', 'checked', this)">已經checked 句子</button>
    `;

    // 渲染等級分類按鈕
    levelContainer.innerHTML = [...levels].map(l =>
        `<button class="category-button" onclick="toggleSentenceSelection('levels', '${l}', this)">${l}</button>`
    ).join("");
}
// ▲▲▲ [修改] 函式結束 ▲▲▲

// ▼▼▼ [修改] 切換篩選條件函式，使其能處理按鈕樣式切換 ▼▼▼
function toggleSentenceSelection(type, value, button) {
    let filterSet = selectedSentenceFilters[type];
    
    if (!button) {
        // 如果 button 未傳入，嘗試從 DOM 中尋找
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
}
// ▲▲▲ [修改] 函式結束 ▲▲▲

// ▼▼▼ [修改] 開始測驗的篩選邏輯 ▼▼▼
function startSentenceQuiz() {
    document.getElementById("sentenceQuizCategories").style.display = "none";
    document.getElementById("sentenceQuizArea").style.display = "block";

    let filteredSentences = sentenceData.filter(item => {
        let levelMatch = selectedSentenceFilters.levels.size === 0 || selectedSentenceFilters.levels.has(item.等級 || "未分類(等級)");
        let primaryCategoryMatch = selectedSentenceFilters.primaryCategories.size === 0 || selectedSentenceFilters.primaryCategories.has(item.primaryCategory);
        
        // 更新的次分類篩選邏輯
        let secondaryCategoryMatch = selectedSentenceFilters.secondaryCategories.size === 0 ||
            ((item.secondaryCategories && item.secondaryCategories.length > 0) && item.secondaryCategories.some(cat => selectedSentenceFilters.secondaryCategories.has(cat))) ||
            (selectedSentenceFilters.secondaryCategories.has('未分類') && (!item.secondaryCategories || item.secondaryCategories.length === 0));

        let alphabetMatch = selectedSentenceFilters.alphabet.size === 0 || selectedSentenceFilters.alphabet.has(item.句子.charAt(0).toUpperCase());
        
        let specialMatch = true;
        if (selectedSentenceFilters.special.size > 0) {
            specialMatch = [...selectedSentenceFilters.special].every(filter => {
                 if (filter === 'important') return localStorage.getItem(`important_sentence_${item.Words}`) === "true";
                 if (filter === 'incorrect') return (JSON.parse(localStorage.getItem("wrongQS")) || []).includes(item.Words);
                 if (filter === 'checked') return localStorage.getItem(`checked_sentence_${item.Words}`) === "true";
                 return true;
            });
        }
        
        return levelMatch && primaryCategoryMatch && secondaryCategoryMatch && alphabetMatch && specialMatch;
    });

    if (filteredSentences.length === 0) {
        alert("⚠️ 沒有符合條件的句子！");
        returnToSentenceCategorySelection();
        return;
    }

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
    currentSentenceIndex = 0;
    userAnswers = [];

    console.log("✅ 本次測驗的句子數量:", currentQuizSentences.length);
    console.log("✅ 本次測驗的隨機句子:", currentQuizSentences.map(s => s.Words));

    localStorage.setItem("currentQuizSentences", JSON.stringify(currentQuizSentences));

    setTimeout(() => {
        loadSentenceQuestion();
        autoPlayAudio();
    }, 100);
}
// ▲▲▲ [修改] 函式結束 ▲▲▲

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("startSentenceQuizBtn").addEventListener("click", startSentenceQuiz);
});

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

// ▼▼▼ [修改] 開始重組測驗的篩選邏輯 ▼▼▼
function startReorganizeQuiz() {
    document.getElementById("sentenceQuizCategories").style.display = "none";
    document.getElementById("reorganizeQuizArea").style.display = "block";

    let filteredSentences = sentenceData.filter(item => {
        let levelMatch = selectedSentenceFilters.levels.size === 0 ||
                         selectedSentenceFilters.levels.has(item.等級 || "未分類(等級)");
        let primaryMatch = selectedSentenceFilters.primaryCategories.size === 0 ||
                           selectedSentenceFilters.primaryCategories.has(item.primaryCategory);
        
        // 更新的次分類篩選邏輯
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
// ▲▲▲ [修改] 函式結束 ▲▲▲

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
        let isCorrect = userWords.join(" ").toLowerCase() === correctWords.join(" ").toLowerCase();
        let isUnanswered = userAnswer === "(未作答)";

        let resultClass = isCorrect ? "correct" : (isUnanswered ? "unanswered" : "wrong");

        let importantCheckbox = `<input type="checkbox" class="important-checkbox" onchange="toggleImportantSentence('${sentenceObj.Words}', this)" ${localStorage.getItem('important_sentence_' + sentenceObj.Words) === "true" ? "checked" : ""} />`;
        let sentenceIdentifierLink = `<a href="sentence.html?sentence=${encodeURIComponent(sentenceObj.Words)}&from=quiz&layer=4" class="sentence-link-btn">${sentenceObj.Words}</a>`;
        let wordDetailButton = `<button class="word-detail-btn" onclick="goToWordDetail('${sentenceObj.Words.split("-")[0]}')">單字詳情</button>`;
        let correctSentenceLink = `<button class="sentence-link-btn" onclick="playSentenceAudio('${sentenceObj.Words}.mp3')">${correctSentence}</button>`;
        let chineseExplanation = sentenceObj.中文 ? sentenceObj.中文.replace(/\n/g, "<br>") : "無中文解釋";

        resultContainer.innerHTML += `
            <div class="result-item ${resultClass}">
                ${importantCheckbox}
                <div class="horizontal-group">
                    ${sentenceIdentifierLink}
                    ${wordDetailButton}
                </div>
                <div class="vertical-group">
                    ${correctSentenceLink}
                    <div class="chinese-explanation">
                        <h3>中文解釋</h3>
                        <p>${chineseExplanation}</p>
                    </div>
                </div>
            </div>
        `;
    }

    resultContainer.innerHTML += `
        <div class="result-buttons">
            <button class="action-button" onclick="saveQSResults()">Save</button>
            <button class="action-button" onclick="returnToSentenceCategorySelection()">Back</button>
        </div>
    `;

    localStorage.setItem("userConstructedSentences", JSON.stringify(userConstructedSentences));
    localStorage.setItem("currentQuizSentences", JSON.stringify(currentQuizSentences));
    console.log("✅ 測驗結束時保存的資料:", { userConstructedSentences, currentQuizSentences });
}

document.getElementById("startReorganizeQuizBtn").addEventListener("click", startReorganizeQuiz);

function handleLetterInput(event) {
    let input = event.target;
    let value = input.value.trim();
    
    if (value.length > 1) {
        input.value = value[0];
    }

    let allInputs = Array.from(document.querySelectorAll(".letter-input"));
    let currentIndex = allInputs.indexOf(input);

    if (currentIndex !== -1 && value !== "") {
        let nextInput = allInputs[currentIndex + 1];
        if (nextInput) {
            nextInput.focus();
        }
    }
}

function handleArrowNavigation(event) {
    let input = event.target;
    let allInputs = Array.from(document.querySelectorAll(".letter-input"));
    let currentIndex = allInputs.indexOf(input);

    if (event.key === "ArrowRight") {
        event.preventDefault();
        let nextInput = allInputs[currentIndex + 1];
        if (nextInput) {
            nextInput.focus();
        }
    } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        let prevInput = allInputs[currentIndex - 1];
        if (prevInput) {
            prevInput.focus();
        }
    } else if (event.key === "Backspace") {
        event.preventDefault();
        if (input.value) {
            input.value = "";
        } else {
            let prevInput = allInputs[currentIndex - 1];
            if (prevInput) {
                prevInput.value = "";
                prevInput.focus();
            }
        }
    }
}

function playAudio() {
    if (currentAudio) {
        const playBtn = document.getElementById("playSentenceAudioBtn");
        
        playBtn.classList.add("playing");
        
        currentAudio.currentTime = 0;
        currentAudio.play()
            .then(() => {
                console.log("✅ 播放成功");
            })
            .catch(error => {
                console.error("🔊 播放失敗:", error);
                playBtn.classList.remove("playing");
            });

        currentAudio.onended = () => {
            playBtn.classList.remove("playing");
            console.log("✅ 音檔播放結束");
        };
    } else {
        console.warn("⚠️ 尚未加載音檔，請確認檔案是否正確");
    }
}

function playSentenceAudio(audioFile) {
    let audioUrl = GITHUB_MP3_BASE_URL + audioFile;
    let audio = new Audio(audioUrl);
    audio.play().catch(error => console.error("🔊 播放失敗:", error));
}
window.playSentenceAudio = playSentenceAudio;

function handleSpacebar(event) {
    if (event.code === "Space" && document.getElementById("sentenceQuizArea").style.display === "block") {
        event.preventDefault();
        playAudio();
    }
}

document.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        event.preventDefault();
        if (document.getElementById("sentenceQuizArea").style.display === "block") {
            let submitBtn = document.getElementById("submitSentenceBtn");
            if (!submitBtn) return;
            if (submitBtn.dataset.next === "true") {
                console.log("📌 進入下一題 (Sentence Quiz)");
                goToNextSentence();
            } else {
                console.log("📌 提交答案 (Sentence Quiz)");
                submitSentenceAnswer();
            }
        }
        else if (document.getElementById("reorganizeQuizArea").style.display === "block") {
            let submitBtn = document.getElementById("submitReorganizeBtn");
            if (!submitBtn) return;
            if (submitBtn.innerText === "下一題") {
                console.log("📌 進入下一題 (Reorganize Quiz)");
                goToNextReorganizeSentence();
            } else {
                console.log("📌 提交答案 (Reorganize Quiz)");
                submitReorganizeAnswer();
            }
        } else {
            console.log("⚠️ 不在測驗模式，忽略 Enter 鍵");
        }
    }

    if (event.code === "Space") {
        event.preventDefault();
        if (document.getElementById("sentenceQuizArea").style.display === "block") {
            console.log("📌 空白鍵觸發音頻播放 (Sentence Quiz)");
            playAudio();
        }
        else if (document.getElementById("reorganizeQuizArea").style.display === "block") {
            console.log("📌 空白鍵觸發音頻播放 (Reorganize Quiz)");
            if (currentAudio) {
                const playBtn = document.getElementById("playReorganizeAudioBtn");
                playBtn.classList.add("playing");
                currentAudio.currentTime = 0;
                currentAudio.play().catch(error => {
                    console.error("🔊 播放失敗:", error);
                    playBtn.classList.remove("playing");
                });
            } else {
                console.warn("⚠️ 無音頻可播放");
            }
        }
    }
});

function normalizeText(text) {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\bii\b/g, '2')
        .replace(/\s+/g, ' ')
        .replace(/,\s*/g, ',')
        .trim();
}

function submitSentenceAnswer() {
    let sentenceObj = currentQuizSentences[currentSentenceIndex];
    let correctSentence = sentenceObj.filteredSentence || sentenceObj.句子.replace(/\s*\[=[^\]]+\]/g, "").trim();
    let allInputs = document.querySelectorAll("#sentenceInput .letter-input");

    let correctWords = correctSentence.match(/\p{L}+(?:'\p{L}+)?|'s|\p{L}+(?:-\p{L}+)+|[.,!?;]|\s+/gu) || [];
    let userAnswer = [];
    let inputIndex = 0;

    correctWords.forEach((word, wordIndex) => {
        if (/\p{L}+/u.test(word)) {
            let inputWord = "";
            while (inputIndex < allInputs.length && parseInt(allInputs[inputIndex].dataset.wordIndex) === wordIndex) {
                inputWord += allInputs[inputIndex].value || "";
                inputIndex++;
            }
            userAnswer.push(inputWord);
        } else {
            userAnswer.push(word);
        }
    });

    let userAnswerStr = normalizeText(userAnswer.join(""));
    let correctSentenceStr = normalizeText(correctSentence);

    userAnswers[currentSentenceIndex] = userAnswer.join("").trim();

    let isCorrect = userAnswerStr === correctSentenceStr;
    if (!isCorrect) {
        if (!incorrectSentences.includes(sentenceObj.Words)) {
            incorrectSentences.push(sentenceObj.Words);
        }
    } else {
        incorrectSentences = incorrectSentences.filter(w => w !== sentenceObj.Words);
    }

    localStorage.setItem("wrongQS", JSON.stringify(incorrectSentences));
    console.log("✅ submitSentenceAnswer 後更新 incorrectSentences:", incorrectSentences);

    updateSentenceHint(correctSentence, userAnswer);
    highlightUserAnswers(allInputs, correctSentence);

    let submitBtn = document.getElementById("submitSentenceBtn");
    submitBtn.innerText = "下一題";
    submitBtn.onclick = goToNextSentence;
    submitBtn.dataset.next = "true";
}

function updateSentenceHint(correctSentence, userAnswer) {
    let correctWords = correctSentence.match(/\p{L}+(?:'\p{L}+)?|'s|\p{L}+(?:-\p{L}+)+|[.,!?;]|\s+/gu) || [];
    let userWords = userAnswer;

    let formattedSentence = correctWords.map((word, index) => {
        if (/\p{L}+/u.test(word) || word === "II") {
            let userWord = userWords[index] || "";
            if (normalizeText(userWord) === normalizeText(word) || (word === "II" && userWord === "2")) {
                return `<span style="color: black; font-weight: bold;">${word}</span>`;
            } else {
                return `<span style="color: red; font-weight: bold;">${word}</span>`;
            }
        } else {
            return `<span style="color: black;">${word}</span>`;
        }
    }).join("");

    document.getElementById("sentenceHint").innerHTML = formattedSentence;
}

function highlightUserAnswers(allInputs, correctSentence) {
    let correctWords = correctSentence.match(/\p{L}+(?:'\p{L}+)?|'s|\p{L}+(?:-\p{L}+)+|[.,!?;]|\s+/gu) || [];
    let inputIndex = 0;

    correctWords.forEach((word, wordIndex) => {
        if (/\p{L}+/u.test(word) || word === "II") {
            let inputWord = "";
            let inputElements = [];

            while (inputIndex < allInputs.length && parseInt(allInputs[inputIndex].dataset.wordIndex) === wordIndex) {
                inputWord += allInputs[inputIndex].value || "";
                inputElements.push(allInputs[inputIndex]);
                inputIndex++;
            }

            let normalizedInputWord = normalizeText(inputWord);
            let normalizedWord = normalizeText(word);

            if (normalizedInputWord === normalizedWord || (word === "II" && inputWord === "2")) {
                inputElements.forEach(input => {
                    input.style.color = "black";
                    input.style.fontWeight = "bold";
                });
            } else {
                let wordChars = Array.from(word);
                inputElements.forEach((input, letterIndex) => {
                    let inputChar = input.value || "";
                    let correctChar = wordChars[letterIndex] || "";
                    if (normalizeText(inputChar) === normalizeText(correctChar) || 
                        (word === "II" && inputWord === "2" && letterIndex === 0)) {
                        input.style.color = "black";
                    } else {
                        input.style.color = "red";
                    }
                    input.style.fontWeight = "bold";
                });

                for (let i = inputElements.length; i < wordChars.length; i++) {
                    console.log(`⚠️ 單詞 "${word}" 缺少字符: ${wordChars[i]}`);
                }
            }
        }
    });
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

        let importantCheckbox = `<input type="checkbox" class="important-checkbox" onchange="toggleImportantSentence('${sentenceObj.Words}', this)" ${localStorage.getItem('important_sentence_' + sentenceObj.Words) === "true" ? "checked" : ""} />`;
        let sentenceIdentifierLink = `<a href="sentence.html?sentence=${encodeURIComponent(sentenceObj.Words)}&from=quiz&layer=4" class="sentence-link-btn">${sentenceObj.Words}</a>`;
        let wordDetailButton = `<button class="word-detail-btn" onclick="goToWordDetail('${sentenceObj.Words.split("-")[0]}')">單字詳情</button>`;
        let correctSentenceLink = `<button class="sentence-link-btn" onclick="playSentenceAudio('${sentenceObj.Words}.mp3')">${correctSentence}</button>`;

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
            </div>
        `;
    }

    resultContainer.innerHTML += `
        <div class="result-buttons">
            <button class="action-button" onclick="saveQSResults()">Save</button>
            <button class="action-button" onclick="returnToMainMenu()">Back</button>
        </div>
    `;

    localStorage.setItem("userAnswers", JSON.stringify(userAnswers));
    localStorage.setItem("currentQuizSentences", JSON.stringify(currentQuizSentences));
    console.log("✅ 測驗結束時保存的資料:", { userAnswers, currentQuizSentences });
}

function saveQSResults() {
    localStorage.setItem("wrongQS", JSON.stringify(incorrectSentences));
    console.log("✅ 錯誤句子已儲存到 localStorage['wrongQS']:", incorrectSentences);
    alert("測驗結果中的錯誤句子已儲存！");
}

function highlightErrors(correctSentence, userAnswer) {
    let correctWords = correctSentence.split(/\b/);
    let userWords = userAnswer.split(/\b/);

    return correctWords.map((word, i) => {
        let userWord = userWords[i] || "";
        return (/\w+/.test(word) && userWord.toLowerCase() !== word.toLowerCase()) 
            ? `<span style='color: red;'>${word}</span>` 
            : word;
    }).join("");
}

function goToWordDetail(word) {
    let baseWord = word.replace(/-\d+$/, '');
    window.location.href = `index.html?word=${encodeURIComponent(baseWord)}&from=quiz`;
}

function returnToQuizResult() {
    document.getElementById("sentenceQuizArea").style.display = "none";
    document.getElementById("quizResult").style.display = "block";
    finishSentenceQuiz();
}

function getReturningStatus() {
    let params = new URLSearchParams(window.location.search);
    return params.get('returning') === 'true';
}

document.addEventListener("DOMContentLoaded", function () {
    if (getReturningStatus()) {
        console.log("✅ 從外部返回，顯示測驗結果");
        restoreQuizResult();
    } else {
        console.log("ℹ️ 正常載入 quiz.html");
    }

    document.getElementById("startSentenceQuizBtn").addEventListener("click", startSentenceQuiz);
});

function restoreQuizResult() {
    currentQuizSentences = JSON.parse(localStorage.getItem("currentQuizSentences")) || [];
    userAnswers = JSON.parse(localStorage.getItem("userAnswers")) || [];
    incorrectSentences = JSON.parse(localStorage.getItem("wrongQS")) || [];

    if (currentQuizSentences.length === 0 || userAnswers.length === 0) {
        console.warn("⚠️ 無測驗資料可恢復，回到分類頁面");
        showSentenceQuizCategories();
        return;
    }

    document.getElementById("sentenceQuizCategories").style.display = "none";
    document.getElementById("sentenceQuizArea").style.display = "none";
    document.getElementById("quizResult").style.display = "block";
    finishSentenceQuiz();
}

// ▼▼▼ [修改] 返回分類頁面函式，增加清理動態元素的邏輯 ▼▼▼
function returnToSentenceCategorySelection() {
    document.getElementById("sentenceQuizCategories").style.display = "block";
    document.getElementById("sentenceQuizArea").style.display = "none";
    document.getElementById("reorganizeQuizArea").style.display = "none";
    document.getElementById("quizResult").style.display = "none";

    // 重置篩選條件
    Object.keys(selectedSentenceFilters).forEach(key => selectedSentenceFilters[key].clear());
    
    // 移除所有按鈕的 'selected' class
    document.querySelectorAll(".category-button.selected").forEach(button => {
        button.classList.remove("selected");
    });
    
    // 移除所有動態生成的次分類容器
    document.querySelectorAll(".subcategory-wrapper").forEach(wrapper => {
        wrapper.remove();
    });

    console.log("✅ 返回句子測驗分類頁面，重置所有測驗區域");
}
// ▲▲▲ [修改] 函式結束 ▲▲▲

function toggleImportantSentence(word, checkbox) {
    let lowerWord = word.toLowerCase();
    if (checkbox.checked) {
        localStorage.setItem(`important_sentence_${lowerWord}`, "true");
        console.log(`⭐ 句子 ${word} 標記為重要`);
    } else {
        localStorage.removeItem(`important_sentence_${lowerWord}`);
        console.log(`❌ 句子 ${word} 取消重要標記`);
    }
}

function returnToMainMenu() {
    window.location.href = 'index.html';
    
    currentSentenceIndex = 0;
    userAnswers = [];
    userConstructedSentences = [];

    console.log("✅ 返回首頁並重置測驗狀態");
}