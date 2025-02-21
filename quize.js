// quize.js - 修正版：統一播放發音功能並解決重複定義問題

let wordsData = []; // 儲存從 JSON 取得的單字資料
let selectedCategory = null; // 儲存目前選擇的測驗分類
let quizWords = []; // 儲存當前測驗單字
let currentWord = null; // 當前測驗的單字
let currentAudio = null; // 當前單字的音檔
let isDataLoaded = false; // 確認資料是否成功載入
const baseURL = "https://github.com/BoydYang-Designer/English-vocabulary/raw/main/audio_files/"; // 音檔路徑
let quizResults = []; // 儲存測驗結果

// 初始化頁面並載入 JSON
document.addEventListener("DOMContentLoaded", function () {
    fetch("https://boydyang-designer.github.io/English-vocabulary/Z_total_words.json")
        .then(res => res.json())
        .then(data => {
            wordsData = data["New Words"] || [];
            isDataLoaded = true;
            console.log("✅ 單字資料已載入");
        })
        .catch(err => console.error("❌ 讀取 JSON 失敗:", err));
});

// 統一撥放指定單字音檔
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

// 返回主選單
function returnToMainMenu() {
    document.getElementById("mainMenu").style.display = "block";
    document.getElementById("quizCategories").style.display = "none";
}

// 顯示測驗分類選擇頁面
function showQuizCategories() {
    if (!isDataLoaded) {
        alert("⚠️ 單字資料尚未載入完成，請稍後再試。");
        return;
    }
    document.getElementById("mainMenu").style.display = "none";
    document.getElementById("quizCategories").style.display = "block";
    generateCategoryButtons();
}

// 生成分類按鈕（字母、類別、等級、Checked）
function generateCategoryButtons() {
    createAlphabetButtons();
    createCategoryButtons();
    createLevelButtons();
    createCheckedWordsButton();
}

// 生成字母分類按鈕
function createAlphabetButtons() {
    let alphabetContainer = document.getElementById("alphabetButtons");
    alphabetContainer.innerHTML = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(letter =>
        `<button class='category-button' onclick='selectCategory("letter", "${letter}")'>${letter}</button>`
    ).join("");
}

// 生成類別分類按鈕
function createCategoryButtons() {
    let categories = [...new Set(wordsData.map(w => w["分類"] || "未分類"))];
    let categoryContainer = document.getElementById("categoryButtons");
    categoryContainer.innerHTML = categories.map(category =>
        `<button class='category-button' onclick='selectCategory("category", "${category}")'>${category}</button>`
    ).join(" ");
}

// 生成等級分類按鈕
function createLevelButtons() {
    let levels = [...new Set(wordsData.map(w => w["等級"] || "未分類"))];
    let levelContainer = document.getElementById("levelButtons");
    levelContainer.innerHTML = levels.map(level =>
        `<button class='category-button' onclick='selectCategory("level", "${level}")'>${level}</button>`
    ).join(" ");
}

// 生成 Checked 分類按鈕
function createCheckedWordsButton() {
    let checkedWords = Object.keys(localStorage).filter(key => key.startsWith("checked_"));
    if (checkedWords.length > 0) {
        document.getElementById("checkedCategory").innerHTML = 
            `<button class='category-button' onclick='selectCategory("checked")'>Checked 單字 (${checkedWords.length})</button>`;
    }
}

// 選擇分類後開始測驗
function selectCategory(type, value) {
    selectedCategory = { type, value };
    filterWordsForQuiz();
}

// 根據分類篩選單字開始測驗
function filterWordsForQuiz() {
    let filteredWords = [];
    if (selectedCategory.type === "letter") {
        filteredWords = wordsData.filter(w => w.Words.toLowerCase().startsWith(selectedCategory.value.toLowerCase()));
    } else if (selectedCategory.type === "category") {
        filteredWords = wordsData.filter(w => w["分類"] === selectedCategory.value);
    } else if (selectedCategory.type === "level") {
        filteredWords = wordsData.filter(w => w["等級"] === selectedCategory.value);
    } else if (selectedCategory.type === "checked") {
        let checkedWords = Object.keys(localStorage).filter(key => key.startsWith("checked_"));
        filteredWords = wordsData.filter(w => checkedWords.includes(w.Words));
    }

    if (filteredWords.length === 0) {
        alert("⚠️ 沒有符合條件的單字！");
        return;
    }
    quizWords = filteredWords;
    startQuiz();
}

