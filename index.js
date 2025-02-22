let historyStack = []; // 記錄所有歷史狀態
let wordsData = [];
let sentenceAudio = new Audio();
let lastWordListType = ""; // 記錄進入單字列表的方式
let lastWordListValue = ""; // 記錄字母或分類值

document.addEventListener("DOMContentLoaded", function () {
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
        })
        .catch(err => {
            console.error("❌ 讀取 JSON 失敗:", err);
        })
        .finally(() => {
            // **確保 "B" 按鈕在 DOM 加載後才初始化**
            setTimeout(() => {
                let bButton = document.getElementById("bButton");
                if (bButton) {
                    bButton.disabled = true; // 禁用按鍵
                    bButton.style.backgroundColor = "#ccc"; // 設定未啟動顏色
                    bButton.addEventListener("click", backToPrevious); // 綁定 "B" 按鍵點擊事件
                    console.log("🔵 'B' 按鈕已初始化");
                } else {
                    console.error("❌ 無法找到 'B' 按鈕，請確認 HTML 是否正確");
                }
            }, 300); // **延遲 300ms 確保 DOM 加載完成**
        });
});


function navigateTo(state) {
    // **避免重複存入相同的單字**
    if (historyStack.length === 0 || historyStack[historyStack.length - 1].word !== state.word) {
        historyStack.push(state);
    }

    // **限制最大記憶數量，避免無限增長**
    if (historyStack.length > 10) { 
        historyStack.shift(); // 只保留最近 10 個記錄
    }

    console.log("📌 新增到歷史紀錄：", historyStack);
}



