// Keyboard shortcuts for modals
const inputElem = document.querySelector("#file-input");
const dropZone = document.getElementById("drop-zone");
const preview = document.getElementById("preview");
const clearBtn = document.getElementById("clear-btn");
const downloadBtn = document.getElementById("download-btn");
const fileInput = document.getElementById("file-input");
const modalCanvas = document.getElementById("modal-canvas");
const closeModal = document.getElementById("close-modal");
let controlButtons = document.getElementById("controlButtons");
let disclaimer = document.getElementById("disclaimer");
let renameFilesLabel = document.getElementById("rename-files-label");
let currentCanvasIndex = 0;
const bgcolorpickerlabel = document.getElementById("bgcolor-label");
const transparentBackgroundCheckbox = document.getElementById("transparentBackground-checkbox");
let isCropping = false;
let cancelUpscaling = false;
const cropOverlay = document.getElementById("crop-overlay");
const cropCanvas = document.getElementById("crop-canvas");
const cropConfirm = document.getElementById("crop-confirm");
const cropCancel = document.getElementById("crop-cancel");
const blackpointSlider = document.getElementById("blackpoint-slider");
const whitepointSlider = document.getElementById("whitepoint-slider");
const blackpointValue = document.getElementById("blackpoint-value");
const whitepointValue = document.getElementById("whitepoint-value");
const cropUpscaleBtn = document.getElementById('crop-upscale');
const startProcessingBtn = document.getElementById('start-processing-btn');
const pendingImageCount = document.getElementById('pending-image-count');
const gifProgress = document.getElementById('gif-progress');
const gifDownloadLink = document.getElementById('gifDownloadLink');
let pendingFiles = [];
const gifSizeInfo = document.getElementById('gif-size-info');
const modal = document.getElementById('image-modal');
const gifCreationSection = document.getElementById("gif-creation-section");
const qualityInput = document.getElementById("qualityInput");
const aiUpscaleProgressContainer = document.getElementById('ai-upscale-progress-container');
const aiUpscaleProgressBar = document.getElementById('ai-upscale-progress-bar');
const aiUpscaleProgressText = document.getElementById('ai-upscale-progress-text');
const gifSizeSelect = document.getElementById('gifSizeSelect');
const gifTransparencyCheckbox = document.getElementById('gifTransparency');
let gifTransparentColor = null;
document.addEventListener('keydown', (e) => {
  // ESC closes crop modal and image modal
  if (e.key === 'Escape') {

    if (cropOverlay && !cropOverlay.classList.contains('hidden')) {
      cropOverlay.classList.add('hidden');
    }
    if (modal && !modal.classList.contains('hidden')) {
      modal.classList.add('hidden');
    }
  }
  // Arrow keys for image modal navigation
  if (modal && !modal.classList.contains('hidden')) {
    if (e.key === 'ArrowLeft') {
      updateModalCanvas(currentCanvasIndex - 1);
      e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      updateModalCanvas(currentCanvasIndex + 1);
      e.preventDefault();
    }
  }
});

// Open external links in user's default browser
document.addEventListener('click', function (event) {
  const target = event.target.closest('a');
  if (target && target.href && target.href.startsWith('http')) {
    event.preventDefault();
    if (window.electronAPI && window.electronAPI.openExternal) {
      window.electronAPI.openExternal(target.href);
    }
  }
});


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

function createSquareCanvasFromImage(img, bgcolorPicker, transparentCheckbox, invertCheckbox) {
  const size = Math.max(img.width, img.height);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  // Determine background: transparent or color picker
  if (transparentCheckbox && transparentCheckbox.checked) {
    ctx.clearRect(0, 0, size, size); // Transparent background
  } else {
    ctx.fillStyle = bgcolorPicker ? bgcolorPicker.value : '#ffffff';
    ctx.fillRect(0, 0, size, size);
    if (invertCheckbox && invertCheckbox.checked) {
      invertImageColors(canvas); // Invert background before drawing image
    }
  }
  // Center the image
  const x = (size - img.width) / 2;
  const y = (size - img.height) / 2;
  ctx.drawImage(img, x, y);
  return canvas;
}

