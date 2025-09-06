
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

let selectedSentenceFilters = {
    levels: new Set(),
    primaryCategories: new Set(),
    secondaryCategories: new Set(),
    alphabet: new Set(),
    special: new Set() // 添加這行
};

function getUserAnswer(index) {
    return userAnswers[index] || "";
}
window.getUserAnswer = getUserAnswer;

// 在 DOMContentLoaded 中動態載入所有變數
document.addEventListener("DOMContentLoaded", function () {

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

    document.getElementById("startSentenceQuizBtn").addEventListener("click", startSentenceQuiz);
});

// 📌 進入 Q Sentence 測驗分類頁面
function showSentenceQuizCategories() {
    document.querySelector("h1").textContent = "句子測驗區";
    // document.getElementById("mainMenu").style.display = "none"; // 這一行已被刪除
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
            // 添加更多樣本資料如果需要
        ];
        console.log("✅ 使用臨時樣本資料載入分類");
        generateSentenceCategories(sentenceData); // 使用樣本資料生成分類
        localStorage.setItem("sentenceData", JSON.stringify(sentenceData)); // 儲存到 localStorage 以便下次使用
    }
});
}

function generateSentenceCategories(data) {
    // 定義各分類的容器
    const alphabetContainer = document.getElementById("sentenceAlphabetButtons");
    const primaryContainer = document.getElementById("sentencePrimaryCategoryButtons");
    const secondaryContainer = document.getElementById("sentenceSecondaryCategoryButtons");
    const specialContainer = document.getElementById("sentenceSpecialCategoryButtons");
    const levelContainer = document.getElementById("sentenceLevelButtons");

    if (!alphabetContainer || !primaryContainer || !secondaryContainer || !specialContainer || !levelContainer) {
        console.error("❌ 句子測驗的分類容器未全部找到，請檢查 quiz.html 的 ID。");
        return;
    }

    // 提取所有分類
    const levels = new Set();
    const primaryCategories = new Set();
    const secondaryCategories = new Set();
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
        item.secondaryCategories.forEach(cat => secondaryCategories.add(cat));
    });

    // 渲染按鈕到對應的容器
    alphabetContainer.innerHTML = [...alphabetSet].sort().map(letter => 
        `<button class="category-button" onclick="toggleSentenceSelection('alphabet', '${letter}')">${letter}</button>`
    ).join("");

    primaryContainer.innerHTML = [...primaryCategories].map(c =>
        `<button class="category-button" onclick="toggleSentenceSelection('primaryCategories', '${c}')">${c}</button>`
    ).join("");

    secondaryContainer.innerHTML = [...secondaryCategories].map(c =>
        `<button class="category-button" onclick="toggleSentenceSelection('secondaryCategories', '${c}')">${c}</button>`
    ).join("");
    
    specialContainer.innerHTML = `
        <button class="category-button" onclick="toggleSentenceSelection('special', 'important')">重要句子</button>
        <button class="category-button" onclick="toggleSentenceSelection('special', 'incorrect')">錯誤句子</button>
        <button class="category-button" onclick="toggleSentenceSelection('special', 'checked')">已經checked 句子</button>
    `;

    levelContainer.innerHTML = [...levels].map(l =>
        `<button class="category-button" onclick="toggleSentenceSelection('levels', '${l}')">${l}</button>`
    ).join("");
    
    // 恢復已選狀態
    document.querySelectorAll("#sentenceQuizCategories .category-button").forEach(button => {
        const onclickAttr = button.getAttribute('onclick');
        const typeMatch = onclickAttr.match(/toggleSentenceSelection\('(\w+)'/);
        const valueMatch = onclickAttr.match(/,\s*'([^']+)'\)/);
        if (typeMatch && valueMatch) {
            const type = typeMatch[1];
            const value = valueMatch[1];
            if (selectedSentenceFilters[type] && selectedSentenceFilters[type].has(value)) {
                button.classList.add("selected");
            }
        }
    });
}

