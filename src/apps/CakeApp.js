import * as THREE from 'three';
import { SceneManager } from '../core/SceneManager.js';
import { CameraManager } from '../core/CameraManager.js';
import { RenderManager } from '../core/RenderManager.js';
import { TapDetector } from '../features/TapDetector.js';
import { FlameEffect } from '../features/FlameEffect.js';

/**
 * CakeApp - Cake Page Application
 * 
 * Features:
 * - Load fixed cake.glb model
 * - Add flame effect at candle position
 * - Support double-tap/button to extinguish flame
 * - Retain most features from index.html (except model switching)
 */
export class CakeApp {
    constructor() {
        this.canvas = document.getElementById('canvas');
        
        if (!this.canvas) {
            console.error('❌ Canvas element not found!');
            return;
        }
        
        this.rotationSpeed = 0.002; // Cake rotation speed slightly slower
        this.isAnimating = true;
        
        // Model center (will be set after loading)
        this.modelCenter = new THREE.Vector3(0, 0, 0);
        
        // Model center (will be set after loading)
        this.modelCenter = new THREE.Vector3(0, 0, 0);
        
        // Initialize managers
        this.renderManager = new RenderManager(this.canvas);
        this.sceneManager = new SceneManager(this.renderManager.getRenderer());
        this.cameraManager = new CameraManager();
        
        // View mode state
        this.viewMode = 'quadrant';
        
        // Flame effect (will be created after model loads)
        this.flameEffect = null;
        
        // Initialize tap detector
        this.tapDetector = new TapDetector({
            threshold: 1,
            tapWindow: 1500,
            cooldown: 200,
            requiredTaps: 2,
            debugMode: false
        });
        
        // Setup
        this.setupTapDetection();
        this.setupResizeHandling();
        this.setupControls();
        this.setupViewToggle();
        this.setupCameraInteraction();
        
        // Load cake model
        this.loadCakeModel();
        
        // Start animation loop
        this.animate();
    }
    
    /**
     * Load cake model
     */
    async loadCakeModel() {
        console.log('🎂 Loading cake model...');
        
        try {
            // Use relative path that works with Vite base path
            const modelPath = './models/cake.glb';
            await this.sceneManager.loadModelFromURL(modelPath);
            
            console.log('✅ Cake model loaded successfully');
            
            // Debug: Check model position and bounding box
            const mesh = this.sceneManager.getMesh();
            if (mesh) {
                const box = new THREE.Box3().setFromObject(mesh);
                const center = box.getCenter(new THREE.Vector3());
                
                console.log('🎂 Model info:', {
                    position: mesh.position,
                    scale: mesh.scale,
                    boundingBox: {
                        min: box.min,
                        max: box.max,
                        center: center,
                        size: box.getSize(new THREE.Vector3())
                    }
                });
                
                // Store model center for camera target
                this.modelCenter.copy(center);
                
                // Update camera to look at model center
                this.cameraManager.setLookAtTarget(this.modelCenter);
                console.log('🎯 Camera now looking at:', this.modelCenter);
            }
            
            // Try to automatically find candle position
            this.findCandlePosition();
            
        } catch (error) {
            console.error('❌ Failed to load cake model:', error);
            alert(`Failed to load cake model: ${error.message}\n\nPlease ensure cake.glb exists in the /public/models/ directory`);
        }
    }
    
