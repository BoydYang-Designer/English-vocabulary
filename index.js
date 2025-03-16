let historyStack = []; // 記錄所有歷史狀態
let wordsData = [];
let sentenceAudio = new Audio();
let lastWordListType = ""; // 記錄進入單字列表的方式
let lastWordListValue = ""; // 記錄字母或分類值
let lastSentenceListWord = "";

document.addEventListener("DOMContentLoaded", function () {
    // 設置初始顯示狀態
    document.getElementById("searchContainer").style.display = "block";
    document.getElementById("startQuizBtn").style.display = "block";
    document.getElementById("sentencePageBtn").style.display = "block"; // 確保句子按鈕顯示
    document.querySelector(".alphabet-container").style.display = "block";
    document.querySelector(".category-container").style.display = "block";
    document.querySelector(".level-container").style.display = "block";
    document.getElementById("wordList").style.display = "none";
    document.getElementById("wordDetails").style.display = "none";
    document.getElementById("wordListTitle").style.display = "none";

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
            window.location.href = "quiz.html";
        });
    }

    fetch("https://boydyang-designer.github.io/English-vocabulary/Z_total_words.json")
        .then(res => res.json())
        .then(data => {
            wordsData = data["New Words"] || [];
            console.log("✅ JSON 載入成功:", wordsData);

            // 確保分類和等級按鈕顯示
            setTimeout(() => {
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
            console.error("❌ 讀取 JSON 失敗:", err);
        });
});

function navigateTo(state) {
    if (historyStack.length === 0 || historyStack[historyStack.length - 1].word !== state.word) {
        historyStack.push(state);
    }
    if (historyStack.length > 10) {
        historyStack.shift();
    }
    console.log("📌 新增到歷史紀錄：", historyStack);
}

function filterWords() {
    let input = document.getElementById("searchInput").value.toLowerCase();
    if (!wordsData || wordsData.length === 0) {
        console.error("❌ wordsData 為空，請確認 JSON 是否成功載入");
        return;
    }
    console.log("🔍 測試 wordsData 結構:", wordsData[0]);

    let filtered = wordsData.filter(w => {
        let word = w.Words || w.word || w["單字"] || "";
        return word.toLowerCase().startsWith(input);
    });

    let searchResults = document.getElementById("searchResults");
    if (!searchResults) {
        searchResults = document.createElement("div");
        searchResults.id = "searchResults";
        document.getElementById("searchContainer").appendChild(searchResults);
    }

    if (input === "") {
        searchResults.innerHTML = "";
        return;
    }

    searchResults.innerHTML = filtered.length > 0
        ? filtered.map((w, index) => {
            let word = w.Words || w.word || w["單字"] || "";
            return `<p class='word-item' data-index='${index}'>${word}</p>`;
        }).join("")
        : "<p>⚠️ 沒有符合的單字</p>";

    document.querySelectorAll('.word-item').forEach((item, index) => {
        item.addEventListener("click", function () {
            showDetails(filtered[index]);
        });
    });
}

function filterWordsInDetails() {
    let input = document.getElementById("searchInputDetails").value.toLowerCase();
    let searchResults = document.getElementById("searchResultsDetails");
    let bButton = document.getElementById("bButton");

    if (!wordsData || wordsData.length === 0) {
        console.error("❌ wordsData 未加載");
        return;
    }

    if (!searchResults) return;

    if (input === "") {
        searchResults.innerHTML = "";
        bButton.disabled = true;
        bButton.style.backgroundColor = "#ccc";
        return;
    }

    bButton.disabled = false;
    bButton.style.backgroundColor = "#6c757d";

    let filtered = wordsData.filter(w => {
        let word = w.Words || w.word || w["單字"] || "";
        return word.toLowerCase().startsWith(input);
    });

    searchResults.innerHTML = "";
    if (filtered.length === 0) {
        searchResults.innerHTML = "<p>⚠️ 沒有符合的單字</p>";
    } else {
        filtered.forEach((wordObj, index) => {
            let word = wordObj.Words || wordObj.word || wordObj["單字"] || "";
            let item = document.createElement("p");
            item.className = "word-item";
            item.textContent = word;
            item.addEventListener("click", function () {
                showDetails(wordObj);
            });
            searchResults.appendChild(item);
        });
    }
}

