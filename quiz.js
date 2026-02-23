// ===============================================
// quiz.js - 修復版本 v2.0
// 修復內容：
// 1. 移除重複的toggleSelection函數定義
// 2. 統一資料格式（全部使用物件存儲）
// 3. 改善錯誤處理和用戶反饋
// 4. 修復空白鍵快捷鍵衝突
// 5. 優化折疊面板高度計算
// ===============================================

let selectedCategory = null;
let selectedFilters = {
    letters: new Set(),
    primaryCategories: new Set(),
    secondaryCategories: new Set(),
    levels: new Set(),
    checked: false,
    important: false,
    wrong: false
};
let wordsData = [];
let quizWords = [];
let currentWord = null;
let isDataLoaded = false;
let quizResults = [];
const baseURL = "https://github.com/BoydYang-Designer/English-vocabulary/raw/main/audio_files/";

let wordQuizHistory = {};

// Listen for the 'auth-ready' event from auth-manager.js
document.addEventListener('auth-ready', function() {
    console.log("Auth is ready on quiz page.");
    const vocabulary = window.getVocabularyData();
    wordQuizHistory = vocabulary.wordQuizHistory || {};
    console.log("📖 Loaded word quiz history:", Object.keys(wordQuizHistory).length, "records");
});


document.addEventListener("DOMContentLoaded", function () {
    const loadingOverlay = document.getElementById('loadingOverlay');
    const params = new URLSearchParams(window.location.search);
    const show = params.get("show");

    document.querySelectorAll('.filter-content').forEach(content => {
        content.style.maxHeight = '0px';
    });
    
    const sentenceButton = document.getElementById("sentencePageBtn");
    if (sentenceButton) {
        sentenceButton.addEventListener("click", function () {
            window.location.href = "sentence.html";
        });
    }

    fetch("https://boydyang-designer.github.io/English-vocabulary/audio_files/Z_total_words.json")
        .then(res => {
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res.json();
        })
        .then(data => {
            // 相容兩種格式：物件或陣列
            wordsData = Array.isArray(data) ? data : (data["New Words"] || []);
            
            wordsData.forEach(w => {
                // 如果沒有「分類」欄位，從「分類1/2/3」合併
                if (!w["分類"] && (w["分類1"] || w["分類2"] || w["分類3"])) {
                    w["分類"] = [w["分類1"], w["分類2"], w["分類3"]].filter(Boolean);
                }
                // 確保分類是陣列
                if (typeof w["分類"] === "string") {
                    w["分類"] = [w["分類"]];
                } else if (!Array.isArray(w["分類"])) {
                    w["分類"] = [];
                }
            });
            window.wordsData = wordsData; // 🔧 修復：讓 flashcard.js 可透過 window.wordsData 存取
            isDataLoaded = true;
            console.log("✅ 單字資料已載入，已掛載至 window.wordsData，共", wordsData.length, "筆");
            
            showToast("✅ 資料載入成功！", "success");

            if (params.get('returning') === 'true' && localStorage.getItem("currentQuizResults")) {
                quizResults = JSON.parse(localStorage.getItem("currentQuizResults"));
                restoreQuizResults();
            } else if (show === "categories") {
                showQuizCategories();
            } else if (show === "sentenceCategories") {
                showSentenceQuizCategories();
            }
        })
        .catch(err => {
            console.error("❌ 讀取 JSON 失敗:", err);
            showToast("⚠️ 無法載入單字資料，請檢查網路連線。", "error");
        })
        .finally(() => {
            if (loadingOverlay) {
                loadingOverlay.style.opacity = '0';
                setTimeout(() => {
                    loadingOverlay.style.display = 'none';
                }, 500);
            }
        });

    initializeStartQuizButton();

    // ===== 空白鍵快捷鍵：只在「單字測驗區 quizArea」顯示時觸發 =====
    document.addEventListener("keydown", function(event) {
        const isInputField = event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA';

        // 播放音檔 (空白鍵) — 僅限 quizArea（單字測驗），其餘測驗區有自己的 listener
        if ((event.key === " " || event.key === "Spacebar") && !isInputField) {
            const quizArea = document.getElementById('quizArea');
            const isQuizAreaActive = quizArea && quizArea.style.display === 'block';
            if (isQuizAreaActive) {
                event.preventDefault();
                if (currentWord) {
                    playAudioForWord(currentWord);
                }
            }
        }
        // 提交或下一題 (Enter 鍵)
        else if (event.key === 'Enter') {
            const quizArea = document.getElementById('quizArea');
            if (quizArea && quizArea.style.display === 'block') {
                event.preventDefault();
                const submitBtn = document.getElementById('submitBtn');
                const nextBtn = document.getElementById('nextBtn');

                if (submitBtn && submitBtn.style.display !== 'none') {
                    submitBtn.click();
                } else if (nextBtn && nextBtn.style.display !== 'none') {
                    nextBtn.click();
                }
            }
        }
    });
});

// 更新可折疊區塊標題的高亮狀態
function updateCollapsibleHeaderState(btn) {
    const contentWrapper = btn.closest('.collapsible-content');
    if (!contentWrapper) return;
    const header = contentWrapper.previousElementSibling;
    if (!header || !header.classList.contains('collapsible-header')) return;
    const hasSelectedChildren = contentWrapper.querySelector('.category-button.selected') !== null;
    if (hasSelectedChildren) {
        header.classList.add('header-highlight');
    } else {
        header.classList.remove('header-highlight');
    }
}

// 處理次分類按鈕點擊，更新主分類按鈕及區塊標題狀態
function handleQuizSubcategoryClick(subcatBtn, primaryBtnId) {
    toggleSelection(subcatBtn, 'secondaryCategories', subcatBtn.textContent);

    const primaryBtn = document.getElementById(primaryBtnId);
    if (!primaryBtn) return;

    const subcategoryWrapper = subcatBtn.closest('.subcategory-wrapper');
    if (!subcategoryWrapper) return;

    const hasSelectedSubcategories = subcategoryWrapper.querySelector('.category-button.selected') !== null;
    if (hasSelectedSubcategories) {
        primaryBtn.classList.add('selected');
    } else {
        primaryBtn.classList.remove('selected');
    }
    updateCollapsibleHeaderState(primaryBtn);
}

