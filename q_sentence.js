console.log("✅ q_sentence.js 已載入");


const GITHUB_JSON_URL = "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Sentence%20file/sentence.json";
const GITHUB_MP3_BASE_URL = "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Sentence%20file/";

let sentenceData = JSON.parse(localStorage.getItem("sentenceData")) || [];
let currentSentenceIndex = 0;
let userAnswers = JSON.parse(localStorage.getItem("userAnswers")) || [];
let incorrectSentences = JSON.parse(localStorage.getItem("incorrectSentences")) || [];
let importantSentences = JSON.parse(localStorage.getItem("importantSentences")) || [];

// 📌 進入 Q Sentence 測驗分類頁面
function showSentenceQuizCategories() {
    document.querySelector("h1").textContent = "句子測驗區";
    document.getElementById("mainMenu").style.display = "none";
    document.getElementById("sentenceQuizCategories").style.display = "block";

    sessionStorage.setItem("loadedQSentence", "true");

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
    let alphabetContainer = document.createElement("div"); // 新增 A-Z 分類容器
    alphabetContainer.id = "alphabetButtons";

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

    // 生成等級按鈕
levelContainer.innerHTML = [...levels]
    .map(level => `<button class="category-button" onclick="startSentenceQuiz('${level}')">${level}</button>`)
    .join("");


    // 生成主題按鈕
categoryContainer.innerHTML = [...categories]
    .map(category => `<button class="category-button" onclick="startSentenceQuiz('${category}')">${category}</button>`)
    .join("");

categoryContainer.innerHTML += `<button class="category-button" onclick="startSentenceQuiz('important')">重要句子</button>`;
categoryContainer.innerHTML += `<button class="category-button" onclick="startSentenceQuiz('incorrect')">錯誤句子</button>`;


    // 生成 A-Z 按鈕
alphabetContainer.innerHTML = Object.keys(alphabetMap)
    .filter(letter => alphabetMap[letter].length > 0)
    .map(letter => `<button class="category-button" onclick="startSentenceQuiz('alpha_${letter}')">${letter}</button>`)
    .join("");

    // 將 A-Z 分類添加到頁面
    document.getElementById("sentenceQuizCategories").appendChild(alphabetContainer);
}


// 📌 開始測驗
function startSentenceQuiz(filter) {
    document.getElementById("sentenceQuizCategories").style.display = "none";
    document.getElementById("sentenceQuizArea").style.display = "block";

    let filteredSentences;

    if (filter === "important") {
        filteredSentences = sentenceData.filter(item => localStorage.getItem(`important_sentence_${item.Words}`) === "true");
    } else if (filter === "incorrect") {
        filteredSentences = sentenceData.filter(item => localStorage.getItem(`wrong_sentence_${item.Words}`) === "true");
    } else if (filter.startsWith("alpha_")) {
        let letter = filter.split("_")[1];
        filteredSentences = sentenceData.filter(item => item.句子.charAt(0).toUpperCase() === letter);
    } else {
        filteredSentences = sentenceData.filter(item => item.分類 === filter || item.等級 === filter);
    }

    if (filteredSentences.length === 0) {
        alert("❌ 沒有符合條件的測驗句子");
        return;
    }

    sentenceData = filteredSentences;
    currentSentenceIndex = 0;
    userAnswers = [];
    setTimeout(() => loadSentenceQuestion(), 100);
}


let currentAudio = null; // 儲存當前音檔，避免重複創建