function createCategoryButtons() {
    if (!wordsData || !Array.isArray(wordsData)) return;
    let categories = [...new Set(wordsData.map(w => w["分類"] || "未分類"))];
    categories.unshift("Checked 單字", "重要單字", "錯誤單字", "Note");

    document.getElementById("categoryButtons").innerHTML = categories
        .map(c => {
            if (c === "Checked 單字") return `<button class='letter-btn' onclick='showCheckedWords()'>${c}</button>`;
            if (c === "重要單字") return `<button class='letter-btn' onclick='showImportantWords()'>${c}</button>`;
            if (c === "錯誤單字") return `<button class='letter-btn' onclick='showWrongWords()'>${c}</button>`;
            if (c === "Note") return `<button class='letter-btn' onclick='showNoteWords()'>${c}</button>`;
            return `<button class='letter-btn' onclick='showWords("category", "${c}")'>${c}</button>`;
        })
        .join(" ");
}

function createLevelButtons() {
    if (!wordsData || !Array.isArray(wordsData)) {
        console.error("❌ 等級按鈕生成失敗，wordsData 為空");
        return;
    }
    let levels = [...new Set(wordsData.map(w => w["等級"] || "未分類"))];
    console.log("📌 生成等級按鈕:", levels);

    document.getElementById("levelButtons").innerHTML = levels
        .map(l => `<button class='letter-btn' onclick='showWords("level", "${l}")'>${l}</button>`)
        .join(" ");
}

function showWords(type, value) {
    console.log("📌 點擊分類/等級/A-Z 按鈕:", type, value);
    let titleText = type === "letter" ? value.toUpperCase() : type === "category" ? value : `${value} Level`;
    document.getElementById("wordListTitle").innerText = titleText;
    document.getElementById("wordListTitle").style.display = "block";

    navigateTo({ page: "wordList", type: type, value: value });
    lastWordListType = type;
    lastWordListValue = value;

    document.getElementById("searchContainer").style.display = "none";
    document.getElementById("startQuizBtn").style.display = "none";
    let listContainer = document.getElementById("wordList");
    let wordItems = document.getElementById("wordItems");
    wordItems.innerHTML = "";

    // 隱藏「進入句子頁面」按鈕
    let sentenceButton = document.getElementById("sentencePageBtn");
    if (sentenceButton) {
        sentenceButton.style.display = "none";
    }

    if (!wordsData || wordsData.length === 0) {
        console.error("❌ wordsData 未加載或為空");
        return;
    }

    let filteredWords = wordsData.filter(w => {
        let word = w.Words || w.word || w["單字"];
        let category = w["分類"] || "未分類";
        let level = w["等級"] || "未分類";
        if (type === "letter") return word ? word.toLowerCase().startsWith(value.toLowerCase()) : false;
        if (type === "category") return category === value;
        if (type === "level") return level === value;
        return false;
    });

    if (filteredWords.length === 0) {
        wordItems.innerHTML = "<p>⚠️ 沒有符合的單字</p>";
    } else {
        filteredWords.forEach(word => {
            let wordText = word.Words || word.word || word["單字"];
            let isChecked = localStorage.getItem(`checked_${wordText}`) === "true";
            let isImportant = localStorage.getItem(`important_${wordText}`) === "true";
            let iconSrc = isChecked
                ? "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/checked-icon.svg"
                : "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/check-icon.svg";

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
        });
    }

    listContainer.style.display = "block";
    document.getElementById("wordDetails").style.display = "none";
    document.querySelector('.alphabet-container').style.display = "none";
    document.querySelector('.category-container').style.display = "none";
    document.querySelector('.level-container').style.display = "none";

    setTimeout(() => {
        document.querySelectorAll(".word-item").forEach(button => {
            button.addEventListener("click", function () {
                let wordText = this.dataset.word.trim();
                let wordObj = wordsData.find(w => (w.Words || w.word || w["單字"]).trim().toLowerCase() === wordText.toLowerCase());
                if (!wordObj) {
                    console.error("❌ 找不到單字:", wordText);
                    return;
                }
                console.log("✅ 點擊成功:", wordObj);
                showDetails(wordObj);
            });
        });
    }, 300);
}

function toggleCheck(word, button) {
    let isChecked = localStorage.getItem(`checked_${word}`) === "true";
    let icon = button.querySelector("img");
    let wordItemContainer = button.closest(".word-item-container");

    if (isChecked) {
        localStorage.removeItem(`checked_${word}`);
        icon.src = "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/check-icon.svg";
        button.classList.remove("checked");
        wordItemContainer.classList.remove("checked");
        wordItemContainer.style.opacity = "1";
        wordItemContainer.style.pointerEvents = "auto";
    } else {
        localStorage.setItem(`checked_${word}`, "true");
        icon.src = "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/checked-icon.svg";
        button.classList.add("checked");
        wordItemContainer.classList.add("checked");
        wordItemContainer.style.opacity = "0.3";
        wordItemContainer.style.pointerEvents = "auto";
    }
    console.log(`📌 ${word} 的狀態更新為: ${isChecked ? "未勾選" : "已勾選"}`);
}