function handleQuizPrimaryCategoryClick(btn, categoryName) {
    let subcategoryWrapper = document.getElementById(`sub-for-quiz-${categoryName.replace(/\s/g, '-')}`);

    // 如果次分類容器不存在，創建它
    if (!subcategoryWrapper) {
        subcategoryWrapper = document.createElement('div');
        subcategoryWrapper.className = 'subcategory-wrapper';
        subcategoryWrapper.id = `sub-for-quiz-${categoryName.replace(/\s/g, '-')}`;
        subcategoryWrapper.style.maxHeight = '0px';

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
            subcategoryWrapper.innerHTML = secondaryCategories.map(subCat => 
                `<button class="category-button" onclick="handleQuizSubcategoryClick(this, '${btn.id}')">${subCat}</button>`
            ).join('');
        }
        
        btn.parentNode.insertBefore(subcategoryWrapper, btn.nextSibling);
    }

    // 切換次分類的展開/收合狀態
    const isExpanded = subcategoryWrapper.classList.contains('expanded');
    
    if (isExpanded) {
        // 收合次分類
        subcategoryWrapper.classList.remove('expanded');
        subcategoryWrapper.style.maxHeight = '0px';
    } else {
        // 展開次分類
        subcategoryWrapper.classList.add('expanded');
        subcategoryWrapper.style.maxHeight = subcategoryWrapper.scrollHeight + "px";
    }

    // 更新父容器（.filter-content）的高度
    // 延遲執行以確保次分類的高度變化已經開始
    setTimeout(() => {
        const parentFilterContent = btn.closest('.filter-content');
        if (parentFilterContent) {
            // 暫時移除高度限制以計算真實高度
            const currentMaxHeight = parentFilterContent.style.maxHeight;
            parentFilterContent.style.maxHeight = 'none';
            const newHeight = parentFilterContent.scrollHeight;
            parentFilterContent.style.maxHeight = currentMaxHeight;
            
            // 更新為新的高度
            setTimeout(() => {
                parentFilterContent.style.maxHeight = newHeight + 'px';
            }, 10);
        }
    }, 50);
}

function toggleSpecialFilterAndCheckHeader(btn, filterType) {
    selectedFilters[filterType] = !selectedFilters[filterType];
    btn.classList.toggle('selected');
    updateCollapsibleHeaderState(btn);
}

function generateMultiSelectButtons() {
    let alphabetContainer = document.getElementById("alphabetButtons");
    if(alphabetContainer) {
        alphabetContainer.innerHTML = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(letter =>
            `<button class='category-button' onclick='toggleSelection(this, "letters", "${letter}")'>${letter}</button>`
        ).join("");
    }

    let primaryCategories = [...new Set(wordsData.map(w => (w["分類"] && w["分類"][0]) || "未分類").filter(c => c))];
    let primaryContainer = document.getElementById("primaryCategoryButtons");
    if(primaryContainer) {
        const buttonsHtml = primaryCategories.map(c => {
            const btnId = `quiz-primary-btn-${c.replace(/\s/g, '-')}`;
            return `<button id="${btnId}" class='category-button' onclick='handleQuizPrimaryCategoryClick(this, "${c}")'>${c}</button>`;
        }).join(" ");
        // 包一層 div 以符合 .filter-content > div 的 CSS 結構
        primaryContainer.innerHTML = `<div>${buttonsHtml}</div>`;
    }
    
    let specialContainer = document.getElementById("specialCategoryButtons");
    if(specialContainer) {
        specialContainer.innerHTML = `
            <button class='category-button' onclick="toggleSpecialFilterAndCheckHeader(this, 'checked')">Checked 單字</button>
            <button class='category-button' onclick="toggleSpecialFilterAndCheckHeader(this, 'important')">重要單字</button>
            <button class='category-button' onclick="toggleSpecialFilterAndCheckHeader(this, 'wrong')">錯誤單字</button>
        `;
    }

    if (!wordsData || !Array.isArray(wordsData)) return;
    const allLevels = new Set(wordsData.map(w => w["等級"] || "未分類"));
    const standardLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', '未分類'].filter(l => allLevels.has(l));

    let levelContainer = document.getElementById("levelButtons");
    if(levelContainer) {
        levelContainer.innerHTML = standardLevels.map(l => 
            `<button class='category-button' onclick='toggleSelection(this, "levels", "${l}")'>${l}</button>`
        ).join("");
    }
}

// ===== 修復：音檔錯誤處理改善 =====
function playAudioForWord(word) {
    let audioLink = `${baseURL}${encodeURIComponent(word)}.mp3`;
    let audio = new Audio(audioLink);
    audio.play().catch((error) => {
        console.error("❌ 播放音檔失敗:", error);
        showToast(`⚠️ 無法播放音檔: ${word}`, "warning");
    });
}

function goBack() {
    window.location.href = "index.html";
}

function returnToSourcePage() {
    const params = new URLSearchParams(window.location.search);
    const from = params.get("from");

    if (from === "sentence") {
        window.location.href = "sentence.html";
    } else if (from === "index") {
        window.location.href = "index.html";
    } else {
        returnToMainMenu();
    }
}

function returnToCategorySelection() {
    document.getElementById("quizArea").style.display = "none";
    document.getElementById("rewordQuizArea").style.display = "none";
    document.getElementById("quizCategories").style.display = "block";
    
    const quizTypeSelector = document.querySelector(".quiz-type-selector");
    if (quizTypeSelector) {
        quizTypeSelector.style.display = "none";
    }
    
    const header = document.querySelector('.page-title');
    if (header) {
        header.textContent = '測驗區';
    }
    
    let quizTypeSelection = document.getElementById("quizTypeSelection");
    if (quizTypeSelection) {
        quizTypeSelection.style.display = "none";
    }
}

