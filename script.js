const fileInput = document.getElementById('file-input');
const fileInputMultiple = document.getElementById('file-input-multiple');
const uploadContainer = document.getElementById('upload-container');
const canvasContainer = document.getElementById('canvas-container');
const mapCanvas = document.getElementById('map-canvas');
const fogCanvas = document.getElementById('fog-canvas');
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
const imageList = document.getElementById('image-list');
const zoomControls = document.getElementById('zoom-controls');
const zoomInBtn = document.getElementById('zoom-in');
const zoomOutBtn = document.getElementById('zoom-out');
const zoomLevelDisplay = document.getElementById('zoom-level');
const resetAllBtn = document.getElementById('reset-all-btn');

const mapCtx = mapCanvas.getContext('2d');
const fogCtx = fogCanvas.getContext('2d');

let imageLoaded = false;
let baseRevealRadius = 100;
let isMouseDown = false;
let images = [];
let currentImageIndex = 0;
let fogStates = [];
let zoomLevel = 1;
let panX = 0;
let panY = 0;
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let baseFogCanvas = null;
let baseFogCtx = null;
let imageBaseX = 0;
let imageBaseY = 0;
let imageBaseWidth = 0;
let imageBaseHeight = 0;

const STORAGE_KEYS = {
    IMAGES: 'fogOfWar_images',
    FOG_STATES: 'fogOfWar_fogStates',
    CURRENT_INDEX: 'fogOfWar_currentIndex'
};

function saveImagesToStorage() {
    try {
        const imageData = images.map(img => ({
            src: img.src,
            width: img.width,
            height: img.height
        }));
        localStorage.setItem(STORAGE_KEYS.IMAGES, JSON.stringify(imageData));
    } catch (error) {
        console.warn('Failed to save images to localStorage:', error);
    }
}

function saveFogStatesToStorage() {
    try {
        const fogData = fogStates.map(state => {
            if (state && state.data) {
                return {
                    width: state.width,
                    height: state.height,
                    data: Array.from(state.data)
                };
            }
            return null;
        });
        localStorage.setItem(STORAGE_KEYS.FOG_STATES, JSON.stringify(fogData));
        localStorage.setItem(STORAGE_KEYS.CURRENT_INDEX, currentImageIndex.toString());
    } catch (error) {
        console.warn('Failed to save fog states to localStorage:', error);
    }
}

function loadImagesFromStorage() {
    try {
        const savedImages = localStorage.getItem(STORAGE_KEYS.IMAGES);
        if (savedImages) {
            const imageData = JSON.parse(savedImages);
            return Promise.all(imageData.map(data => {
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => resolve(img);
                    img.onerror = reject;
                    img.src = data.src;
                });
            }));
        }
    } catch (error) {
        console.warn('Failed to load images from localStorage:', error);
    }
    return Promise.resolve([]);
}

function loadFogStatesFromStorage() {
    try {
        const savedFogStates = localStorage.getItem(STORAGE_KEYS.FOG_STATES);
        const savedCurrentIndex = localStorage.getItem(STORAGE_KEYS.CURRENT_INDEX);
        
        if (savedFogStates) {
            const fogData = JSON.parse(savedFogStates);
            const states = fogData.map(data => {
                if (data && data.data) {
                    const imageData = new ImageData(
                        new Uint8ClampedArray(data.data),
                        data.width,
                        data.height
                    );
                    return imageData;
                }
                return null;
            });
            
            return {
                states: states,
                currentIndex: savedCurrentIndex ? parseInt(savedCurrentIndex) : 0
            };
        }
    } catch (error) {
        console.warn('Failed to load fog states from localStorage:', error);
    }
    return { states: [], currentIndex: 0 };
}

function clearStorageData() {
    try {
        localStorage.removeItem(STORAGE_KEYS.IMAGES);
        localStorage.removeItem(STORAGE_KEYS.FOG_STATES);
        localStorage.removeItem(STORAGE_KEYS.CURRENT_INDEX);
    } catch (error) {
        console.warn('Failed to clear localStorage:', error);
    }
}

