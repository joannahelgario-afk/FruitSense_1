const URL = "https://teachablemachine.withgoogle.com/models/ybqPk8MrH/";

let model;
let maxPredictions;
let fileUploaded = false;
let cameraStream = null;
let isAnalyzing = false;

const get = id => document.getElementById(id);


async function loadModel() {
    const status = get("modelStatus");

    try {
        model = await tmImage.load(
            URL + "model.json",
            URL + "metadata.json"
        );

        maxPredictions = model.getTotalClasses();

        status.className =
            "inline-flex items-center px-3 py-2 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200";

        status.innerHTML =
            '<span class="status-dot bg-emerald-500"></span>Model Ready';

    } catch (error) {
        console.error("Model loading error:", error);

        status.className =
            "inline-flex items-center px-3 py-2 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200";

        status.innerHTML =
            '<span class="status-dot bg-rose-500"></span>Model Load Failed';
    }
}

loadModel();


get("uploadButton").addEventListener("click", () => {
    get("imageUpload").click();
});

get("openCameraButton").addEventListener("click", () => {

    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        get("cameraCapture").click();
    } else {
        startCamera();
    }
});

get("captureButton").addEventListener("click", capturePhoto);
get("stopCameraButton").addEventListener("click", stopCamera);
get("clearButton").addEventListener("click", resetUpload);
get("classifyBtn").addEventListener("click", runAnalysis);

get("imageUpload").addEventListener("change", function () {
    if (this.files && this.files[0]) {
        stopCamera();
        processFile(this.files[0]);
    }
});

get("cameraCapture").addEventListener("change", function () {
    if (this.files && this.files[0]) {
        processFile(this.files[0]);
    }

    this.value = "";
});


function processFile(file) {
    if (isAnalyzing) return;

    if (!file || !file.type.startsWith("image/")) {
        alert("Please select a valid image.");
        return;
    }

    const reader = new FileReader();

    reader.onload = function (event) {
        const image = get("imagePreview");

        image.onload = function () {
            image.classList.remove("hidden");
            get("webcamPreview").classList.add("hidden");
            get("uploadPrompt").classList.add("hidden");
            get("previewContainer").classList.remove("hidden");
            get("cameraControls").classList.add("hidden");

            get("cameraMessage").classList.add("hidden");

            fileUploaded = true;

            resetResults();
            updateButton(true, "Run Inference Analysis");
        };

        image.onerror = function () {
            alert("Unable to display this image. Please choose another image.");
        };

        image.src = event.target.result;
    };

    reader.onerror = function () {
        alert("The image could not be read. Please try another file.");
    };

    reader.readAsDataURL(file);
}


async function startCamera() {
    if (isAnalyzing) return;

    const message = get("cameraMessage");
    message.classList.add("hidden");

    if (!navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia) {

        message.textContent =
            "Webcam access requires HTTPS or localhost. Open the page using a local preview server.";
        message.classList.remove("hidden");
        return;
    }

    try {
        stopCamera();

        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "user"
            },
            audio: false
        });

        const video = get("webcamPreview");

        video.srcObject = cameraStream;
        video.classList.remove("hidden");

        get("imagePreview").classList.add("hidden");
        get("uploadPrompt").classList.add("hidden");
        get("previewContainer").classList.remove("hidden");
        get("cameraControls").classList.remove("hidden");

        fileUploaded = false;

        resetResults();
        updateButton(false, "Capture a Photo First");

        await video.play();

    } catch (error) {
        console.error("Webcam error:", error);

        let messageText = "Unable to open the webcam.";

        if (error.name === "NotAllowedError") {
            messageText =
                "Camera permission was denied. Allow camera access in your browser settings.";
        } else if (error.name === "NotFoundError") {
            messageText =
                "No webcam was found. Check that your laptop camera is connected.";
        } else if (error.name === "NotReadableError") {
            messageText =
                "The webcam may be in use by another application. Close other camera apps and try again.";
        }

        message.textContent = messageText;
        message.classList.remove("hidden");

        stopCamera();
    }
}