// ===== 修復：移除重複定義，統一使用此版本 =====
function toggleSelection(btn, type, value) {
    if (selectedFilters[type].has(value)) {
        selectedFilters[type].delete(value);
        btn.classList.remove("selected");
    } else {
        selectedFilters[type].add(value);
        btn.classList.add("selected");
    }
    updateCollapsibleHeaderState(btn);
}

// ===== 修復：統一資料格式，全部使用物件 =====
function filterQuizWords(event) {
    let filteredWords = wordsData.filter(word => {
        let wordText = word.Words || word.word || word["單字"];
        if (!wordText) return false;
        
        let letterMatch = selectedFilters.letters.size === 0 || selectedFilters.letters.has(wordText[0].toUpperCase());
        let category = word["分類"] || [];
        let primary = category[0] || "未分類";
        let secondary = category.slice(1);
        let primaryMatch = selectedFilters.primaryCategories.size === 0 || selectedFilters.primaryCategories.has(primary);
        let secondaryMatch = selectedFilters.secondaryCategories.size === 0 || secondary.some(c => selectedFilters.secondaryCategories.has(c)) || (selectedFilters.secondaryCategories.has("未分類") && secondary.length === 0);
        let level = word["等級"] || "未分類";
        let levelMatch = selectedFilters.levels.size === 0 || selectedFilters.levels.has(level);
        
        // 統一使用物件格式
        const vocabularyData = window.getVocabularyData();
        let checkedMatch = !selectedFilters.checked || (vocabularyData.checkedWords || {})[wordText] === "true";
        let importantMatch = !selectedFilters.important || (vocabularyData.importantWords || {})[wordText] === "true";
        let wrongMatch = !selectedFilters.wrong || (vocabularyData.wrongWords || []).includes(wordText);
        
        return letterMatch && primaryMatch && secondaryMatch && levelMatch && checkedMatch && importantMatch && wrongMatch;
    });

    if (filteredWords.length === 0) {
        showToast("⚠️ 沒有符合條件的單字！", "warning");
        return;
    }
    quizWords = filteredWords;
    if (event && event.target && event.target.id === "startFilteredQuizBtn") {
        startQuiz();
    } else {
        showQuizTypeSelection();
    }
}

function showQuizCategories() {
    if (!isDataLoaded) {
        showToast("⚠️ 單字資料尚未載入完成，請稍後再試。", "warning");
        return;
    }
    
    const quizTypeSelector = document.querySelector(".quiz-type-selector");
    if (quizTypeSelector) {
        quizTypeSelector.style.display = "none";
    }
    
    document.getElementById("quizCategories").style.display = "block";
    generateMultiSelectButtons();
    let startQuizBtn = document.getElementById("startFilteredQuizBtn");
    startQuizBtn.style.display = "block";
    startQuizBtn.textContent = "Word Quiz";
}

function initializeStartQuizButton() {
    let startQuizBtn = document.getElementById("startFilteredQuizBtn");
    if (startQuizBtn) {
        startQuizBtn.addEventListener("click", (event) => filterQuizWords(event));
    }
}

document.getElementById("startRewordQuizBtn").addEventListener("click", startRewordQuiz);

function startQuiz() {
    if (!isDataLoaded || wordsData.length === 0) {
        console.error("❌ 資料尚未載入，無法開始測驗");
        showToast("⚠️ 資料尚未載入，請稍後再試。", "warning");
        return;
    }

    let filteredWords = wordsData.filter(w => {
        let word = w.Words || w.word || w["單字"];
        let category = w["分類"] || [];
        let level = w["等級"] || "未分類";
        
        // 統一使用物件格式
        const vocabularyData = window.getVocabularyData();
        let isChecked = (vocabularyData.checkedWords || {})[word] === "true";
        let isImportant = (vocabularyData.importantWords || {})[word] === "true";
        let isWrong = (vocabularyData.wrongWords || []).includes(word);

        if (selectedFilters.letters.size > 0 && ![...selectedFilters.letters].some(letter => word.toLowerCase().startsWith(letter.toLowerCase()))) return false;
        let primary = category[0] || "未分類";
        if (selectedFilters.primaryCategories.size > 0 && !selectedFilters.primaryCategories.has(primary)) return false;
        
        let secondary = category.slice(1);
        if (selectedFilters.secondaryCategories.size > 0) {
            const hasMatch = secondary.some(c => selectedFilters.secondaryCategories.has(c));
            const isUncategorizedMatch = selectedFilters.secondaryCategories.has("未分類") && secondary.length === 0;
            if (!hasMatch && !isUncategorizedMatch) return false;
        }

        if (selectedFilters.levels.size > 0 && !selectedFilters.levels.has(level)) return false;
        if (selectedFilters.checked && !isChecked) return false;
        if (selectedFilters.important && !isImportant) return false;
        if (selectedFilters.wrong && !isWrong) return false;
        return true;
    });

    if (filteredWords.length === 0) {
        console.warn("⚠️ 沒有符合條件的單字");
        showToast("⚠️ 沒有符合條件的單字，請重新選擇篩選條件。", "warning");
        return;
    }
    
    // 使用智慧抽題系統
    if (typeof weightedRandomWords === 'function') {
        quizWords = weightedRandomWords(filteredWords, 10);
        console.log(`✅ 使用智慧抽題，本次測驗單字數: ${quizWords.length}`);
    } else {
        // ===== 修復：降級方案改為真正的隨機 =====
        const shuffled = [...filteredWords].sort(() => Math.random() - 0.5);
        quizWords = shuffled.slice(0, Math.min(10, shuffled.length));
        console.log(`✅ 使用隨機抽題，本次測驗單字數: ${quizWords.length}`);
    }
    
    console.log(`測驗單字:`, quizWords.map(w => w.Words));
    currentWord = null;
    quizResults = [];
    // ===== 修復：在開始測驗後才儲存空陣列 =====
    document.getElementById("quizCategories").style.display = "none";
    document.getElementById("quizArea").style.display = "block";
    loadNextWord();
}

