import * as THREE from 'three';

export class RenderManager {
    constructor(canvas) {
        if (!canvas) {
            console.error('❌ No canvas provided to RenderManager!');
            return;
        }
        
        this.canvas = canvas;
        this.resizeCallbacks = [];
        this.viewMode = 'quadrant'; // 'quadrant' or 'single'
        
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
    
    renderQuadrants(scene, cameras) {
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
        
        // Render each quadrant
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
            
            // Render scene
            this.renderer.render(scene, camera);
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
        
        // Render
        this.renderer.render(scene, camera);
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
}