function displayImages(files) {
  const bgcolorPicker = document.getElementById("bgcolor-picker");
  const transparentBackgroundCheckbox = document.getElementById("transparentBackground-checkbox");
  const squareCanvasCheckbox = document.getElementById("squareCanvas-checkbox");
  const invertColorsCheckbox = document.getElementById("invertColors-checkbox");
  const importProgressContainer = document.getElementById("import-progress-container");
  const importProgressBar = document.getElementById("import-progress-bar");
  const preview = document.getElementById("preview");
  const controlButtons = document.getElementById("controlButtons");
  const disclaimer = document.getElementById("disclaimer");

  // Hide preview and show progress bar
  preview.classList.add("hidden");
  importProgressContainer.style.display = "block";
  importProgressBar.style.width = "0%";

  let loadedCount = 0;
  const total = Array.from(files).filter(f => f.type.startsWith("image/")).length;
  const containers = [];

  for (const file of files) {
    if (file.type.startsWith("image/")) {
      const container = document.createElement("div");
      container.className = "canvas-container";
      let canvas = document.createElement("canvas");
      canvas.classList.add("imagePreview");
      const ctx = canvas.getContext("2d");
      const url = URL.createObjectURL(file);
      const img = new Image();

      img.onload = function () {
        let finalCanvas = canvas;
        if (squareCanvasCheckbox && squareCanvasCheckbox.checked) {
          finalCanvas = createSquareCanvasFromImage(img, bgcolorPicker, transparentBackgroundCheckbox, invertColorsCheckbox);
          finalCanvas.classList.add("imagePreview");
        } else {
          finalCanvas.width = this.width;
          finalCanvas.height = this.height;
          if (transparentBackgroundCheckbox && !transparentBackgroundCheckbox.checked && bgcolorPicker) {
            ctx.fillStyle = bgcolorPicker.value || "#000000";
            ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
            if (invertColorsCheckbox && invertColorsCheckbox.checked) {
              invertImageColors(finalCanvas); // Invert background before drawing image
            }
          }
          finalCanvas.getContext("2d").drawImage(img, 0, 0);
        }
        finalCanvas.dataset.filename = file.name;
        finalCanvas.dataset.blackpoint = "0";
        finalCanvas.dataset.whitepoint = "255";
        if (invertColorsCheckbox && invertColorsCheckbox.checked) {
          invertImageColors(finalCanvas); // Invert colors after drawing the image
        }
        URL.revokeObjectURL(img.src);
        container.appendChild(finalCanvas);
        addCropButton(finalCanvas, container);
        loadedCount++;
        importProgressBar.style.width = ((loadedCount / total) * 100) + "%";
        containers.push(container);
        if (loadedCount === total) {
          // All images loaded, show them at once
          preview.innerHTML = "";
          containers.forEach(c => preview.appendChild(c));
          preview.classList.remove("hidden");
          importProgressContainer.style.display = "none";
          controlButtons.classList.remove("hidden");
          disclaimer.classList.add("hidden");
          updateFilenameOptionsVisibility(true);
        }
      };
      img.src = url;
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


// Override drop and file input to store files, not process immediately
function updatePendingImageCount() {
  if (!pendingImageCount) return;
  if (pendingFiles.length === 0) {
    pendingImageCount.textContent = 'No images selected';
    startProcessingBtn.classList.add('hidden');
  } else {
    pendingImageCount.textContent = pendingFiles.length + ' images selected';
    startProcessingBtn.classList.remove('hidden');
  }
}

function handleFilesForProcessing(files) {
  pendingFiles = Array.from(files);
  updatePendingImageCount();
}

dropZone.addEventListener("drop", (ev) => {
  ev.preventDefault();
  const files = [...ev.dataTransfer.items]
    .map((item) => item.getAsFile())
    .filter((file) => file);
  handleFilesForProcessing(files);
});

inputElem.addEventListener("change", (e) => {
  handleFilesForProcessing(e.target.files);
});

if (startProcessingBtn) {
  startProcessingBtn.addEventListener('click', () => {
    if (pendingFiles.length === 0) {
      alert('Please add images before starting processing.');
      return;
    }
    startProcessingBtn.classList.add('hidden');
    dropZone.classList.add('hidden'); // Hide drop zone during processing to prevent new inputs
    pendingImageCount.classList.add('hidden'); // Hide pending images text
    displayImages(pendingFiles);
    pendingFiles = [];
    updatePendingImageCount();
  });
}


clearBtn.addEventListener("click", () => {
  // Cancel any ongoing upscaling
  cancelUpscaling = true;
  if (!confirm("Are you sure you want to clear all images?")) {
    return;
  }
  document.querySelectorAll(".canvas-container").forEach((canvas) => {
    canvas.remove();
  });
  document.querySelectorAll(".crop-btn").forEach((btn) => {
    btn.remove();
  });
  gifSizeInfo.classList.add('hidden');
  gifCreationSection.classList.add("hidden");
  gifProgress.classList.add("hidden");
  gifDownloadLink.classList.add("hidden");
  document.getElementById('gifPreview').classList.add("hidden"); //Hide GIF preview
  controlButtons.classList.add("hidden");
  disclaimer.classList.remove("hidden");
  renameFilesLabel.classList.add("hidden");
  dropZone.classList.remove("hidden"); // Show drop zone again
  pendingImageCount.classList.remove("hidden"); // Show pending images text again
  fileInput.value = "";
  pendingFiles = [];
  updatePendingImageCount();
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

//Bw toggle for crop modal
const bwToggleBtn = document.getElementById('bw-toggle');
let cropBWActive = false;

function applyGrayscale(canvas) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const y = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i] = data[i + 1] = data[i + 2] = y;
  }
  ctx.putImageData(imageData, 0, 0);
}

if (bwToggleBtn) {
  bwToggleBtn.addEventListener('click', () => {
    cropBWActive = !cropBWActive;
    // bwToggleBtn.textContent = cropBWActive ? 'Color' : 'Black & White';
    drawCropRect();
  });
}

// --- Crop Functionality ---
let cropTargetCanvas = null;
let cropStart = null;
let cropEnd = null;

cropOverlayProgress = document.createElement('div');
cropOverlayProgress.id = 'crop-overlay-progress';
cropOverlayProgress.style.cssText = 'text-align:center;margin:0.5em 0;color:#4a90e2;font-weight:500;display:none;';
document.getElementById('crop-controls').appendChild(cropOverlayProgress);

function addCropButton(canvas, container) {
  const btn = document.createElement("button");
  btn.className = "crop-btn";
  const icon = document.createElement("img");
  icon.src = "assets/img/edit-icon.svg";
  icon.alt = "Edit";
  icon.style.width = "22px";
  icon.style.height = "22px";
  btn.appendChild(icon);
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    openCropOverlay(canvas);
  });
  container.appendChild(btn);
}