function capturePhoto() {
    const video = get("webcamPreview");

    if (!cameraStream || !video.videoWidth) {
        alert("Please wait for the webcam preview to start.");
        return;
    }

    const canvas = document.createElement("canvas");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    context.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
    );

    canvas.toBlob(blob => {
        if (!blob) {
            alert("Unable to capture the photo. Please try again.");
            return;
        }

        const file = new File(
            [blob],
            "webcam-photo.jpg",
            { type: "image/jpeg" }
        );

        stopCamera();
        processFile(file);

    }, "image/jpeg", 0.95);
}


function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }

    const video = get("webcamPreview");

    if (video) {
        video.pause();
        video.srcObject = null;
        video.classList.add("hidden");
    }

    const controls = get("cameraControls");

    if (controls) {
        controls.classList.add("hidden");
    }
}


function updateButton(enabled, text) {
    const button = get("classifyBtn");

    button.disabled = !enabled;

    button.className = enabled
        ? "mt-6 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-4 px-4 rounded-xl text-sm flex items-center justify-center"
        : "mt-6 w-full bg-slate-100 text-slate-400 font-semibold py-4 px-4 rounded-xl text-sm flex items-center justify-center";

    get("btnText").textContent = text;
}


function resetResults() {
    get("resultPlaceholder").classList.remove("hidden");
    get("resultData").classList.add("hidden");
    get("analysisLoading").classList.add("hidden");
    get("analysisLoading").classList.remove("flex");
    get("timestampBadge").classList.add("hidden");
}


function resetUpload() {
    if (isAnalyzing) return;

    stopCamera();

    get("imageUpload").value = "";
    get("cameraCapture").value = "";
    get("imagePreview").src = "";
    get("imagePreview").classList.add("hidden");

    get("uploadPrompt").classList.remove("hidden");
    get("previewContainer").classList.remove("hidden");
    get("cameraMessage").classList.add("hidden");

    fileUploaded = false;

    resetResults();
    updateButton(false, "Run Inference Analysis");
}


function isRipenessClass(name) {
    return /\bunripe\b|\boverripe\b|\bripe\b/i.test(name);
}

function isNotBananaClass(name) {
    const text = name.toLowerCase();

    return text.includes("not banana") ||
           text.includes("not a banana") ||
           text.includes("no banana");
}

function isEmptyClass(name) {
    const text = name.toLowerCase();

    return text.includes("empty") ||
           text.includes("background");
}