function backToFirstLayer() {
    document.getElementById("searchContainer").style.display = "block";
    document.getElementById("startQuizBtn").style.display = "block";
    document.getElementById("wordList").style.display = "none";
    document.getElementById("wordDetails").style.display = "none";
    document.querySelector('.alphabet-container').style.display = "block";
    document.querySelector('.category-container').style.display = "block";
    document.querySelector('.level-container').style.display = "block";
    document.getElementById("wordItems").innerHTML = "";
    document.getElementById("wordListTitle").style.display = "none";
    document.getElementById("searchInput").value = "";

    let searchResults = document.getElementById("searchResults");
    if (searchResults) {
        searchResults.style.display = "block";
        searchResults.innerHTML = "";
    }

    historyStack = [];
    lastWordListType = "";
    lastWordListValue = "";
}

function showNoteWords() {
    console.log("📌 顯示筆記單字");
    document.getElementById("wordListTitle").innerText = "Note 單字";
    document.getElementById("wordListTitle").style.display = "block";
    document.getElementById("searchContainer").style.display = "none";
    document.getElementById("startQuizBtn").style.display = "none";

    // 隱藏「進入句子頁面」按鈕
    let sentenceButton = document.getElementById("sentencePageBtn");
    if (sentenceButton) {
        sentenceButton.style.display = "none";
    }

    let listContainer = document.getElementById("wordList");
    let wordItems = document.getElementById("wordItems");
    wordItems.innerHTML = "";

    let noteWords = Object.keys(localStorage).filter(key => key.startsWith("note_"));
    if (noteWords.length === 0) {
        wordItems.innerHTML = "<p>⚠️ 目前沒有筆記單字</p>";
    } else {
        noteWords.forEach(key => {
            let wordText = key.replace("note_", "");
            let savedNote = localStorage.getItem(key);
            let isChecked = savedNote && savedNote.trim() !== "";
            let iconSrc = isChecked
                ? "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/checked-icon.svg"
                : "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/check-icon.svg";

            let item = document.createElement("div");
            item.className = "word-item-container";
            if (isChecked) item.classList.add("checked");

            item.innerHTML = `
                <p class='word-item' data-word="${wordText}">${wordText}</p>
                <button class='check-button' onclick='toggleCheck("${wordText}", this)'>
                    <img src="${iconSrc}" class="check-icon" alt="Check" width="24" height="24">
                </button>
            `;

            item.querySelector('.word-item').addEventListener("click", function () {
                let wordObj = wordsData.find(w => (w.Words || w.word || w["單字"]).trim().toLowerCase() === wordText.toLowerCase());
                if (wordObj) {
                    lastWordListType = "noteWords";
                    lastWordListValue = null;
                    console.log("✅ 進入詳情頁面:", wordObj);
                    showDetails(wordObj);
                } else {
                    console.error("❌ 找不到單字資料:", wordText);
                }
            });
            wordItems.appendChild(item);
        });
    }

    listContainer.style.display = "block";
    document.getElementById("wordDetails").style.display = "none";
    document.querySelector(".alphabet-container").style.display = "none";
    document.querySelector(".category-container").style.display = "none";
    document.querySelector(".level-container").style.display = "none";
}

function showImportantWords() {
    console.log("📌 顯示重要單字");
    document.getElementById("wordListTitle").innerText = "重要";
    document.getElementById("wordListTitle").style.display = "block";
    document.getElementById("searchContainer").style.display = "none";
    document.getElementById("startQuizBtn").style.display = "none";

// 隱藏「進入句子頁面」按鈕
    let sentenceButton = document.getElementById("sentencePageBtn");
    if (sentenceButton) {
        sentenceButton.style.display = "none";
    }

    let listContainer = document.getElementById("wordList");
    let wordItems = document.getElementById("wordItems");
    wordItems.innerHTML = "";

    let importantWords = Object.keys(localStorage).filter(key => key.startsWith("important_"));
    if (importantWords.length === 0) {
        wordItems.innerHTML = "<p>⚠️ 目前沒有標記為重要的單字</p>";
    } else {
        importantWords.forEach(key => {
            let wordText = key.replace("important_", "");
            let isChecked = localStorage.getItem(`checked_${wordText}`) === "true";
            let iconSrc = isChecked
                ? "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/checked-icon.svg"
                : "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/check-icon.svg";

            let item = document.createElement("div");
            item.className = "word-item-container";
            if (isChecked) item.classList.add("checked");

            item.innerHTML = `
                <input type='checkbox' class='important-checkbox' onchange='toggleImportant("${wordText}", this)' checked>
                <p class='word-item' data-word="${wordText}">${wordText}</p>
                <button class='check-button' onclick='toggleCheck("${wordText}", this)'>
                    <img src="${iconSrc}" class="check-icon" alt="Check" width="24" height="24">
                </button>
            `;

            item.querySelector('.word-item').addEventListener("click", function () {
                let wordObj = wordsData.find(w => (w.Words || w.word || w["單字"]).trim().toLowerCase() === wordText.toLowerCase());
                if (wordObj) {
                    lastWordListType = "importantWords";
                    lastWordListValue = null;
                    console.log("✅ 進入詳情頁面:", wordObj);
                    showDetails(wordObj);
                } else {
                    console.error("❌ 找不到單字資料:", wordText);
                }
            });
            wordItems.appendChild(item);
        });
    }

    listContainer.style.display = "block";
    document.getElementById("wordDetails").style.display = "none";
    document.querySelector(".alphabet-container").style.display = "none";
    document.querySelector(".category-container").style.display = "none";
    document.querySelector(".level-container").style.display = "none";
}

