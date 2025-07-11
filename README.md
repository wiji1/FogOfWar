# Fog of War Simulator

A web-based fog of war simulator that allows you to explore maps by revealing them through interactive fog removal.

## Features

- **Multiple Image Support**: Upload multiple images to use as maps
- **Fog Reveal**: Click and drag to reveal parts of the map through the fog
- **Zoom & Pan**: 
  - Mouse wheel zoom towards cursor
  - Right-click or Ctrl+click to pan
  - Zoom controls with +/- buttons
- **Smart Fog Scaling**: Fog reveal radius adapts to zoom level for precision
- **Image Management**: Sidebar with thumbnails to switch between uploaded images
- **Persistent Fog States**: Each image maintains its own fog reveal progress

## Controls

- **Left Click + Drag**: Reveal fog and show the map underneath
- **Right Click + Drag**: Pan around the image
- **Ctrl + Click + Drag**: Alternative panning method
- **Mouse Wheel**: Zoom in/out towards mouse cursor
- **+ / - Buttons**: Zoom in/out towards center
- **☰ Button**: Toggle sidebar visibility

## How to Use

1. Open `index.html` in a web browser
2. Upload one or more images to use as maps
3. Click and drag to reveal parts of the map through the fog
4. Use zoom and pan controls to explore different areas
5. Switch between different maps using the sidebar thumbnails

## Technical Details

The project uses HTML5 Canvas for rendering, with separate fog and map layers. The fog system uses a base canvas for storing reveal data and applies zoom/pan transformations for display.

## Files Structure

- `index.html` - Main HTML structure
- `styles.css` - All styling and layout
- `script.js` - JavaScript functionality
- `package.json` - Project configuration

## Running the Project

Simply open `index.html` in a web browser, or use:

```bash
npm run serve  # Starts a local server on port 8000
npm start      # Opens the project in your default browser
```