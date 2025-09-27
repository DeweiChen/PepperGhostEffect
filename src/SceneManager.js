import * as THREE from 'three';

export class SceneManager {
    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x222222);  // Dark gray instead of pure black
        
        this.currentMesh = null;
        this.setupLighting();
    }
    
    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        // Directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        this.scene.add(directionalLight);
        
        // Fill light
        const fillLight = new THREE.DirectionalLight(0x4444ff, 0.3);
        fillLight.position.set(-5, -5, -5);
        this.scene.add(fillLight);
    }
    
    createGeometry(type) {
        const geometries = {
            torusKnot: new THREE.TorusKnotGeometry(0.8, 0.3, 100, 16),
            sphere: new THREE.SphereGeometry(1.2, 32, 16),
            cube: new THREE.BoxGeometry(2, 2, 2),
            dodecahedron: new THREE.DodecahedronGeometry(1.2, 0)
        };
        
        console.log(`📐 Creating ${type} geometry`);
        return geometries[type] || geometries.torusKnot;
    }
    
    updateMesh(geometryType) {
        console.log(`🔄 Updating mesh to: ${geometryType}`);
        
        // Remove old object
        if (this.currentMesh) {
            this.scene.remove(this.currentMesh);
            this.currentMesh.geometry.dispose();
            this.currentMesh.material.dispose();
            console.log('🗑️  Old mesh removed');
        }
        
        // Create new object
        const geometry = this.createGeometry(geometryType);
        const material = new THREE.MeshStandardMaterial({
            metalness: 0.1,
            roughness: 0.4,
            color: 0x00ff88  // Bright green for testing
        });
        
        this.currentMesh = new THREE.Mesh(geometry, material);
        this.scene.add(this.currentMesh);
        
        console.log('✅ New mesh created and added to scene');
        return this.currentMesh;
    }
    
    getMesh() {
        return this.currentMesh;
    }
    
    getScene() {
        return this.scene;
    }
}