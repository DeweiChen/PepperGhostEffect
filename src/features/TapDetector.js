/**
 * TapDetector - Detects tap gestures and long press via device motion sensors and pointer events
 * 
 * Monitors accelerometer data to detect physical taps on the surface
 * where the device is placed (e.g., tablet on a table) and also detects
 * direct pointer events on the screen (mouse, touch, pen).
 * 
 * Supports two gesture types:
 * 1. Required-tap: Multiple taps within a time window (configurable count)
 * 2. Long-press: Holding pointer down for 5 seconds
 * 
 * Usage:
 *   const canvas = renderer.domElement;
 *   const detector = new TapDetector({ targetElement: canvas });
 *   await detector.requestPermission(); // Required for iOS
 *   detector.start();
 *   detector.on('required-tap', () => console.log('Required taps detected!'));
 *   detector.on('long-press', () => console.log('Long press detected!'));
 */
export class TapDetector {
    constructor(options = {}) {
        // Configuration
        this.config = {
            threshold: options.threshold || 3,         // Acceleration delta threshold (lowered for sensitivity)
            tapWindow: options.tapWindow || 600,       // Max time between taps (ms)
            cooldown: options.cooldown || 300,         // Min time between taps (ms)
            requiredTaps: options.requiredTaps || 3,   // Number of taps to detect
            longPressDuration: options.longPressDuration || 5000, // Long press duration (ms)
            debugMode: options.debugMode !== false     // Enable debug logging by default
        };
        
        // Target elements for event binding
        this.targetElement = options.targetElement || document;  // Pointer events target
        
        // Tap state
        this.tapTimestamps = [];                       // Recent tap timestamps
        this.lastTapTime = 0;                          // Last detected tap time
        
        // Long press state
        this.longPressState = {
            startTime: null,                           // Long press start timestamp
            pointerId: null,                           // Pointer ID tracking
            timer: null,                               // Timeout timer
            isActive: false,                           // Long press in progress
            startPosition: null                        // Initial pointer position
        };
        
        // Detection state
        this.isActive = false;                         // Detection active flag
        this.listeners = {};                           // Event listeners
        
        // Baseline calibration
        this.baselineMagnitude = null;                 // Baseline acceleration (with gravity)
        this.calibrationSamples = [];                  // Samples for calibration
        this.isCalibrated = false;                     // Calibration status
        
        // Bind methods
        this.handleMotion = this.handleMotion.bind(this);
        this.handlePointer = this.handlePointer.bind(this);
        this.handlePointerUp = this.handlePointerUp.bind(this);
        this.handlePointerCancel = this.handlePointerCancel.bind(this);
    }
    
    /**
     * Request device motion permission (required for iOS 13+)
     * @returns {Promise<boolean>} - Permission granted
     */
    async requestPermission() {
        // Check if permission API exists (iOS 13+)
        if (typeof DeviceMotionEvent !== 'undefined' && 
            typeof DeviceMotionEvent.requestPermission === 'function') {
            try {
                const permission = await DeviceMotionEvent.requestPermission();
                const granted = permission === 'granted';
                console.log(`📱 DeviceMotion permission: ${permission}`);
                return granted;
            } catch (error) {
                console.error('❌ Permission request failed:', error);
                return false;
            }
        }
        
        // Non-iOS or older iOS - no permission needed
        console.log('✅ DeviceMotion API available (no permission required)');
        return true;
    }
    
    /**
     * Start listening for device motion and touch events
     */
    start() {
        if (this.isActive) {
            console.warn('⚠️ TapDetector already active');
            return;
        }
        
        if (typeof DeviceMotionEvent === 'undefined') {
            console.error('❌ DeviceMotion API not supported');
            return;
        }
        
        window.addEventListener('devicemotion', this.handleMotion);
        this.targetElement.addEventListener('pointerdown', this.handlePointer);
        this.targetElement.addEventListener('pointerup', this.handlePointerUp);
        this.targetElement.addEventListener('pointercancel', this.handlePointerCancel);
        this.isActive = true;
        console.log('🎯 TapDetector started');
        console.log(`   Threshold: ${this.config.threshold} (delta from baseline)`);
        console.log(`   Tap window: ${this.config.tapWindow}ms`);
        console.log(`   Required taps: ${this.config.requiredTaps}`);
        console.log(`   Long press: ${this.config.longPressDuration}ms`);
        console.log(`   🔍 Calibrating baseline... (please keep device still)`);
    }
    
