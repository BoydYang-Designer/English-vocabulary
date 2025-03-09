console.log("✅ q_sentence.js 已載入");


const GITHUB_JSON_URL = "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Sentence%20file/sentence.json";
const GITHUB_MP3_BASE_URL = "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Sentence%20file/";

let sentenceData = [];
let currentSentenceIndex = 0;
let incorrectSentences = JSON.parse(localStorage.getItem("incorrectSentences")) || [];
let importantSentences = JSON.parse(localStorage.getItem("importantSentences")) || [];

// 📌 進入 Q Sentence 測驗分類頁面
function showSentenceQuizCategories() {
    document.getElementById("mainMenu").style.display = "none";
    document.getElementById("sentenceQuizCategories").style.display = "block";

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

// 📌 生成分類（等級與主題）
function generateSentenceCategories(data) {
    let levelContainer = document.getElementById("sentenceLevelButtons");
    let categoryContainer = document.getElementById("sentenceCategoryButtons");

    let levels = new Set();
    let categories = new Set();

    data.forEach(item => {
        let level = item.等級 || "未分類(等級)";
        let category = item.分類 || "未分類";
        
        levels.add(level);
        categories.add(category);
    });

    console.log("📌 等級分類:", [...levels]);
    console.log("📌 主題分類:", [...categories]);

    levelContainer.innerHTML = [...levels].map(level => `<button class="button" onclick="startSentenceQuiz('${level}')">${level}</button>`).join("");
    categoryContainer.innerHTML = [...categories].map(category => `<button class="button" onclick="startSentenceQuiz('${category}')">${category}</button>`).join("");
}

// 📌 開始測驗
function startSentenceQuiz(filter) {
    document.getElementById("sentenceQuizCategories").style.display = "none";
    document.getElementById("sentenceQuizArea").style.display = "block";

    let filteredSentences = sentenceData.filter(item => 
        item.分類 === filter || item.等級 === filter
    );

    if (filteredSentences.length === 0) {
        alert("❌ 沒有符合條件的測驗句子");
        return;
    }

    sentenceData = filteredSentences;
    currentSentenceIndex = 0;

    // 延遲執行，確保 DOM 元素已載入
    setTimeout(() => {
        loadSentenceQuestion();
    }, 100);
}



let currentAudio = null; // 儲存當前音檔，避免重複創建


function loadSentenceQuestion() {
    let sentenceObj = sentenceData[currentSentenceIndex];
    let sentenceText = sentenceObj.句子;
    let words = sentenceText.split(" ");

    let totalWords = words.length;
    let numToHide = Math.floor(totalWords * 4 / 5);
    let numToShow = totalWords - numToHide;

    let visibleIndexes = new Set();
    while (visibleIndexes.size < numToShow) {
        let randIndex = Math.floor(Math.random() * totalWords);
        visibleIndexes.add(randIndex);
    }

    words = words.map((word, index) => visibleIndexes.has(index) ? word : "_".repeat(word.length));

    let maskedSentence = words.join(" ");
    document.getElementById("sentenceHint").innerText = maskedSentence;

    // 確保 #userSentenceAnswer 存在
    let userAnswerInput = document.getElementById("userSentenceAnswer");
    if (!userAnswerInput) {
        console.error("❌ 錯誤: 找不到 #userSentenceAnswer，請檢查 HTML 結構！");
        return; // 避免繼續執行導致錯誤
    }

    userAnswerInput.value = ""; // 清空舊答案
    document.getElementById("nextSentenceBtn").style.display = "none";

    // ✅ **設置 MP3 檔案**
    if (sentenceObj.Words) {  
        let audioUrl = GITHUB_MP3_BASE_URL + encodeURIComponent(sentenceObj.Words) + ".mp3";

        console.log("🎵 準備音檔:", audioUrl);

        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }

        currentAudio = new Audio(audioUrl);

        let playButton = document.getElementById("playSentenceAudioBtn");
        if (playButton) {
            playButton.onclick = playAudio;
        }

        currentAudio.play()
            .then(() => console.log("✅ 自動播放成功"))
            .catch(error => console.warn("🔊 自動播放被禁止，請手動播放", error));

        document.addEventListener("keydown", handleSpacebar);
    }

    // ✅ **生成填空區域**
    let sentenceInputContainer = document.getElementById("sentenceInput");
    sentenceInputContainer.innerHTML = ""; // 清空舊的輸入框

    let firstInput = null; // 記錄第一個輸入框
    let allInputs = []; // 儲存所有填空的輸入框，方便管理

    words.forEach((word, index) => {
        let wordContainer = document.createElement("div");
        wordContainer.classList.add("word-container");

        if (visibleIndexes.has(index)) {
            word.split("").forEach(letter => {
                let span = document.createElement("span");
                span.classList.add("filled-letter");
                span.innerText = letter;
                wordContainer.appendChild(span);
            });
        } else {
            word.split("").forEach((_, letterIndex) => {
                let input = document.createElement("input");
                input.type = "text";
                input.maxLength = 1;
                input.classList.add("letter-input");
                input.dataset.wordIndex = index; // 記錄單字索引
                input.dataset.letterIndex = letterIndex; // 記錄字母索引
                input.addEventListener("input", handleLetterInput);
                input.addEventListener("keydown", handleArrowNavigation);
                wordContainer.appendChild(input);
                allInputs.push(input); // 存入全局輸入框列表

                if (!firstInput) {
                    firstInput = input; // 記錄第一個輸入框
                }
            });
        }

        sentenceInputContainer.appendChild(wordContainer);
    });

    document.getElementById("userSentenceAnswer").value = "";
    document.getElementById("nextSentenceBtn").style.display = "none";

    // ✅ **自動聚焦第一個輸入框**
    if (firstInput) {
        firstInput.focus();
    }
}

