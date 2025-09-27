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
        
        // Initialize managers
        this.sceneManager = new SceneManager();
        this.cameraManager = new CameraManager();
        this.renderManager = new RenderManager(this.canvas);
        
        // Setup resize handling
        this.setupResizeHandling();
        
        // Create default object
        this.sceneManager.updateMesh('torusKnot');
        
        // Setup controls
        this.setupControls();
        
        // Start animation loop
        this.animate();
    }
    
    setupControls() {
        // Shape selection
        const shapeSelect = document.getElementById('shapeSelect');
        shapeSelect.addEventListener('change', (e) => {
            this.sceneManager.updateMesh(e.target.value);
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
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Object animation
        const mesh = this.sceneManager.getMesh();
        if (mesh && this.isAnimating) {
            mesh.rotation.y += this.rotationSpeed;
            mesh.rotation.x += this.rotationSpeed * 0.4;
        }
        
        // Render four quadrants
        try {
            this.renderManager.renderQuadrants(
                this.sceneManager.getScene(),
                this.cameraManager.getCameras()
            );
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