function setupCanvas() {
    const rect = canvasContainer.getBoundingClientRect();
    mapCanvas.width = rect.width;
    mapCanvas.height = rect.height;
    fogCanvas.width = rect.width;
    fogCanvas.height = rect.height;
    
    if (!baseFogCanvas) {
        baseFogCanvas = document.createElement('canvas');
        baseFogCtx = baseFogCanvas.getContext('2d');
    }
    baseFogCanvas.width = rect.width;
    baseFogCanvas.height = rect.height;
}

function initializeFog() {
    baseFogCtx.clearRect(0, 0, baseFogCanvas.width, baseFogCanvas.height);
    renderFog();
}

function renderFog() {
    fogCtx.clearRect(0, 0, fogCanvas.width, fogCanvas.height);
    fogCtx.fillStyle = '#666666';
    fogCtx.fillRect(0, 0, fogCanvas.width, fogCanvas.height);
    fogCtx.save();
    fogCtx.globalCompositeOperation = 'destination-out';
    fogCtx.setTransform(zoomLevel, 0, 0, zoomLevel, imageBaseX + panX, imageBaseY + panY);
    fogCtx.drawImage(baseFogCanvas, 0, 0);
    fogCtx.restore();
    fogCtx.globalCompositeOperation = 'source-over';
}

function saveFogState() {
    if (currentImageIndex >= 0 && currentImageIndex < fogStates.length) {
        fogStates[currentImageIndex] = baseFogCtx.getImageData(0, 0, baseFogCanvas.width, baseFogCanvas.height);
        saveFogStatesToStorage();
    }
}

function loadFogState() {
    if (currentImageIndex >= 0 && currentImageIndex < fogStates.length && fogStates[currentImageIndex]) {
        baseFogCtx.putImageData(fogStates[currentImageIndex], 0, 0);
        renderFog();
    } else {
        initializeFog();
    }
}

function createImageThumbnail(img, name, index) {
    const item = document.createElement('div');
    item.className = 'image-item';
    item.dataset.index = index;
    
    const thumbnail = document.createElement('img');
    thumbnail.src = img.src;
    thumbnail.className = 'image-thumbnail';
    thumbnail.alt = name;
    
    const info = document.createElement('div');
    info.className = 'image-info';
    
    const nameDiv = document.createElement('div');
    nameDiv.className = 'image-name';
    nameDiv.textContent = name;
    
    const statusDiv = document.createElement('div');
    statusDiv.className = 'image-status';
    statusDiv.textContent = 'Ready';
    
    const resetBtn = document.createElement('button');
    resetBtn.className = 'image-reset-btn';
    resetBtn.textContent = 'Reset';
    resetBtn.title = 'Reset fog for this image';
    
    info.appendChild(nameDiv);
    info.appendChild(statusDiv);
    item.appendChild(thumbnail);
    item.appendChild(info);
    item.appendChild(resetBtn);
    
    item.addEventListener('click', (e) => {
        if (e.target !== resetBtn) {
            switchToImage(index);
        }
    });
    
    resetBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        resetImageFog(index);
    });
    
    return item;
}

function switchToImage(index) {
    if (index === currentImageIndex) return;
    
    saveFogState();
    currentImageIndex = index;
    drawCurrentImage();
    loadFogState();
    localStorage.setItem(STORAGE_KEYS.CURRENT_INDEX, currentImageIndex.toString());
    
    document.querySelectorAll('.image-item').forEach((item, i) => {
        item.classList.toggle('active', i === index);
    });
}