function openCropOverlay(canvas, previewCanvasToUpdate) {
  cropTargetCanvas = canvas;
  cropTargetCanvas._previewCanvasToUpdate = previewCanvasToUpdate || canvas;
  cropStart = null;
  cropEnd = null;
  cropBWActive = false;
  if (bwToggleBtn) bwToggleBtn.textContent = 'Black & White';
  cropOverlay.classList.remove("hidden");
  cropCanvas.width = canvas.width;
  cropCanvas.height = canvas.height;
  const ctx = cropCanvas.getContext("2d");
  // Debug: log canvas dimensions and check for blank
  // Force clear and redraw
  ctx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
  ctx.drawImage(canvas, 0, 0, cropCanvas.width, cropCanvas.height);
  // If still blank, try to get image data and log
  try {
    const testData = ctx.getImageData(0, 0, cropCanvas.width, cropCanvas.height);
    const allZero = testData.data.every(v => v === 0);
    if (allZero) {
      console.warn("[Crop Modal] Crop canvas appears blank after drawImage.");
    }
  } catch (e) {
    console.error("[Crop Modal] Error reading crop canvas image data:", e);
  }
  blackpointSlider.value = canvas.dataset.blackpoint || "0";
  whitepointSlider.value = canvas.dataset.whitepoint || "255";
  blackpointValue.textContent = blackpointSlider.value;
  whitepointValue.textContent = whitepointSlider.value;
  // Update crop modal resolution display
  const cropRes = document.getElementById('crop-resolution');
  if (cropRes) {
    cropRes.textContent = `Resolution: ${cropCanvas.width} x ${cropCanvas.height}`;
  }
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
    isCropping = false;
    if (cropStart && cropEnd) {
      drawCropRect();
    }
    // Update crop modal resolution display after crop
    const cropRes = document.getElementById('crop-resolution');
    if (cropRes) {
      cropRes.textContent = `Resolution: ${cropCanvas.width} x ${cropCanvas.height}`;
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
  // Apply grayscale if BW is active
  if (cropBWActive) {
    applyGrayscale(cropCanvas);
  }
  // Draw crop rectangle as a guide only (not part of saved image)
  if (cropStart && cropEnd) {
    // Dynamic line width based on canvas size
    const minDim = Math.min(cropCanvas.width, cropCanvas.height);
    let lineWidth = 2;
    if (minDim > 1200) lineWidth = 6;
    else if (minDim > 800) lineWidth = 4;
    else if (minDim > 400) lineWidth = 3;
    ctx.save();
    ctx.strokeStyle = "#007bff";
    ctx.lineWidth = lineWidth;
    ctx.setLineDash([Math.max(6, lineWidth * 2)]);
    const x = Math.min(cropStart.x, cropEnd.x) * scale;
    const y = Math.min(cropStart.y, cropEnd.y) * scale;
    const w = Math.abs(cropEnd.x - cropStart.x) * scale;
    const h = Math.abs(cropEnd.y - cropStart.y) * scale;
    // Only draw a border (no fill)
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);
    ctx.restore();
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
  // Apply grayscale if BW is active
  if (cropBWActive) {
    applyGrayscale(cropTargetCanvas);
  }

  let didCrop = false;
  if (cropStart && cropEnd) {
    const x = Math.min(cropStart.x, cropEnd.x);
    const y = Math.min(cropStart.y, cropEnd.y);
    const w = Math.abs(cropEnd.x - cropStart.x);
    const h = Math.abs(cropEnd.y - cropStart.y);
    if (w > 0 && h > 0) {
      // Crop the image from cropTargetCanvas, do NOT include the crop rectangle
      const temp = document.createElement("canvas");
      temp.width = w;
      temp.height = h;
      temp.getContext("2d").drawImage(cropTargetCanvas, x, y, w, h, 0, 0, w, h);
      cropTargetCanvas.width = w;
      cropTargetCanvas.height = h;
      cropTargetCanvas.getContext("2d").clearRect(0, 0, w, h);
      cropTargetCanvas.getContext("2d").drawImage(temp, 0, 0);
      // Also update the original preview canvas if present
      if (cropTargetCanvas._previewCanvasToUpdate && cropTargetCanvas._previewCanvasToUpdate !== cropTargetCanvas) {
        cropTargetCanvas._previewCanvasToUpdate.width = w;
        cropTargetCanvas._previewCanvasToUpdate.height = h;
        cropTargetCanvas._previewCanvasToUpdate.getContext("2d").clearRect(0, 0, w, h);
        cropTargetCanvas._previewCanvasToUpdate.getContext("2d").drawImage(temp, 0, 0);
      }
      didCrop = true;
    }
  }
  // If no crop was performed, just update the preview canvas with the upscaled image
  if (!didCrop && cropTargetCanvas._previewCanvasToUpdate && cropTargetCanvas._previewCanvasToUpdate !== cropTargetCanvas) {
    cropTargetCanvas._previewCanvasToUpdate.width = cropTargetCanvas.width;
    cropTargetCanvas._previewCanvasToUpdate.height = cropTargetCanvas.height;
    cropTargetCanvas._previewCanvasToUpdate.getContext("2d").clearRect(0, 0, cropTargetCanvas.width, cropTargetCanvas.height);
    cropTargetCanvas._previewCanvasToUpdate.getContext("2d").drawImage(cropTargetCanvas, 0, 0);
  }
  // Only update AI tag if upscaled
  const previewCanvas = cropTargetCanvas._previewCanvasToUpdate || cropTargetCanvas;
  const wasUpscaled = cropCanvas.dataset.aiUpscaled === 'true';
  if (wasUpscaled) {
    cropTargetCanvas.setAttribute('data-ai-upscaled', 'true');
    previewCanvas.setAttribute('data-ai-upscaled', 'true');
    if (cropTargetCanvas && cropTargetCanvas.parentElement) {
      updateAITag(cropTargetCanvas.parentElement, cropTargetCanvas);
    }
    if (previewCanvas && previewCanvas.parentElement && previewCanvas !== cropTargetCanvas) {
      updateAITag(previewCanvas.parentElement, previewCanvas);
    }
  } else {
    cropTargetCanvas.removeAttribute('data-ai-upscaled');
    previewCanvas.removeAttribute('data-ai-upscaled');
    if (cropTargetCanvas && cropTargetCanvas.parentElement) {
      updateAITag(cropTargetCanvas.parentElement, cropTargetCanvas);
    }
    if (previewCanvas && previewCanvas.parentElement && previewCanvas !== cropTargetCanvas) {
      updateAITag(previewCanvas.parentElement, previewCanvas);
    }
  }
  cropOverlay.classList.add("hidden");
});

