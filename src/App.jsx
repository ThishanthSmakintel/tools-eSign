import React, { useState, useRef, useEffect } from "react";
import { fabric } from "fabric";
import SignatureModal from "./SignatureModal";
import * as pdfjsLib from "pdfjs-dist/build/pdf";

import "./app.css";

// Set PDF.js worker path
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function App() {
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);
  const appContainerRef = useRef(null);

  // States
  const [newText, setNewText] = useState("");
  const [imageSrc, setImageSrc] = useState(null);
  const [fontSize, setFontSize] = useState(24);
  const [fontFamily, setFontFamily] = useState("Arial");
  const [fontColor, setFontColor] = useState("#000000");
  const [textAlign, setTextAlign] = useState("left");
  const [fileError, setFileError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Drawing tool states
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [brushColor, setBrushColor] = useState("#000000");
  const [brushWidth, setBrushWidth] = useState(5);
  const [isEraserMode, setIsEraserMode] = useState(false);

  // Shape tool states
  const [activeShape, setActiveShape] = useState(null);
  const [shapeFill, setShapeFill] = useState("#ffffff");
  const [shapeStroke, setShapeStroke] = useState("#000000");
  const [shapeStrokeWidth, setShapeStrokeWidth] = useState(1);

  // Signature modal state
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);

  // Mobile state
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showControls, setShowControls] = useState(false);

  // Undo/redo stack
  const undoStack = useRef([]);
  const redoStack = useRef([]);

  // Configure fabric defaults
  fabric.Object.prototype.set({
    cornerColor: "red",
    cornerStrokeColor: "black",
    cornerStyle: "circle",
    cornerSize: 10,
    transparentCorners: false,
    borderColor: 'rgba(0,0,255,0.5)',
    padding: 5
  });

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      if (fabricRef.current && imageSrc) {
        resizeCanvasToContainer();
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, [imageSrc]);

  const resizeCanvasToContainer = () => {
    const canvas = fabricRef.current;
    const container = appContainerRef.current;
    if (!canvas || !container || !canvas.backgroundImage) return;
    
    const img = canvas.backgroundImage;
    const aspectRatio = img.width / img.height;
    let newWidth = container.clientWidth - 40;
    let newHeight = newWidth / aspectRatio;
    
    if (isMobile && newHeight > window.innerHeight * 0.6) {
      newHeight = window.innerHeight * 0.6;
      newWidth = newHeight * aspectRatio;
    }
    
    canvas.setDimensions({ width: newWidth, height: newHeight });
    img.scaleX = newWidth / img.width;
    img.scaleY = newHeight / img.height;
    canvas.renderAll();
  };

  // Initialize Fabric canvas with background
  const initFabric = (bgUrl, originalWidth, originalHeight) => {
    const container = appContainerRef.current;
    if (!container) return;
    
    const aspectRatio = originalWidth / originalHeight;
    let width = container.clientWidth - 40;
    let height = width / aspectRatio;
    
    if (isMobile && height > window.innerHeight * 0.6) {
      height = window.innerHeight * 0.6;
      width = height * aspectRatio;
    }
    
    const canvasElement = canvasRef.current;
    const fabricCanvas = new fabric.Canvas(canvasElement, {
      width,
      height,
      backgroundColor: "#ffffff",
      preserveObjectStacking: true,
      selection: true,
      isDrawingMode: false,
    });

    fabric.Image.fromURL(bgUrl, (img) => {
      img.set({ 
        selectable: false,
        originX: 'left',
        originY: 'top'
      });
      
      const scaleX = width / img.width;
      const scaleY = height / img.height;
      
      fabricCanvas.setBackgroundImage(img, () => {
        fabricCanvas.renderAll();
      }, {
        scaleX,
        scaleY,
        originX: 'left',
        originY: 'top'
      });
    });

    fabricRef.current = fabricCanvas;

    // Set up event listeners
    fabricCanvas.on("selection:created", updateControls);
    fabricCanvas.on("selection:updated", updateControls);
    fabricCanvas.on("selection:cleared", resetControls);
    fabricCanvas.on("object:added", saveState);
    fabricCanvas.on("object:modified", saveState);
    fabricCanvas.on("object:removed", saveState);
    fabricCanvas.on("path:created", saveState);

    saveState();
  };

  const resetControls = () => {
    setFontSize(24);
    setFontFamily("Arial");
    setFontColor("#000000");
    setTextAlign("left");
    setActiveShape(null);
  };

  // Save current canvas state to undo stack
  const saveState = () => {
    if (!fabricRef.current) return;
    const json = fabricRef.current.toJSON();
    undoStack.current.push(json);
    redoStack.current = [];
  };

  // Undo action
  const undo = () => {
    if (undoStack.current.length > 1 && fabricRef.current) {
      const current = undoStack.current.pop();
      redoStack.current.push(current);
      const last = undoStack.current[undoStack.current.length - 1];
      fabricRef.current.loadFromJSON(last, () => {
        fabricRef.current.renderAll();
      });
    }
  };

  // Update controls for selected object
  const updateControls = () => {
    const activeObject = fabricRef.current.getActiveObject();
    if (!activeObject) return;

    if (activeObject.type === "i-text") {
      setFontSize(activeObject.fontSize || 24);
      setFontFamily(activeObject.fontFamily || "Arial");
      setFontColor(activeObject.fill || "#000000");
      setTextAlign(activeObject.textAlign || "left");
      setActiveShape(null);
    } else if (["rect", "circle", "triangle"].includes(activeObject.type)) {
      setActiveShape(activeObject.type);
      setShapeFill(activeObject.fill || "#ffffff");
      setShapeStroke(activeObject.stroke || "#000000");
      setShapeStrokeWidth(activeObject.strokeWidth || 1);
    }
  };

  // Add new text box
  const addText = () => {
    if (!newText.trim() || !fabricRef.current) return;

    const text = new fabric.IText(newText, {
      left: 50,
      top: 50,
      fontSize: isMobile ? Math.min(fontSize, 20) : fontSize,
      fill: fontColor,
      fontFamily,
      textAlign,
      editable: true,
      padding: 5,
      borderColor: 'rgba(0,0,255,0.5)'
    });

    fabricRef.current.add(text).setActiveObject(text);
    fabricRef.current.renderAll();
    setNewText("");
    saveState();
  };

  // Update active object's style
  const updateActiveObjectStyle = (property, value) => {
    const activeObject = fabricRef.current.getActiveObject();
    if (activeObject) {
      activeObject.set(property, value);
      fabricRef.current.renderAll();
      saveState();
    }
  };

  // Toggle drawing mode or eraser
  const toggleDrawingMode = (enable, eraser = false) => {
    if (!fabricRef.current) return;
    setIsDrawingMode(enable);
    setIsEraserMode(eraser);
    setActiveShape(null);

    fabricRef.current.isDrawingMode = enable;

    if (enable) {
      const brush = new fabric.PencilBrush(fabricRef.current);
      brush.width = isMobile ? brushWidth * 0.7 : brushWidth;
      
      if (eraser) {
        brush.color = "rgba(0,0,0,1)";
        brush.globalCompositeOperation = "destination-out";
      } else {
        brush.color = brushColor;
        brush.globalCompositeOperation = "source-over";
      }
      
      fabricRef.current.freeDrawingBrush = brush;
    }
  };

  // Add shape to canvas
  const addShape = (shapeType) => {
    if (!fabricRef.current) return;
    setActiveShape(shapeType);
    setIsDrawingMode(false);

    let shape;
    const commonProps = {
      left: 50,
      top: 50,
      fill: shapeFill,
      stroke: shapeStroke,
      strokeWidth: shapeStrokeWidth,
      selectable: true,
      padding: 5,
      borderColor: 'rgba(0,0,255,0.5)'
    };

    switch (shapeType) {
      case "rect":
        shape = new fabric.Rect({
          ...commonProps,
          width: isMobile ? 80 : 100,
          height: isMobile ? 80 : 100,
        });
        break;
      case "circle":
        shape = new fabric.Circle({
          ...commonProps,
          radius: isMobile ? 40 : 50,
        });
        break;
      case "triangle":
        shape = new fabric.Triangle({
          ...commonProps,
          width: isMobile ? 80 : 100,
          height: isMobile ? 80 : 100,
        });
        break;
      default:
        return;
    }

    fabricRef.current.add(shape).setActiveObject(shape);
    fabricRef.current.renderAll();
    saveState();
  };

  // Add signature to canvas
  const addSignatureToCanvas = (signatureData) => {
    if (!fabricRef.current) return;

    fabric.Image.fromURL(signatureData, (img) => {
      const scale = isMobile ? 0.3 : 0.5;
      img.set({
        left: 50,
        top: 50,
        scaleX: scale,
        scaleY: scale,
        hasControls: true,
        hasBorders: true,
        selectable: true,
        padding: 5,
        borderColor: 'rgba(0,0,255,0.5)'
      });
      fabricRef.current.add(img).setActiveObject(img);
      fabricRef.current.renderAll();
      saveState();
    });
  };

  // Delete selected object(s)
  const deleteSelected = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length) {
      activeObjects.forEach((obj) => canvas.remove(obj));
      canvas.discardActiveObject();
      canvas.requestRenderAll();
      saveState();
    }
  };

  // Clear canvas (except background)
  const clearCanvas = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    canvas.getObjects().forEach((obj) => {
      if (obj !== canvas.backgroundImage) {
        canvas.remove(obj);
      }
    });
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    saveState();
  };

  // Select all objects except background
  const selectAll = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const objs = canvas.getObjects().filter((obj) => obj !== canvas.backgroundImage);
    if (objs.length > 0) {
      const sel = new fabric.ActiveSelection(objs, { canvas });
      canvas.setActiveObject(sel);
      canvas.requestRenderAll();
    }
  };

  // Export canvas as PNG
  const exportAsImage = () => {
    if (!fabricRef.current) return;
    const dataURL = fabricRef.current.toDataURL({
      format: "png",
      quality: 1,
      multiplier: 2,
    });

    const link = document.createElement("a");
    link.href = dataURL;
    link.download = "esign-document.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle PDF rendering
  const renderPDF = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ 
      data: arrayBuffer,
      verbosity: 0
    }).promise;
    
    const page = await pdf.getPage(1);
    const scale = isMobile ? 1.5 : 2;
    const viewport = page.getViewport({ scale });

    const tempCanvas = document.createElement("canvas");
    const context = tempCanvas.getContext("2d");
    tempCanvas.width = viewport.width;
    tempCanvas.height = viewport.height;

    await page.render({ 
      canvasContext: context, 
      viewport,
      intent: 'display',
      annotationMode: pdfjsLib.AnnotationMode.DISABLE
    }).promise;

    return {
      dataUrl: tempCanvas.toDataURL("image/png"),
      width: tempCanvas.width,
      height: tempCanvas.height
    };
  };

  // Handle image rendering
  const renderImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          resolve({
            dataUrl: event.target.result,
            width: img.width,
            height: img.height
          });
        };
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = event.target.result;
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  };

  // Handle file upload (PDF or image)
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Reset state
    setFileError(null);
    setIsLoading(true);
    if (fabricRef.current) {
      fabricRef.current.dispose();
      fabricRef.current = null;
    }

    try {
      // Check file size (max 10MB)
      const MAX_FILE_SIZE = 10 * 1024 * 1024;
      if (file.size > MAX_FILE_SIZE) {
        throw new Error("File too large (max 10MB)");
      }

      // Check file type by extension as fallback
      const fileExt = file.name.split('.').pop().toLowerCase();
      const isPDF = file.type === "application/pdf" || fileExt === "pdf";
      const isImage = file.type.startsWith("image/") || 
                     ['jpg', 'jpeg', 'png', 'gif'].includes(fileExt);

      if (!isPDF && !isImage) {
        throw new Error("Unsupported file type");
      }

      let result;
      if (isPDF) {
        try {
          result = await renderPDF(file);
        } catch (pdfError) {
          console.warn("Primary PDF render failed:", pdfError);
          throw new Error("Couldn't display this PDF on your device");
        }
      } else {
        result = await renderImage(file);
      }

      setImageSrc(result.dataUrl);
      initFabric(result.dataUrl, result.width, result.height);
    } catch (error) {
      console.error("File processing error:", error);
      setFileError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (fabricRef.current) {
        fabricRef.current.dispose();
      }
    };
  }, []);

  return (
    <div className="app-container" ref={appContainerRef}>
      <h1>E-Sign</h1>

      {isMobile && (
        <button 
          className="mobile-controls-toggle"
          onClick={() => setShowControls(!showControls)}
        >
          {showControls ? 'Hide Controls' : 'Show Controls'}
        </button>
      )}

      <div className={`controls-container ${isMobile ? (showControls ? 'mobile-visible' : 'mobile-hidden') : ''}`}>
        <div className="file-input-group">
          <label className="file-input-label">
            Upload Document
            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={handleFileChange}
              className="file-input"
              disabled={isLoading}
            />
          </label>
        </div>

        {fileError && (
          <div className="error-message">
            {fileError}
            <button onClick={() => setFileError(null)}>Dismiss</button>
          </div>
        )}

        {isLoading && (
          <div className="loading-overlay">Processing file...</div>
        )}

        <div className="text-input-group">
          <input
            type="text"
            placeholder="Enter text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            className="text-input"
            disabled={isDrawingMode || isLoading}
          />
          <button
            onClick={addText}
            className="button button-primary"
            disabled={isDrawingMode || isLoading || !newText.trim()}
          >
            Add Text
          </button>
        </div>

        {/* Text styling controls */}
        <div className="control-group">
          <div className="control-row">
            <label className="control-label">
              <span className="mobile-label">Size:</span>
              <input
                type="number"
                min={8}
                max={100}
                value={fontSize}
                onChange={(e) => updateActiveObjectStyle("fontSize", parseInt(e.target.value, 10))}
                className="number-input"
                disabled={isDrawingMode || isLoading}
              />
            </label>

            <label className="control-label">
              <span className="mobile-label">Font:</span>
              <select
                value={fontFamily}
                onChange={(e) => updateActiveObjectStyle("fontFamily", e.target.value)}
                className="select-input"
                disabled={isDrawingMode || isLoading}
              >
                <option value="Arial">Arial</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Courier New">Courier New</option>
                <option value="Georgia">Georgia</option>
                <option value="Verdana">Verdana</option>
              </select>
            </label>
          </div>

          <div className="control-row">
            <label className="control-label">
              <span className="mobile-label">Color:</span>
              <input
                type="color"
                value={fontColor}
                onChange={(e) => updateActiveObjectStyle("fill", e.target.value)}
                className="color-input"
                disabled={isDrawingMode || isLoading}
              />
            </label>
          </div>
        </div>

        {/* Shape controls */}
        <div className="control-group">
          <div className="shape-buttons">
            <button
              onClick={() => addShape("rect")}
              className={`button ${activeShape === "rect" ? "button-teal active" : "button-secondary"}`}
              disabled={isLoading}
            >
              {isMobile ? '□' : 'Rectangle'}
            </button>
            <button
              onClick={() => addShape("circle")}
              className={`button ${activeShape === "circle" ? "button-teal active" : "button-secondary"}`}
              disabled={isLoading}
            >
              {isMobile ? '○' : 'Circle'}
            </button>
            <button
              onClick={() => addShape("triangle")}
              className={`button ${activeShape === "triangle" ? "button-teal active" : "button-secondary"}`}
              disabled={isLoading}
            >
              {isMobile ? '△' : 'Triangle'}
            </button>
          </div>

          <div className="control-row">
            <label className="control-label">
              <span className="mobile-label">Fill:</span>
              <input
                type="color"
                value={shapeFill}
                onChange={(e) => updateActiveObjectStyle("fill", e.target.value)}
                className="color-input"
                disabled={isDrawingMode || isLoading}
              />
            </label>

            <label className="control-label">
              <span className="mobile-label">Stroke:</span>
              <input
                type="color"
                value={shapeStroke}
                onChange={(e) => updateActiveObjectStyle("stroke", e.target.value)}
                className="color-input"
                disabled={isDrawingMode || isLoading}
              />
            </label>
          </div>

          <div className="control-row">
            <label className="control-label">
              <span className="mobile-label">Stroke Width:</span>
              <input
                type="number"
                min={1}
                max={20}
                value={shapeStrokeWidth}
                onChange={(e) => updateActiveObjectStyle("strokeWidth", parseInt(e.target.value, 10))}
                className="number-input"
                disabled={isDrawingMode || isLoading}
              />
            </label>
          </div>
        </div>

        {/* Drawing controls */}
        <div className="control-group">
          <div className="control-row">
            <button
              onClick={() => toggleDrawingMode(!isDrawingMode, false)}
              className={`button button-success ${isDrawingMode && !isEraserMode ? "active" : ""}`}
              disabled={isLoading}
            >
              {isMobile ? '✏️' : (isDrawingMode && !isEraserMode ? 'Disable Drawing' : 'Enable Drawing')}
            </button>

            <button
              onClick={() => toggleDrawingMode(!isDrawingMode, true)}
              className={`button button-warning ${isEraserMode ? "active" : ""}`}
              disabled={isLoading}
            >
              {isMobile ? '🧽' : 'Eraser'}
            </button>
          </div>

          <div className="control-row">
            <label className="control-label">
              <span className="mobile-label">Color:</span>
              <input
                type="color"
                value={brushColor}
                onChange={(e) => setBrushColor(e.target.value)}
                disabled={isEraserMode || isLoading}
                className="color-input"
              />
            </label>

            <label className="control-label">
              <span className="mobile-label">Width:</span>
              <input
                type="number"
                min={1}
                max={50}
                value={brushWidth}
                onChange={(e) => setBrushWidth(parseInt(e.target.value, 10))}
                className="number-input"
                disabled={isLoading}
              />
            </label>
          </div>
        </div>

        <div className="action-buttons">
          <div className="button-row">
            <button 
              onClick={undo} 
              className="button button-warning" 
              disabled={isLoading || undoStack.current.length <= 1}
            >
              {isMobile ? '↩️' : 'Undo'}
            </button>
            <button 
              onClick={deleteSelected} 
              className="button button-danger"
              disabled={isLoading}
            >
              {isMobile ? '🗑️' : 'Delete'}
            </button>
            <button 
              onClick={clearCanvas} 
              className="button button-secondary"
              disabled={isLoading}
            >
              {isMobile ? '🧹' : 'Clear All'}
            </button>
          </div>
          
          <div className="button-row">
            <button 
              onClick={selectAll} 
              className="button button-purple"
              disabled={isLoading}
            >
              {isMobile ? '☑️' : 'Select All'}
            </button>
            <button 
              onClick={exportAsImage} 
              className="button button-primary"
              disabled={isLoading || !imageSrc}
            >
              {isMobile ? '💾' : 'Export'}
            </button>
            <button
              onClick={() => setIsSignatureModalOpen(true)}
              className="button button-teal"
              disabled={isLoading}
            >
              {isMobile ? '✍️' : 'Signature'}
            </button>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="canvas-container">
        <canvas ref={canvasRef}></canvas>
      </div>

      {/* Signature Modal */}
      <SignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onAddSignature={addSignatureToCanvas}
        isMobile={isMobile}
      />
    </div>
  );
}