function drawCurrentImage() {
    if (currentImageIndex >= 0 && currentImageIndex < images.length) {
        const img = images[currentImageIndex];
        const canvasAspect = mapCanvas.width / mapCanvas.height;
        const imgAspect = img.width / img.height;
        
        if (imgAspect > canvasAspect) {
            imageBaseWidth = mapCanvas.width;
            imageBaseHeight = mapCanvas.width / imgAspect;
            imageBaseX = 0;
            imageBaseY = (mapCanvas.height - imageBaseHeight) / 2;
        } else {
            imageBaseHeight = mapCanvas.height;
            imageBaseWidth = mapCanvas.height * imgAspect;
            imageBaseY = 0;
            imageBaseX = (mapCanvas.width - imageBaseWidth) / 2;
        }
        
        const drawWidth = imageBaseWidth * zoomLevel;
        const drawHeight = imageBaseHeight * zoomLevel;
        const drawX = imageBaseX + panX;
        const drawY = imageBaseY + panY;
        
        mapCtx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);
        mapCtx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    }
}

function updateZoomDisplay() {
    zoomLevelDisplay.textContent = Math.round(zoomLevel * 100) + '%';
}

function zoomIn() {
    zoomAtPoint(mapCanvas.width / 2, mapCanvas.height / 2, 1.25);
}

function zoomOut() {
    zoomAtPoint(mapCanvas.width / 2, mapCanvas.height / 2, 1 / 1.25);
}

function zoomAtPoint(x, y, factor) {
    const oldZoomLevel = zoomLevel;
    const newZoomLevel = Math.max(0.25, Math.min(5, zoomLevel * factor));
    
    if (newZoomLevel !== zoomLevel) {
        zoomLevel = newZoomLevel;
        panX = (panX - x) * (zoomLevel / oldZoomLevel) + x;
        panY = (panY - y) * (zoomLevel / oldZoomLevel) + y;
        drawCurrentImage();
        renderFog();
        updateZoomDisplay();
    }
}

function resetImageFog(index) {
    if (index >= 0 && index < fogStates.length) {
        fogStates[index] = null;
        if (index === currentImageIndex) {
            initializeFog();
        }
        saveFogStatesToStorage();
    }
}

function resetAllImages() {
    if (confirm('Are you sure you want to reset all images and fog states? This action cannot be undone.')) {
        images = [];
        fogStates = [];
        currentImageIndex = 0;
        imageList.innerHTML = '';
        imageLoaded = false;
        clearStorageData();
        uploadContainer.classList.remove('hidden');
        sidebarToggle.classList.remove('visible');
        sidebar.classList.remove('visible');
        zoomControls.classList.remove('visible');
        zoomLevelDisplay.classList.remove('visible');
        zoomLevel = 1;
        panX = 0;
        panY = 0;
        mapCtx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);
        fogCtx.clearRect(0, 0, fogCanvas.width, fogCanvas.height);
        fileInput.value = '';
        fileInputMultiple.value = '';
    }
}

function handleFileUpload(files) {
    if (!files || files.length === 0) return;
    
    setupCanvas();
    images = [];
    fogStates = [];
    imageList.innerHTML = '';
    
    let loadedCount = 0;
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = new Image();
                img.onload = function() {
                    images.push(img);
                    fogStates.push(null);
                    const thumbnail = createImageThumbnail(img, file.name, images.length - 1);
                    imageList.appendChild(thumbnail);
                    loadedCount++;
                    
                    if (loadedCount === 1) {
                        currentImageIndex = 0;
                        drawCurrentImage();
                        loadFogState();
                        uploadContainer.classList.add('hidden');
                        sidebarToggle.classList.add('visible');
                        zoomControls.classList.add('visible');
                        zoomLevelDisplay.classList.add('visible');
                        imageLoaded = true;
                        updateZoomDisplay();
                        thumbnail.classList.add('active');
                    }
                    
                    if (loadedCount === files.length) {
                        saveImagesToStorage();
                        saveFogStatesToStorage();
                    }
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }
}

function handleAddMoreImages(files) {
    if (!files || files.length === 0) return;
    
    let loadedCount = 0;
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = new Image();
                img.onload = function() {
                    images.push(img);
                    fogStates.push(null);
                    const thumbnail = createImageThumbnail(img, file.name, images.length - 1);
                    imageList.appendChild(thumbnail);
                    loadedCount++;
                    
                    if (loadedCount === files.length) {
                        saveImagesToStorage();
                        saveFogStatesToStorage();
                    }
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }
}

