// Initialize Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// URL Parameters extraction
const urlParams = new URLSearchParams(window.location.search);
const question = urlParams.get('q') || "Describe the image provided in Part 2.";
const timeLimit = parseInt(urlParams.get('t')) || 60; // default 60s
const imageUrl = urlParams.get('img');
const partNumber = urlParams.get('p') || "1";

// Elements
const questionText = document.getElementById('question-text');
const imageSlot = document.getElementById('image-slot');
const questionImage = document.getElementById('question-image');
const progressBar = document.getElementById('progress-bar');
const stopBtn = document.getElementById('stop-btn');
const canvas = document.getElementById('visualizer');
const partIndicator = document.getElementById('part-indicator');
const ctx = canvas.getContext('2d');

// State
let timeLeft = timeLimit;
let timerInterval;
let audioContext;
let analyser;
let microphone;
let dataArray;
let animationId;

// Initialize UI
questionText.innerText = question;
partIndicator.innerText = `PART ${partNumber}`;

if (imageUrl) {
    questionImage.src = imageUrl;
    imageSlot.classList.remove('hidden');
}

// Timer Logic
function startTimer() {
    const startTime = Date.now();
    const endTime = startTime + timeLimit * 1000;

    timerInterval = setInterval(() => {
        const now = Date.now();
        const diff = endTime - now;

        if (diff <= 0) {
            clearInterval(timerInterval);
            finishTest();
            return;
        }

        const percentage = (diff / (timeLimit * 1000)) * 100;
        progressBar.style.width = `${percentage}%`;

        // Color transition
        if (percentage < 25) {
            progressBar.style.background = '#ff4141';
        } else if (percentage < 50) {
            progressBar.style.background = '#ffcc00';
        }
    }, 50);
}

// Real-time Visualizer Logic
async function initAudio() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);

        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);

        microphone.connect(analyser);
        animateVisualizer();
    } catch (err) {
        console.error("Microphone access denied:", err);
        // Fallback to static animation or error message
        animateVisualizer(true); // pass true for fallback
    }
}

function animateVisualizer(isFallback = false) {
    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const displayWidth = canvas.offsetWidth;
    const displayHeight = canvas.offsetHeight;

    let fallbackOffset = 0;

    function render() {
        ctx.clearRect(0, 0, displayWidth, displayHeight);

        if (isFallback) {
            // Simulated sine wave if mic is unavailable
            ctx.beginPath();
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#00d2ff';
            ctx.lineCap = 'round';
            for (let x = 0; x < displayWidth; x++) {
                const y = displayHeight / 2 + Math.sin(x * 0.05 + fallbackOffset) * 15;
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
            fallbackOffset += 0.1;
        } else {
            analyser.getByteFrequencyData(dataArray);

            const barWidth = (displayWidth / dataArray.length) * 2.5;
            let barHeight;
            let x = 0;

            for (let i = 0; i < dataArray.length; i++) {
                barHeight = (dataArray[i] / 255) * displayHeight;

                // Neon Gradient
                const gradient = ctx.createLinearGradient(0, displayHeight, 0, displayHeight - barHeight);
                gradient.addColorStop(0, 'rgba(0, 210, 255, 0.1)');
                gradient.addColorStop(0.5, 'rgba(0, 210, 255, 0.5)');
                gradient.addColorStop(1, '#00d2ff');

                ctx.fillStyle = gradient;
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#00d2ff';

                // Rounded bars
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

        animationId = requestAnimationFrame(render);
    }
    render();
}

// Finish Test
function finishTest() {
    clearInterval(timerInterval);
    cancelAnimationFrame(animationId);

    if (audioContext) audioContext.close();

    tg.sendData(JSON.stringify({
        status: "completed",
        part: partNumber,
        question: question,
        time_limit: timeLimit
    }));

    tg.close();
}

// Event Listeners
stopBtn.addEventListener('click', finishTest);

// Start everything
startTimer();
initAudio();
