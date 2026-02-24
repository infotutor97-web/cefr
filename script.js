/**
 * Language Speaking Test - Telegram Web App Script
 * Fully dynamic interface driven by URL parameters
 */

window.onload = function () {
    // 1. Initialize Telegram Web App
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.expand();
        window.Telegram.WebApp.ready();
    }

    // 2. URL Parsing
    const urlParams = new URLSearchParams(window.location.search);
    const p = urlParams.get('p') || "1";
    const q = urlParams.get('q') || "Please answer the question accurately.";
    const t = parseInt(urlParams.get('t')) || 60;
    const img = urlParams.get('img');

    // 3. UI Updates
    const partHeader = document.querySelector('.part-header');
    const questionText = document.querySelector('.question-text');
    const progressBar = document.getElementById('progress-bar');
    const imageSlot = document.getElementById('image-slot');
    const questionImage = document.getElementById('question-image');
    const stopBtn = document.getElementById('stop-btn');
    const canvas = document.getElementById('visualizer');
    const ctx = canvas.getContext('2d');

    if (partHeader) partHeader.textContent = "PART " + p;
    if (questionText) questionText.textContent = q;

    if (img) {
        questionImage.src = img;
        imageSlot.classList.remove('hidden');
    }

    // 4. Timer Logic
    let timeLeft = t;
    const startTime = Date.now();
    const endTime = startTime + t * 1000;

    const timerInterval = setInterval(() => {
        const now = Date.now();
        const diff = endTime - now;

        if (diff <= 0) {
            clearInterval(timerInterval);
            finishTest();
            return;
        }

        const percentage = (diff / (t * 1000)) * 100;
        progressBar.style.width = `${percentage}%`;

        // Modern color transition: Green -> Yellow -> Red
        if (percentage < 25) {
            progressBar.style.background = '#ff4141';
        } else if (percentage < 50) {
            progressBar.style.background = '#ffcc00';
        }
    }, 50);

    // 5. Audio Visualizer Setup
    let audioContext, analyser, dataArray, animationId;

    async function initAudio() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            const source = audioContext.createMediaStreamSource(stream);

            analyser.fftSize = 256;
            const bufferLength = analyser.frequencyBinCount;
            dataArray = new Uint8Array(bufferLength);

            source.connect(analyser);

            // Set canvas resolution for high-DPI screens
            canvas.width = canvas.offsetWidth * window.devicePixelRatio;
            canvas.height = canvas.offsetHeight * window.devicePixelRatio;
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

            draw();
        } catch (err) {
            console.error("Microphone access error:", err);
            // Fallback: static wave if mic access is denied
            drawFallback();
        }
    }

    // 6. draw() function for real-time animation
    function draw() {
        const displayWidth = canvas.offsetWidth;
        const displayHeight = canvas.offsetHeight;

        animationId = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, displayWidth, displayHeight);

        const barWidth = (displayWidth / dataArray.length) * 2.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < dataArray.length; i++) {
            barHeight = (dataArray[i] / 255) * displayHeight;

            // Create premium neon gradient
            const gradient = ctx.createLinearGradient(0, displayHeight, 0, displayHeight - barHeight);
            gradient.addColorStop(0, 'rgba(0, 210, 255, 0.1)');
            gradient.addColorStop(0.5, 'rgba(0, 210, 255, 0.4)');
            gradient.addColorStop(1, '#00d2ff');

            ctx.fillStyle = gradient;
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#00d2ff';

            // Draw smooth rounded bars
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(x, displayHeight - barHeight, barWidth - 2, barHeight, 4);
            } else {
                ctx.rect(x, displayHeight - barHeight, barWidth - 2, barHeight);
            }
            ctx.fill();

            x += barWidth;
        }
    }

    let fallbackOffset = 0;
    function drawFallback() {
        const displayWidth = canvas.offsetWidth;
        const displayHeight = canvas.offsetHeight;

        animationId = requestAnimationFrame(drawFallback);
        ctx.clearRect(0, 0, displayWidth, displayHeight);

        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#00d2ff';
        ctx.lineCap = 'round';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00d2ff';

        for (let x = 0; x < displayWidth; x++) {
            const y = displayHeight / 2 + Math.sin(x * 0.05 + fallbackOffset) * 12;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
        fallbackOffset += 0.1;
    }

    // 7. Test Completion Logic
    function finishTest() {
        clearInterval(timerInterval);
        cancelAnimationFrame(animationId);

        if (audioContext) audioContext.close();

        const result = {
            status: "finished",
            part: p,
            question: q,
            duration: t
        };

        if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.sendData(JSON.stringify(result));
            window.Telegram.WebApp.close();
        } else {
            console.log("Test finished locally:", result);
            alert("Test completed!");
        }
    }

    // Event Listeners
    if (stopBtn) stopBtn.addEventListener('click', finishTest);

    // Auto-start
    initAudio();
};
