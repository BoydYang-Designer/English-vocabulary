/**
 * 根據一個基礎單字，建立一個可以匹配其常見變化正規表示式。
 * 例如：'dance' -> /danc(e|es|ed|ing)\b/gi
 * 例如：'study' -> /stud(y|ies|ied|ying)\b/gi
 * 例如：'absorb' -> /absorb(s|ed|ing)?\b/gi
 * @param {string} baseWord - 基礎單字 (e.g., "absorb").
 * @returns {RegExp} - 一個用於匹配的正規表示式物件.
 */
function createWordVariationsRegex(baseWord) {
    let stem = baseWord.toLowerCase();
    let pattern;

    // 規則1：處理以 'e' 結尾的單字 (例如 dance -> danc)
    if (stem.endsWith('e')) {
        stem = stem.slice(0, -1);
        pattern = `\\b${stem}(e|es|ed|ing)\\b`;
    // 規則2：處理以 'y' 結尾的單字 (例如 study -> stud)
    } else if (stem.endsWith('y')) {
        stem = stem.slice(0, -1);
        // [修改] 在這裡新增 ier 和 iest 的匹配規則
        pattern = `\\b${stem}(y|ies|ied|ier|iest|ying)\\b`;
    // 規則3：通用規則，處理大部分情況 (例如 absorb, work)
    } else {
        pattern = `\\b${stem}(s|es|ed|ing)?\\b`;
    }

    return new RegExp(pattern, 'gi');
}

// 全局變數整合
let parentLayer = "";
let wordsData = [];
let sentenceData = [];
let sentenceAudio = new Audio();
let lastWordListType = "";
let lastWordListValue = "";
let lastSentenceListWord = "";
let currentSentenceList = []; // 儲存當前的句子列表
let currentSentenceIndex = -1; // 儲存當前句子的索引
let currentWordList = []; // 儲存當前分類的單字列表
let currentWordIndex = -1; // 儲存當前單字的索引
let isQuizMode = false;   // 標記是否為測驗模式
let isAutoPlaying = false; // 是否處於自動播放模式
let isPaused = false;      // 是否暫停
let lastPlayBtn = null;

function showNotification(message, type = 'success') {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    // 4秒後自動移除
    setTimeout(() => {
        toast.remove();
    }, 4000);
}

document.addEventListener("DOMContentLoaded", function () {
    // ▼▼▼ 新增這一行 ▼▼▼
    const loadingOverlay = document.getElementById('loading-overlay');
    // ▲▲▲ 新增結束 ▲▲▲

    // 設置初始顯示狀態
    document.getElementById("searchContainer").style.display = "block";
    document.getElementById("startQuizBtn").style.display = "block";
    document.getElementById("sentencePageBtn").style.display = "block";
    document.getElementById("wordQuizBtn").style.display = "block";
    document.getElementById("wordPageBtn").style.display = "block";
    document.querySelector(".collapsible-section-wrapper").style.display = "block";
    document.getElementById("wordList").style.display = "none";
    document.getElementById("wordDetails").style.display = "none";
    document.getElementById("wordListTitle").style.display = "none";
    document.getElementById("autoPlayBtn").style.display = "none";

    // 新增「進入句子頁面」按鈕的事件監聽器
    const sentenceButton = document.getElementById("sentencePageBtn");
    if (sentenceButton) {
        sentenceButton.addEventListener("click", function () {
            window.location.href = "sentence.html";
        });
    }

    // 新增「進入測驗頁面」按鈕的事件監聽器
    const quizButton = document.getElementById("startQuizBtn");
    if (quizButton) {
        quizButton.addEventListener("click", function () {
            window.location.href = "quiz.html?show=sentenceCategories&from=index";
        });
    }

    // Add collapsible functionality
    document.querySelectorAll(".collapsible-header").forEach(button => {
        button.addEventListener("click", function() {
            this.classList.toggle("active");
            const content = this.nextElementSibling;
            if (content.style.maxHeight) {
                content.style.maxHeight = null;
            } else {
                content.style.maxHeight = content.scrollHeight + "px";
            }
        });
    });

     fetch("https://boydyang-designer.github.io/English-vocabulary/audio_files/Z_total_words.json")
        .then(res => res.json())
        .then(data => {
            wordsData = data["New Words"] || [];
            
            wordsData.forEach(w => {
                if (typeof w["分類"] === "string") {
                    w["分類"] = [w["分類"]];
                } else if (!Array.isArray(w["分類"])) {
                    w["分類"] = [];
                }
            });

            // 資料成功載入後的操作
            loadingOverlay.style.opacity = '0'; // 開始淡出
            setTimeout(() => {
                loadingOverlay.style.display = 'none'; // 淡出後隱藏
            }, 300);
            showNotification('✅ 資料載入完成！', 'success');

            console.log("✅ JSON 載入成功:", wordsData);

            // 確保分類和等級按鈕顯示
            setTimeout(() => {
                createAlphabetButtons();
                createCategoryButtons();
                createLevelButtons();
            }, 500);

            // 檢查 URL 並顯示單字詳情（第三層）
            displayWordDetailsFromURL();

            // 初始化「B」按鈕並根據來源調整狀態
            setTimeout(() => {
                let bButton = document.getElementById("bButton");
                if (bButton) {
                    bButton.disabled = true;
                    bButton.style.backgroundColor = "#ccc";
                    bButton.addEventListener("click", backToPrevious);
                    console.log("🔵 'B' 按鈕已初始化");

                    // 若從 sentence.js 跳轉過來，啟用「B」按鈕
                    let params = new URLSearchParams(window.location.search);
                    let fromPage = params.get('from');
                    if (fromPage === "sentence" && params.get('word')) {
                        bButton.disabled = false;
                        bButton.style.backgroundColor = "#6c757d";
                    }
                } else {
                    console.error("❌ 無法找到 'B' 按鈕，請確認 HTML 是否正確");
                }
            }, 300);
        })
        .catch(err => {
            // 資料載入失敗後的操作
            loadingOverlay.style.opacity = '0';
            setTimeout(() => {
                loadingOverlay.style.display = 'none';
            }, 300);
            showNotification('❌ 資料載入失敗，請檢查網路連線。', 'error');
            console.error("❌ 讀取 JSON 失敗:", err);
        });
});

// 第一層：生成字母按鈕
function renderAlphabetButtons() {
    const alphabetContainer = document.getElementById("alphabetButtons");
    if (!alphabetContainer) {
        console.error("❌ 未找到 #alphabetButtons，請檢查 HTML");
        return;
    }
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    alphabetContainer.innerHTML = alphabet
        .map(letter => `<button class='letter-btn' data-letter='${letter.toLowerCase()}'>${letter}</button>`)
        .join(" ");

    alphabetContainer.querySelectorAll(".letter-btn").forEach(button => {
        button.addEventListener("click", () => {
            const letter = button.getAttribute("data-letter");
            console.log("✅ 點擊字母:", letter);
            showWordsAndSentences("letter", letter);
        });
    });
}

