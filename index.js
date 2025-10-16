// index.js

// These variables are specific to the index page logic
let wordsData = [];
let sentenceAudio = new Audio();
let lastWordListType = "";
let lastWordListValue = "";
let lastSentenceListWord = "";
let isAutoPlaying = false;
let isPaused = false;
let currentAudio = new Audio();
window.currentWordList = [];
let historyStack = [];

// This function shows the main app view
function showAppView(user) {
    const loginView = document.getElementById('login-view');
    const appContainer = document.getElementById('app-container');
    if (loginView) loginView.classList.add('is-hidden');
    if (appContainer) appContainer.classList.remove('is-hidden');

    const isGuest = !user;
    const userInfoEl = document.getElementById('user-info');
    const signOutBtn = document.getElementById('sign-out-btn');
    const signInFromGuestBtn = document.getElementById('sign-in-from-guest-btn');

    if (!isGuest) {
        userInfoEl.textContent = `Welcome, ${user.displayName || user.email}`;
        signOutBtn.classList.remove('is-hidden');
        signInFromGuestBtn.classList.add('is-hidden');
    } else {
        userInfoEl.textContent = 'Guest Mode';
        signOutBtn.classList.add('is-hidden');
        signInFromGuestBtn.classList.remove('is-hidden');
    }
    backToFirstLayer();
}

// Main app logic for the index page
function initializeAppLogic() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
        loadingOverlay.style.opacity = '1';
    }

    return Promise.all([
        fetch("https://boydyang-designer.github.io/English-vocabulary/audio_files/Z_total_words.json")
            .then(res => {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res.json();
            })
    ])
    .then(([wordsJsonData]) => {
        wordsData = wordsJsonData["New Words"] || [];
        console.log("✅ Z_total_words.json loaded successfully");

        wordsData.forEach(w => {
            if (typeof w["分類"] === "string") w["分類"] = [w["分類"]];
            else if (!Array.isArray(w["分類"])) w["分類"] = [];
        });

        createAlphabetButtons();
        createDomainButtons();
        createTopicButtons();
        createSourceButtons();
        createSpecialCategoryButtons();
        createLevelButtons();
        
        console.log("✅ Buttons created successfully");
        showNotification('✅ Word data loaded!', 'success');
        displayWordDetailsFromURL();
    })
    .catch(err => {
        console.error("❌ Error during data loading:", err);
        showNotification('❌ Failed to load data. Please check network or file path.', 'error');
    })
    .finally(() => {
        if (loadingOverlay) {
            loadingOverlay.style.opacity = '0';
            setTimeout(() => { loadingOverlay.style.display = 'none'; }, 500);
        }
    });
}

// Listen for the 'auth-ready' event from auth-manager.js
document.addEventListener('auth-ready', function(event) {
    console.log('Auth is ready on index.html. User:', event.detail.user);
    const { user } = event.detail;
    
    // Show the correct view (app or login)
    showAppView(user);
    
    // Initialize the main application logic
    initializeAppLogic();
});


