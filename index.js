let historyStack = []; // 記錄所有歷史狀態
let wordsData = [];
let sentenceAudio = new Audio();
let lastWordListType = ""; // 記錄進入單字列表的方式
let lastWordListValue = ""; // 記錄字母或分類值
let lastSentenceListWord = "";
let isAutoPlaying = false;
let isPaused = false;
let currentAudio = new Audio();
window.currentWordList = [];

function showNotification(message, type = 'success') {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 4000);
}

document.addEventListener("DOMContentLoaded", function () {
    const loadingOverlay = document.getElementById('loading-overlay');

    document.querySelectorAll('.collapsible-content').forEach(content => {
        content.style.maxHeight = '0px';
    });

    document.getElementById("mainPageContainer").style.display = "block";
    document.getElementById("wordList").style.display = "none";
    document.getElementById("wordDetails").style.display = "none";
    document.getElementById("wordListTitle").style.display = "none";
    document.getElementById("autoPlayBtn").style.display = "none";
    document.querySelector('.start-learning-container').style.display = "none";

    const sentenceButton = document.getElementById("sentencePageBtn");
    if (sentenceButton) {
        sentenceButton.addEventListener("click", () => window.location.href = "sentence.html");
    }

    const quizButton = document.getElementById("startQuizBtn");
    if (quizButton) {
        quizButton.addEventListener("click", () => window.location.href = "quiz.html?show=sentenceCategories&from=index");
    }

    const startLearningButton = document.getElementById("startLearningBtn");
    if (startLearningButton) {
        startLearningButton.addEventListener("click", startLearning);
    }
    
    document.querySelectorAll(".collapsible-header").forEach(button => {
        button.addEventListener("click", function() {
            this.classList.toggle("active");
            const content = this.nextElementSibling;
            if (content.style.maxHeight && content.style.maxHeight !== '0px') {
                content.style.maxHeight = '0px';
            } else {
                content.style.maxHeight = content.scrollHeight + "px";
            }
        });
    });

     fetch("https://boydyang-designer.github.io/English-vocabulary/audio_files/Z_total_words.json")
        .then(res => res.json())
        .then(data => {
            wordsData = data["New Words"] || [];
            
            wordsData.forEach(w => {
                if (typeof w["分類"] === "string") w["分類"] = [w["分類"]];
                else if (!Array.isArray(w["分類"])) w["分類"] = [];
            });

            loadingOverlay.style.opacity = '0';
            setTimeout(() => loadingOverlay.style.display = 'none', 300);
            showNotification('✅ 資料載入完成！', 'success');

            console.log("✅ JSON 載入成功:", wordsData);

            setTimeout(() => {
                createAlphabetButtons();
                createCategoryButtons();
                createLevelButtons();
                document.querySelector('.start-learning-container').style.display = "block";
            }, 500);

            displayWordDetailsFromURL();

            setTimeout(() => {
                let bButton = document.getElementById("bButton");
                if (bButton) {
                    bButton.disabled = true;
                    bButton.style.backgroundColor = "#ccc";
                    bButton.addEventListener("click", backToPrevious);
                    let params = new URLSearchParams(window.location.search);
                    if (params.get('from') === "sentence" && params.get('word')) {
                        bButton.disabled = false;
                        bButton.style.backgroundColor = "#6c757d";
                    }
                }
            }, 300);
        })
        .catch(err => {
            loadingOverlay.style.opacity = '0';
            setTimeout(() => loadingOverlay.style.display = 'none', 300);
            showNotification('❌ 資料載入失敗，請檢查網路連線。', 'error');
            console.error("❌ 讀取 JSON 失敗:", err);
        });
});

function toggleSelection(btn) {
    btn.classList.toggle('selected');
}

