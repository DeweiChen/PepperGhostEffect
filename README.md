# Pepper Ghost Effect - Four Quadrant 3D Viewer

A interactive 3D viewer that displays objects from four different angles simultaneously, inspired by the **Pepper's Ghost** optical illusion technique.

## 🚀 Live Demo

[View Live Demo](https://yourusername.github.io/PepperGhostEffect/)

## ✨ Features

- **Four-Quadrant View**: Simultaneous display of Top, Bottom, Left, and Right orthographic perspectives
- **Interactive Controls**: 
  - Shape selection (Torus Knot, Sphere, Cube, Dodecahedron)
  - Rotation speed adjustment
  - Camera distance control
- **Keyboard Shortcuts**: 
  - `Space`: Pause/Resume animation
  - `R`: Reset to defaults
- **Responsive Design**: Automatically adapts to different screen sizes
- **Smooth Animation**: 60fps rendering with optimized performance

## 🛠️ Built With

- **Three.js** - 3D graphics library
- **Vite** - Modern build tool
- **Vanilla JavaScript** - No unnecessary framework overhead
- **GitHub Pages** - Static site hosting

## 🏃‍♂️ Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/PepperGhostEffect.git
cd PepperGhostEffect

# Install dependencies
npm install

# Start development server
npm run dev
```

### Build for Production

```bash
# Build the project
npm run build

# Preview the build
npm run preview

# Deploy to GitHub Pages
npm run deploy
```

## 📁 Project Structure

```
PepperGhostEffect/
├── index.html              # Main HTML file
├── src/
│   ├── main.js             # Application entry point
│   ├── SceneManager.js     # 3D scene and object management
│   ├── CameraManager.js    # Multi-camera system
│   └── RenderManager.js    # Rendering and viewport management
├── package.json
├── vite.config.js
└── .github/
    └── workflows/
        └── deploy.yml      # Auto-deployment configuration
```

## 🎯 Core Concepts

### The Pepper's Ghost Effect
This project digitally recreates the famous **Pepper's Ghost** illusion, where multiple views of an object are displayed simultaneously. Instead of using mirrors and theatrical lighting, we use:

- **Four cameras** positioned at 90° intervals around the object
- **Viewport splitting** to divide the screen into quadrants  
- **Synchronized rendering** to maintain smooth performance

### Technical Implementation
- **Modular Architecture**: Separated concerns with dedicated managers
- **Efficient Rendering**: Single render loop with scissor testing
- **Memory Management**: Proper geometry and material disposal
- **Performance Optimization**: RequestAnimationFrame with viewport culling

## 🔧 Customization

### Adding New Shapes
Edit `SceneManager.js` and add to the `createGeometry` method:

```javascript
const geometries = {
    // existing shapes...
    myShape: new THREE.MyGeometry(params),
};
```

### Modifying Camera Angles
Edit `CameraManager.js` to change the viewing angles:

```javascript
// Change from 90° intervals to custom angles
camera.rotateY(THREE.MathUtils.degToRad(customAngle * i));
```

## 📊 Performance

- **Target**: 60 FPS on modern devices
- **Optimization**: Viewport culling, efficient material usage
- **Memory**: Automatic cleanup of disposed geometries
- **Responsive**: Scales with device pixel ratio

## 🤝 Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by the classic **Pepper's Ghost** theatrical illusion
- Built with the amazing **Three.js** community
- Powered by **Vite's** lightning-fast development experience

---

**🎭 "Technology is best when it brings people together."** - This project demonstrates how classic optical illusions can inspire modern web experiences.