function loadNextWord() {
    if (quizWords.length === 0) {
        finishQuiz();
        return;
    }
    let wordData = quizWords.shift();
    currentWord = wordData.Words;
    currentAudio = `${baseURL}${currentWord}.mp3`;
    wordQuizHistory[currentWord] = (wordQuizHistory[currentWord] || 0) + 1;
    
    // 使用統一的儲存方式
    const vocabularyData = window.getVocabularyData();
    vocabularyData.wordQuizHistory = wordQuizHistory;
    window.persistVocabularyData();
    
    console.log(`📈 更新測驗紀錄: ${currentWord}, 次數: ${wordQuizHistory[currentWord]}`);
    
    let wordHintContainer = document.getElementById("wordHint");
    let wordInputContainer = document.getElementById("wordInput");
    wordInputContainer.innerHTML = "";
    wordHintContainer.innerHTML = "";
    let audio = new Audio(currentAudio);
    audio.play().catch(err => {
        console.warn("⚠️ 自動播放音檔失敗:", err);
    });
    
    for (let i = 0; i < currentWord.length; i++) {
        let char = currentWord[i];
        if (char === " " || char === "-") {
            let spanElement = document.createElement("span");
            spanElement.innerText = char;
            spanElement.classList.add("non-input-box");
            wordInputContainer.appendChild(spanElement);
            wordHintContainer.innerHTML += char;
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

            inputElement.addEventListener('keydown', function(e) {
                if (e.key === 'Backspace' && inputElement.value === '') {
                    e.preventDefault();
                    let prevInput = inputElement.previousElementSibling;
                    while (prevInput && prevInput.tagName !== 'INPUT') {
                        prevInput = prevInput.previousElementSibling;
                    }
                    if (prevInput) {
                        prevInput.focus();
                    }
                }
            });

            wordInputContainer.appendChild(inputElement);
            if (i === 0 || i === currentWord.length - 1) {
                wordHintContainer.innerHTML += char;
            } else {
                wordHintContainer.innerHTML += "_ ";
            }
        }
    }
    let firstInput = wordInputContainer.querySelector("input");
    if (firstInput) firstInput.focus();
}

function submitAnswer() {
    const quizArea = document.getElementById("quizArea");
    if (!quizArea || quizArea.style.display === "none") {
        return;
    }
    let wordInputElements = document.querySelectorAll("#wordInput input, #wordInput span.non-input-box");
    let userAnswerArray = Array.from(wordInputElements).map(el => el.tagName === "INPUT" ? (el.value.trim().toLowerCase() || "_") : el.innerText);
    let userAnswer = userAnswerArray.join("");
    let correctAnswer = currentWord;
    let inputIndex = 0;
    
    document.querySelectorAll("#wordInput input").forEach(input => {
        while (correctAnswer[inputIndex] === ' ' || correctAnswer[inputIndex] === '-') {
            inputIndex++;
        }
        let userChar = input.value.trim().toLowerCase();
        let correctChar = correctAnswer[inputIndex] ? correctAnswer[inputIndex].toLowerCase() : '';
        if (userChar !== correctChar) {
            input.classList.add('incorrect-letter-input');
        } else {
            input.classList.remove('incorrect-letter-input');
        }
        inputIndex++;
    });
    
    let result = userAnswer === '' ? '未作答' : (userAnswer.toLowerCase() === correctAnswer.toLowerCase() ? '正確' : '錯誤');
    quizResults.push({
        word: currentWord,
        result: result,
        timestamp: new Date().toLocaleString()
    });
    
    // ===== 修復：統一使用陣列格式儲存錯誤單字 =====
    const vocabularyData = window.getVocabularyData();
    let wrongWords = vocabularyData.wrongWords || [];
    
    if (result === '錯誤') {
        if (!wrongWords.includes(currentWord)) {
            wrongWords.push(currentWord);
        }
    } else if (result === '正確') {
        wrongWords = wrongWords.filter(word => word !== currentWord);
    }
    
    vocabularyData.wrongWords = wrongWords;
    window.persistVocabularyData();
    
    // 儲存當前測驗結果
    localStorage.setItem("currentQuizResults", JSON.stringify(quizResults));
    
    let wordData = wordsData.find(w => w.Words === currentWord);
    let chineseExplanation = wordData && wordData["traditional Chinese"] ? wordData["traditional Chinese"].replace(/\n/g, "<br>") : "無中文解釋";
    let pronunciation1 = wordData && wordData["pronunciation-1"] ? wordData["pronunciation-1"] : "";
    let pronunciation2 = wordData && wordData["pronunciation-2"] ? wordData["pronunciation-2"] : "";
    let phonetics = pronunciation1;
    if (pronunciation2) {
        phonetics += ` / ${pronunciation2}`;
    }
    phonetics = phonetics || "無音標";
    document.getElementById("wordHint").innerHTML = `<div>${correctAnswer}</div><div class="phonetic-explanation"><p>${phonetics}</p></div><div class="chinese-explanation"><p>${chineseExplanation}</p></div>`;
    document.getElementById("submitBtn").style.display = "none";
    document.getElementById("nextBtn").style.display = "inline-block";
}

function goToNextWord() {
    loadNextWord();
    document.getElementById("submitBtn").style.display = "inline-block";
    document.getElementById("nextBtn").style.display = "none";
}