document.addEventListener("DOMContentLoaded", function () {
    // --- Bind login/logout button events ---
    const googleSigninBtn = document.getElementById('google-signin-btn');
    const guestModeBtn = document.getElementById('guest-mode-btn');
    const signOutBtn = document.getElementById('sign-out-btn');
    const signInFromGuestBtn = document.getElementById('sign-in-from-guest-btn');

    if (googleSigninBtn) googleSigninBtn.addEventListener('click', signIn);
    if (guestModeBtn) guestModeBtn.addEventListener('click', enterGuestMode);
    if (signOutBtn) signOutBtn.addEventListener('click', signOutUser);
    if (signInFromGuestBtn) signInFromGuestBtn.addEventListener('click', signIn);

    // --- Other page-specific event bindings ---
    enableWordCopyOnClick();

    const sentenceButton = document.getElementById("sentencePageBtn");
    if (sentenceButton) sentenceButton.addEventListener("click", () => window.location.href = "sentence.html");

    const quizButton = document.getElementById("startQuizBtn");
    if (quizButton) quizButton.addEventListener("click", () => window.location.href = "quiz.html?show=sentenceCategories&from=index");

    const startLearningButton = document.getElementById("startLearningBtn");
    if (startLearningButton) startLearningButton.addEventListener("click", startLearning);
    
document.querySelectorAll(".collapsible-header").forEach(button => {
    button.addEventListener("click", function() {
        this.classList.toggle("active");
        const content = this.nextElementSibling;

        // 檢查是否正在展開
        if (this.classList.contains('active')) {
            // 如果是展開，設定 max-height 以觸發 CSS transition 動畫
            content.style.maxHeight = content.scrollHeight + "px";

            // 檢查內容實際高度是否超過 CSS 設定的 250px
            if (content.scrollHeight > 250) {
                // 如果超過，短暫延遲後讓 CSS 的 max-height: 250px 生效
                setTimeout(() => {
                    content.style.maxHeight = '250px'; 
                }, 10); // 延遲時間很短，使用者幾乎無感
            }
        } else {
            // 如果是收合，清除 max-height
            content.style.maxHeight = null;
        }
    });
});
});

// --- ALL THE OTHER FUNCTIONS from your original index.js go here ---

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

function updateCollapsibleHeaderState(btn) {
    const contentWrapper = btn.closest('.collapsible-content');
    if (!contentWrapper) return;
    const header = contentWrapper.previousElementSibling;
    if (!header || !header.classList.contains('collapsible-header')) return;
    const hasSelectedChildren = contentWrapper.querySelector('.letter-btn.selected') !== null;
    if (hasSelectedChildren) {
        header.classList.add('header-highlight');
    } else {
        header.classList.remove('header-highlight');
    }
}

function toggleSelection(btn) {
    btn.classList.toggle('selected');
}

function toggleAndCheckHeader(btn) {
    toggleSelection(btn);
    updateCollapsibleHeaderState(btn);
}

function handleGlobalTopicClick(btn) {
    toggleSelection(btn);
    updateCollapsibleHeaderState(btn);
    const topicValue = btn.dataset.value;
    const isSelected = btn.classList.contains('selected');
    const nestedTopicBtns = document.querySelectorAll(`.subcategory-wrapper .letter-btn[data-value="${topicValue}"]`);
    nestedTopicBtns.forEach(nestedBtn => {
        nestedBtn.classList.toggle('selected', isSelected);
        updateDomainButtonState(nestedBtn);
    });
}

function handleNestedTopicClick(btn) {
    toggleSelection(btn);
    updateDomainButtonState(btn);
    const topicValue = btn.dataset.value;
    const isSelected = btn.classList.contains('selected');
    const globalTopicBtn = document.querySelector(`#topicCategoryButtons .letter-btn[data-value="${topicValue}"]`);
    if (globalTopicBtn) {
        globalTopicBtn.classList.toggle('selected', isSelected);
        updateCollapsibleHeaderState(globalTopicBtn);
    }
}

function updateDomainButtonState(nestedBtn) {
    const subcategoryWrapper = nestedBtn.closest('.subcategory-wrapper');
    if (!subcategoryWrapper) return;
    const domainBtn = subcategoryWrapper.previousElementSibling;
    if (!domainBtn || !domainBtn.classList.contains('letter-btn')) return;
    const hasSelectedSubcategories = subcategoryWrapper.querySelector('.letter-btn.selected') !== null;
    if (hasSelectedSubcategories) {
        domainBtn.classList.add('selected');
    } else {
        domainBtn.classList.remove('selected');
    }
    updateCollapsibleHeaderState(domainBtn);
}

