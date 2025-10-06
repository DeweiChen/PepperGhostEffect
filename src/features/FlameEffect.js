import * as THREE from 'three';
import { gsap } from 'gsap';

/**
 * FlameEffect - Candle Flame Particle System
 * 
 * High-performance particle effect using Three.js Points
 * - 80 particles, floating upward
 * - Orange-yellow gradient
 * - Support for extinguish/relight animations
 */
export class FlameEffect {
    constructor(options = {}) {
        // Flame is positioned at (0,0,0) in local space
        // It will be added as a child of the cake mesh
        
        // Configuration parameters
        this.particleCount = options.particleCount || 80;
        this.flameHeight = options.flameHeight || 0.4;
        this.flameRadius = options.flameRadius || 0.08;
        this.particleSpeed = options.particleSpeed || 0.015;
        this.initialParticleSpeed = this.particleSpeed; // Save original speed for relight
        
        // State
        this.isBurning = true;
        this.time = 0;
        this.windForce = { x: 0, y: 0, z: 0 }; // Wind force for blow-out effect (from above)
        
        // Create particle system
        this.createParticleSystem();
    }
    
    createParticleSystem() {
        const particleCount = this.particleCount;
        
        // Geometry
        this.geometry = new THREE.BufferGeometry();
        
        // Particle attribute arrays
        this.positions = new Float32Array(particleCount * 3);
        this.velocities = new Float32Array(particleCount * 3);
        this.lifetimes = new Float32Array(particleCount);
        this.colors = new Float32Array(particleCount * 3);
        this.sizes = new Float32Array(particleCount);
        this.initialData = new Float32Array(particleCount * 3); // Store initial positions for reset
        
        // Initialize each particle
        for (let i = 0; i < particleCount; i++) {
            this.resetParticle(i);
        }
        
        // Set geometry attributes
        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
        this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
        
        // Create soft circular particle texture for realistic flame look
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        // Draw radial gradient (soft glowing circle)
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.9)');
        gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.6)');
        gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.2)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);
        
        const particleTexture = new THREE.CanvasTexture(canvas);
        
        // Material - Realistic candle flame settings
        this.material = new THREE.PointsMaterial({
            size: 0.1,  // Smaller base size to look good at closer distances
            map: particleTexture,  // Soft circular texture
            vertexColors: true,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            sizeAttenuation: true  // Enable distance-based scaling
        });
        
        // Create particle system at origin (0,0,0)
        this.particles = new THREE.Points(this.geometry, this.material);
        
        console.log('🔥 FlameEffect created with', particleCount, 'particles');
    }
    
    /**
     * Reset a single particle to initial state
     */
    resetParticle(i) {
        const i3 = i * 3;
        
        // Initial position - Candle flame shape (narrow at base)
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.pow(Math.random(), 2) * this.flameRadius * 0.5; // Strongly concentrate at center
        
        this.positions[i3] = Math.cos(angle) * radius;
        this.positions[i3 + 1] = Math.random() * 0.01; // Start very close to base
        this.positions[i3 + 2] = Math.sin(angle) * radius;
        
        // Save initial position
        this.initialData[i3] = this.positions[i3];
        this.initialData[i3 + 1] = this.positions[i3 + 1];
        this.initialData[i3 + 2] = this.positions[i3 + 2];
        
        // Velocity - Gentle upward float with subtle horizontal drift
        this.velocities[i3] = (Math.random() - 0.5) * 0.003;
        this.velocities[i3 + 1] = this.particleSpeed + Math.random() * 0.005;
        this.velocities[i3 + 2] = (Math.random() - 0.5) * 0.003;
        
        // Lifetime - Random starting phase
        this.lifetimes[i] = Math.random();
        
        // Color - Deep orange-red at base (realistic candle flame)
        const colorVariation = Math.random();
        this.colors[i3] = 1.0;                              // R: Full red
        this.colors[i3 + 1] = 0.25 + colorVariation * 0.35; // G: Deep orange
        this.colors[i3 + 2] = 0.0;                          // B: No blue at base
        
        // Size - Moderate variation
        this.sizes[i] = 0.8 + Math.random() * 0.6;
    }
    
    /**
     * Update particle system (called every frame)
     */
    update(deltaTime = 0.016) {
        this.time += deltaTime;
        
        const positions = this.geometry.attributes.position.array;
        const colors = this.geometry.attributes.color.array;
        
        for (let i = 0; i < this.particleCount; i++) {
            const i3 = i * 3;
            
            // Update lifetime - slower cycle to reduce flicker
            // Lower value = longer lifetime = taller flame
            this.lifetimes[i] += deltaTime * 0.5;  // Adjustable: 0.3-0.7
            
            // Respawn particle after death (only when burning)
            if (this.lifetimes[i] > 1.0 && this.isBurning) {
                this.resetParticle(i);
            }
            
            // Update position
            positions[i3] += this.velocities[i3];
            positions[i3 + 1] += this.velocities[i3 + 1];
            positions[i3 + 2] += this.velocities[i3 + 2];
            
            // Gentle sine wave motion for natural flame sway (stronger when extinguishing)
            const wobbleStrength = this.isBurning ? 0.002 : 0.02;
            const wobbleStrength2 = this.isBurning ? 0.0015 : 0.015;
            const wobble = Math.sin(this.time * 3.5 + i * 0.2) * wobbleStrength;
            const wobble2 = Math.cos(this.time * 4 + i * 0.15) * wobbleStrength2;
            positions[i3] += wobble + this.windForce.x;
            positions[i3 + 1] += this.windForce.y; // Apply downward wind force
            positions[i3 + 2] += wobble2 + this.windForce.z;
            
            // Height ratio for color gradient
            const heightRatio = Math.min(1.0, positions[i3 + 1] / this.flameHeight);
            
            // Realistic candle flame gradient:
            // Bottom: Deep orange (1.0, 0.25, 0.0)
            // Middle: Bright yellow (1.0, 0.8, 0.0)
            // Top: Pale yellow-white (1.0, 1.0, 0.3)
            colors[i3 + 1] = 0.25 + heightRatio * 0.75; // Orange -> Yellow -> White
            colors[i3 + 2] = heightRatio * 0.3; // Add warmth at top
        }
        
        // Mark as needing update
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.color.needsUpdate = true;
    }
    
    /**
     * Extinguish flame (fade out animation)
     */
    extinguish(duration = 0.8) {
        if (!this.isBurning) {
            console.log('🔥 Flame already extinguished');
            return;
        }
        
        console.log('💨 Extinguishing flame...');
        this.isBurning = false;
        
        // Simulate blowing from above - downward wind with slight horizontal scatter
        const horizontalAngle = Math.random() * Math.PI * 2;
        const horizontalStrength = 0.02 + Math.random() * 0.015; // Random horizontal component
        
        gsap.to(this.windForce, {
            x: Math.cos(horizontalAngle) * horizontalStrength,
            y: -0.04, // Strong downward force (like blowing from above)
            z: Math.sin(horizontalAngle) * horizontalStrength,
            duration: duration * 0.8,
            ease: 'power1.out'
        });
        
        // Remove upward buoyancy (particles lose lift)
        for (let i = 0; i < this.particleCount; i++) {
            const i3 = i * 3;
            gsap.to(this.velocities, {
                [i3 + 1]: 0,
                duration: duration * 0.6,
                ease: 'power2.out'
            });
        }
        
        // Use GSAP for fade out animation
        gsap.to(this.material, {
            opacity: 0,
            duration: duration,
            ease: 'power2.out',
            onComplete: () => {
                console.log('✅ Flame extinguished');
            }
        });
        
        // Gradually reduce particle speed (simulate being blown out)
        gsap.to(this, {
            particleSpeed: 0,
            duration: duration * 0.5,
            ease: 'power2.out'
        });
    }
    
    /**
     * Relight the flame
     */
    relight(duration = 0.5) {
        if (this.isBurning) {
            console.log('🔥 Flame already burning');
            return;
        }
        
        console.log('🔥 Relighting flame...');
        this.isBurning = true;
        
        // Reset wind force
        this.windForce.x = 0;
        this.windForce.y = 0;
        this.windForce.z = 0;
        
        // Reset all particles
        for (let i = 0; i < this.particleCount; i++) {
            this.resetParticle(i);
        }
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.color.needsUpdate = true;
        
        // Restore original speed
        this.particleSpeed = this.initialParticleSpeed;
        
        // Fade in animation
        gsap.to(this.material, {
            opacity: 0.9,
            duration: duration,
            ease: 'power2.in',
            onComplete: () => {
                console.log('✅ Flame relit');
            }
        });
    }
    
    /**
     * Toggle burning state
     */
    toggle() {
        if (this.isBurning) {
            this.extinguish();
        } else {
            this.relight();
        }
    }
    
    /**
     * Get particle system object (add to scene)
     */
    getParticleSystem() {
        return this.particles;
    }
    
    /**
     * Adjust particle size based on view mode
     */
    setParticleSize(size) {
        if (this.material) {
            this.material.size = size;
            console.log('🔥 Flame particle size updated to:', size);
        }
    }
    
    /**
     * Dispose resources
     */
    dispose() {
        this.geometry.dispose();
        this.material.dispose();
        console.log('🗑️  FlameEffect disposed');
    }
}
