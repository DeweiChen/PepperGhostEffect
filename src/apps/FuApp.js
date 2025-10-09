import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SceneManager } from '../core/SceneManager.js';
import { CameraManager } from '../core/CameraManager.js';
import { RenderManager } from '../core/RenderManager.js';
import { TapDetector } from '../features/TapDetector.js';

/**
 * FuApp - Happy Birthday 3D Text Application
 * 
 * Features:
 * - 3D text "Happy Birthday !" with emissive glow and bloom effect
 * - Four quadrant Pepper Ghost view (no bloom)
 * - Single view with bloom post-processing
 * - Double-tap detection
 * - Rotation control
 */
export class FuApp {
    constructor() {
        this.canvas = document.getElementById('canvas');
        
        if (!this.canvas) {
            console.error('❌ Canvas element not found!');
            return;
        }
        
        this.rotationSpeed = 0.002;
        this.isAnimating = false;
        
        // Text mesh reference
        this.textMesh = null;
        
        // Model center
        this.modelCenter = new THREE.Vector3(0, 0, 0);
        
        // Post-processing
        this.composer = null;
        this.bloomPass = null;
        
        // Bloom parameters (constants)
        this.BLOOM_STRENGTH = 1.5;
        this.BLOOM_RADIUS = 0.4;
        this.BLOOM_THRESHOLD = 0.2;
        
        // Initialize managers
        this.renderManager = new RenderManager(this.canvas);
        this.sceneManager = new SceneManager(this.renderManager.getRenderer());
        this.cameraManager = new CameraManager(0, 6.8);  // Use horizontal angle (0°) for FuApp, distance 6.8
        
        // View mode state
        this.viewMode = 'quadrant';
        
        // Initialize tap detector
        this.tapDetector = new TapDetector({
            targetElement: this.renderManager.getRenderer().domElement,
            threshold: 1,
            tapWindow: 1500,
            cooldown: 200,
            requiredTaps: 2,
            debugMode: false
        });
        
        // Setup
        this.setupTapDetection();
        this.setupResizeHandling();
        this.setupPostProcessing();
        this.setupControls();
        this.setupViewToggle();
        
        // Create 3D text
        this.create3DText();
        
        // Start animation loop
        this.animate();

        // Fullscreen change listener to enforce hiding panels (Safari quirks)
        const app = document.getElementById('app');
        const applyFsClass = () => {
            if (document.fullscreenElement === app) {
                app.classList.add('fullscreen-mode');
            } else {
                app.classList.remove('fullscreen-mode');
            }
        };
        ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(ev => {
            document.addEventListener(ev, applyFsClass);
        });
    }
    
    /**
     * Setup post-processing with bloom effect
     * Only used in single view mode
     */
    setupPostProcessing() {
        const renderer = this.renderManager.getRenderer();
        const scene = this.sceneManager.getScene();
        const camera = this.cameraManager.getSingleCamera();
        
        // Create EffectComposer
        this.composer = new EffectComposer(renderer);
        
        // Add render pass
        const renderPass = new RenderPass(scene, camera);
        this.composer.addPass(renderPass);
        
        // Add bloom pass
        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            this.BLOOM_STRENGTH,  // strength
            this.BLOOM_RADIUS,    // radius
            this.BLOOM_THRESHOLD  // threshold (only bright parts bloom)
        );
        this.composer.addPass(this.bloomPass);
        
        // Inject composer into RenderManager
        this.renderManager.setComposer(this.composer);
        
