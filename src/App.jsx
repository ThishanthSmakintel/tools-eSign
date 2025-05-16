import React, { useState, useRef, useEffect } from "react";
import { fabric } from "fabric";
import * as pdfjsLib from "pdfjs-dist/build/pdf";

// PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const SignatureModal = ({ isOpen, onClose, onAddSignature }) => {
  const [mode, setMode] = useState("draw");
  const [signatureData, setSignatureData] = useState(null);
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);
  const [brushColor, setBrushColor] = useState("#000000");
  const [brushWidth, setBrushWidth] = useState(3);

  // Initialize and manage the canvas
  useEffect(() => {
    if (!isOpen) return;

    // Initialize canvas only once
    if (!fabricRef.current && canvasRef.current) {
      const canvas = new fabric.Canvas(canvasRef.current, {
        width: 400,
        height: 200,
        backgroundColor: "#ffffff",
        isDrawingMode: true,
      });

      const brush = new fabric.PencilBrush(canvas);
      brush.color = brushColor;
      brush.width = brushWidth;
      canvas.freeDrawingBrush = brush;

      fabricRef.current = canvas;
    }

    // Update brush when properties change
    if (fabricRef.current) {
      const brush = new fabric.PencilBrush(fabricRef.current);
      brush.color = brushColor;
      brush.width = brushWidth;
      fabricRef.current.freeDrawingBrush = brush;
      fabricRef.current.isDrawingMode = true;
    }

    return () => {
      // Don't dispose here - we want to keep the canvas between openings
      if (fabricRef.current) {
        fabricRef.current.isDrawingMode = false;
      }
    };
  }, [isOpen, brushColor, brushWidth]);

  // Proper cleanup when component unmounts
  useEffect(() => {
    return () => {
      if (fabricRef.current) {
        fabricRef.current.dispose();
        fabricRef.current = null;
      }
    };
  }, []);

  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setSignatureData(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Clear the drawing canvas
  const clearCanvas = () => {
    if (fabricRef.current) {
      fabricRef.current.clear();
      fabricRef.current.backgroundColor = "#ffffff";
      fabricRef.current.renderAll();
    }
  };

  // Save the signature
  const saveSignature = () => {
    if (mode === "draw" && fabricRef.current) {
      // Check if there's actually something drawn
      if (fabricRef.current.getObjects().length > 0) {
        const dataUrl = fabricRef.current.toDataURL({
          format: "png",
          quality: 1,
        });
        onAddSignature(dataUrl);
      } else {
        alert("Please draw your signature first");
        return;
      }
    } else if (mode === "upload" && signatureData) {
      onAddSignature(signatureData);
    } else {
      alert("Please create or upload a signature first");
      return;
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title">Add Signature</h2>
          <button className="close-button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="mode-selector">
          <button
            className={`mode-button ${mode === "draw" ? "active" : ""}`}
            onClick={() => {
              setMode("draw");
              setSignatureData(null);
            }}
          >
            Draw Signature
          </button>
          <button
            className={`mode-button ${mode === "upload" ? "active" : ""}`}
            onClick={() => setMode("upload")}
          >
            Upload Signature
          </button>
        </div>

        {mode === "draw" ? (
          <>
            <canvas
              ref={canvasRef}
              width={400}
              height={200}
              className="signature-canvas"
            />
            <div className="drawing-controls">
              <label className="control-label">
                Color:
                <input
                  type="color"
                  value={brushColor}
                  onChange={(e) => setBrushColor(e.target.value)}
                  className="color-input"
                />
              </label>
              <label className="control-label">
                Width:
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={brushWidth}
                  onChange={(e) => setBrushWidth(parseInt(e.target.value, 10))}
                  className="number-input"
                />
              </label>
              <button
                onClick={clearCanvas}
                className="button button-secondary"
              >
                Clear
              </button>
            </div>
          </>
        ) : (
          <>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              style={{ display: "block", marginBottom: "1rem" }}
            />
            {signatureData && (
              <img
                src={signatureData}
                alt="Signature preview"
                className="upload-preview"
              />
            )}
          </>
        )}

        <div className="modal-actions">
          <button onClick={onClose} className="button button-secondary">
            Cancel
          </button>
          <button onClick={saveSignature} className="button button-primary">
            Add Signature
          </button>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);

  // States
  const [newText, setNewText] = useState("");
  const [imageSrc, setImageSrc] = useState(null);
  const [fontSize, setFontSize] = useState(24);
  const [fontFamily, setFontFamily] = useState("Arial");
  const [fontColor, setFontColor] = useState("#000000");
  const [textAlign, setTextAlign] = useState("left");

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

  // Undo / redo stack
  const undoStack = useRef([]);
  const redoStack = useRef([]);

  fabric.Object.prototype.set({
    cornerColor: 'red',
    cornerStrokeColor: 'black',
    cornerStyle: 'circle',
    cornerSize: 14,
    transparentCorners: false,
  });

  // Initialize Fabric canvas with background
  const initFabric = (bgUrl, width, height) => {
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
      img.set({ selectable: false });
      fabricCanvas.setBackgroundImage(
        img,
        fabricCanvas.renderAll.bind(fabricCanvas),
        {
          scaleX: width / img.width,
          scaleY: height / img.height,
        }
      );
    });

    fabricRef.current = fabricCanvas;

    fabricCanvas.on("selection:created", updateControls);
    fabricCanvas.on("selection:updated", updateControls);
    fabricCanvas.on("selection:cleared", () => {
      setFontSize(24);
      setFontFamily("Arial");
      setFontColor("#000000");
      setTextAlign("left");
      setActiveShape(null);
    });

    // Record initial state for undo stack
    saveState();

    // Listen for modifications to save undo state
    fabricCanvas.on("object:added", saveState);
    fabricCanvas.on("object:modified", saveState);
    fabricCanvas.on("object:removed", saveState);
    fabricCanvas.on("path:created", saveState);
  };

  // Save current canvas state to undo stack
  const saveState = () => {
    if (!fabricRef.current) return;
    const json = fabricRef.current.toJSON();
    undoStack.current.push(json);
    // Clear redo stack on new action
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

  // Redo action
  const redo = () => {
    if (redoStack.current.length > 0 && fabricRef.current) {
      const redoState = redoStack.current.pop();
      undoStack.current.push(redoState);
      fabricRef.current.loadFromJSON(redoState, () => {
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
      left: 100,
      top: 100,
      fontSize,
      fill: fontColor,
      fontFamily,
      textAlign,
      editable: true,
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
      
      if (activeObject.type === "i-text") {
        if (property === "fontSize") setFontSize(value);
        if (property === "fontFamily") setFontFamily(value);
        if (property === "fill") setFontColor(value);
        if (property === "textAlign") setTextAlign(value);
      } else if (["rect", "circle", "triangle"].includes(activeObject.type)) {
        if (property === "fill") setShapeFill(value);
        if (property === "stroke") setShapeStroke(value);
        if (property === "strokeWidth") setShapeStrokeWidth(value);
      }
      
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
      if (eraser) {
        const eraserBrush = new fabric.PencilBrush(fabricRef.current);
        eraserBrush.color = "rgba(0,0,0,1)";
        eraserBrush.width = brushWidth;
        eraserBrush.globalCompositeOperation = "destination-out";
        fabricRef.current.freeDrawingBrush = eraserBrush;
      } else {
        const brush = new fabric.PencilBrush(fabricRef.current);
        brush.color = brushColor;
        brush.width = brushWidth;
        brush.globalCompositeOperation = "source-over";
        fabricRef.current.freeDrawingBrush = brush;
      }
    }
  };

  // Add shape to canvas
  const addShape = (shapeType) => {
    if (!fabricRef.current) return;
    setActiveShape(shapeType);
    setIsDrawingMode(false);
    
    let shape;
    const commonProps = {
      left: 100,
      top: 100,
      fill: shapeFill,
      stroke: shapeStroke,
      strokeWidth: shapeStrokeWidth,
      selectable: true,
    };

    switch (shapeType) {
      case "rect":
        shape = new fabric.Rect({
          ...commonProps,
          width: 100,
          height: 100,
        });
        break;
      case "circle":
        shape = new fabric.Circle({
          ...commonProps,
          radius: 50,
        });
        break;
      case "triangle":
        shape = new fabric.Triangle({
          ...commonProps,
          width: 100,
          height: 100,
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
      img.set({
        left: 100,
        top: 100,
        scaleX: 0.5,
        scaleY: 0.5,
        hasControls: true,
        hasBorders: true,
        selectable: true,
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

  // Layer operations
  const bringForward = () => {
    const canvas = fabricRef.current;
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      canvas.bringForward(activeObject);
      canvas.requestRenderAll();
      saveState();
    }
  };

  const sendBackward = () => {
    const canvas = fabricRef.current;
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      canvas.sendBackwards(activeObject);
      canvas.requestRenderAll();
      saveState();
    }
  };

  const bringToFront = () => {
    const canvas = fabricRef.current;
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      canvas.bringToFront(activeObject);
      canvas.requestRenderAll();
      saveState();
    }
  };

  const sendToBack = () => {
    const canvas = fabricRef.current;
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      canvas.sendToBack(activeObject);
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
    const objs = canvas
      .getObjects()
      .filter((obj) => obj !== canvas.backgroundImage);
    if (objs.length > 0) {
      const sel = new fabric.ActiveSelection(objs, {
        canvas,
      });
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
    link.download = "certificate.png";
    link.click();
  };

  // Handle file upload (PDF or image)
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (fabricRef.current) {
      fabricRef.current.dispose();
      fabricRef.current = null;
    }

    if (file.type === "application/pdf") {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 2 });

      const tempCanvas = document.createElement("canvas");
      const context = tempCanvas.getContext("2d");
      tempCanvas.width = viewport.width;
      tempCanvas.height = viewport.height;

      await page.render({ canvasContext: context, viewport }).promise;

      const dataUrl = tempCanvas.toDataURL("image/png");
      setImageSrc(dataUrl);
      initFabric(dataUrl, tempCanvas.width, tempCanvas.height);
    } else if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        setImageSrc(url);
        initFabric(url, img.width, img.height);
      };
      img.src = url;
    } else {
      alert("Unsupported file type.");
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
    <div className="app-container">
      <style jsx>{`
        .app-container {
          min-height: 100vh;
          padding: 20px;
          background-color: #f5f7fa;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        h1 {
          font-size: 2rem;
          color: #2d3748;
          margin-bottom: 1.5rem;
          text-align: center;
        }
        
        .controls-container {
          max-width: 1200px;
          margin: 0 auto 2rem;
          background: white;
          padding: 1.5rem;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .file-input {
          margin-bottom: 1rem;
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
        }
        
        .text-input-group {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }
        
        .text-input {
          flex: 1;
          min-width: 200px;
          padding: 0.5rem;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
        }
        
        .button {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .button:hover {
          transform: translateY(-1px);
        }
        
        .button:active {
          transform: translateY(0);
        }
        
        .button-primary {
          background-color: #4299e1;
          color: white;
        }
        
        .button-primary:hover {
          background-color: #3182ce;
        }
        
        .button-success {
          background-color: #48bb78;
          color: white;
        }
        
        .button-success:hover {
          background-color: #38a169;
        }
        
        .button-success.active {
          background-color: #2f855a;
          box-shadow: inset 0 0 5px rgba(0,0,0,0.2);
        }
        
        .button-danger {
          background-color: #f56565;
          color: white;
        }
        
        .button-danger:hover {
          background-color: #e53e3e;
        }
        
        .button-danger.active {
          background-color: #c53030;
          box-shadow: inset 0 0 5px rgba(0,0,0,0.2);
        }
        
        .button-warning {
          background-color: #ed8936;
          color: white;
        }
        
        .button-warning:hover {
          background-color: #dd6b20;
        }
        
        .button-secondary {
          background-color: #718096;
          color: white;
        }
        
        .button-secondary:hover {
          background-color: #4a5568;
        }
        
        .button-purple {
          background-color: #9f7aea;
          color: white;
        }
        
        .button-purple:hover {
          background-color: #805ad5;
        }
        
        .button-teal {
          background-color: #38b2ac;
          color: white;
        }
        
        .button-teal:hover {
          background-color: #319795;
        }
        
        .button-pink {
          background-color: #ed64a6;
          color: white;
        }
        
        .button-pink:hover {
          background-color: #d53f8c;
        }
        
        .control-group {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 1rem;
          align-items: center;
        }
        
        .control-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          white-space: nowrap;
        }
        
        .control-input {
          padding: 0.3rem;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
        }
        
        .color-input {
          width: 40px;
          height: 40px;
          padding: 0;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .number-input {
          width: 60px;
          padding: 0.3rem;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
        }
        
        .select-input {
          padding: 0.3rem;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          min-width: 120px;
        }
        
        .action-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }
        
        .section-title {
          font-weight: 600;
          margin: 1rem 0 0.5rem;
          color: #4a5568;
        }
        
        .canvas-container {
          max-width: 100%;
          overflow: auto;
          margin: 0 auto;
          background: white;
          padding: 1rem;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        canvas {
          display: block;
          margin: 0 auto;
          border: 1px solid #e2e8f0;
          max-width: 100%;
          height: auto;
        }
        
        .shape-buttons {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        
        .align-buttons {
          display: flex;
          gap: 0.5rem;
        }
        
        .align-button {
          padding: 0.5rem;
          border: 1px solid #e2e8f0;
          background: white;
          cursor: pointer;
          border-radius: 4px;
          display: flex;
          align-items: center;
        }
        
        .align-button.active {
          background: #4299e1;
          color: white;
          border-color: #4299e1;
        }
        
        /* Signature modal styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        
        .modal-content {
          background: white;
          padding: 2rem;
          border-radius: 8px;
          width: 90%;
          max-width: 500px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }
        
        .modal-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: #2d3748;
          margin: 0;
        }
        
        .close-button {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #718096;
        }
        
        .mode-selector {
          display: flex;
          margin-bottom: 1.5rem;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .mode-button {
          padding: 0.5rem 1rem;
          background: none;
          border: none;
          cursor: pointer;
          font-weight: 500;
          position: relative;
          color: #718096;
        }
        
        .mode-button.active {
          color: #4299e1;
        }
        
        .mode-button.active::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 2px;
          background-color: #4299e1;
        }
        
        .signature-canvas {
          border: 1px solid #e2e8f0;
          margin: 1rem 0;
          background: white;
        }
        
        .drawing-controls {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
          align-items: center;
        }
        
        .upload-preview {
          max-width: 100%;
          max-height: 200px;
          margin: 1rem 0;
          display: block;
        }
        
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          margin-top: 1.5rem;
        }
        
        @media (max-width: 768px) {
          .control-group {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .control-label {
            white-space: normal;
          }
          
          .text-input-group {
            flex-direction: column;
          }
          
          .text-input {
            width: 100%;
          }
          
          .action-buttons {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>

      <h1>Certificate Designer with Fabric.js</h1>

      <div className="controls-container">
        <input
          type="file"
          accept="application/pdf,image/*"
          onChange={handleFileChange}
          className="file-input"
        />

        <div className="text-input-group">
          <input
            type="text"
            placeholder="Enter text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            className="text-input"
            disabled={isDrawingMode}
          />
          <button
            onClick={addText}
            className="button button-primary"
            disabled={isDrawingMode}
          >
            Add Text
          </button>
        </div>

        {/* Text styling controls */}
        <div className="control-group">
          <label className="control-label">
            Font Size:
            <input
              type="number"
              min={8}
              max={100}
              value={fontSize}
              onChange={(e) =>
                updateActiveObjectStyle("fontSize", parseInt(e.target.value, 10))
              }
              className="number-input"
              disabled={isDrawingMode}
            />
          </label>

          <label className="control-label">
            Font Family:
            <select
              value={fontFamily}
              onChange={(e) =>
                updateActiveObjectStyle("fontFamily", e.target.value)
              }
              className="select-input"
              disabled={isDrawingMode}
            >
              <option value="Arial">Arial</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Courier New">Courier New</option>
              <option value="Georgia">Georgia</option>
              <option value="Verdana">Verdana</option>
            </select>
          </label>

          <label className="control-label">
            Font Color:
            <input
              type="color"
              value={fontColor}
              onChange={(e) => updateActiveObjectStyle("fill", e.target.value)}
              className="color-input"
              title="Select font color"
              disabled={isDrawingMode}
            />
          </label>
        </div>

        {/* Shape controls */}
        <div className="control-group">
          <div className="shape-buttons">
            <button
              onClick={() => addShape("rect")}
              className={`button ${activeShape === "rect" ? "button-teal active" : "button-secondary"}`}
            >
              Rectangle
            </button>
            <button
              onClick={() => addShape("circle")}
              className={`button ${activeShape === "circle" ? "button-teal active" : "button-secondary"}`}
            >
              Circle
            </button>
            <button
              onClick={() => addShape("triangle")}
              className={`button ${activeShape === "triangle" ? "button-teal active" : "button-secondary"}`}
            >
              Triangle
            </button>
          </div>

          <label className="control-label">
            Fill:
            <input
              type="color"
              value={shapeFill}
              onChange={(e) => updateActiveObjectStyle("fill", e.target.value)}
              className="color-input"
              disabled={isDrawingMode}
            />
          </label>

          <label className="control-label">
            Stroke:
            <input
              type="color"
              value={shapeStroke}
              onChange={(e) => updateActiveObjectStyle("stroke", e.target.value)}
              className="color-input"
              disabled={isDrawingMode}
            />
          </label>

          <label className="control-label">
            Stroke Width:
            <input
              type="number"
              min={1}
              max={20}
              value={shapeStrokeWidth}
              onChange={(e) =>
                updateActiveObjectStyle("strokeWidth", parseInt(e.target.value, 10))
              }
              className="number-input"
              disabled={isDrawingMode}
            />
          </label>
        </div>

        {/* Drawing controls */}
        <div className="control-group">
          <button
            onClick={() => toggleDrawingMode(!isDrawingMode, false)}
            className={`button button-success ${
              isDrawingMode && !isEraserMode ? "active" : ""
            }`}
            title="Toggle drawing mode"
          >
            {isDrawingMode && !isEraserMode
              ? "Disable Drawing"
              : "Enable Drawing"}
          </button>

          <button
            onClick={() => toggleDrawingMode(!isDrawingMode, true)}
            className={`button button-danger ${
              isDrawingMode && isEraserMode ? "active" : ""
            }`}
            title="Toggle eraser mode"
          >
            {isDrawingMode && isEraserMode ? "Disable Eraser" : "Enable Eraser"}
          </button>

          <label className="control-label">
            Brush Color:
            <input
              type="color"
              value={brushColor}
              onChange={(e) => setBrushColor(e.target.value)}
              disabled={isDrawingMode && isEraserMode}
              className="color-input"
            />
          </label>

          <label className="control-label">
            Brush Width:
            <input
              type="number"
              min={1}
              max={50}
              value={brushWidth}
              onChange={(e) => setBrushWidth(parseInt(e.target.value, 10))}
              className="number-input"
            />
          </label>
        </div>

        {/* Layer controls */}
        <div className="control-group">
          <button onClick={bringToFront} className="button button-pink">
            Bring to Front
          </button>
          <button onClick={sendToBack} className="button button-pink">
            Send to Back
          </button>
          <button onClick={bringForward} className="button button-pink">
            Bring Forward
          </button>
          <button onClick={sendBackward} className="button button-pink">
            Send Backward
          </button>
        </div>

        {/* Action buttons */}
        <div className="action-buttons">
          <button onClick={undo} className="button button-warning">
            Undo
          </button>
          <button onClick={redo} className="button button-warning">
            Redo
          </button>
          <button onClick={deleteSelected} className="button button-danger">
            Delete Selected
          </button>
          <button onClick={clearCanvas} className="button button-secondary">
            Clear Canvas
          </button>
          <button onClick={selectAll} className="button button-purple">
            Select All
          </button>
          <button 
            onClick={() => setIsSignatureModalOpen(true)} 
            className="button button-teal"
          >
            Add Signature
          </button>
          <button onClick={exportAsImage} className="button button-primary">
            Export as PNG
          </button>
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
      />
    </div>
  );
}