function finishQuiz() {
    document.getElementById("quizArea").style.display = "none";
    document.getElementById("quizResult").style.display = "block";
    let resultContainer = document.getElementById("quizResult");
    resultContainer.innerHTML = `<h2>測驗結果</h2>`;
    let existingNotification = document.getElementById("saveNotification");
    if (existingNotification) {
        existingNotification.style.display = "none";
    }
    
    const vocabularyData = window.getVocabularyData();
    
    let resultList = quizResults.map(result => {
        let wordData = wordsData.find(w => w.Words === result.word);
        let pronunciation1 = wordData && wordData["pronunciation-1"] ? wordData["pronunciation-1"] : "";
        let pronunciation2 = wordData && wordData["pronunciation-2"] ? wordData["pronunciation-2"] : "";
        let phonetics = pronunciation1;
        if (pronunciation2) {
            phonetics += ` / ${pronunciation2}`;
        }
        let resultClass = '';
        if (result.result === '正確') {
            resultClass = 'correct';
        } else if (result.result === '錯誤') {
            resultClass = 'wrong';
        } else {
            resultClass = 'unanswered';
        }
        
        let suggestedRating = result.result === '正確' ? 4 : (result.result === '錯誤' ? 2 : 3);
        
        // 使用物件格式檢查
        const isImportant = (vocabularyData.importantWords || {})[result.word] === "true";
        
        return `<div class='result-item ${resultClass}'>
            <label class='important-word'>
                <input type='checkbox' class='important-checkbox' data-word='${result.word}' 
                       ${isImportant ? "checked" : ""} 
                       onchange='toggleImportant("${result.word}", this)'>
            </label>
            <button class='word-link' onclick="goToWordDetail('${result.word}')">${result.word}</button>
            <button class='phonetic-btn' onclick="playAudioForWord('${result.word}')">${phonetics}</button>
            ${generateRatingHTML('word', result.word, suggestedRating)}
        </div>`;
    }).join("");
    
    resultContainer.innerHTML += `<div>${resultList}</div>
        <div class="button-group">
            <button class="button" onclick="openWordRatingManager()">查看評分記錄</button>
            <button class="button" onclick="returnToMainMenu()">返回主頁</button>
        </div>`;
    
    if (existingNotification) {
        setTimeout(function() {
            existingNotification.style.display = "block";
        }, 500);
    }
}

function goToWordDetail(word) {
    window.location.href = `detail.html?word=${encodeURIComponent(word)}&from=quiz&returning=true`;
}

function startRewordQuiz() {
    if (!isDataLoaded || wordsData.length === 0) {
        console.error("❌ 資料尚未載入，無法開始測驗");
        showToast("⚠️ 資料尚未載入，請稍後再試。", "warning");
        return;
    }

    let filteredWords = wordsData.filter(w => {
        let word = w.Words || w.word || w["單字"];
        let category = w["分類"] || [];
        let level = w["等級"] || "未分類";
        
        const vocabularyData = window.getVocabularyData();
        let isChecked = (vocabularyData.checkedWords || {})[word] === "true";
        let isImportant = (vocabularyData.importantWords || {})[word] === "true";
        let isWrong = (vocabularyData.wrongWords || []).includes(word);

        if (selectedFilters.letters.size > 0 && ![...selectedFilters.letters].some(letter => word.toLowerCase().startsWith(letter.toLowerCase()))) return false;
        let primary = category[0] || "未分類";
        if (selectedFilters.primaryCategories.size > 0 && !selectedFilters.primaryCategories.has(primary)) return false;
        
        let secondary = category.slice(1);
        if (selectedFilters.secondaryCategories.size > 0) {
            const hasMatch = secondary.some(c => selectedFilters.secondaryCategories.has(c));
            const isUncategorizedMatch = selectedFilters.secondaryCategories.has("未分類") && secondary.length === 0;
            if (!hasMatch && !isUncategorizedMatch) return false;
        }

        if (selectedFilters.levels.size > 0 && !selectedFilters.levels.has(level)) return false;
        if (selectedFilters.checked && !isChecked) return false;
        if (selectedFilters.important && !isImportant) return false;
        if (selectedFilters.wrong && !isWrong) return false;
        return true;
    });

    if (filteredWords.length === 0) {
        console.warn("⚠️ 沒有符合條件的單字");
        showToast("⚠️ 沒有符合條件的單字，請重新選擇篩選條件。", "warning");
        return;
    }

    if (typeof weightedRandomWords === 'function') {
        quizWords = weightedRandomWords(filteredWords, 10);
        console.log(`✅ 使用智慧抽題，本次測驗單字數: ${quizWords.length}`);
    } else {
        const shuffled = [...filteredWords].sort(() => Math.random() - 0.5);
        quizWords = shuffled.slice(0, Math.min(10, shuffled.length));
        console.log(`✅ 使用隨機抽題，本次測驗單字數: ${quizWords.length}`);
    }

    console.log(`Reword測驗單字:`, quizWords.map(w => w.Words));
    currentWord = null;
    quizResults = [];
    document.getElementById("quizCategories").style.display = "none";
    document.getElementById("rewordQuizArea").style.display = "block";
    loadNextReword();
}