cropCancel.addEventListener("click", () => {
  cropOverlay.classList.add("hidden");
  cropCanvas.dataset.aiUpscaled = 'false';
});

if (cropUpscaleBtn) {
  cropUpscaleBtn.addEventListener('click', async () => {
    cropUpscaleBtn.disabled = true;
    cropUpscaleBtn.classList.add('btn-disabled');
    cropOverlayProgress.textContent = 'Upscaling...';
    cropOverlayProgress.classList.remove('hidden');
    cropOverlayProgress.classList.remove('crop-overlay-progress-success', 'crop-overlay-progress-error');
    cropOverlayProgress.classList.add('crop-overlay-progress-active');
    try {
      // Save cropCanvas to temp file
      const tempInput = await window.electronAPI.getTempFilePath('crop_upscale_input.png');
      const tempOutput = await window.electronAPI.getTempFilePath('crop_upscale_output.png');
      const dataUrl = cropCanvas.toDataURL('image/png');
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
      await window.electronAPI.saveImage(tempInput, base64Data);
      const result = await window.electronAPI.upscaleImage(tempInput, tempOutput, 'realesrgan-x4plus');
      if (result.success) {
        await new Promise((resolve, reject) => {
          const upscaledImg = new window.Image();
          upscaledImg.onload = function() {
            cropCanvas.width = upscaledImg.width;
            cropCanvas.height = upscaledImg.height;
            const ctx = cropCanvas.getContext('2d');
            ctx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
            ctx.drawImage(upscaledImg, 0, 0);
            resolve();
          };
          upscaledImg.onerror = reject;
          upscaledImg.src = 'file://' + result.outputPath + '?t=' + Date.now();
        });
        cropOverlayProgress.textContent = 'Upscale complete!';
        cropOverlayProgress.classList.remove('crop-overlay-progress-active');
        cropOverlayProgress.classList.add('crop-overlay-progress-success');
        cropCanvas.dataset.aiUpscaled = 'true';
        // Update crop modal resolution display after upscaling
        const cropRes = document.getElementById('crop-resolution');
        if (cropRes) {
          cropRes.textContent = `Resolution: ${cropCanvas.width} x ${cropCanvas.height}`;
        }
        // Refresh crop overlay with new upscaled image
        setTimeout(() => {
          const upscaledImg = new window.Image();
          upscaledImg.onload = function() {
            // Create a new canvas from the upscaled image
            const newCanvas = document.createElement('canvas');
            newCanvas.width = upscaledImg.width;
            newCanvas.height = upscaledImg.height;
            newCanvas.getContext('2d').drawImage(upscaledImg, 0, 0);
            // Preserve reference to original preview canvas
            newCanvas._previewCanvasToUpdate = cropTargetCanvas._previewCanvasToUpdate || cropTargetCanvas;
            openCropOverlay(newCanvas, newCanvas._previewCanvasToUpdate);
          };
          upscaledImg.src = cropCanvas.toDataURL('image/png');
        }, 100);
      } else {
        cropOverlayProgress.textContent = 'Upscaling failed: ' + result.error;
        cropOverlayProgress.classList.remove('crop-overlay-progress-active');
        cropOverlayProgress.classList.add('crop-overlay-progress-error');
      }
      await window.electronAPI.deleteTempFile(tempInput);
      await window.electronAPI.deleteTempFile(tempOutput);
    } finally {
      setTimeout(() => {
        cropOverlayProgress.classList.add('hidden');
        cropUpscaleBtn.disabled = false;
        cropUpscaleBtn.classList.remove('btn-disabled');
      }, 1200);
    }
  });
}



