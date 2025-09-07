let selectedCategory = null;
let selectedFilters = {
    letters: new Set(),
    primaryCategories: new Set(),
    secondaryCategories: new Set(),
    levels: new Set(),
    checked: false,
    important: false,
    wrong: false
};
let wordsData = [];
let quizWords = [];
let currentWord = null;
let isDataLoaded = false;
let quizResults = [];
const baseURL = "https://github.com/BoydYang-Designer/English-vocabulary/raw/main/audio_files/";

// --- 新增：測驗歷史紀錄 ---
let wordQuizHistory = {};

document.addEventListener("DOMContentLoaded", function () {
    const params = new URLSearchParams(window.location.search);
    const show = params.get("show");

    const loadingOverlay = document.getElementById('loadingOverlay');

    // 載入測驗歷史
    wordQuizHistory = JSON.parse(localStorage.getItem('wordQuizHistory')) || {};

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

    const sentenceButton = document.getElementById("sentencePageBtn");
    if (sentenceButton) {
        sentenceButton.addEventListener("click", function () {
            window.location.href = "sentence.html";
        });
    }

    fetch("https://boydyang-designer.github.io/English-vocabulary/audio_files/Z_total_words.json")
        .then(res => {
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res.json();
        })
        .then(data => {
            wordsData = data["New Words"] || [];
            wordsData.forEach(w => {
                if (typeof w["分類"] === "string") {
                    w["分類"] = [w["分類"]];
                } else if (!Array.isArray(w["分類"])) {
                    w["分類"] = [];
                }
            });
            isDataLoaded = true;
            console.log("✅ 單字資料已載入");
            console.log("📖 已載入單字測驗歷史:", Object.keys(wordQuizHistory).length, "筆");
            
            // 顯示成功提示
            showToast("✅ 資料載入成功！", "success");

            // --- 原有的邏輯繼續 ---
            if (params.get('returning') === 'true' && localStorage.getItem("currentQuizResults")) {
                quizResults = JSON.parse(localStorage.getItem("currentQuizResults"));
                restoreQuizResults();
            } else if (show === "categories") {
                const wordQuizBtn = document.getElementById('wordQuizBtn');
                if(wordQuizBtn) wordQuizBtn.style.backgroundColor = '#28a745';
                showQuizCategories();
            } else if (show === "sentenceCategories") {
                const startQuizBtn = document.getElementById('startQuizBtn');
                if(startQuizBtn) startQuizBtn.style.backgroundColor = '#28a745';
                showSentenceQuizCategories();
            } else {
                const wordQuizBtn = document.getElementById('wordQuizBtn');
                if(wordQuizBtn) wordQuizBtn.style.backgroundColor = '#28a745';
                showQuizCategories();
            }
        })
        .catch(err => {
            console.error("❌ 讀取 JSON 失敗:", err);
            // 顯示錯誤提示，並移除原有的 alert
            showToast("⚠️ 無法載入單字資料，請檢查網路連線。", "error");
        })
        .finally(() => {
            // 無論成功或失敗，都在最後隱藏載入畫面
            if (loadingOverlay) {
                loadingOverlay.style.opacity = '0';
                // 等待淡出動畫結束後再徹底隱藏，避免閃爍
                setTimeout(() => {
                    loadingOverlay.style.display = 'none';
                }, 500);
            }
        });

    initializeStartQuizButton();

    document.addEventListener("keydown", function(event) {
        if (event.key === " " || event.key === "Spacebar") {
            event.preventDefault();
            if (currentWord) {
                playAudioForWord(currentWord);
            }
        }

        let activeInput = document.querySelector("#wordInput input:focus");

        if (activeInput && event.key === "ArrowLeft") {
            let previousInput = activeInput.previousElementSibling;
            if (previousInput) {
                previousInput.focus();
            }
        }

        if (activeInput && event.key === "ArrowRight") {
            let nextInput = activeInput.nextElementSibling;
            if (nextInput) {
                nextInput.focus();
            }
        }

        if (event.key === "Backspace") {
            if (activeInput && activeInput.value === "") {
                let previousInput = activeInput.previousElementSibling;
                if (previousInput) {
                    previousInput.focus();
                }
            }
        }
    });
});
    
    function playAudioForWord(word) {
        let audioLink = `${baseURL}${word}.mp3`;
        let audio = new Audio(audioLink);
        audio.play().catch((error) => {
            console.error("❌ 播放音檔失敗:", error);
        });
    }

// 返回首頁
function goBack() {
    window.location.href = "index.html";
}

function returnToSourcePage() {
    const params = new URLSearchParams(window.location.search);
    const from = params.get("from");

    if (from === "sentence") {
        window.location.href = "sentence.html"; // 返回到 sentence.html
    } else if (from === "index") {
        window.location.href = "index.html";
    } else {
        // 預設行為：返回主選單
        returnToMainMenu();
    }
}


// 返回分類選擇頁面
function returnToCategorySelection() {
    document.getElementById("quizArea").style.display = "none"; // 隱藏單字測驗區
    document.getElementById("rewordQuizArea").style.display = "none"; // 隱藏單字重組測驗區
    document.getElementById("quizCategories").style.display = "block"; // 顯示分類區
    let quizTypeSelection = document.getElementById("quizTypeSelection");
    if (quizTypeSelection) {
        quizTypeSelection.style.display = "none"; // 隱藏測驗類型選擇區
    }
}

// 篩選與多選功能
function toggleSelection(type, value) {
    if (selectedFilters[type].has(value)) {
        selectedFilters[type].delete(value);
    } else {
        selectedFilters[type].add(value);
    }
    updateButtonSelectionState(type, value); // 更新按鈕顏色狀態
}

function toggleCheckedSelection() {
    selectedFilters.checked = !selectedFilters.checked;
    // 將 #checkedCategory button 改為 #specialCategoryButtons button:nth-child(1)
    let checkedButton = document.querySelector("#specialCategoryButtons button:nth-child(1)"); 
    if (selectedFilters.checked) {
        checkedButton.classList.add("selected");
    } else {
        checkedButton.classList.remove("selected");
    }
}

