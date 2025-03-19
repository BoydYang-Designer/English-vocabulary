//全局變數
let wordsData = [];
let sentenceData = [];
let sentenceAudio = new Audio();
let lastWordListType = "";
let lastWordListValue = "";
let lastSentenceListWord = "";
let currentSentenceList = []; // 儲存當前的句子列表
let currentSentenceIndex = -1; // 儲存當前句子的索引
let touchStartX = 0; // 滑動起點 X 座標
let touchEndX = 0; // 滑動終點 X 座標
let isQuizMode = false; // 新增：標記是否為測驗模式


document.addEventListener("DOMContentLoaded", function () {
    console.log("開始載入資料...");

    Promise.all([
        fetch("https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Z_total_words.json")
            .then(res => {
                if (!res.ok) throw new Error(`HTTP 錯誤: ${res.status}`);
                return res.json();
            })
            .then(data => {
                wordsData = data["New Words"] || [];
                console.log("✅ Z_total_words.json 載入成功:", wordsData.length);
            }),
        fetch("https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Sentence%20file/sentence.json")
            .then(res => {
                if (!res.ok) throw new Error(`HTTP 錯誤: ${res.status}`);
                return res.json();
            })
            .then(data => {
                sentenceData = data["New Words"] || [];
                console.log("✅ sentence.json 載入成功:", sentenceData.length);
            })
    ])
    .then(() => {
        renderAlphabetButtons();
        createCategoryButtons();
        createLevelButtons();

        document.getElementById("startQuizBtn").addEventListener("click", () => window.location.href = "quiz.html");
        document.getElementById("returnHomeBtn").addEventListener("click", () => window.location.href = "index.html");

        const urlParams = new URLSearchParams(window.location.search);
        const sentenceParam = urlParams.get('sentence');
        const fromParam = urlParams.get('from');
        const layerParam = urlParams.get('layer');

        if (sentenceParam && layerParam === '4') {
            if (fromParam === 'quiz') {
                isQuizMode = true;
                const quizSentences = JSON.parse(localStorage.getItem("currentQuizSentences")) || [];
                console.log("從 localStorage 讀取的 currentQuizSentences:", quizSentences);
                if (quizSentences.length > 0) {
                    // 確保只使用本次測驗的句子，並限制最大 5 句
                    currentSentenceList = quizSentences.slice(0, 10);
                    currentSentenceIndex = currentSentenceList.findIndex(s => s.Words === sentenceParam);
                    console.log("✅ 從測驗結果進入，使用 currentQuizSentences (限制為 5 句):", currentSentenceList);
                } else {
                    console.warn("⚠️ localStorage 中沒有 currentQuizSentences，fallback 到單字過濾");
                    isQuizMode = false;
                    const word = sentenceParam.split("-")[0];
                    currentSentenceList = sentenceData.filter(s => s.Words.startsWith(word + "-"));
                    currentSentenceList.sort((a, b) => {
                        const numA = parseInt(a.Words.split("-")[1], 10);
                        const numB = parseInt(b.Words.split("-")[1], 10);
                        return numA - numB;
                    });
                    currentSentenceIndex = currentSentenceList.findIndex(s => s.Words === sentenceParam);
                }
            } else {
                isQuizMode = false;
                const word = sentenceParam.split("-")[0];
                currentSentenceList = sentenceData.filter(s => s.Words.startsWith(word + "-"));
                currentSentenceList.sort((a, b) => {
                    const numA = parseInt(a.Words.split("-")[1], 10);
                    const numB = parseInt(b.Words.split("-")[1], 10);
                    return numA - numB;
                });
                currentSentenceIndex = currentSentenceList.findIndex(s => s.Words === sentenceParam);
            }
            showSentenceDetails(sentenceParam);
        } else {
            isQuizMode = false;
            backToFirstLayer();
        }
    })
    .catch(err => console.error("❌ 資料載入失敗:", err));
});

