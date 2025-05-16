import React, { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import "./SignatureModal.css";

const SignatureModal = ({ isOpen, onClose, onAddSignature }) => {
  const sigCanvas = useRef(null);
  const [mode, setMode] = useState("draw");
  const [uploadedData, setUploadedData] = useState(null);
  const [penColor, setPenColor] = useState("#000000");
  const [penWidth, setPenWidth] = useState(3);

  const clear = () => sigCanvas.current.clear();

  const saveSignature = () => {
    if (mode === "draw") {
      if (sigCanvas.current.isEmpty()) {
        alert("Please draw your signature first");
        return;
      }
      // Save transparent PNG from the canvas
      const dataUrl = sigCanvas.current
        .getTrimmedCanvas()
        .toDataURL("image/png");
      onAddSignature(dataUrl);
    } else if (mode === "upload" && uploadedData) {
      // Pass uploaded image as-is, no changes
      onAddSignature(uploadedData);
    } else {
      alert("Please create or upload a signature first");
      return;
    }
    onClose();
  };

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setUploadedData(ev.target.result);
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

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
        </div>

        {mode === "draw" ? (
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
        ) : (
          <>
            <input type="file" accept="image/*" onChange={handleUpload} />
            {uploadedData && (
              <img
                src={uploadedData}
                alt="Uploaded Signature"
                style={{ maxWidth: 400, maxHeight: 200, marginTop: 10 }}
              />
            )}
          </>
        )}

        <button onClick={saveSignature} className="add-button">
          Add Signature
        </button>
      </div>
    </div>
  );
};

export default SignatureModal;
