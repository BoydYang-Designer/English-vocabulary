// auth-manager.js

const firebaseConfig = {
    apiKey: "AIzaSyDbGZT_q1zNQqdDtUNYy1sC63wHZtD6KAE",
    authDomain: "my-reading-challenge-app.firebaseapp.com",
    projectId: "my-reading-challenge-app",
    storageBucket: "my-reading-challenge-app.firebasestorage.app",
    messagingSenderId: "650410268845",
    appId: "1:650410268845:web:6752fe76b20e14a8adce24",
    measurementId: "G-TBVCTLJQMX"
};

// Initialize Firebase (if not already initialized)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Initialize Firestore service
const db = firebase.firestore();
console.log("Firebase and Firestore Initialized from auth-manager.js!");

let currentUser = null;
let vocabularyData = {}; // Global object for all user data
const LOCAL_STORAGE_KEY = 'vocabularyGuestData';

// --- Global Functions for Data Access ---
// These are attached to the window object to be accessible by other scripts.
window.getVocabularyData = () => vocabularyData;
window.persistVocabularyData = persistData;

// Setters for Word Data
window.setWrongWords = function(newWrongWords) {
    vocabularyData.wrongWords = newWrongWords;
}
window.setCheckedWords = function(newCheckedWords) {
    vocabularyData.checkedWords = newCheckedWords;
}
window.setImportantWords = function(newImportantWords) {
    vocabularyData.importantWords = newImportantWords;
}
window.setNotes = function(newNotes) {
    vocabularyData.notes = newNotes;
}
// Setters for Sentence Data
window.setCheckedSentences = function(newChecked) {
    vocabularyData.checkedSentences = newChecked;
}
window.setImportantSentences = function(newImportant) {
    vocabularyData.importantSentences = newImportant;
}
window.setNoteSentences = function(newNotes) {
    vocabularyData.noteSentences = newNotes;
}
window.setCheckedSentenceWords = function(newChecked) {
    vocabularyData.checkedSentenceWords = newChecked;
}

// --- Notification Helper ---
function showNotification(message, type = 'success') {
    const container = document.getElementById('notification-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

// --- Data Persistence Core ---
async function persistData() {
    if (currentUser) {
        await saveDataToFirestore();
    } else {
        saveDataToLocalStorage();
    }
}

async function loadDataFromFirestore() {
    if (!currentUser) return;
    try {
        const docRef = db.collection('userVocabulary').doc(currentUser.uid);
        const doc = await docRef.get();
        if (doc.exists) {
            vocabularyData = doc.data() || {};
            console.log("Successfully loaded data from Firestore.");
        } else {
            vocabularyData = {};
            console.log("No data for this user in Firestore yet.");
        }
    } catch (error) {
        console.error("Failed to load data from Firestore:", error);
        showNotification("⚠️ Could not load your cloud data.", "error");
        vocabularyData = {};
    }
}

async function saveDataToFirestore() {
    if (!currentUser) return;
    try {
        const docRef = db.collection('userVocabulary').doc(currentUser.uid);
        await docRef.set(vocabularyData);
        console.log("Successfully saved data to Firestore.");
    } catch (error) {
        console.error("Failed to save data to Firestore:", error);
        showNotification("⚠️ Cloud sync failed. Changes may not be saved.", "error");
    }
}

function loadDataFromLocalStorage() {
    try {
        const data = localStorage.getItem(LOCAL_STORAGE_KEY);
        vocabularyData = data ? JSON.parse(data) : {};
        console.log("Successfully loaded guest data from Local Storage.");
    } catch (e) {
        console.error("Failed to load data from Local Storage:", e);
        vocabularyData = {};
    }
}

function saveDataToLocalStorage() {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(vocabularyData));
        console.log("Successfully saved guest data to Local Storage.");
    } catch (e) {
        console.error("Failed to save data to Local Storage:", e);
    }
}

function mergeVocabularyData(guestData, userData) {
    const merged = { ...userData };
    const mergeSet = (key) => {
        const guestSet = new Set(guestData[key] || []);
        const userSet = new Set(userData[key] || []);
        guestSet.forEach(item => userSet.add(item));
        merged[key] = Array.from(userSet);
    };
    mergeSet('checkedWords');
    mergeSet('importantWords');
    mergeSet('wrongWords');
    merged.notes = { ...(userData.notes || {}), ...(guestData.notes || {}) };
    merged.quizHistory = { ...(userData.quizHistory || {}), ...(guestData.quizHistory || {}) };
    console.log("Merge complete:", merged);
    return merged;
}