// 新增函數：顯示單字並支持單字列表
function showWordsAndSentences(type, value) {
    console.log("✅ 進入 showWordsAndSentences, type:", type, "value:", value);
    parentLayer = "firstLayer";
    const titleText = type === "letter" ? value.toUpperCase() : 
                      type === "primary_category" ? `主分類: ${value}` : 
                      type === "secondary_category" ? `次分類: ${value}` : 
                      type === "category" ? value : `${value} Level`;
    document.getElementById("wordListTitle").innerHTML = `
        <span>${titleText}</span>
        <button id="autoPlayBtn" onclick="toggleAutoPlay()">自動播放</button>
    `;
    document.getElementById("wordListTitle").style.display = "block";

    lastWordListType = type;
    lastWordListValue = value;

    document.getElementById("searchContainer").style.display = "none";
    document.getElementById("startQuizBtn").style.display = "none";
    document.getElementById("wordQuizBtn").style.display = "none";
    document.getElementById("returnHomeBtn").style.display = "none";
    document.getElementById("sentencePageBtn").style.display = "none";
    // ▼▼▼ 更新的程式碼 ▼▼▼
    document.querySelector('.collapsible-section-wrapper').style.display = "none";
    // ▲▲▲ 更新的程式碼 ▲▲▲
    document.getElementById("wordList").style.display = "block";
    document.getElementById("sentenceList").style.display = "none";

    let wordItems = document.getElementById("wordItems");
    if (!wordItems) {
        console.error("❌ 未找到 #wordItems，請檢查 HTML");
        return;
    }
    wordItems.innerHTML = "";

    let filteredWords = wordsData.filter(w => {
        if (!w.Words) {
            console.warn("⚠️ wordsData 中存在無 Words 屬性的項目:", w);
            return false;
        }
        let word = w.Words;
        let category = w["分類"] || [];
        let level = w["等級"] || "未分類";
        if (type === "letter") return word.toLowerCase().startsWith(value.toLowerCase());
        if (type === "primary_category") return category[0] === value;
        if (type === "secondary_category") return category.slice(1).includes(value);
        if (type === "category") return category.includes(value);
        if (type === "level") return level === value;
        return false;
    });
    console.log("✅ 過濾後的單字數量:", filteredWords.length);

    if (filteredWords.length === 0) {
        wordItems.innerHTML = "<p>⚠️ 沒有符合的單字</p>";
    } else {
        currentWordList = filteredWords.map(w => w.Words);
        filteredWords.forEach(word => {
            let wordText = word.Words;
            let isChecked = localStorage.getItem(`checked_${wordText}`) === "true";
            let isImportant = localStorage.getItem(`important_${wordText}`) === "true";
            let iconSrc = isChecked ? "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/checked-icon.svg" : "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/check-icon.svg";

            let item = document.createElement('div');
            item.className = 'word-item-container';
            if (isChecked) item.classList.add("checked");
            item.innerHTML = `
                <input type='checkbox' class='important-checkbox' onchange='toggleImportant("${wordText}", this)' ${isImportant ? "checked" : ""}>
                <p class='word-item' data-word="${wordText}">${wordText}</p>
                <button class='check-button' onclick='toggleCheck("${wordText}", this)'>
                    <img src="${iconSrc}" class="check-icon" alt="Check" width="24" height="24">
                </button>
            `;
            wordItems.appendChild(item);

            item.querySelector('.word-item').addEventListener("click", () => {
                console.log("✅ 點擊單字:", wordText);
                showSentences(wordText);
            });
        });
    }
}

// ▼▼▼ 更新的程式碼從這裡開始 ▼▼▼
// 重寫 createCategoryButtons 函式以適應新結構
function createCategoryButtons() {
    if (!wordsData || !Array.isArray(wordsData)) return;
    
    // 從 wordsData 獲取主分類和次分類
    let primaryCategories = [...new Set(wordsData.map(w => w["分類"][0] || "未分類").filter(c => c))];
    let secondaryCategories = [...new Set(wordsData.flatMap(w => w["分類"].slice(1)).filter(c => c))];
    
    // 定義句子的特殊分類
    let specialCategories = [
        { label: "已經checked 句子", func: "showCheckedSentences()" },
        { label: "重要句子", func: "showImportantSentences()" },
        { label: "錯誤句子", func: "showWrongSentences()" },
        { label: "Note句子", func: "showSentenceNotes()" }
    ];

    // 填充主分類
    const primaryContainer = document.getElementById("primaryCategoryButtons");
    if (primaryContainer) {
        primaryContainer.innerHTML = primaryCategories
            .map(c => `<button class='letter-btn' onclick='showWordsAndSentences("primary_category", "${c}")'>${c}</button>`)
            .join(" ");
    }

    // 填充次分類
    const secondaryContainer = document.getElementById("secondaryCategoryButtons");
    if (secondaryContainer) {
        secondaryContainer.innerHTML = secondaryCategories
            .map(c => `<button class='letter-btn' onclick='showWordsAndSentences("secondary_category", "${c}")'>${c}</button>`)
            .join(" ");
    }

    // 渲染句子的特殊分類按鈕
    const specialContainer = document.getElementById("specialCategoryButtons");
    if (specialContainer) {
        specialContainer.innerHTML = specialCategories
            .map(cat => `<button class='letter-btn' onclick='${cat.func}'>${cat.label}</button>`)
            .join(" ");
    }
}
// ▲▲▲ 更新的程式碼到這裡結束 ▲▲▲

function showImportantSentences() {
    parentLayer = "firstLayer";
    console.log("進入 showImportantSentences, sentenceData.length:", sentenceData.length);
    
    document.getElementById("wordListTitle").innerHTML = `
        <span>重要句子</span>
        <button id="autoPlayBtn" onclick="toggleAutoPlay()">自動播放</button>
    `;
    document.getElementById("wordListTitle").style.display = "block";
    
    lastWordListType = "importantSentences";
    lastWordListValue = null;

    document.getElementById("searchContainer").style.display = "none";
    document.getElementById("startQuizBtn").style.display = "none";
    document.getElementById("wordQuizBtn").style.display = "none";
    document.getElementById("returnHomeBtn").style.display = "none";
    document.getElementById("sentencePageBtn").style.display = "none";
    // ▼▼▼ 更新的程式碼 ▼▼▼
    document.querySelector('.collapsible-section-wrapper').style.display = "none";
    // ▲▲▲ 更新的程式碼 ▲▲▲

    if (!sentenceData || sentenceData.length === 0) {
        console.error("❌ sentenceData 未載入或為空");
        document.getElementById("sentenceItems").innerHTML = "<p>⚠️ 資料載入失敗，請刷新頁面</p>";
        return;
    }

    let importantSentences = sentenceData.filter(s => localStorage.getItem(`important_sentence_${s.Words}`) === "true");
    console.log("過濾後的 importantSentences:", importantSentences);
    if (importantSentences.length === 0) {
        console.warn("⚠️ 沒有標記為重要的句子");
    }

    // 儲存單字列表以支持自動播放
    currentWordList = [...new Set(importantSentences.map(s => s.Words.split('-').slice(0, -1).join('-')))];
    currentSentenceList = sortSentencesByWordAndNumber(importantSentences);
    displaySentenceList(currentSentenceList);
}