// 第一層：生成字母按鈕
function renderAlphabetButtons() {
    const alphabetContainer = document.getElementById("alphabetButtons");
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    alphabetContainer.innerHTML = alphabet
        .map(letter => `<button class='letter-btn' data-letter='${letter.toLowerCase()}'>${letter}</button>`)
        .join(" ");

    alphabetContainer.querySelectorAll(".letter-btn").forEach(button => {
        button.addEventListener("click", () => {
            const letter = button.getAttribute("data-letter");
            showWords("letter", letter);
        });
    });
}

// 第一層：生成分類按鈕
function createCategoryButtons() {
    let categories = [...new Set(wordsData.map(w => w["分類"] || "未分類"))];
    // 移除 "Note"，新增 "Sentence Notes"
    categories.unshift("Checked 單字", "重要單字", "錯誤單字", "Sentence Notes", "重要句子", "錯誤句子");

    const categoryContainer = document.getElementById("categoryButtons");
    categoryContainer.innerHTML = categories.map(c => {
        if (c === "Checked 單字") return `<button class='letter-btn' onclick='showCheckedWords()'>${c}</button>`;
        if (c === "重要單字") return `<button class='letter-btn' onclick='showImportantWords()'>${c}</button>`;
        if (c === "錯誤單字") return `<button class='letter-btn' onclick='showWrongWords()'>${c}</button>`;
        if (c === "Sentence Notes") return `<button class='letter-btn' onclick='showSentenceNotes()'>${c}</button>`;
        if (c === "重要句子") return `<button class='letter-btn' onclick='showImportantSentences()'>${c}</button>`;
        if (c === "錯誤句子") return `<button class='letter-btn' onclick='showWrongSentences()'>${c}</button>`;
        return `<button class='letter-btn' onclick='showWords("category", "${c}")'>${c}</button>`;
    }).join(" ");
}

function showImportantSentences() {
    console.log("進入 showImportantSentences, sentenceData.length:", sentenceData.length);
    document.getElementById("wordListTitle").innerText = "重要句子";
    document.getElementById("wordListTitle").style.display = "block";
    lastWordListType = "importantSentences";
    lastWordListValue = null;

    if (!sentenceData || sentenceData.length === 0) {
        console.error("❌ sentenceData 未載入或為空");
        document.getElementById("sentenceItems").innerHTML = "<p>⚠️ 資料載入失敗，請刷新頁面</p>";
        return;
    }

    let importantSentences = sentenceData.filter(s => localStorage.getItem(`important_sentence_${s.Words}`) === "true");
    console.log("過濾後的 importantSentences:", importantSentences);
    if (importantSentences.length === 0) console.warn("⚠️ 沒有標記為重要的句子");
    displaySentenceList(importantSentences);
}

function showWrongSentences() {
    document.getElementById("wordListTitle").innerText = "錯誤句子";
    document.getElementById("wordListTitle").style.display = "block";
    lastWordListType = "wrongSentences";
    lastWordListValue = null;

    let wrongSentences = JSON.parse(localStorage.getItem("wrongQS")) || [];
    let filteredSentences = sentenceData.filter(s => wrongSentences.includes(s.Words));
    if (filteredSentences.length === 0) console.warn("⚠️ 沒有標記為錯誤的句子");
    displaySentenceList(filteredSentences);
}

// 第一層：生成等級按鈕
function createLevelButtons() {
    let levels = [...new Set(wordsData.map(w => w["等級"] || "未分類"))];
    const levelContainer = document.getElementById("levelButtons");
    levelContainer.innerHTML = levels
        .map(l => `<button class='letter-btn' onclick='showWords("level", "${l}")'>${l}</button>`).join(" ");
}