    /**
     * Find candle position
     * Strategy:
     * 1. Find node with "candle" in name AND has actual geometry
     * 2. Use the TOP of its bounding box as flame position
     * 3. Fallback: use top center of entire model
     */
    findCandlePosition() {
        let candlePosition = null;
        let candleMesh = null;
        
        const mesh = this.sceneManager.getMesh();
        if (!mesh) {
            console.warn('⚠️  No mesh found in scene');
            return;
        }
        
        // Traverse to find candle mesh with actual geometry
        mesh.traverse((child) => {
            if (!candleMesh && child.isMesh && child.geometry && child.name) {
                const nameLower = child.name.toLowerCase();
                if (nameLower.includes('candle') || 
                    nameLower.includes('wick') || 
                    nameLower.includes('flame')) {
                    candleMesh = child;
                    console.log(`🕯️  Found candle mesh: "${child.name}"`);
                }
            }
        });
        
        // If found candle mesh, use TOP of its bounding box
        if (candleMesh) {
            // Compute bounding box in local space
            candleMesh.geometry.computeBoundingBox();
            const bbox = candleMesh.geometry.boundingBox;
            
            // Get top center of candle mesh
            const localTop = new THREE.Vector3(
                (bbox.min.x + bbox.max.x) / 2,
                bbox.max.y,  // Top of the candle
                (bbox.min.z + bbox.max.z) / 2
            );
            
            // Convert to world space
            const worldTop = localTop.clone();
            candleMesh.localToWorld(worldTop);
            
            // Convert to mesh's local space
            candlePosition = mesh.worldToLocal(worldTop);
            
            console.log('🕯️  Candle bounding box:', bbox);
            console.log('🕯️  Candle top (local):', localTop);
            console.log('🕯️  Candle top (world):', worldTop);
            console.log('🕯️  Flame position (mesh local):', candlePosition);
        }
        
        // Fallback: Use top center of entire model
        if (!candlePosition) {
            console.warn('⚠️  No candle mesh found, using model top center');
            
            const box = new THREE.Box3().setFromObject(mesh);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            
            // Convert world coordinates to mesh local space
            const worldTop = new THREE.Vector3(center.x, box.max.y, center.z);
            candlePosition = mesh.worldToLocal(worldTop);
            
            console.log('🕯️  Model bounding box (world):', {
                min: box.min,
                max: box.max,
                size: size
            });
            console.log('🕯️  Using model top center:', candlePosition);
        }
        
        // Create flame effect
        this.createFlameEffect(candlePosition);
    }
    
    /**
     * Create flame effect
     */
    createFlameEffect(position) {
        // Clean up old flame effect
        if (this.flameEffect) {
            const oldParticles = this.flameEffect.getParticleSystem();
            this.sceneManager.getScene().remove(oldParticles);
            this.flameEffect.dispose();
        }
        
        // Create flame effect scaled to match model
        this.flameEffect = new FlameEffect({
            particleCount: 150,      // Moderate particle count
            flameHeight: 0.35,       // Flame height (for color gradient)
            flameRadius: 0.06,       // Wider base
            particleSpeed: 0.005      // Rising speed (controls actual height)
        });
        
        const mesh = this.sceneManager.getMesh();
        
        // Add flame as child of cake so it rotates with cake
        const particleSystem = this.flameEffect.getParticleSystem();
        particleSystem.position.copy(position);  // Set position once here
        
        // Set initial particle size based on current view mode
        if (this.viewMode === 'quadrant') {
            this.flameEffect.setParticleSize(0.02);  // Smaller for quadrant
        } else {
            this.flameEffect.setParticleSize(0.01);  // Larger for single
        }
        
        console.log('🔥 Flame particle system:', {
            position: position,
            particleCount: particleSystem.geometry.attributes.position.count,
            visible: particleSystem.visible,
            material: {
                size: particleSystem.material.size,
                opacity: particleSystem.material.opacity,
                sizeAttenuation: particleSystem.material.sizeAttenuation
            }
        });
        
        if (mesh) {
            mesh.add(particleSystem);
            
            // Calculate world position of flame
            const worldPos = new THREE.Vector3();
            particleSystem.getWorldPosition(worldPos);
            console.log('🔥 Flame added as child at local position:', position);
            console.log('🌍 Flame world position:', worldPos);
        } else {
            this.sceneManager.getScene().add(particleSystem);
            console.log('🔥 Flame added to scene');
        }
    }
    