function showWrongWords() {
    console.log("📌 顯示錯誤單字");
    document.getElementById("wordListTitle").innerText = "錯誤";
    document.getElementById("wordListTitle").style.display = "block";
    document.getElementById("searchContainer").style.display = "none";
    document.getElementById("startQuizBtn").style.display = "none";

    // 隱藏「進入句子頁面」按鈕
    let sentenceButton = document.getElementById("sentencePageBtn");
    if (sentenceButton) {
        sentenceButton.style.display = "none";
    }

    let listContainer = document.getElementById("wordList");
    let wordItems = document.getElementById("wordItems");
    wordItems.innerHTML = "";

    let wrongWords = JSON.parse(localStorage.getItem("wrongWords")) || [];
    if (wrongWords.length === 0) {
        wordItems.innerHTML = "<p>⚠️ 目前沒有錯誤單字</p>";
    } else {
        wrongWords.forEach(wordText => {
            let isChecked = localStorage.getItem(`checked_${wordText}`) === "true";
            let isImportant = localStorage.getItem(`important_${wordText}`) === "true";
            let iconSrc = isChecked
                ? "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/checked-icon.svg"
                : "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/check-icon.svg";

            let item = document.createElement("div");
            item.className = "word-item-container";
            if (isChecked) item.classList.add("checked");

            item.innerHTML = `
                <input type='checkbox' class='important-checkbox' onchange='toggleImportant("${wordText}", this)' ${isImportant ? "checked" : ""}>
                <p class='word-item' data-word="${wordText}">${wordText}</p>
                <button class='check-button' onclick='toggleCheck("${wordText}", this)'>
                    <img src="${iconSrc}" class="check-icon" alt="Check" width="24" height="24">
                </button>
            `;

            item.querySelector('.word-item').addEventListener("click", function () {
                let wordObj = wordsData.find(w => (w.Words || w.word || w["單字"]).trim().toLowerCase() === wordText.toLowerCase());
                if (wordObj) {
                    lastWordListType = "wrongWords";
                    lastWordListValue = null;
                    console.log("✅ 進入詳情頁面:", wordObj);
                    showDetails(wordObj);
                } else {
                    console.error("❌ 找不到單字資料:", wordText);
                }
            });
            wordItems.appendChild(item);
        });
    }

    listContainer.style.display = "block";
    document.getElementById("wordDetails").style.display = "none";
    document.querySelector(".alphabet-container").style.display = "none";
    document.querySelector(".category-container").style.display = "none";
    document.querySelector(".level-container").style.display = "none";
}

