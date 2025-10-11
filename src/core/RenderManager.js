import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export class RenderManager {
    constructor(canvas) {
        if (!canvas) {
            console.error('❌ No canvas provided to RenderManager!');
            return;
        }
        
        this.canvas = canvas;
        this.resizeCallbacks = [];
        this.viewMode = 'quadrant'; // 'quadrant' or 'single'
        this.composer = null; // Optional: EffectComposer for single view post-processing
        this.quadrantComposers = []; // ✅ Four separate composers for quadrant mode (no state pollution)
        
        this.renderer = new THREE.WebGLRenderer({ 
            canvas, 
            antialias: true,
            alpha: false
        });
        
        // 设置黑色背景
        this.renderer.setClearColor(0x000000, 1.0);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setScissorTest(true);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // ModelViewer-style rendering: Physical tone mapping + sRGB encoding
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.8;  // Increased from 1.0 for brighter rendering
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        window.addEventListener('resize', () => this.onResize());
    }
    
    onResize() {
        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight;
        
        // Update renderer size
        this.renderer.setSize(newWidth, newHeight);
        
        // Update pixel ratio if changed
        this.renderer.setPixelRatio(window.devicePixelRatio);
        
        // ✅ Update all quadrant composers' render targets
        this.quadrantComposers.forEach(composer => {
            composer.setSize(newWidth, newHeight);
        });
        
        // Update single view composer if exists
        if (this.composer) {
            this.composer.setSize(newWidth, newHeight);
        }
        
        // Notify all registered callbacks
        this.resizeCallbacks.forEach(callback => {
            try {
                callback(newWidth, newHeight);
            } catch (error) {
                console.error('Resize callback error:', error);
            }
        });
    }
    
    // Method to register resize callbacks
    onResizeCallback(callback) {
        this.resizeCallbacks.push(callback);
    }
    
    renderQuadrants(scene, cameras, composer = null) {
        if (!scene || !cameras || cameras.length !== 4) {
            console.error('❌ Invalid scene or cameras for rendering');
            return;
        }

        const canvas = this.renderer.domElement;
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        
        // Perfect centered Pepper's Ghost cross layout
        const centerX = w / 2;
        const centerY = h / 2;
        let viewSize;
        
        // Cross layout spans 3 units (top-center-bottom or left-center-right)
        viewSize = Math.min(w, h) / 3.3;  // 30.3% per viewport - perfect fit for cross layout
        
        const viewports = [
            // Perfectly centered cross layout
            { x: centerX - (viewSize / 2), y: centerY + (viewSize / 2), width: viewSize, height: viewSize },  // Top
            { x: centerX - (viewSize / 2), y: centerY - (viewSize * 1.5), width: viewSize, height: viewSize },  // Bottom
            { x: centerX - (viewSize * 1.5), y: centerY - (viewSize / 2), width: viewSize, height: viewSize },  // Left
            { x: centerX + (viewSize / 2), y: centerY - (viewSize / 2), width: viewSize, height: viewSize }   // Right
        ];
        
        // Set full viewport and clear
        this.renderer.setViewport(0, 0, w, h);
        this.renderer.setScissor(0, 0, w, h);
        this.renderer.clear();
        
        // ✅ If using bloom, ensure we have 4 independent composers (no state sharing)
        if (composer && this.quadrantComposers.length === 0) {
            console.warn('⚠️  Quadrant composers not initialized - creating them now');
            this.initializeQuadrantComposers(scene, cameras, composer);
        }
        
        // Render each quadrant with independent composer (zero state pollution)
        for (let i = 0; i < 4; i++) {
            const viewport = viewports[i];
            const camera = cameras[i];
            
            if (!camera) continue;
            
            // Set viewport and scissor area
            this.renderer.setViewport(
                Math.floor(viewport.x), 
                Math.floor(viewport.y), 
                Math.floor(viewport.width), 
                Math.floor(viewport.height)
            );
            this.renderer.setScissor(
                Math.floor(viewport.x), 
                Math.floor(viewport.y), 
                Math.floor(viewport.width), 
                Math.floor(viewport.height)
            );
            
            // Update camera aspect ratio
            camera.aspect = viewport.width / viewport.height;
            camera.updateProjectionMatrix();
            
            // ✅ Use independent composer per quadrant (never modify state)
            if (composer && this.quadrantComposers[i]) {
                this.quadrantComposers[i].render();
            } else {
                // Direct rendering (no bloom)
                this.renderer.render(scene, camera);
            }
        }
    }
    
    renderSingle(scene, camera) {
        if (!scene || !camera) {
            console.error('❌ Invalid scene or camera for rendering');
            return;
        }
        
        const canvas = this.renderer.domElement;
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        
        // Full viewport rendering
        this.renderer.setViewport(0, 0, w, h);
        this.renderer.setScissor(0, 0, w, h);
        
        // Update camera aspect
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        
        // Use composer if available (for post-processing effects like bloom)
        if (this.composer) {
            this.composer.render();
        } else {
            // Fallback to direct rendering
            this.renderer.render(scene, camera);
        }
    }
    
    setViewMode(mode) {
        if (mode === 'quadrant' || mode === 'single') {
            this.viewMode = mode;
        }
    }
    
    getViewMode() {
        return this.viewMode;
    }
    
    getRenderer() {
        return this.renderer;
    }
    
    /**
     * Set tone mapping exposure (brightness control)
     * @param {number} value - Exposure value (typical range: 0.5 - 3.0, default: 1.8)
     */
    setExposure(value) {
        this.renderer.toneMappingExposure = value;
        console.log(`💡 Tone mapping exposure set to: ${value}`);
    }
    
    /**
     * Get current exposure value
     */
    getExposure() {
        return this.renderer.toneMappingExposure;
    }
    
    /**
     * Set EffectComposer for single view post-processing
     * Quadrant view will continue using direct rendering
     * @param {EffectComposer} composer - Three.js EffectComposer instance
     */
    setComposer(composer) {
        this.composer = composer;
        console.log('✅ EffectComposer set for single view rendering');
    }
    
    /**
     * Remove composer and revert to direct rendering
     */
    clearComposer() {
        this.composer = null;
        console.log('🔄 Reverted to direct rendering');
    }
    
    /**
     * Get current composer instance
     */
    getComposer() {
        return this.composer;
    }
    
    /**
     * Initialize 4 independent composers for quadrant bloom rendering
     * Each composer is permanently bound to one camera (zero state pollution)
     * @param {THREE.Scene} scene - Scene to render
     * @param {THREE.Camera[]} cameras - Array of 4 cameras
     * @param {EffectComposer} referenceComposer - Reference composer to copy bloom settings from
     */
    initializeQuadrantComposers(scene, cameras, referenceComposer) {
        // Clear any existing composers
        this.quadrantComposers.forEach(c => c.dispose?.());
        this.quadrantComposers = [];
        
        // Get bloom parameters from reference composer
        let bloomStrength = 1.5;
        let bloomRadius = 0.4;
        let bloomThreshold = 0.1;
        
        if (referenceComposer) {
            const bloomPass = referenceComposer.passes.find(pass => 
                pass.constructor.name === 'UnrealBloomPass'
            );
            if (bloomPass) {
                bloomStrength = bloomPass.strength;
                bloomRadius = bloomPass.radius;
                bloomThreshold = bloomPass.threshold;
            }
        }
        
        // Create 4 independent composers
        for (let i = 0; i < 4; i++) {
            const camera = cameras[i];
            if (!camera) continue;
            
            // Create new EffectComposer for this quadrant
            const composer = new EffectComposer(this.renderer);
            
            // Add render pass (permanently bound to this camera)
            const renderPass = new RenderPass(scene, camera);
            composer.addPass(renderPass);
            
            // Add bloom pass with same settings
            const bloomPass = new UnrealBloomPass(
                new THREE.Vector2(window.innerWidth, window.innerHeight),
                bloomStrength,
                bloomRadius,
                bloomThreshold
            );
            composer.addPass(bloomPass);
            
            this.quadrantComposers.push(composer);
        }
        
        console.log(`✅ Initialized 4 independent quadrant composers (bloom: strength=${bloomStrength}, radius=${bloomRadius}, threshold=${bloomThreshold})`);
    }
    
    /**
     * Update bloom settings for all quadrant composers
     * @param {number} strength - Bloom strength
     * @param {number} radius - Bloom radius  
     * @param {number} threshold - Bloom threshold
     */
    updateQuadrantBloom(strength, radius, threshold) {
        this.quadrantComposers.forEach((composer, i) => {
            const bloomPass = composer.passes.find(pass => 
                pass.constructor.name === 'UnrealBloomPass'
            );
            if (bloomPass) {
                bloomPass.strength = strength;
                bloomPass.radius = radius;
                bloomPass.threshold = threshold;
            }
        });
        console.log(`✅ Updated quadrant bloom: strength=${strength}, radius=${radius}, threshold=${threshold}`);
    }
    
    /**
     * Dispose quadrant composers (cleanup)
     */
    disposeQuadrantComposers() {
        this.quadrantComposers.forEach(c => c.dispose?.());
        this.quadrantComposers = [];
        console.log('🗑️  Quadrant composers disposed');
    }
}