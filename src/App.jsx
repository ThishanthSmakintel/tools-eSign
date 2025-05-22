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
  const backgroundRef = useRef(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Setup Fabric canvas and handle resizing
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      preserveObjectStacking: true,
      backgroundColor: "#fff",
      selection: true,
    });

    setCanvas(fabricCanvas);

    // Resize canvas function to keep 1000x600 aspect ratio
    const resizeCanvas = () => {
      if (!containerRef.current) return;

      const containerWidth = containerRef.current.clientWidth;
      const calculatedHeight = (containerWidth * 600) / 1000;

      fabricCanvas.setWidth(containerWidth);
      fabricCanvas.setHeight(calculatedHeight);

      if (backgroundRef.current) {
        const img = backgroundRef.current;
        img.scaleToWidth(containerWidth);
        img.scaleToHeight(calculatedHeight);
      }

      fabricCanvas.calcOffset();
      fabricCanvas.renderAll();
    };

    resizeCanvas();

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      fabricCanvas.dispose();
      setCanvas(null);
    };
  }, []);

  // Delete control icon rendering
  const renderDeleteIcon = (ctx, left, top) => {
    ctx.save();
  
    const radius = 10;
  
    // Draw circular red button
    ctx.beginPath();
    ctx.arc(left, top, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = "#f44336"; // MUI red
    ctx.fill();
  
    // Draw white "X"
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
  

  const deleteObject = (_eventData, transform) => {
    const target = transform.target;
    const canvas = target.canvas;
    canvas.remove(target);
    canvas.requestRenderAll();
  };

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

  // Add a textbox — static or dynamic based on Excel column
  const addTextbox = (text, isDynamic = false, columnKey = null) => {
    if (!canvas) return;

    const textbox = new fabric.Textbox(text, {
      left: 100,
      top: 100,
      width: 300,
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

  // File drop handler
  const onDrop = (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file || !canvas) return;

    const reader = new FileReader();

    if (file.type.includes("image")) {
      reader.onload = (f) => {
        fabric.Image.fromURL(f.target.result, (img) => {
          // Scale image to fit canvas dimensions
          const scaleX = canvas.width / img.width;
          const scaleY = canvas.height / img.height;
          img.set({ scaleX, scaleY, selectable: false, evented: false });
          canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
          backgroundRef.current = img;
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
            alert("Excel sheet is empty.");
            return;
          }

          setColumns(Object.keys(jsonData[0]));
          setDataRows(jsonData);
        } catch (error) {
          alert("Failed to read Excel file.");
          setColumns([]);
          setDataRows([]);
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  const { getRootProps, getInputProps } = useDropzone({ onDrop });

  // Export all certificates as a ZIP of PNGs
  const handleExport = async () => {
    if (!canvas || dataRows.length === 0) {
      alert("No data to export.");
      return;
    }

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

      await new Promise((r) => setTimeout(r, 50));

      const dataUrl = canvas.toDataURL({ format: "png" });
      const blob = await (await fetch(dataUrl)).blob();
      zip.file(`certificate_${i + 1}.png`, blob);
    }

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "certificates.zip");
  };

  // Update selected textbox style on font/alignment change
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
        <Tooltip title="Add static text">
          <Button
            onClick={() => addTextbox("New Text")}
            variant="outlined"
            startIcon={<TextFields />}
            fullWidth={isMobile}
          >
            Add Textbox
          </Button>
        </Tooltip>

        {columns.map((col) => (
          <Button
            key={col}
            onClick={() => addTextbox(`[${col}]`, true, col)}
            variant="outlined"
            startIcon={<CropFree />}
            fullWidth={isMobile}
          >
            Add {col}
          </Button>
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
          disabled={dataRows.length === 0}
          fullWidth={isMobile}
          sx={{ minWidth: 160 }}
        >
          Export as ZIP
        </Button>
      </Box>

      {/* Container with fixed aspect ratio holding the canvas */}
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
    </Box>
  );
}