function showCheckedSentences() {
    parentLayer = "firstLayer"; // 標記我們是從第一層進入的
    
    // 設定頁面標題，並加上自動播放按鈕
    document.getElementById("wordListTitle").innerHTML = `
        <span>已經checked 句子</span>
        <button id="autoPlayBtn" onclick="toggleAutoPlay()">自動播放</button>
    `;
    document.getElementById("wordListTitle").style.display = "block";
    
    // 記錄當前的篩選類型，以便返回時能恢復狀態
    lastWordListType = "checkedSentences";
    lastWordListValue = null;

    // 隱藏第一層的介面元素
    document.getElementById("searchContainer").style.display = "none";
    document.getElementById("startQuizBtn").style.display = "none";
    document.getElementById("wordQuizBtn").style.display = "none";
    document.getElementById("returnHomeBtn").style.display = "none";
    document.getElementById("sentencePageBtn").style.display = "none";
    // ▼▼▼ 更新的程式碼 ▼▼▼
    document.querySelector('.collapsible-section-wrapper').style.display = "none";
    // ▲▲▲ 更新的程式碼 ▲▲▲

    // 從 localStorage 中篩選出所有 key 為 "checked_sentence_..." 的項目
    let checkedSentences = sentenceData.filter(s => localStorage.getItem(`checked_sentence_${s.Words}`) === "true");

    if (checkedSentences.length === 0) {
        console.warn("⚠️ 沒有標記為 Checked 的句子");
    }

    // 將篩選結果存入當前句子列表，並排序
    currentSentenceList = sortSentencesByWordAndNumber(checkedSentences);
    
    // 使用現有的 displaySentenceList 函式來顯示列表
    displaySentenceList(currentSentenceList);
}

function showWrongSentences() {
    parentLayer = "firstLayer";
    document.getElementById("wordListTitle").innerHTML = `
        <span>錯誤句子</span>
        <button id="autoPlayBtn" onclick="toggleAutoPlay()">自動播放</button>
    `;
    document.getElementById("wordListTitle").style.display = "block";
    lastWordListType = "wrongSentences";
    lastWordListValue = null;

    document.getElementById("searchContainer").style.display = "none";
    document.getElementById("startQuizBtn").style.display = "none";
    document.getElementById("wordQuizBtn").style.display = "none";
    document.getElementById("returnHomeBtn").style.display = "none";
    document.getElementById("sentencePageBtn").style.display = "none";
    // ▼▼▼ 更新的程式碼 ▼▼▼
    document.querySelector('.collapsible-section-wrapper').style.display = "none";
    // ▲▲▲ 更新的程式碼 ▲▲▲

    let wrongSentences = JSON.parse(localStorage.getItem("wrongQS")) || [];
    let filteredSentences = sentenceData.filter(s => wrongSentences.includes(s.Words));
    if (filteredSentences.length === 0) console.warn("⚠️ 沒有標記為錯誤的句子");

    // 儲存單字列表以支持自動播放
    currentWordList = [...new Set(filteredSentences.map(s => s.Words.split('-').slice(0, -1).join('-')))];
    currentSentenceList = sortSentencesByWordAndNumber(filteredSentences);
    displaySentenceList(currentSentenceList);
}

function showSentenceNotes() {
    parentLayer = "firstLayer";
    console.log("進入 showSentenceNotes, sentenceData.length:", sentenceData.length);

    document.getElementById("wordListTitle").innerHTML = `
        <span>Note句子</span>
        <button id="autoPlayBtn" onclick="toggleAutoPlay()">自動播放</button>
    `;
    document.getElementById("wordListTitle").style.display = "block";

    lastWordListType = "sentenceNotes";
    lastWordListValue = null;

    document.getElementById("searchContainer").style.display = "none";
    document.getElementById("startQuizBtn").style.display = "none";
    document.getElementById("wordQuizBtn").style.display = "none";
    document.getElementById("returnHomeBtn").style.display = "none";
    document.getElementById("sentencePageBtn").style.display = "none";
    // ▼▼▼ 更新的程式碼 ▼▼▼
    document.querySelector('.collapsible-section-wrapper').style.display = "none";
    // ▲▲▲ 更新的程式碼 ▲▲▲

    if (!sentenceData || sentenceData.length === 0) {
        console.error("❌ sentenceData 未載入或為空");
        document.getElementById("sentenceItems").innerHTML = "<p>⚠️ 資料載入失敗，請刷新頁面</p>";
        return;
    }

    let noteSentences = sentenceData.filter(s => {
        const note = localStorage.getItem(`note_sentence_${s.Words}`);
        return note && note.length > 0;
    });
    console.log("過濾後的 noteSentences:", noteSentences);

    if (noteSentences.length === 0) {
        console.warn("⚠️ 沒有標記為 Note 的句子");
        document.getElementById("sentenceItems").innerHTML = "<p>⚠️ 目前沒有帶筆記的句子</p>";
        return;
    }

    // 儲存單字列表以支持自動播放
    currentWordList = [...new Set(noteSentences.map(s => s.Words.split('-').slice(0, -1).join('-')))];
    currentSentenceList = sortSentencesByWordAndNumber(noteSentences);
    console.log("排序後的 currentSentenceList:", currentSentenceList);
    displaySentenceList(currentSentenceList);
}