// 第一層：搜尋功能
function filterSentences() {
    let input = document.getElementById("searchInput").value.toLowerCase();
    if (!wordsData.length) return;

    let filtered = wordsData.filter(w => w.Words.toLowerCase().startsWith(input));
    let searchResults = document.getElementById("searchResults") || document.createElement("div");
    searchResults.id = "searchResults";
    if (input === "") {
        searchResults.remove();
        return;
    }

    searchResults.innerHTML = filtered.length > 0
        ? filtered.map(w => `<p class='word-item' onclick='showSentences("${w.Words}")'>${w.Words}</p>`).join("")
        : "<p>⚠️ 沒有符合的單字</p>";
    document.getElementById("searchContainer").appendChild(searchResults);
}

function displaySentenceList(sentences) {
    document.getElementById("searchContainer").style.display = "none";
    document.getElementById("startQuizBtn").style.display = "none";
    document.getElementById("returnHomeBtn").style.display = "none";
    document.getElementById("wordList").style.display = "none";
    document.getElementById("sentenceList").style.display = "block";
    document.querySelector('.alphabet-container').style.display = "none";
    document.querySelector('.category-container').style.display = "none";
    document.querySelector('.level-container').style.display = "none";
    document.querySelector('#sentenceList .back-button').style.display = "none";

    // 儲存當前句子列表
    currentSentenceList = sentences;
    
    let sentenceItems = document.getElementById("sentenceItems");
    sentenceItems.innerHTML = sentences.length > 0
        ? sentences.map((s, index) => {
            let sentenceId = s.Words;
            let isImportant = localStorage.getItem(`important_sentence_${sentenceId}`) === "true";
            return `
                <div class='word-item-container'>
                    <input type='checkbox' class='important-checkbox' onchange='toggleImportantSentence("${sentenceId}", this)' ${isImportant ? "checked" : ""}>
                    <p class='word-item' data-sentence="${sentenceId}" onclick='showSentenceDetails("${sentenceId}", ${index})'>${sentenceId}: ${s.句子}</p>
                    <button class='audio-btn' onclick='playSentenceAudio("${sentenceId}.mp3")'>
                        <img src="https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/play.svg" alt="Play" width="24" height="24" />
                    </button>
                </div>`;
        }).join("")
        : "<p>⚠️ 目前沒有符合的句子</p>";

    sentenceItems.innerHTML = `<button id="backHomeBtn" class="button back-button" onclick="backToFirstLayer()">Back H</button>` + sentenceItems.innerHTML;
}

// 第二層：顯示單字列表
function showWords(type, value) {
    let titleText = type === "letter" ? value.toUpperCase() : type === "category" ? value : `${value} Level`;
    document.getElementById("wordListTitle").innerText = titleText;
    document.getElementById("wordListTitle").style.display = "block";

    lastWordListType = type;
    lastWordListValue = value;

    document.getElementById("searchContainer").style.display = "none";
    document.getElementById("startQuizBtn").style.display = "none";
    document.getElementById("returnHomeBtn").style.display = "none";
    document.getElementById("wordList").style.display = "block";
    document.querySelector('.alphabet-container').style.display = "none";
    document.querySelector('.category-container').style.display = "none";
    document.querySelector('.level-container').style.display = "none";

    let wordItems = document.getElementById("wordItems");
    wordItems.innerHTML = "";

    let filteredWords = wordsData.filter(w => {
        let word = w.Words;
        let category = w["分類"] || "未分類";
        let level = w["等級"] || "未分類";
        if (type === "letter") return word.toLowerCase().startsWith(value.toLowerCase());
        if (type === "category") return category === value;
        if (type === "level") return level === value;
        return false;
    });

    if (filteredWords.length === 0) {
        wordItems.innerHTML = "<p>⚠️ 沒有符合的單字</p>";
    } else {
        filteredWords.forEach(word => {
            let wordText = word.Words;
            let isChecked = localStorage.getItem(`checked_${wordText}`) === "true";
            let isImportant = localStorage.getItem(`important_${wordText}`) === "true";
            let iconSrc = isChecked ? "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/checked-icon.svg" : "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/check-icon.svg";

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

            item.querySelector('.word-item').addEventListener("click", () => showSentences(wordText));
        });
    }
}

