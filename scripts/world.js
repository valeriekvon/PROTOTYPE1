function computeTopBar() {
    topBarH = constrain(round(windowHeight * UI.topBarRatio), UI.topBarMin, UI.topBarMax);
  }
  
  function computeTransform() {
    const availW = windowWidth;
    const availH = Math.max(100, windowHeight - topBarH);
    const sx = availW / baseWidth;
    const sy = availH / baseHeight;
    scaleFactor = Math.min(sx, sy);
  
    const worldW = baseWidth * scaleFactor;
    const worldH = baseHeight * scaleFactor;
    worldOffsetX = (availW - worldW) * 0.5;
    worldOffsetY = topBarH + (availH - worldH) * 0.5;
  }
  
  function screenToWorld(px, py) {
    return { x: (px - worldOffsetX) / scaleFactor, y: (py - worldOffsetY) / scaleFactor };
  }
  