function showSentences(word) {
    console.log("✅ 進入 showSentences, word:", word);
    parentLayer = "wordList";
    document.getElementById("wordListTitle").innerHTML = `
        <span>${word}</span>
        <button id="autoPlayBtn" onclick="toggleAutoPlay()">自動播放</button>
    `;
    document.getElementById("wordListTitle").style.display = "block";

    document.getElementById("searchContainer").style.display = "none";
    document.getElementById("startQuizBtn").style.display = "none";
    document.getElementById("wordQuizBtn").style.display = "none";
    document.getElementById("returnHomeBtn").style.display = "none";
    document.getElementById("sentencePageBtn").style.display = "none";
    // ▼▼▼ 更新的程式碼 ▼▼▼
    document.querySelector('.collapsible-section-wrapper').style.display = "none";
    // ▲▲▲ 更新的程式碼 ▲▲▲
    document.getElementById("wordList").style.display = "none";
    document.getElementById("sentenceList").style.display = "block";
    document.querySelector('#sentenceList .back-button').style.display = "block";

    lastSentenceListWord = word;
    currentWordIndex = currentWordList.indexOf(word);

    let sentenceItems = document.getElementById("sentenceItems");
    sentenceItems.innerHTML = "";

    if (!sentenceData || !Array.isArray(sentenceData)) {
        sentenceItems.innerHTML = "<p>⚠️ 句子資料尚未載入，請稍後再試</p>";
        console.error("❌ sentenceData 未正確初始化:", sentenceData);
        return;
    }

    let filteredSentences = sentenceData.filter(s => {
        return s && s.Words && typeof s.Words === "string" && s.Words.startsWith(word + "-");
    });

    console.log(`✅ 過濾後的句子 (${word}):`, filteredSentences);

    currentSentenceList = filteredSentences.sort((a, b) => {
        const numA = parseInt(a.Words.split("-").pop(), 10);
        const numB = parseInt(b.Words.split("-").pop(), 10);
        return numA - numB;
    });

    if (currentSentenceList.length === 0) {
        sentenceItems.innerHTML = "<p>⚠️ 沒有符合的句子</p>";
    } else {
        currentSentenceList.forEach((s, index) => {
            let sentenceId = s.Words;
            let isImportant = localStorage.getItem(`important_sentence_${sentenceId}`) === "true";
            let isChecked = localStorage.getItem(`checked_sentence_${sentenceId}`) === "true";
            let iconSrc = isChecked 
                ? "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/checked-icon.svg" 
                : "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/check-icon.svg";

            const sentenceDisplay = isChecked 
                ? sentenceId 
                : `${sentenceId}: ${s.句子}`;

            let item = document.createElement("div");
            item.className = `word-item-container ${isChecked ? "checked" : ""}`;
            item.innerHTML = `
                <input type='checkbox' class='important-checkbox' onchange='toggleImportantSentence("${sentenceId}", this)' ${isImportant ? "checked" : ""}>
                <p class='word-item' data-sentence="${sentenceId}">${sentenceDisplay}</p>
                <button class='check-button' onclick='toggleCheckSentence("${sentenceId}", this)'>
                    <img src="${iconSrc}" class="check-icon" alt="Check" width="24" height="24">
                </button>
                <button class='audio-btn' onclick='playSentenceAudio("${sentenceId}.mp3")'>
                    <img src="https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/play.svg" alt="Play" width="24" height="24" />
                </button>
            `;
            sentenceItems.appendChild(item);

            item.querySelector('.word-item').addEventListener("click", () => showSentenceDetails(sentenceId, index));
        });
    }
    updateAutoPlayButton();
}

// 第一層：生成等級按鈕
function createLevelButtons() {
    let levels = [...new Set(wordsData.map(w => w["等級"] || "未分類"))];
    const levelContainer = document.getElementById("levelButtons");
    levelContainer.innerHTML = levels
        .map(l => `<button class='letter-btn' onclick='showWords("level", "${l}")'>${l}</button>`).join(" ");
}

// 第一層：搜尋功能
function filterSentences() {
    let input = document.getElementById("searchInput").value.toLowerCase();
    if (!wordsData.length) return;

    let filtered = wordsData.filter(w => w.Words.toLowerCase().startsWith(input));
    let searchResults = document.getElementById("searchResults") || document.createElement("div");
    searchResults.id = "searchResults";
    if (input === "") {
        searchResults.remove();
        return;
    }

    searchResults.innerHTML = filtered.length > 0
        ? filtered.map(w => `<p class='word-item' onclick='showSentences("${w.Words}")'>${w.Words}</p>`).join("")
        : "<p>⚠️ 沒有符合的單字</p>";
    document.getElementById("searchContainer").appendChild(searchResults);
}

// 排序absorb-1/absorb-2/absorb-10
function sortSentencesByWordAndNumber(sentences) {
    return sentences.sort((a, b) => {
        const wordA = a.Words.split("-").slice(0, -1).join("-");
        const wordB = b.Words.split("-").slice(0, -1).join("-");
        const numA = parseInt(a.Words.split("-").pop(), 10);
        const numB = parseInt(b.Words.split("-").pop(), 10);

        const wordComparison = wordA.localeCompare(wordB, undefined, { sensitivity: 'base' });
        if (wordComparison !== 0) return wordComparison;

        return numA - numB;
    });
}

function displaySentenceList(sentences) {
    const sentenceList = document.getElementById('sentenceList');
    sentenceList.style.display = "block";
    document.getElementById("wordList").style.display = "none";
    document.querySelector('#sentenceList .back-button').style.display = "block";

    const sentenceItems = document.getElementById('sentenceItems');
    sentenceItems.innerHTML = '';

    if (sentences.length === 0) {
        sentenceItems.innerHTML = "<p>⚠️ 目前沒有符合的句子</p>";
        return;
    }

    sentences.forEach(sentence => {
        const sentenceId = sentence.Words;
        const isChecked = localStorage.getItem(`checked_sentence_${sentenceId}`) === "true";
        const isImportant = localStorage.getItem(`important_sentence_${sentenceId}`) === "true";
        const iconSrc = isChecked 
            ? "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/checked-icon.svg" 
            : "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/check-icon.svg";

        const container = document.createElement('div');
        container.className = `word-item-container ${isChecked ? "checked" : ""}`;

        const sentenceDisplay = isChecked 
            ? sentenceId 
            : `${sentenceId}: ${sentence.句子}`;

        container.innerHTML = `
            <input type='checkbox' class='important-checkbox' onchange='toggleImportantSentence("${sentenceId}", this)' ${isImportant ? "checked" : ""}>
            <p class='word-item' data-sentence="${sentenceId}">${sentenceDisplay}</p>
            <button class='check-button' onclick='toggleCheckSentence("${sentenceId}", this)'>
                <img src="${iconSrc}" class="check-icon" alt="Check" width="24" height="24">
            </button>
            <button class='audio-btn' onclick='playSentenceAudio("${sentenceId}.mp3")'>
                <img src="https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/play.svg" alt="Play" width="24" height="24" />
            </button>
        `;

        sentenceItems.appendChild(container);

        container.querySelector('.word-item').addEventListener("click", () => showSentenceDetails(sentenceId));
    });

    updateAutoPlayButton();
}

function getAutoPlayBtn() {
    const btn1 = document.getElementById("autoPlayBtn");
    const btn2 = document.getElementById("autoPlayBtnDetails");
    if (btn2 && btn2.offsetParent !== null) return btn2;
    if (btn1 && btn1.offsetParent !== null) return btn1;
    return btn1 || btn2;
}