function loadSentenceQuestion() {
    let sentenceObj = sentenceData[currentSentenceIndex];
    if (!sentenceObj) {
        console.error("❌ 找不到 sentenceObj！");
        return;
    }

    let sentenceText = sentenceObj.句子;
    let words = sentenceText.split(/\b/); // 使用正則表達式分割單字與標點符號

    let sentenceInputContainer = document.getElementById("sentenceInput");
    sentenceInputContainer.innerHTML = "";

    let firstInput = null; // 記錄第一個輸入框
    let allInputs = [];   // 儲存所有輸入框

    words.forEach((word, index) => {
        let wordContainer = document.createElement("div");
        wordContainer.classList.add("word-container");

        if (/\w+/.test(word)) { // 如果是單字
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
                    firstInput = input; // 記錄第一個輸入框
                }
            });
        } else { // 如果是標點符號
            let span = document.createElement("span");
            span.classList.add("punctuation");
            span.innerText = word;
            wordContainer.appendChild(span);
        }

        sentenceInputContainer.appendChild(wordContainer);
    });

    // 顯示完整的句子作為提示（sentenceHint）
    document.getElementById("sentenceHint").innerHTML = sentenceText;

    // 自動聚焦第一個輸入框
    if (firstInput) {
        firstInput.focus();
    }

    // 隱藏「下一題」按鈕
    document.getElementById("nextSentenceBtn").style.display = "none";

    // 播放音檔（保留原有邏輯）
    if (sentenceObj.Words) {
        let audioUrl = GITHUB_MP3_BASE_URL + encodeURIComponent(sentenceObj.Words) + ".mp3";
        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
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
    if (!sentenceObj) {
        console.error("❌ 無效的 sentenceObj");
        return;
    }

    let correctSentence = sentenceObj.句子;
    let allInputs = document.querySelectorAll("#sentenceInput .letter-input");

    // 將正確句子拆分成單字和標點符號
    let correctWords = correctSentence.split(/\b/);
    let userAnswer = [];
    let inputIndex = 0;

    // 收集使用者的回答
    correctWords.forEach((word, wordIndex) => {
        if (/\w+/.test(word)) { // 如果是單字
            let inputWord = "";
            while (inputIndex < allInputs.length && parseInt(allInputs[inputIndex].dataset.wordIndex) === wordIndex) {
                inputWord += allInputs[inputIndex].value;
                inputIndex++;
            }
            userAnswer.push(inputWord);
        } else { // 如果是標點符號
            userAnswer.push(word); // 直接保留標點符號
        }
    });

    // 存儲使用者回答
    userAnswers[currentSentenceIndex] = userAnswer.join(" ");

    // 更新 sentenceHint
    updateSentenceHint(correctSentence, userAnswer);
    highlightUserAnswers(allInputs, correctSentence);

    // 修改按鈕為「下一題」
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

    sentenceData.forEach((sentenceObj, index) => {
        let userAnswer = getUserAnswer(index);
        let correctSentence = sentenceObj.句子;
        let isCorrect = userAnswer.toLowerCase() === correctSentence.toLowerCase();

        if (!isCorrect) {
            incorrectSentences.push({
                Words: sentenceObj.Words,
                句子: correctSentence,
                userAnswer: userAnswer
            });
        }

        let wordButton = `<button class='word-button' onclick='goToWordDetail("${sentenceObj.Words}")'>${sentenceObj.Words}</button>`;
        let highlightedSentence = highlightErrors(correctSentence, userAnswer);
        let isImportant = localStorage.getItem(`important_sentence_${sentenceObj.Words}`) === "true";

        let sentenceHTML = `
            <div class='result-item'>
                ${wordButton}
                <p>正確句子: ${highlightedSentence}</p>
                <p>你的回答: ${userAnswer || "<未填寫>"}</p>
                <label>
                    <input type='checkbox' onchange='toggleImportantSentence("${sentenceObj.Words}", this)' ${isImportant ? "checked" : ""}> 標記為重要句子
                </label>
            </div>`;
        resultContainer.innerHTML += sentenceHTML;
    });

    resultContainer.innerHTML += `
        <button onclick='returnToSentenceCategorySelection()'>返回分類頁面</button>
        <button onclick='saveQuizResults()'>儲存測驗結果</button>
    `;
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
        // 這裡可以保留原有的初始化邏輯，例如顯示主選單
        document.getElementById("mainMenu").style.display = "block";
    }
});

// 新增恢復測驗結果的函數
function restoreQuizResult() {
    console.log("📌 sentenceData:", sentenceData);
    console.log("📌 userAnswers:", userAnswers);

    if (sentenceData.length === 0 || userAnswers.length === 0) {
        console.warn("⚠️ 無測驗資料可恢復，回到分類頁面");
        showSentenceQuizCategories();
        return;
    }

    document.getElementById("sentenceQuizCategories").style.display = "none";
    document.getElementById("sentenceQuizArea").style.display = "none";
    document.getElementById("quizResult").style.display = "block";
    finishSentenceQuiz(); // 重新生成測驗結果
}

// 📌 返回 Q Sentence 分類頁面
function returnToSentenceCategorySelection() {
    document.getElementById("sentenceQuizCategories").style.display = "block";
    document.getElementById("sentenceQuizArea").style.display = "none";
    document.getElementById("quizResult").style.display = "none"; // 隱藏結果頁面
}

// 📌 切換重要句子的狀態
function toggleImportantSentence(word, checkbox) {
    if (checkbox.checked) {
        localStorage.setItem(`important_sentence_${word}`, "true");
        console.log(`⭐ 句子 ${word} 標記為重要`);
    } else {
        localStorage.removeItem(`important_sentence_${word}`);
        console.log(`❌ 句子 ${word} 取消重要標記`);
    }
}

// 📌 儲存測驗結果
// 在 q_sentence.js 中
function saveQuizResults() {
    let incorrectWords = incorrectSentences.map(sentence => sentence.Words);
    let existingWrongSentences = JSON.parse(localStorage.getItem("wrongSentences")) || [];
    let updatedWrongSentences = [...new Set([...existingWrongSentences, ...incorrectWords])];
    localStorage.setItem("wrongSentences", JSON.stringify(updatedWrongSentences));
    alert("✅ 測驗結果已儲存！");
    console.log("📌 已儲存錯誤句子:", updatedWrongSentences);
}