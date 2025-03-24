let selectedCategory = null;
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
    const params = new URLSearchParams(window.location.search);
    const show = params.get("show");

    const sentenceButton = document.getElementById("sentencePageBtn");
    if (sentenceButton) {
        sentenceButton.addEventListener("click", function () {
            window.location.href = "sentence.html";
        });
    }

    fetch("https://boydyang-designer.github.io/English-vocabulary/Z_total_words.json")
        .then(res => res.json())
        .then(data => {
            wordsData = data["New Words"] || [];
            isDataLoaded = true;
            console.log("✅ 單字資料已載入");

            if (localStorage.getItem("currentQuizResults")) {
                quizResults = JSON.parse(localStorage.getItem("currentQuizResults"));
                restoreQuizResults();
            } else if (show === "categories") {
                showQuizCategories();
            } else if (show === "sentenceCategories") { // 新增這部分
                showSentenceQuizCategories();
            }
        })
        .catch(err => {
            console.error("❌ 讀取 JSON 失敗:", err);
            alert("⚠️ 無法載入單字資料，請稍後再試。");
        });

    initializeStartQuizButton();

        // 監聽鍵盤事件，按下空白鍵播放音檔
        document.addEventListener("keydown", function(event) {
            if (event.key === " " || event.key === "Spacebar") { // 兼容不同瀏覽器的空白鍵鍵值
                event.preventDefault();  // 防止空白鍵觸發其他瀏覽器行為（如滾動頁面）
                if (currentWord) {
                    playAudioForWord(currentWord); // 播放當前單字的音檔
                }
            }
    
            // 當在輸入框中時，按下箭頭鍵控制焦點跳轉
            let activeInput = document.querySelector("#wordInput input:focus");
    
            // 左箭頭鍵：移動焦點到前一個格子（如果不是已經是第一個格子）
            if (activeInput && event.key === "ArrowLeft") {
                let previousInput = activeInput.previousElementSibling;
                if (previousInput) {
                    previousInput.focus(); // 移動焦點到前一個輸入框
                }
            }
    
            // 右箭頭鍵：移動焦點到下一個格子（如果不是已經是最後一個格子）
            if (activeInput && event.key === "ArrowRight") {
                let nextInput = activeInput.nextElementSibling;
                if (nextInput) {
                    nextInput.focus(); // 移動焦點到下一個輸入框
                }
            }
    
            // 監聽刪除鍵（Backspace）處理
            if (event.key === "Backspace") {
                if (activeInput && activeInput.value === "") {
                    // 如果當前格子是空的，跳回上一格
                    let previousInput = activeInput.previousElementSibling;
                    if (previousInput) {
                        previousInput.focus(); // 移動焦點到前一個輸入框
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

        // ✅ 確保「未分類」的種類被識別
        let wordCategory = word["分類"] || "未分類(種類)";
        let categoryMatch = selectedFilters.categories.size === 0 || selectedFilters.categories.has(wordCategory);

        // ✅ 確保「未分類」的等級被識別
        let wordLevel = word["等級"] || "未分類(等級)";
        let levelMatch = selectedFilters.levels.size === 0 || selectedFilters.levels.has(wordLevel);

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

    let categories = [...new Set(wordsData.map(w => w["分類"] || "未分類(種類)"))]; // ✅ UI 改名稱
    let categoryContainer = document.getElementById("categoryButtons");
    categoryContainer.innerHTML = categories.map(category =>
        `<button class='category-button' onclick='toggleSelection("categories", "${category}")'>${category}</button>`
    ).join(" ");
    
    let levels = [...new Set(wordsData.map(w => w["等級"] || "未分類(等級)"))]; // ✅ UI 改名稱
    let levelContainer = document.getElementById("levelButtons");
    levelContainer.innerHTML = levels.map(level =>
        `<button class='category-button' onclick='toggleSelection("levels", "${level}")'>${level}</button>`
    ).join(" ");
    

    // ✅ 新增 Checked, 重要單字, 錯誤單字按鈕
    let checkedContainer = document.getElementById("checkedCategory");
    checkedContainer.innerHTML = `
        <button class='category-button' onclick='toggleCheckedSelection()'>Checked 單字</button>
        <button class='category-button' onclick='toggleImportantSelection()'>重要單字</button>
        <button class='category-button' onclick='toggleWrongSelection()'>錯誤單字</button>
    `;
}

function showQuizCategories() {
    document.querySelector("h1").textContent = "單字測驗區";
    if (!isDataLoaded) {
        alert("⚠️ 單字資料尚未載入完成，請稍後再試。");
        return;
    }
    document.getElementById("mainMenu").style.display = "none";
    document.getElementById("quizCategories").style.display = "block";
    generateMultiSelectButtons(); // 產生篩選按鈕
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
    const quizArea = document.getElementById("quizArea");
    if (!quizArea || quizArea.style.display === "none") {
        return;
    }

    let userAnswer = Array.from(document.querySelectorAll("#wordInput input"))
                          .map(input => input.value.trim().toLowerCase())
                          .join("");
    let correctAnswer = currentWord.toLowerCase();

    let normalizedUserAnswer = userAnswer.replace(/[\s-]/g, "");
    let normalizedCorrectAnswer = correctAnswer.replace(/[\s-]/g, "");

    let result = normalizedUserAnswer === '' ? '未作答' : (normalizedUserAnswer === normalizedCorrectAnswer ? '正確' : '錯誤');

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

    // **修正錯誤標記**
    let userWords = userAnswer.split(" ");
    let correctWords = correctAnswer.split(" ");
    let revealedWord = "";

    for (let i = 0; i < correctWords.length; i++) {
        let correctWord = correctWords[i] || "";
        let userWord = userWords[i] || "";

        let wordHint = "";
        let minLen = Math.min(userWord.length, correctWord.length);
        let maxLen = correctWord.length;

        for (let j = 0; j < maxLen; j++) {
            if (j < userWord.length && userWord[j] === correctWord[j]) {
                // ✅ 正確字母顯示黑色
                wordHint += `<span class="correct-letter">${correctWord[j]}</span>`;
            } else if (j < userWord.length) {
                // ❌ 使用者輸入錯誤的字母
                wordHint += `<span class="wrong-letter">${correctWord[j]}</span>`;
            } else {
                // ⚠️ **這裡修正了長度不足時的顯示**
                wordHint += `<span class="missing-letter">${correctWord[j]}</span>`;
            }
        }

        revealedWord += wordHint;

        // ✅ 確保單字間的空格正常顯示
        if (i < correctWords.length - 1) {
            revealedWord += `<span class="correct-letter"> </span>`;
        }
    }

    document.getElementById("wordHint").innerHTML = revealedWord;

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

//篩選「重要單字」測驗
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
    startQuiz(); // ✅ 直接開始測驗
}

// 篩選「錯誤單字」測驗
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
    startQuiz(); // ✅ 直接開始測驗
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
function returnToMainMenu() {
    document.querySelector("h1").textContent = "測驗區";
    document.getElementById("quizCategories").style.display = "none";
    document.getElementById("quizArea").style.display = "none";
    document.getElementById("quizResult").style.display = "none";
    document.getElementById("mainMenu").style.display = "block";

    selectedFilters.letters.clear();
    selectedFilters.categories.clear();
    selectedFilters.levels.clear();
    selectedFilters.checked = false;

    quizWords = [];
    quizResults = [];
    currentWord = null;

    document.querySelectorAll(".category-button").forEach(button => {
        button.classList.remove("selected");
    });

    document.getElementById("wordInput").value = "";
    document.getElementById("wordHint").innerText = "";

    // ✅ 清除 Q Sentence 內的分類資訊
    sessionStorage.removeItem("loadedQSentence");
    document.getElementById("sentenceQuizCategories").style.display = "none";

    // ✅ 清除 LocalStorage 中的測驗結果與滾動位置
    localStorage.removeItem("currentQuizResults");
    localStorage.removeItem("quizScrollPosition");

    console.log("✅ 返回首頁並重置狀態與清空 LocalStorage");
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



