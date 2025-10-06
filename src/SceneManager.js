import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

export class SceneManager {
    constructor(renderer = null) {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);  // Pure black for projection
        
        this.currentObject = null;
        this.gltfLoader = new GLTFLoader();
        this.rgbeLoader = new RGBELoader();
        this.renderer = renderer;
        this.environmentReady = false;
        
        // Lighting system state
        this.lightingMode = 'ibl'; // 'ibl' or 'legacy'
        this.envMap = null;
        this.legacyLights = [];
        
        // Setup IBL lighting asynchronously (default)
        this.setupLighting();
    }
    
    async setupLighting() {
        console.log('🌍 Setting up IBL (Image-Based Lighting)...');
        
        // Use a neutral studio HDRI for ModelViewer-style lighting
        // Using Three.js example HDRI from public CDN
        const hdriUrl = 'https://threejs.org/examples/textures/equirectangular/royal_esplanade_1k.hdr';
        
        try {
            const texture = await this.loadHDRI(hdriUrl);
            
            if (this.renderer) {
                const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
                pmremGenerator.compileEquirectangularShader();
                
                this.envMap = pmremGenerator.fromEquirectangular(texture).texture;
                
                // Set as scene environment for PBR reflections
                this.scene.environment = this.envMap;
                
                // Optional: use as background (commented out for black background)
                // this.scene.background = this.envMap;
                
                texture.dispose();
                pmremGenerator.dispose();
                
                this.environmentReady = true;
                this.lightingMode = 'ibl';
                console.log('✅ IBL environment ready');
            } else {
                console.warn('⚠️  No renderer provided, using legacy lighting');
                this.setupLegacyLighting();
            }
        } catch (error) {
            console.error('❌ Failed to load HDRI, using legacy lighting:', error);
            this.setupLegacyLighting();
        }
    }
    
    loadHDRI(url) {
        return new Promise((resolve, reject) => {
            this.rgbeLoader.load(
                url,
                (texture) => {
                    texture.mapping = THREE.EquirectangularReflectionMapping;
                    resolve(texture);
                },
                undefined,
                reject
            );
        });
    }
    
    setupLegacyLighting() {
        // Legacy simple lighting system (old version)
        console.log('🔦 Using legacy lighting');
        
        // Clear any existing legacy lights
        this.clearLegacyLights();
        
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        const fillLight = new THREE.DirectionalLight(0x4444ff, 0.3);
        fillLight.position.set(-5, -5, -5);
        
        this.scene.add(ambientLight);
        this.scene.add(directionalLight);
        this.scene.add(fillLight);
        
        this.legacyLights = [ambientLight, directionalLight, fillLight];
        this.lightingMode = 'legacy';
        this.environmentReady = true;
    }
    
    clearLegacyLights() {
        // Remove all legacy lights from scene
        this.legacyLights.forEach(light => {
            this.scene.remove(light);
            if (light.dispose) light.dispose();
        });
        this.legacyLights = [];
    }
    
    toggleLightingMode() {
        if (this.lightingMode === 'ibl') {
            // Switch to legacy
            console.log('🔄 Switching to Legacy Lighting');
            this.scene.environment = null;
            this.setupLegacyLighting();
            return 'legacy';
        } else {
            // Switch to IBL
            console.log('🔄 Switching to IBL Lighting');
            this.clearLegacyLights();
            if (this.envMap) {
                this.scene.environment = this.envMap;
                this.lightingMode = 'ibl';
            } else {
                console.warn('⚠️  IBL not loaded, staying in legacy mode');
            }
            return this.lightingMode;
        }
    }
    
    getLightingMode() {
        return this.lightingMode;
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
            metalness: 0.3,
            roughness: 0.4,
            color: 0x00ff88,  // Bright green for testing
            envMapIntensity: 1.0  // Full environment reflection
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