function toggleAutoPlay() {
    const autoPlayBtn = getAutoPlayBtn();
    if (!autoPlayBtn) return;
    
    if (isAutoPlaying) {
        stopAutoPlay();
        autoPlayBtn.textContent = "自動播放";
        autoPlayBtn.classList.remove("auto-playing");
    } else {
        startAutoPlay();
        autoPlayBtn.textContent = "取消播放";
        autoPlayBtn.classList.add("auto-playing");
    }
}

function startAutoPlay() {
    const autoPlayBtn = getAutoPlayBtn();
    isAutoPlaying = true;

    if (document.getElementById("wordList").style.display === "block") {
        currentWordIndex = 0;
        playNextWord();

    } else if (document.getElementById("sentenceList").style.display === "block") {
        currentSentenceIndex = 0;
        playNextSentence();

    } else if (document.getElementById("sentenceDetails").style.display === "block") {
        playCurrentSentence();
    }

    autoPlayBtn.textContent = "取消播放";
    autoPlayBtn.classList.add("auto-playing");
}

function stopAutoPlay() {
    const autoPlayBtn = document.getElementById("autoPlayBtn") || document.getElementById("autoPlayBtnDetails");
    isAutoPlaying = false;
    sentenceAudio.pause();
    autoPlayBtn.textContent = "自動播放";
    autoPlayBtn.classList.remove("auto-playing");
}

function playNextWord() {
    if (currentWordIndex < currentWordList.length) {
        const word = currentWordList[currentWordIndex];
        showSentences(word);
        currentSentenceIndex = 0;
        playNextSentence();
    } else {
        stopAutoPlay();
    }
}

function playNextSentence() {
    if (currentSentenceIndex < currentSentenceList.length) {
        const sentenceId = currentSentenceList[currentSentenceIndex].Words;
        showSentenceDetails(sentenceId);
        playSentenceAudio(`${sentenceId}.mp3`);
        sentenceAudio.onended = () => {
            currentSentenceIndex++;
            if (currentSentenceIndex < currentSentenceList.length) {
                playNextSentence();
            } else {
                currentWordIndex++;
                playNextWord();
            }
        };
    } else {
        currentWordIndex++;
        playNextWord();
    }
}

function playCurrentSentence() {
    const sentenceId = currentSentenceList[currentSentenceIndex].Words;
    playSentenceAudio(`${sentenceId}.mp3`);
    sentenceAudio.onended = () => {
        currentSentenceIndex++;
        if (currentSentenceIndex < currentSentenceList.length) {
            showSentenceDetails(currentSentenceList[currentSentenceIndex].Words);
            playCurrentSentence();
        } else {
            currentWordIndex++;
            playNextWord();
        }
    };
}

function updateAutoPlayButton() {
    const autoPlayBtn = getAutoPlayBtn();
    if (!autoPlayBtn) return;
    
    autoPlayBtn.textContent = isAutoPlaying ? "取消播放" : "自動播放";
    autoPlayBtn.classList.toggle("auto-playing", isAutoPlaying);
}


// 第二層：顯示單字列表
function showWords(type, value) {
    console.log("📌 點擊分類/等級/A-Z 按鈕:", type, value);
    let titleText;
    if (type === "letter") {
        titleText = value.toUpperCase();
    } else if (type === "primary_category") {
        titleText = `主分類: ${value}`;
    } else if (type === "secondary_category") {
        titleText = `次分類: ${value}`;
    } else if (type === "level") {
        titleText = `${value} Level`;
    } else {
        titleText = value;
    }

    document.getElementById("wordListTitle").innerHTML = `
        <span>${titleText}</span>
        <button id="autoPlayBtn" onclick="toggleAutoPlay()">自動播放</button>
    `;
    document.getElementById("wordListTitle").style.display = "block";

    lastWordListType = type;
    lastWordListValue = value;

    document.getElementById("searchContainer").style.display = "none";
    document.getElementById("startQuizBtn").style.display = "none";
    document.getElementById("wordQuizBtn").style.display = "none";
    document.getElementById("returnHomeBtn").style.display = "none";
    document.getElementById("sentencePageBtn").style.display = "none";
    document.querySelector('.collapsible-section-wrapper').style.display = "none";
    document.getElementById("sentenceList").style.display = "none";
    document.getElementById("sentenceDetails").style.display = "none";

    let wordList = document.getElementById("wordList");
    wordList.style.display = "block";
    
    let wordItems = document.getElementById("wordItems");
    wordItems.innerHTML = "";

   
    let filteredWords = wordsData.filter(w => {
        if (!w.Words) {
            console.warn("⚠️ wordsData 中存在無 Words 屬性的項目:", w);
            return false;
        }
        let word = w.Words;
        let category = w["分類"] || [];
        let level = w["等級"] || "未分類";

        if (type === "letter") return word.toLowerCase().startsWith(value.toLowerCase());
        if (type === "primary_category") return category[0] === value; // 新增的邏輯
        if (type === "secondary_category") return category.slice(1).includes(value); // 新增的邏輯
        if (type === "category") return category.includes(value);
        if (type === "level") return level === value;
        return false;
    });

    console.log("✅ 過濾後的單字數量:", filteredWords.length);

    if (filteredWords.length === 0) {
        wordItems.innerHTML = "<p>⚠️ 沒有符合的單字</p>";
    } else {
        currentWordList = filteredWords.map(w => w.Words);
        filteredWords.forEach(word => {
            let wordText = word.Words;
            let isChecked = localStorage.getItem(`checked_${wordText}`) === "true";
            let isImportant = localStorage.getItem(`important_${wordText}`) === "true";
            let iconSrc = isChecked ? "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/checked-icon.svg" : "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/check-icon.svg";

            let item = document.createElement('div');
            item.className = 'word-item-container';
            if (isChecked) item.classList.add("checked");
            item.innerHTML = `
                <input type='checkbox' class='important-checkbox' onchange='toggleImportant("${wordText}", this)' ${isImportant ? "checked" : ""}>
                <p class='word-item' data-word="${wordText}">${wordText}</p>
                <button class='check-button' onclick='toggleCheck("${wordText}", this)'>
                    <img src="${iconSrc}" class="check-icon" alt="Check" width="24" height="24">
                </button>
            `;
            wordItems.appendChild(item);

            item.querySelector('.word-item').addEventListener("click", () => showSentences(wordText));
        });
    }
}

// 第二層：勾選與標記功能
function toggleCheck(word, button) {
    let isChecked = localStorage.getItem(`checked_${word}`) === "true";
    let icon = button.querySelector("img");
    let container = button.closest(".word-item-container");

    if (isChecked) {
        localStorage.removeItem(`checked_${word}`);
        icon.src = "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/check-icon.svg";
        container.classList.remove("checked");
        container.style.opacity = "1";
    } else {
        localStorage.setItem(`checked_${word}`, "true");
        icon.src = "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/checked-icon.svg";
        container.classList.add("checked");
        container.style.opacity = "0.3";
    }
}