// --- Authentication Core ---
firebase.auth().onAuthStateChanged(async (user) => {
    const loadingOverlay = document.getElementById('loading-overlay');
    
    if (user) {
        console.log("Auth state changed: User is logged in.", user);
        currentUser = user;
        await loadDataFromFirestore();

        const guestDataRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (guestDataRaw) {
            console.log("Guest data found, proceeding with merge...");
            try {
                const guestData = JSON.parse(guestDataRaw);
                vocabularyData = mergeVocabularyData(guestData, vocabularyData);
                await saveDataToFirestore();
                localStorage.removeItem(LOCAL_STORAGE_KEY);
                showNotification("✅ Guest data successfully merged!", "success");
            } catch (error) {
                console.error("Merging guest data failed:", error);
                showNotification("⚠️ Failed to merge guest data.", "error");
            }
        }
    } else {
        console.log("Auth state changed: User is logged out or in Guest Mode.");
        currentUser = null;
        
        // Check if user has previously entered guest mode
        const hasEnteredGuestMode = localStorage.getItem('hasEnteredGuestMode') === 'true';
        
        // If we are on the index page
        const loginView = document.getElementById('login-view');
        if (loginView) { // This element only exists on index.html
            if (hasEnteredGuestMode) {
                // User was in guest mode, show menu directly
                loadDataFromLocalStorage();
                if (loadingOverlay) loadingOverlay.style.display = 'none';
                loginView.classList.add('is-hidden');
                const menuView = document.getElementById('menu-view');
                const appContainer = document.getElementById('app-container');
                if (menuView) menuView.classList.remove('is-hidden');
                if (appContainer) appContainer.classList.add('is-hidden');
                updateUserInfoDisplay();
                document.dispatchEvent(new CustomEvent('auth-ready', { detail: { user: null } }));
                return;
            } else {
                // First time load, show login view
                if (loadingOverlay) loadingOverlay.style.display = 'none';
                loginView.classList.remove('is-hidden');
                const appContainer = document.getElementById('app-container');
                if(appContainer) appContainer.classList.add('is-hidden');
                const menuView = document.getElementById('menu-view');
                if(menuView) menuView.classList.add('is-hidden');
                return; // Stop further execution for non-logged-in users on the main page
            }
        } else {
            // On other pages (quiz, sentence), load from local storage for guest mode
            loadDataFromLocalStorage();
        }
    }

    // --- Show Menu View after successful login ---
    const loginView = document.getElementById('login-view');
    const menuView = document.getElementById('menu-view');
    const appContainer = document.getElementById('app-container');
    
    if (loginView && menuView) {
        if (loadingOverlay) loadingOverlay.style.display = 'none';
        loginView.classList.add('is-hidden');
        menuView.classList.remove('is-hidden');
        if(appContainer) appContainer.classList.add('is-hidden');
        
        // Update user info display
        updateUserInfoDisplay();
    }

    // --- CRITICAL STEP ---
    // Fire a custom event to notify other scripts that authentication is complete
    // and data (`vocabularyData`) is ready to be used.
    document.dispatchEvent(new CustomEvent('auth-ready', { detail: { user } }));
});

// --- Authentication UI Functions ---
function signIn() {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider).catch((error) => {
        console.error("Login failed:", error);
        showNotification(`Login failed: ${error.message}`, "error");
    });
}

function signOutUser() {
    // Clear guest mode flag when user signs out
    localStorage.removeItem('hasEnteredGuestMode');
    
    firebase.auth().signOut().catch((error) => {
        console.error("Logout failed:", error);
    });
}

async function enterGuestMode() {
    console.log("Entering Guest Mode...");
    currentUser = null;
    
    // Mark that user has entered guest mode
    localStorage.setItem('hasEnteredGuestMode', 'true');
    
    loadDataFromLocalStorage();
    
    // Show menu view for guest mode
    const loginView = document.getElementById('login-view');
    const menuView = document.getElementById('menu-view');
    const appContainer = document.getElementById('app-container');
    const loadingOverlay = document.getElementById('loading-overlay');
    
    if (loginView && menuView) {
        if (loadingOverlay) loadingOverlay.style.display = 'none';
        loginView.classList.add('is-hidden');
        menuView.classList.remove('is-hidden');
        if(appContainer) appContainer.classList.add('is-hidden');
        
        // Update user info display
        updateUserInfoDisplay();
    }
    
    // Fire the 'auth-ready' event for guest mode as well
    document.dispatchEvent(new CustomEvent('auth-ready', { detail: { user: null } }));
}

// --- Update User Info Display ---
function updateUserInfoDisplay() {
    const userInfo = document.getElementById('user-info');
    const userInfoMenu = document.getElementById('user-info-menu');
    const signOutBtn = document.getElementById('sign-out-btn');
    const signOutBtnMenu = document.getElementById('sign-out-btn-menu');
    const signInBtn = document.getElementById('sign-in-from-guest-btn');
    const signInBtnMenu = document.getElementById('sign-in-from-guest-btn-menu');
    
    if (currentUser) {
        const displayName = currentUser.displayName || currentUser.email || 'User';
        if (userInfo) userInfo.textContent = `👤 ${displayName}`;
        if (userInfoMenu) userInfoMenu.textContent = `👤 ${displayName}`;
        if (signOutBtn) signOutBtn.classList.remove('is-hidden');
        if (signOutBtnMenu) signOutBtnMenu.classList.remove('is-hidden');
        if (signInBtn) signInBtn.classList.add('is-hidden');
        if (signInBtnMenu) signInBtnMenu.classList.add('is-hidden');
    } else {
        if (userInfo) userInfo.textContent = '👤 訪客模式';
        if (userInfoMenu) userInfoMenu.textContent = '👤 訪客模式';
        if (signOutBtn) signOutBtn.classList.add('is-hidden');
        if (signOutBtnMenu) signOutBtnMenu.classList.add('is-hidden');
        if (signInBtn) signInBtn.classList.remove('is-hidden');
        if (signInBtnMenu) signInBtnMenu.classList.remove('is-hidden');
    }
}

// --- Initialize Login Buttons ---
document.addEventListener('DOMContentLoaded', function() {
    const googleSignInBtn = document.getElementById('google-signin-btn');
    const guestModeBtn = document.getElementById('guest-mode-btn');
    
    if (googleSignInBtn) {
        googleSignInBtn.addEventListener('click', signIn);
    }
    
    if (guestModeBtn) {
        guestModeBtn.addEventListener('click', enterGuestMode);
    }
});