// ============================================================
//  🖱️  ReorderDrag — 通用重組拖曳模組
//  支援：點擊放開 → 字母往上/往回；點擊後拖移 → 插入指定位置
// ============================================================
if (!window.ReorderDrag) { window.ReorderDrag = class {
    constructor(answerAreaId, poolId) {
        this.answerAreaId = answerAreaId;
        this.poolId = poolId;
        this.answerArea = null;
        this.pool = null;

        this._dragging  = false;
        this._dragEl    = null;
        this._ghost     = null;
        this._indicator = null;
        this._startX    = 0;
        this._startY    = 0;
        this._pointerId = null;
        this._fromAnswer = false;

        this._onMove = this._onPointerMove.bind(this);
        this._onUp   = this._onPointerUp.bind(this);
        this._onTouchMove = (e) => { if (this._dragging) e.preventDefault(); };

        document.addEventListener('pointermove', this._onMove, { passive: false });
        document.addEventListener('pointerup',   this._onUp,   { passive: false });
        document.addEventListener('touchmove',   this._onTouchMove, { passive: false });
    }

    init() {
        this.answerArea = document.getElementById(this.answerAreaId);
        this.pool       = document.getElementById(this.poolId);
        if (!this.answerArea || !this.pool) return;
        this.answerArea.className = 'reorder-answer-area';
        this.pool.className       = 'reorder-pool';
    }

    createWordBtn(text, poolIndex) {
        const btn = document.createElement('button');
        btn.className = 'reorder-word';
        btn.textContent = text;
        btn.dataset.word = text;
        btn.dataset.idx  = poolIndex;
        btn.addEventListener('pointerdown', (e) => this._onPointerDown(e, btn));
        return btn;
    }

    getAnswer() {
        return Array.from(this.answerArea.querySelectorAll('.reorder-word'))
            .map(btn => btn.dataset.word);
    }

    destroy() {
        this._cleanupDrag();
        document.removeEventListener('pointermove', this._onMove);
        document.removeEventListener('pointerup',   this._onUp);
        document.removeEventListener('touchmove',   this._onTouchMove);
    }

    _onPointerDown(e, btn) {
        if (btn.classList.contains('correct') || btn.classList.contains('incorrect')) return;
        e.preventDefault();
        this._dragEl    = btn;
        this._dragging  = false;
        this._startX    = e.clientX;
        this._startY    = e.clientY;
        this._pointerId = e.pointerId;
        this._fromAnswer = this.answerArea.contains(btn);
        try { btn.setPointerCapture(e.pointerId); } catch(err) {}
    }

    _onPointerMove(e) {
        if (!this._dragEl) return;
        if (e.pointerId !== this._pointerId) return;

        const dx = e.clientX - this._startX;
        const dy = e.clientY - this._startY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (!this._dragging) {
            if (dist < 6) return;
            this._dragging = true;
            this._startDrag(e);
        }

        if (this._ghost) {
            this._ghost.style.left = (e.clientX - this._ghost._offX) + 'px';
            this._ghost.style.top  = (e.clientY - this._ghost._offY) + 'px';
        }

        const overAnswer = this._isOverAnswerArea(e.clientX, e.clientY);
        if (overAnswer) {
            this.answerArea.classList.add('drag-over');
            this._updateIndicator(e.clientX, e.clientY);
        } else {
            this.answerArea.classList.remove('drag-over');
            this._removeIndicator();
        }
    }

    _onPointerUp(e) {
        if (!this._dragEl) return;
        if (e.pointerId !== this._pointerId) return;
        if (!this._dragging) {
            this._handleClick();
        } else {
            this._handleDrop(e.clientX, e.clientY);
        }
        this._cleanupDrag();
    }

    _startDrag(e) {
        const btn = this._dragEl;
        const rect = btn.getBoundingClientRect();
        btn.classList.add('is-dragging');
        const ghost = document.createElement('button');
        ghost.className   = 'reorder-drag-ghost';
        ghost.textContent = btn.textContent;
        ghost._offX = e.clientX - rect.left;
        ghost._offY = e.clientY - rect.top;
        ghost.style.left  = (e.clientX - ghost._offX) + 'px';
        ghost.style.top   = (e.clientY - ghost._offY) + 'px';
        ghost.style.width = rect.width + 'px';
        document.body.appendChild(ghost);
        this._ghost = ghost;
    }

    _handleClick() {
        const btn = this._dragEl;
        if (this._fromAnswer) {
            this._moveToPool(btn);
        } else {
            this._moveToAnswer(btn);
        }
    }

    _handleDrop(x, y) {
        const btn = this._dragEl;
        const overAnswer = this._isOverAnswerArea(x, y);
        if (overAnswer) {
            const insertPos = this._getInsertPosition(x, y);
            if (this._fromAnswer) {
                const originalPos = Array.from(this.answerArea.children).indexOf(btn);
                btn.classList.remove('is-dragging');
                btn.remove();
                const finalPos = insertPos > originalPos ? insertPos - 1 : insertPos;
                this._insertAtPosition(btn, finalPos);
            } else {
                btn.classList.remove('is-dragging');
                this._markPoolItemUsed(btn);
                const newBtn = this.createWordBtn(btn.dataset.word, btn.dataset.idx);
                newBtn.classList.add('in-answer');
                this._insertAtPosition(newBtn, insertPos);
            }
        } else {
            if (this._fromAnswer) {
                btn.classList.remove('is-dragging');
                this._moveToPool(btn);
            } else {
                btn.classList.remove('is-dragging');
            }
        }
    }

    _moveToAnswer(poolBtn) {
        this._markPoolItemUsed(poolBtn);
        const newBtn = this.createWordBtn(poolBtn.dataset.word, poolBtn.dataset.idx);
        newBtn.classList.add('in-answer');
        this.answerArea.appendChild(newBtn);
    }

    _moveToPool(answerBtn) {
        answerBtn.remove();
        const idx = answerBtn.dataset.idx;
        const poolBtn = this.pool.querySelector(`.reorder-word[data-idx="${idx}"]`);
        if (poolBtn) {
            poolBtn.classList.remove('is-used');
            poolBtn.style.pointerEvents = '';
        }
    }

    _markPoolItemUsed(poolBtn) {
        poolBtn.classList.add('is-used');
    }

    _insertAtPosition(btn, pos) {
        const answersInArea = this.answerArea.querySelectorAll('.reorder-word');
        if (pos >= answersInArea.length) {
            this.answerArea.appendChild(btn);
        } else {
            this.answerArea.insertBefore(btn, answersInArea[pos]);
        }
    }

    _getInsertPosition(x, y) {
        const words = Array.from(
            this.answerArea.querySelectorAll('.reorder-word:not(.is-dragging)')
        );
        if (words.length === 0) return 0;

        const rows = [];
        words.forEach(w => {
            const r = w.getBoundingClientRect();
            const centerY = r.top + r.height / 2;
            let row = rows.find(row => Math.abs(row.centerY - centerY) < r.height * 0.6);
            if (!row) { row = { centerY, items: [] }; rows.push(row); }
            row.items.push({ el: w, rect: r, domIdx: words.indexOf(w) });
        });
        rows.sort((a, b) => a.centerY - b.centerY);

        let targetRow = rows[0];
        let minDist = Infinity;
        rows.forEach(row => {
            const dist = Math.abs(row.centerY - y);
            if (dist < minDist) { minDist = dist; targetRow = row; }
        });

        targetRow.items.sort((a, b) => a.rect.left - b.rect.left);
        for (let i = 0; i < targetRow.items.length; i++) {
            const item = targetRow.items[i];
            if (x < item.rect.left + item.rect.width / 2) {
                return item.domIdx;
            }
        }
        return targetRow.items[targetRow.items.length - 1].domIdx + 1;
    }

    _updateIndicator(x, y) {
        this._removeIndicator();
        const pos = this._getInsertPosition(x, y);
        const indicator = document.createElement('div');
        indicator.className = 'reorder-insert-indicator';
        this._indicator = indicator;
        const words = this.answerArea.querySelectorAll('.reorder-word:not(.is-dragging)');
        if (pos >= words.length) {
            this.answerArea.appendChild(indicator);
        } else {
            this.answerArea.insertBefore(indicator, words[pos]);
        }
    }

    _removeIndicator() {
        if (this._indicator) { this._indicator.remove(); this._indicator = null; }
    }

    _isOverAnswerArea(x, y) {
        const rect = this.answerArea.getBoundingClientRect();
        return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    }

    _cleanupDrag() {
        if (this._ghost) { this._ghost.remove(); this._ghost = null; }
        this._removeIndicator();
        this.answerArea && this.answerArea.classList.remove('drag-over');
        if (this._dragEl) this._dragEl.classList.remove('is-dragging');
        this._dragEl    = null;
        this._dragging  = false;
        this._pointerId = null;
    }
}; }