async function runAnalysis() {
    if (!fileUploaded || !model || isAnalyzing) {
        if (!model) {
            alert("The AI model is not ready. Please wait and try again.");
        }
        return;
    }

    isAnalyzing = true;

    const button = get("classifyBtn");
    const loading = get("analysisLoading");

    button.disabled = true;

    get("resultPlaceholder").classList.add("hidden");
    get("resultData").classList.add("hidden");
    get("timestampBadge").classList.add("hidden");

    loading.classList.remove("hidden");
    loading.classList.add("flex");

    get("btnText").innerHTML =
        '<span class="button-spinner"></span>Analyzing...';

    try {
        const image = get("imagePreview");

        let predictions = await model.predict(image);

        predictions.sort((a, b) => b.probability - a.probability);

        const bestPrediction = predictions[0];
        const bestName = bestPrediction.className;

        let displayedPredictions;

        if (isRipenessClass(bestName)) {
            const lowerBestName = bestName.toLowerCase();

            let variety = null;

            if (lowerBestName.includes("saba")) {
                variety = "saba";
            } else if (lowerBestName.includes("cavendish")) {
                variety = "cavendish";
            }

            displayedPredictions = predictions.filter(pred => {
                const name = pred.className.toLowerCase();

                return isRipenessClass(name) &&
                    (!variety || name.includes(variety));
            });

            if (displayedPredictions.length === 0) {
                displayedPredictions = [bestPrediction];
            }

        } else {
            displayedPredictions = [bestPrediction];
        }

        displayedPredictions.sort(
            (a, b) => b.probability - a.probability
        );

        const result = displayedPredictions[0];
        const className = result.className;
        const lowerName = className.toLowerCase();

        const confidence =
            (result.probability * 100).toFixed(1) + "%";

        const breakdown = get("classBreakdownContainer");
        breakdown.innerHTML = "";

        displayedPredictions.forEach(pred => {
            const percentage = (pred.probability * 100).toFixed(1);

            const row = document.createElement("div");
            row.className = "space-y-1";

            const labelRow = document.createElement("div");
            labelRow.className =
                "flex justify-between gap-3 text-xs font-medium";

            const label = document.createElement("span");
            label.className = "text-slate-700";
            label.textContent = pred.className;

            const score = document.createElement("span");
            score.className = "text-slate-500 font-semibold shrink-0";
            score.textContent = percentage + "%";

            labelRow.append(label, score);

            const track = document.createElement("div");
            track.className =
                "w-full bg-slate-100 rounded-full h-1.5 overflow-hidden";

            const bar = document.createElement("div");
            bar.className =
                "bg-emerald-600 h-1.5 rounded-full transition-all duration-500";
            bar.style.width = percentage + "%";

            track.appendChild(bar);
            row.append(labelRow, track);
            breakdown.appendChild(row);
        });

        let tip =
            "Please upload or capture a clear image of a banana to analyze its variety and ripeness.";

        let shelfLife = "N/A";
        let qualityStatus = "Not a Banana";
        let scientificName = "";

        if (lowerName.includes("saba")) {
            scientificName = "Musa × paradisiaca";
        } else if (lowerName.includes("cavendish")) {
            scientificName = "Musa acuminata";
        }


        if (/\bunripe\b/.test(lowerName)) {
            tip =
                "Store at room temperature away from direct sunlight while the banana ripens.";

            shelfLife = "Estimated: 5–8 days";
            qualityStatus = "Unripe";

        } else if (/\boverripe\b/.test(lowerName)) {
            tip =
                "Use soon for cooking or processing. Check the fruit's actual condition before use.";

            shelfLife = "Estimated: 1 day";
            qualityStatus = "Overripe";

        } else if (/\bripe\b/.test(lowerName)) {
            tip =
                "Use soon. Refrigeration may slow further ripening.";

            shelfLife = "Estimated: 2–4 days";
            qualityStatus = "Ripe";

        } else if (isEmptyClass(className)) {
            tip =
                "No banana sample was detected. Please place a banana clearly in the frame and try again.";

            shelfLife = "N/A";
            qualityStatus = "Empty Frame";
            scientificName = "";

        } else if (isNotBananaClass(className)) {
            tip =
                "Please upload or capture a clear picture of a banana to analyze its variety and ripeness.";

            shelfLife = "N/A";
            qualityStatus = "Not a Banana";
            scientificName = "";
        }

        get("predictedClass").textContent = className;
        get("scientificName").textContent = scientificName;
        get("topConfidence").textContent = confidence;
        get("shelfLifeText").textContent = shelfLife;
        get("qualityStatusText").textContent = qualityStatus;
        get("storageTip").textContent = tip;

        get("timestampBadge").textContent =
            "Analyzed: " + new Date().toLocaleTimeString();

        get("resultData").classList.remove("hidden");
        get("timestampBadge").classList.remove("hidden");

    } catch (error) {
        console.error("Analysis error:", error);

        alert(
            "Analysis failed. Please check your internet connection and try again."
        );

        get("resultPlaceholder").classList.remove("hidden");

    } finally {
        loading.classList.add("hidden");
        loading.classList.remove("flex");

        isAnalyzing = false;

        updateButton(fileUploaded, "Re-run Analysis");
    }
}
