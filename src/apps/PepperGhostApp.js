import { SceneManager } from '../core/SceneManager.js';
import { CameraManager } from '../core/CameraManager.js';
import { RenderManager } from '../core/RenderManager.js';
import { TapDetector } from '../features/TapDetector.js';

export class PepperGhostApp {
    constructor() {
        this.canvas = document.getElementById('canvas');
        
        // Check if canvas exists
        if (!this.canvas) {
            console.error('❌ Canvas element not found!');
            return;
        }
        
        this.rotationSpeed = 0.005;
        this.isAnimating = true;
        
        // Initialize managers - order matters: RenderManager first for IBL
        this.renderManager = new RenderManager(this.canvas);
        this.sceneManager = new SceneManager(this.renderManager.getRenderer());
        this.cameraManager = new CameraManager();
        
        // View mode state
        this.viewMode = 'quadrant'; // 'quadrant' or 'single'
        
        // Initialize tap detector
        this.tapDetector = new TapDetector({
            threshold: 1,       // Delta threshold (lowered for better sensitivity)
            tapWindow: 1500,     // Max time between taps (ms)
            cooldown: 200,      // Min time between taps (ms)
            requiredTaps: 2,    // Double tap
            debugMode: false     // Enable detailed logging
        });
        
        // Setup tap detection
        this.setupTapDetection();
        
        // Setup resize handling
        this.setupResizeHandling();
        
        // Create default object
        this.sceneManager.updateMesh('torusKnot');
        
        // Setup controls
        this.setupControls();
        this.setupViewToggle();
        this.setupCameraInteraction();
        
        // Start animation loop
        this.animate();
    }
    
