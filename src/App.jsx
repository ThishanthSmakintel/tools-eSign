import React, { useState, useRef, useEffect } from "react";
import { fabric } from "fabric";
import * as pdfjsLib from "pdfjs-dist/build/pdf";

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

  // Drawing tool states
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [brushColor, setBrushColor] = useState("#000000");
  const [brushWidth, setBrushWidth] = useState(5);
  const [isEraserMode, setIsEraserMode] = useState(false);

  // Undo / redo stack
  const undoStack = useRef([]);
  const redoStack = useRef([]);

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

  // Update controls for selected text object
  const updateControls = () => {
    const activeObject = fabricRef.current.getActiveObject();
    if (activeObject && activeObject.type === "i-text") {
      setFontSize(activeObject.fontSize || 24);
      setFontFamily(activeObject.fontFamily || "Arial");
      setFontColor(activeObject.fill || "#000000");
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
      editable: true,
    });

    fabricRef.current.add(text).setActiveObject(text);
    fabricRef.current.renderAll();
    setNewText("");
    saveState();
  };

  // Update active text object's style
  const updateActiveTextStyle = (property, value) => {
    const activeObject = fabricRef.current.getActiveObject();
    if (activeObject && activeObject.type === "i-text") {
      activeObject.set(property, value);
      fabricRef.current.renderAll();

      if (property === "fontSize") setFontSize(value);
      if (property === "fontFamily") setFontFamily(value);
      if (property === "fill") setFontColor(value);

      saveState();
    }
  };

  // Toggle drawing mode or eraser
  const toggleDrawingMode = (enable, eraser = false) => {
    if (!fabricRef.current) return;
    setIsDrawingMode(enable);
    setIsEraserMode(eraser);

    fabricRef.current.isDrawingMode = enable;

    if (enable) {
      if (eraser) {
        // Eraser brush: draw with white color, composite operation = 'destination-out'
        const eraserBrush = new fabric.PencilBrush(fabricRef.current);
        eraserBrush.color = "rgba(0,0,0,1)";
        eraserBrush.width = brushWidth;
        eraserBrush.globalCompositeOperation = "destination-out"; // eraser effect
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

  // Bring forward / send backward
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
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6">
        Certificate Designer with Fabric.js
      </h1>

      <div className="mb-4">
        <input
          type="file"
          accept="application/pdf,image/*"
          onChange={handleFileChange}
          className="mb-2"
        />

        <div className="flex gap-2 mb-4 flex-wrap">
          <input
            type="text"
            placeholder="Enter text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            className="border px-2 py-1 rounded flex-grow"
            disabled={isDrawingMode}
          />
          <button
            onClick={addText}
            className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700"
            disabled={isDrawingMode}
          >
            Add Text
          </button>
        </div>

        {/* Text styling controls */}
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <label>
            Font Size:{" "}
            <input
              type="number"
              min={8}
              max={100}
              value={fontSize}
              onChange={(e) =>
                updateActiveTextStyle("fontSize", parseInt(e.target.value, 10))
              }
              className="border px-2 py-1 rounded w-20"
              disabled={isDrawingMode}
            />
          </label>

          <label>
            Font Family:{" "}
            <select
              value={fontFamily}
              onChange={(e) =>
                updateActiveTextStyle("fontFamily", e.target.value)
              }
              className="border px-2 py-1 rounded"
              disabled={isDrawingMode}
            >
              <option value="Arial">Arial</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Courier New">Courier New</option>
              <option value="Georgia">Georgia</option>
              <option value="Verdana">Verdana</option>
            </select>
          </label>

          <label>
            Font Color:{" "}
            <input
              type="color"
              value={fontColor}
              onChange={(e) => updateActiveTextStyle("fill", e.target.value)}
              className="w-10 h-10 p-0 border rounded"
              title="Select font color"
              disabled={isDrawingMode}
            />
          </label>
        </div>

        {/* Drawing controls */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <button
            onClick={() => toggleDrawingMode(!isDrawingMode, false)}
            className={`px-4 py-1 rounded ${
              isDrawingMode && !isEraserMode
                ? "bg-green-700 text-white"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
            title="Toggle drawing mode"
          >
            {isDrawingMode && !isEraserMode
              ? "Disable Drawing"
              : "Enable Drawing"}
          </button>

          <button
            onClick={() => toggleDrawingMode(!isDrawingMode, true)}
            className={`px-4 py-1 rounded ${
              isDrawingMode && isEraserMode
                ? "bg-red-700 text-white"
                : "bg-red-600 text-white hover:bg-red-700"
            }`}
            title="Toggle eraser mode"
          >
            {isDrawingMode && isEraserMode ? "Disable Eraser" : "Enable Eraser"}
          </button>

          <label>
            Brush Color:{" "}
            <input
              type="color"
              value={brushColor}
              onChange={(e) => setBrushColor(e.target.value)}
              disabled={isDrawingMode && isEraserMode}
              className="w-10 h-10 p-0 border rounded"
            />
          </label>

          <label>
            Brush Width:{" "}
            <input
              type="number"
              min={1}
              max={50}
              value={brushWidth}
              onChange={(e) => setBrushWidth(parseInt(e.target.value, 10))}
              className="border px-2 py-1 rounded w-20"
            />
          </label>
        </div>

        {/* Undo / redo / clear / delete */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={undo}
            className="bg-yellow-500 text-black px-4 py-1 rounded hover:bg-yellow-600"
          >
            Undo
          </button>
          <button
            onClick={redo}
            className="bg-yellow-400 text-black px-4 py-1 rounded hover:bg-yellow-500"
          >
            Redo
          </button>
          <button
            onClick={deleteSelected}
            className="bg-red-600 text-white px-4 py-1 rounded hover:bg-red-700"
          >
            Delete Selected
          </button>
          <button
            onClick={clearCanvas}
            className="bg-gray-600 text-white px-4 py-1 rounded hover:bg-gray-700"
          >
            Clear Canvas
          </button>
          <button
            onClick={selectAll}
            className="bg-purple-600 text-white px-4 py-1 rounded hover:bg-purple-700"
          >
            Select All
          </button>
        </div>

        {/* Export */}
        <button
          onClick={exportAsImage}
          className="bg-blue-700 text-white px-6 py-2 rounded hover:bg-blue-800"
        >
          Export as PNG
        </button>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="border border-gray-400 mx-auto"
        style={{ maxWidth: "100%", height: "auto" }}
      ></canvas>
    </div>
  );
}