// ▼▼▼ 修改此函式 ▼▼▼
function handlePrimaryCategoryClick(btn, categoryName) {
    toggleSelection(btn);

    let parentContainer = btn.closest('.collapsible-content');
    let subcategoryWrapper = document.getElementById(`sub-for-${categoryName.replace(/\s/g, '-')}`);

    if (!subcategoryWrapper) {
        subcategoryWrapper = document.createElement('div');
        subcategoryWrapper.className = 'subcategory-wrapper';
        subcategoryWrapper.id = `sub-for-${categoryName.replace(/\s/g, '-')}`;

        // 提取所有明確的次分類
        const secondaryCategories = [...new Set(
            wordsData
                .filter(w => w["分類"] && w["分類"][0] === categoryName && w["分類"][1])
                .map(w => w["分類"][1])
        )];

        // 檢查是否存在沒有次分類的單字
        const hasUncategorized = wordsData.some(w => 
            w["分類"] && w["分類"][0] === categoryName && (!w["分類"][1] || w["分類"][1].trim() === '')
        );

        if (hasUncategorized) {
            secondaryCategories.unshift("未分類"); // 將「未分類」選項放在最前面
        }
        
        if (secondaryCategories.length > 0) {
            const subWrapper = document.createElement('div');
            subWrapper.className = 'button-wrapper';
            subWrapper.innerHTML = secondaryCategories.map(subCat => 
                `<button class="letter-btn" data-value='${subCat}' onclick="toggleSelection(this)">${subCat}</button>`
            ).join(' ');
            subcategoryWrapper.appendChild(subWrapper);
        }
        
        // 將次分類容器插入到主分類按鈕的後面
        btn.parentNode.insertBefore(subcategoryWrapper, btn.nextSibling);
    }

    const mainCollapsibleContent = btn.closest('.collapsible-content');

    // 切換次分類容器的顯示/隱藏
    if (subcategoryWrapper.style.maxHeight && subcategoryWrapper.style.maxHeight !== '0px') {
        subcategoryWrapper.style.maxHeight = '0px';
    } else {
        subcategoryWrapper.style.maxHeight = subcategoryWrapper.scrollHeight + "px";
    }

    // 重新計算並設定主分類容器的高度以容納次分類容器
    setTimeout(() => {
        if (mainCollapsibleContent.style.maxHeight !== '0px') {
             mainCollapsibleContent.style.maxHeight = mainCollapsibleContent.scrollHeight + "px";
        }
    }, 310); // 等待次分類動畫完成
}
// ▲▲▲ 修改結束 ▲▲▲

function createAlphabetButtons() {
    const container = document.getElementById("alphabetButtons");
    if (container) {
        const wrapper = document.createElement('div');
        wrapper.className = 'button-wrapper';
        wrapper.innerHTML = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(l =>
            `<button class='letter-btn' data-value='${l.toLowerCase()}' onclick='toggleSelection(this)'>${l}</button>`
        ).join(" ");
        container.appendChild(wrapper);
    }
}

function createCategoryButtons() {
    if (!wordsData || !Array.isArray(wordsData)) return;

    let primaryCategories = [...new Set(wordsData.map(w => (w["分類"] && w["分類"][0]) || "未分類"))];
    
    const primaryContainer = document.getElementById("primaryCategoryButtons");
    if (primaryContainer) {
        primaryContainer.innerHTML = '';
        const wrapper = document.createElement('div');
        wrapper.className = 'button-wrapper';
        
        primaryCategories.forEach(category => {
            const btn = document.createElement('button');
            btn.className = 'letter-btn';
            btn.textContent = category;
            btn.dataset.value = category;
            // ▼▼▼ 修改 onclick 事件 ▼▼▼
            btn.onclick = () => handlePrimaryCategoryClick(btn, category);
            wrapper.appendChild(btn);
        });
        
        primaryContainer.appendChild(wrapper);
    }

    const specialCategories = [
        { name: "Checked 單字", value: "checked" },
        { name: "重要單字", value: "important" },
        { name: "錯誤單字", value: "wrong" },
        { name: "Note單字", value: "note" }
    ];
    const specialContainer = document.getElementById("specialCategoryButtons");
    if (specialContainer) {
         specialContainer.innerHTML = '';
         const wrapper = document.createElement('div');
         wrapper.className = 'button-wrapper';
         wrapper.innerHTML = specialCategories.map(c => 
            `<button class='letter-btn' data-value='${c.value}' onclick='toggleSelection(this)'>${c.name}</button>`
         ).join(" ");
        specialContainer.appendChild(wrapper);
    }
}

function createLevelButtons() {
    if (!wordsData || !Array.isArray(wordsData)) return;
    let levels = [...new Set(wordsData.map(w => w["等級"] || "未分類"))];
    const container = document.getElementById("levelButtonsContent");
    if (container) {
        const wrapper = document.createElement('div');
        wrapper.className = 'button-wrapper';
        wrapper.innerHTML = levels
            .map(l => `<button class='letter-btn' data-value='${l}' onclick='toggleSelection(this)'>${l}</button>`)
            .join(" ");
        container.appendChild(wrapper);
    }
}

