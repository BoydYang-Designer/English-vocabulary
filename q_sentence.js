

console.log("✅ q_sentence.js 已載入");


const GITHUB_JSON_URL = "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Sentence%20file/sentence.json";
const GITHUB_MP3_BASE_URL = "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Sentence%20file/";


let sentenceData = JSON.parse(localStorage.getItem("sentenceData")) || [];
let currentSentenceIndex = 0;
let userAnswers = JSON.parse(localStorage.getItem("userAnswers")) || [];
let incorrectSentences = JSON.parse(localStorage.getItem("wrongQS")) || [];
let importantSentences = JSON.parse(localStorage.getItem("importantSentences")) || [];



let selectedSentenceFilters = {
    levels: new Set(),
    categories: new Set(),
    alphabet: new Set()
};

function getUserAnswer(index) {
    return userAnswers[index] || "";
}
window.getUserAnswer = getUserAnswer;


// 📌 進入 Q Sentence 測驗分類頁面
function showSentenceQuizCategories() {
    document.querySelector("h1").textContent = "句子測驗區";
    document.getElementById("mainMenu").style.display = "none";
    document.getElementById("sentenceQuizCategories").style.display = "block";
    console.log("✅ 顯示句子測驗分類頁面");

    fetch(GITHUB_JSON_URL)
        .then(response => response.json())
        .then(data => {
            console.log("✅ 成功載入 sentence.json", data);
            if (!data["New Words"] || !Array.isArray(data["New Words"])) {
                console.error("❌ 資料格式錯誤，'New Words' 不是一個數組。");
                return;
            }
            sentenceData = data["New Words"].filter(item => item.句子 && item.中文);
            generateSentenceCategories(sentenceData);
        })
        .catch(error => {
            console.error("❌ 無法載入 sentence.json:", error);
        });
}