function toggleImportant(word, checkbox) {
    if (checkbox.checked) localStorage.setItem(`important_${word}`, "true");
    else localStorage.removeItem(`important_${word}`);
}

function toggleCheckSentence(sentenceId, button) {
    const isChecked = localStorage.getItem(`checked_sentence_${sentenceId}`) === "true";
    const newState = !isChecked;

    localStorage.setItem(`checked_sentence_${sentenceId}`, newState);

    const icon = button.querySelector('img');
    icon.src = newState 
        ? "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/checked-icon.svg" 
        : "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/check-icon.svg";

    const container = button.parentElement;
    const wordItem = container.querySelector('.word-item');
    const sentenceObj = sentenceData.find(s => s.Words === sentenceId);

    if (newState) {
        container.classList.add('checked');
        wordItem.textContent = sentenceId;
    } else {
        container.classList.remove('checked');
        wordItem.textContent = `${sentenceId}: ${sentenceObj.句子}`;
    }
}

function showCheckedWords() {
    document.getElementById("wordListTitle").innerHTML = `
        <span>Checked 單字</span>
        <button id="autoPlayBtn" onclick="toggleAutoPlay()">自動播放</button>
    `;
    document.getElementById("wordListTitle").style.display = "block";
    lastWordListType = "checked";
    lastWordListValue = null;

    document.getElementById("searchContainer").style.display = "none";
    document.getElementById("startQuizBtn").style.display = "none";
    document.getElementById("wordQuizBtn").style.display = "none";
    document.getElementById("returnHomeBtn").style.display = "none";
    document.getElementById("sentencePageBtn").style.display = "none";
    // ▼▼▼ 更新的程式碼 ▼▼▼
    document.querySelector('.collapsible-section-wrapper').style.display = "none";
    // ▲▲▲ 更新的程式碼 ▲▲▲

    currentWordList = wordsData.filter(w => localStorage.getItem(`checked_${w.Words}`) === "true").map(w => w.Words);
    displayWordList(currentWordList);
}

function showImportantWords() {
    document.getElementById("wordListTitle").innerHTML = `
        <span>重要單字</span>
        <button id="autoPlayBtn" onclick="toggleAutoPlay()">自動播放</button>
    `;
    document.getElementById("wordListTitle").style.display = "block";
    lastWordListType = "important";
    lastWordListValue = null;

    document.getElementById("searchContainer").style.display = "none";
    document.getElementById("startQuizBtn").style.display = "none";
    document.getElementById("wordQuizBtn").style.display = "none";
    document.getElementById("returnHomeBtn").style.display = "none";
    document.getElementById("sentencePageBtn").style.display = "none";
    // ▼▼▼ 更新的程式碼 ▼▼▼
    document.querySelector('.collapsible-section-wrapper').style.display = "none";
    // ▲▲▲ 更新的程式碼 ▲▲▲

    currentWordList = wordsData.filter(w => localStorage.getItem(`important_${w.Words}`) === "true").map(w => w.Words);
    displayWordList(currentWordList);
}

function showWrongWords() {
    document.getElementById("wordListTitle").innerHTML = `
        <span>錯誤單字</span>
        <button id="autoPlayBtn" onclick="toggleAutoPlay()">自動播放</button>
    `;
    document.getElementById("wordListTitle").style.display = "block";
    lastWordListType = "wrong";
    lastWordListValue = null;

    document.getElementById("searchContainer").style.display = "none";
    document.getElementById("startQuizBtn").style.display = "none";
    document.getElementById("wordQuizBtn").style.display = "none";
    document.getElementById("returnHomeBtn").style.display = "none";
    document.getElementById("sentencePageBtn").style.display = "none";
    // ▼▼▼ 更新的程式碼 ▼▼▼
    document.querySelector('.collapsible-section-wrapper').style.display = "none";
    // ▲▲▲ 更新的程式碼 ▲▲▲

    let wrongWords = JSON.parse(localStorage.getItem("wrongWords")) || [];
    currentWordList = wrongWords;
    displayWordList(wrongWords);
}

function displayWordList(words) {
    document.getElementById("searchContainer").style.display = "none";
    document.getElementById("startQuizBtn").style.display = "none";
    document.getElementById("wordQuizBtn").style.display = "none";
    document.getElementById("returnHomeBtn").style.display = "none";
    document.getElementById("sentencePageBtn").style.display = "none";
    document.getElementById("wordList").style.display = "block";
    // ▼▼▼ 更新的程式碼 ▼▼▼
    document.querySelector('.collapsible-section-wrapper').style.display = "none";
    // ▲▲▲ 更新的程式碼 ▲▲▲

    let wordItems = document.getElementById("wordItems");
    wordItems.innerHTML = words.length > 0
        ? words.map(word => {
            let isChecked = localStorage.getItem(`checked_${word}`) === "true";
            let isImportant = localStorage.getItem(`important_${word}`) === "true";
            let iconSrc = isChecked ? "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/checked-icon.svg" : "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/check-icon.svg";
            return `
                <div class='word-item-container ${isChecked ? "checked" : ""}'>
                    <input type='checkbox' class='important-checkbox' onchange='toggleImportant("${word}", this)' ${isImportant ? "checked" : ""}>
                    <p class='word-item' data-word="${word}" onclick='showSentences("${word}")'>${word}</p>
                    <button class='check-button' onclick='toggleCheck("${word}", this)'>
                        <img src="${iconSrc}" class="check-icon" alt="Check" width="24" height="24">
                    </button>
                </div>`;
        }).join("")
        : "<p>⚠️ 目前沒有符合的單字</p>";
}

function toggleImportantSentence(sentenceId, checkbox) {
    if (checkbox.checked) localStorage.setItem(`important_sentence_${sentenceId}`, "true");
    else localStorage.removeItem(`important_sentence_${sentenceId}`);
}

