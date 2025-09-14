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

document.addEventListener("DOMContentLoaded", function () {
    const params = new URLSearchParams(window.location.search);
    const show = params.get("show");
    const loadingOverlay = document.getElementById('loadingOverlay');

    wordQuizHistory = JSON.parse(localStorage.getItem('wordQuizHistory')) || {};

    // ▼▼▼ [新增] 確保所有分類預設收合，並修復無法重開的 bug ▼▼▼
    document.querySelectorAll('.collapsible-content').forEach(content => {
        content.style.maxHeight = '0px';
    });
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
    // ▲▲▲ [新增] 結束 ▲▲▲

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
            wordsData = data["New Words"] || [];
            wordsData.forEach(w => {
                if (typeof w["分類"] === "string") {
                    w["分類"] = [w["分類"]];
                } else if (!Array.isArray(w["分類"])) {
                    w["分類"] = [];
                }
            });
            isDataLoaded = true;
            console.log("✅ 單字資料已載入");
            console.log("📖 已載入單字測驗歷史:", Object.keys(wordQuizHistory).length, "筆");
            
            showToast("✅ 資料載入成功！", "success");

            if (params.get('returning') === 'true' && localStorage.getItem("currentQuizResults")) {
                quizResults = JSON.parse(localStorage.getItem("currentQuizResults"));
                restoreQuizResults();
            } else if (show === "categories") {
                const wordQuizBtn = document.getElementById('wordQuizBtn');
                if(wordQuizBtn) wordQuizBtn.style.backgroundColor = '#28a745';
                showQuizCategories();
            } else if (show === "sentenceCategories") {
                const startQuizBtn = document.getElementById('startQuizBtn');
                if(startQuizBtn) startQuizBtn.style.backgroundColor = '#28a745';
                showSentenceQuizCategories();
            } else {
                const wordQuizBtn = document.getElementById('wordQuizBtn');
                if(wordQuizBtn) wordQuizBtn.style.backgroundColor = '#28a745';
                showQuizCategories();
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

    document.addEventListener("keydown", function(event) {
        if (event.key === " " || event.key === "Spacebar") {
            event.preventDefault();
            if (currentWord) {
                playAudioForWord(currentWord);
            }
        }
    });
});

// ▼▼▼ [新增] 處理主分類點擊的函式 ▼▼▼
function handleQuizPrimaryCategoryClick(btn, categoryName) {
    toggleSelection('primaryCategories', categoryName);
    
    // 尋找或創建次分類容器
    let subcategoryWrapper = document.getElementById(`sub-for-quiz-${categoryName.replace(/\s/g, '-')}`);
    if (!subcategoryWrapper) {
        subcategoryWrapper = document.createElement('div');
        subcategoryWrapper.className = 'subcategory-wrapper'; // 確保使用與 index/sentence 頁面相同的 class
        subcategoryWrapper.id = `sub-for-quiz-${categoryName.replace(/\s/g, '-')}`;

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
                `<button class="category-button" onclick="toggleSelection('secondaryCategories', '${subCat}')">${subCat}</button>`
            ).join('');
        }
        
        btn.parentNode.insertBefore(subcategoryWrapper, btn.nextSibling);
    }

    // 控制次分類的顯示/隱藏
    if (subcategoryWrapper.style.maxHeight && subcategoryWrapper.style.maxHeight !== '0px') {
        subcategoryWrapper.style.maxHeight = '0px';
    } else {
        subcategoryWrapper.style.maxHeight = subcategoryWrapper.scrollHeight + "px";
    }

    // 重新計算父容器高度
    setTimeout(() => {
        const mainCollapsibleContent = btn.closest('.collapsible-content');
        if (mainCollapsibleContent.style.maxHeight !== '0px') {
             mainCollapsibleContent.style.maxHeight = mainCollapsibleContent.scrollHeight + "px";
        }
    }, 310);
}
// ▲▲▲ [新增] 結束 ▲▲▲