function filterWords() {
    let input = document.getElementById("searchInput").value.toLowerCase();

    // 確保 wordsData 正確載入
    if (!wordsData || wordsData.length === 0) {
        console.error("❌ wordsData 為空，請確認 JSON 是否成功載入");
        return;
    }

    // 🔍 測試 JSON 結構，確認單字的 key 名稱
    console.log("🔍 測試 wordsData 結構:", wordsData[0]);

    // 嘗試不同的鍵名來獲取單字，確保取得正確的資料
    let filtered = wordsData.filter(w => {
        let word = w.Words || w.word || w["單字"] || "";  // 確保取到單字
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
    : "<p⚠️ 沒有符合的單字</p>";

// 重新綁定點擊事件，確保 showDetails 正常運作
document.querySelectorAll('.word-item').forEach((item, index) => {
    item.addEventListener("click", function() {
        showDetails(filtered[index]); // ✅ 這樣才能正確傳入 word 物件
    });
});


}

function filterWordsInDetails() {
    let input = document.getElementById("searchInputDetails").value.toLowerCase();
    let searchResults = document.getElementById("searchResultsDetails");

    if (!wordsData || wordsData.length === 0) {
        console.error("❌ wordsData 未加載");
        return;
    }

    if (!searchResults) return;

    if (input === "") {
        searchResults.innerHTML = "";
        return;
    }

    let filtered = wordsData.filter(w => {
        let word = w.Words || w.word || w["單字"] || "";  
        return word.toLowerCase().startsWith(input);
    });

    searchResults.innerHTML = "";
    
    if (filtered.length === 0) {
        searchResults.innerHTML = "<p>⚠️ 沒有符合的單字</p>";
        return;
    }

    filtered.forEach((wordObj, index) => {
        let word = wordObj.Words || wordObj.word || wordObj["單字"] || "";  
        let item = document.createElement("p");
        item.className = "word-item";
        item.textContent = word;
        item.addEventListener("click", function() {
            showDetails(wordObj); // ✅ 確保正確傳遞 word 物件
        });
        searchResults.appendChild(item);
    });
}

function createCategoryButtons() {
    if (!wordsData || !Array.isArray(wordsData)) return;
    let categories = [...new Set(wordsData.map(w => w["分類"] || "未分類"))];
    document.getElementById("categoryButtons").innerHTML = categories
        .map(c => `<button class='letter-btn' onclick='showWords("category", "${c}")'>${c}</button>`)
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
        

// 1️⃣ 負責顯示單字列表，包含「Check」按鈕
function showWords(type, value) {
    console.log("📌 點擊分類/等級/A-Z 按鈕:", type, value);

    navigateTo({ page: "wordList", type: type, value: value });
    lastWordListType = type;
    lastWordListValue = value;

    document.getElementById("searchContainer").style.display = "none";
    document.getElementById("startQuizBtn").style.display = "none"; // 隱藏開始測驗按鈕
    let listContainer = document.getElementById("wordList");
    let wordItems = document.getElementById("wordItems");
    wordItems.innerHTML = "";

    if (!wordsData || wordsData.length === 0) {
        console.error("❌ wordsData 未加載或為空");
        return;
    }

    let filteredWords = wordsData.filter(w => {
        let word = w.Words || w.word || w["單字"];
        let category = w["分類"] || "未分類";
        let level = w["等級"] || "未分類";

        if (type === "letter") {
            return word ? word.toLowerCase().startsWith(value.toLowerCase()) : false;
        } else if (type === "category") {
            return category === value;
        } else if (type === "level") {
            return level === value;
        }
        return false;
    });

    if (filteredWords.length === 0) {
        wordItems.innerHTML = "<p>⚠️ 沒有符合的單字</p>";
    } else {
        filteredWords.forEach(word => {
            let wordText = word.Words || word.word || word["單字"];
            let isChecked = localStorage.getItem(`checked_${wordText}`) === "true"; // 檢查是否已 Check

            let iconSrc = isChecked 
                ? "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/checked-icon.svg"
                : "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/check-icon.svg";

            let item = document.createElement('div');
            item.className = 'word-item-container';
            if (isChecked) {
                item.classList.add("checked"); // 確保 checked 單字縮小
            }
            
            item.innerHTML = `
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

    // ✅ **確保所有 `word-item` 綁定 `click` 事件**
    setTimeout(() => {
        document.querySelectorAll(".word-item").forEach(button => {
            button.addEventListener("click", function() {
                let wordText = this.dataset.word.trim(); // ✅ 取得 `data-word` 確保匹配
                let wordObj = wordsData.find(w => (w.Words || w.word || w["單字"]).trim().toLowerCase() === wordText.toLowerCase());

                if (!wordObj) {
                    console.error("❌ 找不到單字:", wordText);
                    return;
                }
                console.log("✅ 點擊成功:", wordObj);
                showDetails(wordObj);
            });
        });
    }, 300); // 延遲 300ms 確保 DOM 生成後綁定
}


// 2️⃣ 放在 `showWords()` 之後，處理按鈕點擊事件
function toggleCheck(word, button) {
    let isChecked = localStorage.getItem(`checked_${word}`) === "true";
    let icon = button.querySelector("img");
    let wordItemContainer = button.closest(".word-item-container"); // 找到單字的容器

    if (isChecked) {
        localStorage.removeItem(`checked_${word}`);
        icon.src = "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/check-icon.svg";
        button.classList.remove("checked");
        wordItemContainer.classList.remove("checked");

        // ✅ 確保單字仍可見且可點擊
        wordItemContainer.style.opacity = "1";
        wordItemContainer.style.pointerEvents = "auto"; 

    } else {
        localStorage.setItem(`checked_${word}`, "true");
        icon.src = "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/checked-icon.svg";
        button.classList.add("checked");
        wordItemContainer.classList.add("checked");

        // ✅ 讓單字變淡但仍可點擊
        wordItemContainer.style.opacity = "0.3";
        wordItemContainer.style.pointerEvents = "auto"; 
    }

    console.log(`📌 單字 ${word} 的狀態已更新：`, localStorage.getItem(`checked_${word}`));
}




function backToFirstLayer() {
    document.getElementById("searchContainer").style.display = "block";
    document.getElementById("startQuizBtn").style.display = "block"; // 顯示開始測驗按鈕
    document.getElementById("wordList").style.display = "none";
    document.getElementById("wordDetails").style.display = "none";
    document.querySelector('.alphabet-container').style.display = "block";
    document.querySelector('.category-container').style.display = "block";
    document.querySelector('.level-container').style.display = "block";
    document.getElementById("wordItems").innerHTML = "";

    // **顯示搜尋結果（但不清空）**
    let searchResults = document.getElementById("searchResults");
    if (searchResults) {
        searchResults.style.display = "block"; // **恢復顯示搜尋結果**
    }

    // **清空單字列表**
    document.getElementById("wordItems").innerHTML = ""; 

    // **清空歷史紀錄**
    historyStack = [];
    lastWordListType = "";
    lastWordListValue = "";
}


function showDetails(word) {
    let searchInput = document.getElementById("searchInputDetails").value.trim();
    let bButton = document.getElementById("bButton");

    // **只有當使用了第三層搜尋框時，才啟動 "B" 按鍵**
    if (searchInput !== "") {
        bButton.disabled = false; // 啟動按鍵
        bButton.style.backgroundColor = "#6c757d"; // 變色
    }

    // **確保每次進入新單字都記錄到歷史**
    navigateTo({ page: "wordDetails", word: word });

    // **顯示單字詳情**
    document.getElementById("searchContainer").style.display = "none";
    document.getElementById("wordList").style.display = "none";
    document.getElementById("wordDetails").style.display = "block";
    document.querySelector(".alphabet-container").style.display = "none";
    document.querySelector(".category-container").style.display = "none";
    document.querySelector(".level-container").style.display = "none";

    document.getElementById("searchInputDetails").value = "";
    document.getElementById("searchResultsDetails").innerHTML = "";

    // ✅ **確保 `.audio-controls` 顯示**
    let audioControls = document.querySelector(".audio-controls");
    if (audioControls) {
        audioControls.style.display = "flex"; // 顯示播放按鈕
    } else {
        console.warn("⚠️ 找不到 `.audio-controls`，請確認 HTML 是否包含此元素！");
    }

    // ✅ **確保 `playAudioBtn` 更新音檔**
    let playButton = document.getElementById("playAudioBtn");
    if (playButton) {
        let audioFile = `${encodeURIComponent(word.Words)} - sentence.mp3`;
        playButton.setAttribute("onclick", `playSentenceAudio("${audioFile}")`);
        console.log(`🔊 播放按鈕更新：${audioFile}`);
    } else {
        console.warn("⚠️ 找不到 `#playAudioBtn` 按鈕！");
    }

    // ✅ **音標處理（考慮無音標的情況）**
    let phonetics = `<div class="phonetics-container" style="display: flex; align-items: center; gap: 10px;">
    <div id="wordTitle" style="font-size: 20px; font-weight: bold;">${word.Words}</div>`;

    if (word["pronunciation-1"] || word["pronunciation-2"]) {
        if (word["pronunciation-1"]) {
            phonetics += `<button class='button' onclick='playAudio("${encodeURIComponent(word.Words)}.mp3")'>${word["pronunciation-1"]}</button>`;
        }
        if (word["pronunciation-2"]) {
            phonetics += `<button class='button' onclick='playAudio("${encodeURIComponent(word.Words)} 2.mp3")'>${word["pronunciation-2"]}</button>`;
        }
    } else {
        phonetics += `<p style="color: gray;">No pronunciation available</p>`;
    }
    phonetics += `</div>`;

    // ✅ **中文解釋格式化**
    let formattedChinese = word["traditional Chinese"]
        .replace(/(\d+)\./g, "<br><strong>$1.</strong> ");
    let chinese = `<div>${formattedChinese}</div>`;

    // ✅ **英文解釋格式化**
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

    // ✅ **設定內容到對應的區塊**
    document.getElementById("phoneticContainer").innerHTML = phonetics;
    document.getElementById("chineseContainer").innerHTML = chinese;
    document.getElementById("meaningContainer").innerHTML = meaning;

    // ✅ **確保筆記內容顯示**
    displayNote();

    // ✅ **更新 Back 按鈕功能（根據來源動態更新）**
    updateBackButton();
}

// ✅ **讀取 URL 來源參數**
function getFromPage() {
    let params = new URLSearchParams(window.location.search);
    return params.get('from');
}

// ✅ **根據來源設定 Back 按鈕功能**
// ✅ 強制更新 Back 按鈕功能，並加入除錯訊息
function updateBackButton() {
    let fromPage = getFromPage();
    let backButtons = document.querySelectorAll('#wordDetails .button');

    // 找到文字為 "Back" 的按鈕並更新其功能
    backButtons.forEach(button => {
        if (button.textContent.trim() === 'Back') {
            if (fromPage === 'quiz') {
                button.onclick = function() {
                    console.log("🔙 從 quiz.html 返回測驗結果");
                    returnToQuiz();
                };
            } else {
                button.onclick = function() {
                    console.log("↩️ 返回上一層");
                    backToWordList();
                };
            }
        }
    });
}

// ✅ **返回 quiz.html 測驗頁面的功能**
function returnToQuiz() {
    console.log("✅ 返回 quiz.html 測驗頁面");

    // 先跳轉回 quiz.html
    window.location.href = 'quiz.html?returning=true';
}




function backToWordList() {
    if (lastWordListType === "search") {
        // 如果來自搜尋結果，回到第一層並顯示搜尋框
        document.getElementById("searchContainer").style.display = "block";
        document.getElementById("wordList").style.display = "none";
        document.getElementById("wordDetails").style.display = "none";
        document.querySelector('.alphabet-container').style.display = "block";
        document.querySelector('.category-container').style.display = "block";
        document.querySelector('.level-container').style.display = "block";
    } else if (lastWordListType && lastWordListValue) {
        // 如果來自單字列表，回到第二層
        showWords(lastWordListType, lastWordListValue);
    } else {
        console.error("❌ 無法返回，lastWordListType 為空，回到第一層");
        backToFirstLayer(); // 如果 `lastWordListType` 無效，回到首頁
    }
}

function playAudio(filename) {
    let baseURL = "https://github.com/BoydYang-Designer/English-vocabulary/raw/main/audio_files/";
    new Audio(baseURL + filename).play();
}

function playSentenceAudio(filename) {
    let baseURL = "https://github.com/BoydYang-Designer/English-vocabulary/raw/main/audio_files/";
    sentenceAudio.src = baseURL + filename;
    sentenceAudio.play();
}


function togglePauseAudio(button) {
    if (sentenceAudio.paused || sentenceAudio.ended) {
        sentenceAudio.play();
        button.innerHTML = `
            <img src="https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/pause.svg" alt="Pause" width="24" height="24" />
        `;
    } else {
        sentenceAudio.pause();
        button.innerHTML = `
            <img src="https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/play-circle.svg" alt="Play" width="24" height="24" />
        `;
    }
}

function adjustAudioTime(seconds) {
    sentenceAudio.currentTime = Math.max(0, sentenceAudio.currentTime + seconds);
}

function backToPrevious() {
    if (historyStack.length > 1) {
        historyStack.pop(); // 移除當前狀態
        let previousState = historyStack[historyStack.length - 1]; // 取得上一個狀態

        if (previousState.page === "wordDetails") {
            showDetails(previousState.word); // 返回上一個單字
        }
    }

    // **當歷史紀錄只剩 1 個時，停用 "B" 按鍵**
    if (historyStack.length <= 1) {
        let bButton = document.getElementById("bButton");
        bButton.disabled = true;
        bButton.style.backgroundColor = "#ccc"; // 回到未啟動顏色
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
        let detailsWidth = details.offsetWidth; // 取得 .details 的實際寬度
        audioControls.style.width = detailsWidth + "px"; // 設定相同的寬度
        audioControls.style.maxWidth = detailsWidth + "px"; // 防止超過
    }
}

function saveNote() {
    let word = document.getElementById("wordTitle")?.textContent.trim();
    let note = document.getElementById("wordNote").value.trim();
    let saveButton = document.querySelector("button[onclick='saveNote()']"); // 取得按鈕

    if (word && word !== "") { 
        localStorage.setItem(`note_${word}`, note); // 存入 localStorage
        console.log("✅ Note saved:", word, note);

        // ✅ 按鈕顯示「Saved」
        saveButton.textContent = "Saved ✅";
        saveButton.style.backgroundColor = "#28a745"; // 綠色表示成功

        // ✅ 2 秒後恢復原本樣式
        setTimeout(() => {
            saveButton.textContent = "Save";
            saveButton.style.backgroundColor = "#6e93ba";
        }, 2000);
        
        // ✅ 在筆記區下方顯示「筆記已保存！」
        document.getElementById("savedNote").textContent = "✅ Note saved！";
        setTimeout(() => document.getElementById("savedNote").textContent = "", 3000);
    } else {
        console.warn("⚠️ 無法保存筆記，wordTitle 未加載");
    }
}

function clearAllNotes() {
    if (confirm("⚠️ 你確定要刪除所有筆記嗎？這個動作無法復原！")) {
        localStorage.clear();
        console.log("✅ 所有筆記已清除");
        alert("✅ 所有筆記已清除！");
        document.getElementById("wordNote").value = ""; // 清空筆記區
    }
}

function displayNote() {
    let word = document.getElementById("wordTitle")?.textContent.trim();
    
    if (word && word !== "") {
        let savedNote = localStorage.getItem(`note_${word}`) || ""; // 讀取筆記
        document.getElementById("wordNote").value = savedNote; // 設定回 textarea
        console.log("📌 載入筆記:", word, savedNote);
    } else {
        console.warn("⚠️ 無法載入筆記，wordTitle 未加載");
    }
}

// **確保在頁面載入時，自動載入筆記**
document.addEventListener("DOMContentLoaded", function () {
    // 確保單字列表載入後應用 checked 狀態
    setTimeout(() => {
        document.querySelectorAll(".word-item-container").forEach(item => {
            let word = item.querySelector(".word-item").dataset.word;
            if (localStorage.getItem(`checked_${word}`) === "true") {
                item.classList.add("checked"); // 添加縮小樣式
                let icon = item.querySelector(".check-button img");
                if (icon) {
                    icon.src = "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/checked-icon.svg";
                }
            }
        });
    }, 500); // 避免 DOM 還未完全渲染
});

function exportAllData() {
    let allData = { ...localStorage }; // 取得所有 `localStorage` 資料
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

            // 📌 清除原本的 `localStorage`，確保資料乾淨
            localStorage.clear();

            // 📌 把 JSON 內的資料存回 `localStorage`
            Object.keys(importedData).forEach(key => {
                localStorage.setItem(key, importedData[key]);
            });

            alert("✅ `localStorage` 已成功匯入！");
            console.log("📌 已還原 `localStorage` 資料:", importedData);
            location.reload(); // 重新載入頁面，確保變更生效
        };
        reader.readAsText(file);
    };
    fileInput.click();
}

// 從 URL 取得單字參數
function getWordFromURL() {
    let params = new URLSearchParams(window.location.search);
    return params.get('word');
}

// 從 URL 取得來源參數
function getFromPage() {
    let params = new URLSearchParams(window.location.search);
    return params.get('from');
}

// 在 JSON 載入完成後顯示詳情
function displayWordDetailsFromURL() {
    let wordName = getWordFromURL();
    if (!wordName) return; // 如果沒有傳遞單字參數，則不執行任何動作

    // 查找對應單字資料
    let wordData = wordsData.find(w => w.Words.toLowerCase() === wordName.toLowerCase());
    if (wordData) {
        showDetails(wordData); // 呼叫原有函數顯示詳情
    } else {
        console.warn("❌ 找不到對應單字資料！");
    }
}

// 修改 JSON 載入成功後的程式碼，確保自動顯示詳情
document.addEventListener("DOMContentLoaded", function () {
    fetch("https://boydyang-designer.github.io/English-vocabulary/Z_total_words.json")
        .then(res => res.json())
        .then(data => {
            wordsData = data["New Words"] || [];
            console.log("✅ JSON 資料已成功載入");

            // 資料載入完成後，檢查 URL 是否有單字參數並顯示詳情
            displayWordDetailsFromURL();
        })
        .catch(err => console.error("❌ 讀取 JSON 失敗:", err));
});