// 第二層：勾選與標記功能
function toggleCheck(word, button) {
    let isChecked = localStorage.getItem(`checked_${word}`) === "true";
    let icon = button.querySelector("img");
    let container = button.closest(".word-item-container");

    if (isChecked) {
        localStorage.removeItem(`checked_${word}`);
        icon.src = "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/check-icon.svg";
        container.classList.remove("checked");
        container.style.opacity = "1";
    } else {
        localStorage.setItem(`checked_${word}`, "true");
        icon.src = "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/checked-icon.svg";
        container.classList.add("checked");
        container.style.opacity = "0.3";
    }
}

function toggleImportant(word, checkbox) {
    if (checkbox.checked) localStorage.setItem(`important_${word}`, "true");
    else localStorage.removeItem(`important_${word}`);
}

function showCheckedWords() {
    document.getElementById("wordListTitle").innerText = "Checked 單字";
    document.getElementById("wordListTitle").style.display = "block";
    lastWordListType = "checked";
    lastWordListValue = null;
    displayWordList(wordsData.filter(w => localStorage.getItem(`checked_${w.Words}`) === "true").map(w => w.Words));
}

function showImportantWords() {
    document.getElementById("wordListTitle").innerText = "重要單字";
    document.getElementById("wordListTitle").style.display = "block";
    lastWordListType = "important";
    lastWordListValue = null;
    displayWordList(wordsData.filter(w => localStorage.getItem(`important_${w.Words}`) === "true").map(w => w.Words));
}

function showWrongWords() {
    document.getElementById("wordListTitle").innerText = "錯誤單字";
    document.getElementById("wordListTitle").style.display = "block";
    lastWordListType = "wrong";
    lastWordListValue = null;
    let wrongWords = JSON.parse(localStorage.getItem("wrongWords")) || [];
    displayWordList(wrongWords);
}

function showSentences(word) {
    document.getElementById("wordListTitle").innerText = word;
    document.getElementById("wordListTitle").style.display = "block";

    document.getElementById("searchContainer").style.display = "none";
    document.getElementById("startQuizBtn").style.display = "none";
    document.getElementById("returnHomeBtn").style.display = "none";
    document.querySelector('.alphabet-container').style.display = "none";
    document.querySelector('.category-container').style.display = "none";
    document.querySelector('.level-container').style.display = "none";
    document.getElementById("wordList").style.display = "none";
    document.getElementById("sentenceList").style.display = "block";
    document.querySelector('#sentenceList .back-button').style.display = "block";

    lastSentenceListWord = word;

    let sentenceItems = document.getElementById("sentenceItems");
    sentenceItems.innerHTML = "";

    // 過濾並排序句子
    let filteredSentences = sentenceData.filter(s => s.Words.startsWith(word + "-"));
    filteredSentences.sort((a, b) => {
        const numA = parseInt(a.Words.split("-")[1], 10);
        const numB = parseInt(b.Words.split("-")[1], 10);
        return numA - numB;
    });

    // 更新 currentSentenceList
    currentSentenceList = filteredSentences;

    if (filteredSentences.length === 0) {
        sentenceItems.innerHTML = "<p>⚠️ 沒有符合的句子</p>";
    } else {
        filteredSentences.forEach((s, index) => {
            let sentenceId = s.Words;
            let isImportant = localStorage.getItem(`important_sentence_${sentenceId}`) === "true";
            let item = document.createElement("div");
            item.className = "word-item-container";
            item.innerHTML = `
                <input type='checkbox' class='important-checkbox' onchange='toggleImportantSentence("${sentenceId}", this)' ${isImportant ? "checked" : ""}>
                <p class='word-item' data-sentence="${sentenceId}">${sentenceId}: ${s.句子}</p>
                <button class='audio-btn' onclick='playSentenceAudio("${sentenceId}.mp3")'>
                    <img src="https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/play.svg" alt="Play" width="24" height="24" />
                </button>
            `;
            sentenceItems.appendChild(item);

            item.querySelector('.word-item').addEventListener("click", () => showSentenceDetails(sentenceId, index));
        });
    }
}