    setupControls() {
        // Tap detection enable button (required for iOS permission)
        const enableTapBtn = document.getElementById('enableTapDetectionBtn');
        enableTapBtn.addEventListener('click', async () => {
            const granted = await this.tapDetector.requestPermission();
            
            if (granted) {
                this.tapDetector.start();
                enableTapBtn.textContent = '✅ Tap Detection Active';
                enableTapBtn.classList.add('active');
                enableTapBtn.disabled = true;
            } else {
                alert('❌ Permission denied. Tap detection requires motion sensor access.');
            }
        });
        
        // Lighting mode toggle
        const lightingToggleBtn = document.getElementById('lightingToggleBtn');
        lightingToggleBtn.addEventListener('click', () => {
            const newMode = this.sceneManager.toggleLightingMode();
            if (newMode === 'ibl') {
                lightingToggleBtn.textContent = '💡 IBL Lighting (ModelViewer)';
                lightingToggleBtn.className = 'ibl-mode';
            } else {
                lightingToggleBtn.textContent = '💡 Legacy Lighting (Simple)';
                lightingToggleBtn.className = 'legacy-mode';
            }
        });
        
        // Shape selection
        const shapeSelect = document.getElementById('shapeSelect');
        shapeSelect.addEventListener('change', (e) => {
            this.sceneManager.updateMesh(e.target.value);
        });
        
        // GLB file loading
        const modelFileInput = document.getElementById('modelFile');
        
        modelFileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            if (!file.name.endsWith('.glb') && !file.name.endsWith('.gltf')) {
                alert('Please select a .glb or .gltf file');
                return;
            }
            
            try {
                await this.sceneManager.loadModelFromFile(file);
                
                // Reset shape selector
                shapeSelect.value = '';
            } catch (error) {
                alert(`Failed to load model: ${error.message}`);
            }
        });
        
        // Rotation speed control
        const rotationSpeedSlider = document.getElementById('rotationSpeed');
        const speedValue = document.getElementById('speedValue');
        
        rotationSpeedSlider.addEventListener('input', (e) => {
            this.rotationSpeed = parseFloat(e.target.value);
            speedValue.textContent = this.rotationSpeed.toFixed(3);
        });
        
        // Camera distance control
        const cameraDistanceSlider = document.getElementById('cameraDistance');
        const distanceValue = document.getElementById('distanceValue');
        
        cameraDistanceSlider.addEventListener('input', (e) => {
            const distance = parseFloat(e.target.value);
            this.cameraManager.updateDistance(distance);
            distanceValue.textContent = distance.toFixed(1);
        });
        
                // Reset button
        const resetBtn = document.getElementById('resetBtn');
        resetBtn.addEventListener('click', () => {
            this.resetCamera();
        });
        
        // Fullscreen button
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        fullscreenBtn.addEventListener('click', () => {
            this.toggleFullscreen();
        });
        
        // Listen for fullscreen changes
        document.addEventListener('fullscreenchange', () => {
            this.handleFullscreenChange();
        });
        document.addEventListener('webkitfullscreenchange', () => {
            this.handleFullscreenChange();
        });
        document.addEventListener('mozfullscreenchange', () => {
            this.handleFullscreenChange();
        });
        document.addEventListener('MSFullscreenChange', () => {
            this.handleFullscreenChange();
        });
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            switch(e.code) {
                case 'Space':
                    e.preventDefault();
                    this.toggleAnimation();
                    break;
                case 'KeyR':
                    this.resetToDefaults();
                    break;
                case 'KeyF':
                    this.toggleFullscreen();
                    break;
            }
        });
    }
    
    setupTapDetection() {
        // Listen for double tap events
        this.tapDetector.on('double-tap', () => {
            console.log('🎯 Double tap detected! Switching to next shape...');
            this.cycleToNextShape();
        });
        
        // Log detector status on startup
        console.log('🎯 TapDetector initialized:', this.tapDetector.getStatus());
    }
    
    cycleToNextShape() {
        const shapes = ['torusKnot', 'sphere', 'cube', 'dodecahedron'];
        const shapeSelect = document.getElementById('shapeSelect');
        const currentIndex = shapes.indexOf(shapeSelect.value);
        const nextIndex = (currentIndex + 1) % shapes.length;
        const nextShape = shapes[nextIndex];
        
        console.log(`📦 Shape changed: ${shapeSelect.value} → ${nextShape}`);
        
        shapeSelect.value = nextShape;
        this.sceneManager.updateMesh(nextShape);
    }
    
    resetToDefaults() {
        // Reset controls
        document.getElementById('shapeSelect').value = 'torusKnot';
        document.getElementById('rotationSpeed').value = '0.005';
        document.getElementById('speedValue').textContent = '0.005';
        document.getElementById('cameraDistance').value = '3';
        document.getElementById('distanceValue').textContent = '3';
        
        // Reset parameters
        this.rotationSpeed = 0.005;
        this.cameraManager.updateDistance(3.5);
        this.sceneManager.updateMesh('torusKnot');
        
        // Reset object rotation
        const mesh = this.sceneManager.getMesh();
        if (mesh) {
            mesh.rotation.set(0, 0, 0);
        }
    }
    
    toggleAnimation() {
        this.isAnimating = !this.isAnimating;
    }
    
    toggleFullscreen() {
        if (!document.fullscreenElement && 
            !document.webkitFullscreenElement && 
            !document.mozFullScreenElement && 
            !document.msFullscreenElement) {
            // Enter fullscreen
            const app = document.getElementById("app");
            if (app.requestFullscreen) {
                app.requestFullscreen();
            } else if (app.webkitRequestFullscreen) { // Safari
                app.webkitRequestFullscreen();
            } else if (app.msRequestFullscreen) { // IE11
                app.msRequestFullscreen();
            }
            // Fallback immediate add in case event is delayed / not firing on iOS
            if (app) app.classList.add('fullscreen-mode');
        } else {
            // Exit fullscreen
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
            const app = document.getElementById('app');
            if (app) app.classList.remove('fullscreen-mode');
        }
    }
    
    handleFullscreenChange() {
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        const isFullscreen = !!(document.fullscreenElement || 
                               document.webkitFullscreenElement || 
                               document.mozFullScreenElement || 
                               document.msFullscreenElement);
        
        fullscreenBtn.textContent = isFullscreen ? 'Exit Fullscreen' : 'Toggle Fullscreen';
        // Sync class with real state
        const app = document.getElementById('app');
        if (app) {
            if (isFullscreen) app.classList.add('fullscreen-mode');
            else app.classList.remove('fullscreen-mode');
        }
        
        // Trigger resize handling to adjust canvas
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 100);
    }
    
    resetCamera() {
        this.cameraManager.updateDistance(3.5);
    }
    
    setupResizeHandling() {
        // Register resize callback with render manager
        this.renderManager.onResizeCallback((width, height) => {
            // Update camera manager for new dimensions
            this.cameraManager.handleResize(width, height);
            
            console.log(`📱 Window resized to: ${width}x${height}`);
        });
    }
    
    setupViewToggle() {
        const viewToggleBtn = document.getElementById('viewToggleBtn');
        viewToggleBtn.addEventListener('click', () => {
            this.toggleViewMode();
        });
    }
    
    setupCameraInteraction() {
        let isDragging = false;
        let lastX = 0;
        let lastY = 0;
        
        // Mouse down on canvas - start dragging
        this.canvas.addEventListener('mousedown', (e) => {
            if (this.viewMode === 'single') {
                isDragging = true;
                lastX = e.clientX;
                lastY = e.clientY;
                this.canvas.style.cursor = 'grabbing';
            }
        });
        
        // Mouse move - rotate camera
        document.addEventListener('mousemove', (e) => {
            if (!isDragging || this.viewMode !== 'single') return;
            
            const deltaX = e.clientX - lastX;
            const deltaY = e.clientY - lastY;
            
            // Sensitivity: 0.5 degrees per pixel (both axes inverted for natural feel)
            this.cameraManager.rotateSingleCamera(-deltaX * 0.5, -deltaY * 0.5);
            
            lastX = e.clientX;
            lastY = e.clientY;
        });
        
        // Mouse up - stop dragging
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                this.canvas.style.cursor = 'default';
            }
        });
        
        // Touch support for mobile
        this.canvas.addEventListener('touchstart', (e) => {
            if (this.viewMode === 'single' && e.touches.length === 1) {
                isDragging = true;
                lastX = e.touches[0].clientX;
                lastY = e.touches[0].clientY;
                e.preventDefault();
            }
        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            if (!isDragging || this.viewMode !== 'single' || e.touches.length !== 1) return;
            
            const deltaX = e.touches[0].clientX - lastX;
            const deltaY = e.touches[0].clientY - lastY;
            
            this.cameraManager.rotateSingleCamera(-deltaX * 0.5, -deltaY * 0.5);
            
            lastX = e.touches[0].clientX;
            lastY = e.touches[0].clientY;
            e.preventDefault();
        });
        
        this.canvas.addEventListener('touchend', () => {
            isDragging = false;
        });
    }
    
    toggleViewMode() {
        if (this.viewMode === 'quadrant') {
            this.viewMode = 'single';
            this.renderManager.setViewMode('single');
            document.getElementById('viewToggleBtn').textContent = 'Four Quadrants';
        } else {
            this.viewMode = 'quadrant';
            this.renderManager.setViewMode('quadrant');
            document.getElementById('viewToggleBtn').textContent = 'Single View';
        }
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Object animation - horizontal rotation only
        const mesh = this.sceneManager.getMesh();
        if (mesh && this.isAnimating) {
            mesh.rotation.y += this.rotationSpeed;
        }
        
        // Render based on view mode
        try {
            if (this.viewMode === 'single') {
                this.renderManager.renderSingle(
                    this.sceneManager.getScene(),
                    this.cameraManager.getSingleCamera()
                );
            } else {
                this.renderManager.renderQuadrants(
                    this.sceneManager.getScene(),
                    this.cameraManager.getCameras()
                );
            }
        } catch (error) {
            console.error('❌ Render error:', error);
        }
    }
}