// --- End Crop Functionality ---

// --- Modal Functionality ---
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
    // Update modal resolution display
    const modalRes = document.getElementById('modal-resolution');
    if (modalRes) {
      modalRes.textContent = `${canvas.width} x ${canvas.height}`;
    }
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

// --- AI Upscale Functionality ---
const upscaleBtn = document.getElementById('upscale-btn');
if (upscaleBtn) {
  upscaleBtn.addEventListener('click', async () => {
    const canvases = document.querySelectorAll('.imagePreview');
    if (!canvases.length) {
      alert('No images to upscale!');
      return;
    }
    cancelUpscaling = false;
    aiUpscaleProgressContainer.classList.remove('hidden');
    aiUpscaleProgressBar.style.width = '0%';
    let startTime = Date.now();
        let currentIndex = 0; // Initialize currentIndex
    let intervalId = null;
    if (aiUpscaleProgressText) {
      aiUpscaleProgressText.classList.remove('hidden');
          aiUpscaleProgressText.textContent = `Upscaling 0/${canvases.length} (0s)`; // Show initial progress
      // Start timer to update elapsed time every second
      intervalId = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        aiUpscaleProgressText.textContent = `Upscaling ${currentIndex}/${canvases.length} (${elapsed}s)`;
      }, 1000);
    }
    for (let i = 0; i < canvases.length; i++) {
          // Only increment currentIndex after successful upscale
      if (cancelUpscaling) {
        if (aiUpscaleProgressText) aiUpscaleProgressText.textContent = 'Upscaling cancelled.';
        break;
      }
      const canvas = canvases[i];
      const container = canvas.parentElement;
      const tempInput = await window.electronAPI.getTempFilePath('upscale_input_' + i + '.png');
      const tempOutput = await window.electronAPI.getTempFilePath('upscale_output_' + i + '.png');
      const dataUrl = canvas.toDataURL('image/png');
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
      await window.electronAPI.saveImage(tempInput, base64Data);
      const result = await window.electronAPI.upscaleImage(tempInput, tempOutput, 'realesrgan-x4plus');
      if (result.success) {
        await new Promise((resolve, reject) => {
          const upscaledImg = new window.Image();
          upscaledImg.onload = function() {
            canvas.width = upscaledImg.width;
            canvas.height = upscaledImg.height;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(upscaledImg, 0, 0);
            resolve();
          };
          upscaledImg.onerror = reject;
          upscaledImg.src = 'file://' + result.outputPath + '?t=' + Date.now();
        });
            currentIndex++; // Increment currentIndex after successful upscale
            canvas.setAttribute('data-ai-upscaled', 'true');
            updateAITag(container, canvas);
      } else {
        alert('Upscaling failed for image ' + (i+1) + ': ' + result.error);
      }
      await window.electronAPI.deleteTempFile(tempInput);
      await window.electronAPI.deleteTempFile(tempOutput);
      aiUpscaleProgressBar.style.width = ((i + 1) / canvases.length * 100) + '%';
      if (aiUpscaleProgressText) {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
            aiUpscaleProgressText.textContent = `Upscaling ${currentIndex}/${canvases.length} (${elapsed}s)`; // Update progress
      }
    }
    if (intervalId) clearInterval(intervalId);
    setTimeout(() => {
      aiUpscaleProgressContainer.classList.add('hidden');
      aiUpscaleProgressBar.style.width = '0%';
      if (aiUpscaleProgressText) {
        aiUpscaleProgressText.classList.add('hidden');
        aiUpscaleProgressText.textContent = '';
      }
    }, 1200);
  });
}
// Show/hide GIF creation section
document.getElementById('makeGifBtn').addEventListener('click', function() {
  gifCreationSection.classList.remove('hidden');
});