function displayWordList(words) {
    document.getElementById("searchContainer").style.display = "none";
    document.getElementById("startQuizBtn").style.display = "none";
    document.getElementById("returnHomeBtn").style.display = "none";
    document.getElementById("wordList").style.display = "block";
    document.querySelector('.alphabet-container').style.display = "none";
    document.querySelector('.category-container').style.display = "none";
    document.querySelector('.level-container').style.display = "none";

    let wordItems = document.getElementById("wordItems");
    wordItems.innerHTML = words.length > 0
        ? words.map(word => {
            let isChecked = localStorage.getItem(`checked_${word}`) === "true";
            let isImportant = localStorage.getItem(`important_${word}`) === "true";
            let iconSrc = isChecked ? "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/checked-icon.svg" : "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/check-icon.svg";
            return `
                <div class='word-item-container ${isChecked ? "checked" : ""}'>
                    <input type='checkbox' class='important-checkbox' onchange='toggleImportant("${word}", this)' ${isImportant ? "checked" : ""}>
                    <p class='word-item' data-word="${word}" onclick='showSentences("${word}")'>${word}</p>
                    <button class='check-button' onclick='toggleCheck("${word}", this)'>
                        <img src="${iconSrc}" class="check-icon" alt="Check" width="24" height="24">
                    </button>
                </div>`;
        }).join("")
        : "<p>⚠️ 目前沒有符合的單字</p>";
}


function toggleImportantSentence(sentenceId, checkbox) {
    if (checkbox.checked) localStorage.setItem(`important_sentence_${sentenceId}`, "true");
    else localStorage.removeItem(`important_sentence_${sentenceId}`);
}



function startTouch(event) {
    const target = event.target;
    // 如果觸控目標是按鈕，則忽略滑動
    if (target.tagName === "BUTTON" || target.closest(".audio-btn")) {
        console.log("觸控目標是按鈕，忽略滑動");
        return;
    }
    console.log("觸控開始", event.touches[0].clientX);
    touchStartX = event.touches[0].clientX;
    const detailsArea = document.getElementById("sentenceDetails");
    detailsArea.style.transition = "none";
}

function moveTouch(event) {
    console.log("觸控移動", event.touches[0].clientX);
    touchEndX = event.touches[0].clientX;
    const swipeDistance = touchEndX - touchStartX;
    const detailsArea = document.getElementById("sentenceDetails");
    // 即時更新位置，跟隨手指移動
    detailsArea.style.transform = `translateX(${swipeDistance}px)`;
}

function endTouch(event) {
    console.log("觸控結束");
    const swipeThreshold = 50;
    const swipeDistance = touchEndX - touchStartX;
    const detailsArea = document.getElementById("sentenceDetails");
    detailsArea.style.transition = "transform 0.3s ease-in-out";

    console.log("滑動距離:", swipeDistance, "當前列表長度:", currentSentenceList.length, "測驗模式:", isQuizMode);
    if (Math.abs(swipeDistance) > swipeThreshold && currentSentenceList.length > 0) {
        if (swipeDistance > 0 && currentSentenceIndex > 0) {
            console.log("右滑：切換到上一句", currentSentenceIndex - 1);
            detailsArea.classList.add("sliding-out-right");
            setTimeout(() => {
                currentSentenceIndex--;
                showSentenceDetails(currentSentenceList[currentSentenceIndex].Words, currentSentenceIndex, "from-left");
                detailsArea.classList.remove("sliding-out-right");
                detailsArea.style.transform = "translateX(0)";
            }, 300);
        } else if (swipeDistance < 0 && currentSentenceIndex < currentSentenceList.length - 1) {
            console.log("左滑：切換到下一句", currentSentenceIndex + 1);
            detailsArea.classList.add("sliding-out-left");
            setTimeout(() => {
                currentSentenceIndex++;
                showSentenceDetails(currentSentenceList[currentSentenceIndex].Words, currentSentenceIndex, "from-right");
                detailsArea.classList.remove("sliding-out-left");
                detailsArea.style.transform = "translateX(0)";
            }, 300);
        } else {
            console.log("滑動無效：超出範圍或距離不足");
            detailsArea.style.transform = "translateX(0)";
        }
    } else {
        console.log("滑動無效：列表為空或距離不足");
        detailsArea.style.transform = "translateX(0)";
    }

    touchStartX = 0;
    touchEndX = 0;
}