    setupControls() {
        // Tap detection enable button
        const enableTapBtn = document.getElementById('enableTapDetectionBtn');
        if (enableTapBtn) {
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
        }
        
        // Add keyboard controls for flame size adjustment (for debugging)
        window.addEventListener('keydown', (e) => {
            if (!this.flameEffect) return;
            
            const currentSize = this.flameEffect.material.size;
            let newSize = currentSize;
            
            if (e.key === '[') {
                newSize = currentSize - 0.01;
                this.flameEffect.setParticleSize(newSize);
                console.log('🔥 Flame size decreased to:', newSize);
            } else if (e.key === ']') {
                newSize = currentSize + 0.01;
                this.flameEffect.setParticleSize(newSize);
                console.log('🔥 Flame size increased to:', newSize);
            }
        });
        
        // Lighting mode toggle
        const lightingToggleBtn = document.getElementById('lightingToggleBtn');
        if (lightingToggleBtn) {
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
        }
        
        // Extinguish flame button
        const extinguishBtn = document.getElementById('extinguishBtn');
        if (extinguishBtn) {
            extinguishBtn.addEventListener('click', () => {
                if (this.flameEffect) {
                    this.flameEffect.toggle();
                    
                    // Update button text
                    if (this.flameEffect.isBurning) {
                        extinguishBtn.textContent = '💨 Extinguish Flame';
                    } else {
                        extinguishBtn.textContent = '🔥 Relight Flame';
                    }
                }
            });
        }
        
        // Rotation speed control
        const rotationSpeedSlider = document.getElementById('rotationSpeed');
        const speedValue = document.getElementById('speedValue');
        
        if (rotationSpeedSlider && speedValue) {
            rotationSpeedSlider.addEventListener('input', (e) => {
                this.rotationSpeed = parseFloat(e.target.value);
                speedValue.textContent = this.rotationSpeed.toFixed(3);
            });
        }
        
        // Camera distance control
        const cameraDistanceSlider = document.getElementById('cameraDistance');
        const distanceValue = document.getElementById('distanceValue');
        
        if (cameraDistanceSlider && distanceValue) {
            cameraDistanceSlider.addEventListener('input', (e) => {
                const distance = parseFloat(e.target.value);
                this.cameraManager.updateDistance(distance);
                distanceValue.textContent = distance.toFixed(1);
            });
        }
        
        // Reset button
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetCamera();
            });
        }
        
        // Fullscreen button
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => {
                this.toggleFullscreen();
            });
        }
        
        // Listen for fullscreen changes
        document.addEventListener('fullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('webkitfullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('mozfullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('MSFullscreenChange', () => this.handleFullscreenChange());
        
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
                case 'KeyE':
                    // E key: toggle flame
                    if (this.flameEffect) {
                        this.flameEffect.toggle();
                    }
                    break;
            }
        });
    }
    
    setupTapDetection() {
        // Double tap to toggle flame state
        this.tapDetector.on('double-tap', () => {
            console.log('🎯 Double tap detected! Toggling flame...');
            
            if (this.flameEffect) {
                this.flameEffect.toggle();
                
                // Update button text
                const extinguishBtn = document.getElementById('extinguishBtn');
                if (extinguishBtn) {
                    if (this.flameEffect.isBurning) {
                        extinguishBtn.textContent = '💨 Extinguish Flame';
                    } else {
                        extinguishBtn.textContent = '🔥 Relight Flame';
                    }
                }
            }
        });
        
        console.log('🎯 TapDetector initialized:', this.tapDetector.getStatus());
    }
    
    resetToDefaults() {
        // Reset controls
        const rotationSpeedSlider = document.getElementById('rotationSpeed');
        const speedValue = document.getElementById('speedValue');
        const cameraDistanceSlider = document.getElementById('cameraDistance');
        const distanceValue = document.getElementById('distanceValue');
        
        if (rotationSpeedSlider) rotationSpeedSlider.value = '0.003';
        if (speedValue) speedValue.textContent = '0.003';
        if (cameraDistanceSlider) cameraDistanceSlider.value = '4.5';
        if (distanceValue) distanceValue.textContent = '4.5';
        
        this.rotationSpeed = 0.003;
        this.cameraManager.updateDistance(4.5);
        
        // Reset cake rotation
        const mesh = this.sceneManager.getMesh();
        if (mesh) {
            mesh.rotation.set(0, 0, 0);
        }
        
        // Relight flame if extinguished
        if (this.flameEffect && !this.flameEffect.isBurning) {
            this.flameEffect.relight();
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
            const app = document.getElementById("app");
            if (app.requestFullscreen) {
                app.requestFullscreen();
            } else if (app.webkitRequestFullscreen) {
                app.webkitRequestFullscreen();
            } else if (app.msRequestFullscreen) {
                app.msRequestFullscreen();
            }
            if (app) app.classList.add('fullscreen-mode');
        } else {
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
        
        if (fullscreenBtn) {
            fullscreenBtn.textContent = isFullscreen ? 'Exit Fullscreen' : 'Toggle Fullscreen';
        }
        
        const app = document.getElementById('app');
        if (app) {
            if (isFullscreen) app.classList.add('fullscreen-mode');
            else app.classList.remove('fullscreen-mode');
        }
        
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 100);
    }
    
    resetCamera() {
        this.cameraManager.updateDistance(4.5);
    }
    
    setupResizeHandling() {
        this.renderManager.onResizeCallback((width, height) => {
            this.cameraManager.handleResize(width, height);
            console.log(`📱 Window resized to: ${width}x${height}`);
        });
    }
    
    setupViewToggle() {
        const viewToggleBtn = document.getElementById('viewToggleBtn');
        if (viewToggleBtn) {
            viewToggleBtn.addEventListener('click', () => {
                this.toggleViewMode();
            });
        }
    }
    
    setupCameraInteraction() {
        let isDragging = false;
        let lastX = 0;
        let lastY = 0;
        
        this.canvas.addEventListener('mousedown', (e) => {
            if (this.viewMode === 'single') {
                isDragging = true;
                lastX = e.clientX;
                lastY = e.clientY;
                this.canvas.style.cursor = 'grabbing';
            }
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging || this.viewMode !== 'single') return;
            
            const deltaX = e.clientX - lastX;
            const deltaY = e.clientY - lastY;
            
            this.cameraManager.rotateSingleCamera(-deltaX * 0.5, -deltaY * 0.5);
            
            lastX = e.clientX;
            lastY = e.clientY;
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                this.canvas.style.cursor = 'default';
            }
        });
        
        // Touch support
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
            
            // Adjust flame size for Single View (larger distance)
            if (this.flameEffect) {
                const singleSize = 0.2;
                this.flameEffect.setParticleSize(singleSize);
            }
            
            const btn = document.getElementById('viewToggleBtn');
            if (btn) btn.textContent = 'Four Quadrants';
            console.log('📐 Switched to Single View');
        } else {
            this.viewMode = 'quadrant';
            this.renderManager.setViewMode('quadrant');
            
            // Adjust flame size for Quadrant View (closer distance)
            if (this.flameEffect) {
                const quadrantSize = 0.02;
                this.flameEffect.setParticleSize(quadrantSize);
            }
            
            const btn = document.getElementById('viewToggleBtn');
            if (btn) btn.textContent = 'Single View';
            console.log('📐 Switched to Quadrant View');
        }
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Update flame effect
        if (this.flameEffect) {
            this.flameEffect.update(0.016); // ~60fps
        }
        
        // Rotate cake
        const mesh = this.sceneManager.getMesh();
        if (mesh && this.isAnimating) {
            mesh.rotation.y += this.rotationSpeed;
        }
        
        // Render
        try {
            if (this.viewMode === 'single') {
                const camera = this.cameraManager.getSingleCamera();
                this.renderManager.renderSingle(
                    this.sceneManager.getScene(),
                    camera
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
    
    /**
     * Adjust brightness (tone mapping exposure)
     * Usage in console: window.app.setBrightness(2.0)
     * @param {number} value - Exposure value (0.5 = darker, 1.8 = default, 3.0 = very bright)
     */
    setBrightness(value) {
        this.renderManager.setExposure(value);
        console.log(`✨ Brightness adjusted to: ${value}`);
    }
    
    /**
     * Get current brightness value
     */
    getBrightness() {
        return this.renderManager.getExposure();
    }
}