// 更新按鈕選擇狀態（加上或移除背景色）
function updateButtonSelectionState(type, value) {
    let buttonSelector = `.category-button[onclick*="${value}"]`;
    let button = document.querySelector(buttonSelector);

    if (button) {
        if (selectedFilters[type].has(value)) {
            button.classList.add("selected"); // 高亮顯示已選按鈕
        } else {
            button.classList.remove("selected"); // 移除高亮
        }
    }
}


function filterQuizWords(event) {
    let filteredWords = wordsData.filter(word => {
    // === 基本檢查 ===
    let wordText = word.Words || word.word || word["單字"];
    if (!wordText) return false;

    let letterMatch = selectedFilters.letters.size === 0 ||
        selectedFilters.letters.has(wordText[0].toUpperCase());

    // === 主分類 / 次分類 ===
    let category = word["分類"] || [];
    let primary = category[0] || "未分類";
    let secondary = category.slice(1);

    // 主分類條件：如果沒選就不限制，有選就要符合其中一個
    let primaryMatch = selectedFilters.primaryCategories.size === 0 ||
        selectedFilters.primaryCategories.has(primary);

    // 次分類條件：如果沒選就不限制，有選就至少要符合一個
    let secondaryMatch = selectedFilters.secondaryCategories.size === 0 ||
        secondary.some(c => selectedFilters.secondaryCategories.has(c));

    // === 等級 / Checked / 重要 / 錯誤 單字 ===
    let level = word["等級"] || "未分類";
    let levelMatch = selectedFilters.levels.size === 0 || selectedFilters.levels.has(level);

    let checkedMatch = !selectedFilters.checked ||
        localStorage.getItem(`checked_${wordText}`) === "true";

    let importantMatch = !selectedFilters.important ||
        localStorage.getItem(`important_${wordText}`) === "true";

    let wrongWords = JSON.parse(localStorage.getItem("wrongWords") || "[]");
    let wrongMatch = !selectedFilters.wrong || wrongWords.includes(wordText);

    // === 最後回傳 ===
    return letterMatch && primaryMatch && secondaryMatch &&
           levelMatch && checkedMatch && importantMatch && wrongMatch;
});


    if (filteredWords.length === 0) {
        alert("⚠️ 沒有符合條件的單字！");
        return;
    }

    quizWords = filteredWords;

    // 檢查是否由「Start Quiz」按鈕觸發
    if (event && event.target && event.target.id === "startFilteredQuizBtn") {
        startQuiz(); // 直接進入單字測驗
    } else {
        showQuizTypeSelection(); // 顯示測驗類型選擇介面
    }
}

function toggleImportantSelection() {
    let importantWords = wordsData.filter(word => {
        let wordText = word.Words || word.word || word["單字"];
        return localStorage.getItem(`important_${wordText}`) === "true";
    });

    if (importantWords.length === 0) {
        alert("⚠️ 沒有標記為重要的單字！");
        return;
    }

    quizWords = importantWords;
    filterQuizWords(null); // 傳遞 null，確保進入選擇介面
}

function toggleWrongSelection() {
    let wrongWords = JSON.parse(localStorage.getItem("wrongWords")) || [];

    let filteredWrongWords = wordsData.filter(word => {
        let wordText = word.Words || word.word || word["單字"];
        return wrongWords.includes(wordText);
    });

    if (filteredWrongWords.length === 0) {
        alert("⚠️ 沒有錯誤單字！");
        return;
    }

    quizWords = filteredWrongWords;
    filterQuizWords(null); // 傳遞 null，確保進入選擇介面
}

function generateMultiSelectButtons() {
    // 字母分類
    let alphabetContainer = document.getElementById("alphabetButtons");
    if(alphabetContainer) {
        alphabetContainer.innerHTML = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(letter =>
            `<button class='category-button' onclick='toggleSelection("letters", "${letter}")'>${letter}</button>`
        ).join("");
    }

    // 主分類和次分類
    let primaryCategories = [...new Set(wordsData.map(w => w["分類"][0] || "未分類").filter(c => c))];
    let secondaryCategories = [...new Set(wordsData.flatMap(w => w["分類"].slice(1)).filter(c => c))];

    let primaryContainer = document.getElementById("primaryCategoryButtons");
    if(primaryContainer) {
        primaryContainer.innerHTML = primaryCategories.map(c =>
            `<button class='category-button' onclick='toggleSelection("primaryCategories", "${c}")'>${c}</button>`
        ).join(" ");
    }

    let secondaryContainer = document.getElementById("secondaryCategoryButtons");
    if(secondaryContainer) {
        secondaryContainer.innerHTML = secondaryCategories.map(c =>
            `<button class='category-button' onclick='toggleSelection("secondaryCategories", "${c}")'>${c}</button>`
        ).join(" ");
    }
    
    // 特殊分類
    let specialContainer = document.getElementById("specialCategoryButtons");
    if(specialContainer) {
        specialContainer.innerHTML = `
            <button class='category-button' onclick='toggleCheckedSelection()'>Checked 單字</button>
            <button class='category-button' onclick='toggleImportantFilter()'>重要單字</button>
            <button class='category-button' onclick='toggleWrongFilter()'>錯誤單字</button>
        `;
    }

    // 等級分類
    let levels = [...new Set(wordsData.map(w => w["等級"] || "未分類"))];
    let levelContainer = document.getElementById("levelButtons");
    if(levelContainer) {
        levelContainer.innerHTML = levels.map(l => 
            `<button class='category-button' onclick='toggleSelection("levels", "${l}")'>${l}</button>`
        ).join("");
    }
}

function toggleImportantFilter() {
    selectedFilters.important = !selectedFilters.important;
    // 將 #checkedCategory 改為 #specialCategoryButtons
    let importantButton = document.querySelector("#specialCategoryButtons button:nth-child(2)"); 
    if (selectedFilters.important) {
        importantButton.classList.add("selected");
    } else {
        importantButton.classList.remove("selected");
    }
}

function toggleWrongFilter() {
    selectedFilters.wrong = !selectedFilters.wrong;
    // 將 #checkedCategory 改為 #specialCategoryButtons
    let wrongButton = document.querySelector("#specialCategoryButtons button:nth-child(3)"); 
    if (selectedFilters.wrong) {
        wrongButton.classList.add("selected");
    } else {
        wrongButton.classList.remove("selected");
    }
}

