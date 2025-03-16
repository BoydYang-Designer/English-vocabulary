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

let selectedSentenceFilters = {
    levels: new Set(),
    categories: new Set(),
    alphabet: new Set()
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

    if (getReturningStatus()) {
        console.log("✅ 從外部返回，顯示測驗結果");
        restoreQuizResult();
    } else {
        console.log("ℹ️ 正常載入 quiz.html");
        document.getElementById("mainMenu").style.display = "block";
    }

    document.getElementById("startSentenceQuizBtn").addEventListener("click", startSentenceQuiz);
});


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

    // 隨機排序 filteredSentences
    for (let i = filteredSentences.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [filteredSentences[i], filteredSentences[j]] = [filteredSentences[j], filteredSentences[i]];
    }

    // 使用臨時變數儲存本次測驗的句子，而不是修改全局 sentenceData
    currentQuizSentences = filteredSentences;
    currentSentenceIndex = 0;
    userAnswers = []; // 清空本次答案

    console.log("✅ 本次測驗的句子數量:", currentQuizSentences.length);
    console.log("✅ 本次測驗的隨機句子:", currentQuizSentences.map(s => s.Words));

    setTimeout(() => loadSentenceQuestion(), 100);
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

    let sentenceText = sentenceObj.句子;
    let words = sentenceText.split(/\b/);

    let sentenceInputContainer = document.getElementById("sentenceInput");
    sentenceInputContainer.innerHTML = "";

    let firstInput = null;
    let allInputs = [];

    // 計算最長單字的字母數
    let maxWordLength = Math.max(...words.filter(w => /\w+/.test(w)).map(w => w.length));
    let screenWidth = window.innerWidth || document.documentElement.clientWidth;
    let inputWidth = Math.min(15, Math.floor(screenWidth / (maxWordLength + 5))); // 動態計算寬度，留出餘量

    words.forEach((word, index) => {
        let wordContainer = document.createElement("div");
        wordContainer.classList.add("word-container");

        if (/\w+/.test(word)) {
            word.split("").forEach((_, letterIndex) => {
                let input = document.createElement("input");
                input.type = "text";
                input.maxLength = 1;
                input.classList.add("letter-input");
                input.style.width = `${inputWidth}px`; // 動態設置寬度
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

    // 提示文字邏輯保持不變
    let wordCount = words.filter(word => /\w+/.test(word)).length;
    let wordsToShow = Math.max(1, Math.floor(wordCount / 5));
    let indicesToShow = new Set();

    while (indicesToShow.size < wordsToShow) {
        let randomIndex = Math.floor(Math.random() * words.length);
        if (/\w+/.test(words[randomIndex])) {
            indicesToShow.add(randomIndex);
        }
    }

    let hintWords = words.map((word, index) => {
        if (/\w+/.test(word) && !indicesToShow.has(index)) {
            return "_".repeat(word.length);
        }
        return word;
    });

    document.getElementById("sentenceHint").innerHTML = hintWords.join("");

    if (firstInput) {
        firstInput.focus();
    }

    document.getElementById("nextSentenceBtn").style.display = "none";

    if (sentenceObj.Words) {
        let audioUrl = GITHUB_MP3_BASE_URL + encodeURIComponent(sentenceObj.Words) + ".mp3";
        if (currentAudio instanceof Audio) {
            currentAudio.pause();
        }
        currentAudio = new Audio(audioUrl);
        
        const playBtn = document.getElementById("playSentenceAudioBtn");
        playBtn.classList.remove("playing");
        
        currentAudio.play().catch(error => console.warn("🔊 自動播放被禁止", error));
        playBtn.onclick = () => playAudio();

        currentAudio.onended = () => {
            playBtn.classList.remove("playing");
            console.log("✅ 音檔播放結束");
        };
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
    let sentenceObj = currentQuizSentences[currentSentenceIndex];
    let correctSentence = sentenceObj.句子;
    let allInputs = document.querySelectorAll("#sentenceInput .letter-input");

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

    let userAnswerStr = userAnswer.join("").replace(/\s+/g, " ").replace(/,\s*/g, ",").trim().toLowerCase();
    let correctSentenceStr = correctSentence.replace(/\s+/g, " ").replace(/,\s*/g, ",").trim().toLowerCase();

    userAnswers[currentSentenceIndex] = userAnswer.join("").trim();

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
}


// 📌 測驗完成後顯示結果
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

        // 根據正確性添加類別，無需顯示文字
        let resultClass = isCorrect ? "correct" : (isUnanswered ? "unanswered" : "wrong");

        let importantCheckbox = `<input type="checkbox" class="important-checkbox" onchange="toggleImportantSentence('${sentenceObj.Words}', this)" ${localStorage.getItem('important_sentence_' + sentenceObj.Words.toLowerCase()) === "true" ? "checked" : ""} />`;
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
        document.getElementById("mainMenu").style.display = "block";
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
    
    // 只重置當前測驗狀態，不清空 incorrectSentences
    currentSentenceIndex = 0;
    userAnswers = [];
    sentenceData = JSON.parse(localStorage.getItem("sentenceData")) || [];
    selectedSentenceFilters.levels.clear();
    selectedSentenceFilters.categories.clear();
    selectedSentenceFilters.alphabet.clear();

    console.log("✅ 返回測驗第一層主選單，保留 incorrectSentences:", incorrectSentences);
}


