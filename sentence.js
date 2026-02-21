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

// ========== 麵包屑導航系統 ==========
window.appEnhancements = window.appEnhancements || {
    breadcrumbPath: [],
    currentTheme: localStorage.getItem('theme') || 'light'
};

function updateBreadcrumb(path) {
    if (path) {
        window.appEnhancements.breadcrumbPath = path;
    }
    
    const breadcrumbNav = document.getElementById('breadcrumb-nav');
    if (!breadcrumbNav) return;
    
    // 如果路徑為空，隱藏導航
    if (window.appEnhancements.breadcrumbPath.length === 0) {
        breadcrumbNav.classList.remove('show');
        return;
    }
    
    breadcrumbNav.classList.add('show');
    breadcrumbNav.innerHTML = window.appEnhancements.breadcrumbPath.map((item, index) => {
        const isLast = index === window.appEnhancements.breadcrumbPath.length - 1;
        let onclickAction = "";
        
        // 定義點擊行為
        if (index === 0) {
            onclickAction = "backToMenu()";
        } else if (index === 1) {
            onclickAction = "backToFirstLayer()";
        } else {
            onclickAction = `navigateToBreadcrumb(${index})`;
        }
        
        return `<span class="breadcrumb-item" onclick="${onclickAction}">${item}</span>${!isLast ? '<span class="breadcrumb-separator">›</span>' : ''}`;
    }).join('');
}

function navigateToBreadcrumb(index) {
    window.appEnhancements.breadcrumbPath = window.appEnhancements.breadcrumbPath.slice(0, index + 1);
    
    if (index === 0) {
        backToMenu();
    } else if (index === 1) {
        backToFirstLayer();
    } else if (index === 2) {
        backToSentenceList();
    }
    
    updateBreadcrumb();
}

function backToMenu() {
    // 返回到 index.html 的選單頁面
    window.location.href = 'index.html';
}

// ========== 深色模式 ==========
function initTheme() {
    document.documentElement.setAttribute('data-theme', window.appEnhancements.currentTheme);
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
        themeBtn.textContent = window.appEnhancements.currentTheme === 'dark' ? '☀️' : '🌙';
        themeBtn.addEventListener('click', toggleTheme);
    }
}

function toggleTheme() {
    window.appEnhancements.currentTheme = window.appEnhancements.currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', window.appEnhancements.currentTheme);
    localStorage.setItem('theme', window.appEnhancements.currentTheme);
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
        themeBtn.textContent = window.appEnhancements.currentTheme === 'dark' ? '☀️' : '🌙';
    }
    if (typeof showNotification === 'function') {
        showNotification(`已切換至${window.appEnhancements.currentTheme === 'dark' ? '深色' : '淺色'}模式`, 'success');
    }
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
let currentWordList = []; // 將用於儲存符合條件的單字
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
    const params = new URLSearchParams(window.location.search);
    const show = params.get("show");
    const loadingOverlay = document.getElementById('loading-overlay');
    
    // 初始化主題
    initTheme();
    
    // 初始化麵包屑導航（初始為句子庫首頁）
    updateBreadcrumb(['選擇功能', '句子庫']);
    
    document.querySelectorAll('.collapsible-content').forEach(content => {
        content.style.maxHeight = '0px';
    });