function showQuizCategories() {
    document.querySelector("h1").textContent = "單字測驗區";
    if (!isDataLoaded) {
        alert("⚠️ 單字資料尚未載入完成，請稍後再試。");
        return;
    }
    // document.getElementById("mainMenu").style.display = "none"; // 這一行已被刪除
    document.getElementById("quizCategories").style.display = "block";
    generateMultiSelectButtons();
    let startQuizBtn = document.getElementById("startFilteredQuizBtn");
    startQuizBtn.style.display = "block";
    startQuizBtn.textContent = "Word Quiz"; // 可選：明確標示為單字測驗
}

function highlightCheckedWords() {
    document.querySelectorAll(".category-button").forEach(button => {
        let word = button.innerText;
        if (localStorage.getItem(`checked_${word}`) === "true") {
            button.style.backgroundColor = "#90EE90"; // 淺綠色顯示已選
        }
    });
}

function initializeStartQuizButton() {
    let startQuizBtn = document.getElementById("startFilteredQuizBtn");
    if (startQuizBtn) {
        startQuizBtn.addEventListener("click", (event) => filterQuizWords(event));
    }
}

document.getElementById("startRewordQuizBtn").addEventListener("click", startRewordQuiz);

// 開始測驗
function startQuiz() {
    if (!isDataLoaded || wordsData.length === 0) {
        console.error("❌ 資料尚未載入，無法開始測驗");
        alert("⚠️ 資料尚未載入，請稍後再試。");
        return;
    }

    let filteredWords = wordsData.filter(w => {
        let word = w.Words || w.word || w["單字"];
        let category = w["分類"] || [];
        let level = w["等級"] || "未分類";
        let isChecked = localStorage.getItem(`checked_${word}`) === "true";
        let isImportant = localStorage.getItem(`important_${word}`) === "true";
        let isWrong = JSON.parse(localStorage.getItem("wrongWords") || "[]").includes(word);

        if (selectedFilters.letters.size > 0 && ![...selectedFilters.letters].some(letter => word.toLowerCase().startsWith(letter.toLowerCase()))) return false;
        let primary = category[0] || "未分類";
        if (selectedFilters.primaryCategories.size > 0 && !selectedFilters.primaryCategories.has(primary)) return false;
        let secondary = category.slice(1);
        if (selectedFilters.secondaryCategories.size > 0 && !secondary.some(c => selectedFilters.secondaryCategories.has(c))) return false;
        if (selectedFilters.levels.size > 0 && !selectedFilters.levels.has(level)) return false;
        if (selectedFilters.checked && !isChecked) return false;
        if (selectedFilters.important && !isImportant) return false;
        if (selectedFilters.wrong && !isWrong) return false;
        return true;
    });

    if (filteredWords.length === 0) {
        console.warn("⚠️ 沒有符合條件的單字");
        alert("⚠️ 沒有符合條件的單字，請重新選擇篩選條件。");
        return;
    }

    // --- 核心修改：排序與篩選 ---
    // 1. 根據測驗次數排序 (次數少的優先)
    filteredWords.sort((a, b) => {
        const countA = wordQuizHistory[a.Words] || 0;
        const countB = wordQuizHistory[b.Words] || 0;
        return countA - countB;
    });

    // 2. 隨機打亂排序，增加變化性
    for (let i = filteredWords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [filteredWords[i], filteredWords[j]] = [filteredWords[j], filteredWords[i]];
    }

    // 3. 最多只取 10 個單字
    quizWords = filteredWords.slice(0, 10);
    console.log(`✅ 本次測驗單字數: ${quizWords.length}`, quizWords.map(w => w.Words));


    currentWord = null;
    quizResults = [];
    localStorage.setItem("currentQuizResults", JSON.stringify(quizResults));
    document.getElementById("quizCategories").style.display = "none";
    document.getElementById("quizArea").style.display = "block";
    loadNextWord();
}


// 載入下一個單字 (主要修改處)
function loadNextWord() {
    if (quizWords.length === 0) {
        finishQuiz();
        return;
    }

    let wordData = quizWords.shift(); // 從陣列開頭取出，確保優先測驗次數少的
    currentWord = wordData.Words;
    currentAudio = `${baseURL}${currentWord}.mp3`;

    // --- 核心修改：更新歷史紀錄 ---
    wordQuizHistory[currentWord] = (wordQuizHistory[currentWord] || 0) + 1;
    localStorage.setItem('wordQuizHistory', JSON.stringify(wordQuizHistory));
    console.log(`📈 更新測驗紀錄: ${currentWord}, 次數: ${wordQuizHistory[currentWord]}`);


    let wordHintContainer = document.getElementById("wordHint");
    let wordInputContainer = document.getElementById("wordInput");

    wordInputContainer.innerHTML = "";
    wordHintContainer.innerHTML = "";

    let audio = new Audio(currentAudio);
    audio.play();

    for (let i = 0; i < currentWord.length; i++) {
        let char = currentWord[i];
        if (char === " " || char === "-") {
            let spanElement = document.createElement("span");
            spanElement.innerText = char;
            spanElement.classList.add("non-input-box");
            wordInputContainer.appendChild(spanElement);
            wordHintContainer.innerHTML += char;
        } else {
            let inputElement = document.createElement("input");
            inputElement.type = "text";
            inputElement.maxLength = "1";
            inputElement.classList.add("letter-box");
            inputElement.addEventListener("input", function () {
                if (inputElement.value.length === 1) {
                    let nextInput = inputElement.nextElementSibling;
                    while (nextInput && nextInput.tagName === "SPAN") {
                        nextInput = nextInput.nextElementSibling;
                    }
                    if (nextInput) {
                        nextInput.focus();
                    }
                }
            });
            wordInputContainer.appendChild(inputElement);
            if (i === 0 || i === currentWord.length - 1) {
                wordHintContainer.innerHTML += char;
            } else {
                wordHintContainer.innerHTML += "_ ";
            }
        }
    }

    let firstInput = wordInputContainer.querySelector("input");
    if (firstInput) firstInput.focus();
}


