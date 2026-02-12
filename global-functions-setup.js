/**
 * global-functions-setup.js
 * 這個檔案的唯一目的：將所有函數掛載到 window 物件
 * 讓 HTML 的 onclick 事件能夠正常運作
 * 
 * 使用方式：在所有其他 JS 檔案載入後，最後載入這個檔案
 */

console.log('🔧 開始掛載全域函數...');

// 等待 DOM 和所有腳本載入完成
document.addEventListener('DOMContentLoaded', function() {
    
    // === quiz.js 的函數 ===
    if (typeof backToMenu !== 'undefined') window.backToMenu = backToMenu;
    if (typeof navigateToQuizType !== 'undefined') window.navigateToQuizType = navigateToQuizType;
    if (typeof navigateToFlashcard !== 'undefined') window.navigateToFlashcard = navigateToFlashcard;
    if (typeof returnToQuizCenter !== 'undefined') window.returnToQuizCenter = returnToQuizCenter;
    if (typeof returnToCategorySelection !== 'undefined') window.returnToCategorySelection = returnToCategorySelection;
    if (typeof submitAnswer !== 'undefined') window.submitAnswer = submitAnswer;
    if (typeof goToNextWord !== 'undefined') window.goToNextWord = goToNextWord;
    if (typeof finishQuiz !== 'undefined') window.finishQuiz = finishQuiz;
    
    // === q_sentence.js 的函數 ===
    if (typeof returnToSentenceCategorySelection !== 'undefined') window.returnToSentenceCategorySelection = returnToSentenceCategorySelection;
    if (typeof submitSentenceAnswer !== 'undefined') window.submitSentenceAnswer = submitSentenceAnswer;
    if (typeof goToNextSentence !== 'undefined') window.goToNextSentence = goToNextSentence;
    if (typeof finishSentenceQuiz !== 'undefined') window.finishSentenceQuiz = finishSentenceQuiz;
    if (typeof submitRewordAnswer !== 'undefined') window.submitRewordAnswer = submitRewordAnswer;
    if (typeof goToNextReword !== 'undefined') window.goToNextReword = goToNextReword;
    if (typeof finishRewordQuiz !== 'undefined') window.finishRewordQuiz = finishRewordQuiz;
    if (typeof submitReorganizeAnswer !== 'undefined') window.submitReorganizeAnswer = submitReorganizeAnswer;
    if (typeof goToNextReorganizeSentence !== 'undefined') window.goToNextReorganizeSentence = goToNextReorganizeSentence;
    if (typeof finishReorganizeQuiz !== 'undefined') window.finishReorganizeQuiz = finishReorganizeQuiz;
    
    // === flashcard.js 的函數 ===
    if (typeof fcBackToMenu !== 'undefined') window.fcBackToMenu = fcBackToMenu;
    if (typeof openFlashcardManager !== 'undefined') window.openFlashcardManager = openFlashcardManager;
    if (typeof selectFlashcardType !== 'undefined') window.selectFlashcardType = selectFlashcardType;
    if (typeof fcSelectCount !== 'undefined') window.fcSelectCount = fcSelectCount;
    if (typeof fcToggleFilter !== 'undefined') window.fcToggleFilter = fcToggleFilter;
    if (typeof fcBackToTypeSelection !== 'undefined') window.fcBackToTypeSelection = fcBackToTypeSelection;
    if (typeof fcBackToSetup !== 'undefined') window.fcBackToSetup = fcBackToSetup;
    if (typeof fcFlipCard !== 'undefined') window.fcFlipCard = fcFlipCard;
    if (typeof fcMarkKnown !== 'undefined') window.fcMarkKnown = fcMarkKnown;
    if (typeof fcRetryWrong !== 'undefined') window.fcRetryWrong = fcRetryWrong;
    if (typeof fcMgrSelectType !== 'undefined') window.fcMgrSelectType = fcMgrSelectType;
    if (typeof fcMgrFilterByCategory !== 'undefined') window.fcMgrFilterByCategory = fcMgrFilterByCategory;
    if (typeof fcMgrEditItem !== 'undefined') window.fcMgrEditItem = fcMgrEditItem;
    if (typeof fcMgrSaveEdit !== 'undefined') window.fcMgrSaveEdit = fcMgrSaveEdit;
    if (typeof fcMgrResetItem !== 'undefined') window.fcMgrResetItem = fcMgrResetItem;
    if (typeof fcMgrResetAll !== 'undefined') window.fcMgrResetAll = fcMgrResetAll;
    if (typeof fcMgrExportData !== 'undefined') window.fcMgrExportData = fcMgrExportData;
    
    // 特殊：函數名稱別名（HTML 中使用的名稱與實際函數名稱不同）
    if (typeof startFlashcardPractice !== 'undefined') {
        window.fcStartPractice = startFlashcardPractice;
    }
    if (typeof fcContinuePractice !== 'undefined') {
        window.fcRestartPractice = fcContinuePractice;
    }
    if (typeof fcMgrSelectType !== 'undefined') {
        window.fcMgrSwitchType = fcMgrSelectType;
    }
    
    // === quiz-memory-manager.js 的函數 ===
    if (typeof openWordMemoryManager !== 'undefined') window.openWordMemoryManager = openWordMemoryManager;
    if (typeof closeWordMemoryManager !== 'undefined') window.closeWordMemoryManager = closeWordMemoryManager;
    if (typeof wordMgrFilterByCategory !== 'undefined') window.wordMgrFilterByCategory = wordMgrFilterByCategory;
    if (typeof wordMgrResetAll !== 'undefined') window.wordMgrResetAll = wordMgrResetAll;
    if (typeof wordMgrExportData !== 'undefined') window.wordMgrExportData = wordMgrExportData;
    if (typeof openSentenceMemoryManager !== 'undefined') window.openSentenceMemoryManager = openSentenceMemoryManager;
    if (typeof closeSentenceMemoryManager !== 'undefined') window.closeSentenceMemoryManager = closeSentenceMemoryManager;
    if (typeof sentenceMgrFilterByCategory !== 'undefined') window.sentenceMgrFilterByCategory = sentenceMgrFilterByCategory;
    if (typeof sentenceMgrResetAll !== 'undefined') window.sentenceMgrResetAll = sentenceMgrResetAll;
    if (typeof sentenceMgrExportData !== 'undefined') window.sentenceMgrExportData = sentenceMgrExportData;
    
    console.log('✅ 全域函數掛載完成');
    
    // 顯示掛載了哪些函數（除錯用）
    const mountedFunctions = Object.keys(window).filter(key => 
        typeof window[key] === 'function' && 
        (key.startsWith('fc') || key.includes('Quiz') || key.includes('Mgr') || key.includes('Manager'))
    );
    console.log(`📋 已掛載 ${mountedFunctions.length} 個函數:`, mountedFunctions.slice(0, 10));
});