document.querySelectorAll(".collapsible-header").forEach(button => {
    button.addEventListener("click", function() {
        this.classList.toggle("active");
        const content = this.nextElementSibling;
        if (content.style.maxHeight && content.style.maxHeight !== '0px') {
            content.style.maxHeight = '0px';
            
            // ▼▼▼【新增邏輯】▼▼▼
            // 當主分類收合時，尋找並收合所有次分類
            const subcategoryWrappers = content.querySelectorAll('.subcategory-wrapper');
            subcategoryWrappers.forEach(wrapper => {
                wrapper.style.maxHeight = '0px';
            });
            // ▲▲▲【新增結束】▲▲▲

        } else {
            content.style.maxHeight = content.scrollHeight + "px";
        }
    });
});

    Promise.all([
        fetch("https://boydyang-designer.github.io/English-vocabulary/audio_files/Z_total_words.json")
            .then(res => {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res.json();
            })
            .then(data => {
                // 相容兩種格式：物件或陣列
                wordsData = Array.isArray(data) ? data : (data["New Words"] || []);
                console.log("✅ Z_total_words.json 載入成功");
            }),
        fetch("https://boydyang-designer.github.io/English-vocabulary/Sentence%20file/sentence.json")
            .then(res => {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res.json();
            })
            .then(data => {
                // 相容兩種格式：物件或陣列
                sentenceData = Array.isArray(data) ? data : (data["New Words"] || []);
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

        // 處理單字資料
        wordsData.forEach(w => {
            // 如果沒有「分類」欄位，從「分類1/2/3」合併
            if (!w["分類"] && (w["分類1"] || w["分類2"] || w["分類3"])) {
                w["分類"] = [w["分類1"], w["分類2"], w["分類3"]].filter(Boolean);
            }
            // 確保分類是陣列
            if (typeof w["分類"] === "string") w["分類"] = [w["分類"]];
            else if (!Array.isArray(w["分類"])) w["分類"] = [];
        });

        // 處理句子資料
        sentenceData.forEach(s => {
            // 如果沒有「分類」欄位，從「分類1/2/3」合併
            if (!s["分類"] && (s["分類1"] || s["分類2"] || s["分類3"])) {
                s["分類"] = [s["分類1"], s["分類2"], s["分類3"]].filter(Boolean);
            }
            // 確保分類是陣列
            if (typeof s["分類"] === "string") s["分類"] = [s["分類"]];
            else if (!Array.isArray(s["分類"])) s["分類"] = [];
        });

        renderAlphabetButtons();
        createCategoryButtons();
        createLevelButtons();

        document.getElementById("startLearningBtn").addEventListener("click", startLearning);

        const urlParams = new URLSearchParams(window.location.search);
        const sentenceParam = urlParams.get('sentence');
        const fromParam = urlParams.get('from');
        const layerParam = urlParams.get('layer');
        const wordToShowSentencesFor = urlParams.get('showSentencesForWord');

        // ▼▼▼ 【新增】處理從 index.html 跳轉過來的請求 ▼▼▼
        if (wordToShowSentencesFor && fromParam === 'index') {
            isQuizMode = false;
            const relatedSentences = sentenceData.filter(s =>
                s.Words && s.Words.startsWith(wordToShowSentencesFor + "-")
            );

            if (relatedSentences.length > 0) {
                currentSentenceList = sortSentencesByWordAndNumber(relatedSentences);
                displaySentenceList(currentSentenceList, `${wordToShowSentencesFor} 的句子`);

                // 修改返回按鈕的行為，使其能返回到來源的單字內文頁面
                const backButton = document.querySelector('#sentenceList .back-button');
                if (backButton) {
                    backButton.onclick = () => {
                        window.location.href = `index.html?word=${encodeURIComponent(wordToShowSentencesFor)}`;
                    };
                }
            } else {
                showNotification(`⚠️ 找不到單字 "${wordToShowSentencesFor}" 的相關句子。`, 'error');
                backToFirstLayer(); // 如果沒有句子，返回主頁
            }
        } // ▲▲▲ 新增結束 ▲▲▲
        else if (sentenceParam && layerParam === '4') {
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

function toggleAndCheckHeader(btn) {
    toggleSelection(btn);
    updateCollapsibleHeaderState(btn);
}

function handleSentenceSubcategoryClick(subcatBtn, primaryBtnId) {
    toggleSelection(subcatBtn);
    const primaryBtn = document.getElementById(primaryBtnId);
    if (!primaryBtn) return;
    const subcategoryWrapper = subcatBtn.closest('.subcategory-wrapper');
    if (!subcategoryWrapper) return;
    const hasSelectedSubcategories = subcategoryWrapper.querySelector('.letter-btn.selected') !== null;
    if (hasSelectedSubcategories) {
        primaryBtn.classList.add('selected');
    } else {
        primaryBtn.classList.remove('selected');
    }
    updateCollapsibleHeaderState(primaryBtn);
}


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
                `<button class="letter-btn" data-value='${subCat}' onclick="handleSentenceSubcategoryClick(this, '${btn.id}')">${subCat}</button>`
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

// ▼▼▼【核心修改】函式已重寫 ▼▼▼
function startLearning() {
    const selectedLetters = Array.from(document.querySelectorAll('#alphabetButtons .letter-btn.selected')).map(btn => btn.dataset.value);
    const selectedPrimaries = Array.from(document.querySelectorAll('#primaryCategoryButtons .letter-btn.selected')).map(btn => btn.dataset.value);
    const selectedSecondaries = Array.from(document.querySelectorAll('.subcategory-wrapper .letter-btn.selected')).map(btn => btn.dataset.value);
    const selectedLevels = Array.from(document.querySelectorAll('#levelButtons .letter-btn.selected')).map(btn => btn.dataset.value);
    const selectedSpecials = Array.from(document.querySelectorAll('#specialCategoryButtons .letter-btn.selected')).map(btn => btn.dataset.value);

    // 步驟 1: 根據所有篩選條件，找出符合的「單字」
    let filteredWords = wordsData;

    // 單字屬性篩選
    if (selectedLetters.length > 0) {
        filteredWords = filteredWords.filter(w => selectedLetters.includes((w.Words || "").charAt(0).toLowerCase()));
    }
    if (selectedPrimaries.length > 0) {
        filteredWords = filteredWords.filter(w => selectedPrimaries.includes((w["分類"] && w["分類"][0]) || "未分類"));
    }
    if (selectedSecondaries.length > 0) {
        filteredWords = filteredWords.filter(w => {
             const primaryCat = (w["分類"] && w["分類"][0]) || "未分類";
             if (selectedPrimaries.length > 0 && !selectedPrimaries.includes(primaryCat)) return false;
             const secondaryCat = (w["分類"] && w["分類"][1]) || "未分類";
             return selectedSecondaries.includes(secondaryCat);
        });
    }
    if (selectedLevels.length > 0) {
        filteredWords = filteredWords.filter(w => selectedLevels.includes(w["等級"] || "未分類"));
    }
    if (selectedSpecials.includes('checked_word')) {
        filteredWords = filteredWords.filter(w => window.getVocabularyData().checkedWords?.[w.Words] === "true");
    }

    // 步驟 2: 根據這些單字，找出所有相關的句子
    const allowedWordNames = new Set(filteredWords.map(w => w.Words));
    let relatedSentences = sentenceData.filter(s => {
        const baseWord = s.Words.split('-').slice(0, -1).join('-');
        return allowedWordNames.has(baseWord);
    });

    // 步驟 3: 根據「句子相關」的特殊分類，進一步篩選這些句子
    const sentenceSpecialFilters = selectedSpecials.filter(s => s !== 'checked_word');
// 新的程式碼
if (sentenceSpecialFilters.length > 0) {
    const vocabData = window.getVocabularyData();
    relatedSentences = relatedSentences.filter(s => {
        return sentenceSpecialFilters.some(specialType => {
            switch (specialType) {
                case 'checked': return (vocabData.checkedSentences || {})[s.Words] === "true";
                case 'important': return (vocabData.importantSentences || {})[s.Words] === "true";
                case 'wrong': return (vocabData.wrongQS || []).includes(s.Words);
                case 'note': 
                    const note = (vocabData.noteSentences || {})[s.Words]; 
                    return note && note.trim() !== "";
                // ========== 卡牌練習分類篩選 ==========
                case 'flashcard-unknown':
                    // 篩選標記為「再練習」的句子
                    const flashcardHistory = vocabData.flashcardHistory?.sentence || {};
                    const histUnknown = flashcardHistory[s['句子']] || flashcardHistory[s.Words];
                    return histUnknown && histUnknown.unknown > 0;
                case 'flashcard-uncertain':
                    // 篩選標記為「不確定」的句子
                    const flashcardHistoryUncertain = vocabData.flashcardHistory?.sentence || {};
                    const histUncertain = flashcardHistoryUncertain[s['句子']] || flashcardHistoryUncertain[s.Words];
                    return histUncertain && histUncertain.uncertain > 0;
                case 'flashcard-known':
                    // 篩選標記為「記得！」的句子
                    const flashcardHistoryKnown = vocabData.flashcardHistory?.sentence || {};
                    const histKnown = flashcardHistoryKnown[s['句子']] || flashcardHistoryKnown[s.Words];
                    return histKnown && histKnown.known > 0;
                case 'flashcard-practiced':
                    // 篩選所有練習過的句子（seen > 0）
                    const flashcardHistoryPracticed = vocabData.flashcardHistory?.sentence || {};
                    const histPracticed = flashcardHistoryPracticed[s['句子']] || flashcardHistoryPracticed[s.Words];
                    return histPracticed && histPracticed.seen > 0;
                case 'my_custom':
                    return s.isCustom === true;
                default: return false;
            }
        });
    });
}

    // 步驟 4: 從最終的句子列表中，反向找出所有涉及的「單字」，並確保不重複
    const finalWordNames = [...new Set(relatedSentences.map(s => s.Words.split('-').slice(0, -1).join('-')))];
    const finalWords = finalWordNames.map(name => wordsData.find(w => w.Words === name)).filter(Boolean); // 轉換回單字物件

    if (finalWords.length === 0) {
        showNotification("⚠️ 找不到符合條件的單字。", "error");
        return;
    }
    
    // 步驟 5: 顯示單字選擇列表，而不是句子列表
    displayWordSelectionList(finalWords);
}


function displayWordSelectionList(words) {
    document.getElementById("mainPageContainer").style.display = "none";
    document.getElementById("wordListTitle").textContent = `勾選單字 (${words.length}個)`;
    document.getElementById("wordListTitle").style.display = "block";

    const wordListContainer = document.getElementById('wordList');
    wordListContainer.style.display = "block";
    
    const wordItemsContainer = document.getElementById('wordItems');
    wordItemsContainer.innerHTML = ''; // 清空舊內容

    currentWordList = words;

    words.forEach(word => {
        const wordText = word.Words;
        // 檢查此單字是否已被勾選
        const isChecked = window.getVocabularyData().checkedSentenceWords?.[wordText] === "true";
        const checkedClass = isChecked ? "checked" : "";
        const checkIconSrc = isChecked 
            ? "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/checked-icon.svg" 
            : "https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/check-icon.svg";

        const item = document.createElement('div');
        item.className = `word-item-container ${checkedClass}`;
        // 加入 check-button
        item.innerHTML = `
            <input type="checkbox" class="word-select-checkbox" data-word="${wordText}" style="transform: scale(2.2); margin-right: 15px;">
            <p class='word-item' style="color: #333; cursor: default; flex-grow: 1;">${wordText}</p>
            <button class='check-button' onclick='toggleSentenceWordChecked("${wordText}", this)'>
                <img src="${checkIconSrc}" class="check-icon" alt="Check" width="24" height="24">
            </button>
        `;
        wordItemsContainer.appendChild(item);
    });

    const showSentencesBtn = document.getElementById('showSelectedSentencesBtn');
    showSentencesBtn.style.display = 'block';
    showSentencesBtn.onclick = processWordSelection;
    
    // 更新麵包屑導航
    updateBreadcrumb(['選擇功能', '句子庫', '選擇單字']);
}

function toggleSentenceWordChecked(word, button) {
    let vocabularyData = window.getVocabularyData();
    let checkedSentenceWords = vocabularyData.checkedSentenceWords || {};
    const key = word;
    const isChecked = checkedSentenceWords[key] === "true";
    const newState = !isChecked;
    if (newState) {
        checkedSentenceWords[key] = "true";
    } else {
        delete checkedSentenceWords[key];
    }
    window.setCheckedSentenceWords(checkedSentenceWords);
    window.persistVocabularyData();
    // ... (UI 更新)
}


function processWordSelection() {
    const selectedCheckboxes = document.querySelectorAll('.word-select-checkbox:checked');
    if (selectedCheckboxes.length === 0) {
        showNotification("請至少選擇一個單字。", "error");
        return;
    }

    const selectedWords = new Set(Array.from(selectedCheckboxes).map(cb => cb.dataset.word));

    const finalSentences = sentenceData.filter(s => {
        const baseWord = s.Words.split('-').slice(0, -1).join('-');
        return selectedWords.has(baseWord);
    });

    if (finalSentences.length === 0) {
        showNotification("⚠️ 選擇的單字沒有對應的句子。", "error");
        return;
    }

    currentSentenceList = sortSentencesByWordAndNumber(finalSentences);
    displaySentenceList(currentSentenceList, "句子列表");
}



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
            // ▼▼▼【新增】為按鈕加上唯一 ID ▼▼▼
            btn.id = `sentence-primary-btn-${category.replace(/\s/g, '-')}`;
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
        { name: "Checked 單字", value: "checked_word" },
        // ========== 卡牌練習分類 ==========
        { name: "❌ 再練習", value: "flashcard-unknown" },
        { name: "❓ 不確定", value: "flashcard-uncertain" },
        { name: "✅ 記得！", value: "flashcard-known" },
        { name: "🃏 已練習", value: "flashcard-practiced" }
    ];
    const specialContainer = document.getElementById("specialCategoryButtons");
    if (specialContainer) {
        const wrapper = document.createElement('div');
        wrapper.className = 'button-wrapper';
        // ▼▼▼【修改】更改 onclick 事件 ▼▼▼
        wrapper.innerHTML = specialCategories.map(c => 
           `<button class='letter-btn' data-value='${c.value}' onclick='toggleAndCheckHeader(this)'>${c.name}</button>`
        ).join(" ");
        specialContainer.appendChild(wrapper);
    }
}

function createLevelButtons() {
    if (!wordsData || !Array.isArray(wordsData)) return;

    const allLevels = new Set(wordsData.map(w => w["等級"] || "未分類"));
    const standardLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', '未分類'].filter(l => allLevels.has(l));

    const levelContainer = document.getElementById("levelButtons");
    if(levelContainer){
        const wrapper = document.createElement('div');
        wrapper.className = 'button-wrapper';
        // ▼▼▼【修改】更改 onclick 事件 ▼▼▼
        wrapper.innerHTML = standardLevels
            .map(l => `<button class='letter-btn' data-value='${l}' onclick='toggleAndCheckHeader(this)'>${l}</button>`).join(" ");
        levelContainer.appendChild(wrapper);
    }
}

function renderAlphabetButtons() {
    const alphabetContainer = document.getElementById("alphabetButtons");
    if (!alphabetContainer) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'button-wrapper';
    // ▼▼▼【修改】更改 onclick 事件 ▼▼▼
    wrapper.innerHTML = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")
        .map(letter => `<button class='letter-btn' data-value='${letter.toLowerCase()}' onclick='toggleAndCheckHeader(this)'>${letter}</button>`)
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
    document.getElementById("wordList").style.display = "none"; // 隱藏單字選擇列表
    document.getElementById("wordListTitle").innerHTML = `
        <span>${title} (${sentences.length}句)</span>
        <button id="autoPlayBtn" onclick="toggleAutoPlay()">自動播放</button>
    `;
    document.getElementById("wordListTitle").style.display = "block";
    
    const sentenceList = document.getElementById('sentenceList');
    sentenceList.style.display = "block";

    // ▼▼▼【修改】返回按鈕的行為 ▼▼▼
    const backButton = document.querySelector('#sentenceList .back-button');
    backButton.style.display = "block";
    // 根據來源決定返回行為，如果不是從 index.html 來，則使用預設行為
    const fromIndex = new URLSearchParams(window.location.search).get('from') === 'index';
    if (!fromIndex) {
        backButton.onclick = backToWordSelectionList; // 指向舊的返回函式
    }
    // 從 index.html 過來的返回行為已在 DOMContentLoaded 中設定
    // ▲▲▲ 修改結束 ▲▲▲

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
    : `${sentenceId}:<br>${sentence.句子}`;
        
        const customBadge = (typeof getCustomBadge === 'function') ? getCustomBadge(sentence) : '';

        container.innerHTML = `
            <input type='checkbox' class='important-checkbox' onchange='toggleImportantSentence("${sentenceId}", this)' ${isImportant ? "checked" : ""}>
            <p class='word-item' data-sentence="${sentenceId}">${sentenceDisplay}${customBadge}</p>
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
    
    // 更新麵包屑導航
    updateBreadcrumb(['選擇功能', '句子庫', '句子列表']);
}


// ▼▼▼【新增】函式 ▼▼▼
/**
 * 從句子列表返回到單字選擇列表。
 */
function backToWordSelectionList() {
    document.getElementById('sentenceList').style.display = 'none';
    document.getElementById('wordList').style.display = 'block';
    document.getElementById("wordListTitle").textContent = `勾選單字 (${currentWordList.length}個)`;
    document.getElementById("wordListTitle").style.display = 'block';
    
    // 更新麵包屑導航
    updateBreadcrumb(['選擇功能', '句子庫', '選擇單字']);
}

// 新增函數：從句子詳情返回句子列表
function backToSentenceList(event) {
    if (event) event.preventDefault();
    
    document.getElementById('sentenceDetails').style.display = 'none';
    document.getElementById('sentenceList').style.display = 'block';
    document.getElementById("wordListTitle").style.display = 'block';
    
    // 更新麵包屑導航
    updateBreadcrumb(['選擇功能', '句子庫', '句子列表']);
}
// ▲▲▲ 新增結束 ▲▲▲

function backToFirstLayer() {
    document.getElementById("mainPageContainer").style.display = "block";
    
    document.getElementById("wordList").style.display = "none";
    document.getElementById("sentenceList").style.display = "none";
    document.getElementById("sentenceDetails").style.display = "none";
    document.getElementById("wordListTitle").style.display = "none";
    
    document.getElementById("searchInput").value = "";
    let searchResults = document.getElementById("searchResults");
    if (searchResults) searchResults.innerHTML = "";

    // 隱藏「新增句子到此單字」按鈕
    if (typeof hideAddSentenceInListBtn === 'function') hideAddSentenceInListBtn();

    document.querySelectorAll('.letter-btn.selected').forEach(btn => btn.classList.remove('selected'));

    
    document.querySelectorAll('.subcategory-wrapper').forEach(wrapper => wrapper.remove());
    
    document.querySelectorAll('.collapsible-header.active').forEach(header => {
        header.classList.remove('active');
        header.nextElementSibling.style.maxHeight = '0px';
    });
    
    // 更新麵包屑為句子庫首頁
    updateBreadcrumb(['選擇功能', '句子庫']);
}

// ... 此處省略部分未變更的程式碼 ...
// showSentences, filterSentences, getAutoPlayBtn, toggleAutoPlay, startAutoPlay, stopAutoPlay,
// playNextWord, playNextSentence, playCurrentSentence, updateAutoPlayButton,
// toggleCheckSentence, toggleImportantSentence, showSentenceDetails, playAudio,
// switchToPreviousSentence, switchToNextSentence, playSentenceAudio, togglePauseAudio,
// adjustAudioTime, filterSentencesInDetails, saveNote, displayNote, updateCheckbox,
// handleCheckboxClick, exportAllData, importAllData, backToSentenceList
// 以上函式保持不變，為節省篇幅予以省略，您無需修改它們。
// 請將這段更新的程式碼，替換掉 sentence.js 從頭到 backToFirstLayer 之前的所有內容。
// backToFirstLayer 之後的程式碼保持原樣。

// 為確保完整性，此處提供完整的、未省略的JS檔案內容
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
            
            const customBadge = (typeof getCustomBadge === 'function') ? getCustomBadge(s) : '';

            let item = document.createElement("div");
            item.className = `word-item-container ${isChecked ? "checked" : ""}`;
            item.innerHTML = `
                <input type='checkbox' class='important-checkbox' onchange='toggleImportantSentence("${sentenceId}", this)' ${isImportant ? "checked" : ""}>
                <p class='word-item' data-sentence="${sentenceId}">${sentenceDisplay}${customBadge}</p>
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
    
    // 顯示「新增句子到此單字」按鈕
    if (typeof showAddSentenceInListBtn === 'function') {
        showAddSentenceInListBtn(word);
    }
}

function filterSentences() {
    let input = document.getElementById("searchInput").value.toLowerCase();
    if (!wordsData.length) return;

    let filtered = wordsData.filter(w => w.Words.toLowerCase().startsWith(input));
    let searchResults = document.getElementById("searchResults") || document.createElement("div");
    searchResults.id = "searchResults";
    if (input === "") {
        if(searchResults.parentNode) searchResults.parentNode.removeChild(searchResults);
        return;
    }

    searchResults.innerHTML = filtered.length > 0
        ? filtered.map(w => `<p class='word-item' onclick='showSentences("${w.Words}")'>${w.Words}</p>`).join("")
        : "<p>⚠️ 沒有符合的單字</p>";
    if(!document.getElementById("searchResults")) {
        document.getElementById("searchContainer").appendChild(searchResults);
    }
}

function getAutoPlayBtn() {
    const btn1 = document.getElementById("autoPlayBtn");
    const btn2 = document.getElementById("autoPlayBtnDetails");
    if (btn2 && btn2.offsetParent !== null) return btn2;
    if (btn1 && btn1.offsetParent !== null) return btn1;
    return btn1 || btn2;
}



/*** [新增] 暫停自動播放的函式*/
function pauseAutoPlay() {
    isPaused = true;
    sentenceAudio.pause(); // 暫停當前正在播放的音訊
    updateAutoPlayButton(); // 更新按鈕狀態
}

/*** [新增] 繼續自動播放的函式*/
function resumeAutoPlay() {
    isPaused = false;
    // 如果音訊物件存在且處於暫停狀態，則繼續播放
    if (sentenceAudio && sentenceAudio.paused) {
        sentenceAudio.play().catch(e => {
            console.error("從暫停狀態恢復播放失敗:", e);
            // 如果播放失敗，嘗試播放下一個句子
            currentSentenceIndex++;
            playNextSentenceInList();
        });
    }
    updateAutoPlayButton(); // 更新按鈕狀態
}


/*** [修改] 切換自動播放狀態的核心函式* 現在它能處理三種狀態：播放、暫停、繼續*/
function toggleAutoPlay() {
    // 檢查目前是否在句子列表頁面
    if (document.getElementById("sentenceList").style.display === "block") {
        if (!isAutoPlaying) {
            // 如果尚未開始，則啟動自動播放
            startAutoPlay();
        } else if (!isPaused) {
            // 如果正在播放，則暫停
            pauseAutoPlay();
        } else {
            // 如果已暫停，則繼續播放
            resumeAutoPlay();
        }
    } else {
        // 對於其他頁面（如詳情頁），保持原有的開/關邏輯
        if (isAutoPlaying) {
            stopAutoPlay();
        } else {
            startAutoPlay();
        }
    }
}

/**
 * [修改] 停止自動播放函式
 * 確保 isPaused 狀態也被重置
 */
function stopAutoPlay() {
    isAutoPlaying = false;
    isPaused = false; // 確保暫停狀態也被清除
    sentenceAudio.pause();
    
    // 取消高亮
    const playingItem = document.querySelector('.word-item-container.playing');
    if (playingItem) {
        playingItem.classList.remove('playing');
    }

    updateAutoPlayButton();
}



function startAutoPlay() {
    const autoPlayBtn = getAutoPlayBtn();
    if (!autoPlayBtn) return;
    isAutoPlaying = true;

    if (document.getElementById("wordList").style.display === "block") {
        // Since word list is now for selection, auto play might not make sense here.
        // Or it could auto-select and move to the next step. For now, let's disable it for this view.
        showNotification("自動播放不適用於單字選擇頁面。", "error");
        stopAutoPlay();
        return;

    } else if (document.getElementById("sentenceList").style.display === "block") {
        currentSentenceIndex = 0;
        playNextSentenceInList();

    } else if (document.getElementById("sentenceDetails").style.display === "block") {
        playCurrentSentence();
    }

    updateAutoPlayButton();
}



function playNextSentenceInList() {
    if (!isAutoPlaying || isPaused) return;

    if (currentSentenceIndex >= currentSentenceList.length) {
        stopAutoPlay();
        return;
    }

    const sentenceId = currentSentenceList[currentSentenceIndex].Words;
    const itemElement = document.querySelector(`.word-item[data-sentence="${sentenceId}"]`);
    
    // Highlight and scroll
    document.querySelectorAll('.word-item-container.playing').forEach(el => el.classList.remove('playing'));
    if (itemElement) {
        const container = itemElement.closest('.word-item-container');
        container.classList.add('playing');
        container.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    playSentenceAudio(`${sentenceId}.mp3`);
    sentenceAudio.onended = () => {
        currentSentenceIndex++;
        playNextSentenceInList();
    };
}


function playCurrentSentence() {
    if (!isAutoPlaying || isPaused) return;
    const sentenceId = currentSentenceList[currentSentenceIndex].Words;
    playSentenceAudio(`${sentenceId}.mp3`);
    sentenceAudio.onended = () => {
        switchToNextSentence(); // This will auto-play the next sentence detail
    };
}


function updateAutoPlayButton() {
    const autoPlayBtn = getAutoPlayBtn();
    if (!autoPlayBtn) return;

    // 判斷是否在句子列表頁面，以應用新的按鈕文字邏輯
    if (document.getElementById("sentenceList").style.display === "block") {
        if (!isAutoPlaying) {
            autoPlayBtn.textContent = "自動播放";
            autoPlayBtn.classList.remove("auto-playing");
        } else {
            if (isPaused) {
                autoPlayBtn.textContent = "繼續播放";
                autoPlayBtn.classList.remove("auto-playing"); // 暫停時不高亮
            } else {
                autoPlayBtn.textContent = "暫停播放";
                autoPlayBtn.classList.add("auto-playing");
            }
        }
    } else {
        // 其他頁面（如詳情頁）的按鈕文字邏輯保持不變
        autoPlayBtn.textContent = isAutoPlaying ? "取消播放" : "自動播放";
        autoPlayBtn.classList.toggle("auto-playing", isAutoPlaying);
    }
}

function toggleCheckSentence(sentenceId, button) {
    let vocabularyData = window.getVocabularyData();
    let checkedSentences = vocabularyData.checkedSentences || {};
    const isChecked = checkedSentences[sentenceId] === "true";
    const newState = !isChecked;
    if (newState) {
        checkedSentences[sentenceId] = "true";
    } else {
        delete checkedSentences[sentenceId];
    }
    window.setCheckedSentences(checkedSentences); // 使用新的 setter
    window.persistVocabularyData(); // 觸發儲存
    // ... 後續的 UI 更新邏輯 ...
}

function toggleImportantSentence(sentenceId, checkbox) {
    let vocabularyData = window.getVocabularyData();
    let importantSentences = vocabularyData.importantSentences || {};
    if (checkbox.checked) {
        importantSentences[sentenceId] = "true";
    } else {
        delete importantSentences[sentenceId];
    }
    window.setImportantSentences(importantSentences); // 使用新的 setter
    window.persistVocabularyData(); // 觸發儲存
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
    const isCustomSentence = sentenceObj.isCustom === true;
    const customIndicator = isCustomSentence 
        ? `<span class="custom-badge" style="margin-left:8px;" onclick="openEditCustomModal('${sentenceId}')" title="點擊編輯" style="cursor:pointer;">🖊️ 自訂</span>`
        : '';
    let header = `
    <div class="phonetics-container">
        <input type='checkbox' class='important-checkbox' onchange='toggleImportantSentence("${sentenceId}", this)' ${window.getVocabularyData().importantSentences?.[sentenceId] === "true" ? "checked" : ""}>
        <div id="sentenceTitle" style="font-size: 20px; font-weight: bold;">${sentenceId}${customIndicator}</div>
        <button id="autoPlayBtnDetails" onclick="toggleAutoPlay()">自動播放</button>
    </div>`;
    let phonetics = wordObj ? 
        ((wordObj["pronunciation-1"] ? `<button class='button' onclick='playAudio("${word}.mp3")'>${wordObj["pronunciation-1"]}</button>` : "") +
        (wordObj["pronunciation-2"] ? `<button class='button' onclick='playAudio("${word}-2.mp3")'>${wordObj["pronunciation-2"]}</button>` : "") || "<p>No pronunciation available</p>") : 
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

    displayNote(sentenceId);

    document.getElementById("sentenceList").style.display = "none";
    document.getElementById("wordList").style.display = "none";
    document.getElementById("sentenceDetails").style.display = "block";
    document.getElementById("wordListTitle").style.display = "none";
    document.getElementById("mainPageContainer").style.display = "none";

    if (direction) {
        setTimeout(() => {
            detailsArea.classList.remove("sliding-in-from-right", "sliding-in-from-left");
        }, 10);
    }
    
    if(isAutoPlaying) {
        playCurrentSentence();
    } else {
        updateAutoPlayButton();
    }
    
    // 更新麵包屑導航
    updateBreadcrumb(['選擇功能', '句子庫', '句子列表', sentenceId]);
}

let wordAudio = new Audio();
function playAudio(filename) {
    wordAudio.src = `https://github.com/BoydYang-Designer/English-vocabulary/raw/main/audio_files/${filename}`;
    wordAudio.play();
}

function switchToPreviousSentence() {
    if (currentSentenceIndex > 0) {
        currentSentenceIndex--;
        showSentenceDetails(currentSentenceList[currentSentenceIndex].Words, currentSentenceIndex, "from-left");
    }
}

function switchToNextSentence() {
    if (currentSentenceIndex < currentSentenceList.length - 1) {
        currentSentenceIndex++;
        showSentenceDetails(currentSentenceList[currentSentenceIndex].Words, currentSentenceIndex, "from-right");
    } else {
        if(isAutoPlaying) stopAutoPlay();
    }
}

function playSentenceAudio(filename) {
    console.log("開始播放:", filename);
    const playButtons = document.querySelectorAll(`.audio-btn[onclick*="'${filename}'"]`);
    const playBtn = playButtons[playButtons.length - 1] || document.getElementById("playAudioBtn");
    
    if (sentenceAudio && !sentenceAudio.paused) {
        sentenceAudio.pause();
        if(lastPlayBtn) lastPlayBtn.classList.remove("playing");
    }

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
            // 【關鍵修改】如果播放失敗且處於自動播放模式，直接跳到下一個
            if (isAutoPlaying && !isPaused) {
                if (document.getElementById("sentenceDetails").style.display === 'block') {
                    switchToNextSentence();
                } else {
                    currentSentenceIndex++;
                    playNextSentenceInList();
                }
            }
        });

    sentenceAudio.onended = () => {
        if (playBtn) playBtn.classList.remove("playing");
        console.log(`✅ ${filename} 播放結束`);
        // 播放結束後，如果處於自動播放模式，則播放下一個
        if (isAutoPlaying && !isPaused) {
             if (document.getElementById("sentenceDetails").style.display === 'block') {
                switchToNextSentence();
            } else {
                currentSentenceIndex++;
                playNextSentenceInList();
            }
        }
    };
    
    document.querySelectorAll(".audio-btn.playing").forEach(btn => {
        if (btn !== playBtn) btn.classList.remove("playing");
    });
}

function togglePauseAudio(button) {
    const pauseBtn = button;
    const playIcon  = '<img src="https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/play-circle.svg"  alt="Play"  width="24" height="24"/>';
    const pauseIcon = '<img src="https://raw.githubusercontent.com/BoydYang-Designer/English-vocabulary/main/Svg/pause.svg" alt="Pause" width="24" height="24"/>';

    if (sentenceAudio.paused || sentenceAudio.ended) {
        isPaused = false;
        sentenceAudio.play();
        pauseBtn.innerHTML = pauseIcon;
        if (lastPlayBtn) lastPlayBtn.classList.add("playing");
    } else {
        isPaused = true;
        sentenceAudio.pause();
        pauseBtn.innerHTML = playIcon;
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

    if (!sentenceId) return;

    let vocabularyData = window.getVocabularyData();
    let noteSentences = vocabularyData.noteSentences || {};

    if (note.length > 0) {
        noteSentences[sentenceId] = note;
        showNotification("✅ 筆記已儲存！", "success");
    } else {
        delete noteSentences[sentenceId];
        showNotification("🗑️ 筆記已刪除。", "success");
    }

    window.setNoteSentences(noteSentences); // 使用新的 setter
    window.persistVocabularyData(); // 觸發儲存
    updateCheckbox();
}

function displayNote(sentenceId) {
    let note = window.getVocabularyData().noteSentences?.[sentenceId] || "";
    document.getElementById("sentenceNote").value = note;
    updateCheckbox();
}

function updateCheckbox() {
    let note = document.getElementById("sentenceNote").value.trim();
    document.getElementById("noteCheckbox").checked = note.length > 0;
}

function handleCheckboxClick() {
    let checkbox = document.getElementById("noteCheckbox");
    if (!checkbox.checked) {
       let sentenceId = document.getElementById("sentenceTitle")?.textContent.trim();
       if(sentenceId) {
           let vocabularyData = window.getVocabularyData();
           let noteSentences = vocabularyData.noteSentences || {};
           delete noteSentences[sentenceId];
           window.setNoteSentences(noteSentences);
           window.persistVocabularyData();
           document.getElementById("sentenceNote").value = "";
           showNotification("🗑️ 筆記已刪除。", "success");
       }
    }
}

function exportAllData() {
    try {
        const vocabularyData = window.getVocabularyData();
        const jsonString = JSON.stringify(vocabularyData, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "my_english_learning_backup.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showNotification("✅ 資料匯出成功！", "success");
    } catch (error) {
        showNotification("❌ 資料匯出失敗！", "error");
        console.error("Export failed:", error);
    }
}


function importAllData() {
    let fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".json";
    fileInput.onchange = function (event) {
        let file = event.target.files[0];
        if (!file) return;
        let reader = new FileReader();
        reader.onload = function (e) {
            try {
                let importedData = JSON.parse(e.target.result);
                // 更新全域 vocabularyData
                Object.assign(window.getVocabularyData(), importedData);
                window.persistVocabularyData();  // 立即持久化
                showNotification("✅ 資料匯入成功！頁面將會重整。", "success");
                setTimeout(() => location.reload(), 1500);
            } catch (error) {
                showNotification("❌ 檔案格式錯誤或內容損毀！", "error");
                console.error("Import failed:", error);
            }
        };
        reader.readAsText(file);
    };
    fileInput.click();
}

function backToSentenceList(event) {
    if(event) event.stopPropagation();

    if (isAutoPlaying) {
        stopAutoPlay();
    }
    
    sentenceAudio.pause();

    document.getElementById("sentenceDetails").style.display = "none";

    const urlParams = new URLSearchParams(window.location.search);
    const fromParam = urlParams.get('from');

    if (fromParam === 'quiz' || isQuizMode) {
        window.location.href = "quiz.html?returning=true";
    } else {
        document.getElementById("sentenceList").style.display = "block";
        document.getElementById("wordListTitle").style.display = "block";
    }
}