/* ═══════════ AnimeSense AI — Firebase Authentication System ═══════════ */
/* Provides Google Sign-In + Email/Password auth with session management  */

const FirebaseAuth = (() => {
    // ═══════════ FIREBASE CONFIGURATION ═══════════
    const firebaseConfig = {
        apiKey: "AIzaSyDJ1CzJmBY1AB5yu76DHap8Jiq45nfSg6E",
        authDomain: "animesense-8246f.firebaseapp.com",
        projectId: "animesense-8246f",
        storageBucket: "animesense-8246f.firebasestorage.app",
        messagingSenderId: "10129235696",
        appId: "1:10129235696:web:59d6ffdb9e1bdaca0e6c35",
        measurementId: "G-JQRB1VFRFR"
    };

    let app = null;
    let auth = null;
    let currentUser = null;
    let authStateListeners = [];

    // ═══════════ INITIALIZATION ═══════════
    function init() {
        try {
            if (typeof firebase === 'undefined') {
                console.warn('[FirebaseAuth] Firebase SDK not loaded');
                return false;
            }
            // Initialize Firebase (only once)
            if (!firebase.apps || firebase.apps.length === 0) {
                app = firebase.initializeApp(firebaseConfig);
            } else {
                app = firebase.apps[0];
            }
            auth = firebase.auth();

            // Listen for auth state changes
            auth.onAuthStateChanged((user) => {
                if (user) {
                    currentUser = {
                        uid: user.uid,
                        email: user.email,
                        displayName: user.displayName || user.email?.split('@')[0] || 'Anime Fan',
                        photoURL: user.photoURL || null,
                        provider: user.providerData?.[0]?.providerId || 'unknown'
                    };
                    localStorage.setItem('as_user', JSON.stringify(currentUser));
                } else {
                    currentUser = null;
                    localStorage.removeItem('as_user');
                }
                updateAuthUI();
                authStateListeners.forEach(fn => fn(currentUser));
            });

            console.log('[FirebaseAuth] Initialized successfully');
            return true;
        } catch (err) {
            console.error("Failed to load data");
            return false;
        }
    }

    // ═══════════ AUTHENTICATION FUNCTIONS ═══════════

    // Google Sign-In
    async function signInWithGoogle() {
        try {
            if (!auth) throw new Error('Firebase not initialized');
            const provider = new firebase.auth.GoogleAuthProvider();
            provider.addScope('profile');
            provider.addScope('email');
            const result = await auth.signInWithPopup(provider);
            showAuthToast('success', `Welcome, ${result.user.displayName || 'Anime Fan'}! 🎉`);
            closeAuthModal();
            return { success: true, user: result.user };
        } catch (err) {
            const msg = getErrorMessage(err.code);
            showAuthToast('error', msg);
            return { success: false, error: msg };
        }
    }

    // Email/Password Sign Up
    async function signUpWithEmail(email, password) {
        try {
            if (!auth) throw new Error('Firebase not initialized');
            if (!email || !password) throw { code: 'auth/invalid-input' };
            if (password.length < 6) throw { code: 'auth/weak-password' };

            const result = await auth.createUserWithEmailAndPassword(email, password);
            // Set display name from email
            await result.user.updateProfile({
                displayName: email.split('@')[0]
            });
            showAuthToast('success', `Account created! Welcome, ${email.split('@')[0]}! 🎉`);
            closeAuthModal();
            return { success: true, user: result.user };
        } catch (err) {
            const msg = getErrorMessage(err.code);
            showAuthToast('error', msg);
            return { success: false, error: msg };
        }
    }

    // Email/Password Sign In
    async function signInWithEmail(email, password) {
        try {
            if (!auth) throw new Error('Firebase not initialized');
            if (!email || !password) throw { code: 'auth/invalid-input' };

            const result = await auth.signInWithEmailAndPassword(email, password);
            showAuthToast('success', `Welcome back, ${result.user.displayName || email.split('@')[0]}! 🎉`);
            closeAuthModal();
            return { success: true, user: result.user };
        } catch (err) {
            const msg = getErrorMessage(err.code);
            showAuthToast('error', msg);
            return { success: false, error: msg };
        }
    }

    // Logout
    async function logoutUser() {
        try {
            if (!auth) throw new Error('Firebase not initialized');
            await auth.signOut();
            showAuthToast('success', 'Logged out successfully 👋');
            return { success: true };
        } catch (err) {
            showAuthToast('error', 'Logout failed. Please try again.');
            return { success: false, error: err.message };
        }
    }

    // Get Current User
    function getCurrentUser() {
        if (currentUser) return currentUser;
        // Fallback: check localStorage
        const stored = localStorage.getItem('as_user');
        if (stored) {
            try { return JSON.parse(stored); } catch (e) { return null; }
        }
        return null;
    }

    // Check if user is authenticated
    function isAuthenticated() {
        return !!getCurrentUser();
    }

    // Register auth state listener
    function onAuthStateChange(callback) {
        authStateListeners.push(callback);
        // Fire immediately with current state
        if (currentUser !== undefined) callback(currentUser);
    }

    // ═══════════ ERROR MESSAGES ═══════════
    function getErrorMessage(code) {
        const messages = {
            'auth/invalid-input': 'Please enter both email and password.',
            'auth/email-already-in-use': 'An account with this email already exists. Try logging in instead.',
            'auth/invalid-email': 'Please enter a valid email address.',
            'auth/user-not-found': 'No account found with this email. Sign up first!',
            'auth/wrong-password': 'Incorrect password. Please try again.',
            'auth/invalid-credential': 'Incorrect email or password. Please try again.',
            'auth/weak-password': 'Password must be at least 6 characters long.',
            'auth/too-many-requests': 'Too many failed attempts. Please wait a moment and try again.',
            'auth/network-request-failed': 'Network error. Please check your internet connection.',
            'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
            'auth/popup-blocked': 'Pop-up blocked. Please allow pop-ups for this site.',
            'auth/operation-not-allowed': 'This sign-in method is not enabled. Contact support.',
            'auth/account-exists-with-different-credential': 'An account already exists with the same email but a different sign-in method.',
            'auth/requires-recent-login': 'Please sign in again to complete this action.'
        };
        return messages[code] || 'Something went wrong. Please try again.';
    }

    // ═══════════ UI MANAGEMENT ═══════════

    // Update all auth UI elements across the page
    function updateAuthUI() {
        const user = getCurrentUser();

        // Nav auth buttons (present on both index.html and chat.html)
        const loginBtn = document.getElementById('authLoginBtn');
        const userSection = document.getElementById('authUserSection');
        const userAvatar = document.getElementById('authUserAvatar');
        const userName = document.getElementById('authUserName');

        if (loginBtn && userSection) {
            if (user) {
                loginBtn.style.display = 'none';
                userSection.style.display = 'flex';
                if (userName) userName.textContent = user.displayName || 'User';
                if (userAvatar) {
                    if (user.photoURL) {
                        userAvatar.innerHTML = `<img src="${user.photoURL}" alt="avatar" class="auth-avatar-img" referrerpolicy="no-referrer">`;
                    } else {
                        const initials = (user.displayName || 'U').charAt(0).toUpperCase();
                        userAvatar.innerHTML = `<span class="auth-avatar-initials">${initials}</span>`;
                    }
                }
            } else {
                loginBtn.style.display = 'flex';
                userSection.style.display = 'none';
            }
        }

        // Chat auth gate
        const chatAuthGate = document.getElementById('chatAuthGate');
        const chatWelcome = document.getElementById('chatWelcome');
        const chatInputArea = document.querySelector('.chat-input-area');

        if (chatAuthGate) {
            if (user) {
                chatAuthGate.style.display = 'none';
                if (chatWelcome) chatWelcome.style.display = '';
                if (chatInputArea) chatInputArea.style.display = '';
            } else {
                chatAuthGate.style.display = 'flex';
                if (chatWelcome) chatWelcome.style.display = 'none';
                if (chatInputArea) chatInputArea.style.display = 'none';
            }
        }
    }

    // ═══════════ AUTH MODAL ═══════════

    function openAuthModal(mode = 'login') {
        let modal = document.getElementById('authModal');
        if (!modal) {
            createAuthModal();
            modal = document.getElementById('authModal');
        }
        // Set mode
        switchAuthMode(mode);
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        // Focus first input
        setTimeout(() => {
            const emailInput = document.getElementById('authEmail');
            if (emailInput) emailInput.focus();
        }, 200);
    }

    function closeAuthModal() {
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            // Clear inputs
            const emailInput = document.getElementById('authEmail');
            const passInput = document.getElementById('authPassword');
            const errorMsg = document.getElementById('authErrorMsg');
            if (emailInput) emailInput.value = '';
            if (passInput) passInput.value = '';
            if (errorMsg) errorMsg.style.display = 'none';
        }
    }

    function switchAuthMode(mode) {
        const title = document.getElementById('authModalTitle');
        const subtitle = document.getElementById('authModalSubtitle');
        const submitBtn = document.getElementById('authSubmitBtn');
        const switchText = document.getElementById('authSwitchText');
        const switchLink = document.getElementById('authSwitchLink');
        const errorMsg = document.getElementById('authErrorMsg');

        if (errorMsg) errorMsg.style.display = 'none';

        if (mode === 'login') {
            if (title) title.textContent = 'Welcome Back';
            if (subtitle) subtitle.textContent = 'Sign in to continue your anime journey';
            if (submitBtn) {
                submitBtn.textContent = 'Sign In';
                submitBtn.onclick = handleEmailLogin;
            }
            if (switchText) switchText.textContent = "Don't have an account? ";
            if (switchLink) {
                switchLink.textContent = 'Sign Up';
                switchLink.onclick = (e) => { e.preventDefault(); switchAuthMode('signup'); };
            }
        } else {
            if (title) title.textContent = 'Create Account';
            if (subtitle) subtitle.textContent = 'Join AnimeSense and unlock the full experience';
            if (submitBtn) {
                submitBtn.textContent = 'Create Account';
                submitBtn.onclick = handleEmailSignup;
            }
            if (switchText) switchText.textContent = 'Already have an account? ';
            if (switchLink) {
                switchLink.textContent = 'Sign In';
                switchLink.onclick = (e) => { e.preventDefault(); switchAuthMode('login'); };
            }
        }
    }

    async function handleEmailLogin() {
        const email = document.getElementById('authEmail')?.value?.trim();
        const password = document.getElementById('authPassword')?.value;
        const submitBtn = document.getElementById('authSubmitBtn');
        const errorMsg = document.getElementById('authErrorMsg');

        if (!email || !password) {
            showModalError('Please enter both email and password.');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';

        const result = await signInWithEmail(email, password);

        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';

        if (!result.success && errorMsg) {
            showModalError(result.error);
        }
    }

    async function handleEmailSignup() {
        const email = document.getElementById('authEmail')?.value?.trim();
        const password = document.getElementById('authPassword')?.value;
        const submitBtn = document.getElementById('authSubmitBtn');

        if (!email || !password) {
            showModalError('Please enter both email and password.');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';

        const result = await signUpWithEmail(email, password);

        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';

        if (!result.success) {
            showModalError(result.error);
        }
    }

    async function handleGoogleLogin() {
        const googleBtn = document.getElementById('authGoogleBtn');
        if (googleBtn) {
            googleBtn.disabled = true;
            googleBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting to Google...';
        }

        const result = await signInWithGoogle();

        if (googleBtn) {
            googleBtn.disabled = false;
            googleBtn.innerHTML = '<i class="fab fa-google"></i> Continue with Google';
        }

        if (!result.success) {
            showModalError(result.error);
        }
    }

    function showModalError(message) {
        const errorMsg = document.getElementById('authErrorMsg');
        if (errorMsg) {
            errorMsg.textContent = message;
            errorMsg.style.display = 'block';
            errorMsg.classList.add('shake');
            setTimeout(() => errorMsg.classList.remove('shake'), 500);
        }
    }

    // ═══════════ TOAST NOTIFICATIONS ═══════════
    function showAuthToast(type, message) {
        // Remove existing toast
        const existing = document.querySelector('.auth-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = `auth-toast auth-toast-${type}`;
        toast.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${message}</span>
        `;
        document.body.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => toast.classList.add('visible'));

        // Auto-dismiss
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 400);
        }, 4000);
    }

    // ═══════════ CREATE MODAL HTML ═══════════
    function createAuthModal() {
        if (document.getElementById('authModal')) return;

        const modal = document.createElement('div');
        modal.id = 'authModal';
        modal.className = 'auth-modal-overlay';
        modal.innerHTML = `
            <div class="auth-modal">
                <button class="auth-modal-close" onclick="FirebaseAuth.closeModal()" aria-label="Close">
                    <i class="fas fa-times"></i>
                </button>
                <div class="auth-modal-header">
                    <div class="auth-modal-logo">
                        <div class="logo-icon"><i class="fas fa-bolt"></i></div>
                        <span class="logo-text">Anime<span class="logo-accent">Sense</span></span>
                    </div>
                    <h2 id="authModalTitle">Welcome Back</h2>
                    <p id="authModalSubtitle">Sign in to continue your anime journey</p>
                </div>
                <div class="auth-modal-body">
                    <div id="authErrorMsg" class="auth-error-msg" style="display:none"></div>
                    <button id="authGoogleBtn" class="auth-google-btn" onclick="FirebaseAuth.handleGoogle()">
                        <i class="fab fa-google"></i>
                        Continue with Google
                    </button>
                    <div class="auth-divider">
                        <span>or</span>
                    </div>
                    <div class="auth-form">
                        <div class="auth-input-group">
                            <i class="fas fa-envelope"></i>
                            <input type="email" id="authEmail" placeholder="Email address" autocomplete="email">
                        </div>
                        <div class="auth-input-group">
                            <i class="fas fa-lock"></i>
                            <input type="password" id="authPassword" placeholder="Password" autocomplete="current-password">
                        </div>
                        <button id="authSubmitBtn" class="auth-submit-btn" onclick="FirebaseAuth.handleLogin()">
                            Sign In
                        </button>
                    </div>
                </div>
                <div class="auth-modal-footer">
                    <span id="authSwitchText">Don't have an account? </span>
                    <a href="#" id="authSwitchLink" onclick="event.preventDefault(); FirebaseAuth.switchMode('signup');">Sign Up</a>
                </div>
            </div>
        `;

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeAuthModal();
        });

        // Enter key support
        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const submitBtn = document.getElementById('authSubmitBtn');
                if (submitBtn && !submitBtn.disabled) submitBtn.click();
            }
            if (e.key === 'Escape') closeAuthModal();
        });

        document.body.appendChild(modal);
    }

    // ═══════════ INJECT AUTH STYLES ═══════════
    function injectStyles() {
        if (document.getElementById('authStyles')) return;
        const style = document.createElement('style');
        style.id = 'authStyles';
        style.textContent = `
            /* ═══ Auth Modal Overlay ═══ */
            .auth-modal-overlay {
                position: fixed; inset: 0; z-index: 10000;
                background: rgba(0,0,0,0.7);
                backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
                display: flex; align-items: center; justify-content: center;
                opacity: 0; visibility: hidden;
                transition: opacity 0.3s, visibility 0.3s;
            }
            .auth-modal-overlay.active {
                opacity: 1; visibility: visible;
            }
            .auth-modal-overlay.active .auth-modal {
                transform: translateY(0) scale(1);
                opacity: 1;
            }

            /* ═══ Auth Modal ═══ */
            .auth-modal {
                background: linear-gradient(145deg, rgba(20,20,40,0.98), rgba(10,10,26,0.98));
                border: 1px solid rgba(139,92,246,0.25);
                border-radius: 20px;
                width: 90%; max-width: 440px;
                padding: 40px;
                position: relative;
                transform: translateY(20px) scale(0.95);
                opacity: 0;
                transition: transform 0.4s cubic-bezier(0.16,1,0.3,1), opacity 0.3s;
                box-shadow: 0 25px 60px rgba(0,0,0,0.5), 0 0 40px rgba(139,92,246,0.1);
            }
            .auth-modal-close {
                position: absolute; top: 16px; right: 16px;
                background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
                color: rgba(255,255,255,0.5); border-radius: 10px;
                width: 36px; height: 36px; cursor: pointer;
                display: flex; align-items: center; justify-content: center;
                font-size: 14px; transition: all 0.2s;
            }
            .auth-modal-close:hover {
                background: rgba(255,255,255,0.1); color: #fff;
                border-color: rgba(255,255,255,0.2);
            }

            /* ═══ Modal Header ═══ */
            .auth-modal-header {
                text-align: center; margin-bottom: 32px;
            }
            .auth-modal-logo {
                display: flex; align-items: center; justify-content: center;
                gap: 10px; margin-bottom: 20px;
            }
            .auth-modal-logo .logo-icon {
                width: 40px; height: 40px; border-radius: 12px;
                background: linear-gradient(135deg, #8b5cf6, #06b6d4);
                display: flex; align-items: center; justify-content: center;
                font-size: 18px; color: #fff;
            }
            .auth-modal-logo .logo-text {
                font-size: 22px; font-weight: 700; color: #fff;
                font-family: 'Outfit', sans-serif;
            }
            .auth-modal-logo .logo-accent { color: #8b5cf6; }
            .auth-modal-header h2 {
                font-size: 26px; font-weight: 700; color: #fff;
                margin: 0 0 6px; font-family: 'Outfit', sans-serif;
            }
            .auth-modal-header p {
                font-size: 14px; color: rgba(255,255,255,0.5); margin: 0;
            }

            /* ═══ Google Button ═══ */
            .auth-google-btn {
                width: 100%; padding: 14px; border-radius: 12px;
                border: 1px solid rgba(255,255,255,0.12);
                background: rgba(255,255,255,0.05);
                color: #fff; font-size: 15px; font-weight: 500;
                cursor: pointer; display: flex; align-items: center;
                justify-content: center; gap: 10px;
                transition: all 0.25s; font-family: 'Outfit', sans-serif;
            }
            .auth-google-btn:hover {
                background: rgba(255,255,255,0.1);
                border-color: rgba(139,92,246,0.4);
                transform: translateY(-1px);
                box-shadow: 0 4px 15px rgba(139,92,246,0.15);
            }
            .auth-google-btn:disabled {
                opacity: 0.6; cursor: not-allowed; transform: none;
            }
            .auth-google-btn .fab { font-size: 18px; }

            /* ═══ Divider ═══ */
            .auth-divider {
                display: flex; align-items: center; gap: 16px;
                margin: 24px 0; color: rgba(255,255,255,0.3);
                font-size: 13px;
            }
            .auth-divider::before, .auth-divider::after {
                content: ''; flex: 1; height: 1px;
                background: rgba(255,255,255,0.1);
            }

            /* ═══ Form Inputs ═══ */
            .auth-input-group {
                position: relative; margin-bottom: 14px;
            }
            .auth-input-group i {
                position: absolute; left: 16px; top: 50%; transform: translateY(-50%);
                color: rgba(255,255,255,0.3); font-size: 14px;
                transition: color 0.2s;
            }
            .auth-input-group input {
                width: 100%; padding: 14px 16px 14px 44px;
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 12px; color: #fff; font-size: 15px;
                outline: none; transition: all 0.25s;
                font-family: 'Outfit', sans-serif;
                box-sizing: border-box;
            }
            .auth-input-group input::placeholder {
                color: rgba(255,255,255,0.35);
            }
            .auth-input-group input:focus {
                border-color: rgba(139,92,246,0.5);
                background: rgba(139,92,246,0.05);
                box-shadow: 0 0 0 3px rgba(139,92,246,0.1);
            }
            .auth-input-group input:focus + i,
            .auth-input-group:focus-within i {
                color: #8b5cf6;
            }

            /* ═══ Submit Button ═══ */
            .auth-submit-btn {
                width: 100%; padding: 14px; border-radius: 12px;
                background: linear-gradient(135deg, #8b5cf6, #6d28d9);
                border: none; color: #fff; font-size: 16px;
                font-weight: 600; cursor: pointer;
                transition: all 0.25s; margin-top: 8px;
                font-family: 'Outfit', sans-serif;
            }
            .auth-submit-btn:hover {
                background: linear-gradient(135deg, #a78bfa, #8b5cf6);
                transform: translateY(-1px);
                box-shadow: 0 6px 20px rgba(139,92,246,0.35);
            }
            .auth-submit-btn:disabled {
                opacity: 0.6; cursor: not-allowed; transform: none;
            }

            /* ═══ Error Message ═══ */
            .auth-error-msg {
                background: rgba(239,68,68,0.1);
                border: 1px solid rgba(239,68,68,0.3);
                border-radius: 10px; padding: 12px 16px;
                color: #fca5a5; font-size: 13px;
                margin-bottom: 16px; line-height: 1.4;
            }
            .auth-error-msg.shake {
                animation: authShake 0.5s ease;
            }
            @keyframes authShake {
                0%, 100% { transform: translateX(0); }
                20% { transform: translateX(-8px); }
                40% { transform: translateX(8px); }
                60% { transform: translateX(-4px); }
                80% { transform: translateX(4px); }
            }

            /* ═══ Footer ═══ */
            .auth-modal-footer {
                text-align: center; margin-top: 24px;
                font-size: 14px; color: rgba(255,255,255,0.4);
            }
            .auth-modal-footer a {
                color: #8b5cf6; text-decoration: none; font-weight: 600;
                transition: color 0.2s;
            }
            .auth-modal-footer a:hover { color: #a78bfa; }

            /* ═══ Nav Auth Elements ═══ */
            .auth-nav-login {
                display: flex; align-items: center; gap: 8px;
                padding: 8px 18px; border-radius: 10px;
                background: linear-gradient(135deg, #8b5cf6, #6d28d9);
                border: none; color: #fff; font-size: 14px;
                font-weight: 600; cursor: pointer;
                transition: all 0.25s; font-family: 'Outfit', sans-serif;
                white-space: nowrap;
            }
            .auth-nav-login:hover {
                background: linear-gradient(135deg, #a78bfa, #8b5cf6);
                transform: translateY(-1px);
                box-shadow: 0 4px 15px rgba(139,92,246,0.3);
            }
            .auth-user-section {
                display: none; align-items: center; gap: 10px;
            }
            .auth-user-avatar {
                width: 36px; height: 36px; border-radius: 50%;
                background: linear-gradient(135deg, #8b5cf6, #06b6d4);
                display: flex; align-items: center; justify-content: center;
                overflow: hidden; border: 2px solid rgba(139,92,246,0.3);
                cursor: pointer; transition: border-color 0.2s;
            }
            .auth-user-avatar:hover {
                border-color: rgba(139,92,246,0.7);
            }
            .auth-avatar-img {
                width: 100%; height: 100%; object-fit: cover; border-radius: 50%;
            }
            .auth-avatar-initials {
                color: #fff; font-size: 15px; font-weight: 700;
                font-family: 'Outfit', sans-serif;
            }
            .auth-user-name {
                color: rgba(255,255,255,0.8); font-size: 14px;
                font-weight: 500; max-width: 120px;
                overflow: hidden; text-overflow: ellipsis;
                white-space: nowrap;
            }
            .auth-logout-btn {
                padding: 6px 14px; border-radius: 8px;
                background: rgba(239,68,68,0.1);
                border: 1px solid rgba(239,68,68,0.2);
                color: #fca5a5; font-size: 13px;
                cursor: pointer; transition: all 0.2s;
                font-family: 'Outfit', sans-serif;
            }
            .auth-logout-btn:hover {
                background: rgba(239,68,68,0.2);
                border-color: rgba(239,68,68,0.4);
                color: #fff;
            }

            /* ═══ Chat Auth Gate ═══ */
            .chat-auth-gate {
                display: none; flex-direction: column;
                align-items: center; justify-content: center;
                padding: 60px 30px; text-align: center;
                flex: 1;
            }
            .chat-auth-gate .auth-gate-icon {
                width: 80px; height: 80px; border-radius: 20px;
                background: linear-gradient(135deg, rgba(139,92,246,0.15), rgba(6,182,212,0.15));
                display: flex; align-items: center; justify-content: center;
                font-size: 36px; color: #8b5cf6; margin-bottom: 24px;
                border: 1px solid rgba(139,92,246,0.2);
            }
            .chat-auth-gate h2 {
                font-size: 24px; font-weight: 700; color: #fff;
                margin: 0 0 10px; font-family: 'Outfit', sans-serif;
            }
            .chat-auth-gate p {
                color: rgba(255,255,255,0.5); font-size: 15px;
                margin: 0 0 28px; max-width: 400px; line-height: 1.6;
            }
            .auth-gate-btns {
                display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;
            }
            .auth-gate-btns .btn {
                padding: 12px 24px; border-radius: 12px;
                font-size: 15px; font-weight: 600; cursor: pointer;
                transition: all 0.25s; font-family: 'Outfit', sans-serif;
                border: none; display: flex; align-items: center; gap: 8px;
            }
            .auth-gate-btns .btn-primary {
                background: linear-gradient(135deg, #8b5cf6, #6d28d9);
                color: #fff;
            }
            .auth-gate-btns .btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(139,92,246,0.35);
            }
            .auth-gate-btns .btn-glass {
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.12);
                color: #fff;
            }
            .auth-gate-btns .btn-glass:hover {
                background: rgba(255,255,255,0.1);
            }

            /* ═══ Toast ═══ */
            .auth-toast {
                position: fixed; bottom: 30px; left: 50%;
                transform: translateX(-50%) translateY(20px);
                padding: 14px 24px; border-radius: 12px;
                display: flex; align-items: center; gap: 10px;
                font-size: 14px; font-weight: 500; color: #fff;
                z-index: 10001; opacity: 0;
                transition: all 0.4s cubic-bezier(0.16,1,0.3,1);
                font-family: 'Outfit', sans-serif;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                max-width: 90vw;
            }
            .auth-toast.visible {
                opacity: 1; transform: translateX(-50%) translateY(0);
            }
            .auth-toast-success {
                background: linear-gradient(135deg, rgba(34,197,94,0.9), rgba(22,163,74,0.9));
                border: 1px solid rgba(34,197,94,0.3);
            }
            .auth-toast-error {
                background: linear-gradient(135deg, rgba(239,68,68,0.9), rgba(220,38,38,0.9));
                border: 1px solid rgba(239,68,68,0.3);
            }

            /* ═══ Responsive ═══ */
            @media (max-width: 640px) {
                .auth-modal { padding: 28px 20px; margin: 16px; }
                .auth-modal-header h2 { font-size: 22px; }
                .auth-user-name { display: none; }
                .auth-user-section { gap: 6px; }
                .auth-logout-btn { padding: 6px 10px; font-size: 12px; }
            }
        `;
        document.head.appendChild(style);
    }

    // ═══════════ AUTO INIT ═══════════
    document.addEventListener('DOMContentLoaded', () => {
        injectStyles();
        init();
    });

    // ═══════════ PUBLIC API ═══════════
    return {
        init,
        signInWithGoogle,
        signUpWithEmail,
        signInWithEmail,
        logoutUser,
        getCurrentUser,
        isAuthenticated,
        onAuthStateChange,
        openModal: openAuthModal,
        closeModal: closeAuthModal,
        switchMode: switchAuthMode,
        handleLogin: handleEmailLogin,
        handleSignup: handleEmailSignup,
        handleGoogle: handleGoogleLogin,
        updateUI: updateAuthUI
    };
})();