function showSentenceDetails(sentenceId, index = -1, direction = null) {
    let sentenceObj = sentenceData.find(s => s.Words === sentenceId);
    if (!sentenceObj) {
        console.error(`❌ 未找到句子: ${sentenceId}`);
        return;
    }

    if (isQuizMode && index === -1) {
        console.log("✅ 測驗模式：保持 currentSentenceList 不變");
    } else if (index !== -1) {
        currentSentenceIndex = index;
    } else if (currentSentenceList.length > 0 && currentSentenceIndex === -1) {
        currentSentenceIndex = currentSentenceList.findIndex(s => s.Words === sentenceId);
    }

    parentLayer = "sentenceList";

    console.log("進入 showSentenceDetails - sentenceId:", sentenceId);
    console.log("當前句子列表:", currentSentenceList);
    console.log("當前索引:", currentSentenceIndex);
    console.log("測驗模式:", isQuizMode);

    const detailsArea = document.getElementById("sentenceDetails");

    if (direction === "from-right") {
        detailsArea.classList.add("sliding-in-from-right");
    } else if (direction === "from-left") {
        detailsArea.classList.add("sliding-in-from-left");
    }

    let word = sentenceId.replace(/-\d+$/, "");
    let wordObj = wordsData.find(w => w.Words === word);
    let header = `
    <div class="phonetics-container">
        <input type='checkbox' class='important-checkbox' onchange='toggleImportantSentence("${sentenceId}", this)' ${localStorage.getItem(`important_sentence_${sentenceId}`) === "true" ? "checked" : ""}>
        <div id="sentenceTitle" style="font-size: 20px; font-weight: bold;">${sentenceId}</div>
        <button id="autoPlayBtnDetails" onclick="toggleAutoPlay()">自動播放</button>
    </div>`;
    let phonetics = wordObj ? 
        ((wordObj["pronunciation-1"] ? `<button class='button' onclick='playAudio("${word}.mp3")'>${wordObj["pronunciation-1"]}</button>` : "") +
        (wordObj["pronunciation-2"] ? `<button class='button' onclick='playAudio("${word} 2.mp3")'>${wordObj["pronunciation-2"]}</button>` : "") || "<p>No pronunciation available</p>") : 
        "<p>No pronunciation available</p>";
        
    let sentenceText = `<p>${sentenceObj.句子}</p>`;
    let chineseText = `<p>${sentenceObj.中文}</p>`;

    let wordToHighlight = sentenceId.replace(/-\d+$/, "");
    const highlightRegex = createWordVariationsRegex(wordToHighlight);
    sentenceText = sentenceText.replace(highlightRegex, (match) => `<span class="highlight-word">${match}</span>`);

    document.getElementById("sentenceHeader").innerHTML = header;
    document.getElementById("phoneticContainer").innerHTML = phonetics;
    document.getElementById("sentenceContainer").innerHTML = sentenceText;
    document.getElementById("chineseContainer").innerHTML = chineseText;

    const playAudioBtn = document.getElementById("playAudioBtn");
    playAudioBtn.setAttribute("onclick", `playSentenceAudio("${sentenceId}.mp3")`);
    playAudioBtn.classList.remove("playing");

    playAudioBtn.addEventListener("touchstart", (event) => event.stopPropagation(), { passive: true });
    playAudioBtn.addEventListener("touchmove", (event) => event.stopPropagation(), { passive: true });
    playAudioBtn.addEventListener("touchend", (event) => event.stopPropagation());

    displayNote(sentenceId);

    document.getElementById("sentenceList").style.display = "none";
    document.getElementById("sentenceDetails").style.display = "block";
    document.getElementById("wordListTitle").style.display = "none";
    document.getElementById("searchContainer").style.display = "none";
    document.getElementById("startQuizBtn").style.display = "none";
    document.getElementById("wordQuizBtn").style.display = "none";
    document.getElementById("returnHomeBtn").style.display = "none";
    document.getElementById("sentencePageBtn").style.display = "none";
    // ▼▼▼ 更新的程式碼 ▼▼▼
    document.querySelector('.collapsible-section-wrapper').style.display = "none";
    // ▲▲▲ 更新的程式碼 ▲▲▲
    document.getElementById("wordList").style.display = "none";

    if (direction) {
        setTimeout(() => {
            detailsArea.style.transform = "translateX(0)";
            detailsArea.classList.remove("sliding-in-from-right", "sliding-in-from-left");
        }, 10);
    }

    updateAutoPlayButton();
}

let wordAudio = new Audio();
function playAudio(filename) {
    wordAudio.src = `https://github.com/BoydYang-Designer/English-vocabulary/raw/main/audio_files/${filename}`;
    wordAudio.play();
}

function switchToPreviousSentence() {
    if (currentSentenceIndex > 0) {
        currentSentenceIndex--;
        showSentenceDetails(currentSentenceList[currentSentenceIndex].Words, currentSentenceIndex);
    }
}

function switchToNextSentence() {
    if (currentSentenceIndex < currentSentenceList.length - 1) {
        currentSentenceIndex++;
        showSentenceDetails(currentSentenceList[currentSentenceIndex].Words, currentSentenceIndex);
    }
}

function playSentenceAudio(filename) {
    console.log("開始播放:", filename);
    const playButtons = document.querySelectorAll(`.audio-btn[onclick="playSentenceAudio('${filename}')"]`);
    const playBtn = playButtons[playButtons.length - 1] || document.getElementById("playAudioBtn");
    sentenceAudio.src = `https://github.com/BoydYang-Designer/English-vocabulary/raw/main/Sentence%20file/${filename}`;
    if (playBtn) {
        playBtn.classList.add("playing");
        lastPlayBtn = playBtn;
    }
    sentenceAudio.play()
        .then(() => console.log(`✅ 播放 ${filename} 成功`))
        .catch(error => {
            console.error(`🔊 播放 ${filename} 失敗:`, error);
            if (playBtn) playBtn.classList.remove("playing");
            if (isAutoPlaying && !isPaused) {
                currentSentenceIndex++;
                if (currentSentenceIndex < currentSentenceList.length) {
                    playCurrentSentence();
                } else {
                    currentWordIndex++;
                    playNextWord();
                }
            }
        });
    sentenceAudio.onended = () => {
        if (playBtn) playBtn.classList.remove("playing");
        console.log(`✅ ${filename} 播放結束`);
        if (isAutoPlaying && !isPaused) {
            currentSentenceIndex++;
            if (currentSentenceIndex < currentSentenceList.length) {
                playCurrentSentence();
            } else {
                currentWordIndex++;
                playNextWord();
            }
        }
    };
    document.querySelectorAll(".audio-btn.playing").forEach(btn => {
        if (btn !== playBtn) btn.classList.remove("playing");
    });
}

function togglePauseAudio(button) {
    const pauseBtn = button;
    const playIcon  = '<img src="https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/play.svg"  alt="Play"  width="24" height="24"/>';
    const pauseIcon = '<img src="https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/pause.svg" alt="Pause" width="24" height="24"/>';

    if (sentenceAudio.paused || sentenceAudio.ended) {
        sentenceAudio.play();
        pauseBtn.innerHTML = pauseIcon;
        pauseBtn.classList.remove("auto-playing");
        if (lastPlayBtn) lastPlayBtn.classList.add("playing");
    } else {
        sentenceAudio.pause();
        pauseBtn.innerHTML = playIcon;
        pauseBtn.classList.add("auto-playing");
        if (lastPlayBtn) lastPlayBtn.classList.remove("playing");
    }
}