fileInput.addEventListener('change', function(e) {
    handleFileUpload(e.target.files);
});

fileInputMultiple.addEventListener('change', function(e) {
    handleAddMoreImages(e.target.files);
    e.target.value = '';
});

canvasContainer.addEventListener('mousedown', function(e) {
    if (!imageLoaded) return;
    
    if (e.button === 2 || e.ctrlKey || e.shiftKey) {
        isDragging = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        canvasContainer.style.cursor = 'grabbing';
        e.preventDefault();
    } else {
        isMouseDown = true;
        revealFog(e);
    }
});

canvasContainer.addEventListener('mouseup', function() {
    isMouseDown = false;
    isDragging = false;
    canvasContainer.style.cursor = 'crosshair';
});

canvasContainer.addEventListener('mouseleave', function() {
    isMouseDown = false;
    isDragging = false;
    canvasContainer.style.cursor = 'crosshair';
});

canvasContainer.addEventListener('mousemove', function(e) {
    if (!imageLoaded) return;
    
    if (isDragging) {
        const deltaX = e.clientX - lastMouseX;
        const deltaY = e.clientY - lastMouseY;
        panX += deltaX;
        panY += deltaY;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        drawCurrentImage();
        renderFog();
    } else if (isMouseDown) {
        revealFog(e);
    }
});

canvasContainer.addEventListener('wheel', function(e) {
    if (!imageLoaded) return;
    
    e.preventDefault();
    const rect = canvasContainer.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const zoomFactor = e.deltaY > 0 ? 1 / 1.1 : 1.1;
    zoomAtPoint(mouseX, mouseY, zoomFactor);
});

canvasContainer.addEventListener('contextmenu', function(e) {
    e.preventDefault();
});

function revealFog(e) {
    const rect = canvasContainer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const baseX = (x - imageBaseX - panX) / zoomLevel;
    const baseY = (y - imageBaseY - panY) / zoomLevel;
    const scaledRadius = baseRevealRadius / zoomLevel;
    
    baseFogCtx.globalCompositeOperation = 'source-over';
    baseFogCtx.fillStyle = 'white';
    baseFogCtx.beginPath();
    baseFogCtx.arc(baseX, baseY, scaledRadius, 0, 2 * Math.PI);
    baseFogCtx.fill();
    renderFog();
}

zoomInBtn.addEventListener('click', zoomIn);
zoomOutBtn.addEventListener('click', zoomOut);

sidebarToggle.addEventListener('click', function() {
    sidebar.classList.toggle('visible');
});

resetAllBtn.addEventListener('click', resetAllImages);

async function initializeApp() {
    setupCanvas();
    
    try {
        const savedImages = await loadImagesFromStorage();
        if (savedImages.length > 0) {
            const savedFogData = loadFogStatesFromStorage();
            
            images = savedImages;
            fogStates = savedFogData.states;
            currentImageIndex = Math.min(savedFogData.currentIndex, images.length - 1);
            
            images.forEach((img, index) => {
                const thumbnail = createImageThumbnail(img, `Image ${index + 1}`, index);
                imageList.appendChild(thumbnail);
            });
            
            uploadContainer.classList.add('hidden');
            sidebarToggle.classList.add('visible');
            zoomControls.classList.add('visible');
            zoomLevelDisplay.classList.add('visible');
            imageLoaded = true;
            updateZoomDisplay();
            drawCurrentImage();
            loadFogState();
            
            const activeItem = imageList.children[currentImageIndex];
            if (activeItem) {
                activeItem.classList.add('active');
            }
        }
    } catch (error) {
        console.warn('Failed to initialize app with saved data:', error);
    }
}

window.addEventListener('resize', function() {
    if (imageLoaded) {
        saveFogState();
        setupCanvas();
        drawCurrentImage();
        loadFogState();
    }
});

initializeApp();