    /**
     * Stop listening for device motion and pointer events
     */
    stop() {
        window.removeEventListener('devicemotion', this.handleMotion);
        this.targetElement.removeEventListener('pointerdown', this.handlePointer);
        this.targetElement.removeEventListener('pointerup', this.handlePointerUp);
        this.targetElement.removeEventListener('pointercancel', this.handlePointerCancel);
        this.clearLongPress();
        this.isActive = false;
        this.tapTimestamps = [];
        this.isCalibrated = false;
        this.calibrationSamples = [];
        console.log('⏹️ TapDetector stopped');
    }
    
    /**
     * Recalibrate baseline (call if device moved or sensitivity changed)
     */
    recalibrate() {
        this.isCalibrated = false;
        this.calibrationSamples = [];
        this.baselineMagnitude = null;
        console.log('🔄 Recalibrating... (keep device still)');
    }
    
    /**
     * Record a tap from any input source
     * @param {string} source - Source of the tap ('motion' or 'touch')
     * @returns {boolean} - Whether the tap was recorded
     */
    recordTap(source) {
        const now = Date.now();
        
        // Check cooldown period
        if (now - this.lastTapTime < this.config.cooldown) {
            if (this.config.debugMode) {
                console.log(`⏳ Cooldown active: ${now - this.lastTapTime}ms since last tap`);
            }
            return false;
        }
        
        // Clean up expired timestamps
        this.tapTimestamps = this.tapTimestamps.filter(
            time => now - time < this.config.tapWindow
        );
        
        // Record new tap
        this.lastTapTime = now;
        this.tapTimestamps.push(now);
        
        console.log(`👆 TAP from ${source}! (${this.tapTimestamps.length}/${this.config.requiredTaps})`);
        
        // Check if we have enough taps for required-tap event
        if (this.tapTimestamps.length >= this.config.requiredTaps) {
            this.handleRequiredTap();
        }
        
        return true;
    }
    
    /**
     * Handle device motion event
     * @param {DeviceMotionEvent} event
     */
    handleMotion(event) {
        const acc = event.accelerationIncludingGravity;
        
        // Check if acceleration data is available
        if (!acc || acc.x === null || acc.y === null || acc.z === null) {
            if (this.config.debugMode) {
                console.warn('⚠️ No acceleration data available');
            }
            return;
        }
        
        // Calculate acceleration magnitude (vector length)
        const magnitude = Math.sqrt(
            acc.x * acc.x + 
            acc.y * acc.y + 
            acc.z * acc.z
        );
        
        // Calibration phase: collect baseline samples
        if (!this.isCalibrated) {
            this.calibrationSamples.push(magnitude);
            
            if (this.calibrationSamples.length >= 10) {
                // Calculate average baseline
                this.baselineMagnitude = this.calibrationSamples.reduce((a, b) => a + b, 0) / this.calibrationSamples.length;
                this.isCalibrated = true;
                console.log(`✅ Calibration complete! Baseline: ${this.baselineMagnitude.toFixed(2)} m/s²`);
                console.log(`   (This includes Earth's gravity ~9.8 m/s²)`);
                console.log(`   👆 Ready to detect taps! Tap the table now...`);
            }
            return;
        }
        
        // Calculate delta from baseline
        const delta = Math.abs(magnitude - this.baselineMagnitude);
        
        // Debug: Log every significant change
        if (this.config.debugMode && delta > this.config.threshold * 0.3) {
            console.log(`📊 Motion: magnitude=${magnitude.toFixed(2)}, baseline=${this.baselineMagnitude.toFixed(2)}, delta=${delta.toFixed(2)}`);
        }
        
        // Check if delta exceeds threshold
        if (delta > this.config.threshold) {
            this.recordTap('motion');
        }
    }
    
