import * as THREE from 'three';

export class CameraManager {
    constructor() {
        this.cameras = [];
        this.distance = 3.5;
        this.setupCameras();
    }
    
    setupCameras() {
        this.cameras = [];
        
        // Four views: top, bottom, left, right
        const cameraConfigs = [
            { name: 'Top',    position: [0, this.distance, 0],           up: [0, 0, -1] },  // Top view
            { name: 'Bottom', position: [0, -this.distance, 0],          up: [0, 0, 1] },   // Bottom view
            { name: 'Left',   position: [-this.distance, 0, 0],         up: [0, 1, 0] },   // Left view
            { name: 'Right',  position: [this.distance, 0, 0],          up: [0, 1, 0] }    // Right view
        ];
        
        for (let i = 0; i < 4; i++) {
            const config = cameraConfigs[i];
            const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
            
            camera.position.set(...config.position);
            camera.up.set(...config.up);
            camera.lookAt(0, 0, 0);
            
            this.cameras.push(camera);
        }
    }
    
    updateDistance(distance) {
        this.distance = distance;
        this.setupCameras();
    }
    
    updateAspect(index, aspect) {
        if (this.cameras[index]) {
            this.cameras[index].aspect = aspect;
            this.cameras[index].updateProjectionMatrix();
        }
    }
    
    getCameras() {
        return this.cameras;
    }
    
    getCamera(index) {
        return this.cameras[index];
    }
    
    // Handle window resize - update all camera aspects
    handleResize(width, height) {
        // Update camera aspect ratios based on new viewport calculations
        // Using same logic as RenderManager for consistency
        const viewSize = Math.min(width, height) / 4;  // 25% of smaller dimension
        
        // All viewports are square, so aspect ratio is always 1
        const aspectRatio = 1.0;
        
        this.cameras.forEach(camera => {
            camera.aspect = aspectRatio;
            camera.updateProjectionMatrix();
        });
    }
}