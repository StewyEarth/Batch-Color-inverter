const inputElem = document.querySelector("#file-input");
const dropZone = document.getElementById("drop-zone");
const preview = document.getElementById("preview");
const clearBtn = document.getElementById("clear-btn");
const downloadBtn = document.getElementById("download-btn");
const fileInput = document.getElementById("file-input");
const modal = document.getElementById("image-modal");
const modalCanvas = document.getElementById("modal-canvas");
const closeModal = document.getElementById("close-modal");
let controlButtons = document.getElementById("controlButtons");
let disclaimer = document.getElementById("disclaimer");
let renameFilesLabel = document.getElementById("rename-files-label");
let currentCanvasIndex = 0;
const bgcolorpickerlabel = document.getElementById("bgcolor-label");
const transparentBackgroundCheckbox = document.getElementById("transparentBackground-checkbox");
let isCropping = false;

window.addEventListener("drop", (e) => {
  if ([...e.dataTransfer.items].some((item) => item.kind === "file")) {
    e.preventDefault();
  }
});

transparentBackgroundCheckbox.addEventListener("change", () => {
  if (transparentBackgroundCheckbox.checked) {
    bgcolorpickerlabel.classList.add("hidden");
  } else {
    bgcolorpickerlabel.classList.remove("hidden");
  }
});

dropZone.addEventListener("dragover", (e) => {
  const fileItems = [...e.dataTransfer.items].filter(
    (item) => item.kind === "file",
  );
  if (fileItems.length > 0) {
    e.preventDefault();
    if (fileItems.some((item) => item.type.startsWith("image/"))) {
      e.dataTransfer.dropEffect = "copy";
    } else {
      e.dataTransfer.dropEffect = "none";
    }
  }
});

window.addEventListener("dragover", (e) => {
  const fileItems = [...e.dataTransfer.items].filter(
    (item) => item.kind === "file",
  );
  if (fileItems.length > 0) {
    e.preventDefault();
    if (!dropZone.contains(e.target)) {
      e.dataTransfer.dropEffect = "none";
    }
  }
});

function invertImageColors(canvas) {
  const ctx = canvas.getContext("2d");
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255 - data[i];       // Invert Red
    data[i + 1] = 255 - data[i + 1]; // Invert Green
    data[i + 2] = 255 - data[i + 2]; // Invert Blue
  }

  ctx.putImageData(imageData, 0, 0);
}

function displayImages(files) {
  const bgcolorPicker = document.getElementById("bgcolor-picker");
  for (const file of files) {
    if (file.type.startsWith("image/")) {
      const container = document.createElement("div");
      container.className = "canvas-container";
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.classList.add("imagePreview");
      const url = URL.createObjectURL(file);
      const img = new Image();

      img.onload = function () {
        canvas.width = this.width;
        canvas.height = this.height;
        // If transparent background is UNchecked, fill with color picker value before drawing image
        if (transparentBackgroundCheckbox && !transparentBackgroundCheckbox.checked && bgcolorPicker) {
          ctx.fillStyle = bgcolorPicker.value || "#000000";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          invertImageColors(canvas);
        }
        ctx.drawImage(img, 0, 0);
        invertImageColors(canvas); // Invert colors after drawing the image
        URL.revokeObjectURL(img.src);
      };
      img.src = url;
      canvas.dataset.filename = file.name;
      canvas.dataset.blackpoint = "0"; // Default blackpoint value
      canvas.dataset.whitepoint = "255"; // Default whitepoint value
      container.appendChild(canvas);
      addCropButton(canvas, container);
      preview.appendChild(container);
      controlButtons.classList.remove("hidden");
      disclaimer.classList.add("hidden");
      updateFilenameOptionsVisibility(true);
    }
  }
}

// Show/hide filename options based on image presence
function updateFilenameOptionsVisibility(show) {
  document.getElementById("rename-files-label").classList.toggle("hidden", !show);
  // Only show use-custom-prefix-label if rename-files-checkbox is checked
  const renameFilesChecked = document.getElementById("rename-files-checkbox").checked;
  document.getElementById("use-custom-prefix-label").classList.toggle("hidden", !show || !renameFilesChecked);
  // Hide custom prefix input by default
  document.getElementById("custom-fileprefix-label").classList.add("hidden");
}