        console.log('✅ Post-processing setup complete (Bloom enabled for single view)');
    }
    
    /**
     * Create 3D text with emissive glow
     */
    async create3DText() {
        console.log('📝 Creating 3D text...');
        
        try {
            const loader = new FontLoader();

            const font = await loader.loadAsync(
                'https://cdn.jsdelivr.net/gh/DeweiChen/PepperGhostEffect/public/assets/fredoka_light_regular.json'
            );
            
            // Create text geometry
            const geometry = new TextGeometry('Happy Birthday Fu', {
                font: font,
                size: 0.5,
                height: 0.1,
                bevelEnabled: true,
                bevelThickness: 0.02,
                bevelSize: 0.04,
                bevelOffset: 0,
                bevelSegments: 10,
                curveSegments: 16
            });
            
            // Center the geometry
            geometry.center();
            
            // Create material with emissive glow
            const material = new THREE.MeshStandardMaterial({
                color: 0x1AFD9C,        // Cyan-green base color
                emissive: 0x1AFD9C,     // Emissive glow (same color)
                emissiveIntensity: 0.2, // glow (default ON)
                metalness: 0,
                roughness: 0.4,
                clearcoat: 1,            // Clearcoat layer
                clearcoatRoughness: 0.1, // Smooth but not too shiny
            });
            
            // Create mesh
            this.textMesh = new THREE.Mesh(geometry, material);
            
            // Add to scene through SceneManager
            const scene = this.sceneManager.getScene();
            scene.add(this.textMesh);
            
            console.log('✅ 3D text created successfully');
            
            // Update camera to look at text center
            this.cameraManager.setLookAtTarget(this.modelCenter);
            
        } catch (error) {
            console.error('❌ Failed to create 3D text:', error);
            alert(`Failed to create 3D text: ${error.message}`);
        }
    }
    
    /**
     * Setup tap detection
     */
    setupTapDetection() {
        this.tapDetector.on('doubleTap', (event) => {
            console.log('🎯 Double tap detected!');
            this.toggleTextGlow();
        });
    }
    
    /**
     * Toggle text emissive glow (works in both single and quadrant views)
     */
    toggleTextGlow() {
        if (!this.textMesh) return;
        
        const material = this.textMesh.material;
        
        if (material.emissiveIntensity > 0) {
            // Turn off glow
            material.emissiveIntensity = 0;
            console.log('💡 Glow OFF');
        } else {
            // Turn on glow
            material.emissiveIntensity = 0.8;
            console.log('✨ Glow ON');
        }
    }
    
    /**
     * Setup resize handling
     */
    setupResizeHandling() {
        this.renderManager.onResizeCallback((width, height) => {
            this.cameraManager.handleResize(width, height);
            
            // Update composer size if it exists
            if (this.composer) {
                this.composer.setSize(width, height);
            }
            
            console.log(`📱 Window resized to: ${width}x${height}`);
        });
    }
    
    /**
     * Setup UI controls
     */
    setupControls() {
        // Tap detection enable button
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
        
        // Camera distance control
        const cameraDistanceSlider = document.getElementById('cameraDistance');
        const distanceValue = document.getElementById('distanceValue');
        
        cameraDistanceSlider.addEventListener('input', (e) => {
            const distance = parseFloat(e.target.value);
            this.cameraManager.updateDistance(distance);
            distanceValue.textContent = distance.toFixed(1);
        });
        
        // Bloom strength control (only affects single view)
        const bloomStrengthSlider = document.getElementById('bloomStrength');
        const bloomValue = document.getElementById('bloomValue');
        
        if (bloomStrengthSlider && bloomValue) {
            bloomStrengthSlider.addEventListener('input', (e) => {
                const strength = parseFloat(e.target.value);
                this.setBloomStrength(strength);
                bloomValue.textContent = strength.toFixed(1);
            });
        }
        
        // Reset button
        const resetBtn = document.getElementById('resetBtn');
        resetBtn.addEventListener('click', () => {
            this.reset();
        });
        
        // Fullscreen button
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        fullscreenBtn.addEventListener('click', () => {
            this.toggleFullscreen();
        });
        
        // Keyboard controls
        window.addEventListener('keydown', (e) => {
            switch (e.key.toLowerCase()) {
                case ' ':
                    this.isAnimating = !this.isAnimating;
                    console.log(`⏯️  Animation ${this.isAnimating ? 'resumed' : 'paused'}`);
                    break;
                case 'r':
                    this.reset();
                    break;
                case 'e':
                    this.toggleTextGlow();
                    break;
                case 'f':
                    this.toggleFullscreen();
                    break;
            }
        });
    }
    
    /**
     * Setup view toggle (quadrant/single)
     * Single view uses bloom, quadrant view uses direct rendering
     */
    setupViewToggle() {
        const viewToggleBtn = document.getElementById('viewToggleBtn');
        
        viewToggleBtn.addEventListener('click', () => {
            this.viewMode = this.viewMode === 'quadrant' ? 'single' : 'quadrant';
            this.renderManager.setViewMode(this.viewMode);
            viewToggleBtn.textContent = this.viewMode === 'quadrant' ? 'Single View' : 'Quadrant View';
            
            console.log(`👁️  View mode: ${this.viewMode} ${this.viewMode === 'single' ? '(Bloom ON)' : '(Bloom OFF)'}`);
        });
    }
    
    /**
     * Reset camera and rotation
     */
    reset() {
        this.cameraManager.reset();
        
        if (this.textMesh) {
            this.textMesh.rotation.set(0, 0, 0);
        }
        
        // Reset UI controls
        document.getElementById('cameraDistance').value = 6.8;
        document.getElementById('distanceValue').textContent = '6.8';
        document.getElementById('rotationSpeed').value = 0.002;
        document.getElementById('speedValue').textContent = '0.002';
        
        // Reset bloom strength
        const bloomStrengthSlider = document.getElementById('bloomStrength');
        const bloomValue = document.getElementById('bloomValue');
        if (bloomStrengthSlider && bloomValue) {
            bloomStrengthSlider.value = this.BLOOM_STRENGTH;
            bloomValue.textContent = this.BLOOM_STRENGTH.toFixed(1);
            this.setBloomStrength(this.BLOOM_STRENGTH);
        }
        
        console.log('🔄 Reset complete');
    }
    
    /**
     * Toggle fullscreen mode
     */
    toggleFullscreen() {
        const app = document.getElementById('app');
        
        if (!document.fullscreenElement) {
            app.requestFullscreen().catch(err => {
                console.error('Fullscreen error:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }
    
    /**
     * Animation loop
     */
    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (this.isAnimating && this.textMesh) {
            this.textMesh.rotation.y += this.rotationSpeed;
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
     * Public API: Set bloom strength (for single view only)
     * @param {number} value - Bloom strength (0-5)
     */
    setBloomStrength(value) {
        if (this.bloomPass) {
            this.bloomPass.strength = value;
            console.log(`✨ Bloom strength set to: ${value}`);
        }
    }
    
    /**
     * Public API: Set brightness (for console control)
     */
    setBrightness(value) {
        this.renderManager.setExposure(value);
        console.log(`💡 Brightness set to: ${value}`);
    }
}