function showCheckedWords() {
    console.log("📌 顯示 Checked 單字");
    document.getElementById("wordListTitle").innerText = "Checked";
    document.getElementById("wordListTitle").style.display = "block";
    document.getElementById("searchContainer").style.display = "none";
    document.getElementById("startQuizBtn").style.display = "none";

    // 隱藏「進入句子頁面」按鈕
    let sentenceButton = document.getElementById("sentencePageBtn");
    if (sentenceButton) {
        sentenceButton.style.display = "none";
    }

    let listContainer = document.getElementById("wordList");
    let wordItems = document.getElementById("wordItems");
    wordItems.innerHTML = "";

    let checkedWords = Object.keys(localStorage).filter(key => key.startsWith("checked_"));
    if (checkedWords.length === 0) {
        wordItems.innerHTML = "<p>⚠️ 目前沒有 Checked 單字</p>";
    } else {
        checkedWords.forEach(key => {
            let wordText = key.replace("checked_", "");
            let isImportant = localStorage.getItem(`important_${wordText}`) === "true";
            let item = document.createElement("div");
            item.className = "word-item-container checked";
            item.innerHTML = `
                <input type='checkbox' class='important-checkbox' onchange='toggleImportant("${wordText}", this)' ${isImportant ? "checked" : ""}>
                <p class='word-item' data-word="${wordText}">${wordText}</p>
                <button class='check-button' onclick='toggleCheck("${wordText}", this)'>
                    <img src="https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/checked-icon.svg" class="check-icon" alt="Check" width="24" height="24">
                </button>
            `;

            item.querySelector('.word-item').addEventListener("click", function () {
                let wordObj = wordsData.find(w => (w.Words || w.word || w["單字"]).trim().toLowerCase() === wordText.toLowerCase());
                if (wordObj) {
                    lastWordListType = "checkedWords";
                    lastWordListValue = checkedWords;
                    console.log("✅ 進入詳情頁面:", wordObj);
                    showDetails(wordObj);
                } else {
                    console.error("❌ 找不到單字資料:", wordText);
                }
            });
            wordItems.appendChild(item);
        });
    }

    listContainer.style.display = "block";
    document.getElementById("wordDetails").style.display = "none";
    document.querySelector(".alphabet-container").style.display = "none";
    document.querySelector(".category-container").style.display = "none";
    document.querySelector(".level-container").style.display = "none";
}

function showDetails(word) {
    let searchInput = document.getElementById("searchInputDetails").value.trim();
    let bButton = document.getElementById("bButton");
    let params = new URLSearchParams(window.location.search);
    let fromPage = params.get('from');
    lastSentenceListWord = word.Words;

    // 如果從搜尋框進入，或從 sentence.js 跳轉過來，啟用「B」按鈕
    if (searchInput !== "" || fromPage === "sentence") {
        bButton.disabled = false;
        bButton.style.backgroundColor = "#6c757d";
    }

    navigateTo({ page: "wordDetails", word: word });

    document.getElementById("searchContainer").style.display = "none";
    document.getElementById("wordList").style.display = "none";
    document.getElementById("startQuizBtn").style.display = "none";
    document.getElementById("wordListTitle").style.display = "none";
    document.getElementById("wordDetails").style.display = "block";
    document.querySelector(".alphabet-container").style.display = "none";
    document.querySelector(".category-container").style.display = "none";
    document.querySelector(".level-container").style.display = "none";
   
    // 隱藏「進入句子頁面」按鈕
    let sentenceButton = document.getElementById("sentencePageBtn");
    if (sentenceButton) {
        sentenceButton.style.display = "none";
    }
    
    document.getElementById("searchInputDetails").value = "";
    document.getElementById("searchResultsDetails").innerHTML = "";

    let audioControls = document.querySelector(".audio-controls");
    if (audioControls) audioControls.style.display = "flex";

    let playButton = document.getElementById("playAudioBtn");
    let pauseButton = document.getElementById("pauseResumeBtn");
    if (playButton) {
        let audioFile = `${encodeURIComponent(word.Words)} - sentence.mp3`;
        playButton.setAttribute("onclick", `playSentenceAudio("${audioFile}")`);
        playButton.classList.remove("playing"); // 確保初始狀態無播放樣式
    }
    if (pauseButton) {
        pauseButton.classList.remove("playing"); // 確保初始狀態無播放樣式
        pauseButton.innerHTML = `
            <img src="https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/play-circle.svg" 
                 alt="Play" width="24" height="24" />
        `;
    }

    let phonetics = `<div class="phonetics-container" style="display: flex; align-items: center; gap: 10px;">
        <input type='checkbox' class='important-checkbox' onchange='toggleImportant("${word.Words}", this)' ${localStorage.getItem(`important_${word.Words}`) === "true" ? "checked" : ""}>
        <div id="wordTitle" style="font-size: 20px; font-weight: bold;">${word.Words}</div>`;
    if (word["pronunciation-1"] || word["pronunciation-2"]) {
        if (word["pronunciation-1"]) phonetics += `<button class='button' onclick='playAudio("${encodeURIComponent(word.Words)}.mp3")'>${word["pronunciation-1"]}</button>`;
        if (word["pronunciation-2"]) phonetics += `<button class='button' onclick='playAudio("${encodeURIComponent(word.Words)} 2.mp3")'>${word["pronunciation-2"]}</button>`;
    } else {
        phonetics += `<p style="color: gray;">No pronunciation available</p>`;
    }
    phonetics += `</div>`;

    let formattedChinese = word["traditional Chinese"].replace(/(\d+)\./g, "<br><strong>$1.</strong> ");
    let chinese = `<div>${formattedChinese}</div>`;

    let formattedMeaning = word["English meaning"]
        .replace(/Summary:/g, "<h3>Summary:</h3>")
        .replace(/Related Words:/g, "<h3>Related Words:</h3>")
        .replace(/Antonyms:/g, "<h3>Antonyms:</h3>")
        .replace(/\n1\./g, "<h3>1.</h3><p>")
        .replace(/\n2\./g, "<h3>2.</h3><p>")
        .replace(/\n3\./g, "<h3>3.</h3><p>")
        .replace(/\nE\.g\./g, "</p><p><strong>Example:</strong>")
        .replace(/\n/g, "<br>");
    let meaning = `<p>${formattedMeaning}</p>`;

    document.getElementById("phoneticContainer").innerHTML = phonetics;
    document.getElementById("chineseContainer").innerHTML = chinese;
    document.getElementById("meaningContainer").innerHTML = meaning;

    displayNote();
    updateBackButton();
}