// Show/hide custom prefix input based on checkbox
const useCustomPrefixCheckbox = document.getElementById("use-custom-prefix-checkbox");
useCustomPrefixCheckbox.addEventListener("change", function() {
  document.getElementById("custom-fileprefix-label").classList.toggle("hidden", !this.checked);
});

// Show/hide use-custom-prefix-label when rename-files-checkbox changes
const renameFilesCheckbox = document.getElementById("rename-files-checkbox");
renameFilesCheckbox.addEventListener("change", function() {
  document.getElementById("use-custom-prefix-label").classList.toggle("hidden", !this.checked);
  // Hide custom prefix input if rename-files-checkbox is unchecked
  if (!this.checked) {
    document.getElementById("custom-fileprefix-label").classList.add("hidden");
    useCustomPrefixCheckbox.checked = false;
  }
});

function dropHandler(ev) {
  ev.preventDefault();
  const files = [...ev.dataTransfer.items]
    .map((item) => item.getAsFile())
    .filter((file) => file);
  displayImages(files);
}

dropZone.addEventListener("drop", dropHandler);

inputElem.addEventListener("change", (e)=>{
    displayImages(e.target.files);
});


clearBtn.addEventListener("click", () => {
    if (!confirm("Are you sure you want to clear all images?")) {
        return;
    }
    document.querySelectorAll(".canvas-container").forEach((canvas) => {
        canvas.remove();
    },);
    document.querySelectorAll(".crop-btn").forEach((btn) => {
        btn.remove();
    });
    controlButtons.classList.add("hidden");
    disclaimer.classList.remove("hidden");
    renameFilesLabel.classList.add("hidden");
    fileInput.value = "";
    updateFilenameOptionsVisibility(false);
    // Reset checkboxes and hide custom prefix
    renameFilesCheckbox.checked = false;
    useCustomPrefixCheckbox.checked = false;
    document.getElementById("custom-fileprefix-label").classList.add("hidden");
    document.getElementById("use-custom-prefix-label").classList.add("hidden");
});

downloadBtn.addEventListener("click", async () => {
  const { filePath } = await window.electronAPI.selectDirectory();

  if (filePath) {
    const renameFiles = document.getElementById("rename-files-checkbox").checked;
    const useCustomPrefix = document.getElementById("use-custom-prefix-checkbox").checked;
    const customPrefix = document.getElementById("custom-fileprefix-input").value || "image";
    const canvases = document.querySelectorAll(".imagePreview");
    const progressContainer = document.getElementById("download-progress-container");
    const progressBar = document.getElementById("download-progress-bar");
    progressContainer.style.display = "block";
    progressBar.style.width = "0%";

    for (let index = 0; index < canvases.length; index++) {
      const canvas = canvases[index];
      let filename;
      if (renameFiles) {
        filename = useCustomPrefix
          ? `${customPrefix}-${index + 1}.png`
          : `image-${index + 1}.png`;
      } else {
        filename = canvas.dataset.filename || `image-${index + 1}.png`;
      }
      const fullPath = `${filePath}/${filename}`;
      const dataUrl = canvas.toDataURL("image/png");
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
      window.electronAPI.saveImage(fullPath, base64Data);
      // Update progress bar
      progressBar.style.width = `${Math.round(((index + 1) / canvases.length) * 100)}%`;
      await new Promise(r => setTimeout(r, 60)); // Simulate progress for UI
    }
    setTimeout(() => {
      progressContainer.style.display = "none";
      progressBar.style.width = "0%";
    }, 800);
  }
});

// Show modal with larger canvas view
preview.addEventListener("click", (e) => {
  if (e.target.tagName === "CANVAS") {
    const canvases = Array.from(document.querySelectorAll(".imagePreview"));
    currentCanvasIndex = canvases.indexOf(e.target);
    updateModalCanvas(currentCanvasIndex);
    modal.classList.remove("hidden");
  }
});