// ▼▼▼ [修改] 按鈕生成函式 ▼▼▼
function generateMultiSelectButtons() {
    let alphabetContainer = document.getElementById("alphabetButtons");
    if(alphabetContainer) {
        alphabetContainer.innerHTML = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(letter =>
            `<button class='category-button' onclick='toggleSelection("letters", "${letter}")'>${letter}</button>`
        ).join("");
    }

    let primaryCategories = [...new Set(wordsData.map(w => w["分類"][0] || "未分類").filter(c => c))];
    let primaryContainer = document.getElementById("primaryCategoryButtons");
    if(primaryContainer) {
        primaryContainer.innerHTML = primaryCategories.map(c =>
            `<button class='category-button' onclick='handleQuizPrimaryCategoryClick(this, "${c}")'>${c}</button>`
        ).join(" ");
    }
    
    let specialContainer = document.getElementById("specialCategoryButtons");
    if(specialContainer) {
        specialContainer.innerHTML = `
            <button class='category-button' onclick='toggleCheckedSelection()'>Checked 單字</button>
            <button class='category-button' onclick='toggleImportantFilter()'>重要單字</button>
            <button class='category-button' onclick='toggleWrongFilter()'>錯誤單字</button>
        `;
    }

    // 修改等級部分：使用固定順序並過濾重複
    if (!wordsData || !Array.isArray(wordsData)) return;
    const allLevels = new Set(wordsData.map(w => w["等級"] || "未分類"));
    const standardLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', '未分類'].filter(l => allLevels.has(l));

    let levelContainer = document.getElementById("levelButtons");
    if(levelContainer) {
        levelContainer.innerHTML = standardLevels.map(l => 
            `<button class='category-button' onclick='toggleSelection("levels", "${l}")'>${l}</button>`
        ).join("");
    }
}
// ▲▲▲ [修改] 結束 ▲▲▲

