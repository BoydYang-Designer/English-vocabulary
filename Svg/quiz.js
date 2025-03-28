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
    fetch("https://boydyang-designer.github.io/English-vocabulary/Z_total_words.json")
        .then(res => res.json())
        .then(data => {
            wordsData = data["New Words"] || [];
            isDataLoaded = true;
            console.log("✅ 單字資料已載入");

            // ✅ 如果 LocalStorage 中有儲存的測驗結果，則自動恢復
            if (localStorage.getItem("currentQuizResults")) {
                quizResults = JSON.parse(localStorage.getItem("currentQuizResults"));
                restoreQuizResults(); // 呼叫自動恢復測驗結果
            }
        })
        .catch(err => console.error("❌ 讀取 JSON 失敗:", err));

    initializeStartQuizButton();
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

    // ✅ 新增 Checked, 重要單字, 錯誤單字按鈕
    let checkedContainer = document.getElementById("checkedCategory");
    checkedContainer.innerHTML = `
        <button class='category-button' onclick='toggleCheckedSelection()'>Checked 單字</button>
        <button class='category-button' onclick='toggleImportantSelection()'>重要單字</button>
        <button class='category-button' onclick='toggleWrongSelection()'>錯誤單字</button>
    `;
}

function showQuizCategories() {
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


/// 提交答案並檢查正確性
// 提交答案並檢查正確性
function submitAnswer() {
    let userAnswer = Array.from(document.querySelectorAll("#wordInput input"))
                          .map(input => input.value.trim().toLowerCase())
                          .join(""); // 取得使用者輸入的單字（合併成字串）
    let correctAnswer = currentWord.toLowerCase();

    // ✅ 標準化比較（移除空格和 `-`）
    let normalizedUserAnswer = userAnswer.replace(/[\s-]/g, ""); 
    let normalizedCorrectAnswer = correctAnswer.replace(/[\s-]/g, "");

    let isCorrect = normalizedUserAnswer === normalizedCorrectAnswer;

    quizResults.push({
        word: currentWord,
        result: isCorrect ? "正確" : "錯誤",
        timestamp: new Date().toLocaleString()
    });

    // ✅ 立即儲存錯誤單字到 localStorage
    let storedWrongWords = JSON.parse(localStorage.getItem('wrongWords')) || [];
    if (!isCorrect) {
        if (!storedWrongWords.includes(currentWord)) {
            storedWrongWords.push(currentWord);
        }
    } else {
        storedWrongWords = storedWrongWords.filter(word => word !== currentWord);
    }
    localStorage.setItem('wrongWords', JSON.stringify(storedWrongWords));

    // ✅ 顯示提示
    let wordHint = document.getElementById("wordHint");
    let revealedWord = currentWord[0];
    for (let i = 1; i < currentWord.length - 1; i++) {
        revealedWord += ` <span style="color: ${isCorrect ? 'black' : 'red'};">${currentWord[i]}</span>`;
    }
    revealedWord += ` ${currentWord[currentWord.length - 1]}`;
    wordHint.innerHTML = revealedWord;

    if (isCorrect) {
        setTimeout(goToNextWord, 1500); // ✅ 答對後 1.5 秒自動進入下一題
    } else {
        // ✅ 答錯時才顯示「下一題」按鈕
        document.getElementById("submitBtn").style.display = "none"; 
        document.getElementById("nextBtn").style.display = "inline-block"; 
    }
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
    let wordLength = currentWord.length; // 根據單字的長度設置格子數量
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

        return `
           <div class='result-item'>
                <label class='important-word'>
                    <input type='checkbox' class='important-checkbox' data-word='${result.word}' 
                    ${localStorage.getItem(`important_${result.word}`) === "true" ? "checked" : ""} 
                    onchange='toggleImportant("${result.word}", this)'>
                </label>
                <button class='word-link' onclick="goToWordDetail('${result.word}')">${result.word}</button>
                <button class='phonetic-btn' onclick="playAudioForWord('${result.word}')">${phonetics}</button>
                <span class='result-status'>${result.result === '正確' ? '✅' : '❌'}</span>
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






function returnToMainMenu() {
    document.getElementById("quizCategories").style.display = "none";
    document.getElementById("quizArea").style.display = "none";
    document.getElementById("quizResult").style.display = "none";
    document.getElementById("mainMenu").style.display = "block";

    selectedFilters.letters.clear();
    selectedFilters.categories.clear();
    selectedFilters.levels.clear();
    selectedFilters.checked = false;

    quizWords = [];
    quizResults = []; // 清空測驗結果
    currentWord = null;

    document.querySelectorAll(".category-button").forEach(button => {
        button.classList.remove("selected");
    });

    document.getElementById("wordInput").value = "";
    document.getElementById("wordHint").innerText = "";

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

        return `
            <div class='result-item'>
                <label class='important-word'>
                    <input type='checkbox' class='important-checkbox' data-word='${result.word}' 
                    ${localStorage.getItem(`important_${result.word}`) === "true" ? "checked" : ""} 
                    onchange='toggleImportant("${result.word}", this)'>
                </label>
                <button class='word-link' onclick="goToWordDetail('${result.word}')">${result.word}</button>
                <button class='phonetic-btn' onclick="playAudioForWord('${result.word}')">${phonetics}</button>
                <span class='result-status'>${result.result === '正確' ? '✅' : '❌'}</span>
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