function handleDomainClick(btn, domainName) {
    let parentContainer = btn.closest('.collapsible-content');
    let subcategoryWrapper = document.getElementById(`sub-for-${domainName.replace(/\s/g, '-')}`);
    if (!subcategoryWrapper) {
        subcategoryWrapper = document.createElement('div');
        subcategoryWrapper.className = 'subcategory-wrapper';
        subcategoryWrapper.id = `sub-for-${domainName.replace(/\s/g, '-')}`;
        const topics = [...new Set(
            wordsData
                .filter(w => w["分類"] && w["分類"][0] === domainName && w["分類"][1])
                .map(w => w["分類"][1])
        )];
        if (topics.length > 0) {
            const subWrapper = document.createElement('div');
            subWrapper.className = 'button-wrapper';
            subWrapper.innerHTML = topics.map(topic => {
                const globalTopicBtn = document.querySelector(`#topicCategoryButtons .letter-btn[data-value="${topic}"]`);
                const isSelectedClass = globalTopicBtn && globalTopicBtn.classList.contains('selected') ? 'selected' : '';
                return `<button class="letter-btn ${isSelectedClass}" data-value='${topic}' onclick="handleNestedTopicClick(this)">${topic}</button>`;
            }).join(' ');
            subcategoryWrapper.appendChild(subWrapper);
        }
        btn.parentNode.insertBefore(subcategoryWrapper, btn.nextSibling);
    }
    const mainCollapsibleContent = btn.closest('.collapsible-content');
    if (subcategoryWrapper.style.maxHeight && subcategoryWrapper.style.maxHeight !== '0px') {
        subcategoryWrapper.style.maxHeight = '0px';
    } else {
        subcategoryWrapper.style.maxHeight = subcategoryWrapper.scrollHeight + "px";
    }
    setTimeout(() => {
        if (mainCollapsibleContent.style.maxHeight !== '0px') {
             mainCollapsibleContent.style.maxHeight = mainCollapsibleContent.scrollHeight + "px";
        }
    }, 310);
}

function createAlphabetButtons() {
    const container = document.getElementById("alphabetButtons");
    if (container) {
        const wrapper = document.createElement('div');
        wrapper.className = 'button-wrapper';
        wrapper.innerHTML = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(l =>
            `<button class='letter-btn' data-value='${l.toLowerCase()}' onclick='toggleAndCheckHeader(this)'>${l}</button>`
        ).join(" ");
        container.appendChild(wrapper);
    }
}

function createDomainButtons() {
    if (!wordsData || !Array.isArray(wordsData)) return;
    let domains = [...new Set(wordsData.map(w => (w["分類"] && w["分類"][0]) || null).filter(Boolean))];
    const container = document.getElementById("domainCategoryButtons");
    if (container) {
        container.innerHTML = '';
        const wrapper = document.createElement('div');
        wrapper.className = 'button-wrapper';
        wrapper.innerHTML = domains.map(d => 
            `<button class='letter-btn' data-value='${d}' onclick="handleDomainClick(this, '${d}')">${d}</button>`
        ).join(" ");
        container.appendChild(wrapper);
    }
}

function createTopicButtons() {
    if (!wordsData || !Array.isArray(wordsData)) return;
    let topics = [...new Set(wordsData.map(w => (w["分類"] && w["分類"][1]) || null).filter(Boolean))];
    const container = document.getElementById("topicCategoryButtons");
    if (container) {
        container.innerHTML = '';
        const wrapper = document.createElement('div');
        wrapper.className = 'button-wrapper';
        wrapper.innerHTML = topics.map(t => 
            `<button class='letter-btn' data-value='${t}' onclick='handleGlobalTopicClick(this)'>${t}</button>`
        ).join(" ");
        container.appendChild(wrapper);
    }
}

function createSourceButtons() {
    if (!wordsData || !Array.isArray(wordsData)) return;
    let sources = [...new Set(wordsData.map(w => (w["分類"] && w["分類"][2]) || null).filter(Boolean))];
    const container = document.getElementById("sourceCategoryButtons");
    if (container) {
        container.innerHTML = '';
        const wrapper = document.createElement('div');
        wrapper.className = 'button-wrapper';
        wrapper.innerHTML = sources.map(s => 
            `<button class='letter-btn' data-value='${s}' onclick='toggleAndCheckHeader(this)'>${s}</button>`
        ).join(" ");
        container.appendChild(wrapper);
    }
}