// 載入下一個單字 (主要修改處)
function loadNextWord() {
    if (quizWords.length === 0) {
        finishQuiz();
        return;
    }

    let wordData = quizWords.shift(); // 從陣列開頭取出，確保優先測驗次數少的
    currentWord = wordData.Words;
    currentAudio = `${baseURL}${currentWord}.mp3`;

    // --- 核心修改：更新歷史紀錄 ---
    wordQuizHistory[currentWord] = (wordQuizHistory[currentWord] || 0) + 1;
    localStorage.setItem('wordQuizHistory', JSON.stringify(wordQuizHistory));
    console.log(`📈 更新測驗紀錄: ${currentWord}, 次數: ${wordQuizHistory[currentWord]}`);


    let wordHintContainer = document.getElementById("wordHint");
    let wordInputContainer = document.getElementById("wordInput");

    wordInputContainer.innerHTML = "";
    wordHintContainer.innerHTML = "";

    let audio = new Audio(currentAudio);
    audio.play();

    for (let i = 0; i < currentWord.length; i++) {
        let char = currentWord[i];
        if (char === " " || char === "-") {
            let spanElement = document.createElement("span");
            spanElement.innerText = char;
            spanElement.classList.add("non-input-box");
            wordInputContainer.appendChild(spanElement);
            wordHintContainer.innerHTML += char;
        } else {
            let inputElement = document.createElement("input");
            inputElement.type = "text";
            inputElement.maxLength = "1";
            inputElement.classList.add("letter-box");
            inputElement.addEventListener("input", function () {
                if (inputElement.value.length === 1) {
                    let nextInput = inputElement.nextElementSibling;
                    while (nextInput && nextInput.tagName === "SPAN") {
                        nextInput = nextInput.nextElementSibling;
                    }
                    if (nextInput) {
                        nextInput.focus();
                    }
                }
            });
            wordInputContainer.appendChild(inputElement);
            if (i === 0 || i === currentWord.length - 1) {
                wordHintContainer.innerHTML += char;
            } else {
                wordHintContainer.innerHTML += "_ ";
            }
        }
    }

    let firstInput = wordInputContainer.querySelector("input");
    if (firstInput) firstInput.focus();
}

function normalizeText(text) {
    return text
        .normalize('NFD') // 將組合字符分解（如 é 分解為 e 和結合重音符號）
        .replace(/[\u0300-\u036f]/g, '') // 移除所有重音符號
        .toLowerCase()
        .replace(/\s+/g, ' ') // 統一空格
        .replace(/,\s*/g, ',') // 處理逗號後的空格
        .trim();
}

// 提交答案並檢查正確性
function submitAnswer() {
    const quizArea = document.getElementById("quizArea");
    if (!quizArea || quizArea.style.display === "none") {
        return;
    }

    let wordInputElements = document.querySelectorAll("#wordInput input, #wordInput span.non-input-box");
    let userAnswerArray = Array.from(wordInputElements).map(el =>
        el.tagName === "INPUT" ? (el.value.trim().toLowerCase() || "_") : el.innerText
    );
    let userAnswer = userAnswerArray.join("");
    let correctAnswer = currentWord;

    // [MODIFICATION START] - Highlight incorrect letters in input boxes
    let inputIndex = 0;
    document.querySelectorAll("#wordInput input").forEach(input => {
        // Find the corresponding character in the correct answer, skipping spaces/hyphens
        while (correctAnswer[inputIndex] === ' ' || correctAnswer[inputIndex] === '-') {
            inputIndex++;
        }
        
        let userChar = input.value.trim().toLowerCase();
        let correctChar = correctAnswer[inputIndex] ? correctAnswer[inputIndex].toLowerCase() : '';

        if (userChar !== correctChar) {
            input.classList.add('incorrect-letter-input');
        } else {
            input.classList.remove('incorrect-letter-input');
        }
        inputIndex++;
    });
    // [MODIFICATION END]

    // 正規化答案
    let normalizedUserAnswer = normalizeText(userAnswer);
    let normalizedCorrectAnswer = normalizeText(correctAnswer);

    let result = normalizedUserAnswer === '' ? '未作答' :
                 (normalizedUserAnswer === normalizedCorrectAnswer ? '正確' : '錯誤');

    quizResults.push({
        word: currentWord,
        result: result,
        timestamp: new Date().toLocaleString()
    });

    // 儲存錯誤單字到 localStorage
    let storedWrongWords = JSON.parse(localStorage.getItem('wrongWords')) || [];
    if (result === '錯誤') {
        if (!storedWrongWords.includes(currentWord)) {
            storedWrongWords.push(currentWord);
        }
    } else if (result === '正確') {
        storedWrongWords = storedWrongWords.filter(word => word !== currentWord);
    }
    localStorage.setItem('wrongWords', JSON.stringify(storedWrongWords));

    // 生成提示：根據連字符或空格分割單字
    let revealedWord = "";
    let separator = correctAnswer.includes("-") ? "-" : " "; // 根據是否有連字符選擇分割方式
    let wordParts = correctAnswer.split(separator);

    for (let partIndex = 0; partIndex < wordParts.length; partIndex++) {
        let correctWord = wordParts[partIndex] || "";
        let startIndex = partIndex === 0 ? 0 : wordParts.slice(0, partIndex).join(separator).length + partIndex;

        let userWord = "";
        for (let i = startIndex; i < startIndex + correctWord.length; i++) {
            userWord += userAnswer[i] || "_";
        }

        let wordHint = "";
        for (let j = 0; j < correctWord.length; j++) {
            let globalIndex = startIndex + j;
            if (userAnswer[globalIndex] === correctAnswer[globalIndex]) {
                wordHint += `<span class="correct-letter">${correctWord[j]}</span>`;
            } else {
                wordHint += `<span class="wrong-letter">${correctWord[j]}</span>`;
            }
        }
        revealedWord += wordHint;

        // 添加分隔符（空格或連字符）
        if (partIndex < wordParts.length - 1) {
            revealedWord += `<span class="correct-letter">${separator}</span>`;
        }
    }

    // 查找單字的中文解釋和音標
    let wordData = wordsData.find(w => w.Words === currentWord);
    let chineseExplanation = wordData && wordData["traditional Chinese"]
        ? wordData["traditional Chinese"].replace(/\n/g, "<br>")
        : "無中文解釋";
    let pronunciation1 = wordData && wordData["pronunciation-1"] ? wordData["pronunciation-1"] : "";
    let pronunciation2 = wordData && wordData["pronunciation-2"] ? wordData["pronunciation-2"] : "";
    let phonetics = pronunciation1;
    if (pronunciation2) {
        phonetics += ` / ${pronunciation2}`;
    }
    phonetics = phonetics || "無音標";

    // 顯示提示、音標和中文解釋
    document.getElementById("wordHint").innerHTML = `
        <div>${revealedWord}</div>
        <div class="phonetic-explanation">
            <p>${phonetics}</p>
        </div>
        <div class="chinese-explanation">
            <p>${chineseExplanation}</p>
        </div>
    `;

    // 顯示「下一題」按鈕
    document.getElementById("submitBtn").style.display = "none";
    document.getElementById("nextBtn").style.display = "inline-block";
}