// ▼▼▼ 修改此函式以處理「未分類」的篩選 ▼▼▼
function startLearning() {
    const selectedLetters = Array.from(document.querySelectorAll('#alphabetButtons .letter-btn.selected')).map(btn => btn.dataset.value);
    const selectedPrimaries = Array.from(document.querySelectorAll('#primaryCategoryButtons > .button-wrapper > .letter-btn.selected')).map(btn => btn.dataset.value);
    const selectedSecondaries = Array.from(document.querySelectorAll('.subcategory-wrapper .letter-btn.selected')).map(btn => btn.dataset.value);
    const selectedLevels = Array.from(document.querySelectorAll('#levelButtonsContent .letter-btn.selected')).map(btn => btn.dataset.value);
    const selectedSpecials = Array.from(document.querySelectorAll('#specialCategoryButtons .letter-btn.selected')).map(btn => btn.dataset.value);
    
    let filteredWords = wordsData;

    if (selectedLetters.length > 0) {
        filteredWords = filteredWords.filter(w => {
            const word = w.Words || w.word || w["單字"] || "";
            return word && selectedLetters.includes(word.charAt(0).toLowerCase());
        });
    }
    
    if (selectedPrimaries.length > 0) {
        filteredWords = filteredWords.filter(w => {
            const primaryCat = (w["分類"] && w["分類"][0]) || "未分類";
            return selectedPrimaries.includes(primaryCat);
        });
    }

    if (selectedSecondaries.length > 0) {
        filteredWords = filteredWords.filter(w => {
            // 如果一個單字的主分類沒有被選中，那麼它的次分類也不應該被匹配
            // （除非使用者根本沒有篩選主分類）
            const primaryCat = (w["分類"] && w["分類"][0]) || "未分類";
            if (selectedPrimaries.length > 0 && !selectedPrimaries.includes(primaryCat)) {
                return false;
            }
            
            const secondaryCat = (w["分類"] && w["分類"][1]) || "未分類"; // 將空次分類視為 "未分類"
            return selectedSecondaries.includes(secondaryCat);
        });
    }
    
    if (selectedLevels.length > 0) {
        filteredWords = filteredWords.filter(w => {
            const level = w["等級"] || "未分類";
            return selectedLevels.includes(level);
        });
    }
    
    if (selectedSpecials.length > 0) {
        const specialWordsSet = new Set();

        selectedSpecials.forEach(specialType => {
            switch (specialType) {
                case 'checked':
                    Object.keys(localStorage)
                        .filter(key => key.startsWith("checked_") && !key.startsWith("checked_sentence_"))
                        .forEach(key => specialWordsSet.add(key.replace("checked_", "")));
                    break;
                case 'important':
                     Object.keys(localStorage)
                        .filter(key => key.startsWith("important_") && !key.startsWith("important_sentence_"))
                        .forEach(key => specialWordsSet.add(key.replace("important_", "")));
                    break;
                case 'wrong':
                    (JSON.parse(localStorage.getItem("wrongWords")) || [])
                        .forEach(word => specialWordsSet.add(word));
                    break;
                case 'note':
                    Object.keys(localStorage)
                        .filter(key => key.startsWith("note_") && !key.startsWith("note_sentence_") && localStorage.getItem(key)?.trim() !== "")
                        .forEach(key => specialWordsSet.add(key.replace("note_", "")));
                    break;
            }
        });

        filteredWords = filteredWords.filter(w => {
            const wordText = w.Words || w.word || w["單字"] || "";
            return specialWordsSet.has(wordText);
        });
    }

    if (filteredWords.length === 0) {
        showNotification("⚠️ 找不到符合條件的單字。", "error");
        return;
    }

    displayWordList(filteredWords, "學習列表");
}
// ▲▲▲ 修改結束 ▲▲▲

function displayWordList(words, title) {
    document.getElementById("wordListTitle").innerText = title;
    document.getElementById("wordListTitle").style.display = "block";
    
    document.getElementById("mainPageContainer").style.display = "none";
    document.getElementById("autoPlayBtn").style.display = "block";
    
    let listContainer = document.getElementById("wordList");
    let wordItems = document.getElementById("wordItems");
    wordItems.innerHTML = "";

    window.currentWordList = words;
    
    if (words.length === 0) {
        wordItems.innerHTML = "<p>⚠️ 沒有符合的單字</p>";
    } else {
        words.forEach(word => {
            let wordText = word.Words || word.word || word["單字"];
            let isChecked = localStorage.getItem(`checked_${wordText}`) === "true";
            let isImportant = localStorage.getItem(`important_${wordText}`) === "true";
            let iconSrc = isChecked ? "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/checked-icon.svg" : "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/check-icon.svg";

            let item = document.createElement('div');
            item.className = 'word-item-container';
            if (isChecked) item.classList.add("checked");

            item.innerHTML = `
                <input type='checkbox' class='important-checkbox' onchange='toggleImportant("${wordText}", this)' ${isImportant ? "checked" : ""}>
                <p class='word-item' data-word="${wordText}">${wordText}</p>
                <button class='play-word-btn' onclick='playSingleWord(event, "${wordText}")'>
                    <img src="https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/play.svg" alt="Play">
                </button>
                <button class='check-button' onclick='toggleCheck("${wordText}", this)'>
                    <img src="${iconSrc}" class="check-icon" alt="Check" width="24" height="24">
                </button>
            `;
            wordItems.appendChild(item);
        });
    }
    
    listContainer.style.display = "block";
    document.getElementById("wordDetails").style.display = "none";

    setTimeout(() => {
        document.querySelectorAll(".word-item").forEach(button => {
            button.addEventListener("click", function () {
                let wordText = this.dataset.word.trim();
                let wordObj = wordsData.find(w => (w.Words || w.word || w["單字"]).trim().toLowerCase() === wordText.toLowerCase());
                if (wordObj) showDetails(wordObj);
            });
        });
    }, 300);

    lastWordListType = "custom_selection";
}