function getFromPage() {
    let params = new URLSearchParams(window.location.search);
    return params.get('from');
}

function updateBackButton() {
    let fromPage = getFromPage();
    let backButtons = document.querySelectorAll('#wordDetails .button');

    backButtons.forEach(button => {
        if (button.textContent.trim() === 'Back') {
            if (fromPage === 'quiz') {
                button.onclick = function () {
                    console.log("🔙 從 quiz 返回測驗結果");
                    returnToQuiz();
                };
            } else {
                button.onclick = function () {
                    console.log("↩️ 返回上一層");
                    backToWordList();
                };
            }
        }
    });
}

function returnToQuiz() {
    console.log("✅ 返回 quiz.html 測驗結果頁面");
    window.location.href = 'quiz.html?returning=true';
}

function backToWordList() {
    if (lastWordListType === "search") {
        document.getElementById("searchContainer").style.display = "block";
        document.getElementById("wordList").style.display = "none";
        document.getElementById("wordDetails").style.display = "none";
        document.querySelector('.alphabet-container').style.display = "block";
        document.querySelector('.category-container').style.display = "block";
        document.querySelector('.level-container').style.display = "block";
    } else if (lastWordListType === "importantWords") {
        console.log("🔙 返回重要單字列表");
        showImportantWords();
    } else if (lastWordListType === "wrongWords") {
        console.log("🔙 返回錯誤單字列表");
        showWrongWords();
    } else if (lastWordListType === "checkedWords") {
        console.log("🔙 返回 Checked 單字列表");
        showCheckedWords();
    } else if (lastWordListType === "noteWords") {
        console.log("🔙 返回 Note 單字列表");
        showNoteWords();
    } else if (lastWordListType && lastWordListValue) {
        console.log(`🔙 返回 ${lastWordListType} 類別: ${lastWordListValue}`);
        showWords(lastWordListType, lastWordListValue);
    } else {
        console.error("❌ 無法返回，lastWordListType 為空，回到第一層");
        backToFirstLayer();
    }
}

function playAudio(filename) {
    let baseURL = "https://github.com/BoydYang-Designer/English-vocabulary/raw/main/audio_files/";
    new Audio(baseURL + filename).play();
}

function playSentenceAudio(filename) {
    let baseURL = "https://github.com/BoydYang-Designer/English-vocabulary/raw/main/audio_files/";
    const playBtn = document.getElementById("playAudioBtn");
    const pauseBtn = document.getElementById("pauseResumeBtn");

    console.log("🔍 playBtn:", playBtn);
    console.log("🔍 pauseBtn:", pauseBtn);
    console.log("🔍 音檔 URL:", baseURL + filename);

    sentenceAudio.src = baseURL + filename;

    if (playBtn) playBtn.classList.add("playing");
    if (pauseBtn) {
        pauseBtn.classList.add("playing");
        pauseBtn.innerHTML = `<img src="https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/pause.svg" alt="Pause" width="24" height="24" />`;
    }

    sentenceAudio.play()
        .then(() => console.log(`✅ 播放 ${filename} 成功`))
        .catch(error => {
            console.error(`🔊 播放 ${filename} 失敗:`, error);
            if (playBtn) playBtn.classList.remove("playing");
            if (pauseBtn) pauseBtn.classList.remove("playing");
        });

    sentenceAudio.onended = () => {
        if (playBtn) playBtn.classList.remove("playing");
        if (pauseBtn) {
            pauseBtn.classList.remove("playing");
            pauseBtn.innerHTML = `<img src="https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/play-circle.svg" alt="Play" width="24" height="24" />`;
        }
    };
}