// ✅ 手動進入下一題
function goToNextWord() {
    loadNextWord(); // 載入新單字
    
    // 恢復按鈕狀態
    document.getElementById("submitBtn").style.display = "inline-block"; // 顯示提交按鈕
    document.getElementById("nextBtn").style.display = "none"; // 隱藏下一題按鈕
}

// 這是新增的部分：字母格的動態生成和自動跳格功能
document.addEventListener("DOMContentLoaded", function () {
    let currentWord = "example"; // 假設這是你的單字，這裡可以根據實際情況更改
    let wordLength = currentWord.length; // 根據單字長度設置格子數量
    let wordInputContainer = document.getElementById("wordInput");

    // 清空容器，確保只顯示新的字母格
    wordInputContainer.innerHTML = ''; 

    // 根據單字長度動態生成字母格
    for (let i = 0; i < wordLength; i++) {
        let inputElement = document.createElement("input");
        inputElement.type = "text";
        inputElement.maxLength = "1"; // 每個格子只能輸入一個字母
        inputElement.classList.add("letter-box");
        inputElement.addEventListener("input", function() {
            moveNext(inputElement);  // 當用戶輸入字母後，跳到下一格
        });
        wordInputContainer.appendChild(inputElement);
    }

    // 自動跳格功能
    function moveNext(input) {
        if (input.value.length === input.maxLength) {
            let nextInput = input.nextElementSibling;
            if (nextInput) {
                nextInput.focus();
            }
        }
    }

    // 監聽鍵盤事件，按下 Enter 鍵時觸發提交或進入下一題
    document.addEventListener("keydown", function(event) {
        if (event.key === "Enter") {
            event.preventDefault();  // 防止 Enter 鍵觸發其他瀏覽器行為（如換行）

            // 如果「下一題」按鈕可見，表示使用者答錯，則進入下一題
            if (document.getElementById("nextBtn").style.display === "inline-block") {
                goToNextWord(); // 呼叫進入下一題的函數
            } else {
                submitAnswer(); // 否則，提交答案
            }
        }
    });
});


// 顯示下一個單字並生成提示
function loadNextWord() {
    if (quizWords.length === 0) {
        finishQuiz();
        return;
    }

    let randomIndex = Math.floor(Math.random() * quizWords.length);
    let wordData = quizWords.splice(randomIndex, 1)[0];
    currentWord = wordData.Words;
    currentAudio = `${baseURL}${currentWord}.mp3`;

    let wordHintContainer = document.getElementById("wordHint");
    let wordInputContainer = document.getElementById("wordInput");

    wordInputContainer.innerHTML = ""; // 清空舊輸入框
    wordHintContainer.innerHTML = ""; // 清空舊提示

    // 播放單字音訊
    let audio = new Audio(currentAudio);
    audio.play();

    for (let i = 0; i < currentWord.length; i++) {
        let char = currentWord[i];

        if (char === " " || char === "-") {
            // ✅ 保留空格與 `-` 的位置
            let spanElement = document.createElement("span");
            spanElement.innerText = char;
            spanElement.classList.add("non-input-box");
            wordInputContainer.appendChild(spanElement);
            wordHintContainer.innerHTML += char; // 保留空格與 `-`
        } else {
            let inputElement = document.createElement("input");
            inputElement.type = "text";
            inputElement.maxLength = "1";
            inputElement.classList.add("letter-box");

            inputElement.addEventListener("input", function () {
                if (inputElement.value.length === 1) {
                    let nextInput = inputElement.nextElementSibling;
                    while (nextInput && nextInput.tagName === "SPAN") {
                        nextInput = nextInput.nextElementSibling;
                    }
                    if (nextInput) {
                        nextInput.focus();
                    }
                }
            });

            wordInputContainer.appendChild(inputElement);

            // ✅ 顯示提示：只顯示第一個與最後一個字母，其餘用 `_`
            if (i === 0 || i === currentWord.length - 1) {
                wordHintContainer.innerHTML += char; // 顯示首尾字母
            } else {
                wordHintContainer.innerHTML += "_ "; // 其他地方用 `_` 代替
            }
        }
    }

    // ✅ 讓第一個輸入框自動對焦
    let firstInput = wordInputContainer.querySelector("input");
    if (firstInput) firstInput.focus();
}



  // 完成測驗後顯示結果統計，包含單字、音標、對錯標記與重要單字勾選功能
