import React, { useState, useRef, useEffect } from "react";
import { fabric } from "fabric";
import SignatureModal from "./SignatureModal";
import * as pdfjsLib from "pdfjs-dist/build/pdf";

import "./app.css";
// PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

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
    cornerColor: "red",
    cornerStrokeColor: "black",
    cornerStyle: "circle",
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
        fabricRef.current = null;
      }
    };
  }, []);

  return (
    <div className="app-container">
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
                updateActiveObjectStyle(
                  "fontSize",
                  parseInt(e.target.value, 10)
                )
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
              className={`button ${
                activeShape === "rect"
                  ? "button-teal active"
                  : "button-secondary"
              }`}
            >
              Rectangle
            </button>
            <button
              onClick={() => addShape("circle")}
              className={`button ${
                activeShape === "circle"
                  ? "button-teal active"
                  : "button-secondary"
              }`}
            >
              Circle
            </button>
            <button
              onClick={() => addShape("triangle")}
              className={`button ${
                activeShape === "triangle"
                  ? "button-teal active"
                  : "button-secondary"
              }`}
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
              onChange={(e) =>
                updateActiveObjectStyle("stroke", e.target.value)
              }
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
                updateActiveObjectStyle(
                  "strokeWidth",
                  parseInt(e.target.value, 10)
                )
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
        <div className="action-buttons">
          <button onClick={undo} className="button button-warning">
            Undo
          </button>
          <button onClick={deleteSelected} className="button button-danger">
            Delete Selected
          </button>
          <button onClick={clearCanvas} className="button button-secondary">
            Clear All
          </button>
          <button onClick={selectAll} className="button button-purple">
            Select All
          </button>
          <button onClick={exportAsImage} className="button button-primary">
            Export as PNG
          </button>
          <button
            onClick={() => setIsSignatureModalOpen(true)}
            className="button button-teal"
          >
            Add Signature
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
