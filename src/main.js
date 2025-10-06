import { SceneManager } from './SceneManager.js';
import { CameraManager } from './CameraManager.js';
import { RenderManager } from './RenderManager.js';

class PepperGhostApp {
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
        
        // Setup resize handling
        this.setupResizeHandling();
        
        // Create default object
        this.sceneManager.updateMesh('torusKnot');
        
        // Setup controls
        this.setupControls();
        this.setupViewToggle();
        
        // Start animation loop
        this.animate();
    }
    
    setupControls() {
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

// Initialize application
function initApp() {
    console.log('🚀 Pepper Ghost Effect - Four Quadrant 3D Viewer');
    console.log('⌨️  Controls: Space = Pause/Resume, R = Reset');
    
    try {
        new PepperGhostApp();
    } catch (error) {
        console.error('❌ Failed to initialize app:', error);
    }
}

// Ensure DOM is loaded before initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    // DOM already loaded
    initApp();
}