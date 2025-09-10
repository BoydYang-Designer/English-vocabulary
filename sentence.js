/**
 * 根據一個基礎單字，建立一個可以匹配其常見變化正規表示式。
 */
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

// 全局變數
let parentLayer = "";
let wordsData = [];
let sentenceData = [];
let sentenceAudio = new Audio();
let lastWordListType = "";
let lastWordListValue = "";
let lastSentenceListWord = "";
let currentSentenceList = [];
let currentSentenceIndex = -1;
let currentWordList = [];
let currentWordIndex = -1;
let isQuizMode = false;
let isAutoPlaying = false;
let isPaused = false;
let lastPlayBtn = null;

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
    console.log("開始載入資料...");

    // ▼▼▼ BUG 修正與功能實作 ▼▼▼
    // 1. 確保所有分類內容區域在載入時都是收合的
    document.querySelectorAll('.collapsible-content').forEach(content => {
        content.style.maxHeight = '0px';
    });

    // 2. 修正並綁定摺疊/展開的點擊事件
    document.querySelectorAll(".collapsible-header").forEach(button => {
        button.addEventListener("click", function() {
            this.classList.toggle("active");
            const content = this.nextElementSibling;
            
            // 檢查是否已展開 (maxHeight 有值且不為 '0px')
            if (content.style.maxHeight && content.style.maxHeight !== '0px') {
                content.style.maxHeight = '0px'; // 如果是，則收合
            } else {
                content.style.maxHeight = content.scrollHeight + "px"; // 如果不是，則展開
            }
        });
    });
    // ▲▲▲ 修正結束 ▲▲▲

    Promise.all([
        fetch("https://boydyang-designer.github.io/English-vocabulary/audio_files/Z_total_words.json")
            .then(res => {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res.json();
            })
            .then(data => {
                wordsData = data["New Words"] || [];
                console.log("✅ Z_total_words.json 載入成功");
            }),
        fetch("https://boydyang-designer.github.io/English-vocabulary/Sentence%20file/sentence.json")
            .then(res => {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res.json();
            })
            .then(data => {
                sentenceData = data["New Words"] || [];
                console.log("✅ sentence.json 載入成功");
            })
    ])
    .then(() => {
        loadingOverlay.style.opacity = '0';
        setTimeout(() => {
            loadingOverlay.style.display = 'none';
        }, 300);

        if (!wordsData.length || !sentenceData.length) {
            console.error("❌ 資料載入不完整，無法繼續");
            showNotification('❌ 部分資料載入不完整，功能可能異常。', 'error');
            return;
        }

        showNotification('✅ 資料載入完成！', 'success');

        wordsData.forEach(w => {
            if (typeof w["分類"] === "string") w["分類"] = [w["分類"]];
            else if (!Array.isArray(w["分類"])) w["分類"] = [];
        });

        renderAlphabetButtons();
        createCategoryButtons();
        createLevelButtons();

        document.getElementById("startQuizBtn").addEventListener("click", () => {window.location.href = "quiz.html?show=sentenceCategories&from=sentence";});
        document.getElementById("returnHomeBtn").addEventListener("click", () => window.location.href = "index.html");
        document.getElementById("wordQuizBtn").addEventListener("click", () => {window.location.href = "quiz.html?show=categories&from=sentence";});
        
        document.getElementById("startLearningBtn").addEventListener("click", startLearning);

        const urlParams = new URLSearchParams(window.location.search);
        const sentenceParam = urlParams.get('sentence');
        const fromParam = urlParams.get('from');
        const layerParam = urlParams.get('layer');

        if (sentenceParam && layerParam === '4') {
            if (fromParam === 'quiz') {
                isQuizMode = true;
                const quizSentences = JSON.parse(localStorage.getItem("currentQuizSentences")) || [];
                if (quizSentences.length > 0) {
                    currentSentenceList = quizSentences.slice(0, 10);
                    currentSentenceIndex = currentSentenceList.findIndex(s => s.Words === sentenceParam);
                } else {
                    isQuizMode = false;
                    const word = sentenceParam.split("-")[0];
                    currentSentenceList = sentenceData.filter(s => s.Words.startsWith(word + "-"));
                    currentSentenceList = sortSentencesByWordAndNumber(currentSentenceList);
                    currentSentenceIndex = currentSentenceList.findIndex(s => s.Words === sentenceParam);
                }
            } else {
                isQuizMode = false;
                const word = sentenceParam.split("-")[0];
                currentSentenceList = sentenceData.filter(s => s.Words.startsWith(word + "-"));
                currentSentenceList = sortSentencesByWordAndNumber(currentSentenceList);
                currentSentenceIndex = currentSentenceList.findIndex(s => s.Words === sentenceParam);
            }
            showSentenceDetails(sentenceParam);
        } else {
            isQuizMode = false;
            backToFirstLayer();
        }
    })
    .catch(err => {
        console.error("❌ 資料載入過程中發生錯誤:", err);
        loadingOverlay.style.opacity = '0';
        setTimeout(() => {
            loadingOverlay.style.display = 'none';
        }, 300);
        showNotification('❌ 資料載入失敗，請檢查網路或檔案路徑。', 'error');
    });
});