    /**
     * Handle pointer down event (mouse, touch, pen)
     * Starts both tap detection and long press timer
     * @param {PointerEvent} event
     */
    handlePointer(event) {
        const pointerType = event.pointerType || 'unknown';
        
        // Record tap from pointer source
        this.recordTap(`pointer:${pointerType}`);
        
        // Start long press detection
        this.startLongPress(event);
    }
    
    /**
     * Handle pointer up event - completes or cancels long press
     * @param {PointerEvent} event
     */
    handlePointerUp(event) {
        // Clear long press if it matches the tracked pointer
        if (this.longPressState.isActive && 
            this.longPressState.pointerId === event.pointerId) {
            this.clearLongPress();
        }
    }
    
    /**
     * Handle pointer cancel event - cancels long press
     * @param {PointerEvent} event
     */
    handlePointerCancel(event) {
        // Clear long press if it matches the tracked pointer
        if (this.longPressState.isActive && 
            this.longPressState.pointerId === event.pointerId) {
            this.clearLongPress();
        }
    }
    
    /**
     * Start long press detection
     * @param {PointerEvent} event
     */
    startLongPress(event) {
        // Clear any existing long press
        this.clearLongPress();
        
        const now = Date.now();
        
        this.longPressState = {
            startTime: now,
            pointerId: event.pointerId,
            isActive: true,
            startPosition: { x: event.clientX, y: event.clientY },
            timer: setTimeout(() => {
                this.handleLongPress();
            }, this.config.longPressDuration)
        };
        
        if (this.config.debugMode) {
            console.log(`👇 Long press started (${this.config.longPressDuration}ms)...`);
        }
    }
    
    /**
     * Clear long press state and timer
     */
    clearLongPress() {
        if (this.longPressState.timer) {
            clearTimeout(this.longPressState.timer);
            
            if (this.config.debugMode && this.longPressState.isActive) {
                const duration = Date.now() - this.longPressState.startTime;
                console.log(`👆 Long press cancelled (${duration}ms)`);
            }
        }
        
        this.longPressState = {
            startTime: null,
            pointerId: null,
            timer: null,
            isActive: false,
            startPosition: null
        };
    }
    
    /**
     * Handle long press detection
     */
    handleLongPress() {
        console.log('⏱️ LONG PRESS DETECTED!');
        
        // Clear state
        this.longPressState.isActive = false;
        
        // Emit event
        this.emit('long-press');
    }
    
    /**
     * Handle required-tap detection
     */
    handleRequiredTap() {
        console.log('🎉 REQUIRED-TAP DETECTED!');
        
        // Clear timestamps to avoid repeated triggers
        this.tapTimestamps = [];
        
        // Emit event
        this.emit('required-tap');
    }
    
    /**
     * Register event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }
    
    /**
     * Unregister event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    off(event, callback) {
        if (!this.listeners[event]) return;
        
        this.listeners[event] = this.listeners[event].filter(
            cb => cb !== callback
        );
    }
    
    /**
     * Emit event to all listeners
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data) {
        if (!this.listeners[event]) return;
        
        this.listeners[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`❌ Error in ${event} listener:`, error);
            }
        });
    }
    
    /**
     * Get current detector status
     * @returns {Object} - Status information
     */
    getStatus() {
        return {
            isActive: this.isActive,
            config: this.config,
            recentTaps: this.tapTimestamps.length,
            lastTapTime: this.lastTapTime
        };
    }
    
    /**
     * Update configuration
     * @param {Object} newConfig - New configuration options
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('⚙️ TapDetector config updated:', this.config);
    }
}
