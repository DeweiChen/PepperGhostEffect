import * as THREE from 'three';

export class RenderManager {
    constructor(canvas) {
        if (!canvas) {
            console.error('❌ No canvas provided to RenderManager!');
            return;
        }
        
        this.canvas = canvas;
        this.resizeCallbacks = [];
        
        this.renderer = new THREE.WebGLRenderer({ 
            canvas, 
            antialias: true,
            alpha: true
        });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setScissorTest(true);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
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
        
        // Use smaller dimension to ensure viewports fit on screen
        viewSize = Math.min(w, h) / 4;  // 25% of smaller dimension for better centering
        
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
    
    getRenderer() {
        return this.renderer;
    }
}