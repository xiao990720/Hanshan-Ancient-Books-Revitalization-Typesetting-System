import React, { useRef, useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";

interface BrushCanvasProps {
  pageIndex: number;
  width: number;
  height: number;
  brushType: "none" | "zhu" | "mo" | "eraser";
  brushSize: number; // 2, 4, 6
  savedDrawing?: string; // Base64 png representation
  onSaveDrawing: (pageIndex: number, dataUrl: string) => void;
}

export const BrushCanvas: React.FC<BrushCanvasProps> = ({
  pageIndex,
  width,
  height,
  brushType,
  brushSize,
  savedDrawing,
  onSaveDrawing
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPointRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // Load saved drawing initially or when leaf index changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    if (savedDrawing) {
      const img = new Image();
      img.src = savedDrawing;
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
      };
    }
  }, [pageIndex, savedDrawing, width, height]);

  // Handle Resize syncing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Redraw if saved exists
    if (savedDrawing) {
      const img = new Image();
      img.src = savedDrawing;
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
      };
    }
  }, [width, height, savedDrawing]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Scale coordinates accurately according to standard width and height parameters
    return {
      x: ((clientX - rect.left) / rect.width) * width,
      y: ((clientY - rect.top) / rect.height) * height,
      time: Date.now()
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    // Avoid default scrolling behaviors on tablets when drawing
    if (e.cancelable) e.preventDefault();

    const coords = getCoordinates(e);
    if (!coords) return;

    setIsDrawing(true);
    lastPointRef.current = coords;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPointRef.current) return;
    if (e.cancelable) e.preventDefault();

    const coords = getCoordinates(e);
    if (!coords) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const last = lastPointRef.current;

    // Calligraphic tapered brush calculations based on drag speed
    const dx = coords.x - last.x;
    const dy = coords.y - last.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const dt = Math.max(1, coords.time - last.time);
    const speed = distance / dt;

    // Faster speed -> thinner lines (creates dry-brush speed tapered strokes "飞白")
    // Slower speed -> thicker line (creates ink pooling dots "顿笔")
    let targetWidth = brushSize;
    if (brushType !== "eraser") {
      targetWidth = Math.max(brushSize * 0.4, brushSize * (2.0 - Math.min(1.5, speed * 1.8)));
    } else {
      targetWidth = brushSize * 4; // Eraser is naturally fatter
    }

    ctx.lineWidth = targetWidth;

    // Apply color and composite modes
    if (brushType === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = brushType === "zhu" ? "#BE1E2D" : "#241E1E"; // Cinnabar vermilion vs. charcoal pine ink
    }

    // Set transparency for realistic ink rendering
    ctx.globalAlpha = brushType === "zhu" ? 0.9 : 0.85;

    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    // Draw a quadratic curve for supreme round elegance
    const mx = (last.x + coords.x) / 2;
    const my = (last.y + coords.y) / 2;
    ctx.quadraticCurveTo(last.x, last.y, mx, my);
    ctx.stroke();

    lastPointRef.current = coords;
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    lastPointRef.current = null;

    // Save stroke callback
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSaveDrawing(pageIndex, canvas.toDataURL("image/png"));
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    onSaveDrawing(pageIndex, "");
  };

  const isInteractive = brushType !== "none";

  return (
    <div className="absolute inset-0 w-full h-full z-10 select-none pointer-events-none">
      <canvas
        ref={canvasRef}
        onMouseDown={isInteractive ? startDrawing : undefined}
        onMouseMove={isInteractive ? draw : undefined}
        onMouseUp={isInteractive ? stopDrawing : undefined}
        onMouseLeave={isInteractive ? stopDrawing : undefined}
        onTouchStart={isInteractive ? startDrawing : undefined}
        onTouchMove={isInteractive ? draw : undefined}
        onTouchEnd={isInteractive ? stopDrawing : undefined}
        className={`absolute inset-0 w-full h-full ${isInteractive ? "cursor-cell pointer-events-auto" : "pointer-events-none"}`}
        style={{ touchAction: "none" }}
      />

      {/* Mini floating quick-wipe widget inside drawable pages */}
      {isInteractive && (
        <button
          onClick={clearCanvas}
          title="清空当前叶上所有批注"
          className="absolute bottom-2 right-2 bg-stone-900/80 hover:bg-red-950 hover:text-red-100 p-1 rounded-full text-[10px] text-stone-500 hover:shadow z-20 transition border border-stone-800 pointer-events-auto cursor-pointer flex items-center justify-center w-5 h-5"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};