function generateSentenceCategories(data) {
    let levelContainer = document.getElementById("sentenceLevelButtons");
    let categoryContainer = document.getElementById("sentenceCategoryButtons");

    // 檢查 DOM 元素是否存在
    if (!levelContainer || !categoryContainer) {
        console.error("❌ DOM 元素未找到：", { levelContainer, categoryContainer });
        return;
    }

    // 動態創建 A-Z 分類容器
    let alphabetContainer = document.createElement("div");
    alphabetContainer.id = "alphabetButtons";
    alphabetContainer.classList.add("alphabet-container");

    let levels = new Set();
    let categories = new Set();
    let alphabetMap = {};

    // 初始化 A-Z 分類
    for (let i = 65; i <= 90; i++) {
        alphabetMap[String.fromCharCode(i)] = [];
    }

    // 分類數據
    data.forEach(item => {
        let level = item.等級 || "未分類(等級)";
        let category = item.分類 || "未分類";
        let firstLetter = item.句子.charAt(0).toUpperCase();

        levels.add(level);
        categories.add(category);
        if (alphabetMap[firstLetter]) {
            alphabetMap[firstLetter].push(item);
        }
    });

    console.log("✅ 分類數據:", { levels: [...levels], categories: [...categories], alphabetMap });

    // 生成 A-Z 按鈕（保留複選功能）
    alphabetContainer.innerHTML = Object.keys(alphabetMap)
        .filter(letter => alphabetMap[letter].length > 0)
        .map(letter => `<button class="category-button" onclick="toggleSentenceSelection('alphabet', '${letter}')">${letter}</button>`)
        .join("");
    console.log("📌 A-Z buttons HTML:", alphabetContainer.innerHTML);

    // 生成主題按鈕
    categoryContainer.innerHTML = [...categories]
        .map(category => `<button class="category-button" onclick="toggleSentenceSelection('categories', '${category}')">${category}</button>`)
        .join("");

    // 生成等級按鈕
    levelContainer.innerHTML = [...levels]
        .map(level => `<button class="category-button" onclick="toggleSentenceSelection('levels', '${level}')">${level}</button>`)
        .join("");

    // 添加「重要句子」和「錯誤句子」按鈕
    categoryContainer.innerHTML += `<button class="category-button" onclick="toggleSentenceSelection('categories', 'important')">重要句子</button>`;
    categoryContainer.innerHTML += `<button class="category-button" onclick="toggleSentenceSelection('categories', 'incorrect')">錯誤句子</button>`;

    // 將 A-Z 分類容器插入到 "Back" 和 "Start Quiz" 下方，且在 categoryContainer 上方
    let sentenceQuizCategories = document.getElementById("sentenceQuizCategories");
    let buttonContainer = sentenceQuizCategories.querySelector(".button-container");
    sentenceQuizCategories.insertBefore(alphabetContainer, categoryContainer);

    // 恢復已選狀態
    document.querySelectorAll(".category-button").forEach(button => {
        const typeMatch = button.onclick.toString().match(/toggleSentenceSelection\('(\w+)'/);
        const valueMatch = button.onclick.toString().match(/toggleSentenceSelection\('\w+', '([^']+)'\)/);
        if (typeMatch && valueMatch) {
            const type = typeMatch[1];
            const value = valueMatch[1];
            if (selectedSentenceFilters[type].has(value)) {
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
function startSentenceQuiz() {
    document.getElementById("sentenceQuizCategories").style.display = "none";
    document.getElementById("sentenceQuizArea").style.display = "block";

    // 根據條件篩選出本次要測驗的句子
    let filteredSentences = sentenceData.filter(item => {
        let levelMatch = selectedSentenceFilters.levels.size === 0 || 
                         selectedSentenceFilters.levels.has(item.等級 || "未分類(等級)");
        
        let categoryMatch = selectedSentenceFilters.categories.size === 0 || 
                            selectedSentenceFilters.categories.has(item.分類 || "未分類") ||
                            (selectedSentenceFilters.categories.has("important") && 
                             localStorage.getItem(`important_sentence_${item.Words}`) === "true") ||
                            (selectedSentenceFilters.categories.has("incorrect") && 
                             JSON.parse(localStorage.getItem("wrongQS") || "[]").includes(item.Words));
                            
        let alphabetMatch = selectedSentenceFilters.alphabet.size === 0 || 
                            selectedSentenceFilters.alphabet.has(item.句子.charAt(0).toUpperCase());
        
        return levelMatch && categoryMatch && alphabetMatch;
    });

    if (filteredSentences.length === 0) {
        alert("❌ 沒有符合條件的測驗句子");
        returnToSentenceCategorySelection();
        return;
    }

    // 只保留本次測驗的句子，但不清空 incorrectSentences
    sentenceData = filteredSentences;
    currentSentenceIndex = 0;
    userAnswers = []; // 清空本次答案，但保留 incorrectSentences

    console.log("✅ 本次測驗的句子數量:", sentenceData.length);
    console.log("✅ 本次測驗的句子:", sentenceData.map(s => s.Words));

    setTimeout(() => loadSentenceQuestion(), 100);
}


document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("startSentenceQuizBtn").addEventListener("click", startSentenceQuiz);
});


let currentAudio = null; // 儲存當前音檔，避免重複創建


function loadSentenceQuestion() {
    let sentenceObj = sentenceData[currentSentenceIndex];
    if (!sentenceObj) {
        console.error("❌ 找不到 sentenceObj！");
        return;
    }

    let sentenceText = sentenceObj.句子;
    let words = sentenceText.split(/\b/); // Split into words and punctuation

    let sentenceInputContainer = document.getElementById("sentenceInput");
    sentenceInputContainer.innerHTML = "";

    let firstInput = null;
    let allInputs = [];

    // Generate input boxes (unchanged)
    words.forEach((word, index) => {
        let wordContainer = document.createElement("div");
        wordContainer.classList.add("word-container");

        if (/\w+/.test(word)) {
            word.split("").forEach((_, letterIndex) => {
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

    // Calculate how many words to show (1/5 of total words)
    let wordCount = words.filter(word => /\w+/.test(word)).length; // Count only actual words
    let wordsToShow = Math.max(1, Math.floor(wordCount / 5)); // Ensure at least 1 word is shown
    let indicesToShow = new Set();
    
    // Randomly select indices for words to display
    while (indicesToShow.size < wordsToShow) {
        let randomIndex = Math.floor(Math.random() * words.length);
        if (/\w+/.test(words[randomIndex])) {
            indicesToShow.add(randomIndex);
        }
    }

    // Create the partially revealed sentence for sentenceHint
    let hintWords = words.map((word, index) => {
        if (/\w+/.test(word) && !indicesToShow.has(index)) {
            return "_".repeat(word.length); // Replace hidden words with underscores
        }
        return word; // Show the word or punctuation as is
    });

    // Display the partially revealed sentence
    document.getElementById("sentenceHint").innerHTML = hintWords.join("");

    // Auto-focus the first input
    if (firstInput) {
        firstInput.focus();
    }

    // Hide "Next" button
    document.getElementById("nextSentenceBtn").style.display = "none";

    // Play audio (unchanged)
    if (sentenceObj.Words) {
        let audioUrl = GITHUB_MP3_BASE_URL + encodeURIComponent(sentenceObj.Words) + ".mp3";
        if (currentAudio instanceof Audio) { // 修改這部分
            currentAudio.pause();
        }
        currentAudio = new Audio(audioUrl);
        currentAudio.play().catch(error => console.warn("🔊 自動播放被禁止", error));
        document.getElementById("playSentenceAudioBtn").onclick = () => playAudio();
    }
}


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
        currentAudio.currentTime = 0; // 從頭播放
        currentAudio.play()
            .then(() => console.log("✅ 播放成功"))
            .catch(error => console.error("🔊 播放失敗:", error));
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
        event.preventDefault(); // 避免滾動
        if (document.getElementById("sentenceQuizArea").style.display !== "block") {
            console.log("⚠️ 不在句子測驗模式，忽略 Enter 鍵");
            return;
        }

        let submitBtn = document.getElementById("submitSentenceBtn");
        if (!submitBtn) return;

        if (submitBtn.dataset.next === "true") {
            console.log("📌 進入下一題");
            goToNextSentence();
        } else {
            console.log("📌 提交答案");
            submitSentenceAnswer();
        }
    }

    // 處理空白鍵
    handleSpacebar(event);
});



function submitSentenceAnswer() {
    let sentenceObj = sentenceData[currentSentenceIndex];
    let correctSentence = sentenceObj.句子;
    let allInputs = document.querySelectorAll("#sentenceInput .letter-input");

    // 收集用戶答案
    let correctWords = correctSentence.split(/\b/);
    let userAnswer = [];
    let inputIndex = 0;

    correctWords.forEach((word, wordIndex) => {
        if (/\w+/.test(word)) {
            let inputWord = "";
            while (inputIndex < allInputs.length && parseInt(allInputs[inputIndex].dataset.wordIndex) === wordIndex) {
                inputWord += allInputs[inputIndex].value;
                inputIndex++;
            }
            userAnswer.push(inputWord);
        } else {
            userAnswer.push(word);
        }
    });

    // 標準化答案進行比較
    let userAnswerStr = userAnswer.join("").replace(/\s+/g, " ").replace(/,\s*/g, ",").trim().toLowerCase();
    let correctSentenceStr = correctSentence.replace(/\s+/g, " ").replace(/,\s*/g, ",").trim().toLowerCase();

    // 儲存用戶答案
    userAnswers[currentSentenceIndex] = userAnswer.join("").trim();

    // 檢查是否正確並更新 incorrectSentences
    let isCorrect = userAnswerStr === correctSentenceStr;
    if (!isCorrect) {
        if (!incorrectSentences.includes(sentenceObj.Words)) {
            incorrectSentences.push(sentenceObj.Words);
        }
    } else {
        let index = incorrectSentences.indexOf(sentenceObj.Words);
        if (index !== -1) {
            incorrectSentences.splice(index, 1);
        }
    }

    // 更新 UI
    updateSentenceHint(correctSentence, userAnswer);
    highlightUserAnswers(allInputs, correctSentence);

    let submitBtn = document.getElementById("submitSentenceBtn");
    submitBtn.innerText = "下一題";
    submitBtn.onclick = goToNextSentence;
    submitBtn.dataset.next = "true";
}


function updateSentenceHint(correctSentence, userAnswer) {
    // 將正確句子拆分成單字和標點符號
    let correctWords = correctSentence.split(/\b/);
    let userWords = userAnswer;

    // 格式化顯示內容
    let formattedSentence = correctWords.map((word, index) => {
        if (/\w+/.test(word)) { // 如果是單字
            let userWord = userWords[index] || ""; // 如果沒有輸入，預設為空字串
            if (userWord.toLowerCase() === word.toLowerCase()) {
                // 正確的單字：黑色粗體
                return `<span style="color: black; font-weight: bold;">${word}</span>`;
            } else {
                // 錯誤的單字：紅色粗體
                return `<span style="color: red; font-weight: bold;">${word}</span>`;
            }
        } else {
            // 標點符號：黑色普通字體
            return `<span style="color: black;">${word}</span>`;
        }
    }).join("");

    // 更新 sentenceHint 的顯示
    document.getElementById("sentenceHint").innerHTML = formattedSentence;
}


function highlightUserAnswers(allInputs, correctSentence) {
    let correctWords = correctSentence.split(/\b/);
    let inputIndex = 0;

    correctWords.forEach((word, index) => {
        if (/\w+/.test(word)) {
            let inputWord = "";
            let inputElements = [];

            while (inputIndex < allInputs.length && allInputs[inputIndex].dataset.wordIndex == index) {
                inputWord += allInputs[inputIndex].value;
                inputElements.push(allInputs[inputIndex]);
                inputIndex++;
            }

            if (inputWord.toLowerCase() === word.toLowerCase()) {
                inputElements.forEach(input => {
                    input.style.color = "black"; // 正確 → 黑體
                    input.style.fontWeight = "bold";
                });
            } else {
                word.split("").forEach((letter, letterIndex) => {
                    if (letterIndex < inputElements.length) {
                        let input = inputElements[letterIndex];
                        if (input.value.toLowerCase() === letter.toLowerCase()) {
                            input.style.color = "black"; // 正確字母 → 黑色
                        } else {
                            input.style.color = "red"; // 錯誤字母 → 紅色
                        }
                        input.style.fontWeight = "bold";
                    }
                });
            }
        }
    });
}



// 📌 切換到下一題
function goToNextSentence() {
    currentSentenceIndex++;
    if (currentSentenceIndex >= sentenceData.length) {
        alert("🎉 測驗結束！");
        finishSentenceQuiz();
        return;
    }

    loadSentenceQuestion();

    let submitBtn = document.getElementById("submitSentenceBtn");
    submitBtn.innerText = "提交";
    submitBtn.onclick = submitSentenceAnswer;
    submitBtn.dataset.next = "false"; // ✅ 重要！確保新題目時 `Enter` 先執行提交
}


// 📌 測驗完成後顯示結果
function finishSentenceQuiz() {
    document.getElementById("sentenceQuizArea").style.display = "none";
    document.getElementById("quizResult").style.display = "block";

    let resultContainer = document.getElementById("quizResult");
    resultContainer.innerHTML = "<h2>測驗結果</h2>";

    for (let index = 0; index < userAnswers.length; index++) {
        let sentenceObj = sentenceData[index];
        if (!sentenceObj) continue;

        let userAnswer = getUserAnswer(index);
        let correctSentence = sentenceObj.句子;

        let userAnswerNormalized = userAnswer.replace(/\s+/g, " ").replace(/,\s*/g, ",").trim().toLowerCase();
        let correctSentenceNormalized = correctSentence.replace(/\s+/g, " ").replace(/,\s*/g, ",").trim().toLowerCase();
        let isCorrect = userAnswerNormalized === correctSentenceNormalized;

        let importantCheckbox = `<input type="checkbox" onchange="toggleImportantSentence('${sentenceObj.Words}', this)" ${localStorage.getItem('important_sentence_' + sentenceObj.Words.toLowerCase()) === "true" ? "checked" : ""} />`;
        let sentenceIdentifierLink = `<a href="sentence.html?sentence=${encodeURIComponent(sentenceObj.Words)}&from=quiz&layer=4">${sentenceObj.Words}</a>`;
        let correctSentenceLink = `<a href="#" onclick="playSentenceAudio('${sentenceObj.Words}.mp3'); return false;">${correctSentence}</a>`;
        let correctnessDisplay = isCorrect ? "正確" : "錯誤";

        resultContainer.innerHTML += `
            <div class="result-item">
                ${importantCheckbox} 
                ${sentenceIdentifierLink} 
                ${correctSentenceLink} 
                <span>${correctnessDisplay}</span>
            </div>
        `;
    }

    // 修改按鈕區域，添加「匯出測驗結果」按鈕
    resultContainer.innerHTML += `
        <div class="result-buttons" style="margin-top: 20px;">
            <button class="action-button" onclick="saveQSResults()">儲存測驗結果</button>
            <button class="action-button" onclick="exportTestResults()">匯出測驗結果</button>
            <button class="action-button" onclick="returnToMainMenu()">回到測驗第一層</button>
        </div>
    `;

    console.log("📌 incorrectSentences after finish:", incorrectSentences);
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

// 在 q_sentence.js 中，finishSentenceQuiz() 之後加入
function saveQSResults() {
    localStorage.setItem("wrongQS", JSON.stringify(incorrectSentences));
    console.log("✅ 錯誤句子已儲存到 localStorage['wrongQS']:", incorrectSentences);
    alert("測驗結果中的錯誤句子已儲存！");
}

// 📌 連結到單字詳情頁面
function goToWordDetail(word) {
    // 移除後綴（如 -1, -2 等）
    let baseWord = word.replace(/-\d+$/, '');
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
        document.getElementById("mainMenu").style.display = "block";
    }

    document.getElementById("startSentenceQuizBtn").addEventListener("click", startSentenceQuiz);
});

// 新增恢復測驗結果的函數
function restoreQuizResult() {
    if (sentenceData.length === 0 || userAnswers.length === 0) {
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
    document.getElementById("quizResult").style.display = "none";

    // 重置選擇狀態
    selectedSentenceFilters.levels.clear();
    selectedSentenceFilters.categories.clear();
    selectedSentenceFilters.alphabet.clear();
    document.querySelectorAll(".category-button").forEach(button => {
        button.classList.remove("selected");
    });
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
function returnToMainMenu() {
    document.getElementById("quizResult").style.display = "none";
    document.getElementById("mainMenu").style.display = "block";
    
    // 重置測驗狀態
    currentSentenceIndex = 0;
    userAnswers = [];
    incorrectSentences = [];
    sentenceData = JSON.parse(localStorage.getItem("sentenceData")) || [];
    selectedSentenceFilters.levels.clear();
    selectedSentenceFilters.categories.clear();
    selectedSentenceFilters.alphabet.clear();

    // 可選：清空 localStorage（僅在需要時啟用）
    // localStorage.clear();
    // console.log("✅ 返回首頁並重置狀態與清空 LocalStorage");

    console.log("✅ 返回測驗第一層主選單");
}