// 📌 切換篩選條件並更新按鈕樣式
function toggleSentenceSelection(type, value) {
    let filterSet = selectedSentenceFilters[type];
    let button = document.querySelector(`button[onclick="toggleSentenceSelection('${type}', '${value}')"]`);
    
    if (!button) {
        console.error(`❌ 未找到按鈕: type=${type}, value=${value}`);
        return;
    }

    if (filterSet.has(value)) {
        filterSet.delete(value);
        button.classList.remove("selected");
    } else {
        filterSet.add(value);
        button.classList.add("selected");
    }
    console.log(`✅ ${type} 篩選更新:`, [...filterSet]);
}

// 📌 開始測驗
// 【q_sentence.js 檔案中請更新成此版本】
function startSentenceQuiz() {
    document.getElementById("sentenceQuizCategories").style.display = "none";
    document.getElementById("sentenceQuizArea").style.display = "block";

    let filteredSentences = sentenceData.filter(item => {
        let levelMatch = selectedSentenceFilters.levels.size === 0 || selectedSentenceFilters.levels.has(item.等級 || "未分類(等級)");
        let primaryCategoryMatch = selectedSentenceFilters.primaryCategories.size === 0 || selectedSentenceFilters.primaryCategories.has(item.primaryCategory);
        let secondaryCategoryMatch = selectedSentenceFilters.secondaryCategories.size === 0 || 
                                     (item.secondaryCategories || []).some(cat => selectedSentenceFilters.secondaryCategories.has(cat));
        let alphabetMatch = selectedSentenceFilters.alphabet.size === 0 || selectedSentenceFilters.alphabet.has(item.句子.charAt(0).toUpperCase());

        // 【核心修改】新增特殊條件的篩選邏輯
        let specialMatch = selectedSentenceFilters.special.size === 0 ||
                           (selectedSentenceFilters.special.has('important') && localStorage.getItem(`important_sentence_${item.Words}`) === "true") ||
                           (selectedSentenceFilters.special.has('incorrect') && incorrectSentences.includes(item.Words)) ||
                           (selectedSentenceFilters.special.has('checked') && localStorage.getItem(`checked_sentence_${item.Words}`) === "true");

        // 將 specialMatch 加入到最終的 return 條件中
        return levelMatch && primaryCategoryMatch && secondaryCategoryMatch && alphabetMatch && specialMatch;
    });

    if (filteredSentences.length === 0) {
        alert("⚠️ 沒有符合條件的句子！");
        returnToSentenceCategorySelection();
        return;
    }

    // 隨機排序並限制為 10 句
    for (let i = filteredSentences.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [filteredSentences[i], filteredSentences[j]] = [filteredSentences[j], filteredSentences[i]];
    }

    currentQuizSentences = filteredSentences.slice(0, 10);
    currentSentenceIndex = 0;
    userAnswers = []; // 清空本次答案

    console.log("✅ 本次測驗的句子數量:", currentQuizSentences.length);
    console.log("✅ 本次測驗的隨機句子:", currentQuizSentences.map(s => s.Words));

    // 保存本次測驗的句子到 localStorage
    localStorage.setItem("currentQuizSentences", JSON.stringify(currentQuizSentences));

    // 載入第一題並自動播放
    setTimeout(() => {
        loadSentenceQuestion();
        autoPlayAudio(); // ✅ 添加自動播放
    }, 100);
}

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("startSentenceQuizBtn").addEventListener("click", startSentenceQuiz);
});

let currentAudio = null; // 儲存當前音檔，避免重複創建

