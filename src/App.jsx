import React, { useEffect, useRef, useState } from "react";
import { fabric } from "fabric";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { useDropzone } from "react-dropzone";
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
  useMediaQuery,
  useTheme,
  TextField,
  Tooltip,
  Alert,
  Snackbar,
} from "@mui/material";
import { FolderZip, TextFields, CropFree } from "@mui/icons-material";

const FONT_FAMILIES = [
  "Arial",
  "Verdana",
  "Times New Roman",
  "Georgia",
  "Courier New",
  "Tahoma",
];

export default function CertificateEditor() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [canvas, setCanvas] = useState(null);
  const [columns, setColumns] = useState([]);
  const [dataRows, setDataRows] = useState([]);
  const [alignment, setAlignment] = useState("center");
  const [fontSize, setFontSize] = useState(24);
  const [fontFamily, setFontFamily] = useState("Arial");
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [alert, setAlert] = useState({ open: false, message: "", severity: "info" });

  // Initialize Fabric canvas
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      preserveObjectStacking: true,
      backgroundColor: "#fff",
      selection: true,
    });

    setCanvas(fabricCanvas);

    // Responsive canvas size
    const resizeCanvas = () => {
      if (!containerRef.current) return;

      const containerWidth = containerRef.current.clientWidth;
      // Maintain aspect ratio 1000:600
      const calculatedHeight = (containerWidth * 600) / 1000;

      fabricCanvas.setWidth(containerWidth);
      fabricCanvas.setHeight(calculatedHeight);

      // Re-center background image if present
      if (fabricCanvas.backgroundImage) {
        centerBackgroundImage(fabricCanvas);
      }

      fabricCanvas.calcOffset();
      fabricCanvas.requestRenderAll();
    };

    // Resize initially and on container resize
    resizeCanvas();
    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      fabricCanvas.dispose();
      setCanvas(null);
    };
  }, []);

  // Function to center background image on canvas without stretching
  const centerBackgroundImage = (fabricCanvas) => {
    const img = fabricCanvas.backgroundImage;
    if (!img) return;

    const canvasWidth = fabricCanvas.getWidth();
    const canvasHeight = fabricCanvas.getHeight();

    // Reset any scaling first
    img.scaleX = 1;
    img.scaleY = 1;

    const imgRatio = img.width / img.height;
    const canvasRatio = canvasWidth / canvasHeight;

    let scaleFactor;

    if (imgRatio > canvasRatio) {
      // Image is wider than canvas ratio - fit width
      scaleFactor = canvasWidth / img.width;
    } else {
      // Image is taller - fit height
      scaleFactor = canvasHeight / img.height;
    }

    img.scale(scaleFactor);

    // Center image
    img.left = (canvasWidth - img.getScaledWidth()) / 2;
    img.top = (canvasHeight - img.getScaledHeight()) / 2;

    img.setCoords();

    fabricCanvas.requestRenderAll();
  };

  // Render delete control icon on fabric objects
  const renderDeleteIcon = (ctx, left, top) => {
    ctx.save();
    const radius = 10;
    ctx.beginPath();
    ctx.arc(left, top, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = "#f44336";
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(left - 4, top - 4);
    ctx.lineTo(left + 4, top + 4);
    ctx.moveTo(left + 4, top - 4);
    ctx.lineTo(left - 4, top + 4);
    ctx.stroke();
    ctx.restore();
  };

  // Delete control mouse handler
  const deleteObject = (_eventData, transform) => {
    const target = transform.target;
    const canvasInstance = target.canvas;
    canvasInstance.remove(target);
    canvasInstance.requestRenderAll();
  };

  // Add delete control to fabric object
  const addDeleteControlToObject = (obj) => {
    obj.controls.deleteControl = new fabric.Control({
      x: 0.5,
      y: -0.5,
      offsetY: -10,
      offsetX: 10,
      cursorStyle: "pointer",
      mouseUpHandler: deleteObject,
      render: renderDeleteIcon,
      cornerSize: 20,
    });
  };

  // Add textbox with validation and default centered position
  const addTextbox = (text, isDynamic = false, columnKey = null) => {
    if (dataRows.length === 0 && !backgroundLoaded) {
      setAlert({
        open: true,
        message: "Please upload a background image or an Excel file before adding textboxes.",
        severity: "warning",
      });
      return;
    }
    if (!canvas) return;

    // Position textbox centered horizontally, 1/3 vertically
    const canvasWidth = canvas.getWidth();
    const canvasHeight = canvas.getHeight();
    const textboxWidth = 300;

    const textbox = new fabric.Textbox(text, {
      left: (canvasWidth - textboxWidth) / 2,
      top: canvasHeight / 3,
      width: textboxWidth,
      fontSize,
      fontFamily,
      fill: "#000",
      textAlign: alignment,
      columnKey: isDynamic ? columnKey : undefined,
      editable: true,
      cursorWidth: 2,
    });

    addDeleteControlToObject(textbox);
    canvas.add(textbox);
    canvas.setActiveObject(textbox);
    canvas.requestRenderAll();
  };

  // Handle files dropped (image or Excel)
  const onDrop = (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file || !canvas) return;

    const reader = new FileReader();

    if (file.type.includes("image")) {
      reader.onload = (f) => {
        fabric.Image.fromURL(f.target.result, (img) => {
          const canvasWidth = canvas.getWidth();
          const canvasHeight = canvas.getHeight();

          // Set no stretch, center image
          img.set({ selectable: false, evented: false });

          canvas.setBackgroundImage(img, () => {
            centerBackgroundImage(canvas);
          });
          setBackgroundLoaded(true);
        });
      };
      reader.readAsDataURL(file);
    } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
      reader.onload = (evt) => {
        try {
          const wb = XLSX.read(evt.target.result, { type: "binary" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(ws);

          if (jsonData.length === 0) {
            setColumns([]);
            setDataRows([]);
            setAlert({ open: true, message: "Excel sheet is empty.", severity: "warning" });
            return;
          }

          setColumns(Object.keys(jsonData[0]));
          setDataRows(jsonData);
          setAlert({ open: true, message: "Excel file loaded successfully.", severity: "success" });
        } catch (error) {
          setColumns([]);
          setDataRows([]);
          setAlert({ open: true, message: "Failed to read Excel file.", severity: "error" });
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  const { getRootProps, getInputProps } = useDropzone({ onDrop });

  // Export logic with support for either background-only or with data rows
  const handleExport = async () => {
    if (!canvas || (dataRows.length === 0 && !backgroundLoaded)) {
      setAlert({ open: true, message: "No data to export.", severity: "info" });
      return;
    }

    if (dataRows.length === 0) {
      // Only background image loaded, export single PNG
      const dataUrl = canvas.toDataURL({ format: "png" });
      const blob = await (await fetch(dataUrl)).blob();
      saveAs(blob, "certificate.png");
      setAlert({ open: true, message: "Certificate exported successfully.", severity: "success" });
      return;
    }

    // Export multiple certificates if data rows present
    const zip = new JSZip();

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];

      canvas.getObjects("textbox").forEach((obj) => {
        const key = obj.columnKey;
        if (key && row[key] !== undefined) {
          obj.set("text", String(row[key]));
        }
      });

      canvas.renderAll();

      // Small delay to allow render
      await new Promise((r) => setTimeout(r, 50));

      const dataUrl = canvas.toDataURL({ format: "png" });
      const blob = await (await fetch(dataUrl)).blob();
      zip.file(`certificate_${i + 1}.png`, blob);
    }

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "certificates.zip");
    setAlert({ open: true, message: "Certificates exported successfully.", severity: "success" });
  };

  // Update selected textbox style on fontSize, fontFamily, alignment changes
  useEffect(() => {
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (obj && obj.type === "textbox") {
      obj.set({ fontSize, fontFamily, textAlign: alignment });
      canvas.requestRenderAll();
    }
  }, [fontSize, fontFamily, alignment, canvas]);

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        Certificate Editor
      </Typography>

      <Box
        {...getRootProps()}
        sx={{
          border: "2px dashed #1976d2",
          p: 3,
          my: 2,
          textAlign: "center",
          borderRadius: 2,
          bgcolor: "#e3f2fd",
          cursor: "pointer",
          "&:hover": { bgcolor: "#bbdefb" },
          userSelect: "none",
        }}
      >
        <input {...getInputProps()} />
        <Typography variant="body1" color="text.secondary" sx={{ userSelect: "none" }}>
          Drop background image or Excel file here, or click to browse
        </Typography>
      </Box>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, my: 2 }}>
        <Tooltip
          title={!backgroundLoaded && dataRows.length === 0 ? "Upload background image or Excel file first" : "Add static text"}
        >
          <span>
            <Button
              onClick={() => addTextbox("New Text")}
              variant="outlined"
              startIcon={<TextFields />}
              fullWidth={isMobile}
              disabled={!backgroundLoaded && dataRows.length === 0}
            >
              Add Textbox
            </Button>
          </span>
        </Tooltip>

        {columns.map((col) => (
          <Tooltip
            key={col}
            title={dataRows.length === 0 ? "Upload Excel file first" : `Add column: ${col}`}
          >
            <span>
              <Button
                onClick={() => addTextbox(`[${col}]`, true, col)}
                variant="outlined"
                startIcon={<CropFree />}
                fullWidth={isMobile}
                disabled={dataRows.length === 0}
              >
                Add {col}
              </Button>
            </span>
          </Tooltip>
        ))}
      </Box>

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
          mb: 3,
          alignItems: "center",
        }}
      >
        <FormControl sx={{ minWidth: 160 }}>
          <InputLabel>Text Align</InputLabel>
          <Select
            value={alignment}
            label="Text Align"
            onChange={(e) => setAlignment(e.target.value)}
          >
            <MenuItem value="left">Left</MenuItem>
            <MenuItem value="center">Center</MenuItem>
            <MenuItem value="right">Right</MenuItem>
            <MenuItem value="justify">Justify</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 160 }}>
          <InputLabel>Font Family</InputLabel>
          <Select
            value={fontFamily}
            label="Font Family"
            onChange={(e) => setFontFamily(e.target.value)}
          >
            {FONT_FAMILIES.map((font) => (
              <MenuItem key={font} value={font} style={{ fontFamily: font }}>
                {font}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="Font Size"
          type="number"
          inputProps={{ min: 8, max: 72 }}
          value={fontSize}
          onChange={(e) => {
            const val = Number(e.target.value);
            if (val >= 8 && val <= 72) setFontSize(val);
          }}
          sx={{ width: 120 }}
        />

        <Button
          variant="contained"
          startIcon={<FolderZip />}
          onClick={handleExport}
          disabled={!backgroundLoaded && dataRows.length === 0}
          fullWidth={isMobile}
          sx={{ minWidth: 160 }}
        >
          Export as ZIP
        </Button>
      </Box>

      <Box
        ref={containerRef}
        sx={{
          mt: 3,
          width: "100%",
          maxWidth: 1000,
          border: "1px solid #ccc",
          borderRadius: 2,
          backgroundColor: "#fff",
          p: 1,
          aspectRatio: "1000 / 600",
          overflow: "hidden",
        }}
      >
        <canvas
          id="certificateCanvas"
          ref={canvasRef}
          style={{ display: "block", width: "100%", height: "100%" }}
        />
      </Box>

      <Snackbar
        open={alert.open}
        autoHideDuration={4000}
        onClose={() => setAlert((a) => ({ ...a, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setAlert((a) => ({ ...a, open: false }))}
          severity={alert.severity}
          sx={{ width: "100%" }}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