function showSentenceDetails(sentenceId, index = -1, direction = null) {
    let sentenceObj = sentenceData.find(s => s.Words === sentenceId);
    if (!sentenceObj) {
        console.error(`❌ 未找到句子: ${sentenceId}`);
        return;
    }

    // 在測驗模式下，不重新計算索引，除非提供了有效的 index
    if (isQuizMode && index === -1) {
        console.log("✅ 測驗模式：保持 currentSentenceList 不變");
    } else if (index !== -1) {
        currentSentenceIndex = index;
    } else if (currentSentenceList.length > 0 && currentSentenceIndex === -1) {
        currentSentenceIndex = currentSentenceList.findIndex(s => s.Words === sentenceId);
    }

    console.log("進入 showSentenceDetails - sentenceId:", sentenceId);
    console.log("當前句子列表:", currentSentenceList);
    console.log("當前索引:", currentSentenceIndex);
    console.log("測驗模式:", isQuizMode);

    const detailsArea = document.getElementById("sentenceDetails");

    // 如果有動畫方向，設置初始位置
    if (direction === "from-right") {
        detailsArea.classList.add("sliding-in-from-right");
    } else if (direction === "from-left") {
        detailsArea.classList.add("sliding-in-from-left");
    }

    // 更新內容（保持不變）
    let word = sentenceId.split("-")[0];
    let wordObj = wordsData.find(w => w.Words === word);
    let header = `
        <div class="phonetics-container">
            <input type='checkbox' class='important-checkbox' onchange='toggleImportantSentence("${sentenceId}", this)' ${localStorage.getItem(`important_sentence_${sentenceId}`) === "true" ? "checked" : ""}>
            <div id="sentenceTitle" style="font-size: 20px; font-weight: bold;">${sentenceId}</div>
        </div>`;
    let phonetics = wordObj ? 
        ((wordObj["pronunciation-1"] ? `<button class='button' onclick='playAudio("${word}.mp3")'>${wordObj["pronunciation-1"]}</button>` : "") +
        (wordObj["pronunciation-2"] ? `<button class='button' onclick='playAudio("${word} 2.mp3")'>${wordObj["pronunciation-2"]}</button>` : "") || "<p>No pronunciation available</p>") : 
        "<p>No pronunciation available</p>";
    let sentenceText = `<p>${sentenceObj.句子}</p>`;
    let chineseText = `<p>${sentenceObj.中文}</p>`;

    document.getElementById("sentenceHeader").innerHTML = header;
    document.getElementById("phoneticContainer").innerHTML = phonetics;
    document.getElementById("sentenceContainer").innerHTML = sentenceText;
    document.getElementById("chineseContainer").innerHTML = chineseText;

    const playAudioBtn = document.getElementById("playAudioBtn");
    playAudioBtn.setAttribute("onclick", `playSentenceAudio("${sentenceId}.mp3")`);
    playAudioBtn.classList.remove("playing");

    // 阻止按鈕的觸控事件冒泡
    playAudioBtn.addEventListener("touchstart", (event) => {
        event.stopPropagation();
    }, { passive: true });
    playAudioBtn.addEventListener("touchmove", (event) => {
        event.stopPropagation();
    }, { passive: true });
    playAudioBtn.addEventListener("touchend", (event) => {
        event.stopPropagation();
    });

    displayNote(sentenceId);

    // 切換顯示層級
    document.getElementById("sentenceList").style.display = "none";
    document.getElementById("sentenceDetails").style.display = "block";
    document.getElementById("wordListTitle").style.display = "none";
    document.getElementById("searchContainer").style.display = "none";
    document.getElementById("startQuizBtn").style.display = "none";
    document.getElementById("returnHomeBtn").style.display = "none";
    document.querySelector('.alphabet-container').style.display = "none";
    document.querySelector('.category-container').style.display = "none";
    document.querySelector('.level-container').style.display = "none";
    document.getElementById("wordList").style.display = "none";
    document.getElementById("sentenceList").style.display = "none";

    // 執行滑入動畫
    if (direction) {
        setTimeout(() => {
            detailsArea.style.transform = "translateX(0)";
            detailsArea.classList.remove("sliding-in-from-right", "sliding-in-from-left");
        }, 10);
    }

    // 移除舊的事件監聽器
    detailsArea.removeEventListener("touchstart", startTouch);
    detailsArea.removeEventListener("touchmove", moveTouch);
    detailsArea.removeEventListener("touchend", endTouch);

    // 添加新的事件監聽器，標記 touchstart 和 touchmove 為被動
    detailsArea.addEventListener("touchstart", startTouch, { passive: true });
    detailsArea.addEventListener("touchmove", moveTouch, { passive: true });
    detailsArea.addEventListener("touchend", endTouch);
}

