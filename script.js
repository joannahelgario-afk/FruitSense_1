const URL = "https://teachablemachine.withgoogle.com/models/ybqPk8MrH/";
let model, maxPredictions;
let fileUploaded = false;
let cameraStream = null;

async function loadModel() {
    const status = document.getElementById("modelStatus");

    try {
        model = await tmImage.load(URL + "model.json", URL + "metadata.json");
        maxPredictions = model.getTotalClasses();

        status.innerHTML = "Model Ready";
        status.className = "text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full text-xs";
    } catch (error) {
        console.error(error);
        status.innerText = "Model Load Failed";
    }
}

loadModel();


// OPEN CAMERA
async function startCamera() {
    try {
        if (!navigator.mediaDevices?.getUserMedia) {
            alert("Use HTTPS or localhost to access the camera.");
            return;
        }

        stopCamera(true);

        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" } },
            audio: false
        });

        const video = document.getElementById("cameraPreview");
        video.srcObject = cameraStream;

        await video.play();

        video.classList.remove("hidden");
        document.getElementById("imagePreview").classList.add("hidden");
        document.getElementById("uploadPrompt").classList.add("hidden");
        document.getElementById("previewContainer").classList.remove("hidden");
        document.getElementById("cameraControls").classList.remove("hidden");

    } catch (error) {
        console.error(error);
        alert("Cannot open camera. Check your browser camera permission.");
        stopCamera();
    }
}


// CAPTURE PHOTO
function capturePhoto() {
    const video = document.getElementById("cameraPreview");

    if (!cameraStream || !video.videoWidth) {
        alert("Camera is not ready.");
        return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    canvas.getContext("2d").drawImage(video, 0, 0);

    canvas.toBlob(blob => {
        if (!blob) {
            alert("Unable to capture photo.");
            return;
        }

        const file = new File([blob], "banana.jpg", { type: "image/jpeg" });

        stopCamera(true);
        processFile(file);
    }, "image/jpeg", 0.95);
}


// STOP CAMERA
function stopCamera(keepPreview = false) {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }

    const video = document.getElementById("cameraPreview");
    video.pause();
    video.srcObject = null;
    video.classList.add("hidden");

    document.getElementById("cameraControls").classList.add("hidden");

    if (!keepPreview && !fileUploaded) {
        document.getElementById("previewContainer").classList.add("hidden");
        document.getElementById("uploadPrompt").classList.remove("hidden");
    }
}


// PROCESS IMAGE
function processFile(file) {
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();

    reader.onload = event => {
        const image = document.getElementById("imagePreview");

        image.onload = () => {
            image.classList.remove("hidden");
            document.getElementById("cameraPreview").classList.add("hidden");
            document.getElementById("uploadPrompt").classList.add("hidden");
            document.getElementById("previewContainer").classList.remove("hidden");

            const btn = document.getElementById("classifyBtn");
            btn.disabled = false;
            btn.className = "mt-6 w-full bg-emerald-600 text-white font-semibold py-3 rounded-xl cursor-pointer";
        };

        image.src = event.target.result;
    };

    reader.readAsDataURL(file);
    fileUploaded = true;
}


// RESET
function resetUpload() {
    stopCamera(true);

    document.getElementById("imageUpload").value = "";
    document.getElementById("cameraCapture").value = "";
    document.getElementById("imagePreview").src = "";
    document.getElementById("imagePreview").classList.add("hidden");
    document.getElementById("previewContainer").classList.add("hidden");
    document.getElementById("uploadPrompt").classList.remove("hidden");

    document.getElementById("resultPlaceholder").classList.remove("hidden");
    document.getElementById("resultData").classList.add("hidden");
    document.getElementById("timestampBadge").classList.add("hidden");

    document.getElementById("classifyBtn").disabled = true;
    document.getElementById("btnText").innerText = "Run Inference Analysis";

    fileUploaded = false;
}


// RUN ANALYSIS
async function runAnalysis() {
    if (!fileUploaded || !model) {
        alert("Please upload or capture an image first.");
        return;
    }

    const btnText = document.getElementById("btnText");
    const btn = document.getElementById("classifyBtn");

    btn.disabled = true;
    btnText.innerText = "Analyzing...";

    try {
        const image = document.getElementById("imagePreview");
        const predictions = await model.predict(image);

        predictions.sort((a, b) => b.probability - a.probability);

        const best = predictions[0];
        const className = best.className;
        const lower = className.toLowerCase();

        // VARIETY
        let variety = "Unknown";

        if (lower.includes("saba")) {
            variety = "Saba";
        } else if (lower.includes("cavendish")) {
            variety = "Cavendish";
        }

        document.getElementById("bananaVariety").innerText = variety;

        // RIPENESS
        let ripeness = "Unknown";

        if (lower.includes("overripe")) {
            ripeness = "Overripe";
        } else if (lower.includes("unripe")) {
            ripeness = "Unripe";
        } else if (lower.includes("ripe")) {
            ripeness = "Ripe";
        }

        document.getElementById("predictedClass").innerText = ripeness;
        document.getElementById("topConfidence").innerText =
            (best.probability * 100).toFixed(1) + "%";

        // CONFIDENCE BREAKDOWN
        const breakdown = document.getElementById("classBreakdownContainer");
        breakdown.innerHTML = "";

        predictions.forEach(pred => {
            const percent = (pred.probability * 100).toFixed(1);

            breakdown.innerHTML += `
                <div class="space-y-1">
                    <div class="flex justify-between text-xs">
                        <span>${pred.className}</span>
                        <span>${percent}%</span>
                    </div>
                    <div class="w-full bg-slate-100 rounded-full h-2">
                        <div class="bg-emerald-600 h-2 rounded-full"
                             style="width:${percent}%"></div>
                    </div>
                </div>`;
        });

        // STORAGE RECOMMENDATIONS
        let shelfLife = "3 - 5 Days";
        let quality = "Standard Grade";
        let tip = "Store according to suitable storage conditions.";

        if (ripeness === "Unripe") {
            shelfLife = "5 - 8 Days";
            quality = "Pre-Ripe / Stable";
            tip = "Keep at room temperature away from direct sunlight.";
        } else if (ripeness === "Ripe") {
            shelfLife = "2 - 4 Days";
            quality = "Optimal Consumption";
            tip = "Consume soon or refrigerate to slow ripening.";
        } else if (ripeness === "Overripe") {
            shelfLife = "Process Soon";
            quality = "Post-Peak Quality";
            tip = "Consider using for cooking or baking.";
        }

        document.getElementById("shelfLifeText").innerText = shelfLife;
        document.getElementById("qualityStatusText").innerText = quality;
        document.getElementById("storageTip").innerText = tip;

        document.getElementById("resultPlaceholder").classList.add("hidden");
        document.getElementById("resultData").classList.remove("hidden");
        document.getElementById("timestampBadge").classList.remove("hidden");

        btnText.innerText = "Re-run Analysis";

    } catch (error) {
        console.error(error);
        alert("Analysis failed. Please try again.");
        btnText.innerText = "Run Inference Analysis";
    }

    btn.disabled = false;
}
