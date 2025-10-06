import * as THREE from 'three';

export class CameraManager {
    constructor() {
        this.cameras = [];
        this.singleCamera = null;
        this.distance = 3.5;
        this.setupCameras();
        this.setupSingleCamera();
    }
    
    setupCameras() {
        this.cameras = [];
        
        // Four views: back (top viewport), front (bottom viewport), left, right
        const cameraConfigs = [
            { name: 'Back',   position: [0, 0, this.distance],          up: [0, 1, 0] },   // Back view (top viewport)
            { name: 'Front',  position: [0, 0, -this.distance],         up: [0, 1, 0] },   // Front view (bottom viewport)
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
        this.setupSingleCamera();
    }
    
    updateAspect(index, aspect) {
        if (this.cameras[index]) {
            this.cameras[index].aspect = aspect;
            this.cameras[index].updateProjectionMatrix();
        }
    }
    
    setupSingleCamera() {
        // Single forward-facing camera at horizontal level
        // Use larger distance for better view
        const singleViewDistance = this.distance * 1.7;
        this.singleCamera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
        this.singleCamera.position.set(0, 0, singleViewDistance);
        this.singleCamera.up.set(0, 1, 0);
        this.singleCamera.lookAt(0, 0, 0);
    }
    
    getCameras() {
        return this.cameras;
    }
    
    getSingleCamera() {
        return this.singleCamera;
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
        
        // Update single camera aspect
        if (this.singleCamera) {
            this.singleCamera.aspect = width / height;
            this.singleCamera.updateProjectionMatrix();
        }
    }
}