// ... (其他函式保持不變) ...
function backToFirstLayer() {
    document.getElementById("mainPageContainer").style.display = "block";
    document.getElementById("wordList").style.display = "none";
    document.getElementById("wordDetails").style.display = "none";
    document.getElementById("wordItems").innerHTML = "";
    document.getElementById("wordListTitle").style.display = "none";
    document.getElementById("searchInput").value = "";
    document.getElementById("autoPlayBtn").style.display = "none";

    let searchResults = document.getElementById("searchResults");
    if (searchResults) {
        searchResults.style.display = "block";
        searchResults.innerHTML = "";
    }

    historyStack = [];
    lastWordListType = "";
    lastWordListValue = "";
}

function backToWordList() {
    if (isAutoPlaying) {
        isAutoPlaying = false;
        isPaused = false;
        if (sentenceAudio && sentenceAudio.readyState >= 2) sentenceAudio.pause();
        updateAutoPlayButton();
    }
    backToFirstLayer();
}

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

function toggleAutoPlay() {
    if (document.getElementById("wordList").style.display === "block") {
        if (!isAutoPlaying) startListAutoPlay();
        else if (!isPaused) pauseAutoPlay();
        else resumeAutoPlay();
    } else if (document.getElementById("wordDetails").style.display === "block") {
        if (!isAutoPlaying) startAutoPlay();
        else if (!isPaused) pauseAutoPlay();
        else resumeAutoPlay();
    }
    updateAutoPlayButton();
}

function startListAutoPlay() {
    if (!window.currentWordList || window.currentWordList.length === 0) {
        alert("單字列表為空，無法播放！");
        return;
    }
    isAutoPlaying = true;
    isPaused = false;
    if (typeof window.currentIndex === 'undefined' || window.currentIndex >= window.currentWordList.length) {
        window.currentIndex = 0;
    }
    let testAudio = new Audio();
    testAudio.play().catch(() => {
        alert("請先手動點擊頁面以啟用自動播放（瀏覽器限制）");
        isAutoPlaying = false;
        updateAutoPlayButton();
    });
    playNextWord();
}

function playSingleWord(event, wordText) {
    event.stopPropagation();
    if (isAutoPlaying) {
        isAutoPlaying = false;
        isPaused = false;
        updateAutoPlayButton();
    }
    if (currentAudio && !currentAudio.paused) currentAudio.pause();
    const wordIndex = window.currentWordList.findIndex(w => (w.Words || w.word || w["單字"]).trim().toLowerCase() === wordText.trim().toLowerCase());
    if (wordIndex === -1) return;
    window.currentIndex = wordIndex;
    highlightWord(wordText);
    const audioFile = `${encodeURIComponent(wordText)}.mp3`;
    currentAudio.src = `https://github.com/BoydYang-Designer/English-vocabulary/raw/main/audio_files/${audioFile}`;
    currentAudio.play().catch(err => removeHighlight(wordText));
    currentAudio.onended = () => removeHighlight(wordText);
}

