import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class SceneManager {
    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);  // Pure black for projection
        
        this.currentObject = null;
        this.gltfLoader = new GLTFLoader();
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
    
    _disposeObject(object) {
        // Recursively dispose all geometries and materials
        object.traverse((child) => {
            if (child.geometry) {
                child.geometry.dispose();
            }
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
    }
    
    _replaceObject(newObject) {
        // Remove old object
        if (this.currentObject) {
            this._disposeObject(this.currentObject);
            this.scene.remove(this.currentObject);
            console.log('🗑️  Old object removed');
        }
        
        // Add new object
        this.currentObject = newObject;
        this.scene.add(newObject);
        console.log('✅ New object added to scene');
    }
    
    normalizeModel(object) {
        // Calculate bounding box
        const box = new THREE.Box3().setFromObject(object);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        
        // Scale to fit in view (target size ~2 units)
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2 / maxDim;
        object.scale.setScalar(scale);
        
        // Center the model
        object.position.sub(center.multiplyScalar(scale));
        
        console.log(`📏 Model normalized: scale=${scale.toFixed(3)}, size=${maxDim.toFixed(2)}`);
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
        
        // Create new object
        const geometry = this.createGeometry(geometryType);
        const material = new THREE.MeshStandardMaterial({
            metalness: 0.1,
            roughness: 0.4,
            color: 0x00ff88  // Bright green for testing
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        this._replaceObject(mesh);
        
        return this.currentObject;
    }
    
    async loadModelFromURL(url) {
        console.log(`📥 Loading model from URL: ${url}`);
        
        return new Promise((resolve, reject) => {
            this.gltfLoader.load(
                url,
                (gltf) => {
                    console.log('✅ Model loaded successfully');
                    const model = gltf.scene;
                    this.normalizeModel(model);
                    this._replaceObject(model);
                    resolve(model);
                },
                (progress) => {
                    const percent = (progress.loaded / progress.total * 100).toFixed(1);
                    console.log(`⏳ Loading progress: ${percent}%`);
                },
                (error) => {
                    console.error('❌ Error loading model:', error);
                    reject(error);
                }
            );
        });
    }
    
    async loadModelFromFile(file) {
        console.log(`📂 Loading model from file: ${file.name}`);
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                const arrayBuffer = event.target.result;
                
                this.gltfLoader.parse(
                    arrayBuffer,
                    '',
                    (gltf) => {
                        console.log('✅ Model loaded successfully');
                        const model = gltf.scene;
                        this.normalizeModel(model);
                        this._replaceObject(model);
                        resolve(model);
                    },
                    (error) => {
                        console.error('❌ Error parsing model:', error);
                        reject(error);
                    }
                );
            };
            
            reader.onerror = (error) => {
                console.error('❌ Error reading file:', error);
                reject(error);
            };
            
            reader.readAsArrayBuffer(file);
        });
    }
    
    getMesh() {
        return this.currentObject;
    }
    
    getObject() {
        return this.currentObject;
    }
    
    getScene() {
        return this.scene;
    }
}