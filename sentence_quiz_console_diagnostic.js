// ======================================
// 句子測驗分類按鈕診斷腳本
// 請在 quiz.html 的 Console 中執行
// ======================================

console.log("🔍 開始診斷...\n");

// 1. 檢查容器是否存在
console.log("📦 步驟 1: 檢查 HTML 容器");
const containers = {
    "sentenceAlphabetButtons": document.getElementById("sentenceAlphabetButtons"),
    "sentencePrimaryCategoryButtons": document.getElementById("sentencePrimaryCategoryButtons"),
    "sentenceSecondaryCategoryButtons": document.getElementById("sentenceSecondaryCategoryButtons"),
    "sentenceSpecialCategoryButtons": document.getElementById("sentenceSpecialCategoryButtons"),
    "sentenceLevelButtons": document.getElementById("sentenceLevelButtons")
};

Object.entries(containers).forEach(([name, element]) => {
    if (element) {
        console.log(`✅ ${name}: 存在 (${element.tagName})`);
    } else {
        console.log(`❌ ${name}: 不存在!`);
    }
});

// 2. 檢查資料是否載入
console.log("\n📊 步驟 2: 檢查資料");
if (typeof sentenceData !== 'undefined') {
    console.log(`✅ sentenceData 存在, 長度: ${sentenceData.length}`);
    if (sentenceData.length > 0) {
        console.log("   範例資料:", sentenceData[0]);
        console.log("   primaryCategory:", sentenceData[0].primaryCategory);
    }
} else {
    console.log("❌ sentenceData 不存在!");
}

// 3. 檢查函數是否存在
console.log("\n🔧 步驟 3: 檢查關鍵函數");
const functions = [
    'showSentenceQuizCategories',
    'generateSentenceCategories',
    'startSentenceQuiz',
    'toggleSentenceSelection'
];

functions.forEach(funcName => {
    if (typeof window[funcName] === 'function') {
        console.log(`✅ ${funcName}: 存在`);
    } else {
        console.log(`❌ ${funcName}: 不存在!`);
    }
});

// 4. 嘗試手動生成分類按鈕
console.log("\n🎯 步驟 4: 嘗試手動生成按鈕");
if (typeof sentenceData !== 'undefined' && sentenceData.length > 0) {
    try {
        // 收集主分類
        const primaryCategories = new Set();
        sentenceData.forEach(item => {
            if (item.primaryCategory) {
                primaryCategories.add(item.primaryCategory);
            }
        });
        
        console.log(`找到 ${primaryCategories.size} 個主分類:`, [...primaryCategories].sort());
        
        // 嘗試生成按鈕
        const primaryContainer = document.getElementById("sentencePrimaryCategoryButtons");
        if (primaryContainer) {
            const buttonsHTML = [...primaryCategories].sort().map(c => 
                `<button class="category-button">${c}</button>`
            ).join("");
            
            primaryContainer.innerHTML = buttonsHTML;
            console.log(`✅ 已手動生成 ${primaryCategories.size} 個主分類按鈕`);
        } else {
            console.log("❌ 找不到 sentencePrimaryCategoryButtons 容器");
        }
    } catch (error) {
        console.error("❌ 生成按鈕時出錯:", error);
    }
} else {
    console.log("❌ 無法生成按鈕: 沒有資料");
}

// 5. 檢查 CSS 類別
console.log("\n🎨 步驟 5: 檢查 CSS");
const testBtn = document.querySelector('.category-button');
if (testBtn) {
    console.log("✅ 找到 .category-button 元素");
    const styles = window.getComputedStyle(testBtn);
    console.log("   display:", styles.display);
    console.log("   visibility:", styles.visibility);
} else {
    console.log("⚠️ 找不到任何 .category-button 元素");
}

console.log("\n✅ 診斷完成!");