// (此處省略其他未變更的函式，以節省篇幅，請保留您原有的其他函式)
function playAudioForWord(word) {
    let audioLink = `${baseURL}${word}.mp3`;
    let audio = new Audio(audioLink);
    audio.play().catch((error) => {
        console.error("❌ 播放音檔失敗:", error);
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
    let quizTypeSelection = document.getElementById("quizTypeSelection");
    if (quizTypeSelection) {
        quizTypeSelection.style.display = "none";
    }
}
function toggleSelection(type, value) {
    if (selectedFilters[type].has(value)) {
        selectedFilters[type].delete(value);
    } else {
        selectedFilters[type].add(value);
    }
    updateButtonSelectionState(type, value);
}
function toggleCheckedSelection() {
    selectedFilters.checked = !selectedFilters.checked;
    let checkedButton = document.querySelector("#specialCategoryButtons button:nth-child(1)"); 
    if (selectedFilters.checked) {
        checkedButton.classList.add("selected");
    } else {
        checkedButton.classList.remove("selected");
    }
}
function updateButtonSelectionState(type, value) {
    document.querySelectorAll(`.category-button[onclick*="'${value}'"]`).forEach(button => {
        if (selectedFilters[type].has(value)) {
            button.classList.add("selected");
        } else {
            button.classList.remove("selected");
        }
    });
}
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
        let checkedMatch = !selectedFilters.checked || localStorage.getItem(`checked_${wordText}`) === "true";
        let importantMatch = !selectedFilters.important || localStorage.getItem(`important_${wordText}`) === "true";
        let wrongWords = JSON.parse(localStorage.getItem("wrongWords") || "[]");
        let wrongMatch = !selectedFilters.wrong || wrongWords.includes(wordText);
        return letterMatch && primaryMatch && secondaryMatch && levelMatch && checkedMatch && importantMatch && wrongMatch;
    });

    if (filteredWords.length === 0) {
        alert("⚠️ 沒有符合條件的單字！");
        return;
    }
    quizWords = filteredWords;
    if (event && event.target && event.target.id === "startFilteredQuizBtn") {
        startQuiz();
    } else {
        showQuizTypeSelection();
    }
}
function toggleImportantFilter() {
    selectedFilters.important = !selectedFilters.important;
    let importantButton = document.querySelector("#specialCategoryButtons button:nth-child(2)"); 
    if (selectedFilters.important) {
        importantButton.classList.add("selected");
    } else {
        importantButton.classList.remove("selected");
    }
}
function toggleWrongFilter() {
    selectedFilters.wrong = !selectedFilters.wrong;
    let wrongButton = document.querySelector("#specialCategoryButtons button:nth-child(3)"); 
    if (selectedFilters.wrong) {
        wrongButton.classList.add("selected");
    } else {
        wrongButton.classList.remove("selected");
    }
}
function showQuizCategories() {
    document.querySelector("h1").textContent = "單字測驗區";
    if (!isDataLoaded) {
        alert("⚠️ 單字資料尚未載入完成，請稍後再試。");
        return;
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
        alert("⚠️ 資料尚未載入，請稍後再試。");
        return;
    }

    let filteredWords = wordsData.filter(w => {
        let word = w.Words || w.word || w["單字"];
        let category = w["分類"] || [];
        let level = w["等級"] || "未分類";
        let isChecked = localStorage.getItem(`checked_${word}`) === "true";
        let isImportant = localStorage.getItem(`important_${word}`) === "true";
        let isWrong = JSON.parse(localStorage.getItem("wrongWords") || "[]").includes(word);

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
        alert("⚠️ 沒有符合條件的單字，請重新選擇篩選條件。");
        return;
    }
    filteredWords.sort((a, b) => {
        const countA = wordQuizHistory[a.Words] || 0;
        const countB = wordQuizHistory[b.Words] || 0;
        return countA - countB;
    });
    for (let i = filteredWords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [filteredWords[i], filteredWords[j]] = [filteredWords[j], filteredWords[i]];
    }
    quizWords = filteredWords.slice(0, 10);
    console.log(`✅ 本次測驗單字數: ${quizWords.length}`, quizWords.map(w => w.Words));
    currentWord = null;
    quizResults = [];
    localStorage.setItem("currentQuizResults", JSON.stringify(quizResults));
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
    localStorage.setItem('wordQuizHistory', JSON.stringify(wordQuizHistory));
    console.log(`📈 更新測驗紀錄: ${currentWord}, 次數: ${wordQuizHistory[currentWord]}`);
    let wordHintContainer = document.getElementById("wordHint");
    let wordInputContainer = document.getElementById("wordInput");
    wordInputContainer.innerHTML = "";
    wordHintContainer.innerHTML = "";
    let audio = new Audio(currentAudio);
    audio.play();
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
    let storedWrongWords = JSON.parse(localStorage.getItem('wrongWords')) || [];
    if (result === '錯誤') {
        if (!storedWrongWords.includes(currentWord)) {
            storedWrongWords.push(currentWord);
        }
    } else if (result === '正確') {
        storedWrongWords = storedWrongWords.filter(word => word !== currentWord);
    }
    localStorage.setItem('wrongWords', JSON.stringify(storedWrongWords));
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
        return `<div class='result-item ${resultClass}'><label class='important-word'><input type='checkbox' class='important-checkbox' data-word='${result.word}' ${localStorage.getItem(`important_${result.word}`) === "true" ? "checked" : ""} onchange='toggleImportant("${result.word}", this)'></label><button class='word-link' onclick="goToWordDetail('${result.word}')">${result.word}</button><button class='phonetic-btn' onclick="playAudioForWord('${result.word}')">${phonetics}</button></div>`;
    }).join("");
    resultContainer.innerHTML += `<div>${resultList}</div><div class="button-group"><button class="button" onclick="returnToMainMenu()">返回主頁</button></div>`;
    if (existingNotification) {
        setTimeout(function() {
            existingNotification.style.display = "block";
        }, 500);
    }
}
function goToWordDetail(word) {
    let resultContainer = document.getElementById("quizResult");
    let scrollPosition = resultContainer ? resultContainer.scrollTop : 0;
    localStorage.setItem('quizScrollPosition', scrollPosition);
    localStorage.setItem('currentQuizResults', JSON.stringify(quizResults));
    localStorage.setItem('returnToQuizResult', "true");
    window.location.href = `index.html?word=${encodeURIComponent(word)}&from=quiz`;
}
function startRewordQuiz() {
    if (quizWords.length === 0) {
        quizWords = wordsData.filter(word => {
            let wordText = word.Words;
            let letterMatch = selectedFilters.letters.size === 0 || selectedFilters.letters.has(wordText[0].toUpperCase());
            let category = word["分類"] || [];
            let primary = category[0] || "未分類";
            let secondary = category.slice(1);
            let primaryMatch = selectedFilters.primaryCategories.size === 0 || selectedFilters.primaryCategories.has(primary);
            let secondaryMatch = selectedFilters.secondaryCategories.size === 0 || secondary.some(c => selectedFilters.secondaryCategories.has(c));
            let wordLevel = word["等級"] || "未分類(等級)";
            let levelMatch = selectedFilters.levels.size === 0 || selectedFilters.levels.has(wordLevel);
            let checkedMatch = !selectedFilters.checked || localStorage.getItem(`checked_${wordText}`) === "true";
            let importantMatch = !selectedFilters.important || localStorage.getItem(`important_${wordText}`) === "true";
            let wrongWords = JSON.parse(localStorage.getItem("wrongWords") || "[]");
            let wrongMatch = !selectedFilters.wrong || wrongWords.includes(wordText);
            return letterMatch && primaryMatch && secondaryMatch && levelMatch && checkedMatch && importantMatch && wrongMatch;
        });
        if (quizWords.length === 0) {
            alert("⚠️ 沒有符合條件的單字，請選擇分類！");
            returnToCategorySelection();
            return;
        }
    }
    document.getElementById("quizCategories").style.display = "none";
    document.getElementById("rewordQuizArea").style.display = "block";
    loadNextReword();
}
function loadNextReword() {
    if (quizWords.length === 0) {
        alert("⚠️ 無可用單字，請重新選擇分類！");
        returnToCategorySelection();
        return;
    }
    let randomIndex = Math.floor(Math.random() * quizWords.length);
    let wordData = quizWords.splice(randomIndex, 1)[0];
    currentWord = wordData.Words;
    currentAudio = `${baseURL}${currentWord}.mp3`;
    let rewordHintContainer = document.getElementById("rewordHint");
    let letterBlocksContainer = document.getElementById("rewordLetterBlocksContainer");
    let constructionArea = document.getElementById("rewordConstructionArea");
    rewordHintContainer.innerHTML = "";
    letterBlocksContainer.innerHTML = "";
    constructionArea.innerHTML = "";
    rewordHintContainer.innerHTML = currentWord[0] + " _ ".repeat(currentWord.length - 2) + currentWord[currentWord.length - 1];
    let letters = currentWord.split("").sort(() => Math.random() - 0.5);
    letters.forEach(letter => {
        let block = document.createElement("div");
        block.classList.add("word-block");
        block.dataset.value = letter;
        block.innerText = letter;
        block.onclick = () => selectLetterBlock(block);
        letterBlocksContainer.appendChild(block);
    });
    let audio = new Audio(currentAudio);
    audio.play();
    document.getElementById("submitRewordBtn").style.display = "inline-block";
    document.getElementById("nextRewordBtn").style.display = "none";
}
function selectLetterBlock(block) {
    let constructionArea = document.getElementById("rewordConstructionArea");
    if (block.parentNode === constructionArea) {
        block.classList.remove("selected");
        document.getElementById("rewordLetterBlocksContainer").appendChild(block);
    } else {
        block.classList.add("selected");
        constructionArea.appendChild(block);
    }
}
function submitRewordAnswer() {
    let constructionArea = document.getElementById("rewordConstructionArea");
    let userAnswer = Array.from(constructionArea.children).map(b => b.dataset.value).join("");
    let correctAnswer = currentWord.toLowerCase();
    let result = userAnswer === "" ? "未作答" : (userAnswer.toLowerCase() === correctAnswer ? "正確" : "錯誤");
    quizResults.push({
        word: currentWord,
        result: result,
        timestamp: new Date().toLocaleString()
    });
    let storedWrongWords = JSON.parse(localStorage.getItem('wrongWords')) || [];
    if (result === "錯誤") {
        if (!storedWrongWords.includes(currentWord)) {
            storedWrongWords.push(currentWord);
        }
    } else if (result === "正確") {
        storedWrongWords = storedWrongWords.filter(word => word !== currentWord);
    }
    localStorage.setItem('wrongWords', JSON.stringify(storedWrongWords));
    let wordData = wordsData.find(w => w.Words === currentWord);
    let chineseExplanation = wordData && wordData["traditional Chinese"] ? wordData["traditional Chinese"].replace(/\n/g, "<br>") : "無中文解釋";
    let pronunciation1 = wordData && wordData["pronunciation-1"] ? wordData["pronunciation-1"] : "";
    let pronunciation2 = wordData && wordData["pronunciation-2"] ? wordData["pronunciation-2"] : "";
    let phonetics = pronunciation1;
    if (pronunciation2) {
        phonetics += ` / ${pronunciation2}`;
    }
    phonetics = phonetics || "無音標";
    document.getElementById("rewordHint").innerHTML = `<div>${currentWord}</div><div class="phonetic-explanation"><p>${phonetics}</p></div><div class="chinese-explanation"><p>${chineseExplanation}</p></div>`;
    constructionArea.querySelectorAll(".word-block").forEach((block, i) => {
        let correctLetter = correctAnswer[i] || "";
        block.classList.add(block.dataset.value.toLowerCase() === correctLetter ? "correct" : "incorrect");
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
document.addEventListener("keydown", function(event) {
    if (event.code === "Space" && document.getElementById("rewordQuizArea").style.display === "block") {
        event.preventDefault();
        if (currentWord) {
            playAudioForWord(currentWord);
        }
    }
});
function toggleImportant(word, checkbox) {
    if (checkbox.checked) {
        localStorage.setItem(`important_${word}`, "true");
        console.log(`⭐ 單字 ${word} 標記為重要 (quiz)`);
    } else {
        localStorage.removeItem(`important_${word}`);
        console.log(`❌ 單字 ${word} 取消重要標記 (quiz)`);
    }
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
    localStorage.removeItem("currentQuizResults");
    localStorage.removeItem("quizScrollPosition");
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
        return `<div class='result-item ${resultClass}'><label class='important-word'><input type='checkbox' class='important-checkbox' data-word='${result.word}' ${localStorage.getItem(`important_${result.word}`) === "true" ? "checked" : ""} onchange='toggleImportant("${result.word}", this)'></label><button class='word-link' onclick="goToWordDetail('${result.word}')">${result.word}</button><button class='phonetic-btn' onclick="playAudioForWord('${result.word}')">${phonetics}</button></div>`;
    }).join("");
    resultContainer.innerHTML += `<div>${resultList}</div><div class="button-group"><button class="button" onclick="returnToMainMenu()">返回主頁</button></div>`;
    let savedScrollPosition = localStorage.getItem("quizScrollPosition");
    if (savedScrollPosition) {
        resultContainer.scrollTop = parseInt(savedScrollPosition);
    }
}
document.getElementById("cancelBtn").addEventListener("click", returnToCategorySelection);
function showToast(message, type = 'success') {
    const toast = document.getElementById('toastNotification');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `show ${type}`;
    setTimeout(() => {
        toast.className = toast.className.replace('show', '');
    }, 3000);
}