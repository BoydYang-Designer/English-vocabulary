// 初始化頁面並載入 JSON
let selectedCategory = null; // 儲存目前選擇的測驗分類
let selectedFilters = {
    letters: new Set(),
    categories: new Set(),
    levels: new Set(),
    checked: false
};
let wordsData = [];
let quizWords = [];
let currentWord = null;
let isDataLoaded = false;
let quizResults = [];
const baseURL = "https://github.com/BoydYang-Designer/English-vocabulary/raw/main/audio_files/";

document.addEventListener("DOMContentLoaded", function () {
    fetch("https://boydyang-designer.github.io/English-vocabulary/Z_total_words.json")
        .then(res => res.json())
        .then(data => {
            wordsData = data["New Words"] || [];
            isDataLoaded = true;
            console.log("✅ 單字資料已載入");
        })
        .catch(err => console.error("❌ 讀取 JSON 失敗:", err));
    initializeStartQuizButton();
    highlightCheckedWords();
});


// 播放音檔
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


// 返回分類選擇頁面
function returnToCategorySelection() {
    document.getElementById("quizArea").style.display = "none";
    document.getElementById("quizCategories").style.display = "block";
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
    let checkedButton = document.querySelector("#checkedCategory button");
    if (selectedFilters.checked) {
        checkedButton.classList.add("selected"); // 加入選擇樣式
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


function filterQuizWords() {
    let filteredWords = wordsData.filter(word => {
        let letterMatch = selectedFilters.letters.size === 0 || selectedFilters.letters.has(word.Words[0].toUpperCase());
        let categoryMatch = selectedFilters.categories.size === 0 || selectedFilters.categories.has(word["分類"]);
        let levelMatch = selectedFilters.levels.size === 0 || selectedFilters.levels.has(word["等級"]);
        let checkedMatch = !selectedFilters.checked || localStorage.getItem(`checked_${word.Words}`) === "true";
        return letterMatch && categoryMatch && levelMatch && checkedMatch;
    });

    if (filteredWords.length === 0) {
        alert("⚠️ 沒有符合條件的單字！");
        return;
    }

    quizWords = filteredWords;
    startQuiz();
}

function generateMultiSelectButtons() {
    let alphabetContainer = document.getElementById("alphabetButtons");
    alphabetContainer.innerHTML = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(letter =>
        `<button class='category-button' onclick='toggleSelection("letters", "${letter}")'>${letter}</button>`
    ).join("");

    let categories = [...new Set(wordsData.map(w => w["分類"] || "未分類"))];
    let categoryContainer = document.getElementById("categoryButtons");
    categoryContainer.innerHTML = categories.map(category =>
        `<button class='category-button' onclick='toggleSelection("categories", "${category}")'>${category}</button>`
    ).join(" ");

    let levels = [...new Set(wordsData.map(w => w["等級"] || "未分類"))];
    let levelContainer = document.getElementById("levelButtons");
    levelContainer.innerHTML = levels.map(level =>
        `<button class='category-button' onclick='toggleSelection("levels", "${level}")'>${level}</button>`
    ).join(" ");

    let checkedContainer = document.getElementById("checkedCategory");
    checkedContainer.innerHTML = `<button class='category-button' onclick='toggleCheckedSelection()'>Checked 單字</button>`;
}

function showQuizCategories() {
    if (!isDataLoaded) {
        alert("⚠️ 單字資料尚未載入完成，請稍後再試。");
        return;
    }
    document.getElementById("mainMenu").style.display = "none";
    document.getElementById("quizCategories").style.display = "block";
    generateMultiSelectButtons();
    document.getElementById("startFilteredQuizBtn").style.display = "block";
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
        startQuizBtn.addEventListener("click", filterQuizWords);
    }
}

// 開始測驗
function startQuiz() {
    document.getElementById("quizCategories").style.display = "none";
    document.getElementById("quizArea").style.display = "block";
    loadNextWord();
}


// 提交答案並檢查正確性
function submitAnswer() {
    let userAnswer = document.getElementById("wordInput").value.trim().toLowerCase();
    let correctAnswer = currentWord.toLowerCase();
    let isCorrect = userAnswer === correctAnswer;

    quizResults.push({
        word: currentWord,
        result: isCorrect ? "正確" : "錯誤",
        timestamp: new Date().toLocaleString()
    });

    // 顯示完整單字，並根據答對或答錯設定顏色
    let revealedWord = currentWord[0]; // 保留第一個字母
    for (let i = 1; i < currentWord.length - 1; i++) {
        let letterStyle = isCorrect ? "color: black;" : "color: red;";
        revealedWord += ` <span style="${letterStyle}">${currentWord[i]}</span>`;
    }
    revealedWord += ` ${currentWord[currentWord.length - 1]}`; // 保留最後一個字母

    document.getElementById("wordHint").innerHTML = revealedWord;

    // 延遲 1.5 秒後自動顯示下一題
    setTimeout(loadNextWord, 1500);
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
    resultContainer.innerHTML = `<h2>測驗結果</h2>`; // 修改標題，移除統計數字

    // 顯示單字測驗結果列表
    let resultList = quizResults.map(result => {
        let wordData = wordsData.find(w => w.Words === result.word);
        let pronunciation1 = wordData && wordData["pronunciation-1"] ? wordData["pronunciation-1"] : "";
        let pronunciation2 = wordData && wordData["pronunciation-2"] ? wordData["pronunciation-2"] : "";

        let phonetics = pronunciation1;
        if (pronunciation2) {
            phonetics += ` / ${pronunciation2}`;
        }

        return `
            <div class='result-item'>
                <button class='word-link' onclick="goToWordDetail('${result.word}')">${result.word}</button>
                <button class='phonetic-btn' onclick="playAudioForWord('${result.word}')">${phonetics}</button>
                <span class='result-status'>${result.result === '正確' ? '✅' : '❌'}</span>
                <label class='important-word'>
                    <input type='checkbox' class='important-checkbox' data-word='${result.word}'> 重要單字
                </label>
            </div>
        `;
    }).join("");

    // 顯示單字結果與按鈕
    resultContainer.innerHTML += `
        <div>${resultList}</div>
        <div class="button-group">
            <button class="button" onclick="saveQuizResults()">儲存此次測驗結果</button>
            <button class="button" onclick="returnToMainMenu()">返回主頁</button>
        </div>
    `;
}


// 跳轉到單字詳情頁面並保存當前狀態與測驗結果
function goToWordDetail(word) {
    // 儲存測驗結果區塊的滾動位置
    let resultContainer = document.getElementById("quizResult");
    let scrollPosition = resultContainer ? resultContainer.scrollTop : 0;
    
    // 儲存當前狀態與測驗結果到 localStorage
    localStorage.setItem('quizScrollPosition', scrollPosition);
    localStorage.setItem('currentQuizResults', JSON.stringify(quizResults));

    // 加上來源參數，並傳遞來自 quize 的資訊
    window.location.href = `index.html?word=${encodeURIComponent(word)}&from=quiz`;
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


// 返回首頁並重置所有狀態
// ✅ 確保在回到主頁時才清空 quizResults
function returnToMainMenu() {
    document.getElementById("quizCategories").style.display = "none";
    document.getElementById("quizArea").style.display = "none";
    document.getElementById("quizResult").style.display = "none";
    document.getElementById("reviewSection").style.display = "none";
    document.getElementById("mainMenu").style.display = "block";

    selectedFilters.letters.clear();
    selectedFilters.categories.clear();
    selectedFilters.levels.clear();
    selectedFilters.checked = false;

    quizWords = [];
    quizResults = []; // 只在返回主頁時清空
    currentWord = null;

    document.querySelectorAll(".category-button").forEach(button => {
        button.classList.remove("selected");
    });

    document.getElementById("wordInput").value = "";
    document.getElementById("wordHint").innerText = "";

    console.log("✅ 返回首頁並重置狀態");
}

// 將播放音檔按鈕與提交按鈕綁定功能
// 綁定中央播放按鈕功能
document.getElementById("playAudioCenterBtn").addEventListener("click", function() {
    if (currentWord) {
        playAudioForWord(currentWord);
    }
});

// ✅ 恢復測驗結果並重新顯示
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

        return `
            <div class='result-item'>
                <button class='word-link' onclick="goToWordDetail('${result.word}')">${result.word}</button>
                <button class='phonetic-btn' onclick="playAudioForWord('${result.word}')">${phonetics}</button>
                <span class='result-status'>${result.result === '正確' ? '✅' : '❌'}</span>
                <label class='important-word'>
                    <input type='checkbox' class='important-checkbox' data-word='${result.word}'> 重要單字
                </label>
            </div>
        `;
    }).join("");

    // 加上按鈕與結果內容
    resultContainer.innerHTML += `
        <div>${resultList}</div>
        <div class="button-group">
            <button class="button" onclick="saveQuizResults()">儲存此次測驗結果</button>
            <button class="button" onclick="returnToMainMenu()">返回主頁</button>
        </div>
    `;
}


// 取消按鈕返回上一頁
document.getElementById("cancelBtn").addEventListener("click", returnToCategorySelection);