function finishQuiz() {
    document.getElementById("quizArea").style.display = "none";
    document.getElementById("quizResult").style.display = "block";

    let resultContainer = document.getElementById("quizResult");

    // 清空結果容器內容
    resultContainer.innerHTML = `<h2>測驗結果</h2>`; 

    // 取得儲存成功提示框
    let existingNotification = document.getElementById("saveNotification");

    // 確保提示框預設隱藏，若已經顯示則隱藏
    if (existingNotification) {
        existingNotification.style.display = "none";  // 預設隱藏
    }

    // ✅ 顯示單字測驗結果列表
    let resultList = quizResults.map(result => {
        let wordData = wordsData.find(w => w.Words === result.word);
        let pronunciation1 = wordData && wordData["pronunciation-1"] ? wordData["pronunciation-1"] : "";
        let pronunciation2 = wordData && wordData["pronunciation-2"] ? wordData["pronunciation-2"] : "";
    
        let phonetics = pronunciation1;
        if (pronunciation2) {
            phonetics += ` / ${pronunciation2}`;
        }
    
        // 根據結果添加對應的類別
        let resultClass = '';
        if (result.result === '正確') {
            resultClass = 'correct';
        } else if (result.result === '錯誤') {
            resultClass = 'wrong';
        } else {
            resultClass = 'unanswered'; // 如果有未作答的情況
        }
    
        return `
            <div class='result-item ${resultClass}'>
                <label class='important-word'>
                    <input type='checkbox' class='important-checkbox' data-word='${result.word}' 
                    ${localStorage.getItem(`important_${result.word}`) === "true" ? "checked" : ""} 
                    onchange='toggleImportant("${result.word}", this)'>
                </label>
                <button class='word-link' onclick="goToWordDetail('${result.word}')">${result.word}</button>
                <button class='phonetic-btn' onclick="playAudioForWord('${result.word}')">${phonetics}</button>
            </div>
        `;
    }).join("");

    // 顯示單字結果與按鈕
    resultContainer.innerHTML += `
    <div>${resultList}</div>
    <div class="button-group">
        <button class="button" onclick="returnToMainMenu()">返回主頁</button>
    </div>
`;

    // ✅ 顯示測驗結果儲存成功的提示框
    if (existingNotification) {
        setTimeout(function() {
            existingNotification.style.display = "block";  // 顯示提示框
        }, 500);  // 延遲顯示，可以讓結果先顯示
    }
}


function goToWordDetail(word) {
    // 儲存測驗結果區塊的滾動位置
    let resultContainer = document.getElementById("quizResult");
    let scrollPosition = resultContainer ? resultContainer.scrollTop : 0;

    // 儲存當前狀態與測驗結果到 localStorage
    localStorage.setItem('quizScrollPosition', scrollPosition);
    localStorage.setItem('currentQuizResults', JSON.stringify(quizResults));

    // 記錄測驗結果是否顯示
    localStorage.setItem('returnToQuizResult', "true");

    // 跳轉到 index.html 單字詳情
    window.location.href = `index.html?word=${encodeURIComponent(word)}&from=quiz`;
}

function startRewordQuiz() {
    // 如果 quizWords 為空，自動填充（模擬 filterQuizWords 的邏輯）
    if (quizWords.length === 0) {
        quizWords = wordsData.filter(word => {
            // [FIX START] - Corrected filtering logic for Reword Quiz
            let wordText = word.Words;
            let letterMatch = selectedFilters.letters.size === 0 || selectedFilters.letters.has(wordText[0].toUpperCase());

            let category = word["分類"] || [];
            let primary = category[0] || "未分類";
            let secondary = category.slice(1);

            let primaryMatch = selectedFilters.primaryCategories.size === 0 || selectedFilters.primaryCategories.has(primary);
            let secondaryMatch = selectedFilters.secondaryCategories.size === 0 || secondary.some(c => selectedFilters.secondaryCategories.has(c));
            
            let wordLevel = word["等級"] || "未分類(等級)";
            let levelMatch = selectedFilters.levels.size === 0 || selectedFilters.levels.has(wordLevel);

            let checkedMatch = !selectedFilters.checked || localStorage.getItem(`checked_${wordText}`) === "true";
            let importantMatch = !selectedFilters.important || localStorage.getItem(`important_${wordText}`) === "true";
            let wrongWords = JSON.parse(localStorage.getItem("wrongWords") || "[]");
            let wrongMatch = !selectedFilters.wrong || wrongWords.includes(wordText);

            return letterMatch && primaryMatch && secondaryMatch && levelMatch && checkedMatch && importantMatch && wrongMatch;
            // [FIX END]
        });

        // 如果篩選後仍無單字，給予提示並返回分類頁面
        if (quizWords.length === 0) {
            alert("⚠️ 沒有符合條件的單字，請選擇分類！");
            returnToCategorySelection();
            return;
        }
    }

    document.getElementById("quizCategories").style.display = "none";
    document.getElementById("rewordQuizArea").style.display = "block";
    loadNextReword();
}


function loadNextReword() {
    if (quizWords.length === 0) {
        alert("⚠️ 無可用單字，請重新選擇分類！");
        returnToCategorySelection();
        return;
    }

    let randomIndex = Math.floor(Math.random() * quizWords.length);
    let wordData = quizWords.splice(randomIndex, 1)[0];
    currentWord = wordData.Words;
    currentAudio = `${baseURL}${currentWord}.mp3`;

    let rewordHintContainer = document.getElementById("rewordHint");
    let letterBlocksContainer = document.getElementById("rewordLetterBlocksContainer");
    let constructionArea = document.getElementById("rewordConstructionArea");

    rewordHintContainer.innerHTML = "";
    letterBlocksContainer.innerHTML = "";
    constructionArea.innerHTML = "";

    // 顯示提示：首尾字母
    rewordHintContainer.innerHTML = currentWord[0] + " _ ".repeat(currentWord.length - 2) + currentWord[currentWord.length - 1];

    // 生成打亂的字母塊
    let letters = currentWord.split("").sort(() => Math.random() - 0.5);
    letters.forEach(letter => {
        let block = document.createElement("div");
        block.classList.add("word-block");
        block.dataset.value = letter;
        block.innerText = letter;
        block.onclick = () => selectLetterBlock(block);
        letterBlocksContainer.appendChild(block);
    });

    // 播放音訊
    let audio = new Audio(currentAudio);
    audio.play();

    // 重置按鈕狀態
    document.getElementById("submitRewordBtn").style.display = "inline-block";
    document.getElementById("nextRewordBtn").style.display = "none";
}

function selectLetterBlock(block) {
    let constructionArea = document.getElementById("rewordConstructionArea");
    if (block.parentNode === constructionArea) {
        block.classList.remove("selected");
        document.getElementById("rewordLetterBlocksContainer").appendChild(block);
    } else {
        block.classList.add("selected");
        constructionArea.appendChild(block);
    }
}