// 全域拖曳實例（reword）
let _rewordDrag = null;

function loadNextReword() {
    if (quizWords.length === 0) {
        finishRewordQuiz();
        return;
    }
    let wordData = quizWords.shift();
    currentWord = wordData.Words;
    currentAudio = `${baseURL}${currentWord}.mp3`;

    const vocabularyData = window.getVocabularyData();
    wordQuizHistory[currentWord] = (wordQuizHistory[currentWord] || 0) + 1;
    vocabularyData.wordQuizHistory = wordQuizHistory;
    window.persistVocabularyData();

    console.log(`📈 更新測驗紀錄: ${currentWord}, 次數: ${wordQuizHistory[currentWord]}`);

    let rewordHintContainer = document.getElementById("rewordHint");
    let letterBlocksContainer = document.getElementById("rewordLetterBlocksContainer");
    let constructionArea = document.getElementById("rewordConstructionArea");
    letterBlocksContainer.innerHTML = "";
    constructionArea.innerHTML = "";
    rewordHintContainer.innerHTML = "";

    let audio = new Audio(currentAudio);
    audio.play().catch(err => {
        console.warn("⚠️ 自動播放音檔失敗:", err);
    });

    // 初始化拖曳系統
    if (_rewordDrag) _rewordDrag.destroy();
    _rewordDrag = new window.ReorderDrag("rewordConstructionArea", "rewordLetterBlocksContainer");
    _rewordDrag.init();

    let lettersArray = currentWord.replace(/\s|-/g, "").split("");
    let shuffledLetters = lettersArray.map((v, i) => ({ v, i })).sort(() => Math.random() - 0.5);

    shuffledLetters.forEach(item => {
        const btn = _rewordDrag.createWordBtn(item.v, item.i);
        letterBlocksContainer.appendChild(btn);
    });

    document.getElementById("submitRewordBtn").style.display = "inline-block";
    document.getElementById("nextRewordBtn").style.display = "none";
}

function moveRewordBlock(block) {
    // no-op: replaced by ReorderDrag
}

function submitRewordAnswer() {
    let constructionArea = document.getElementById("rewordConstructionArea");
    // 從答案區讀取使用者排列的字母
    let userAnswer = Array.from(constructionArea.querySelectorAll('.reorder-word'))
        .map(b => b.dataset.word).join("");
    let correctAnswer = currentWord.toLowerCase();
    let result = userAnswer === "" ? "未作答" : (userAnswer.toLowerCase() === correctAnswer ? "正確" : "錯誤");
    quizResults.push({
        word: currentWord,
        result: result,
        timestamp: new Date().toLocaleString()
    });

    const vocabularyData = window.getVocabularyData();
    let wrongWords = vocabularyData.wrongWords || [];

    if (result === "錯誤") {
        if (!wrongWords.includes(currentWord)) wrongWords.push(currentWord);
    } else if (result === "正確") {
        wrongWords = wrongWords.filter(word => word !== currentWord);
    }

    vocabularyData.wrongWords = wrongWords;
    window.persistVocabularyData();

    localStorage.setItem("currentQuizResults", JSON.stringify(quizResults));

    let wordData = wordsData.find(w => w.Words === currentWord);
    let chineseExplanation = wordData && wordData["traditional Chinese"] ? wordData["traditional Chinese"].replace(/\n/g, "<br>") : "無中文解釋";
    let pronunciation1 = wordData && wordData["pronunciation-1"] ? wordData["pronunciation-1"] : "";
    let pronunciation2 = wordData && wordData["pronunciation-2"] ? wordData["pronunciation-2"] : "";
    let phonetics = pronunciation1;
    if (pronunciation2) phonetics += ` / ${pronunciation2}`;
    phonetics = phonetics || "無音標";

    document.getElementById("rewordHint").innerHTML = `<div>${currentWord}</div><div class="phonetic-explanation"><p>${phonetics}</p></div><div class="chinese-explanation"><p>${chineseExplanation}</p></div>`;

    // 標記正確/錯誤
    const correctLetters = correctAnswer.split("");
    Array.from(constructionArea.querySelectorAll('.reorder-word')).forEach((block, i) => {
        const correctLetter = correctLetters[i] || "";
        block.classList.add(block.dataset.word.toLowerCase() === correctLetter ? "correct" : "incorrect");
    });

    // 鎖定字母池
    document.querySelectorAll('#rewordLetterBlocksContainer .reorder-word').forEach(btn => {
        btn.style.pointerEvents = 'none';
    });

    document.getElementById("submitRewordBtn").style.display = "none";
    document.getElementById("nextRewordBtn").style.display = "inline-block";
}