function playNextWord() {
    if (window.currentIndex >= window.currentWordList.length) {
        isAutoPlaying = false;
        updateAutoPlayButton();
        return;
    }
    let wordObj = window.currentWordList[window.currentIndex];
    let wordText = (wordObj.Words || wordObj.word || wordObj["單字"] || "").trim();
    highlightWord(wordText);
    const itemElement = document.querySelector(`.word-item[data-word="${wordText}"]`)?.closest('.word-item-container');
    if (itemElement) {
        itemElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    currentAudio.src = `https://github.com/BoydYang-Designer/English-vocabulary/raw/main/audio_files/${encodeURIComponent(wordText)}.mp3`;
    let retryCount = 0;
    const maxRetries = 2;
    function attemptPlay() {
        currentAudio.play().then(() => {
            currentAudio.onended = () => {
                removeHighlight(wordText);
                if (!isPaused && isAutoPlaying) setTimeout(proceedToNextWord, 500);
            };
        }).catch(err => {
            retryCount++;
            if (retryCount <= maxRetries) setTimeout(attemptPlay, 1000);
            else proceedToNextWord();
        });
    }
    attemptPlay();
}

function proceedToNextWord() {
    window.currentIndex++;
    if (isAutoPlaying && !isPaused) playNextWord();
}

function highlightWord(wordText) {
    const currentActive = document.querySelector('.word-item-container.playing');
    if (currentActive) currentActive.classList.remove('playing');
    const item = document.querySelector(`.word-item[data-word="${wordText}"]`)?.closest('.word-item-container');
    if (item) item.classList.add('playing');
}

function removeHighlight(wordText) {
    const item = document.querySelector(`.word-item[data-word="${wordText}"]`)?.closest('.word-item-container');
    if (item) item.classList.remove('playing');
}

function startAutoPlay() {
    if (!window.currentWordList || window.currentWordList.length === 0) {
        alert("請先選擇一個單字列表再啟動自動播放！");
        return;
    }
    if (window.currentIndex >= 0 && window.currentIndex < window.currentWordList.length) {
        isAutoPlaying = true;
        isPaused = false;
        showDetails(window.currentWordList[window.currentIndex]);
    } else {
        window.currentIndex = 0;
        isAutoPlaying = true;
        isPaused = false;
        showDetails(window.currentWordList[window.currentIndex]);
    }
    updateAutoPlayButton();
}

function pauseAutoPlay() {
    isPaused = true;
    if (document.getElementById("wordList").style.display === "block") {
        if (currentAudio && !currentAudio.paused) {
            currentAudio.pause();
        }
    } else if (sentenceAudio && sentenceAudio.readyState >= 2) {
        sentenceAudio.pause();
    }
    updateAutoPlayButton();
}

function resumeAutoPlay() {
    isPaused = false;
    if (document.getElementById("wordList").style.display === "block") {
        playNextWord();
    } else if (sentenceAudio && sentenceAudio.readyState >= 2) {
        sentenceAudio.play().catch(err => console.error("🔊 播放失敗:", err));
    }
    updateAutoPlayButton();
}

function toggleCheck(word, button) {
    let isChecked = localStorage.getItem(`checked_${word}`) === "true";
    let icon = button.querySelector("img");
    let wordItemContainer = button.closest(".word-item-container");
    if (isChecked) {
        localStorage.removeItem(`checked_${word}`);
        icon.src = "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/check-icon.svg";
        wordItemContainer.classList.remove("checked");
    } else {
        localStorage.setItem(`checked_${word}`, "true");
        icon.src = "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/checked-icon.svg";
        wordItemContainer.classList.add("checked");
    }
}

function createWordVariationsRegex(baseWord) {
    let stem = baseWord.toLowerCase();
    let pattern;
    if (stem.endsWith('e')) {
        stem = stem.slice(0, -1);
        pattern = `\\b${stem}(e|es|ed|ing)\\b`;
    } else if (stem.endsWith('y')) {
        stem = stem.slice(0, -1);
        pattern = `\\b${stem}(y|ies|ied|ier|iest|ying)\\b`;
    } else {
        pattern = `\\b${stem}(s|es|ed|ing)?\\b`;
    }
    return new RegExp(pattern, 'gi');
}

function showDetails(word) {
    let bButton = document.getElementById("bButton");
    let params = new URLSearchParams(window.location.search);
    lastSentenceListWord = word.Words;
    document.getElementById("autoPlayBtn").style.display = "none";
    if (document.getElementById("searchInputDetails").value.trim() !== "" || params.get('from') === "sentence") {
        bButton.disabled = false;
        bButton.style.backgroundColor = "#6c757d";
    }
    navigateTo({ page: "wordDetails", word: word });
    document.getElementById("mainPageContainer").style.display = "none";
    document.getElementById("wordList").style.display = "none";
    document.getElementById("wordDetails").style.display = "block";
    window.currentIndex = window.currentWordList.findIndex(w => (w.Words || w.word || w["單字"] || "").trim().toLowerCase() === (word.Words || word.word || word["單字"] || "").trim().toLowerCase());
    document.getElementById("searchInputDetails").value = "";
    document.getElementById("searchResultsDetails").innerHTML = "";
    let audioControls = document.querySelector(".audio-controls");
    if (audioControls) audioControls.style.display = "flex";
    let playButton = document.getElementById("playAudioBtn");
    if (playButton) {
        let audioFile = `${encodeURIComponent(word.Words)} - sentence.mp3`;
        playButton.setAttribute("onclick", `playSentenceAudio("${audioFile}")`);
        playButton.classList.remove("playing");
    }
    let pauseButton = document.getElementById("pauseResumeBtn");
    if (pauseButton) {
        pauseButton.classList.remove("playing");
        pauseButton.innerHTML = `<img src="https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/play-circle.svg" alt="Play" width="24" height="24" />`;
    }
    let phonetics = `<div class="phonetics-container" style="display: flex; align-items: center; gap: 10px;">
        <input type='checkbox' class='important-checkbox' onchange='toggleImportant("${word.Words}", this)' ${localStorage.getItem(`important_${word.Words}`) === "true" ? "checked" : ""}>
        <div id="wordTitle" style="font-size: 20px; font-weight: bold;">${word.Words}</div>`;
    if (word["pronunciation-1"]) phonetics += `<button class='button' onclick='playAudio("${encodeURIComponent(word.Words)}.mp3")'>${word["pronunciation-1"]}</button>`;
    if (word["pronunciation-2"]) phonetics += `<button class='button' onclick='playAudio("${encodeURIComponent(word.Words)}-2.mp3")'>${word["pronunciation-2"]}</button>`;
    phonetics += `</div>`;
    let displayTagsHTML = '';
    const level = word["等級"];
    const categories = word["分類"];
    if (level) displayTagsHTML += `<span class="level-tag">${level}</span>`;
    if (categories && Array.isArray(categories) && categories.length > 0) {
        displayTagsHTML += categories.map(cat => `<span class="category-tag">${cat}</span>`).join('');
    }
    let finalDisplayHTML = displayTagsHTML ? `<div class="category-display">${displayTagsHTML}</div>` : '';
    let formattedChinese = word["traditional Chinese"].replace(/(\d+)\./g, "<br><strong>$1.</strong> ").replace(/\s*([nN]\.|[vV]\.|[aA][dD][jJ]\.|[aA][dD][vV]\.|[pP][rR][eE][pP]\.|[cC][oO][nN][jJ]\.|[pP][rR][oO][nN]\.|[iI][nN][tT]\.)/g, "<br>$1 ").replace(/^<br>/, "");
    let chinese = `${finalDisplayHTML}<div>${formattedChinese}</div>`;
    let rawMeaning = word["English meaning"];
    let formattedMeaning = rawMeaning.replace(/^Summary:?/gim, "<h3>Summary</h3>").replace(/Related Words:/gi, "<h3>Related Words:</h3>").replace(/Antonyms:/gi, "<h3>Antonyms:</h3>");
    formattedMeaning = formattedMeaning.replace(/\n(\d+\.)/g, '</p><h4 class="meaning-number">$1</h4><p>');
    formattedMeaning = formattedMeaning.replace(/\n(E\.g\.|Example):/gi, '</p><p class="example"><strong>$1:</strong>');
    formattedMeaning = formattedMeaning.replace(/\n/g, "<br>");
    let meaning = `<div><p>${formattedMeaning.trim()}</p></div>`;
    meaning = meaning.replace(/<p><\/p>/g, '');
    const highlightRegex = createWordVariationsRegex(word.Words);
    meaning = meaning.replace(highlightRegex, match => `<span class="highlight-word">${match}</span>`);
    document.getElementById("phoneticContainer").innerHTML = phonetics;
    document.getElementById("chineseContainer").innerHTML = chinese;
    document.getElementById("meaningContainer").innerHTML = meaning;
    document.getElementById("wordTitle").textContent = word.Words;
    displayNote();
    updateBackButton();
    if (isAutoPlaying && !isPaused) playAudioSequentially(word);
}

function playAudioSequentially(word) {
    let phoneticAudio = new Audio(`https://github.com/BoydYang-Designer/English-vocabulary/raw/main/audio_files/${encodeURIComponent(word.Words)}.mp3`);
    sentenceAudio = new Audio(`https://github.com/BoydYang-Designer/English-vocabulary/raw/main/audio_files/${encodeURIComponent(word.Words)} - sentence.mp3`);
    document.getElementById('meaningContainer').scrollTop = 0;
    let playBtn = document.getElementById("playAudioBtn");
    let pauseBtn = document.getElementById("pauseResumeBtn");
    if (playBtn) playBtn.classList.add("playing");
    if (pauseBtn) {
        pauseBtn.innerHTML = `<img src="https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/pause.svg" alt="Pause" width="24" height="24" />`;
        pauseBtn.classList.remove("playing");
    }
    phoneticAudio.play().then(() => new Promise(resolve => {
        phoneticAudio.onended = resolve;
        if (isPaused) { phoneticAudio.pause(); resolve(); }
    })).then(() => {
        if (!isPaused) {
            sentenceAudio.play().then(() => new Promise(resolve => {
                sentenceAudio.addEventListener('timeupdate', handleAutoScroll);
                sentenceAudio.onended = () => {
                    sentenceAudio.removeEventListener('timeupdate', handleAutoScroll);
                    if (playBtn) playBtn.classList.remove("playing");
                    if (pauseBtn) {
                        pauseBtn.innerHTML = `<img src="https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/play-circle.svg" alt="Play" width="24" height="24" />`;
                        pauseBtn.classList.add("playing");
                    }
                    resolve();
                };
                if (isPaused) {
                    sentenceAudio.pause();
                    sentenceAudio.removeEventListener('timeupdate', handleAutoScroll);
                    resolve();
                }
            })).then(() => {
                if (isAutoPlaying && !isPaused) {
                    window.currentIndex++;
                    if (window.currentIndex < window.currentWordList.length) showDetails(window.currentWordList[window.currentIndex]);
                    else isAutoPlaying = false;
                    updateAutoPlayButton();
                }
            });
        }
    }).catch(err => {
        if (isAutoPlaying && !isPaused) {
            window.currentIndex++;
            if (window.currentIndex < window.currentWordList.length) showDetails(window.currentWordList[window.currentIndex]);
            else isAutoPlaying = false;
            updateAutoPlayButton();
        }
    });
}

function getFromPage() {
    return new URLSearchParams(window.location.search).get('from');
}

function updateAutoPlayButton() {
    let autoPlayBtn = document.getElementById("autoPlayBtn");
    let autoPlayDetailsBtn = document.getElementById("autoPlayDetailsBtn");
    if (document.getElementById("wordList").style.display === "block") {
        if (autoPlayBtn) {
            autoPlayBtn.textContent = isAutoPlaying ? (isPaused ? "繼續播放" : "停止播放") : "單字自動播放";
            autoPlayBtn.classList.toggle("playing", isAutoPlaying);
        }
    } else if (document.getElementById("wordDetails").style.display === "block") {
        if (autoPlayDetailsBtn) {
            autoPlayDetailsBtn.textContent = isAutoPlaying ? (isPaused ? "繼續自動撥放內文" : "暫停撥放") : "內文自動播放";
            autoPlayDetailsBtn.classList.toggle("playing", isAutoPlaying);
        }
    }
}

function updateBackButton() {
    let fromPage = getFromPage();
    document.querySelectorAll('#wordDetails .button').forEach(button => {
        if (button.textContent.trim() === 'Back') {
            button.onclick = fromPage === 'quiz' ? returnToQuiz : backToWordList;
        }
    });
}

function returnToQuiz() {
    window.location.href = 'quiz.html?returning=true';
}

function playAudio(filename) {
    new Audio("https://github.com/BoydYang-Designer/English-vocabulary/raw/main/audio_files/" + filename).play();
}

function playSentenceAudio(audioFile) {
    isAutoPlaying = false;
    isPaused = false;
    updateAutoPlayButton();
    if (sentenceAudio && !sentenceAudio.paused) {
        sentenceAudio.pause();
        sentenceAudio.currentTime = 0;
        sentenceAudio.removeEventListener('timeupdate', handleAutoScroll);
    }
    document.getElementById('meaningContainer').scrollTop = 0;
    sentenceAudio = new Audio(`https://github.com/BoydYang-Designer/English-vocabulary/raw/main/audio_files/${audioFile}`);
    sentenceAudio.play().then(() => {
        sentenceAudio.addEventListener('timeupdate', handleAutoScroll);
        let playBtn = document.getElementById("playAudioBtn");
        let pauseBtn = document.getElementById("pauseResumeBtn");
        if (playBtn) playBtn.classList.add("playing");
        if (pauseBtn) {
            pauseBtn.innerHTML = `<img src="https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/pause.svg" alt="Pause" width="24" height="24" />`;
            pauseBtn.classList.remove("playing");
        }
        sentenceAudio.onended = () => {
            sentenceAudio.removeEventListener('timeupdate', handleAutoScroll);
            if (playBtn) playBtn.classList.remove("playing");
            if (pauseBtn) {
                pauseBtn.innerHTML = `<img src="https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/play-circle.svg" alt="Play" width="24" height="24" />`;
                pauseBtn.classList.add("playing");
            }
        };
    }).catch(err => console.error("❌ 音檔播放失敗:", err));
}

function togglePauseAudio(button) {
    const playBtn = document.getElementById("playAudioBtn");
    const pauseBtn = button;
    if (sentenceAudio.paused || sentenceAudio.ended) {
        sentenceAudio.play().then(() => {
            if (playBtn) playBtn.classList.add("playing");
            if (pauseBtn) pauseBtn.classList.remove("playing");
            pauseBtn.innerHTML = `<img src="https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/pause.svg" alt="Pause" width="24" height="24" />`;
        });
    } else {
        sentenceAudio.pause();
        if (playBtn) playBtn.classList.remove("playing");
        if (pauseBtn) pauseBtn.classList.add("playing");
        pauseBtn.innerHTML = `<img src="https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/play-circle.svg" alt="Play" width="24" height="24" />`;
    }
}

function adjustAudioTime(seconds) {
    sentenceAudio.currentTime = Math.max(0, sentenceAudio.currentTime + seconds);
}

function backToPrevious() {
    let params = new URLSearchParams(window.location.search);
    if (params.get('from') === "sentence" && params.get('sentenceId')) {
        window.location.href = `sentence.html?sentence=${encodeURIComponent(params.get('sentenceId'))}&layer=4`;
    } else if (historyStack.length > 1) {
        historyStack.pop();
        let previousState = historyStack[historyStack.length - 1];
        if (previousState.page === "wordDetails") showDetails(previousState.word);
    }
    if (historyStack.length <= 1) {
        let bButton = document.getElementById("bButton");
        bButton.disabled = true;
        bButton.style.backgroundColor = "#ccc";
    }
}

function toggleImportant(word, checkbox) {
    if (checkbox.checked) localStorage.setItem(`important_${word}`, "true");
    else localStorage.removeItem(`important_${word}`);
}

function saveNote() {
    let word = document.getElementById("wordTitle")?.textContent.trim();
    let noteTextArea = document.getElementById("wordNote");
    let note = noteTextArea.value.trim();
    if (word) {
        if (note.length > 0) localStorage.setItem(`note_${word}`, note);
        else localStorage.removeItem(`note_${word}`);
        showNotification(note.length > 0 ? "✅ 筆記已儲存！" : "🗑️ 筆記已刪除！", 'success');
        if (lastWordListType === "noteWords") showNoteWords();
    }
}

function displayNote() {
    let word = document.getElementById("wordTitle")?.textContent.trim();
    if (word) {
        document.getElementById("wordNote").value = localStorage.getItem(`note_${word}`) || "";
    }
}

document.addEventListener("keydown", function (event) {
    if (!sentenceAudio || isNaN(sentenceAudio.duration) || document.activeElement === document.getElementById("wordNote")) return;
    switch (event.code) {
        case "Space":
            event.preventDefault();
            if (sentenceAudio.paused || sentenceAudio.ended) sentenceAudio.play();
            else sentenceAudio.pause();
            break;
        case "ArrowRight":
            sentenceAudio.currentTime = Math.min(sentenceAudio.duration, sentenceAudio.currentTime + 5);
            break;
        case "ArrowLeft":
            sentenceAudio.currentTime = Math.max(0, sentenceAudio.currentTime - 5);
            break;
    }
});

function exportAllData() {
    try {
        const structuredData = { progress: {}, userContent: {}, quizHistory: {}, uncategorized: {} };
        // ... (這裡應有您完整的匯出邏輯)
        const jsonString = JSON.stringify(structuredData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "my_english_learning_backup.json";
        a.click();
        URL.revokeObjectURL(url);
        showNotification("✅ 學習資料已成功匯出！", "success");
    } catch (error) {
        showNotification("❌ 資料匯出失敗！", "error");
    }
}

function importAllData() {
    let input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = e => {
        let file = e.target.files[0];
        if (!file) return;
        let reader = new FileReader();
        reader.onload = event => {
            try {
                const data = JSON.parse(event.target.result);
                localStorage.clear();
                // ... (這裡應有您完整的匯入邏輯)
                showNotification("✅ 學習資料已成功匯入！", "success");
                setTimeout(() => location.reload(), 1000);
            } catch (error) {
                showNotification("❌ 檔案匯入失敗，格式不正確。", "error");
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function displayWordDetailsFromURL() {
    let wordName = new URLSearchParams(window.location.search).get('word');
    if (!wordName || !wordsData || wordsData.length === 0) return;
    let wordData = wordsData.find(w => (w.Words || w.word || w["單字"]).toLowerCase() === wordName.toLowerCase());
    if (wordData) {
        showDetails(wordData);
    }
}

function handleAutoScroll() {
    const container = document.getElementById('meaningContainer');
    if (!sentenceAudio || isNaN(sentenceAudio.duration) || sentenceAudio.duration === 0) return;
    const scrollableHeight = container.scrollHeight - container.clientHeight;
    const scrollPosition = (sentenceAudio.currentTime / sentenceAudio.duration) * scrollableHeight;
    container.scrollTo({ top: scrollPosition, behavior: 'smooth' });
}