function submitRewordAnswer() {
    let constructionArea = document.getElementById("rewordConstructionArea");
    let userAnswer = Array.from(constructionArea.children).map(b => b.dataset.value).join("");
    let correctAnswer = currentWord.toLowerCase();

    let result = userAnswer === "" ? "未作答" : (userAnswer.toLowerCase() === correctAnswer ? "正確" : "錯誤");

    quizResults.push({
        word: currentWord,
        result: result,
        timestamp: new Date().toLocaleString()
    });

    // 更新錯誤單字到 localStorage
    let storedWrongWords = JSON.parse(localStorage.getItem('wrongWords')) || [];
    if (result === "錯誤") {
        if (!storedWrongWords.includes(currentWord)) {
            storedWrongWords.push(currentWord);
        }
    } else if (result === "正確") {
        storedWrongWords = storedWrongWords.filter(word => word !== currentWord);
    }
    localStorage.setItem('wrongWords', JSON.stringify(storedWrongWords));

    // 查找單字的中文解釋和音標
    let wordData = wordsData.find(w => w.Words === currentWord);
    let chineseExplanation = wordData && wordData["traditional Chinese"]
        ? wordData["traditional Chinese"].replace(/\n/g, "<br>")
        : "無中文解釋";
    let pronunciation1 = wordData && wordData["pronunciation-1"] ? wordData["pronunciation-1"] : "";
    let pronunciation2 = wordData && wordData["pronunciation-2"] ? wordData["pronunciation-2"] : "";
    let phonetics = pronunciation1;
    if (pronunciation2) {
        phonetics += ` / ${pronunciation2}`;
    }
    phonetics = phonetics || "無音標";

    // 顯示正確答案、音標和中文解釋
    document.getElementById("rewordHint").innerHTML = `
        <div>${currentWord}</div>
        <div class="phonetic-explanation">
            <p>${phonetics}</p>
        </div>
        <div class="chinese-explanation">
            <p>${chineseExplanation}</p>
        </div>
    `;

    // 反饋字母塊
    constructionArea.querySelectorAll(".word-block").forEach((block, i) => {
        let correctLetter = correctAnswer[i] || "";
        block.classList.add(block.dataset.value.toLowerCase() === correctLetter ? "correct" : "incorrect");
    });

    document.getElementById("submitRewordBtn").style.display = "none";
    document.getElementById("nextRewordBtn").style.display = "inline-block";
}

function goToNextReword() {
    loadNextReword();
}

function finishRewordQuiz() {
    document.getElementById("rewordQuizArea").style.display = "none"; // 隱藏重組測驗區
    document.getElementById("quizArea").style.display = "none"; // 確保單字測驗區隱藏
    document.getElementById("quizResult").style.display = "block"; // 顯示結果區
    finishQuiz(); // 顯示結果
}

document.getElementById("playRewordAudioBtn").addEventListener("click", function() {
    if (currentWord) {
        playAudioForWord(currentWord);
    }
});

document.addEventListener("keydown", function(event) {
    if (event.code === "Space" && document.getElementById("rewordQuizArea").style.display === "block") {
        event.preventDefault();
        if (currentWord) {
            playAudioForWord(currentWord);
        }
    }
});

// ✅ 勾選或取消勾選時同步更新 localStorage
function toggleImportant(word, checkbox) {
    if (checkbox.checked) {
        localStorage.setItem(`important_${word}`, "true");
        console.log(`⭐ 單字 ${word} 標記為重要 (quiz)`);
    } else {
        localStorage.removeItem(`important_${word}`);
        console.log(`❌ 單字 ${word} 取消重要標記 (quiz)`);
    }
}


function showQuizTypeSelection() {
    // 隱藏分類選擇區域
    document.getElementById("quizCategories").style.display = "none";

    // 顯示測驗類型選擇區域
    let quizTypeSelection = document.getElementById("quizTypeSelection");
    if (!quizTypeSelection) {
        // 如果尚未存在，動態創建選擇區域
        quizTypeSelection = document.createElement("div");
        quizTypeSelection.id = "quizTypeSelection";
        quizTypeSelection.innerHTML = `
            <h2>選擇測驗類型</h2>
            <div class="button-group">
                <button class="button" onclick="startQuiz()">單字測驗</button>
                <button class="button" onclick="startRewordQuiz()">單字重組測驗</button>
                <button class="button" onclick="returnToCategorySelection()">取消</button>
            </div>
        `;
        document.body.appendChild(quizTypeSelection);
    }
    quizTypeSelection.style.display = "block";
}


// ✅ 儲存測驗結果與更新錯誤單字、重要單字
function saveQuizResults() {
    let timestamp = new Date().toLocaleString();
    localStorage.setItem(`quiz_session_${timestamp}`, JSON.stringify(quizResults));

    // ✅ 儲存錯誤單字
    let storedWrongWords = JSON.parse(localStorage.getItem('wrongWords')) || [];

    quizResults.forEach(result => {
        if (result.result === "錯誤") {
            if (!storedWrongWords.includes(result.word)) {
                storedWrongWords.push(result.word);
            }
        } else {
            storedWrongWords = storedWrongWords.filter(word => word !== result.word);
        }
    });

    // ✅ 更新 localStorage 錯誤單字清單
    localStorage.setItem('wrongWords', JSON.stringify(storedWrongWords));

    // ✅ 顯示確認儲存成功提示
    console.log(`✅ 錯誤單字已成功儲存: ${storedWrongWords}`);

    // 顯示儲存成功提示
    let notification = document.getElementById("saveNotification");
    if (notification) {
        notification.style.display = "none";  // 顯示通知

        setTimeout(() => {
            notification.style.display = "none";  // 3秒後隱藏
        }, 3000);
    }
}





// Back按鍵 // 
// quiz.js

function returnToMainMenu() {
    // 直接導向到應用程式首頁
    window.location.href = 'index.html';
    
    // 清理 LocalStorage 中的暫存測驗數據
    localStorage.removeItem("currentQuizResults");
    localStorage.removeItem("quizScrollPosition");
    
    console.log("✅ 返回首頁並重置狀態");
}


// ✅ 綁定中央播放按鈕功能
document.getElementById("playAudioCenterBtn").addEventListener("click", function() {
    if (currentWord) {
        playAudioForWord(currentWord);
    }
});


