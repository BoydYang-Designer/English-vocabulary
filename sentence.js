// 模擬單字資料（實際上你會從 JSON 檔案載入）
const words = {
    "A": ["apple", "ant", "arrow"]
    // 可以加入更多字母的單字
};

// 步驟 1：顯示以某字母開頭的單字列表
function showWordsStartingWith(letter) {
    const filteredWords = words[letter] || [];
    displayWordList(filteredWords);
}

function displayWordList(words) {
    const wordItems = document.getElementById("wordItems");
    wordItems.innerHTML = "";
    words.forEach(word => {
        const wordElement = document.createElement("div");
        wordElement.textContent = word;
        // 這裡可以加入點擊事件，例如顯示句子列表
        wordItems.appendChild(wordElement);
    });
    switchView("wordList");
}

// 切換視圖的通用函數
function switchView(activeView) {
    const views = ["mainMenu", "wordList"];
    views.forEach(view => {
        const element = document.getElementById(view);
        if (view === activeView) {
            element.classList.remove("hidden");
            setTimeout(() => (element.style.opacity = 1), 10); // 淡入效果
        } else {
            element.style.opacity = 0;
            setTimeout(() => element.classList.add("hidden"), 300); // 淡出效果
        }
    });
}

// 返回主選單
function returnToMainMenu() {
    switchView("mainMenu");
}