// 📌 播放音檔
function playAudio() {
    if (currentAudio) {
        currentAudio.currentTime = 0; // 從頭播放
        currentAudio.play()
            .then(() => console.log("✅ 手動播放成功"))
            .catch(error => console.error("🔊 手動播放失敗:", error));
    } else {
        console.warn("⚠️ 尚未加載音檔，請確認檔案是否正確");
    }
}

// 📌 監聽空白鍵來播放音檔
function handleSpacebar(event) {
    if (event.code === "Space") { 
        event.preventDefault(); // 阻止頁面滾動
        playAudio();
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


// 📌 播放音檔
function playAudio() {
    if (currentAudio) {
        currentAudio.currentTime = 0;
        currentAudio.play()
            .then(() => console.log("✅ 手動播放成功"))
            .catch(error => console.error("🔊 手動播放失敗:", error));
    } else {
        console.warn("⚠️ 尚未加載音檔，請確認檔案是否正確");
    }
}

// 📌 監聽空白鍵來播放音檔
function handleSpacebar(event) {
    if (event.code === "Space") { 
        event.preventDefault();
        playAudio();
    }
}



// 移除多餘的監聽器，確保只有一個 'Enter' 提交事件
document.addEventListener("DOMContentLoaded", function () {
    document.addEventListener("keydown", function (event) {
        let userAnswerInput = document.getElementById("userSentenceAnswer");

        // 確保 #userSentenceAnswer 存在
        if (!userAnswerInput) {
            console.warn("⚠️ #userSentenceAnswer 尚未載入");
            return;
        }

        // Enter 提交答案
        if (event.key === "Enter") {
            event.preventDefault(); // 避免頁面刷新
            submitSentenceAnswer();
        }
    });
});



// 提交答案處理
function submitSentenceAnswer() {
        let sentenceObj = sentenceData[currentSentenceIndex];

        // 確保 sentenceObj 存在
        if (!sentenceObj) {
            console.error("❌ 無效的 sentenceObj");
            return;
        }

        let correctSentence = sentenceObj.句子;
        let userAnswerInput = document.getElementById("userSentenceAnswer");

        // 確保用戶輸入框存在
        if (!userAnswerInput) {
            console.error("❌ 找不到 #userSentenceAnswer");
            return;
        }

        let userAnswer = userAnswerInput.value.trim();

        // 確保答案有效
        if (!userAnswer) {
            console.error("❌ 用戶答案為空");
            return;
        }

        console.log("📌 使用者輸入：", userAnswer);
        console.log("📌 正確答案：", correctSentence);

        // 比對答案
if (userAnswer.toLowerCase() === correctSentence.toLowerCase()) {
    setTimeout(() => alert("✅ 正確！"), 300);
} else {
    setTimeout(() => alert(`❌ 錯誤！正確答案是：${correctSentence}`), 300);
    incorrectSentences.push(sentenceObj);
    localStorage.setItem("incorrectSentences", JSON.stringify(incorrectSentences));
}

        document.getElementById("nextSentenceBtn").style.display = "block"; // 顯示下一題按鈕
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
}

// 📌 標記為重要單字
function markAsImportant() {
    let sentenceObj = sentenceData[currentSentenceIndex];
    if (!importantSentences.some(item => item.Words === sentenceObj.Words)) {
        importantSentences.push(sentenceObj);
        localStorage.setItem("importantSentences", JSON.stringify(importantSentences));
        alert("⭐ 已標記為重要單字！");
    } else {
        alert("⚠️ 這個句子已經被標記過了！");
    }
}

// 📌 測驗結束，返回主畫面
function finishSentenceQuiz() {
    document.getElementById("sentenceQuizArea").style.display = "none";
    document.getElementById("mainMenu").style.display = "block";
}

// 📌 返回 Q Sentence 分類頁面
function returnToSentenceCategorySelection() {
    document.getElementById("sentenceQuizCategories").style.display = "block";
    document.getElementById("sentenceQuizArea").style.display = "none";
}