// Create GIF from canvases
document.getElementById('createGifBtn').addEventListener('click', function() {
  const canvases = Array.from(document.querySelectorAll('.imagePreview'));
  if (canvases.length === 0) {
    alert('No images to create GIF from!');
    return;
  }
  const frameDuration = Math.round((parseFloat(document.getElementById('frameDurationInput').value) || 0.2) * 1000);
  const gifPreview = document.getElementById('gifPreview');
  gifProgress.classList.remove('hidden');
  gifProgress.textContent = 'Processing...';
  gifPreview.classList.add('hidden');
  gifDownloadLink.classList.add('hidden');
  gifSizeInfo.classList.add('hidden');

  if (gifSizeSelect.value === 'half') { 
    // Resize canvases to half size for GIF
    for (let i = 0; i < canvases.length; i++) {
      const originalCanvas = canvases[i];
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = Math.floor(originalCanvas.width / 2);
      tempCanvas.height = Math.floor(originalCanvas.height / 2);
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(originalCanvas, 0, 0, tempCanvas.width, tempCanvas.height);
      canvases[i] = tempCanvas;
    }
  } else if (gifSizeSelect.value === 'quarter') {
    // Resize canvases to quarter size for GIF
    for (let i = 0; i < canvases.length; i++) {
      const originalCanvas = canvases[i];
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = Math.floor(originalCanvas.width / 4);
      tempCanvas.height = Math.floor(originalCanvas.height / 4);
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(originalCanvas, 0, 0, tempCanvas.width, tempCanvas.height);
      canvases[i] = tempCanvas;
    }
  } // else keep original size
  
  gifTransparentColor = null;
  if (gifTransparencyCheckbox.checked) { 
    // Ensure transparent background is preserved
    gifTransparentColor = "#ffffff00";
  }

  const gif = new window.GIF({
    workers: 2,
    quality: parseInt(qualityInput.value) || 10,
    workerScript: './assets/dependencies/gif.worker.js',
    width: canvases[0].width,
    height: canvases[0].height,
    dithering: "FalseFloydSteinberg",
    transparent: gifTransparentColor,
  });
  canvases.forEach(canvas => {
    gif.addFrame(canvas, {delay: frameDuration});
  });
  gif.on('progress', function(p) {
    gifProgress.textContent = 'Progress: ' + Math.round(p * 100) + '%';
  });
  gif.on('finished', function(blob) {
    const url = URL.createObjectURL(blob);
    const gifSizeBytes = blob.size;
    const gifSizeMB = (gifSizeBytes / (1024 * 1024)).toFixed(2);
    gifSizeInfo.classList.remove('hidden');
    gifSizeInfo.textContent = `GIF Size: ${gifSizeMB} MB (${canvases[0].width} x ${canvases[0].height})`;
    gifPreview.src = url;
    gifPreview.classList.remove('hidden');
    gifDownloadLink.href = url;
    gifDownloadLink.classList.remove('hidden');
    gifProgress.classList.add('hidden');
    document.location.href = "#gifDownloadLink";
  });
  gif.on('error', function(e) {
    gifProgress.textContent = 'Error: ' + e;
  });
  gif.render();
});

function updateAITag(container, canvas) {
  const aiTag = container.querySelector('.ai-tag');
  if (canvas.getAttribute('data-ai-upscaled') === 'true') {
    if (!aiTag) {
      const tag = document.createElement('div');
      tag.className = 'ai-tag';
      tag.textContent = 'AI';
      container.appendChild(tag);
    }
  } else {
    if (aiTag) aiTag.remove();
  }
}

// --- End Crop Functionality ---

document.getElementById("blackpoint-slider").value = 0;
document.getElementById("whitepoint-slider").value = 255;
document.getElementById("blackpoint-value").textContent = 0;
document.getElementById("whitepoint-value").textContent = 255;

// On load, hide filename options
updateFilenameOptionsVisibility(false);