function createSpecialCategoryButtons() {
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
            `<button class='letter-btn' data-value='${c.value}' onclick='toggleAndCheckHeader(this)'>${c.name}</button>`
         ).join(" ");
        specialContainer.appendChild(wrapper);
    }
}

function createLevelButtons() {
    if (!wordsData || !Array.isArray(wordsData)) return;
    let levels = [...new Set(
        wordsData.map(w => (w["等級"] || "未分類").toUpperCase().trim())
    )];
    const levelOrder = ["A1", "A2", "B1", "B2", "C1", "C2", "未分類"];
    levels.sort((a, b) => {
        const indexA = levelOrder.indexOf(a);
        const indexB = levelOrder.indexOf(b);
        return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });
    const container = document.getElementById("levelButtonsContent");
    if (container) {
        container.innerHTML = "";
        const wrapper = document.createElement('div');
        wrapper.className = 'button-wrapper';
        wrapper.innerHTML = levels
            .map(l => `<button class='letter-btn' data-value='${l}' onclick='toggleAndCheckHeader(this)'>${l}</button>`)
            .join(" ");
        container.appendChild(wrapper);
    }
}

function startLearning() {
    const selectedLetters = Array.from(document.querySelectorAll('#alphabetButtons .letter-btn.selected')).map(btn => btn.dataset.value);
    const selectedDomains = Array.from(document.querySelectorAll('#domainCategoryButtons > .button-wrapper > .letter-btn.selected')).map(btn => btn.dataset.value);
    const selectedTopics = Array.from(document.querySelectorAll('#topicCategoryButtons .letter-btn.selected')).map(btn => btn.dataset.value);
    const selectedSources = Array.from(document.querySelectorAll('#sourceCategoryButtons .letter-btn.selected')).map(btn => btn.dataset.value);
    const selectedLevels = Array.from(document.querySelectorAll('#levelButtonsContent .letter-btn.selected')).map(btn => btn.dataset.value);
    const selectedSpecials = Array.from(document.querySelectorAll('#specialCategoryButtons .letter-btn.selected')).map(btn => btn.dataset.value);
    
    let filteredWords = wordsData;

    if (selectedLetters.length > 0) {
        filteredWords = filteredWords.filter(w => {
            const word = w.Words || w.word || w["單字"] || "";
            return word && selectedLetters.includes(word.charAt(0).toLowerCase());
        });
    }
    
    if (selectedDomains.length > 0) {
        filteredWords = filteredWords.filter(w => {
            const domain = (w["分類"] && w["分類"][0]) || null;
            const topic = (w["分類"] && w["分類"][1]) || null;
            if (selectedTopics.length === 0) {
                return selectedDomains.includes(domain);
            }
            return selectedDomains.includes(domain) && selectedTopics.includes(topic);
        });
    } else if (selectedTopics.length > 0) {
         filteredWords = filteredWords.filter(w => {
            const topic = (w["分類"] && w["分類"][1]) || null;
            return selectedTopics.includes(topic);
        });
    }
    
    if (selectedSources.length > 0) {
        filteredWords = filteredWords.filter(w => {
            const source = (w["分類"] && w["分類"][2]) || null;
            return selectedSources.includes(source);
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
        const vocabularyData = window.getVocabularyData(); // Get data from auth-manager
        selectedSpecials.forEach(specialType => {
            switch (specialType) {
                case 'checked':
                    (vocabularyData.checkedWords || []).forEach(word => specialWordsSet.add(word));
                    break;
                case 'important':
                    (vocabularyData.importantWords || []).forEach(word => specialWordsSet.add(word));
                    break;
                case 'wrong':
                    (vocabularyData.wrongWords || []).forEach(word => specialWordsSet.add(word));
                    break;
                case 'note':
                    Object.keys(vocabularyData.notes || {}).forEach(word => specialWordsSet.add(word));
                    break;
            }
        });
        filteredWords = filteredWords.filter(w => {
            const wordText = w.Words || w.word || w["單字"] || "";
            return specialWordsSet.has(wordText);
        });
    }

    if (filteredWords.length === 0) {
        showNotification("⚠️ No matching words found.", "error");
        return;
    }
    displayWordList(filteredWords, "Learning List");
}

function displayWordList(words, title) {
    document.getElementById("wordListTitle").innerText = title;
    document.getElementById("wordListTitle").style.display = "block";
    document.getElementById("mainPageContainer").style.display = "none";
    document.getElementById("autoPlayBtn").style.display = "block";
    
    let listContainer = document.getElementById("wordList");
    let wordItems = document.getElementById("wordItems");
    wordItems.innerHTML = "";

    window.currentWordList = words;
    const vocabularyData = window.getVocabularyData(); // Get data from auth-manager
    
    if (words.length === 0) {
        wordItems.innerHTML = "<p>⚠️ No matching words</p>";
    } else {
        words.forEach(word => {
            let wordText = word.Words || word.word || word["單字"];
            let isChecked = (vocabularyData.checkedWords || []).includes(wordText);
            let isImportant = (vocabularyData.importantWords || []).includes(wordText);
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
        updateAutoPlayButton();
    }
    if (sentenceAudio && !sentenceAudio.paused) {
        sentenceAudio.pause();
        sentenceAudio.currentTime = 0;
    }

    document.getElementById("wordDetails").style.display = "none";
    document.getElementById("wordList").style.display = "block";
    document.getElementById("wordListTitle").style.display = "block";
    document.getElementById("autoPlayBtn").style.display = "block";
    document.getElementById("mainPageContainer").style.display = "none";
}

function navigateTo(state) {
    if (historyStack.length === 0 || historyStack[historyStack.length - 1].word !== state.word) {
        historyStack.push(state);
    }
    if (historyStack.length > 10) {
        historyStack.shift();
    }
    console.log("📌 Added to history:", historyStack);
}

function filterWords() {
    let input = document.getElementById("searchInput").value.toLowerCase();
    if (!wordsData || wordsData.length === 0) {
        console.error("❌ wordsData is empty, please check if JSON loaded successfully");
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
        : "<p>⚠️ No matching words</p>";

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
        console.error("❌ wordsData not loaded");
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
        searchResults.innerHTML = "<p>⚠️ No matching words</p>";
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
        alert("Word list is empty, cannot play!");
        return;
    }
    isAutoPlaying = true;
    isPaused = false;
    if (typeof window.currentIndex === 'undefined' || window.currentIndex >= window.currentWordList.length) {
        window.currentIndex = 0;
    }
    let testAudio = new Audio();
    testAudio.play().catch(() => {
        alert("Please click the page manually to enable autoplay (browser restriction)");
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
        alert("Please select a word list before starting autoplay!");
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
        sentenceAudio.play().catch(err => console.error("🔊 Playback failed:", err));
    }
    updateAutoPlayButton();
}

function toggleCheck(word, button) {
    const vocabularyData = window.getVocabularyData();
    if (!vocabularyData.checkedWords) vocabularyData.checkedWords = [];

    const isChecked = vocabularyData.checkedWords.includes(word);
    let icon = button.querySelector("img");
    let wordItemContainer = button.closest(".word-item-container");

    if (isChecked) {
        vocabularyData.checkedWords = vocabularyData.checkedWords.filter(w => w !== word);
        icon.src = "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/check-icon.svg";
        wordItemContainer.classList.remove("checked");
    } else {
        vocabularyData.checkedWords.push(word);
        icon.src = "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/checked-icon.svg";
        wordItemContainer.classList.add("checked");
    }
    window.setCheckedWords(vocabularyData.checkedWords);
    window.persistVocabularyData();
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
    } else if (stem.endsWith('l')) {
        pattern = `\\b${stem}(s|led|ling)?\\b`;
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
    
    const vocabularyData = window.getVocabularyData();
    const isImportant = (vocabularyData.importantWords || []).includes(word.Words);
    
    let phonetics = `<div class="phonetics-container" style="display: flex; align-items: center; gap: 10px;">
        <input type='checkbox' class='important-checkbox' onchange='toggleImportant("${word.Words}", this)' ${isImportant ? "checked" : ""}>
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
    let formattedChinese = (word["traditional Chinese"] || "").replace(/(\d+)\./g, "<br><strong>$1.</strong> ").replace(/\s*([nN]\.|[vV]\.|[aA][dD][jJ]\.|[aA][dD][vV]\.|[pP][rR][eE][pP]\.|[cC][oO][nN][jJ]\.|[pP][rR][oO][nN]\.|[iI][nN][tT]\.)/g, "<br>$1 ").replace(/^<br>/, "");
    let chinese = `${finalDisplayHTML}<div>${formattedChinese}</div>`;
    let rawMeaning = word["English meaning"] || "";
    let formattedMeaning = rawMeaning.replace(/^Summary:?/gim, "<h3>Summary</h3>").replace(/Related Words:/gi, "<h3>Related Words:</h3>").replace(/Antonyms:/gi, "<h3>Antonyms:</h3>").replace(/Synonyms:/gi, "<h3>Synonyms:</h3>");
    formattedMeaning = formattedMeaning.replace(/(\s*\/?\s*As a (?:verb|noun|adjective|adverb|preposition|conjunction)\s*:?)/gi, "<br><br>$&");
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
    
    const sentenceLinkBtn = document.getElementById("sentenceLinkBtn");
    if (sentenceLinkBtn) {
        sentenceLinkBtn.onclick = () => {
            const wordText = word.Words || word.word || word["單字"];
            if (wordText) {
                window.location.href = `sentence.html?showSentencesForWord=${encodeURIComponent(wordText)}&from=index`;
            }
        };
    }

    if (isAutoPlaying && !isPaused) playAudioSequentially(word);
}

function playAudioSequentially(word) {
    let phoneticAudio = new Audio(`https://github.com/BoydYang-Designer/English-vocabulary/raw/main/audio_files/${encodeURIComponent(word.Words)}.mp3`);
    sentenceAudio = new Audio(`https://github.com/BoydYang-Designer/English-vocabulary/raw/main/audio_files/${encodeURIComponent(word.Words)} - sentence.mp3`);
    
    document.getElementById('meaningContainer').scrollIntoView({ behavior: 'smooth', block: 'start' });

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
            autoPlayBtn.textContent = isAutoPlaying ? (isPaused ? "Resume Play" : "Stop Play") : "Autoplay Words";
            autoPlayBtn.classList.toggle("playing", isAutoPlaying);
        }
    } else if (document.getElementById("wordDetails").style.display === "block") {
        if (autoPlayDetailsBtn) {
            autoPlayDetailsBtn.textContent = isAutoPlaying ? (isPaused ? "Resume Autoplay" : "Pause Autoplay") : "Autoplay Content";
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

    document.getElementById('meaningContainer').scrollIntoView({ behavior: 'smooth', block: 'start' });
    
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
    }).catch(err => console.error("❌ Audio playback failed:", err));
}

function togglePauseAudio(button) {
    const playBtn = document.getElementById("playAudioBtn");
    const pauseBtn = button;
    if (sentenceAudio.paused || sentenceAudio.ended) {
        document.getElementById('meaningContainer').scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    const vocabularyData = window.getVocabularyData();
    if (!vocabularyData.importantWords) vocabularyData.importantWords = [];

    if (checkbox.checked) {
        if (!vocabularyData.importantWords.includes(word)) {
            vocabularyData.importantWords.push(word);
        }
    } else {
        vocabularyData.importantWords = vocabularyData.importantWords.filter(w => w !== word);
    }
    window.setImportantWords(vocabularyData.importantWords);
    window.persistVocabularyData();
}

function saveNote() {
    let word = document.getElementById("wordTitle")?.textContent.trim();
    let noteTextArea = document.getElementById("wordNote");
    let note = noteTextArea.value.trim();

    if (word) {
        const vocabularyData = window.getVocabularyData();
        if (!vocabularyData.notes) vocabularyData.notes = {};

        if (note.length > 0) {
            vocabularyData.notes[word] = note;
            showNotification("✅ Note saved!", 'success');
        } else {
            delete vocabularyData.notes[word];
            showNotification("🗑️ Note deleted!", 'success');
        }
        window.setNotes(vocabularyData.notes);
        window.persistVocabularyData();

        if (lastWordListType === "noteWords") showNoteWords();
    }
}

function displayNote() {
    let word = document.getElementById("wordTitle")?.textContent.trim();
    if (word) {
        const vocabularyData = window.getVocabularyData();
        document.getElementById("wordNote").value = (vocabularyData.notes && vocabularyData.notes[word]) || "";
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
        const data = window.getVocabularyData();
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "my_english_learning_backup.json";
        a.click();
        URL.revokeObjectURL(url);
        showNotification("✅ Learning data exported successfully!", "success");
    } catch (error) {
        showNotification("❌ Data export failed!", "error");
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
                // Here, you should use the functions from auth-manager to update the data
                if(data.checkedWords) window.setCheckedWords(data.checkedWords);
                if(data.importantWords) window.setImportantWords(data.importantWords);
                if(data.wrongWords) window.setWrongWords(data.wrongWords);
                if(data.notes) window.setNotes(data.notes);
                // ...and so on for other data types
                window.persistVocabularyData(); // Save the newly imported data
                
                showNotification("✅ Learning data imported successfully!", "success");
                setTimeout(() => location.reload(), 1000);
            } catch (error) {
                showNotification("❌ File import failed, incorrect format.", "error");
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

function enableWordCopyOnClick() {
    const meaningContainer = document.getElementById("meaningContainer");
    if (!meaningContainer) return;

    meaningContainer.addEventListener('click', function(event) {
        if (event.target.tagName !== 'P' && event.target.tagName !== 'DIV' && event.target.tagName !== 'SPAN') {
            return;
        }

        const range = document.caretRangeFromPoint(event.clientX, event.clientY);
        if (!range) return; 
        const textNode = range.startContainer;
        if (textNode.nodeType !== Node.TEXT_NODE) return; 

        const text = textNode.textContent;
        const offset = range.startOffset;

        let start = offset;
        let end = offset;
        const wordRegex = /\w/; 

        while (start > 0 && wordRegex.test(text[start - 1])) {
            start--;
        }
        while (end < text.length && wordRegex.test(text[end])) {
            end++;
        }

        if (start === end) return; 
        const wordRange = document.createRange();
        wordRange.setStart(textNode, start);
        wordRange.setEnd(textNode, end);
        
        const selectedWord = wordRange.toString();
        const highlightSpan = document.createElement('span');
        highlightSpan.className = 'word-click-highlight';
        
        try {
            wordRange.surroundContents(highlightSpan);
            setTimeout(() => {
                if (highlightSpan.parentNode) {
                    const parent = highlightSpan.parentNode;
                    while (highlightSpan.firstChild) {
                        parent.insertBefore(highlightSpan.firstChild, highlightSpan);
                    }
                    parent.removeChild(highlightSpan);
                    parent.normalize(); 
                }
            }, 600); 
        } catch (e) {
            console.error("Highlight effect failed:", e);
        }

        navigator.clipboard.writeText(selectedWord)
            .then(() => {
                const searchInput = document.getElementById('searchInputDetails');
                if (searchInput) {
                    searchInput.value = selectedWord;
                    searchInput.focus(); 
                    filterWordsInDetails(); 
                }
            })
            .catch(err => {
                console.error('❌ Copy failed:', err);
                showNotification('⚠️ Copy failed, please copy manually', 'error');
            });
    });
}