function togglePauseAudio(button) {
    const playBtn = document.getElementById("playAudioBtn");

    if (sentenceAudio.paused || sentenceAudio.ended) {
        sentenceAudio.play()
            .then(() => {
                button.classList.add("playing");
                if (playBtn) playBtn.classList.add("playing");
                button.innerHTML = `<img src="https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/pause.svg" alt="Pause" width="24" height="24" />`;
            })
            .catch(error => console.error("🔊 播放失敗:", error));
    } else {
        sentenceAudio.pause();
        button.classList.remove("playing");
        if (playBtn) playBtn.classList.remove("playing");
        button.innerHTML = `<img src="https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/play-circle.svg" alt="Play" width="24" height="24" />`;
    }
}

function adjustAudioTime(seconds) {
    sentenceAudio.currentTime = Math.max(0, sentenceAudio.currentTime + seconds);
}

function backToPrevious() {
    let params = new URLSearchParams(window.location.search);
    let fromPage = params.get('from');
    let sentenceId = params.get('sentenceId');

    if (fromPage === "sentence" && sentenceId) {
        window.location.href = `sentence.html?sentence=${encodeURIComponent(sentenceId)}&layer=4`;
    } else if (historyStack.length > 1) {
        historyStack.pop();
        let previousState = historyStack[historyStack.length - 1];
        if (previousState.page === "wordDetails") {
            showDetails(previousState.word);
        }
    }

    if (historyStack.length <= 1) {
        let bButton = document.getElementById("bButton");
        bButton.disabled = true;
        bButton.style.backgroundColor = "#ccc";
    }
    console.log("🔙 點擊 B 按鈕後的歷史紀錄：", historyStack);
}

document.querySelectorAll('.back-button').forEach(button => {
    button.addEventListener("click", backToPrevious);
});

window.addEventListener("load", adjustAudioControlsWidth);
window.addEventListener("resize", adjustAudioControlsWidth);

function adjustAudioControlsWidth() {
    let details = document.querySelector(".details");
    let audioControls = document.querySelector(".audio-controls");
    if (details && audioControls) {
        let detailsWidth = details.offsetWidth;
        audioControls.style.width = detailsWidth + "px";
        audioControls.style.maxWidth = detailsWidth + "px";
    }
}

function toggleImportant(word, checkbox) {
    if (checkbox.checked) {
        localStorage.setItem(`important_${word}`, "true");
        console.log(`⭐ 單字 ${word} 標記為重要`);
    } else {
        localStorage.removeItem(`important_${word}`);
        console.log(`❌ 單字 ${word} 取消重要標記`);
    }
}

let isCleared = false;
let isSaved = false;

function initializeNote() {
    let wordTitle = document.getElementById("wordTitle");
    let noteTextArea = document.getElementById("wordNote");
    let checkbox = document.getElementById("noteCheckbox");

    if (!wordTitle || !noteTextArea || !checkbox) {
        setTimeout(initializeNote, 100);
        return;
    }

    let word = wordTitle.textContent.trim();
    let savedNote = localStorage.getItem(`note_${word}`);

    noteTextArea.value = "";
    checkbox.checked = false;
    checkbox.style.opacity = "0.5";

    if (savedNote) {
        noteTextArea.value = savedNote;
        checkbox.checked = true;
        checkbox.style.opacity = "1";
        isSaved = true;
    } else {
        isSaved = false;
    }

    updateCheckbox();
    updateNoteCategory(word);
}

function updateCheckbox() {
    const noteText = document.getElementById("wordNote").value.trim();
    const checkbox = document.getElementById("noteCheckbox");

    if (noteText.length > 0) {
        checkbox.checked = true;
        checkbox.style.opacity = "1";
    } else {
        checkbox.checked = false;
        checkbox.style.opacity = "0.5";
    }
}

document.getElementById("wordNote")?.addEventListener("input", updateCheckbox);

function handleCheckboxClick() {
    const checkbox = document.getElementById("noteCheckbox");
    if (!checkbox.checked) {
        isCleared = true;
    } else {
        isCleared = false;
    }
}

function saveNote() {
    let word = document.getElementById("wordTitle")?.textContent.trim();
    let noteTextArea = document.getElementById("wordNote");
    let note = noteTextArea.value.trim();
    let saveButton = document.querySelector("button[onclick='saveNote()']");
    let checkbox = document.getElementById("noteCheckbox");
    let savedNote = document.getElementById("savedNote");

    if (word && word !== "") {
        if (checkbox.checked || note.length > 0) {
            localStorage.setItem(`note_${word}`, note);
            console.log("✅ Note saved:", word, note);
            savedNote.textContent = "✅ Note saved！";
            isSaved = true;
            checkbox.checked = true;
            checkbox.style.opacity = "1";
            isCleared = false;
        } else if (isCleared) {
            localStorage.removeItem(`note_${word}`);
            noteTextArea.value = "";
            console.log("🗑️ Note deleted:", word);
            savedNote.textContent = "🗑️ Note deleted!";
            isSaved = false;
            checkbox.checked = false;
            checkbox.style.opacity = "0.5";
            isCleared = false;
        }

        updateNoteCategory(word);
        saveButton.textContent = "Saved ✅";
        saveButton.style.backgroundColor = "#28a745";

        setTimeout(() => {
            saveButton.textContent = "Save";
            saveButton.style.backgroundColor = "#6e93ba";
        }, 2000);

        setTimeout(() => savedNote.textContent = "", 3000);
    } else {
        console.warn("⚠️ 無法保存筆記，wordTitle 未加載");
    }
}