function goToNextReword() {
    loadNextReword();
}

function finishRewordQuiz() {
    document.getElementById("rewordQuizArea").style.display = "none";
    document.getElementById("quizArea").style.display = "none";
    document.getElementById("quizResult").style.display = "block";
    finishQuiz();
}

document.getElementById("playRewordAudioBtn").addEventListener("click", function() {
    if (currentWord) {
        playAudioForWord(currentWord);
    }
});

// ===== 修復：Reword測驗的空白鍵播放也要檢查輸入框 =====
document.addEventListener("keydown", function(event) {
    const isInputField = event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA';
    
    if ((event.code === "Space") && !isInputField && document.getElementById("rewordQuizArea").style.display === "block") {
        event.preventDefault();
        if (currentWord) {
            playAudioForWord(currentWord);
        }
    }
});

// ===== 修復：統一使用物件格式 =====
function toggleImportant(word, checkbox) {
    const vocabularyData = window.getVocabularyData();
    
    if (!vocabularyData.importantWords) {
        vocabularyData.importantWords = {};
    }

    if (checkbox.checked) {
        vocabularyData.importantWords[word] = "true";
    } else {
        delete vocabularyData.importantWords[word];
    }

    window.persistVocabularyData();
}

function showQuizTypeSelection() {
    document.getElementById("quizCategories").style.display = "none";
    let quizTypeSelection = document.getElementById("quizTypeSelection");
    if (!quizTypeSelection) {
        quizTypeSelection = document.createElement("div");
        quizTypeSelection.id = "quizTypeSelection";
        quizTypeSelection.innerHTML = `<h2>選擇測驗類型</h2><div class="button-group"><button class="button" onclick="startQuiz()">單字測驗</button><button class="button" onclick="startRewordQuiz()">單字重組測驗</button><button class="button" onclick="returnToCategorySelection()">取消</button></div>`;
        document.body.appendChild(quizTypeSelection);
    }
    quizTypeSelection.style.display = "block";
}

function returnToMainMenu() {
    window.location.href = 'index.html';
    quizResults = [];
    localStorage.removeItem("quizScrollPosition");
    localStorage.removeItem("currentQuizResults");
    console.log("✅ 返回首頁並重置狀態");
}

document.getElementById("playAudioCenterBtn").addEventListener("click", function() {
    if (currentWord) {
        playAudioForWord(currentWord);
    }
});

function restoreQuizResults() {
    let resultContainer = document.getElementById("quizResult");
    resultContainer.innerHTML = `<h2>測驗結果</h2>`;
    
    const vocabularyData = window.getVocabularyData();
    
    let resultList = quizResults.map(result => {
        let wordData = wordsData.find(w => w.Words === result.word);
        let pronunciation1 = wordData && wordData["pronunciation-1"] ? wordData["pronunciation-1"] : "";
        let pronunciation2 = wordData && wordData["pronunciation-2"] ? wordData["pronunciation-2"] : "";
        let phonetics = pronunciation1;
        if (pronunciation2) {
            phonetics += ` / ${pronunciation2}`;
        }
        let resultClass = '';
        if (result.result === '正確') {
            resultClass = 'correct';
        } else if (result.result === '錯誤') {
            resultClass = 'wrong';
        } else {
            resultClass = 'unanswered';
        }
        
        const isImportant = (vocabularyData.importantWords || {})[result.word] === "true";
        
        return `<div class='result-item ${resultClass}'><label class='important-word'><input type='checkbox' class='important-checkbox' data-word='${result.word}' ${isImportant ? "checked" : ""} onchange='toggleImportant("${result.word}", this)'></label><button class='word-link' onclick="goToWordDetail('${result.word}')">${result.word}</button><button class='phonetic-btn' onclick="playAudioForWord('${result.word}')">${phonetics}</button></div>`;
    }).join("");
    resultContainer.innerHTML += `<div>${resultList}</div><div class="button-group"><button class="button" onclick="returnToMainMenu()">返回主頁</button></div>`;
    
    let savedScrollPosition = localStorage.getItem("quizScrollPosition");
    if (savedScrollPosition) {
        resultContainer.scrollTop = parseInt(savedScrollPosition);
    }
}

document.getElementById("cancelBtn").addEventListener("click", returnToCategorySelection);

// ===== Toast 通知系統 =====
function showToast(message, type = 'success') {
    const toast = document.getElementById('toastNotification');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `show ${type}`;
    setTimeout(() => {
        toast.className = toast.className.replace('show', '');
    }, 3000);
}

function returnToQuizCenter() {
    hideAllPanels();
    
    const quizTypeSelector = document.querySelector('.quiz-type-selector');
    if (quizTypeSelector) {
        quizTypeSelector.style.display = 'flex';
    }
    
    const header = document.querySelector('.page-title');
    if (header) {
        header.textContent = '測驗區';
    }
    
    updateBreadcrumb(['選擇功能', '測驗中心']);
    
    console.log('✅ 返回測驗中心');
}

// 🔧 新增：導航到不同測驗類型
function navigateToQuizType(type) {
    console.log(`🎯 導航到測驗類型: ${type}`);
    
    if (type === 'word') {
        // 單字測驗
        showQuizCategories();
    } else if (type === 'sentence') {
        // 句子測驗 - 調用 q_sentence.js 中的函數
        if (typeof showSentenceQuizCategories === 'function') {
            showSentenceQuizCategories();
        } else {
            console.error('❌ showSentenceQuizCategories 函數不存在');
            showToast('❌ 句子測驗功能載入失敗', 'error');
        }
    }
}

// 🔧 新增：導航到字卡練習
function navigateToFlashcard() {
    console.log('🎯 導航到字卡練習');
    if (typeof showFlashcardTypePanel === 'function') {
        showFlashcardTypePanel();
    } else {
        console.error('❌ showFlashcardTypePanel 函數不存在');
        showToast('❌ 字卡功能載入失敗', 'error');
    }
}