function updateModalCanvas(index) {
  const canvases = document.querySelectorAll(".imagePreview");
  if (index >= 0 && index < canvases.length) {
    const canvas = canvases[index];
    const ctx = modalCanvas.getContext("2d");

    modalCanvas.width = canvas.width;
    modalCanvas.height = canvas.height;
    ctx.drawImage(canvas, 0, 0);

    currentCanvasIndex = index;
  }
}

document.getElementById("prev-canvas").addEventListener("click", () => {
  updateModalCanvas(currentCanvasIndex - 1);
});

document.getElementById("next-canvas").addEventListener("click", () => {
  updateModalCanvas(currentCanvasIndex + 1);
});

// Close modal
closeModal.addEventListener("click", () => {
  modal.classList.add("hidden");
});

// Close modal when clicking outside the content
modal.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal.classList.add("hidden");
  }
});

// --- Crop Functionality ---
let cropTargetCanvas = null;
let cropStart = null;
let cropEnd = null;

const cropOverlay = document.getElementById("crop-overlay");
const cropCanvas = document.getElementById("crop-canvas");
const cropConfirm = document.getElementById("crop-confirm");
const cropCancel = document.getElementById("crop-cancel");
const blackpointSlider = document.getElementById("blackpoint-slider");
const whitepointSlider = document.getElementById("whitepoint-slider");
const blackpointValue = document.getElementById("blackpoint-value");
const whitepointValue = document.getElementById("whitepoint-value");

function addCropButton(canvas, container) {
  const btn = document.createElement("button");
  btn.className = "crop-btn";
  const icon = document.createElement("img");
  icon.src = "assets/img/crop-icon.svg";
  icon.alt = "Crop";
  icon.style.width = "22px";
  icon.style.height = "22px";
  btn.appendChild(icon);
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    openCropOverlay(canvas);
  });
  container.appendChild(btn);
}

function openCropOverlay(canvas) {
  cropTargetCanvas = canvas;
  cropStart = null;
  cropEnd = null;
  cropOverlay.classList.remove("hidden");
  cropCanvas.width = canvas.width;
  cropCanvas.height = canvas.height;
  const ctx = cropCanvas.getContext("2d");
  ctx.drawImage(canvas, 0, 0);

  // Update sliders to reflect the canvas's blackpoint and whitepoint
  blackpointSlider.value = canvas.dataset.blackpoint || "0";
  whitepointSlider.value = canvas.dataset.whitepoint || "255";
  blackpointValue.textContent = blackpointSlider.value;
  whitepointValue.textContent = whitepointSlider.value;
}

cropCanvas.addEventListener("mousedown", (e) => {
  const rect = cropCanvas.getBoundingClientRect();
  cropStart = {
    x: Math.round((e.clientX - rect.left) * cropCanvas.width / rect.width),
    y: Math.round((e.clientY - rect.top) * cropCanvas.height / rect.height)
  };
  cropEnd = { ...cropStart }; // Initialize cropEnd to the same point as cropStart
  isCropping = true;
});

cropCanvas.addEventListener("mousemove", (e) => {
  if (!isCropping || !cropStart) return;
  const rect = cropCanvas.getBoundingClientRect();
  cropEnd = {
    x: Math.round((e.clientX - rect.left) * cropCanvas.width / rect.width),
    y: Math.round((e.clientY - rect.top) * cropCanvas.height / rect.height)
  };
  drawCropRect();
});

cropCanvas.addEventListener("mouseup", () => {
  if (isCropping) {
    console.log("Mouse up");
    isCropping = false;
    if (cropStart && cropEnd) {
      drawCropRect();
    }
  }
});

cropCanvas.addEventListener("mouseleave", () => {
  if (isCropping) {
    isCropping = false;
    drawCropRect();
  }
});