function loadSentenceQuestion() {
    let sentenceObj = currentQuizSentences[currentSentenceIndex];
    if (!sentenceObj) {
        console.error("❌ 找不到 sentenceObj！");
        return;
    }

    // 原始句子
    let originalSentence = sentenceObj.句子;
    // 移除括號內容（例如 [=critique]）
    let sentenceText = originalSentence.replace(/\s*\[=[^\]]+\]/g, "").trim();
    // 使用 Unicode 字母分割單詞，保留標點符號
    let words = sentenceText.match(/\p{L}+(?:'\p{L}+)?|'s|\p{L}+(?:-\p{L}+)+|[.,!?;]|\s+/gu) || [];

    let sentenceInputContainer = document.getElementById("sentenceInput");
    sentenceInputContainer.innerHTML = "";

    let firstInput = null;
    let allInputs = [];

    // 計算最長單字的字母數
    let maxWordLength = Math.max(...words.filter(w => /\p{L}+/u.test(w)).map(w => w.length));
    let screenWidth = window.innerWidth || document.documentElement.clientWidth;

    words.forEach((word, index) => {
        let wordContainer = document.createElement("div");
        wordContainer.classList.add("word-container");

        if (/\p{L}+/u.test(word)) {
            // 將單詞拆分成單個字符（包括 é 等）
            let chars = Array.from(word); // 使用 Array.from 確保正確分割 Unicode 字符
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

    // 提示文字邏輯
// 提示文字邏輯 (更新為顯示中文翻譯)
    let chineseHint = sentenceObj.中文 || "（無中文提示）";
    document.getElementById("sentenceHint").innerHTML = chineseHint;

    if (firstInput) {
        firstInput.focus();
    }

    document.getElementById("nextSentenceBtn").style.display = "none";

    // 音頻邏輯
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

    // 儲存過濾後的句子作為正確答案
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

// 📌 1開始測驗重組句子
function startReorganizeQuiz() {
    document.getElementById("sentenceQuizCategories").style.display = "none";
    document.getElementById("reorganizeQuizArea").style.display = "block";

    let filteredSentences = sentenceData.filter(item => {
        let levelMatch = selectedSentenceFilters.levels.size === 0 || 
                         selectedSentenceFilters.levels.has(item.等級 || "未分類(等級)");

        let primaryMatch = selectedSentenceFilters.primaryCategories.size === 0 ||
                           selectedSentenceFilters.primaryCategories.has(item.primaryCategory);

        let secondaryMatch = selectedSentenceFilters.secondaryCategories.size === 0 ||
                             item.secondaryCategories.some(c => selectedSentenceFilters.secondaryCategories.has(c));

        let alphabetMatch = selectedSentenceFilters.alphabet.size === 0 || 
                            selectedSentenceFilters.alphabet.has(item.句子.charAt(0).toUpperCase());

        let specialMatch = selectedSentenceFilters.special.size === 0 ||
                           (selectedSentenceFilters.special.has('important') && 
                            localStorage.getItem(`important_sentence_${item.Words}`) === "true") ||
                           (selectedSentenceFilters.special.has('incorrect') && 
                            incorrectSentences.includes(item.Words)) ||
                           (selectedSentenceFilters.special.has('checked') && 
                            localStorage.getItem(`checked_sentence_${item.Words}`) === "true");

        return levelMatch && primaryMatch && secondaryMatch && alphabetMatch && specialMatch;
    });

    if (filteredSentences.length === 0) {
        alert("❌ 沒有符合條件的測驗句子");
        returnToSentenceCategorySelection();
        return;
    }

    currentQuizSentences = filteredSentences.sort(() => Math.random() - 0.5).slice(0, 10);
    currentSentenceIndex = 0;
    userConstructedSentences = [];
    localStorage.setItem("currentQuizSentences", JSON.stringify(currentQuizSentences));
    loadReorganizeQuestion();
}

// 📌 2載入重組問題
function loadReorganizeQuestion() {
    // 獲取當前句子並檢查有效性
    let sentenceObj = currentQuizSentences[currentSentenceIndex];
    if (!sentenceObj || !sentenceObj.句子) {
        console.error("❌ 找不到有效的句子對象！");
        return;
    }

    // 過濾句子並儲存
    let sentenceText = sentenceObj.句子.replace(/\s*\[=[^\]]+\]/g, "").trim();
    sentenceObj.filteredSentence = sentenceText;

    // 分割句子，用於提示，保留單詞和標點符號
// 更新提示為顯示中文翻譯
    let chineseHint = sentenceObj.中文 || "（無中文提示）";
    document.getElementById("reorganizeSentenceHint").innerHTML = chineseHint;

    // 生成詞塊（僅包括單詞和所有格，排除標點符號）
    let blocks = sentenceText.match(/\p{L}+(?:'\p{L}+)?|'s|\p{L}+(?:-\p{L}+)+/gu) || [];
    
    // 隨機打亂詞塊並分配索引
    let shuffledBlocks = blocks.map((value, index) => ({ value, index })).sort(() => Math.random() - 0.5);
    
    // 生成占位容器和詞塊
    let blocksContainer = document.getElementById("wordBlocksContainer");
    blocksContainer.innerHTML = shuffledBlocks
        .map(b => `
            <div class="word-block-placeholder" data-index="${b.index}">
                <div class="word-block" data-value="${b.value}" data-index="${b.index}" onclick="selectWordBlock(this)">${b.value}</div>
            </div>
        `)
        .join("");

    // 清空並設置構建區域
    let constructionArea = document.getElementById("sentenceConstructionArea");
    constructionArea.innerHTML = ""; // 清空現有內容

    // 根據單字數量生成固定數量的占位符
    for (let i = 0; i < blocks.length; i++) {
        let placeholder = document.createElement("div");
        placeholder.classList.add("construction-placeholder");
        placeholder.dataset.position = i; // 記錄位置
        constructionArea.appendChild(placeholder);
    }

    // 添加音頻播放功能
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

        // 自動播放音頻
        playBtn.classList.add("playing");
        currentAudio.play().catch(error => {
            console.warn("🔊 自動播放失敗:", error);
            playBtn.classList.remove("playing");
        });
    }
}

// 📌 3選擇詞塊
function selectWordBlock(block) {
    let constructionArea = document.getElementById("sentenceConstructionArea");
    let placeholder = block.parentNode; // 當前方塊的父容器

    if (placeholder.classList.contains("word-block-placeholder")) {
        // 從原始區域移動到構建區域
        let emptyPlaceholder = Array.from(constructionArea.children).find(
            ph => ph.children.length === 0 // 找到第一個空的占位符
        );

        if (emptyPlaceholder) {
            emptyPlaceholder.appendChild(block); // 將方塊放入空的占位符
            block.classList.add("selected");
        }
    } else {
        // 從構建區域移回原始區域
        let blockIndex = block.dataset.index;
        let originalPlaceholder = document.querySelector(`.word-block-placeholder[data-index="${blockIndex}"]`);
        if (originalPlaceholder) {
            originalPlaceholder.appendChild(block); // 移回原始位置
            block.classList.remove("selected");
        }
    }
}

// 📌 4提交答案
function submitReorganizeAnswer() {
    let constructionArea = document.getElementById("sentenceConstructionArea");
    let userAnswer = Array.from(constructionArea.children).map(b => b.children[0] ? b.children[0].dataset.value : "").join(" ");
    let sentenceObj = currentQuizSentences[currentSentenceIndex];
    let correctSentence = sentenceObj.filteredSentence;

    userConstructedSentences[currentSentenceIndex] = userAnswer;

    // 使用 normalizeText 進行正規化比對
    let normalizedUserAnswer = normalizeText(userAnswer);
    let normalizedCorrectSentence = normalizeText(correctSentence);

    let isCorrect = normalizedUserAnswer === normalizedCorrectSentence;

    if (!isCorrect && !incorrectSentences.includes(sentenceObj.Words)) {
        incorrectSentences.push(sentenceObj.Words);
    } else if (isCorrect) {
        incorrectSentences = incorrectSentences.filter(w => w !== sentenceObj.Words);
    }
    localStorage.setItem("wrongQS", JSON.stringify(incorrectSentences));

    // 更新詞塊反饋
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

    // 更新提示區顯示完整正確答案和中文解釋
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

// 📌 5切換到下一題
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

    // 自動播放音頻
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

// 📌 6完成測驗
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

        // 提取單詞進行比較（含縮寫、所有格和連字符單詞）
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

    // 確保保存本次測驗的結果
    localStorage.setItem("userConstructedSentences", JSON.stringify(userConstructedSentences));
    localStorage.setItem("currentQuizSentences", JSON.stringify(currentQuizSentences));
    console.log("✅ 測驗結束時保存的資料:", { userConstructedSentences, currentQuizSentences });
}

document.getElementById("startReorganizeQuizBtn").addEventListener("click", startReorganizeQuiz);

// 📌 **輸入監聽函數**
function handleLetterInput(event) {
    let input = event.target;
    let value = input.value.trim();
    
    if (value.length > 1) {
        input.value = value[0];
    }

    // ✅ **自動跳到下一個填空**
    let allInputs = Array.from(document.querySelectorAll(".letter-input"));
    let currentIndex = allInputs.indexOf(input);

    if (currentIndex !== -1 && value !== "") {
        let nextInput = allInputs[currentIndex + 1];
        if (nextInput) {
            nextInput.focus();
        }
    }
}

// 📌 **方向鍵 + Backspace 處理**
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
            input.value = ""; // 先刪除當前字母
        } else {
            let prevInput = allInputs[currentIndex - 1];
            if (prevInput) {
                prevInput.value = ""; // 刪除前一格的字母
                prevInput.focus();
            }
        }
    }
}

