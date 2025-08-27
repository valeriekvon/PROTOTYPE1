function drawTopBar() {  
    const padX = 10, padY = 2, contentW = width - padX * 2;
   
    textAlign(LEFT, TOP);
  
    if (mode === "select") {
      
      textSize(UI.fontTitle);
      noStroke(); 
      fill(COLORS.blue); 
      text("Pick up to 3 tags", padX, padY, contentW);
  
      textSize(UI.fontBody);
      const bodyY = padY + (UI.fontTitle + 8);
      const bodyH = topBarH - bodyY - 16;
      const picked = selected.map(s => s.label).join(", ") || "—";
      text(`Drag floating tags into the zone below, then hit Play.\nSelected: ${picked}`, padX, bodyY, contentW, Math.max(0, bodyH));
    } else {
      
    fill(COLORS.blue); 
    rect(0, 0, width, topBarH);
      const node = activeNode || centerNode;
      fill(255); 
      textSize(UI.fontTitle);
      text(node.title || node.label || "—", padX, padY, contentW);
  
      textSize(UI.fontBody);
      const desc = node.info?.desc || "Click a node to view details.";
      const bodyY = padY + (UI.fontTitle + 8);
      const bodyH = topBarH - bodyY - 50;
      text(desc, padX, bodyY, contentW, Math.max(0, bodyH));
  
      const rowH = 18;
      const y0 = topBarH - rowH * 2 - 10;
      stroke(255, 180); strokeWeight(1);
      line(padX, y0 - 6, width - padX, y0 - 6);
  
      noStroke(); fill(255); textSize(12);
      textAlign(LEFT, CENTER); text("TAGS", padX, y0);
      textAlign(RIGHT, CENTER); text(node.tags?.join(", ") || "—", width - padX, y0);
  
      const y1 = y0 + rowH;
      stroke(255, 180); line(padX, y1 - 6, width - padX, y1 - 6);
      noStroke(); fill(255);
      textAlign(LEFT, CENTER); text("CATEGORY", padX, y1);
      textAlign(RIGHT, CENTER); text(node.info?.category || "—", width - padX, y1);
    }
  }
  