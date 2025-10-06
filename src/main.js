import { PepperGhostApp } from './apps/PepperGhostApp.js';

// Initialize application
function initApp() {
    console.log('🚀 Pepper Ghost Effect - Four Quadrant 3D Viewer');
    console.log('⌨️  Controls: Space = Pause/Resume, R = Reset');
    console.log('💡 Brightness control: window.app.setBrightness(value) - range: 0.5 to 3.0');
    
    try {
        window.app = new PepperGhostApp();
    } catch (error) {
        console.error('❌ Failed to initialize app:', error);
    }
}

// Ensure DOM is loaded before initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    // DOM already loaded
    initApp();
}