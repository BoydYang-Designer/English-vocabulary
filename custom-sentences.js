/**
 * custom-sentences.js
 * 自訂句子管理模組
 * 負責：新增、儲存(localStorage + Firebase)、匯出、「我的自訂」分類顯示
 */

console.log('📦 載入 custom-sentences.js...');

// ===== 常數 =====
const CUSTOM_SENTENCES_KEY = 'customSentences';

// ===== 取得所有自訂句子 =====
function getCustomSentences() {
    try {
        const raw = localStorage.getItem(CUSTOM_SENTENCES_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        console.error('讀取自訂句子失敗:', e);
        return [];
    }
}

// ===== 儲存自訂句子到 localStorage (+ Firebase 若已登入) =====
function saveCustomSentencesToStorage(list) {
    try {
        localStorage.setItem(CUSTOM_SENTENCES_KEY, JSON.stringify(list));
        syncCustomSentencesToFirebase(list);
    } catch (e) {
        console.error('儲存自訂句子失敗:', e);
    }
}

function syncCustomSentencesToFirebase(list) {
    try {
        if (typeof firebase === 'undefined') return;
        const user = firebase.auth().currentUser;
        if (!user) return;
        const db = firebase.firestore();
        db.collection('users').doc(user.uid).set(
            { customSentences: list },
            { merge: true }
        ).then(() => {
            console.log('✅ 自訂句子已同步到 Firebase');
        }).catch(e => {
            console.warn('Firebase 同步失敗:', e);
        });
    } catch (e) {
        console.warn('Firebase 同步錯誤:', e);
    }
}

// ===== 從 Firebase 載入自訂句子（登入時呼叫）=====
function loadCustomSentencesFromFirebase() {
    try {
        if (typeof firebase === 'undefined') return;
        const user = firebase.auth().currentUser;
        if (!user) return;
        const db = firebase.firestore();
        db.collection('users').doc(user.uid).get().then(doc => {
            if (doc.exists && doc.data().customSentences) {
                const fbList = doc.data().customSentences;
                const localList = getCustomSentences();
                // 合併：以 Words 為 key，Firebase 優先
                const merged = mergeCustomLists(localList, fbList);
                localStorage.setItem(CUSTOM_SENTENCES_KEY, JSON.stringify(merged));
                console.log('✅ 從 Firebase 載入自訂句子完成，共', merged.length, '筆');
                // 重新注入到 sentenceData
                injectCustomSentencesIntoData();
            }
        }).catch(e => {
            console.warn('從 Firebase 載入自訂句子失敗:', e);
        });
    } catch (e) {
        console.warn('Firebase 載入錯誤:', e);
    }
}

function mergeCustomLists(local, remote) {
    const map = {};
    local.forEach(s => { map[s.Words] = s; });
    remote.forEach(s => { map[s.Words] = s; }); // remote 覆蓋 local
    return Object.values(map);
}

// ===== 自動產生下一個編號 =====
function getNextCustomWordsId(baseWord) {
    if (!baseWord || !baseWord.trim()) return '';
    const base = baseWord.trim().toLowerCase();

    // 掃描主資料
    let maxNum = 0;
    if (typeof sentenceData !== 'undefined' && Array.isArray(sentenceData)) {
        sentenceData.forEach(s => {
            if (s.Words && s.Words.toLowerCase().startsWith(base + '-')) {
                const num = parseInt(s.Words.split('-').pop(), 10);
                if (!isNaN(num) && num > maxNum) maxNum = num;
            }
        });
    }

    // 掃描自訂資料
    const customs = getCustomSentences();
    customs.forEach(s => {
        if (s.Words && s.Words.toLowerCase().startsWith(base + '-')) {
            const num = parseInt(s.Words.split('-').pop(), 10);
            if (!isNaN(num) && num > maxNum) maxNum = num;
        }
    });

    return `${base}-${maxNum + 1}`;
}

// ===== 開啟 Modal（全域，無預填）=====
function openAddCustomModal() {
    clearCustomModal();
    document.getElementById('customModalTitle').textContent = '新增自訂句子';
    document.getElementById('editCustomId').value = '';
    document.getElementById('addCustomModal').style.display = 'flex';
}

// ===== 開啟 Modal（從單字列表，預填當前單字）=====
let _currentWordForAdd = '';
function openAddCustomModalForWord() {
    clearCustomModal();
    document.getElementById('customModalTitle').textContent = '新增句子';
    document.getElementById('editCustomId').value = '';

    // 從 sentenceList 標題取得當前單字
    const titleEl = document.getElementById('wordListTitle');
    if (titleEl) {
        const raw = titleEl.querySelector('span')?.textContent || titleEl.textContent;
        // 格式可能是 "absorb 的句子 (10句)" 或 "absorb"
        const match = raw.match(/^([a-zA-Z\-]+)/);
        if (match) {
            _currentWordForAdd = match[1].replace(/ 的句子.*/, '').trim();
            document.getElementById('customWords').value = _currentWordForAdd;
            suggestCustomWordsId();
        }
    }
    document.getElementById('addCustomModal').style.display = 'flex';
}

// ===== 開啟編輯 Modal =====
function openEditCustomModal(wordsId) {
    const list = getCustomSentences();
    const item = list.find(s => s.Words === wordsId);
    if (!item) return;

    clearCustomModal();
    document.getElementById('customModalTitle').textContent = '編輯自訂句子';
    document.getElementById('editCustomId').value = wordsId;

    // 填入現有值
    const baseWord = wordsId.replace(/-\d+$/, '');
    document.getElementById('customWords').value = baseWord;
    document.getElementById('customWordsIdPreview').textContent = wordsId;
    document.getElementById('customSentence').value = item['句子'] || '';
    document.getElementById('customChinese').value = item['中文'] || '';
    document.getElementById('customLevel').value = item['等級'] || '';
    document.getElementById('customCelebrity').value = item['名人'] || '';
    document.getElementById('customCat1').value = item['分類1'] || '';
    document.getElementById('customCat2').value = item['分類2'] || '';
    document.getElementById('customCat3').value = item['分類3'] || '';
    document.getElementById('customRecord').value = item['記錄'] || '';

    document.getElementById('addCustomModal').style.display = 'flex';
}

// ===== 關閉 Modal =====
function closeAddCustomModal() {
    document.getElementById('addCustomModal').style.display = 'none';
    _currentWordForAdd = '';
}

// ===== 清空 Modal 表單 =====
function clearCustomModal() {
    document.getElementById('customWords').value = '';
    document.getElementById('customWordsIdPreview').textContent = '';
    document.getElementById('customWordsHint').textContent = '輸入單字，系統將自動編號';
    document.getElementById('customSentence').value = '';
    document.getElementById('customChinese').value = '';
    document.getElementById('customLevel').value = '';
    document.getElementById('customCelebrity').value = '';
    document.getElementById('customCat1').value = '';
    document.getElementById('customCat2').value = '';
    document.getElementById('customCat3').value = '';
    document.getElementById('customRecord').value = '';
}

// ===== 輸入單字時即時預覽編號，並自動帶入分類/等級 =====
function suggestCustomWordsId() {
    const editId = document.getElementById('editCustomId').value;
    if (editId) return; // 編輯模式不更新預覽

    const base = document.getElementById('customWords').value.trim().toLowerCase();
    if (!base) {
        document.getElementById('customWordsIdPreview').textContent = '';
        document.getElementById('customWordsHint').textContent = '輸入單字，系統將自動編號';
        return;
    }
    const nextId = getNextCustomWordsId(base);
    document.getElementById('customWordsIdPreview').textContent = `→ ${nextId}`;
    document.getElementById('customWordsHint').textContent = `將儲存為：${nextId}`;

    // 自動帶入該單字的分類與等級
    autoFillWordMeta(base);
}

function autoFillWordMeta(base) {
    // 優先從 wordsData 找（單字主資料）
    let wordObj = null;
    if (typeof wordsData !== 'undefined' && Array.isArray(wordsData)) {
        wordObj = wordsData.find(w => (w.Words || '').toLowerCase() === base);
    }
    // 若找不到，從 sentenceData 找同 base word 的第一筆
    if (!wordObj && typeof sentenceData !== 'undefined' && Array.isArray(sentenceData)) {
        const match = sentenceData.find(s =>
            s && s.Words && s.Words.toLowerCase().startsWith(base + '-') && !s.isCustom
        );
        if (match) wordObj = match;
    }
    if (!wordObj) return; // 全新單字，不帶入

    // 只在欄位為空時自動填入，不覆蓋使用者已輸入的內容
    const level = document.getElementById('customLevel');
    const cat1  = document.getElementById('customCat1');
    const cat2  = document.getElementById('customCat2');
    const cat3  = document.getElementById('customCat3');

    if (level && !level.value)
        level.value = wordObj['等級'] || '';
    if (cat1 && !cat1.value)
        cat1.value = wordObj['分類1'] || (Array.isArray(wordObj['分類']) ? wordObj['分類'][0] : '') || '';
    if (cat2 && !cat2.value)
        cat2.value = wordObj['分類2'] || (Array.isArray(wordObj['分類']) ? wordObj['分類'][1] : '') || '';
    if (cat3 && !cat3.value)
        cat3.value = wordObj['分類3'] || (Array.isArray(wordObj['分類']) ? wordObj['分類'][2] : '') || '';
}

// ===== 儲存自訂句子 =====
function saveCustomSentence() {
    const baseWord = document.getElementById('customWords').value.trim();
    const sentenceText = document.getElementById('customSentence').value.trim();
    const chinese = document.getElementById('customChinese').value.trim();

    // 驗證必填
    if (!baseWord) {
        alert('請輸入單字！');
        return;
    }
    if (!sentenceText) {
        alert('請輸入英文句子！');
        return;
    }
    // 中文翻譯為選填，不強制驗證

    const editId = document.getElementById('editCustomId').value;
    const list = getCustomSentences();

    let wordsId;
    if (editId) {
        // 編輯模式：保持原有 Words ID
        wordsId = editId;
        const idx = list.findIndex(s => s.Words === editId);
        if (idx === -1) {
            alert('找不到要編輯的句子！');
            return;
        }
        list[idx] = buildCustomSentenceObj(wordsId, baseWord, sentenceText, chinese);
        if (typeof showNotification === 'function') showNotification('✅ 自訂句子已更新！', 'success');
    } else {
        // 新增模式：自動產生編號
        wordsId = getNextCustomWordsId(baseWord);
        const newItem = buildCustomSentenceObj(wordsId, baseWord, sentenceText, chinese);
        list.push(newItem);
        if (typeof showNotification === 'function') showNotification('✅ 自訂句子已新增！', 'success');
    }

    saveCustomSentencesToStorage(list);
    injectCustomSentencesIntoData();
    closeAddCustomModal();
}

function buildCustomSentenceObj(wordsId, baseWord, sentenceText, chinese) {
    return {
        'Words': wordsId,
        '句子': sentenceText,
        '中文': chinese,
        '等級': document.getElementById('customLevel').value.trim(),
        '名人': document.getElementById('customCelebrity').value.trim(),
        '分類1': document.getElementById('customCat1').value.trim(),
        '分類2': document.getElementById('customCat2').value.trim(),
        '分類3': document.getElementById('customCat3').value.trim(),
        '記錄': document.getElementById('customRecord').value.trim(),
        '音檔': '',
        'isCustom': true,
        'createdAt': new Date().toISOString()
    };
}

// ===== 刪除自訂句子 =====
function deleteCustomSentence(wordsId) {
    if (!confirm(`確定要刪除「${wordsId}」嗎？`)) return;
    let list = getCustomSentences();
    list = list.filter(s => s.Words !== wordsId);
    saveCustomSentencesToStorage(list);
    injectCustomSentencesIntoData();
    if (typeof showNotification === 'function') showNotification('🗑️ 已刪除自訂句子', 'success');
}

// ===== 將自訂句子注入 sentenceData（混入主資料）=====
function injectCustomSentencesIntoData() {
    if (typeof sentenceData === 'undefined') {
        console.warn('sentenceData 尚未就緒');
        return;
    }

    const customs = getCustomSentences();

    // 移除舊的自訂句子，再重新加入
    for (let i = sentenceData.length - 1; i >= 0; i--) {
        if (sentenceData[i].isCustom) sentenceData.splice(i, 1);
    }

    customs.forEach(c => {
        // 補充分類陣列
        if (!c['分類']) {
            c['分類'] = [c['分類1'], c['分類2'], c['分類3']].filter(Boolean);
        }
        sentenceData.push(c);
    });

    console.log(`✅ 已注入 ${customs.length} 筆自訂句子到 sentenceData`);
}

// ===== 匯出自訂句子為 JSON =====
function exportCustomSentences() {
    const list = getCustomSentences();
    if (list.length === 0) {
        if (typeof showNotification === 'function') showNotification('⚠️ 目前沒有自訂句子可匯出', 'error');
        return;
    }

    // 輸出格式對應 Excel 欄位
    const exportList = list.map(s => ({
        '音檔': '',
        '等級': s['等級'] || '',
        '分類1': s['分類1'] || '',
        '分類2': s['分類2'] || '',
        '分類3': s['分類3'] || '',
        'Words': s['Words'] || '',
        '名人': s['名人'] || '',
        '句子': s['句子'] || '',
        '中文': s['中文'] || '',
        '記錄': s['記錄'] || ''
    }));

    const blob = new Blob([JSON.stringify(exportList, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `custom_sentences_export_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (typeof showNotification === 'function') showNotification(`✅ 已匯出 ${list.length} 筆自訂句子`, 'success');
}

// ===== 「我的自訂」分類進入點（在 startLearning 中呼叫）=====
function showMyCustomSentences() {
    const list = getCustomSentences();
    if (list.length === 0) {
        if (typeof showNotification === 'function') showNotification('⚠️ 目前沒有自訂句子', 'error');
        return;
    }
    if (typeof displaySentenceList === 'function') {
        const sorted = list.sort((a, b) => a.Words.localeCompare(b.Words));
        displaySentenceList(sorted, '🖊️ 我的自訂句子');
    }
}

// ===== 偵測「我的自訂」分類是否被選中（整合到 startLearning）=====
// 在 sentence.js 的 startLearning 中，selectedSpecials 會包含 'my_custom'
// 我們在 sentence.js 的 switch case 加入處理，這裡提供 helper
function getCustomSentencesByFilter(selectedSpecials) {
    if (!selectedSpecials.includes('my_custom')) return null;
    return getCustomSentences();
}

// ===== 顯示句子列表時，為自訂句子加上標籤 =====
// 這個函式供 sentence.js 的 displaySentenceList 呼叫
function getCustomBadge(sentence) {
    if (sentence.isCustom) {
        return '<span class="custom-badge">🖊️自訂</span>';
    }
    return '';
}

// ===== 在句子列表底部顯示/隱藏「+新增」按鈕 =====
function showAddSentenceInListBtn(word) {
    _currentWordForAdd = word;
    const container = document.getElementById('addSentenceInListContainer');
    if (container) container.style.display = 'block';
}

function hideAddSentenceInListBtn() {
    const container = document.getElementById('addSentenceInListContainer');
    if (container) container.style.display = 'none';
}

// ===== 去重複偵測（方案B，手動觸發）=====
function checkCustomSyncStatus() {
    const customs = getCustomSentences();
    if (customs.length === 0) {
        return { exactMatches: [], sentenceOnlyMatches: [] };
    }

    const exactMatches = [];
    const sentenceOnlyMatches = [];

    if (typeof sentenceData === 'undefined') return { exactMatches, sentenceOnlyMatches };

    // 只比對非自訂的主資料
    const mainData = sentenceData.filter(s => !s.isCustom);

    customs.forEach(custom => {
        const customWords = (custom.Words || '').toLowerCase();
        const customSentence = (custom['句子'] || '').trim().toLowerCase();

        // 完全符合：Words + 句子 都相同
        const exactMatch = mainData.find(m =>
            (m.Words || '').toLowerCase() === customWords &&
            (m['句子'] || '').trim().toLowerCase() === customSentence
        );

        if (exactMatch) {
            exactMatches.push({ custom, main: exactMatch });
            return;
        }

        // 只有句子相同，Words 不同
        const sentenceMatch = mainData.find(m =>
            (m['句子'] || '').trim().toLowerCase() === customSentence &&
            (m.Words || '').toLowerCase() !== customWords
        );

        if (sentenceMatch) {
            sentenceOnlyMatches.push({ custom, main: sentenceMatch });
        }
    });

    return { exactMatches, sentenceOnlyMatches };
}

function removeCustomSentenceById(wordsId, fromFirebase = false) {
    let list = getCustomSentences();
    list = list.filter(s => s.Words !== wordsId);
    localStorage.setItem(CUSTOM_SENTENCES_KEY, JSON.stringify(list));
    if (fromFirebase) {
        syncCustomSentencesToFirebase(list);
    }
    injectCustomSentencesIntoData();
}

// ===== 初始化：頁面載入後注入自訂句子 =====
document.addEventListener('DOMContentLoaded', function () {
    // 等主資料載入後再注入（延遲確保 sentenceData 已就緒）
    setTimeout(() => {
        injectCustomSentencesIntoData();
        loadCustomSentencesFromFirebase();
    }, 2000);

    // Firebase 登入後重新同步
    if (typeof firebase !== 'undefined') {
        setTimeout(() => {
            if (firebase.auth) {
                firebase.auth().onAuthStateChanged(user => {
                    if (user) {
                        loadCustomSentencesFromFirebase();
                    }
                });
            }
        }, 1000);
    }

    // 點擊 Modal 背景關閉
    const overlay = document.getElementById('addCustomModal');
    if (overlay) {
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closeAddCustomModal();
        });
    }
});

console.log('✅ custom-sentences.js 載入完成');