let wordAudio = new Audio();
function playAudio(filename) {
    wordAudio.src = `https://github.com/BoydYang-Designer/English-vocabulary/raw/main/audio_files/${filename}`;
    wordAudio.play();
}


function playSentenceAudio(filename) {
    console.log("開始播放:", filename);
    const playButtons = document.querySelectorAll(`.audio-btn[onclick="playSentenceAudio('${filename}')"]`);
    const playBtn = playButtons[playButtons.length - 1] || document.getElementById("playAudioBtn");
    sentenceAudio.src = `https://github.com/BoydYang-Designer/English-vocabulary/raw/main/Sentence%20file/${filename}`;
    if (playBtn) {
        playBtn.classList.add("playing");
    }
    sentenceAudio.play()
        .then(() => console.log(`✅ 播放 ${filename} 成功`))
        .catch(error => {
            console.error(`🔊 播放 ${filename} 失敗:`, error);
            if (playBtn) playBtn.classList.remove("playing");
        });
    sentenceAudio.onended = () => {
        if (playBtn) playBtn.classList.remove("playing");
        console.log(`✅ ${filename} 播放結束`);
    };
    document.querySelectorAll(".audio-btn.playing").forEach(btn => {
        if (btn !== playBtn) btn.classList.remove("playing");
    });
}

function togglePauseAudio(button) {
    if (sentenceAudio.paused || sentenceAudio.ended) {
        sentenceAudio.play();
        button.innerHTML = `<img src="https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/pause.svg" alt="Pause" width="24" height="24" />`;
    } else {
        sentenceAudio.pause();
        button.innerHTML = `<img src="https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/play.svg" alt="Play" width="24" height="24" />`;
    }
}

function adjustAudioTime(seconds) {
    sentenceAudio.currentTime = Math.max(0, sentenceAudio.currentTime + seconds);
}

function filterSentencesInDetails() {
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
    } else {
        filtered.forEach(wordObj => {
            let wordText = wordObj.Words || wordObj.word || wordObj["單字"] || "";
            let item = document.createElement("p");
            item.className = "word-item";
            item.textContent = wordText;
            item.addEventListener("click", function() {
                let currentSentenceId = document.getElementById("sentenceTitle")?.textContent.trim() || lastSentenceListWord;
                window.location.href = `index.html?word=${encodeURIComponent(wordText)}&from=sentence&sentenceId=${encodeURIComponent(currentSentenceId)}`;
            });
            searchResults.appendChild(item);
        });
    }
}