// 📌 播放音檔函數（統一版本）
function playAudio() {
    if (currentAudio) {
        const playBtn = document.getElementById("playSentenceAudioBtn");
        
        // 添加播放中樣式
        playBtn.classList.add("playing");
        
        currentAudio.currentTime = 0; // 從頭播放
        currentAudio.play()
            .then(() => {
                console.log("✅ 播放成功");
            })
            .catch(error => {
                console.error("🔊 播放失敗:", error);
                // 即使播放失敗也移除播放樣式
                playBtn.classList.remove("playing");
            });

        // 當音檔播放結束時移除播放樣式
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

// 📌 監聽空白鍵來播放音檔
function handleSpacebar(event) {
    if (event.code === "Space" && document.getElementById("sentenceQuizArea").style.display === "block") {
        event.preventDefault(); // 阻止頁面滾動
        playAudio();
    }
}

document.addEventListener("keydown", function (event) {
    // 處理 Enter 鍵
    if (event.key === "Enter") {
        event.preventDefault(); // 防止滾動或其他默認行為
        // Sentence Quiz
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
        // Reorganize Quiz
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

    // 處理空白鍵
    if (event.code === "Space") {
        event.preventDefault(); // 阻止頁面滾動
        // Sentence Quiz
        if (document.getElementById("sentenceQuizArea").style.display === "block") {
            console.log("📌 空白鍵觸發音頻播放 (Sentence Quiz)");
            playAudio();
        }
        // Reorganize Quiz
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
        .normalize('NFD') // 將組合字符分解
        .replace(/[\u0300-\u036f]/g, '') // 移除重音符號
        .toLowerCase()
        .replace(/\bii\b/g, '2') // 將單獨的 "ii" 轉為 "2"（針對 World War II）
        .replace(/\s+/g, ' ') // 統一空格
        .replace(/,\s*/g, ',') // 處理逗號後的空格
        .trim();
}

function submitSentenceAnswer() {
    let sentenceObj = currentQuizSentences[currentSentenceIndex];
    let correctSentence = sentenceObj.filteredSentence || sentenceObj.句子.replace(/\s*\[=[^\]]+\]/g, "").trim();
    let allInputs = document.querySelectorAll("#sentenceInput .letter-input");

    // 使用 Unicode-aware 的正則表達式分割正確句子
    let correctWords = correctSentence.match(/\p{L}+(?:'\p{L}+)?|'s|\p{L}+(?:-\p{L}+)+|[.,!?;]|\s+/gu) || [];
    let userAnswer = [];
    let inputIndex = 0;

    // 收集用戶輸入，按單詞對應
    correctWords.forEach((word, wordIndex) => {
        if (/\p{L}+/u.test(word)) {
            let inputWord = "";
            // 收集對應 wordIndex 的所有輸入框內容
            while (inputIndex < allInputs.length && parseInt(allInputs[inputIndex].dataset.wordIndex) === wordIndex) {
                inputWord += allInputs[inputIndex].value || "";
                inputIndex++;
            }
            userAnswer.push(inputWord);
        } else {
            userAnswer.push(word); // 保留標點符號或空格
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
    // 使用 Unicode-aware 的正則表達式分割正確句子
    let correctWords = correctSentence.match(/\p{L}+(?:'\p{L}+)?|'s|\p{L}+(?:-\p{L}+)+|[.,!?;]|\s+/gu) || [];
    let userWords = userAnswer;

    // 格式化顯示內容
    let formattedSentence = correctWords.map((word, index) => {
        if (/\p{L}+/u.test(word) || word === "II") {
            let userWord = userWords[index] || "";
            if (normalizeText(userWord) === normalizeText(word) || (word === "II" && userWord === "2")) {
                // 正確的單字：黑色粗體
                return `<span style="color: black; font-weight: bold;">${word}</span>`;
            } else {
                // 錯誤的單字：紅色粗體
                return `<span style="color: red; font-weight: bold;">${word}</span>`;
            }
        } else {
            // 標點符號或空格：黑色普通字體
            return `<span style="color: black;">${word}</span>`;
        }
    }).join("");

    // 更新 sentenceHint 的顯示
    document.getElementById("sentenceHint").innerHTML = formattedSentence;
}

function highlightUserAnswers(allInputs, correctSentence) {
    // 使用 Unicode-aware 的正則表達式分割正確句子
    let correctWords = correctSentence.match(/\p{L}+(?:'\p{L}+)?|'s|\p{L}+(?:-\p{L}+)+|[.,!?;]|\s+/gu) || [];
    let inputIndex = 0;

    correctWords.forEach((word, wordIndex) => {
        if (/\p{L}+/u.test(word) || word === "II") { // 明確處理 "II"
            let inputWord = "";
            let inputElements = [];

            // 收集對應 wordIndex 的輸入框
            while (inputIndex < allInputs.length && parseInt(allInputs[inputIndex].dataset.wordIndex) === wordIndex) {
                inputWord += allInputs[inputIndex].value || "";
                inputElements.push(allInputs[inputIndex]);
                inputIndex++;
            }

            // 對單詞進行正規化比對，特別處理 "II" 和 "2"
            let normalizedInputWord = normalizeText(inputWord);
            let normalizedWord = normalizeText(word);

            if (normalizedInputWord === normalizedWord || (word === "II" && inputWord === "2")) {
                // 整個單詞正確，標記為黑色
                inputElements.forEach(input => {
                    input.style.color = "black";
                    input.style.fontWeight = "bold";
                });
            } else {
                // 逐字符比對
                let wordChars = Array.from(word); // 正確單詞的字符
                inputElements.forEach((input, letterIndex) => {
                    let inputChar = input.value || "";
                    let correctChar = wordChars[letterIndex] || "";
                    if (normalizeText(inputChar) === normalizeText(correctChar) || 
                        (word === "II" && inputWord === "2" && letterIndex === 0)) {
                        input.style.color = "black"; // 正確字符
                    } else {
                        input.style.color = "red"; // 錯誤或缺失字符
                    }
                    input.style.fontWeight = "bold";
                });

                // 如果輸入框數量少於單詞字符數，剩餘字符視為錯誤
                for (let i = inputElements.length; i < wordChars.length; i++) {
                    console.log(`⚠️ 單詞 "${word}" 缺少字符: ${wordChars[i]}`);
                }
            }
        }
    });
}

// 📌 切換到下一題
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

    autoPlayAudio(); // ✅ 添加自動播放
}

// 📌 測驗完成後顯示結果
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

    // 確保保存本次測驗的 5 句
    localStorage.setItem("userAnswers", JSON.stringify(userAnswers));
    localStorage.setItem("currentQuizSentences", JSON.stringify(currentQuizSentences));
    console.log("✅ 測驗結束時保存的資料:", { userAnswers, currentQuizSentences });
}

function saveQSResults() {
    localStorage.setItem("wrongQS", JSON.stringify(incorrectSentences));
    console.log("✅ 錯誤句子已儲存到 localStorage['wrongQS']:", incorrectSentences);
    alert("測驗結果中的錯誤句子已儲存！");
}

// 📌 標記錯誤的字為紅色
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

// 📌 連結到單字詳情頁面
function goToWordDetail(word) {
    let baseWord = word.replace(/-\d+$/, ''); // 移除後綴
    window.location.href = `index.html?word=${encodeURIComponent(baseWord)}&from=quiz`;
}

function returnToQuizResult() {
    document.getElementById("sentenceQuizArea").style.display = "none";
    document.getElementById("quizResult").style.display = "block";
    finishSentenceQuiz();
}

// 在檔案頂部新增
function getReturningStatus() {
    let params = new URLSearchParams(window.location.search);
    return params.get('returning') === 'true';
}

// 在檔案底部或適當位置添加初始化邏輯
document.addEventListener("DOMContentLoaded", function () {
    if (getReturningStatus()) {
        console.log("✅ 從外部返回，顯示測驗結果");
        restoreQuizResult();
    } else {
        console.log("ℹ️ 正常載入 quiz.html");
        // The line trying to access "mainMenu" has been removed.
    }

    document.getElementById("startSentenceQuizBtn").addEventListener("click", startSentenceQuiz);
});

// 新增恢復測驗結果的函數
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

// 📌 返回 Q Sentence 分類頁面
function returnToSentenceCategorySelection() {
    document.getElementById("sentenceQuizCategories").style.display = "block";
    document.getElementById("sentenceQuizArea").style.display = "none";
    document.getElementById("reorganizeQuizArea").style.display = "none"; // 明確隱藏重組測驗區域
    document.getElementById("quizResult").style.display = "none";

    // 重置選擇狀態
    selectedSentenceFilters.levels.clear();
    selectedSentenceFilters.categories.clear();
    selectedSentenceFilters.alphabet.clear();
    document.querySelectorAll(".category-button").forEach(button => {
        button.classList.remove("selected");
    });

    console.log("✅ 返回句子測驗分類頁面，重置所有測驗區域");
}

function toggleImportantSentence(word, checkbox) {
    let lowerWord = word.toLowerCase();  // 轉為小寫
    if (checkbox.checked) {
        localStorage.setItem(`important_sentence_${lowerWord}`, "true");
        console.log(`⭐ 句子 ${word} 標記為重要`);
    } else {
        localStorage.removeItem(`important_sentence_${lowerWord}`);
        console.log(`❌ 句子 ${word} 取消重要標記`);
    }
}

// 📌 返回主選單（測驗第一層）
// q_sentence.js

function returnToMainMenu() {
    // 直接導向到應用程式首頁
    window.location.href = 'index.html';
    
    // 清理相關的測驗狀態
    currentSentenceIndex = 0;
    userAnswers = [];
    userConstructedSentences = [];

    console.log("✅ 返回首頁並重置測驗狀態");
}