function drawCropRect() {
  const ctx = cropCanvas.getContext("2d");
  const scale = parseFloat(cropCanvas.dataset.scale || "1");
  ctx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
  // Draw adjusted image
  ctx.drawImage(cropTargetCanvas, 0, 0, cropCanvas.width, cropCanvas.height);
  let imageData = ctx.getImageData(0, 0, cropCanvas.width, cropCanvas.height);
  const bp = parseInt(blackpointSlider.value, 10);
  const wp = parseInt(whitepointSlider.value, 10);
  if (wp > bp) {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      for (let j = 0; j < 3; j++) {
        let v = data[i + j];
        if (v <= bp) v = 0;
        else if (v >= wp) v = 255;
        else v = Math.round(((v - bp) / (wp - bp)) * 255);
        data[i + j] = v;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }
  // Draw crop rectangle
  if (cropStart && cropEnd) {
    ctx.strokeStyle = "#007bff";
    ctx.lineWidth = 2;
    ctx.setLineDash([6]);
    ctx.strokeRect(
      Math.min(cropStart.x, cropEnd.x) * scale,
      Math.min(cropStart.y, cropEnd.y) * scale,
      Math.abs(cropEnd.x - cropStart.x) * scale,
      Math.abs(cropEnd.y - cropStart.y) * scale
    );
    ctx.setLineDash([]);
  }
}

blackpointSlider.addEventListener("input", () => {
  blackpointValue.textContent = blackpointSlider.value;
  if (parseInt(blackpointSlider.value, 10) >= parseInt(whitepointSlider.value, 10)) {
    blackpointSlider.value = whitepointSlider.value - 1;
    blackpointValue.textContent = blackpointSlider.value;
  }
  drawCropRect();
});
whitepointSlider.addEventListener("input", () => {
  whitepointValue.textContent = whitepointSlider.value;
  if (parseInt(whitepointSlider.value, 10) <= parseInt(blackpointSlider.value, 10)) {
    whitepointSlider.value = parseInt(blackpointSlider.value, 10) + 1;
    whitepointValue.textContent = whitepointSlider.value;
  }
  drawCropRect();
});

cropConfirm.addEventListener("click", () => {
  const ctx = cropTargetCanvas.getContext("2d");
  let imageData = ctx.getImageData(0, 0, cropTargetCanvas.width, cropTargetCanvas.height);
  const bp = parseInt(blackpointSlider.value, 10);
  const wp = parseInt(whitepointSlider.value, 10);

  // Save the blackpoint and whitepoint values as data attributes
  cropTargetCanvas.dataset.blackpoint = bp;
  cropTargetCanvas.dataset.whitepoint = wp;

  if (wp > bp) {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      for (let j = 0; j < 3; j++) {
        let v = data[i + j];
        if (v <= bp) v = 0;
        else if (v >= wp) v = 255;
        else v = Math.round(((v - bp) / (wp - bp)) * 255);
        data[i + j] = v;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  if (cropStart && cropEnd) {
    const x = Math.min(cropStart.x, cropEnd.x);
    const y = Math.min(cropStart.y, cropEnd.y);
    const w = Math.abs(cropEnd.x - cropStart.x);
    const h = Math.abs(cropEnd.y - cropStart.y);
    if (w > 0 && h > 0) {
      const temp = document.createElement("canvas");
      temp.width = w;
      temp.height = h;
      temp.getContext("2d").drawImage(cropTargetCanvas, x, y, w, h, 0, 0, w, h);
      cropTargetCanvas.width = w;
      cropTargetCanvas.height = h;
      cropTargetCanvas.getContext("2d").drawImage(temp, 0, 0);
    }
  }

  cropOverlay.classList.add("hidden");
});

cropCancel.addEventListener("click", () => {
  cropOverlay.classList.add("hidden");
});

// --- End Crop Functionality ---

document.getElementById("blackpoint-slider").value = 0;
document.getElementById("whitepoint-slider").value = 255;
document.getElementById("blackpoint-value").textContent = 0;
document.getElementById("whitepoint-value").textContent = 255;

// On load, hide filename options
updateFilenameOptionsVisibility(false);