/* global cv */
import React, { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import "./SignatureModal.css";

const SignatureModal = ({ isOpen, onClose, onAddSignature }) => {
  const sigCanvas = useRef(null);
  const [mode, setMode] = useState("draw");
  const [uploadedData, setUploadedData] = useState(null);
  const [processedData, setProcessedData] = useState(null);
  const [penColor, setPenColor] = useState("#000000");
  const [penWidth, setPenWidth] = useState(3);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");

  const waitForOpenCV = () =>
    new Promise((resolve) => {
      if (window.cv && window.cv.imread) {
        setProgressMsg("OpenCV already loaded");
        resolve();
      } else {
        setProgressMsg("Loading OpenCV...");
        window.cv = window.cv || {};
        window.cv.onRuntimeInitialized = () => {
          setProgressMsg("OpenCV loaded");
          resolve();
        };
      }
    });

  const fakeProgress = () => {
    return new Promise((resolve) => {
      let prog = 0;
      const interval = setInterval(() => {
        prog += 10;
        if (prog > 100) {
          clearInterval(interval);
          resolve();
        } else {
          setProgress(prog);
        }
      }, 150);
    });
  };

  const clear = () => {
    sigCanvas.current.clear();
  };

  const saveSignature = () => {
    if (mode === "draw") {
      if (sigCanvas.current.isEmpty()) {
        alert("Please draw your signature first");
        return;
      }
      const dataUrl = sigCanvas.current.getCanvas().toDataURL("image/png"); // Replaced getTrimmedCanvas()
      onAddSignature(dataUrl);
      onClose();
    } else if (mode === "upload") {
      if (!uploadedData) {
        alert("Please upload a signature first");
        return;
      }
      onAddSignature(processedData || uploadedData);
      onClose();
    }
  };

  const checkForTransparency = (imageData) => {
    const data = imageData.data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) return true;
    }
    return false;
  };

  const makeBackgroundTransparent = async (canvas) => {
    setProgressMsg("Detecting white background...");
    await fakeProgress();

    return new Promise((resolve) => {
      const src = window.cv.imread(canvas);
      const rgba = new window.cv.Mat();
      const mask = new window.cv.Mat();

      const low = new window.cv.Mat(
        src.rows,
        src.cols,
        src.type(),
        [200, 200, 200, 0]
      );
      const high = new window.cv.Mat(
        src.rows,
        src.cols,
        src.type(),
        [255, 255, 255, 255]
      );

      window.cv.inRange(src, low, high, mask);
      window.cv.cvtColor(src, rgba, window.cv.COLOR_RGB2RGBA);

      setProgressMsg("Removing white background...");
      for (let i = 0; i < mask.rows; i++) {
        for (let j = 0; j < mask.cols; j++) {
          if (mask.ucharPtr(i, j)[0] === 255) {
            rgba.ucharPtr(i, j)[3] = 0;
          }
        }
      }

      window.cv.imshow(canvas, rgba);
      const result = canvas.toDataURL("image/png");

      src.delete();
      rgba.delete();
      mask.delete();
      low.delete();
      high.delete();

      setProgress(100);
      setProgressMsg("Background removal complete");

      setTimeout(() => {
        setProgressMsg("");
        setProgress(0);
      }, 1200);

      resolve(result);
    });
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setProcessing(true);
    setUploadedData(null);
    setProcessedData(null);
    setProgress(0);
    setProgressMsg("Reading image...");

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result;
      const img = new Image();

      img.onload = async () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        setUploadedData(base64);

        if (!checkForTransparency(imageData)) {
          const confirmRemoveWhite = window.confirm(
            "This image does not have a transparent background. Do you want to remove the white background?"
          );
          if (confirmRemoveWhite) {
            await waitForOpenCV();
            const transparentImage = await makeBackgroundTransparent(canvas);
            setProcessedData(transparentImage);
          }
        } else {
          setProgressMsg("Image already has transparency");
        }
        setProcessing(false);
      };
      img.src = base64;
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  const isSaveDisabled =
    (mode === "draw" && sigCanvas.current?.isEmpty()) ||
    (mode === "upload" && !uploadedData) ||
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

        <button
          onClick={saveSignature}
          className="add-button"
          disabled={isSaveDisabled}
          style={{
            opacity: isSaveDisabled ? 0.6 : 1,
            cursor: isSaveDisabled ? "not-allowed" : "pointer",
          }}
        >
          Add Signature
        </button>
      </div>
    </div>
  );
};

export default SignatureModal;