function adjustAudioTime(seconds) {
    sentenceAudio.currentTime = Math.max(0, sentenceAudio.currentTime + seconds);
}

function filterSentencesInDetails() {
    let input = document.getElementById("searchInputDetails").value.toLowerCase();
    let searchResults = document.getElementById("searchResultsDetails");

    if (!wordsData || wordsData.length === 0) {
        console.error("❌ wordsData 未加載");
        return;
    }

    if (!searchResults) return;

    if (input === "") {
        searchResults.innerHTML = "";
        return;
    }

    let filtered = wordsData.filter(w => {
        let word = w.Words || w.word || w["單字"] || "";
        return word.toLowerCase().startsWith(input);
    });

    searchResults.innerHTML = "";
    if (filtered.length === 0) {
        searchResults.innerHTML = "<p>⚠️ 沒有符合的單字</p>";
    } else {
        filtered.forEach(wordObj => {
            let wordText = wordObj.Words || wordObj.word || wordObj["單字"] || "";
            let item = document.createElement("p");
            item.className = "word-item";
            item.textContent = wordText;
            item.addEventListener("click", function() {
                let currentSentenceId = document.getElementById("sentenceTitle")?.textContent.trim() || lastSentenceListWord;
                window.location.href = `index.html?word=${encodeURIComponent(wordText)}&from=sentence&sentenceId=${encodeURIComponent(currentSentenceId)}`;
            });
            searchResults.appendChild(item);
        });
    }
}

function saveNote() {
    let sentenceId = document.getElementById("sentenceTitle")?.textContent.trim();
    let note = document.getElementById("sentenceNote").value.trim();
    let checkbox = document.getElementById("noteCheckbox");

    if (checkbox.checked || note.length > 0) {
        localStorage.setItem(`note_sentence_${sentenceId}`, note);
        document.getElementById("savedNote").textContent = "✅ Note saved!";
    } else {
        localStorage.removeItem(`note_sentence_${sentenceId}`);
        document.getElementById("savedNote").textContent = "🗑️ Note deleted!";
    }
    setTimeout(() => document.getElementById("savedNote").textContent = "", 3000);
}

function displayNote(sentenceId) {
    let note = localStorage.getItem(`note_sentence_${sentenceId}`) || "";
    document.getElementById("sentenceNote").value = note;
    document.getElementById("noteCheckbox").checked = note.length > 0;
}

function updateCheckbox() {
    let note = document.getElementById("sentenceNote").value.trim();
    document.getElementById("noteCheckbox").checked = note.length > 0;
}

function handleCheckboxClick() {
    let checkbox = document.getElementById("noteCheckbox");
    if (!checkbox.checked) localStorage.removeItem(`note_sentence_${document.getElementById("sentenceTitle").textContent.trim()}`);
}

function exportAllData() {
    let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(localStorage, null, 2));
    let downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "localStorage_backup.json");
    downloadAnchor.click();
    downloadAnchor.remove();
}

function importAllData() {
    let fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".json";
    fileInput.onchange = function (event) {
        let file = event.target.files[0];
        let reader = new FileReader();
        reader.onload = function (event) {
            let importedData = JSON.parse(event.target.result);
            localStorage.clear();
            Object.keys(importedData).forEach(key => localStorage.setItem(key, importedData[key]));
            location.reload();
        };
        reader.readAsText(file);
    };
    fileInput.click();
}

function backToFirstLayer() {
    document.getElementById("searchContainer").style.display = "block";
    document.getElementById("startQuizBtn").style.display = "block";
    document.getElementById("wordQuizBtn").style.display = "block";
    document.getElementById("returnHomeBtn").style.display = "block";
    document.getElementById("sentencePageBtn").style.display = "block";
    document.getElementById("wordList").style.display = "none";
    document.getElementById("sentenceList").style.display = "none";
    document.getElementById("sentenceDetails").style.display = "none";
    // ▼▼▼ 更新的程式碼 ▼▼▼
    document.querySelector('.collapsible-section-wrapper').style.display = "block";
    // ▲▲▲ 更新的程式碼 ▲▲▲
    document.getElementById("searchInput").value = "";
    let searchResults = document.getElementById("searchResults");
    if (searchResults) searchResults.remove();

    let wordListTitle = document.getElementById("wordListTitle");
    wordListTitle.style.display = "none";
    wordListTitle.innerText = "";
}

function backToWordList() {
    console.log("✅ 進入 backToWordList, parentLayer:", parentLayer);
    document.getElementById("sentenceList").style.display = "none";
    document.getElementById("sentenceDetails").style.display = "none"; // 確保詳情頁也隱藏
    
    if (parentLayer === "firstLayer") {
        backToFirstLayer();
    } else if (parentLayer === "wordList") {
        console.log("✅ 返回單字列表, lastWordListType:", lastWordListType, "lastWordListValue:", lastWordListValue);
        document.getElementById("wordList").style.display = "block"; // 強制顯示單字列表
        document.getElementById("wordListTitle").style.display = "block"; // 顯示標題
        
        if (lastWordListType && lastWordListValue) {
            showWords(lastWordListType, lastWordListValue); // 重新渲染單字列表
        } else {
            console.warn("⚠️ lastWordListType 或 lastWordListValue 未設置，返回第一層");
            backToFirstLayer();
        }
    } else {
        console.warn("⚠️ parentLayer 未定義，返回第一層");
        backToFirstLayer();
    }
}

function backToSentenceList(event) {
    event.stopPropagation();

    if (isAutoPlaying) {
        isAutoPlaying = false;
        isPaused = false;
        if (sentenceAudio && sentenceAudio.readyState >= 2) {
            sentenceAudio.pause();
        }
    }

    document.getElementById("sentenceDetails").style.display = "none";

    const urlParams = new URLSearchParams(window.location.search);
    const fromParam = urlParams.get('from');

    if (fromParam === 'quiz') {
        window.location.href = "quiz.html?returning=true";
    } else if (parentLayer === "sentenceList") {
        document.getElementById("sentenceList").style.display = "block";
        document.getElementById("wordListTitle").style.display = "block";

        if (lastWordListType === "sentenceNotes") {
            showSentenceNotes();
        } else if (lastWordListType === "importantSentences") {
            showImportantSentences();
        } else if (lastWordListType === "wrongSentences") {
            showWrongSentences();
        } else if (lastWordListType === "checkedSentences") {
            showCheckedSentences();
        } else if (lastSentenceListWord) {
            showSentences(lastSentenceListWord);
        } else if (currentSentenceList.length > 0) {
            displaySentenceList(currentSentenceList);
        } else {
            console.warn("⚠️ 無法確定句子列表上下文，返回第一層");
            backToFirstLayer();
        }
    } else {
        console.warn("⚠️ parentLayer 未正確設置為 sentenceList，返回第一層");
        backToFirstLayer();
    }
}