function saveNote() {
    let sentenceId = document.getElementById("sentenceTitle")?.textContent.trim();
    let note = document.getElementById("sentenceNote").value.trim();
    let checkbox = document.getElementById("noteCheckbox");

    if (checkbox.checked || note.length > 0) {
        localStorage.setItem(`note_sentence_${sentenceId}`, note);
        document.getElementById("savedNote").textContent = "✅ Note saved!";
    } else {
        localStorage.removeItem(`note_sentence_${sentenceId}`);
        document.getElementById("savedNote").textContent = "🗑️ Note deleted!";
    }
    setTimeout(() => document.getElementById("savedNote").textContent = "", 3000);
}

function displayNote(sentenceId) {
    let note = localStorage.getItem(`note_sentence_${sentenceId}`) || "";
    document.getElementById("sentenceNote").value = note;
    document.getElementById("noteCheckbox").checked = note.length > 0;
}

function updateCheckbox() {
    let note = document.getElementById("sentenceNote").value.trim();
    document.getElementById("noteCheckbox").checked = note.length > 0;
}

function handleCheckboxClick() {
    let checkbox = document.getElementById("noteCheckbox");
    if (!checkbox.checked) localStorage.removeItem(`note_sentence_${document.getElementById("sentenceTitle").textContent.trim()}`);
}

function exportAllData() {
    let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(localStorage, null, 2));
    let downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "localStorage_backup.json");
    downloadAnchor.click();
    downloadAnchor.remove();
}

function importAllData() {
    let fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".json";
    fileInput.onchange = function (event) {
        let file = event.target.files[0];
        let reader = new FileReader();
        reader.onload = function (event) {
            let importedData = JSON.parse(event.target.result);
            localStorage.clear();
            Object.keys(importedData).forEach(key => localStorage.setItem(key, importedData[key]));
            location.reload();
        };
        reader.readAsText(file);
    };
    fileInput.click();
}

function backToFirstLayer() {
    document.getElementById("searchContainer").style.display = "block";
    document.getElementById("startQuizBtn").style.display = "block";
    document.getElementById("returnHomeBtn").style.display = "block";
    document.getElementById("wordList").style.display = "none";
    document.getElementById("sentenceList").style.display = "none";
    document.getElementById("sentenceDetails").style.display = "none";
    document.querySelector('.alphabet-container').style.display = "block";
    document.querySelector('.category-container').style.display = "block";
    document.querySelector('.level-container').style.display = "block";
    document.getElementById("searchInput").value = "";
    let searchResults = document.getElementById("searchResults");
    if (searchResults) searchResults.remove();

    // 隱藏並清空標題
    let wordListTitle = document.getElementById("wordListTitle");
    wordListTitle.style.display = "none"; // 隱藏標題
    wordListTitle.innerText = ""; // 清空文字（可選）
}

function backToWordList() {
    document.getElementById("sentenceList").style.display = "none";
    if (lastWordListType === "checked") showCheckedWords();
    else if (lastWordListType === "important") showImportantWords();
    else if (lastWordListType === "wrong") showWrongWords();
    else if (lastWordListType === "sentenceNotes") showSentenceNotes(); // 新增這行
    else if (lastWordListType === "importantSentences") showImportantSentences();
    else if (lastWordListType === "wrongSentences") showWrongSentences();
    else if (lastWordListType && lastWordListValue) showWords(lastWordListType, lastWordListValue);
    else backToFirstLayer();
}

function backToSentenceList(event) {
    event.stopPropagation(); // 阻止事件冒泡
    const urlParams = new URLSearchParams(window.location.search);
    const fromParam = urlParams.get('from');

    document.getElementById("sentenceDetails").style.display = "none";

    if (fromParam === 'quiz') {
        window.location.href = "quiz.html?returning=true";
    } else if (lastWordListType === "sentenceNotes") {
        showSentenceNotes();
    } else if (lastWordListType === "importantSentences") {
        showImportantSentences();
    } else if (lastWordListType === "wrongSentences") {
        showWrongSentences();
    } else if (lastSentenceListWord) {
        showSentences(lastSentenceListWord);
    } else {
        backToFirstLayer();
    }
}