function toggleSelection(btn) {
    btn.classList.toggle('selected');
}

function handlePrimaryCategoryClick(btn, categoryName) {
    toggleSelection(btn);

    let parentContainer = btn.closest('.collapsible-content');
    let subcategoryWrapper = document.getElementById(`sub-for-${categoryName.replace(/\s/g, '-')}`);

    if (!subcategoryWrapper) {
        subcategoryWrapper = document.createElement('div');
        subcategoryWrapper.className = 'subcategory-wrapper';
        subcategoryWrapper.id = `sub-for-${categoryName.replace(/\s/g, '-')}`;

        const secondaryCategories = [...new Set(
            wordsData
                .filter(w => w["分類"] && w["分類"][0] === categoryName && w["分類"][1])
                .map(w => w["分類"][1])
        )];

        const hasUncategorized = wordsData.some(w => 
            w["分類"] && w["分類"][0] === categoryName && (!w["分類"][1] || w["分類"][1].trim() === '')
        );

        if (hasUncategorized) {
            secondaryCategories.unshift("未分類");
        }
        
        if (secondaryCategories.length > 0) {
            const subWrapper = document.createElement('div');
            subWrapper.className = 'button-wrapper';
            subWrapper.innerHTML = secondaryCategories.map(subCat => 
                `<button class="letter-btn" data-value='${subCat}' onclick="toggleSelection(this)">${subCat}</button>`
            ).join(' ');
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

// ▼▼▼ 修改此函式 ▼▼▼
function startLearning() {
    const selectedLetters = Array.from(document.querySelectorAll('#alphabetButtons .letter-btn.selected')).map(btn => btn.dataset.value);
    const selectedPrimaries = Array.from(document.querySelectorAll('#primaryCategoryButtons .letter-btn.selected')).map(btn => btn.dataset.value);
    const selectedSecondaries = Array.from(document.querySelectorAll('.subcategory-wrapper .letter-btn.selected')).map(btn => btn.dataset.value);
    const selectedLevels = Array.from(document.querySelectorAll('#levelButtons .letter-btn.selected')).map(btn => btn.dataset.value);
    const selectedSpecials = Array.from(document.querySelectorAll('#specialCategoryButtons .letter-btn.selected')).map(btn => btn.dataset.value);

    let finalSentences = sentenceData;

    // 步驟 1: 根據「句子相關」的特殊分類預先篩選句子
    const sentenceSpecialFilters = selectedSpecials.filter(s => s !== 'checked_word');
    if (sentenceSpecialFilters.length > 0) {
        finalSentences = finalSentences.filter(s => {
            const sentenceId = s.Words;
            return sentenceSpecialFilters.some(specialType => {
                switch (specialType) {
                    case 'checked':
                        return localStorage.getItem(`checked_sentence_${sentenceId}`) === "true";
                    case 'important':
                        return localStorage.getItem(`important_sentence_${sentenceId}`) === "true";
                    case 'wrong':
                        const wrongQS = JSON.parse(localStorage.getItem("wrongQS")) || [];
                        return wrongQS.includes(sentenceId);
                    case 'note':
                        const note = localStorage.getItem(`note_sentence_${sentenceId}`);
                        return note && note.trim() !== "";
                    default:
                        return false;
                }
            });
        });
    }
    
    // 步驟 2: 判斷是否需要根據「單字屬性」來篩選
    const hasWordFilters = selectedLetters.length > 0 || 
                           selectedPrimaries.length > 0 || 
                           selectedSecondaries.length > 0 || 
                           selectedLevels.length > 0 ||
                           selectedSpecials.includes('checked_word');
    
    if (hasWordFilters) {
        let filteredWords = wordsData;

        if (selectedLetters.length > 0) {
            filteredWords = filteredWords.filter(w => selectedLetters.includes((w.Words || "").charAt(0).toLowerCase()));
        }
        if (selectedPrimaries.length > 0) {
            filteredWords = filteredWords.filter(w => selectedPrimaries.includes((w["分類"] && w["分類"][0]) || "未分類"));
        }
        if (selectedSecondaries.length > 0) {
            filteredWords = filteredWords.filter(w => {
                 const primaryCat = (w["分類"] && w["分類"][0]) || "未分類";
                 if (selectedPrimaries.length > 0 && !selectedPrimaries.includes(primaryCat)) {
                     return false;
                 }
                 const secondaryCat = (w["分類"] && w["分類"][1]) || "未分類";
                 return selectedSecondaries.includes(secondaryCat);
            });
        }
        if (selectedLevels.length > 0) {
            filteredWords = filteredWords.filter(w => selectedLevels.includes(w["等級"] || "未分類"));
        }
        // [新增] 處理 "Checked 單字" 篩選
        if (selectedSpecials.includes('checked_word')) {
            filteredWords = filteredWords.filter(w => {
                const wordText = w.Words || w.word || w["單字"] || "";
                return localStorage.getItem(`checked_${wordText}`) === "true";
            });
        }

        const allowedWordNames = new Set(filteredWords.map(w => w.Words));

        // 根據篩選後的單字列表，過濾 finalSentences
        finalSentences = finalSentences.filter(s => {
            const baseWord = s.Words.split('-').slice(0, -1).join('-');
            return allowedWordNames.has(baseWord);
        });
    }

    if (finalSentences.length === 0) {
        showNotification("⚠️ 找不到符合條件的句子。", "error");
        return;
    }
    
    currentSentenceList = sortSentencesByWordAndNumber(finalSentences);
    displaySentenceList(currentSentenceList, "學習列表");
}
// ▲▲▲ 修改結束 ▲▲▲


// ▼▼▼ 修改此函式 ▼▼▼
function createCategoryButtons() {
    if (!wordsData || !Array.isArray(wordsData)) return;
    
    let primaryCategories = [...new Set(wordsData.map(w => (w["分類"] && w["分類"][0]) || "未分類").filter(c => c))];
    const primaryContainer = document.getElementById("primaryCategoryButtons");
    if (primaryContainer) {
        const wrapper = document.createElement('div');
        wrapper.className = 'button-wrapper';
        primaryCategories.forEach(category => {
            const btn = document.createElement('button');
            btn.className = 'letter-btn';
            btn.textContent = category;
            btn.dataset.value = category;
            btn.onclick = () => handlePrimaryCategoryClick(btn, category);
            wrapper.appendChild(btn);
        });
        primaryContainer.appendChild(wrapper);
    }

    const specialCategories = [
        { name: "Checked 句子", value: "checked" },
        { name: "重要句子", value: "important" },
        { name: "錯誤句子", value: "wrong" },
        { name: "Note句子", value: "note" },
        { name: "Checked 單字", value: "checked_word" } // [新增]
    ];
    const specialContainer = document.getElementById("specialCategoryButtons");
    if (specialContainer) {
        const wrapper = document.createElement('div');
        wrapper.className = 'button-wrapper';
        wrapper.innerHTML = specialCategories.map(c => 
           `<button class='letter-btn' data-value='${c.value}' onclick='toggleSelection(this)'>${c.name}</button>`
        ).join(" ");
        specialContainer.appendChild(wrapper);
    }
}
// ▲▲▲ 修改結束 ▲▲▲

function createLevelButtons() {
    let levels = [...new Set(wordsData.map(w => w["等級"] || "未分類"))];
    const levelContainer = document.getElementById("levelButtons");
    if(levelContainer){
        const wrapper = document.createElement('div');
        wrapper.className = 'button-wrapper';
        wrapper.innerHTML = levels
            .map(l => `<button class='letter-btn' data-value='${l}' onclick='toggleSelection(this)'>${l}</button>`).join(" ");
        levelContainer.appendChild(wrapper);
    }
}

function renderAlphabetButtons() {
    const alphabetContainer = document.getElementById("alphabetButtons");
    if (!alphabetContainer) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'button-wrapper';
    wrapper.innerHTML = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")
        .map(letter => `<button class='letter-btn' data-value='${letter.toLowerCase()}' onclick='toggleSelection(this)'>${letter}</button>`)
        .join(" ");
    alphabetContainer.appendChild(wrapper);
}

function sortSentencesByWordAndNumber(sentences) {
    return sentences.sort((a, b) => {
        const wordA = a.Words.split("-").slice(0, -1).join("-");
        const wordB = b.Words.split("-").slice(0, -1).join("-");
        const numA = parseInt(a.Words.split("-").pop(), 10);
        const numB = parseInt(b.Words.split("-").pop(), 10);

        const wordComparison = wordA.localeCompare(wordB, undefined, { sensitivity: 'base' });
        if (wordComparison !== 0) return wordComparison;

        return numA - numB;
    });
}

function displaySentenceList(sentences, title = "句子列表") {
    document.getElementById("mainPageContainer").style.display = "none";
    document.getElementById("wordListTitle").innerHTML = `
        <span>${title} (${sentences.length}句)</span>
        <button id="autoPlayBtn" onclick="toggleAutoPlay()">自動播放</button>
    `;
    document.getElementById("wordListTitle").style.display = "block";
    
    const sentenceList = document.getElementById('sentenceList');
    sentenceList.style.display = "block";
    document.getElementById("wordList").style.display = "none";
    document.querySelector('#sentenceList .back-button').style.display = "block";

    const sentenceItems = document.getElementById('sentenceItems');
    sentenceItems.innerHTML = '';

    if (sentences.length === 0) {
        sentenceItems.innerHTML = "<p>⚠️ 目前沒有符合的句子</p>";
        return;
    }

    currentSentenceList = sentences;

    sentences.forEach((sentence, index) => {
        const sentenceId = sentence.Words;
        const isChecked = localStorage.getItem(`checked_sentence_${sentenceId}`) === "true";
        const isImportant = localStorage.getItem(`important_sentence_${sentenceId}`) === "true";
        const iconSrc = isChecked 
            ? "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/checked-icon.svg" 
            : "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/check-icon.svg";

        const container = document.createElement('div');
        container.className = `word-item-container ${isChecked ? "checked" : ""}`;

        const sentenceDisplay = isChecked 
            ? sentenceId 
            : `${sentenceId}: ${sentence.句子}`;

        container.innerHTML = `
            <input type='checkbox' class='important-checkbox' onchange='toggleImportantSentence("${sentenceId}", this)' ${isImportant ? "checked" : ""}>
            <p class='word-item' data-sentence="${sentenceId}">${sentenceDisplay}</p>
            <button class='check-button' onclick='toggleCheckSentence("${sentenceId}", this)'>
                <img src="${iconSrc}" class="check-icon" alt="Check" width="24" height="24">
            </button>
            <button class='audio-btn' onclick='playSentenceAudio("${sentenceId}.mp3")'>
                <img src="https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/play.svg" alt="Play" width="24" height="24" />
            </button>
        `;

        sentenceItems.appendChild(container);

        container.querySelector('.word-item').addEventListener("click", () => showSentenceDetails(sentenceId, index));
    });

    updateAutoPlayButton();
}

function backToFirstLayer() {
    document.getElementById("mainPageContainer").style.display = "block";
    
    document.getElementById("wordList").style.display = "none";
    document.getElementById("sentenceList").style.display = "none";
    document.getElementById("sentenceDetails").style.display = "none";
    document.getElementById("wordListTitle").style.display = "none";
    
    document.getElementById("searchInput").value = "";
    let searchResults = document.getElementById("searchResults");
    if (searchResults) searchResults.innerHTML = "";

    document.querySelectorAll('.letter-btn.selected').forEach(btn => btn.classList.remove('selected'));
    
    document.querySelectorAll('.subcategory-wrapper').forEach(wrapper => wrapper.remove());
    
    document.querySelectorAll('.collapsible-header.active').forEach(header => {
        header.classList.remove('active');
        header.nextElementSibling.style.maxHeight = '0px';
    });
}

// ... (其他函式保持不變) ...
function showSentences(word) {
    console.log("✅ 進入 showSentences, word:", word);
    parentLayer = "wordList";
    document.getElementById("wordListTitle").innerHTML = `
        <span>${word}</span>
        <button id="autoPlayBtn" onclick="toggleAutoPlay()">自動播放</button>
    `;
    document.getElementById("wordListTitle").style.display = "block";

    document.getElementById("searchContainer").style.display = "none";
    document.getElementById("startQuizBtn").style.display = "none";
    document.getElementById("wordQuizBtn").style.display = "none";
    document.getElementById("returnHomeBtn").style.display = "none";
    document.getElementById("sentencePageBtn").style.display = "none";
    document.querySelector('.collapsible-section-wrapper').style.display = "none";
    document.getElementById("wordList").style.display = "none";
    document.getElementById("sentenceList").style.display = "block";
    document.querySelector('#sentenceList .back-button').style.display = "block";

    lastSentenceListWord = word;
    currentWordIndex = currentWordList.indexOf(word);

    let sentenceItems = document.getElementById("sentenceItems");
    sentenceItems.innerHTML = "";

    if (!sentenceData || !Array.isArray(sentenceData)) {
        sentenceItems.innerHTML = "<p>⚠️ 句子資料尚未載入，請稍後再試</p>";
        console.error("❌ sentenceData 未正確初始化:", sentenceData);
        return;
    }

    let filteredSentences = sentenceData.filter(s => {
        return s && s.Words && typeof s.Words === "string" && s.Words.startsWith(word + "-");
    });

    console.log(`✅ 過濾後的句子 (${word}):`, filteredSentences);

    currentSentenceList = filteredSentences.sort((a, b) => {
        const numA = parseInt(a.Words.split("-").pop(), 10);
        const numB = parseInt(b.Words.split("-").pop(), 10);
        return numA - numB;
    });

    if (currentSentenceList.length === 0) {
        sentenceItems.innerHTML = "<p>⚠️ 沒有符合的句子</p>";
    } else {
        currentSentenceList.forEach((s, index) => {
            let sentenceId = s.Words;
            let isImportant = localStorage.getItem(`important_sentence_${sentenceId}`) === "true";
            let isChecked = localStorage.getItem(`checked_sentence_${sentenceId}`) === "true";
            let iconSrc = isChecked 
                ? "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/checked-icon.svg" 
                : "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/check-icon.svg";

            const sentenceDisplay = isChecked 
                ? sentenceId 
                : `${sentenceId}: ${s.句子}`;

            let item = document.createElement("div");
            item.className = `word-item-container ${isChecked ? "checked" : ""}`;
            item.innerHTML = `
                <input type='checkbox' class='important-checkbox' onchange='toggleImportantSentence("${sentenceId}", this)' ${isImportant ? "checked" : ""}>
                <p class='word-item' data-sentence="${sentenceId}">${sentenceDisplay}</p>
                <button class='check-button' onclick='toggleCheckSentence("${sentenceId}", this)'>
                    <img src="${iconSrc}" class="check-icon" alt="Check" width="24" height="24">
                </button>
                <button class='audio-btn' onclick='playSentenceAudio("${sentenceId}.mp3")'>
                    <img src="https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/play.svg" alt="Play" width="24" height="24" />
                </button>
            `;
            sentenceItems.appendChild(item);

            item.querySelector('.word-item').addEventListener("click", () => showSentenceDetails(sentenceId, index));
        });
    }
    updateAutoPlayButton();
}

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

function getAutoPlayBtn() {
    const btn1 = document.getElementById("autoPlayBtn");
    const btn2 = document.getElementById("autoPlayBtnDetails");
    if (btn2 && btn2.offsetParent !== null) return btn2;
    if (btn1 && btn1.offsetParent !== null) return btn1;
    return btn1 || btn2;
}

function toggleAutoPlay() {
    const autoPlayBtn = getAutoPlayBtn();
    if (!autoPlayBtn) return;
    
    if (isAutoPlaying) {
        stopAutoPlay();
        autoPlayBtn.textContent = "自動播放";
        autoPlayBtn.classList.remove("auto-playing");
    } else {
        startAutoPlay();
        autoPlayBtn.textContent = "取消播放";
        autoPlayBtn.classList.add("auto-playing");
    }
}

function startAutoPlay() {
    const autoPlayBtn = getAutoPlayBtn();
    isAutoPlaying = true;

    if (document.getElementById("wordList").style.display === "block") {
        currentWordIndex = 0;
        playNextWord();

    } else if (document.getElementById("sentenceList").style.display === "block") {
        currentSentenceIndex = 0;
        playNextSentence();

    } else if (document.getElementById("sentenceDetails").style.display === "block") {
        playCurrentSentence();
    }

    autoPlayBtn.textContent = "取消播放";
    autoPlayBtn.classList.add("auto-playing");
}

function stopAutoPlay() {
    const autoPlayBtn = document.getElementById("autoPlayBtn") || document.getElementById("autoPlayBtnDetails");
    isAutoPlaying = false;
    sentenceAudio.pause();
    autoPlayBtn.textContent = "自動播放";
    autoPlayBtn.classList.remove("auto-playing");
}

function playNextWord() {
    if (currentWordIndex < currentWordList.length) {
        const word = currentWordList[currentWordIndex];
        showSentences(word);
        currentSentenceIndex = 0;
        playNextSentence();
    } else {
        stopAutoPlay();
    }
}

function playNextSentence() {
    if (currentSentenceIndex < currentSentenceList.length) {
        const sentenceId = currentSentenceList[currentSentenceIndex].Words;
        showSentenceDetails(sentenceId);
        playSentenceAudio(`${sentenceId}.mp3`);
        sentenceAudio.onended = () => {
            currentSentenceIndex++;
            if (currentSentenceIndex < currentSentenceList.length) {
                playNextSentence();
            } else {
                currentWordIndex++;
                playNextWord();
            }
        };
    } else {
        currentWordIndex++;
        playNextWord();
    }
}

function playCurrentSentence() {
    const sentenceId = currentSentenceList[currentSentenceIndex].Words;
    playSentenceAudio(`${sentenceId}.mp3`);
    sentenceAudio.onended = () => {
        currentSentenceIndex++;
        if (currentSentenceIndex < currentSentenceList.length) {
            showSentenceDetails(currentSentenceList[currentSentenceIndex].Words);
            playCurrentSentence();
        } else {
            currentWordIndex++;
            playNextWord();
        }
    };
}

function updateAutoPlayButton() {
    const autoPlayBtn = getAutoPlayBtn();
    if (!autoPlayBtn) return;
    
    autoPlayBtn.textContent = isAutoPlaying ? "取消播放" : "自動播放";
    autoPlayBtn.classList.toggle("auto-playing", isAutoPlaying);
}

function toggleCheckSentence(sentenceId, button) {
    const isChecked = localStorage.getItem(`checked_sentence_${sentenceId}`) === "true";
    const newState = !isChecked;

    localStorage.setItem(`checked_sentence_${sentenceId}`, newState);

    const icon = button.querySelector('img');
    icon.src = newState 
        ? "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/checked-icon.svg" 
        : "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/check-icon.svg";

    const container = button.parentElement;
    const wordItem = container.querySelector('.word-item');
    const sentenceObj = sentenceData.find(s => s.Words === sentenceId);

    if (newState) {
        container.classList.add('checked');
        wordItem.textContent = sentenceId;
    } else {
        container.classList.remove('checked');
        wordItem.textContent = `${sentenceId}: ${sentenceObj.句子}`;
    }
}

function toggleImportantSentence(sentenceId, checkbox) {
    if (checkbox.checked) localStorage.setItem(`important_sentence_${sentenceId}`, "true");
    else localStorage.removeItem(`important_sentence_${sentenceId}`);
}

function showSentenceDetails(sentenceId, index = -1, direction = null) {
    let sentenceObj = sentenceData.find(s => s.Words === sentenceId);
    if (!sentenceObj) {
        console.error(`❌ 未找到句子: ${sentenceId}`);
        return;
    }

    if (isQuizMode && index === -1) {
        console.log("✅ 測驗模式：保持 currentSentenceList 不變");
    } else if (index !== -1) {
        currentSentenceIndex = index;
    } else if (currentSentenceList.length > 0 && currentSentenceIndex === -1) {
        currentSentenceIndex = currentSentenceList.findIndex(s => s.Words === sentenceId);
    }

    parentLayer = "sentenceList";

    const detailsArea = document.getElementById("sentenceDetails");

    if (direction === "from-right") {
        detailsArea.classList.add("sliding-in-from-right");
    } else if (direction === "from-left") {
        detailsArea.classList.add("sliding-in-from-left");
    }

    let word = sentenceId.replace(/-\d+$/, "");
    let wordObj = wordsData.find(w => w.Words === word);
    let header = `
    <div class="phonetics-container">
        <input type='checkbox' class='important-checkbox' onchange='toggleImportantSentence("${sentenceId}", this)' ${localStorage.getItem(`important_sentence_${sentenceId}`) === "true" ? "checked" : ""}>
        <div id="sentenceTitle" style="font-size: 20px; font-weight: bold;">${sentenceId}</div>
        <button id="autoPlayBtnDetails" onclick="toggleAutoPlay()">自動播放</button>
    </div>`;
    let phonetics = wordObj ? 
        ((wordObj["pronunciation-1"] ? `<button class='button' onclick='playAudio("${word}.mp3")'>${wordObj["pronunciation-1"]}</button>` : "") +
        (wordObj["pronunciation-2"] ? `<button class='button' onclick='playAudio("${word} 2.mp3")'>${wordObj["pronunciation-2"]}</button>` : "") || "<p>No pronunciation available</p>") : 
        "<p>No pronunciation available</p>";
        
    let sentenceText = `<p>${sentenceObj.句子}</p>`;
    let chineseText = `<p>${sentenceObj.中文}</p>`;

    let wordToHighlight = sentenceId.replace(/-\d+$/, "");
    const highlightRegex = createWordVariationsRegex(wordToHighlight);
    sentenceText = sentenceText.replace(highlightRegex, (match) => `<span class="highlight-word">${match}</span>`);

    document.getElementById("sentenceHeader").innerHTML = header;
    document.getElementById("phoneticContainer").innerHTML = phonetics;
    document.getElementById("sentenceContainer").innerHTML = sentenceText;
    document.getElementById("chineseContainer").innerHTML = chineseText;

    const playAudioBtn = document.getElementById("playAudioBtn");
    playAudioBtn.setAttribute("onclick", `playSentenceAudio("${sentenceId}.mp3")`);
    playAudioBtn.classList.remove("playing");

    playAudioBtn.addEventListener("touchstart", (event) => event.stopPropagation(), { passive: true });
    playAudioBtn.addEventListener("touchmove", (event) => event.stopPropagation(), { passive: true });
    playAudioBtn.addEventListener("touchend", (event) => event.stopPropagation());

    displayNote(sentenceId);

    document.getElementById("sentenceList").style.display = "none";
    document.getElementById("sentenceDetails").style.display = "block";
    document.getElementById("wordListTitle").style.display = "none";
    document.getElementById("mainPageContainer").style.display = "none";

    if (direction) {
        setTimeout(() => {
            detailsArea.style.transform = "translateX(0)";
            detailsArea.classList.remove("sliding-in-from-right", "sliding-in-from-left");
        }, 10);
    }

    updateAutoPlayButton();
}

let wordAudio = new Audio();
function playAudio(filename) {
    wordAudio.src = `https://github.com/BoydYang-Designer/English-vocabulary/raw/main/audio_files/${filename}`;
    wordAudio.play();
}

function switchToPreviousSentence() {
    if (currentSentenceIndex > 0) {
        currentSentenceIndex--;
        showSentenceDetails(currentSentenceList[currentSentenceIndex].Words, currentSentenceIndex);
    }
}

function switchToNextSentence() {
    if (currentSentenceIndex < currentSentenceList.length - 1) {
        currentSentenceIndex++;
        showSentenceDetails(currentSentenceList[currentSentenceIndex].Words, currentSentenceIndex);
    }
}

function playSentenceAudio(filename) {
    console.log("開始播放:", filename);
    const playButtons = document.querySelectorAll(`.audio-btn[onclick="playSentenceAudio('${filename}')"]`);
    const playBtn = playButtons[playButtons.length - 1] || document.getElementById("playAudioBtn");
    sentenceAudio.src = `https://github.com/BoydYang-Designer/English-vocabulary/raw/main/Sentence%20file/${filename}`;
    if (playBtn) {
        playBtn.classList.add("playing");
        lastPlayBtn = playBtn;
    }
    sentenceAudio.play()
        .then(() => console.log(`✅ 播放 ${filename} 成功`))
        .catch(error => {
            console.error(`🔊 播放 ${filename} 失敗:`, error);
            if (playBtn) playBtn.classList.remove("playing");
            if (isAutoPlaying && !isPaused) {
                currentSentenceIndex++;
                if (currentSentenceIndex < currentSentenceList.length) {
                    playCurrentSentence();
                } else {
                    currentWordIndex++;
                    playNextWord();
                }
            }
        });
    sentenceAudio.onended = () => {
        if (playBtn) playBtn.classList.remove("playing");
        console.log(`✅ ${filename} 播放結束`);
        if (isAutoPlaying && !isPaused) {
            currentSentenceIndex++;
            if (currentSentenceIndex < currentSentenceList.length) {
                playCurrentSentence();
            } else {
                currentWordIndex++;
                playNextWord();
            }
        }
    };
    document.querySelectorAll(".audio-btn.playing").forEach(btn => {
        if (btn !== playBtn) btn.classList.remove("playing");
    });
}

function togglePauseAudio(button) {
    const pauseBtn = button;
    const playIcon  = '<img src="https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/play.svg"  alt="Play"  width="24" height="24"/>';
    const pauseIcon = '<img src="https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/pause.svg" alt="Pause" width="24" height="24"/>';

    if (sentenceAudio.paused || sentenceAudio.ended) {
        sentenceAudio.play();
        pauseBtn.innerHTML = pauseIcon;
        pauseBtn.classList.remove("auto-playing");
        if (lastPlayBtn) lastPlayBtn.classList.add("playing");
    } else {
        sentenceAudio.pause();
        pauseBtn.innerHTML = playIcon;
        pauseBtn.classList.add("auto-playing");
        if (lastPlayBtn) lastPlayBtn.classList.remove("playing");
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

function backToSentenceList(event) {
    event.stopPropagation();

    if (isAutoPlaying) {
        isAutoPlaying = false;
        isPaused = false;
        if (sentenceAudio && sentenceAudio.readyState >= 2) {
            sentenceAudio.pause();
        }
    }

    document.getElementById("sentenceDetails").style.display = "none";

    const urlParams = new URLSearchParams(window.location.search);
    const fromParam = urlParams.get('from');

    if (fromParam === 'quiz') {
        window.location.href = "quiz.html?returning=true";
    } else {
        // For any other case, just show the sentence list again
        document.getElementById("sentenceList").style.display = "block";
        document.getElementById("wordListTitle").style.display = "block";
    }
}