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
 * - Required-tap detection for energy charging
 * - Long press to reset
 * - Rotation control
 */
export class FuApp {
    constructor() {
        this.canvas = document.getElementById('canvas');
        
        if (!this.canvas) {
            console.error('❌ Canvas element not found!');
            return;
        }
        
        // Energy charging state
        this.tapCount = 0;           // Tap counter (0-2, triggering 2nd and 3rd orbs)
        this.isRevealed = false;     // Text fully revealed flag
        this.isAnimating = false;    // Animation starts after reveal
        this.isExploding = false;    // Explosion animation in progress
        
        // Animation time for dynamic effects
        this.animationTime = 0;
        
        // Text mesh reference
        this.textMesh = null;
        
        // Energy orbs (3 spheres)
        this.energyOrbs = [];
        
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
        
        // Create energy orbs (hidden initially)
        this.createEnergyOrbs();
        
        // Create 3D text (hidden initially)
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
     * Initially hidden, revealed after 3 taps
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
                emissiveIntensity: 0.1, // glow (default ON)
                metalness: 0,
                roughness: 0.4,
                clearcoat: 1,            // Clearcoat layer
                clearcoatRoughness: 0.1, // Smooth but not too shiny
            });
            
            // Create mesh
            this.textMesh = new THREE.Mesh(geometry, material);
            this.textMesh.visible = false;  // Hidden until explosion
            
            // Add to scene through SceneManager
            const scene = this.sceneManager.getScene();
            scene.add(this.textMesh);
            
            console.log('✅ 3D text created (hidden, waiting for energy charge)');
            console.log('👆 Tap 3 times: Green → Blue → Merge!');
            
            // Update camera to look at text center
            this.cameraManager.setLookAtTarget(this.modelCenter);
            
        } catch (error) {
            console.error('❌ Failed to create 3D text:', error);
            alert(`Failed to create 3D text: ${error.message}`);
        }
    }
    
    /**
     * Create 3 energy orbs (RGB spheres)
     * Position: triangular formation around center
     * Red orb visible by default
     */
    createEnergyOrbs() {
        const scene = this.sceneManager.getScene();
        const radius = 0.15;  // Orb size
        const distance = 1.2; // Distance from center
        
        // RGB colors for 3 orbs
        const colors = [0xff0000, 0x00ff00, 0x0000ff];  // Red, Green, Blue
        const angles = [0, 120, 240];  // 120° apart
        
        for (let i = 0; i < 3; i++) {
            // Create sphere geometry
            const geometry = new THREE.SphereGeometry(radius, 32, 32);
            
            // Create emissive material
            const material = new THREE.MeshStandardMaterial({
                color: colors[i],
                emissive: colors[i],
                emissiveIntensity: 2,  // Strong glow
                metalness: 0,
                roughness: 0.2,
            });
            
            const orb = new THREE.Mesh(geometry, material);
            
            // Position in triangular formation
            const angleRad = (angles[i] * Math.PI) / 180;
            orb.userData.homePosition = new THREE.Vector3(
                Math.cos(angleRad) * distance,
                0,
                Math.sin(angleRad) * distance
            );
            
            orb.position.copy(orb.userData.homePosition);
            orb.visible = (i === 0);  // Only red orb visible initially
            orb.userData.orbIndex = i;
            orb.userData.rotationSpeed = 0.5 + i * 0.3;  // Different speeds
            
            this.energyOrbs.push(orb);
            scene.add(orb);
        }
        
        console.log('✅ Energy orbs created (Red orb visible, waiting for taps)');
        console.log('👆 Tap 3 times to spawn Green → Blue → Merge!');
    }
    
    /**
     * Setup tap detection
     * Required-tap charges energy orbs
     */
    setupTapDetection() {
        this.tapDetector.on('required-tap', (event) => {
            this.onTapCharge();
        });
        
        // Long press to reset entire sequence
        this.tapDetector.on('long-press', () => {
            console.log('⏱️ Long press detected! Resetting energy sequence...');
            this.resetEnergySequence();
        });
    }
    
    /**
     * Handle tap charging sequence
     * Tap 1: Show green orb, Tap 2: Show blue orb, Tap 3: Explosion -> Text reveal
     */
    onTapCharge() {
        if (this.isRevealed || this.isExploding) {
            console.log('✨ Already revealed or explosion in progress');
            return;
        }
        
        this.tapCount++;
        console.log(`⚡ Energy charge: Tap ${this.tapCount}/3`);
        
        if (this.tapCount === 1) {
            // First tap: Show green orb (index 1)
            this.showOrb(1);
            this.playHapticFeedback(1);
        } else if (this.tapCount === 2) {
            // Second tap: Show blue orb (index 2)
            this.showOrb(2);
            this.playHapticFeedback(2);
        } else if (this.tapCount === 3) {
            // Third tap: Trigger explosion
            this.playHapticFeedback(3);
            setTimeout(() => {
                this.triggerExplosion();
            }, 500);  // Small delay for dramatic effect
        }
    }
    
    /**
     * Show energy orb with spawn animation
     */
    showOrb(index) {
        if (index >= this.energyOrbs.length) return;
        
        const orb = this.energyOrbs[index];
        orb.visible = true;
        orb.scale.set(0, 0, 0);  // Start from zero
        
        // Animate scale up
        const startTime = Date.now();
        const duration = 300;
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const scale = this.easeOutBack(progress);
            
            orb.scale.setScalar(scale);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
        console.log(`🔮 Orb ${index + 1} spawned (${['Red', 'Green', 'Blue'][index]})`);
    }
    
    /**
     * Trigger explosion animation
     * Orbs converge to center -> Flash -> Text appears
     */
    triggerExplosion() {
        console.log('💥 Triggering explosion sequence...');
        this.isExploding = true;
        
        const startTime = Date.now();
        const convergeDuration = 500;  // 0.5s to converge
        const flashDuration = 100;     // 0.1s flash
        
        // Store initial positions
        const initialPositions = this.energyOrbs.map(orb => orb.position.clone());
        
        // Convergence animation
        const convergeAnimation = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / convergeDuration, 1);
            const eased = this.easeInCubic(progress);
            
            // Move orbs toward center
            this.energyOrbs.forEach((orb, i) => {
                orb.position.lerpVectors(
                    initialPositions[i],
                    new THREE.Vector3(0, 0, 0),
                    eased
                );
                
                // Increase glow as they converge
                orb.material.emissiveIntensity = 2 + eased * 5;
            });
            
            if (progress < 1) {
                requestAnimationFrame(convergeAnimation);
            } else {
                // Convergence complete -> Flash
                this.flashExplosion();
            }
        };
        
        convergeAnimation();
    }
    
    /**
     * Flash effect and reveal text
     * Fixed: Avoid white screen flash, use smooth transition
     */
    flashExplosion() {
        const scene = this.sceneManager.getScene();
        
        // Hide orbs immediately (no white flash)
        this.energyOrbs.forEach(orb => {
            orb.visible = false;
        });
        
        // Show text with explosion effect
        if (this.textMesh) {
            this.textMesh.visible = true;
            this.textMesh.scale.set(0, 0, 0);  // Start small
            
            // Boost emissive for initial flash effect (instead of white screen)
            const originalEmissive = this.textMesh.material.emissiveIntensity;
            this.textMesh.material.emissiveIntensity = 3;  // Bright flash from text itself
            
            // Explosive scale-up animation
            const startTime = Date.now();
            const duration = 400;
            
            const scaleUp = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const scale = this.easeOutBack(progress);
                
                this.textMesh.scale.setScalar(scale);
                
                // Fade emissive back to normal
                this.textMesh.material.emissiveIntensity = 3 - (progress * (3 - originalEmissive));
                
                if (progress < 1) {
                    requestAnimationFrame(scaleUp);
                } else {
                    // Animation complete
                    this.textMesh.material.emissiveIntensity = originalEmissive;
                    this.isAnimating = true;  // Start breathing animation
                    this.isRevealed = true;
                    this.isExploding = false;
                    console.log('🎉 Text revealed! Animation started.');
                }
            };
            
            scaleUp();
        }
        
        // Strong haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100, 50, 200]);
        }
        
        console.log('💥 EXPLOSION! Text revealed!');
    }
    
    /**
     * Play haptic feedback based on tap count
     */
    playHapticFeedback(tapCount) {
        if (!navigator.vibrate) return;
        
        const patterns = [
            [50],                  // Tap 1: Short
            [50, 30, 50],          // Tap 2: Double
            [100, 50, 100]         // Tap 3: Triple (pre-explosion)
        ];
        
        navigator.vibrate(patterns[tapCount - 1]);
    }
    
    /**
     * Reset energy sequence to initial state
     * Called by long press
     */
    resetEnergySequence() {
        // Reset state
        this.tapCount = 0;
        this.isRevealed = false;
        this.isAnimating = false;
        this.isExploding = false;
        this.animationTime = 0;
        
        // Hide text
        if (this.textMesh) {
            this.textMesh.visible = false;
            this.textMesh.scale.set(1, 1, 1);
            this.textMesh.material.emissiveIntensity = 1.5;
        }
        
        // Reset all orbs
        this.energyOrbs.forEach((orb, index) => {
            orb.visible = (index === 0); // Only first orb visible
            orb.scale.set(1, 1, 1);
            orb.material.emissiveIntensity = 2;
            
            // Reset positions
            const angle = (index / 3) * Math.PI * 2 - Math.PI / 2;
            const radius = 3;
            orb.position.set(
                Math.cos(angle) * radius,
                0,
                Math.sin(angle) * radius
            );
        });
        
        console.log('🔄 Energy sequence reset! Ready to tap again.');
        console.log('👆 Tap 3 times to spawn Green → Blue → Merge!');
        
        // Haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200]);
        }
    }
    
    // Easing functions
    easeOutBack(t) {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }
    
    easeInCubic(t) {
        return t * t * t;
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
     * Reset camera and animation state
     * Returns to initial state: Only red orb visible
     */
    reset() {
        console.log('🔄 Reset triggered...');
        
        // Reset animation time and transforms
        this.animationTime = 0;
        
        // Reset text
        if (this.textMesh) {
            this.textMesh.rotation.set(0, 0, 0);
            this.textMesh.scale.setScalar(1);
            this.textMesh.position.set(0, 0, 0);
            this.textMesh.visible = false;  // Hide text
            this.textMesh.material.emissiveIntensity = 0.1;  // Reset emissive
            console.log('  ✓ Text hidden');
        }
        
        // Reset energy orbs to initial state
        if (this.energyOrbs && this.energyOrbs.length === 3) {
            this.energyOrbs.forEach((orb, i) => {
                orb.visible = (i === 0);  // Only red orb visible
                orb.position.copy(orb.userData.homePosition);
                orb.scale.setScalar(1);
                orb.material.emissiveIntensity = 2;
                
                if (i === 0) {
                    console.log(`  ✓ Red orb visible at position:`, orb.position);
                } else {
                    console.log(`  ✓ ${['', 'Green', 'Blue'][i]} orb hidden`);
                }
            });
        } else {
            console.warn('  ⚠️  Energy orbs not ready yet');
        }
        
        // Reset charging state
        this.tapCount = 0;
        this.isRevealed = false;
        this.isAnimating = false;
        this.isExploding = false;
        
        // Reset UI controls
        const cameraDistanceSlider = document.getElementById('cameraDistance');
        const distanceValue = document.getElementById('distanceValue');
        if (cameraDistanceSlider && distanceValue) {
            cameraDistanceSlider.value = 6.8;
            distanceValue.textContent = '6.8';
        }
        
        // Reset bloom strength
        const bloomStrengthSlider = document.getElementById('bloomStrength');
        const bloomValue = document.getElementById('bloomValue');
        if (bloomStrengthSlider && bloomValue) {
            bloomStrengthSlider.value = this.BLOOM_STRENGTH;
            bloomValue.textContent = this.BLOOM_STRENGTH.toFixed(1);
            this.setBloomStrength(this.BLOOM_STRENGTH);
        }
        
        console.log('✅ Reset complete - Back to initial state (Red orb only)');
        console.log('👆 Tap 3 times: Green → Blue → Merge!');
    }
    
    /**
     * Toggle fullscreen mode
     */
    toggleFullscreen() {
        const app = document.getElementById('app');
        
        if (!document.fullscreenElement && 
            !document.webkitFullscreenElement && 
            !document.mozFullScreenElement && 
            !document.msFullscreenElement) {
            // Enter fullscreen
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
            // Fallback immediate remove
            if (app) app.classList.remove('fullscreen-mode');
        }
    }
    
    /**
     * Animation loop
     */
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Rotate visible orbs
        if (!this.isExploding) {
            this.energyOrbs.forEach((orb, i) => {
                if (orb.visible) {
                    // Orbit around center
                    const speed = orb.userData.rotationSpeed;
                    const angle = this.animationTime * speed;
                    const distance = 1.2;
                    
                    const baseAngle = (i * 120 * Math.PI) / 180;
                    orb.position.x = Math.cos(baseAngle + angle) * distance;
                    orb.position.z = Math.sin(baseAngle + angle) * distance;
                    orb.position.y = Math.sin(this.animationTime * 2 + i) * 0.2;  // Floating
                    
                    // Pulsing glow
                    orb.material.emissiveIntensity = 2 + Math.sin(this.animationTime * 3 + i) * 0.5;
                }
            });
        }
        
        // Text breathing animation (after reveal)
        if (this.isAnimating && this.textMesh && this.textMesh.visible) {
            // Update animation time (~60fps)
            this.animationTime += 0.016;
            const t = this.animationTime;
            
            // Breathing scale effect (gentle size pulsing)
            const scale = 1 + 0.04 * Math.sin(t * 1.5);
            this.textMesh.scale.setScalar(scale);
            
            // Floating effect (gentle up and down motion)
            this.textMesh.position.y = 0.3 * Math.sin(t * 1.5);
            
            // Pulsing glow effect (synced with breathing)
            // this.textMesh.material.emissiveIntensity = 0.2 + 0.08 * Math.sin(t * 1.5);
        } else if (!this.isAnimating) {
            // Still update time for orb animations
            this.animationTime += 0.016;
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
                    this.cameraManager.getCameras(),
                    this.composer  // ✅ Pass composer for bloom effect in quadrant view
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
    
    /**
     * Toggle text glow (emissive intensity)
     * Keyboard shortcut: E
     */
    toggleTextGlow() {
        if (!this.textMesh || !this.textMesh.visible) {
            console.log('⚠️  Text not visible yet');
            return;
        }
        
        const material = this.textMesh.material;
        const isGlowing = material.emissiveIntensity > 0.05;
        
        if (isGlowing) {
            material.emissiveIntensity = 0;
            console.log('💡 Text glow: OFF');
        } else {
            material.emissiveIntensity = 0.2;
            console.log('💡 Text glow: ON');
        }
    }
}
