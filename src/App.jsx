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
import {
  FolderZip,
  FormatAlignLeft,
  FormatAlignCenter,
  FormatAlignRight,
  FormatAlignJustify,
  CropFree,
  TextFields,
} from "@mui/icons-material";

// Font options (limited for browser-safe fonts)
const FONT_FAMILIES = ["Arial", "Verdana", "Times New Roman", "Georgia", "Courier New", "Tahoma"];

export default function CertificateEditor() {
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

  useEffect(() => {
    const fabricCanvas = new fabric.Canvas("certificateCanvas", {
      preserveObjectStacking: true,
      backgroundColor: "#fff",
    });
    fabricCanvas.setHeight(600);
    fabricCanvas.setWidth(1000);
    setCanvas(fabricCanvas);
  }, []);

  const onDrop = (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file || !canvas) return;

    const reader = new FileReader();

    if (file.type.includes("image")) {
      reader.onload = (f) => {
        fabric.Image.fromURL(f.target.result, (img) => {
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
        const wb = XLSX.read(evt.target.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(ws);
        if (jsonData.length > 0) {
          setColumns(Object.keys(jsonData[0]));
          setDataRows(jsonData);
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  const { getRootProps, getInputProps } = useDropzone({ onDrop });

  const deleteObject = (_eventData, transform) => {
    const canvas = transform.target.canvas;
    canvas.remove(transform.target);
    canvas.requestRenderAll();
  };

  const renderDeleteIcon = (ctx, left, top) => {
    const img = new Image();
    const svg = encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" height="24" width="24" fill="red"><path d="M18.3 5.71 12 12l6.3 6.29-1.42 1.42L10.59 13.4l-6.3 6.3-1.42-1.42L9.17 12 2.88 5.71 4.3 4.29 10.59 10.6l6.3-6.3z"/></svg>`
    );
    img.src = `data:image/svg+xml,${svg}`;
    ctx.save();
    ctx.drawImage(img, left - 12, top - 12, 24, 24);
    ctx.restore();
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
      cornerSize: 24,
    });
  };

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
    });

    addDeleteControlToObject(textbox);
    canvas.add(textbox);
    canvas.setActiveObject(textbox);
    canvas.requestRenderAll();
  };

  const handleExport = async () => {
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
      const dataUrl = canvas.toDataURL({ format: "png" });
      const blob = await (await fetch(dataUrl)).blob();
      zip.file(`certificate_${i + 1}.png`, blob);
    }
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "certificates.zip");
  };

  const updateActiveObjectStyle = () => {
    const obj = canvas?.getActiveObject();
    if (obj && obj.type === "textbox") {
      obj.set({
        fontSize,
        fontFamily,
        textAlign: alignment,
      });
      canvas.requestRenderAll();
    }
  };

  useEffect(() => {
    updateActiveObjectStyle();
  }, [fontSize, fontFamily, alignment]);

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        🎓 Certificate Editor
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
        }}
      >
        <input {...getInputProps()} />
        <Typography variant="body1" color="text.secondary">
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

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
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
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
          sx={{ width: 120 }}
        />

        <Button
          variant="contained"
          startIcon={<FolderZip />}
          onClick={handleExport}
          fullWidth={isMobile}
        >
          Export as ZIP
        </Button>
      </Box>

      <Box sx={{ mt: 3, overflowX: "auto", border: "1px solid #ccc", borderRadius: 2 }}>
        <canvas
          id="certificateCanvas"
          ref={canvasRef}
          style={{ width: "100%", maxWidth: 1000 }}
        />
      </Box>
    </Box>
  );
}