// ✅ 恢復測驗結果並重新顯示（修正音標顯示問題）
function restoreQuizResults() {
    let resultContainer = document.getElementById("quizResult");
    resultContainer.innerHTML = `<h2>測驗結果</h2>`; // 重新顯示標題

    let resultList = quizResults.map(result => {
        let wordData = wordsData.find(w => w.Words === result.word);
        let pronunciation1 = wordData && wordData["pronunciation-1"] ? wordData["pronunciation-1"] : "";
        let pronunciation2 = wordData && wordData["pronunciation-2"] ? wordData["pronunciation-2"] : "";
    
        let phonetics = pronunciation1;
        if (pronunciation2) {
            phonetics += ` / ${pronunciation2}`;
        }
    
        // 根據結果添加對應的類別
        let resultClass = '';
        if (result.result === '正確') {
            resultClass = 'correct';
        } else if (result.result === '錯誤') {
            resultClass = 'wrong';
        } else {
            resultClass = 'unanswered'; // 如果有未作答的情況
        }
    
        return `
            <div class='result-item ${resultClass}'>
                <label class='important-word'>
                    <input type='checkbox' class='important-checkbox' data-word='${result.word}' 
                    ${localStorage.getItem(`important_${result.word}`) === "true" ? "checked" : ""} 
                    onchange='toggleImportant("${result.word}", this)'>
                </label>
                <button class='word-link' onclick="goToWordDetail('${result.word}')">${result.word}</button>
                <button class='phonetic-btn' onclick="playAudioForWord('${result.word}')">${phonetics}</button>
            </div>
        `;
    }).join("");

    // 加上按鈕與結果內容
    resultContainer.innerHTML += `
        <div>${resultList}</div>
        <div class="button-group">
            <button class="button" onclick="returnToMainMenu()">返回主頁</button>
        </div>
    `;

    // ✅ 恢復滾動位置
    let savedScrollPosition = localStorage.getItem("quizScrollPosition");
    if (savedScrollPosition) {
        resultContainer.scrollTop = parseInt(savedScrollPosition);
    }
}


function displayRestoredResults() {
    let resultContainer = document.getElementById("quizResult");
    resultContainer.innerHTML = `<h2>測驗結果</h2>`;

    let resultList = quizResults.map(result => {
        let wordData = wordsData.find(w => w.Words === result.word);
        let pronunciation1 = wordData && wordData["pronunciation-1"] ? wordData["pronunciation-1"] : "";
        let pronunciation2 = wordData && wordData["pronunciation-2"] ? wordData["pronunciation-2"] : "";

        let phonetics = pronunciation1 || pronunciation2 ? `${pronunciation1} ${pronunciation2}` : "No Pronunciation";

        return `
            <div class='result-item'>
                <button class='word-link' onclick="goToWordDetail('${result.word}')">${result.word}</button>
                <button class='phonetic-btn' onclick="playAudioForWord('${result.word}')">${phonetics}</button>
                <span class='result-status'>${result.result === '正確' ? '✅' : '❌'}</span>
                <label class='important-word'>
                    <input type='checkbox' class='important-checkbox' data-word='${result.word}' ${localStorage.getItem(`important_${result.word}`) === "true" ? "checked" : ""} onchange='toggleImportant("${result.word}", this)'> 重要單字
                </label>
            </div>
        `;
    }).join("");

    resultContainer.innerHTML += `<div>${resultList}</div>`;
}


// ✅ 切換刪除選擇狀態（空白 ↔ 叉叉）
function toggleDeleteSelection(button) {
    button.classList.toggle('selected'); // 切換選擇狀態
    button.innerText = button.classList.contains('selected') ? '❌' : ''; // 選擇後顯示叉叉
}


// ✅ 將勾選的單字存入 LocalStorage，標記為重要單字
function markSelectedWordsAsImportant() {
    let checkedBoxes = document.querySelectorAll('.important-checkbox:checked');
    if (checkedBoxes.length === 0) {
        alert("⚠️ 請先選擇要標記為重要的單字！");
        return;
    }

    // 儲存勾選的單字到 LocalStorage
    checkedBoxes.forEach(box => {
        let wordToMark = box.dataset.word;
        localStorage.setItem(`important_${wordToMark}`, true); // 標記為重要
    });

    // 提示標記成功
    alert("✅ 選中的單字已成功標記為重要！");

    // 重新顯示更新後的錯誤單字列表
    showErrorWords();
}



// ✅ 刪除已選擇的錯誤單字
function deleteSelectedWords() {
    let selectedButtons = document.querySelectorAll('.delete-btn.selected');
    if (selectedButtons.length === 0) {
        alert("⚠️ 請先選擇要刪除的單字！");
        return;
    }

    let wrongWords = JSON.parse(localStorage.getItem('wrongWords')) || [];

    selectedButtons.forEach(button => {
        let wordToDelete = button.dataset.word;
        wrongWords = wrongWords.filter(word => word !== wordToDelete);
    });

    // 更新 LocalStorage
    localStorage.setItem('wrongWords', JSON.stringify(wrongWords));

    // 刪除成功提示
    alert("✅ 選中的錯誤單字已成功刪除！");

    // 刷新錯誤單字列表
    showErrorWords();
}




// ✅ 刪除已勾選的重要單字
function deleteSelectedImportantWords() {
    let checkedBoxes = document.querySelectorAll('.delete-important-checkbox:checked');
    if (checkedBoxes.length === 0) {
        alert("⚠️ 請先選擇要刪除的單字！");
        return;
    }

    // 刪除 LocalStorage 中標記為重要的單字
    checkedBoxes.forEach(box => {
        let wordToDelete = box.dataset.word;
        localStorage.removeItem(`important_${wordToDelete}`);
    });

    // 提示刪除成功
    alert("✅ 選中的重要單字已成功刪除！");

    // 重新顯示更新後的列表
    showImportantWords();
}


// 取消按鈕返回上一頁
document.getElementById("cancelBtn").addEventListener("click", returnToCategorySelection);

// ... 您檔案中其他的程式碼 ...

// ✅ 新增：顯示提示框 (Toast Notification) 的函式
function showToast(message, type = 'success') {
    const toast = document.getElementById('toastNotification');
    if (!toast) return;

    toast.textContent = message;
    toast.className = `show ${type}`; // 加上 show 和 success/error class

    // 3 秒後自動隱藏
    setTimeout(() => {
        toast.className = toast.className.replace('show', '');
    }, 3000);
}

// ... 確保這是檔案的最後一行，如果您的檔案結尾有 `}` 的話