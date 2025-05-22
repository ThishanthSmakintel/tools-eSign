import React, { useEffect, useRef, useState } from "react";
import { fabric } from "fabric";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { useDropzone } from "react-dropzone";
import {
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  FolderZip,
  FormatAlignLeft,
  FormatAlignCenter,
  FormatAlignRight,
  FormatAlignJustify,
  CropFree,
  Close,
} from "@mui/icons-material";

export default function CertificateEditor() {
  const canvasRef = useRef(null);
  const [canvas, setCanvas] = useState(null);
  const [columns, setColumns] = useState([]);
  const [dataRows, setDataRows] = useState([]);
  const [alignment, setAlignment] = useState("center");
  const backgroundRef = useRef(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    const c = new fabric.Canvas("certificateCanvas", {
      preserveObjectStacking: true,
      backgroundColor: "#fff",
    });
    c.setHeight(600);
    c.setWidth(1000);
    setCanvas(c);
  }, []);

  const onDrop = (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.type.includes("image")) {
      const reader = new FileReader();
      reader.onload = function (f) {
        fabric.Image.fromURL(f.target.result, (img) => {
          const scaleX = 1000 / img.width;
          const scaleY = 600 / img.height;
          img.set({
            scaleX,
            scaleY,
            selectable: false,
            evented: false,
          });
          canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
          backgroundRef.current = img;
        });
      };
      reader.readAsDataURL(file);
    } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
      const reader = new FileReader();
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

  const getMinimumTextboxWidth = (key, fontSize = 24, fontFamily = "Arial") => {
    if (!dataRows.length) return 200;
    const canvasMeasure = document.createElement("canvas");
    const ctx = canvasMeasure.getContext("2d");
    ctx.font = `${fontSize}px ${fontFamily}`;
    let maxWidth = 0;
    dataRows.forEach((row) => {
      const value = row[key] ? String(row[key]) : "";
      const metrics = ctx.measureText(value);
      if (metrics.width > maxWidth) maxWidth = metrics.width;
    });
    return maxWidth + 20;
  };

  function deleteObject(_eventData, transform) {
    const canvas = transform.target.canvas;
    canvas.remove(transform.target);
    canvas.requestRenderAll();
  }

  function renderDeleteIcon(ctx, left, top) {
    const img = new Image();
    const svg = encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" height="24" width="24" fill="red"><path d="M18.3 5.71 12 12l6.3 6.29-1.42 1.42L10.59 13.4l-6.3 6.3-1.42-1.42L9.17 12 2.88 5.71 4.3 4.29 10.59 10.6l6.3-6.3z"/></svg>`
    );
    img.src = `data:image/svg+xml,${svg}`;
    ctx.save();
    ctx.drawImage(img, left - 12, top - 12, 24, 24);
    ctx.restore();
  }

  function addDeleteControlToObject(obj) {
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
    obj.setControlsVisibility({ deleteControl: true });
    obj.hasControls = true;
    obj.hasBorders = true;
  }

  const addColumnControls = (columnKey) => {
    const label = new fabric.Text(columnKey, {
      left: 50,
      top: 50,
      fontSize: 16,
      fill: "gray",
      selectable: false,
    });

    const textbox = new fabric.Textbox(`[${columnKey}]`, {
      left: 50,
      top: 80,
      width: getMinimumTextboxWidth(columnKey),
      fontSize: 24,
      fill: "#000",
      textAlign: alignment,
      borderColor: "blue",
      cornerColor: "blue",
      cornerSize: 10,
      transparentCorners: false,
      rotatingPointOffset: 30,
      hasRotatingPoint: true,
      lockScalingFlip: true,
      columnKey,
    });

    addDeleteControlToObject(textbox);

    canvas.add(label);
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

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
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
          Drag & drop background image or Excel file here, or click to select
        </Typography>
      </Box>

      <Box
        sx={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: 2,
          flexWrap: "wrap",
          my: 2,
        }}
      >
        {columns.map((col) => (
          <Button
            key={col}
            onClick={() => addColumnControls(col)}
            variant="outlined"
            startIcon={<CropFree />}
            fullWidth={isMobile}
          >
            Add {col}
          </Button>
        ))}
      </Box>

      <FormControl sx={{ minWidth: 160, mr: 2, mb: 2 }}>
        <InputLabel>Text Align</InputLabel>
        <Select
          value={alignment}
          label="Text Align"
          onChange={(e) => setAlignment(e.target.value)}
        >
          <MenuItem value="left">
            <FormatAlignLeft /> Left
          </MenuItem>
          <MenuItem value="center">
            <FormatAlignCenter /> Center
          </MenuItem>
          <MenuItem value="right">
            <FormatAlignRight /> Right
          </MenuItem>
          <MenuItem value="justify">
            <FormatAlignJustify /> Justify
          </MenuItem>
        </Select>
      </FormControl>

      <Button
        variant="contained"
        startIcon={<FolderZip />}
        onClick={handleExport}
        sx={{ mt: 1 }}
        fullWidth={isMobile}
      >
        Export Certificates as ZIP
      </Button>

      <Box sx={{ mt: 3, overflowX: "auto" }}>
        <canvas
          id="certificateCanvas"
          ref={canvasRef}
          style={{
            border: "1px solid #ccc",
            width: "100%",
            maxWidth: 1000,
          }}
        />
      </Box>
    </Box>
  );
}
