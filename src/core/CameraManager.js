import * as THREE from 'three';

export class CameraManager {
    constructor() {
        this.cameras = [];
        this.singleCamera = null;
        this.distance = 3.5;
        this.lookAtTarget = new THREE.Vector3(0, 0, 0); // Camera target point
        
        // User camera state for Single View (persistent across view changes)
        this.userCameraState = {
            pitch: 20,     // Vertical angle in degrees (-30° to 60°) - 20° downward angle
            yaw: 0,        // Horizontal angle in degrees (unlimited)
            distance: 3.5  // Distance from origin
        };
        
        this.setupCameras();
        this.setupSingleCamera();
    }
    
    setupCameras() {
        this.cameras = [];
        
        // Four views: back (top viewport), front (bottom viewport), left, right
        // Apply user's pitch angle to all four directions
        const pitch = this.userCameraState.pitch;
        const pitchRad = THREE.MathUtils.degToRad(pitch);
        
        const cameraConfigs = [
            { name: 'Back',  yaw: 0,   roll: 0 },     // Top: correct ✅
            { name: 'Front', yaw: 180, roll: 180 },   // Bottom: rotate output 180°
            { name: 'Left',  yaw: 90,  roll: -90 },   // Left: rotate output -90° (left)
            { name: 'Right', yaw: 270, roll: 90 }     // Right: rotate output 90° (right)
        ];
        
        for (let i = 0; i < 4; i++) {
            const config = cameraConfigs[i];
            const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
            
            // Calculate position using spherical coordinates with user's pitch
            const yawRad = THREE.MathUtils.degToRad(config.yaw);
            camera.position.x = this.lookAtTarget.x + this.distance * Math.sin(yawRad) * Math.cos(pitchRad);
            camera.position.y = this.lookAtTarget.y + this.distance * Math.sin(pitchRad);
            camera.position.z = this.lookAtTarget.z + this.distance * Math.cos(yawRad) * Math.cos(pitchRad);
            
            camera.up.set(0, 1, 0);
            camera.lookAt(this.lookAtTarget);
            
            // Apply roll rotation to the output image (rotate along view axis)
            if (config.roll !== 0) {
                const rollRad = THREE.MathUtils.degToRad(config.roll);
                camera.rotateZ(rollRad);
            }
            
            this.cameras.push(camera);
        }
    }
    
    updateDistance(distance) {
        this.distance = distance;
        this.userCameraState.distance = distance;
        this.setupCameras();
        this.updateSingleCameraFromState();
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
        this.userCameraState.distance = singleViewDistance;
        
        this.singleCamera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
        this.singleCamera.up.set(0, 1, 0);
        
        // Initialize from state
        this.updateSingleCameraFromState();
    }
    
    updateSingleCameraFromState() {
        if (!this.singleCamera) return;
        
        const { pitch, yaw, distance } = this.userCameraState;
        
        // Convert spherical coordinates (pitch, yaw) to Cartesian
        const pitchRad = THREE.MathUtils.degToRad(pitch);
        const yawRad = THREE.MathUtils.degToRad(yaw);
        
        // Calculate camera position on sphere
        this.singleCamera.position.x = this.lookAtTarget.x + distance * Math.sin(yawRad) * Math.cos(pitchRad);
        this.singleCamera.position.y = this.lookAtTarget.y + distance * Math.sin(pitchRad);
        this.singleCamera.position.z = this.lookAtTarget.z + distance * Math.cos(yawRad) * Math.cos(pitchRad);
        
        this.singleCamera.lookAt(this.lookAtTarget);
    }
    
    rotateSingleCamera(deltaYaw, deltaPitch) {
        // Apply rotation delta
        this.userCameraState.yaw += deltaYaw;
        this.userCameraState.pitch -= deltaPitch;  // Inverted Y-axis
        
        // Clamp pitch to range [-30°, 60°]
        this.userCameraState.pitch = Math.max(-30, Math.min(60, this.userCameraState.pitch));
        
        // Update camera position
        this.updateSingleCameraFromState();
        
        // Also update quadrant cameras to match pitch angle
        this.setupCameras();
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
    
    setLookAtTarget(target) {
        this.lookAtTarget.copy(target);
        this.setupCameras();
        this.updateSingleCameraFromState();
        console.log('🎯 Camera target updated to:', this.lookAtTarget);
    }
}