function updateNoteCategory(word) {
    let noteCategory = document.getElementById("noteCategory");
    let hasNote = localStorage.getItem(`note_${word}`) !== null;

    if (noteCategory) {
        if (hasNote) {
            noteCategory.style.display = "block";
        } else {
            noteCategory.style.display = "none";
        }
    }
}

document.addEventListener("DOMContentLoaded", initializeNote);

function displayNote() {
    let word = document.getElementById("wordTitle")?.textContent.trim();
    if (word && word !== "") {
        let savedNote = localStorage.getItem(`note_${word}`) || "";
        document.getElementById("wordNote").value = savedNote;
        console.log("📌 載入筆記:", word, savedNote);
    } else {
        console.warn("⚠️ 無法載入筆記，wordTitle 未加載");
    }
}

document.addEventListener("DOMContentLoaded", function () {
    setTimeout(() => {
        document.querySelectorAll(".word-item-container").forEach(item => {
            let word = item.querySelector(".word-item").dataset.word;
            if (localStorage.getItem(`checked_${word}`) === "true") {
                item.classList.add("checked");
                let icon = item.querySelector(".check-button img");
                if (icon) {
                    icon.src = "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/checked-icon.svg";
                }
            }
        });
    }, 500);
});

document.addEventListener("keydown", function (event) {
    if (!sentenceAudio || isNaN(sentenceAudio.duration)) return;

    switch (event.code) {
        case "Space":
            event.preventDefault();
            if (sentenceAudio.paused || sentenceAudio.ended) {
                sentenceAudio.play();
            } else {
                sentenceAudio.pause();
            }
            break;
        case "ArrowRight":
            if (!isNaN(sentenceAudio.currentTime)) {
                sentenceAudio.currentTime = Math.min(sentenceAudio.duration, sentenceAudio.currentTime + 5);
            }
            break;
        case "ArrowLeft":
            if (!isNaN(sentenceAudio.currentTime)) {
                sentenceAudio.currentTime = Math.max(0, sentenceAudio.currentTime - 5);
            }
            break;
    }
});

function exportAllData() {
    let allData = { ...localStorage };
    let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allData, null, 2));
    let downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "localStorage_backup.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    alert("✅ 學習資料已匯出！");
    console.log("✅ 所有 `localStorage` 資料已匯出！", allData);
}

function importAllData() {
    let fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".json";
    fileInput.onchange = function (event) {
        let file = event.target.files[0];
        if (!file) return;

        let reader = new FileReader();
        reader.onload = function (event) {
            let importedData = JSON.parse(event.target.result);
            localStorage.clear();
            Object.keys(importedData).forEach(key => {
                localStorage.setItem(key, importedData[key]);
            });
            alert("✅ `localStorage` 已成功匯入！");
            console.log("📌 已還原 `localStorage` 資料:", importedData);
            location.reload();
        };
        reader.readAsText(file);
    };
    fileInput.click();
}

function getWordFromURL() {
    let params = new URLSearchParams(window.location.search);
    return params.get('word');
}

function displayWordDetailsFromURL() {
    let wordName = getWordFromURL();
    let fromPage = getFromPage();
    if (!wordName || !wordsData || wordsData.length === 0) {
        console.log("ℹ️ 無 URL 參數或資料未載入，保持第一層顯示");
        return;
    }

    let wordData = wordsData.find(w => (w.Words || w.word || w["單字"]).toLowerCase() === wordName.toLowerCase());
    if (wordData) {
        console.log("✅ 找到單字資料:", wordData);
        showDetails(wordData);
        if (fromPage === "sentence") {
            updateBackButtonToSentence();
        }
    } else {
        console.warn("⚠️ 未找到單字，回到第一層");
        backToFirstLayer();
    }
}

function updateBackButtonToSentence() {
    let backButtons = document.querySelectorAll('#wordDetails .button');
    backButtons.forEach(button => {
        if (button.textContent.trim() === 'Back') {
            button.onclick = function () {
                console.log("🔙 返回 sentence.html");
                window.location.href = 'sentence.html?word=' + encodeURIComponent(lastSentenceListWord);
            };
        }
    });
}