// 開始測驗流程
function startQuiz() {
    document.getElementById("quizCategories").style.display = "none";
    document.getElementById("quizArea").style.display = "block";
    loadNextWord();
}


// 提交答案並顯示正確答案與答題結果
function submitAnswer() {
    let userAnswer = document.getElementById("wordInput").value.trim().toLowerCase();
    let correctAnswer = currentWord.toLowerCase();
    let isCorrect = userAnswer === correctAnswer;

    // 顯示正確答案與結果標記
    let resultDisplay = document.getElementById("resultDisplay");
    if (!resultDisplay) {
        resultDisplay = document.createElement("div");
        resultDisplay.id = "resultDisplay";
        document.getElementById("quizArea").appendChild(resultDisplay);
    }
    resultDisplay.innerHTML = `正確答案: <strong>${currentWord}</strong> ${isCorrect ? '✅' : '❌'}`;

    // 記錄測驗結果（不立即儲存）
    quizResults.push({
        word: currentWord,
        result: isCorrect ? "正確" : "錯誤",
        timestamp: new Date().toLocaleString()
    });

    setTimeout(loadNextWord, 1500); // 1.5 秒後自動顯示下一題
}


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

    let hint = currentWord[0];
    for (let i = 1; i < currentWord.length - 1; i++) {
        hint += " _";
    }
    hint += " " + currentWord[currentWord.length - 1];

    document.getElementById("wordHint").innerText = hint;
    document.getElementById("wordInput").value = "";

    let resultDisplay = document.getElementById("resultDisplay");
    if (resultDisplay) resultDisplay.innerHTML = "";

    // 綁定播放按鈕到當前單字
    const playButton = document.getElementById("playAudioBtn");
    if (playButton) {
        playButton.onclick = () => playAudioForWord(currentWord);
    }
}


// 完成測驗後顯示結果統計，包含單字、音標、對錯標記與重要單字勾選功能
function finishQuiz() {
    document.getElementById("quizArea").style.display = "none";
    document.getElementById("quizResult").style.display = "block";

    let resultContainer = document.getElementById("quizResult");
    resultContainer.innerHTML = `<h2>測驗結果統計</h2>`;

    let resultList = quizResults.map(result => {
        return `
            <div class='result-item'>
                <button class='word-link' onclick="playAudioForWord('${result.word}')">${result.word}</button>
                <span class='result-status'>${result.result === '正確' ? '✅' : '❌'}</span>
                <label class='important-word'>
                    <input type='checkbox' class='important-checkbox' data-word='${result.word}'> 重要單字
                </label>
            </div>
        `;
    }).join("");

    resultContainer.innerHTML += `
        <div>${resultList}</div>
        <button class='button' onclick='saveQuizResults()'>儲存此次測驗結果</button>
    `;
}



// 儲存測驗結果與重要單字至 localStorage
function saveQuizResults() {
    let timestamp = new Date().toLocaleString();
    localStorage.setItem(`quiz_session_${timestamp}`, JSON.stringify(quizResults));

    // 儲存重要單字
    document.querySelectorAll('.important-checkbox').forEach(checkbox => {
        if (checkbox.checked) {
            let word = checkbox.dataset.word;
            localStorage.setItem(`important_${word}`, true);
        }
    });

    alert("✅ 測驗結果與重要單字已成功儲存！");
}


// 返回測驗首頁
function returnToMainMenu() {
    document.getElementById("quizResult").style.display = "none";
    document.getElementById("mainMenu").style.display = "block";
}



// 將播放音檔按鈕與提交按鈕綁定功能
document.getElementById("playAudioBtn").addEventListener("click", playAudio);
document.querySelector("button[onclick='submitAnswer()']").addEventListener("click", submitAnswer);
