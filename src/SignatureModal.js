/* global cv */
import React, { useRef, useState, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";
import "./SignatureModal.css";

const fonts = [
  { name: "Pacifico", css: "'Pacifico', cursive" },
  { name: "Dancing Script", css: "'Dancing Script', cursive" },
  { name: "Great Vibes", css: "'Great Vibes', cursive" },
  { name: "Sacramento", css: "'Sacramento', cursive" },
  { name: "Alex Brush", css: "'Alex Brush', cursive" },
];

const SignatureModal = ({ isOpen, onClose, onAddSignature }) => {
  const sigCanvas = useRef(null);
  const typedSigRef = useRef(null);
  const [mode, setMode] = useState("draw"); // draw, upload, type
  const [uploadedData, setUploadedData] = useState(null);
  const [processedData, setProcessedData] = useState(null);
  const [penColor, setPenColor] = useState("#000000");
  const [penWidth, setPenWidth] = useState(3);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [typedText, setTypedText] = useState("");
  const [selectedFont, setSelectedFont] = useState(fonts[0].css);
  const [typedDataUrl, setTypedDataUrl] = useState(null);

  // Convert typed signature preview to data URL (image)
  const generateTypedSignatureImage = () => {
    if (!typedSigRef.current) return null;

    // Create a canvas to render the typed text
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const width = 400;
    const height = 200;
    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "transparent";
    ctx.fillRect(0, 0, width, height);

    ctx.font = `72px ${selectedFont}`;
    ctx.fillStyle = "#000000";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    // wrap text if too long (simple clip)
    const text = typedText || "";
    let displayText = text;
    if (text.length > 15) {
      displayText = text.slice(0, 15) + "...";
    }

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#000000";
    ctx.font = `72px ${selectedFont}`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText(displayText, width / 2, height / 2);

    return canvas.toDataURL("image/png");
  };

  // Update typedDataUrl whenever typedText or selectedFont changes
  useEffect(() => {
    if (mode === "type" && typedText.trim()) {
      const dataUrl = generateTypedSignatureImage();
      setTypedDataUrl(dataUrl);
    } else {
      setTypedDataUrl(null);
    }
  }, [typedText, selectedFont, mode]);

  // Save signature logic
  const saveSignature = () => {
    if (mode === "draw") {
      if (sigCanvas.current.isEmpty()) {
        alert("Please draw your signature first");
        return;
      }
      const dataUrl = sigCanvas.current.getCanvas().toDataURL("image/png");
      onAddSignature(dataUrl);
      onClose();
    } else if (mode === "upload") {
      if (!uploadedData) {
        alert("Please upload a signature first");
        return;
      }
      onAddSignature(processedData || uploadedData);
      onClose();
    } else if (mode === "type") {
      if (!typedText.trim()) {
        alert("Please type your signature text");
        return;
      }
      if (!typedDataUrl) {
        alert("Signature preview not ready");
        return;
      }
      onAddSignature(typedDataUrl);
      onClose();
    }
  };

  const clear = () => {
    sigCanvas.current.clear();
  };

  if (!isOpen) return null;

  const isSaveDisabled =
    (mode === "draw" && sigCanvas.current?.isEmpty()) ||
    (mode === "upload" && !uploadedData) ||
    (mode === "type" && !typedText.trim()) ||
    processing;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button onClick={onClose} className="close-button">
          &times;
        </button>
        <h2>Add Signature</h2>

        <div className="mode-buttons">
          <button
            onClick={() => setMode("draw")}
            className={mode === "draw" ? "active" : ""}
          >
            Draw Signature
          </button>
          <button
            onClick={() => setMode("upload")}
            className={mode === "upload" ? "active" : ""}
          >
            Upload Signature
          </button>
          <button
            onClick={() => setMode("type")}
            className={mode === "type" ? "active" : ""}
          >
            Type Signature
          </button>
        </div>

        {mode === "draw" && (
          <>
            <SignatureCanvas
              ref={sigCanvas}
              penColor={penColor}
              canvasProps={{
                width: 400,
                height: 200,
                className: "sigCanvas",
                style: { backgroundColor: "transparent" },
              }}
              minWidth={penWidth}
              maxWidth={penWidth}
            />
            <button onClick={clear} className="clear-button">
              Clear
            </button>
            <div className="controls">
              <label>
                Color:
                <input
                  type="color"
                  value={penColor}
                  onChange={(e) => setPenColor(e.target.value)}
                />
              </label>
              <label>
                Width:
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={penWidth}
                  onChange={(e) => setPenWidth(parseInt(e.target.value, 10))}
                />
              </label>
            </div>
          </>
        )}

        {mode === "upload" && (
          <>
            <input type="file" accept="image/*" onChange={handleUpload} />
            {processing && (
              <div style={{ marginTop: 10, width: "100%" }}>
                <div
                  style={{
                    height: 8,
                    backgroundColor: "#ddd",
                    borderRadius: 4,
                    overflow: "hidden",
                    marginBottom: 6,
                  }}
                >
                  <div
                    style={{
                      width: `${progress}%`,
                      height: "100%",
                      backgroundColor: "#007bff",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontFamily: "monospace",
                    color: "#444",
                    userSelect: "none",
                  }}
                >
                  {progressMsg || "Starting..."}
                </div>
              </div>
            )}
            {uploadedData && (
              <div style={{ marginTop: 12 }}>
                <p>
                  <b>Original Image:</b>
                </p>
                <img
                  src={uploadedData}
                  alt="Uploaded Signature Original"
                  style={{ maxWidth: 400, maxHeight: 200, borderRadius: 8 }}
                />
              </div>
            )}
            {processedData && (
              <div style={{ marginTop: 12 }}>
                <p>
                  <b>Transparent Background Preview:</b>
                </p>
                <img
                  src={processedData}
                  alt="Uploaded Signature Transparent"
                  style={{
                    maxWidth: 400,
                    maxHeight: 200,
                    borderRadius: 8,
                    border: "2px solid #007bff",
                  }}
                />
              </div>
            )}
          </>
        )}

        {mode === "type" && (
          <>
            <input
              type="text"
              placeholder="Type your signature text"
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                fontSize: 18,
                borderRadius: 6,
                border: "1.5px solid #ccc",
                marginBottom: 12,
                boxSizing: "border-box",
              }}
            />

            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              {fonts.map((f, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedFont(f.css)}
                  style={{
                    cursor: "pointer",
                    border:
                      selectedFont === f.css
                        ? "3px solid #007bff"
                        : "2px solid #ccc",
                    borderRadius: 8,
                    padding: 12,
                    minWidth: 120,
                    minHeight: 60,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    fontFamily: f.css,
                    fontSize: 28,
                    color: "#222",
                    userSelect: "none",
                    transition: "border-color 0.3s ease",
                  }}
                  title={f.name}
                >
                  {typedText || "Your Text"}
                </div>
              ))}
            </div>

            <div
              className="typed-signature-canvas"
              ref={typedSigRef}
              style={{
                fontFamily: selectedFont,
                fontSize: 72,
                width: 400,
                height: 200,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                border: "2px solid #007bff",
                borderRadius: 8,
                userSelect: "none",
                color: "#000",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {typedText || "Type Signature Preview"}
            </div>
          </>
        )}

        <button
          onClick={saveSignature}
          className="add-button"
          disabled={isSaveDisabled}
          style={{ opacity: isSaveDisabled ? 0.6 : 1 }}
        >
          Save Signature
        </button>
      </div>
    </div>
  );

  async function handleUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    setProcessing(true);
    setProgress(0);
    setProgressMsg("Reading file...");

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      await new Promise((res) => (reader.onloadend = res));
      setUploadedData(reader.result);
      setProcessedData(null);

      setProgress(30);
      setProgressMsg("Processing image...");

      // Process transparent background in Web Worker
      const img = new Image();
      img.src = reader.result;
      await new Promise((res) => (img.onload = res));

      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Simple removal of white background - adjust threshold as needed
      for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];

        // Detect near white pixels and make transparent
        if (r > 220 && g > 220 && b > 220) {
          imageData.data[i + 3] = 0;
        }
      }
      ctx.putImageData(imageData, 0, 0);

      const transparentUrl = canvas.toDataURL("image/png");
      setProcessedData(transparentUrl);
      setProgress(100);
      setProgressMsg("Done!");
    } catch (err) {
      alert("Failed to process image.");
      setUploadedData(null);
      setProcessedData(null);
    }
    setProcessing(false);
  }
};

export default SignatureModal;
