<<<<<<< HEAD
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
=======
import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Container,
  Box,
  Button,
  Typography,
  CircularProgress,
  Menu,
  MenuItem,
  Slider,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  Switch,
  FormControlLabel,
  Paper,
  Grid,
  Divider,
  Tooltip,
  Alert,
  Snackbar,
  Badge,
  Chip,
  Tabs,
  Tab,
  Avatar,
} from "@mui/material";
import * as XLSX from "xlsx";
import Draggable from "react-draggable";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { useDropzone } from "react-dropzone";
import {
  Add,
  Delete,
  Edit,
  FontDownload,
  Colorize,
  Save,
  Upload,
  Download,
  Visibility,
  VisibilityOff,
  PictureAsPdf,
  InsertDriveFile,
  Settings,
  FolderZip,
  Image,
  TableChart,
  GridView,
} from "@mui/icons-material";
import { ChromePicker } from "react-color";
>>>>>>> 5588743da0dfd984820041ab15c7e35c559b6032

export default function CertificateEditor() {
  const canvasRef = useRef(null);
  const [canvas, setCanvas] = useState(null);
  const [columns, setColumns] = useState([]);
  const [dataRows, setDataRows] = useState([]);
  const [alignment, setAlignment] = useState("center");
  const backgroundRef = useRef(null);

<<<<<<< HEAD
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
=======
  // State
  const [bgImage, setBgImage] = useState(null);
  const [fields, setFields] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  const [customText, setCustomText] = useState("");
  const [previewMode, setPreviewMode] = useState(false);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const [canvasDimensions, setCanvasDimensions] = useState({
    width: 800,
    height: 600,
  });

  const [settings, setSettings] = useState({
    pageSize: "a4",
    orientation: "landscape",
    exportFormat: "pdf",
    exportMethod: "zip",
    imageQuality: 1.0,
  });

  // Context Menu
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState(null);

  // Calculate canvas dimensions based on settings
  useEffect(() => {
    if (settings.pageSize === "a4") {
      if (settings.orientation === "landscape") {
        setCanvasDimensions({ width: 1030, height: 793 }); // A4 landscape in pixels (96dpi)
      } else {
        setCanvasDimensions({ width: 793, height: 1122 }); // A4 portrait
      }
    } else if (settings.pageSize === "letter") {
      if (settings.orientation === "landscape") {
        setCanvasDimensions({ width: 1056, height: 816 }); // Letter landscape
      } else {
        setCanvasDimensions({ width: 816, height: 1056 }); // Letter portrait
      }
    }
  }, [settings.pageSize, settings.orientation]);

  // Handle image load to get natural dimensions
  const handleImageLoad = (e) => {
    if (e.target.naturalWidth && e.target.naturalHeight) {
      const ratio = Math.min(
        canvasDimensions.width / e.target.naturalWidth,
        canvasDimensions.height / e.target.naturalHeight
      );
      const width = e.target.naturalWidth * ratio;
      const height = e.target.naturalHeight * ratio;

      // Update fields positions to match new dimensions
      setFields((prev) =>
        prev.map((field) => ({
          ...field,
          x: (field.x / canvasDimensions.width) * width,
          y: (field.y / canvasDimensions.height) * height,
        }))
      );

      setCanvasDimensions({ width, height });
    }
  };

  // Dropzone for file upload
  const onDrop = useCallback(
    (acceptedFiles) => {
      if (!acceptedFiles || acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      const ext = file.name.split(".").pop().toLowerCase();

      if (["jpg", "jpeg", "png"].includes(ext)) {
        if (file.size > 5 * 1024 * 1024) {
          setSnackbar({
            open: true,
            message: "Image file too large. Max 5MB.",
            severity: "error",
          });
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          setBgImage(reader.result);
          setSnackbar({
            open: true,
            message: "Background image uploaded!",
            severity: "success",
          });
        };
        reader.readAsDataURL(file);
      } else if (["xlsx", "xls", "csv"].includes(ext)) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const wb = XLSX.read(evt.target.result, { type: "binary" });
            const sheet = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet);
            setData(rows);

            // Create fields from column headers if no fields exist
            if (fields.length === 0) {
              const headers = Object.keys(rows[0] || {});
              const initialFields = headers.map((header, index) => ({
                id: `field_${Date.now()}_${index}`,
                text: header,
                x: canvasDimensions.width * 0.1,
                y:
                  canvasDimensions.height * 0.1 +
                  index * (canvasDimensions.height * 0.08),
                fontSize: Math.floor(canvasDimensions.width * 0.02),
                color: "#000000",
                fontWeight: "bold",
              }));
              setFields(initialFields);
            }
            setSnackbar({
              open: true,
              message: `Loaded ${rows.length} records from Excel`,
              severity: "success",
            });
          } catch (e) {
            setSnackbar({
              open: true,
              message: "Error parsing Excel file",
              severity: "error",
            });
          }
        };
        reader.readAsBinaryString(file);
      } else {
        setSnackbar({
          open: true,
          message: "Unsupported file type",
          severity: "error",
        });
      }
    },
    [fields.length, canvasDimensions]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      "image/*": [".jpg", ".jpeg", ".png"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "application/vnd.ms-excel": [".xls"],
      "text/csv": [".csv"],
    },
  });

  // Field management
  const addCustomField = () => {
    if (!customText.trim()) return;
    const newField = {
      id: `custom_${Date.now()}`,
      text: customText,
      x: canvasDimensions.width * 0.1,
      y:
        canvasDimensions.height * 0.1 +
        fields.length * (canvasDimensions.height * 0.08),
      fontSize: Math.floor(canvasDimensions.width * 0.02),
      color: "#000000",
      fontWeight: "normal",
    };
    setFields([...fields, newField]);
    setCustomText("");
    setSnackbar({ open: true, message: "Field added!", severity: "success" });
  };

  const updateFieldPosition = (id, x, y) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, x, y } : f)));
>>>>>>> 5588743da0dfd984820041ab15c7e35c559b6032
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

<<<<<<< HEAD
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
=======
  const handleDeleteField = () => {
    setFields((prev) => prev.filter((f) => f.id !== selectedFieldId));
    handleCloseContextMenu();
    setSnackbar({ open: true, message: "Field deleted", severity: "info" });
  };

  const handleFontSizeChange = (_, newSize) => {
    setFields((prev) =>
      prev.map((f) =>
        f.id === selectedFieldId ? { ...f, fontSize: newSize } : f
      )
    );
  };

  const handleColorChange = (color) => {
    setFields((prev) =>
      prev.map((f) =>
        f.id === selectedFieldId ? { ...f, color: color.hex } : f
      )
    );
  };

  const handleEditField = () => {
    const field = fields.find((f) => f.id === selectedFieldId);
    if (field) {
      setEditingField({ ...field });
      setEditDialogOpen(true);
    }
    handleCloseContextMenu();
  };

  const saveFieldEdit = () => {
    setFields((prev) =>
      prev.map((f) => (f.id === editingField.id ? editingField : f))
    );
    setEditDialogOpen(false);
    setSnackbar({ open: true, message: "Field updated", severity: "success" });
  };

  // Image/PDF Generation
  const generateCertificate = async (rowData, index) => {
    // Update fields with current row data
    setFields((prev) =>
      prev.map((f) => ({ ...f, displayText: rowData[f.text] || f.text }))
    );

    // Wait for DOM to update
    await new Promise((r) => setTimeout(r, 100));

    // Capture the canvas
    const canvas = await html2canvas(certRef.current, {
      scale: 2,
      backgroundColor: null,
      logging: false,
      useCORS: true,
      allowTaint: true,
      width: canvasDimensions.width,
      height: canvasDimensions.height,
    });

    const name = rowData.Name || rowData.name || `certificate_${index + 1}`;

    if (settings.exportFormat === "png") {
      return { blob: await canvasToBlob(canvas), name: `${name}.png` };
    } else {
      const pdf = new jsPDF(settings.orientation, undefined, settings.pageSize);
      const imgData = canvas.toDataURL("image/png", settings.imageQuality);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      return { blob: pdf.output("blob"), name: `${name}.pdf` };
    }
  };

  const canvasToBlob = (canvas) => {
    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          resolve(blob);
        },
        "image/png",
        settings.imageQuality
      );
>>>>>>> 5588743da0dfd984820041ab15c7e35c559b6032
    });

    addDeleteControlToObject(textbox);

    canvas.add(label);
    canvas.add(textbox);
    canvas.setActiveObject(textbox);
    canvas.requestRenderAll();
  };

<<<<<<< HEAD
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
=======
  // Export functions
  const exportSingle = async (index) => {
    if (!bgImage || fields.length === 0 || data.length === 0) {
      setSnackbar({
        open: true,
        message: "Upload image and Excel file first",
        severity: "error",
      });
      return;
    }

    setLoading(true);
    try {
      const { blob, name } = await generateCertificate(data[index], index);
      saveAs(blob, name);
      setSnackbar({
        open: true,
        message: "Certificate exported!",
        severity: "success",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Error exporting certificate",
        severity: "error",
      });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const exportAll = async () => {
    if (!bgImage || fields.length === 0 || data.length === 0) {
      setSnackbar({
        open: true,
        message: "Upload image and Excel file first",
        severity: "error",
      });
      return;
    }

    setLoading(true);

    try {
      if (settings.exportMethod === "zip") {
        const zip = new JSZip();
        const folder = zip.folder("certificates");

        for (let i = 0; i < data.length; i++) {
          const { blob, name } = await generateCertificate(data[i], i);
          folder.file(name, blob);
        }

        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, "certificates.zip");
        setSnackbar({
          open: true,
          message: `Exported ${data.length} certificates as ZIP`,
          severity: "success",
        });
      } else {
        // Single PDF export
        const pdf = new jsPDF(
          settings.orientation,
          undefined,
          settings.pageSize
        );

        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          setFields((prev) =>
            prev.map((f) => ({ ...f, displayText: row[f.text] || f.text }))
          );
          await new Promise((r) => setTimeout(r, 100));

          const canvas = await html2canvas(certRef.current, {
            scale: 2,
            backgroundColor: null,
            width: canvasDimensions.width,
            height: canvasDimensions.height,
          });

          const imgData = canvas.toDataURL("image/png", settings.imageQuality);
          if (i > 0) pdf.addPage();

          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
        }

        pdf.save("merged_certificates.pdf");
        setSnackbar({
          open: true,
          message: `Merged ${data.length} certificates into PDF`,
          severity: "success",
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Error during export",
        severity: "error",
      });
      console.error(error);
    } finally {
      setLoading(false);
>>>>>>> 5588743da0dfd984820041ab15c7e35c559b6032
    }
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "certificates.zip");
  };

<<<<<<< HEAD
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
=======
  // Layout management
  const saveLayout = () => {
    const layout = {
      fields,
      bgImage,
      settings,
      canvasDimensions,
    };
    const blob = new Blob([JSON.stringify(layout)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "certificate_layout.json";
    a.click();
    setSnackbar({ open: true, message: "Layout saved", severity: "success" });
  };

  const loadLayout = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const layout = JSON.parse(e.target.result);
        setFields(layout.fields || []);
        setBgImage(layout.bgImage || null);
        setSettings(layout.settings || settings);
        setCanvasDimensions(layout.canvasDimensions || canvasDimensions);
        setSnackbar({
          open: true,
          message: "Layout loaded",
          severity: "success",
        });
      } catch (err) {
        setSnackbar({
          open: true,
          message: "Error loading layout file",
          severity: "error",
        });
      }
    };
    reader.readAsText(file);
  };

  // Preview management
  const updatePreview = (index) => {
    if (index >= 0 && index < data.length) {
      setCurrentPreviewIndex(index);
      setFields((prev) =>
        prev.map((f) => ({ ...f, displayText: data[index][f.text] || f.text }))
      );
    }
  };

  // Selected field helpers
  const selectedField = fields.find((f) => f.id === selectedFieldId);

  return (
    <Container maxWidth="xl" sx={{ my: 2 }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Avatar sx={{ bgcolor: "primary.main" }}>
            <PictureAsPdf />
          </Avatar>
          <Typography variant="h4" sx={{ fontWeight: "bold" }}>
            Certificate Generator
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="Save current layout">
            {/* <Button variant="outlined" startIcon={<Save />} onClick={saveLayout} color="secondary">
              Save Layout
            </Button> */}
          </Tooltip>
          <input
            type="file"
            ref={layoutInputRef}
            onChange={loadLayout}
            accept=".json"
            style={{ display: "none" }}
          />
          {/* <Button
            variant="contained"
            startIcon={<Upload />}
            onClick={() => layoutInputRef.current.click()}
            color="secondary"
          >
            Load Layout
          </Button> */}
        </Box>
      </Box>

      {/* Main Content */}
      <Grid container spacing={2}>
        {/* Left Panel - Controls */}
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
            <Tabs
              value={activeTab}
              onChange={(_, newValue) => setActiveTab(newValue)}
              variant="fullWidth"
              sx={{ mb: 2 }}
            >
              <Tab icon={<Image />} label="Template" />
              <Tab icon={<TableChart />} label="Data" />
              <Tab icon={<Settings />} label="Settings" />
            </Tabs>

            {activeTab === 0 && (
              <Box>
                <Typography
                  variant="subtitle2"
                  gutterBottom
                  sx={{ fontWeight: "bold" }}
                >
                  Upload Certificate Template
                </Typography>
                <Box
                  {...getRootProps()}
                  sx={{
                    border: "2px dashed",
                    borderColor: isDragActive ? "primary.main" : "divider",
                    p: 3,
                    borderRadius: 1,
                    textAlign: "center",
                    cursor: "pointer",
                    backgroundColor: isDragActive
                      ? "action.hover"
                      : "background.paper",
                    mb: 2,
                  }}
                >
                  <input {...getInputProps()} />
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <Upload fontSize="large" />
                    <Typography>
                      {isDragActive
                        ? "Drop image here"
                        : "Drag & drop template image"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      JPG, PNG (Max 5MB)
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Typography
                  variant="subtitle2"
                  gutterBottom
                  sx={{ fontWeight: "bold" }}
                >
                  Manage Fields
                </Typography>
                <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                  <TextField
                    fullWidth
                    size="small"
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    placeholder="New field text"
                    onKeyPress={(e) => e.key === "Enter" && addCustomField()}
                  />
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={addCustomField}
                    disabled={!customText.trim()}
                  >
                    Add
                  </Button>
                </Box>

                {fields.length > 0 && (
                  <Paper
                    elevation={1}
                    sx={{ p: 1, maxHeight: 300, overflow: "auto" }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ ml: 1 }}
                    >
                      {fields.length} fields (click to select)
                    </Typography>
                    {fields.map((field) => (
                      <Paper
                        key={field.id}
                        sx={{
                          p: 1,
                          mb: 1,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          backgroundColor:
                            selectedFieldId === field.id
                              ? "action.selected"
                              : "background.paper",
                          cursor: "pointer",
                        }}
                        onClick={() => setSelectedFieldId(field.id)}
                      >
                        <Box
                          sx={{ overflow: "hidden", textOverflow: "ellipsis" }}
                        >
                          <Typography variant="body2" fontWeight="bold" noWrap>
                            {field.text}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {field.fontSize}px | {field.fontWeight} |{" "}
                            {field.color}
                          </Typography>
                        </Box>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFieldId(field.id);
                            setEditingField(field);
                            setEditDialogOpen(true);
                          }}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                      </Paper>
                    ))}
                  </Paper>
                )}
              </Box>
            )}

            {activeTab === 1 && (
              <Box>
                <Typography
                  variant="subtitle2"
                  gutterBottom
                  sx={{ fontWeight: "bold" }}
                >
                  Upload Data Source
                </Typography>
                <Box
                  {...getRootProps()}
                  sx={{
                    border: "2px dashed",
                    borderColor: isDragActive ? "primary.main" : "divider",
                    p: 3,
                    borderRadius: 1,
                    textAlign: "center",
                    cursor: "pointer",
                    backgroundColor: isDragActive
                      ? "action.hover"
                      : "background.paper",
                    mb: 2,
                  }}
                >
                  <input {...getInputProps()} />
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <InsertDriveFile fontSize="large" />
                    <Typography>
                      {isDragActive
                        ? "Drop file here"
                        : "Drag & drop Excel/CSV"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      XLSX, CSV (Column headers become fields)
                    </Typography>
                  </Box>
                </Box>

                {data.length > 0 && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography
                      variant="subtitle2"
                      gutterBottom
                      sx={{ fontWeight: "bold" }}
                    >
                      Data Preview ({data.length} records)
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        gap: 1,
                        alignItems: "center",
                        mb: 2,
                      }}
                    >
                      <Button
                        variant="outlined"
                        startIcon={
                          previewMode ? <VisibilityOff /> : <Visibility />
                        }
                        onClick={() => setPreviewMode(!previewMode)}
                        fullWidth
                      >
                        {previewMode ? "Stop Preview" : "Preview Mode"}
                      </Button>

                      {previewMode && (
                        <Button
                          variant="outlined"
                          onClick={() => exportSingle(currentPreviewIndex)}
                          startIcon={<Download />}
                          disabled={loading}
                        >
                          Export Current
                        </Button>
                      )}
                    </Box>

                    {previewMode && (
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          mb: 2,
                        }}
                      >
                        <IconButton
                          onClick={() => updatePreview(currentPreviewIndex - 1)}
                          disabled={currentPreviewIndex === 0}
                          size="small"
                        >
                          <Typography variant="h6">◀</Typography>
                        </IconButton>
                        <Typography
                          variant="body2"
                          sx={{ flexGrow: 1, textAlign: "center" }}
                        >
                          Record {currentPreviewIndex + 1} of {data.length}
                        </Typography>
                        <IconButton
                          onClick={() => updatePreview(currentPreviewIndex + 1)}
                          disabled={currentPreviewIndex === data.length - 1}
                          size="small"
                        >
                          <Typography variant="h6">▶</Typography>
                        </IconButton>
                      </Box>
                    )}

                    <Paper
                      elevation={1}
                      sx={{ p: 1, maxHeight: 200, overflow: "auto" }}
                    >
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ ml: 1 }}
                      >
                        First row preview:
                      </Typography>
                      {data[0] &&
                        Object.entries(data[0]).map(([key, value]) => (
                          <Typography
                            key={key}
                            variant="body2"
                            sx={{ fontFamily: "monospace" }}
                          >
                            <strong>{key}:</strong> {String(value)}
                          </Typography>
                        ))}
                    </Paper>
                  </>
                )}
              </Box>
            )}

            {activeTab === 2 && (
              <Box>
                <Typography
                  variant="subtitle2"
                  gutterBottom
                  sx={{ fontWeight: "bold" }}
                >
                  Page Settings
                </Typography>
                <Grid container spacing={1} sx={{ mb: 2 }}>
                  <Grid item xs={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Page Size</InputLabel>
                      <Select
                        value={settings.pageSize}
                        label="Page Size"
                        onChange={(e) =>
                          setSettings({ ...settings, pageSize: e.target.value })
                        }
                      >
                        <MenuItem value="a4">A4</MenuItem>
                        <MenuItem value="letter">Letter</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Orientation</InputLabel>
                      <Select
                        value={settings.orientation}
                        label="Orientation"
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            orientation: e.target.value,
                          })
                        }
                      >
                        <MenuItem value="landscape">Landscape</MenuItem>
                        <MenuItem value="portrait">Portrait</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 2 }} />

                <Typography
                  variant="subtitle2"
                  gutterBottom
                  sx={{ fontWeight: "bold" }}
                >
                  Export Settings
                </Typography>
                <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                  <InputLabel>Export Format</InputLabel>
                  <Select
                    value={settings.exportFormat}
                    label="Export Format"
                    onChange={(e) =>
                      setSettings({ ...settings, exportFormat: e.target.value })
                    }
                  >
                    <MenuItem value="pdf">PDF</MenuItem>
                    <MenuItem value="png">PNG Image</MenuItem>
                  </Select>
                </FormControl>

                {settings.exportFormat === "pdf" && (
                  <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                    <InputLabel>Export Method</InputLabel>
                    <Select
                      value={settings.exportMethod}
                      label="Export Method"
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          exportMethod: e.target.value,
                        })
                      }
                    >
                      <MenuItem value="zip">Multiple files (ZIP)</MenuItem>
                      <MenuItem value="merge">Single merged PDF</MenuItem>
                    </Select>
                  </FormControl>
                )}

                <Typography
                  variant="subtitle2"
                  gutterBottom
                  sx={{ mt: 1, fontWeight: "bold" }}
                >
                  Image Quality
                </Typography>
                <Slider
                  value={settings.imageQuality * 100}
                  onChange={(_, value) =>
                    setSettings({ ...settings, imageQuality: value / 100 })
                  }
                  min={50}
                  max={100}
                  step={5}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => `${value}%`}
                  sx={{ width: "95%", mx: "auto" }}
                />
              </Box>
            )}

            <Divider sx={{ my: 2 }} />

            <Button
              variant="contained"
              color="primary"
              startIcon={<FolderZip />}
              onClick={exportAll}
              disabled={
                loading || !bgImage || fields.length === 0 || data.length === 0
              }
              fullWidth
              size="large"
              sx={{ py: 1.5 }}
            >
              {loading ? (
                <>
                  <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />
                  Exporting...
                </>
              ) : (
                `Export All (${data.length || 0})`
              )}
            </Button>
          </Paper>
        </Grid>

        {/* Right Panel - Certificate Canvas */}
        <Grid item xs={12} md={8}>
          <Paper
            elevation={3}
            sx={{
              p: 2,
              height: "calc(100vh - 120px)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Typography variant="h6">Certificate Design</Typography>
              <Chip
                label={
                  bgImage
                    ? `Template: ${Math.round(
                        canvasDimensions.width
                      )}×${Math.round(canvasDimensions.height)}px`
                    : "No Template"
                }
                color={bgImage ? "success" : "default"}
                size="small"
                avatar={
                  <Avatar
                    sx={{ bgcolor: bgImage ? "success.main" : "default" }}
                  >
                    {bgImage ? <Image /> : <GridView />}
                  </Avatar>
                }
              />
            </Box>

            <Box
              ref={canvasContainerRef}
              sx={{
                flexGrow: 1,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                overflow: "auto",
                backgroundColor: "action.hover",
                borderRadius: 1,
                p: 1,
              }}
            >
              <Box
                ref={certRef}
                sx={{
                  position: "relative",
                  width: canvasDimensions.width,
                  height: canvasDimensions.height,
                  border: "1px solid",
                  borderColor: "divider",
                  backgroundColor: "background.paper",
                  overflow: "hidden",
                  boxShadow: 3,
                }}
              >
                {bgImage && (
                  <img
                    src={bgImage}
                    alt="Certificate template"
                    style={{
                      position: "absolute",
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      pointerEvents: "none",
                    }}
                    onLoad={handleImageLoad}
                  />
                )}
                {fields.map((field) => (
                  <Draggable
                    key={field.id}
                    position={{ x: field.x, y: field.y }}
                    onStop={(_, data) =>
                      updateFieldPosition(field.id, data.x, data.y)
                    }
                    bounds="parent"
                    disabled={previewMode}
                  >
                    <Box
                      onContextMenu={(e) => handleContextMenu(e, field.id)}
                      sx={{
                        position: "absolute",
                        fontSize: `${field.fontSize}px`,
                        fontWeight: field.fontWeight,
                        color: field.color,
                        px: 1,
                        backgroundColor: previewMode
                          ? "transparent"
                          : "rgba(255,255,255,0.7)",
                        borderRadius: 1,
                        cursor: previewMode ? "default" : "move",
                        border:
                          selectedFieldId === field.id
                            ? "1px dashed #555"
                            : "none",
                        userSelect: "none",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {field.displayText || field.text}
                    </Box>
                  </Draggable>
                ))}
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Context Menu */}
      <Menu
        open={Boolean(contextMenu)}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem onClick={handleEditField}>
          <Edit fontSize="small" sx={{ mr: 1 }} /> Edit Field
        </MenuItem>
        <MenuItem onClick={() => setColorPickerOpen(true)}>
          <Colorize fontSize="small" sx={{ mr: 1 }} /> Change Color
        </MenuItem>
        <MenuItem disableRipple>
          <Box sx={{ display: "flex", alignItems: "center", width: 200 }}>
            <FontDownload fontSize="small" sx={{ mr: 1 }} />
            <Slider
              min={8}
              max={72}
              step={1}
              value={selectedField?.fontSize || 24}
              onChange={handleFontSizeChange}
              aria-labelledby="font-size-slider"
            />
          </Box>
        </MenuItem>
        <MenuItem onClick={handleDeleteField} sx={{ color: "error.main" }}>
          <Delete fontSize="small" sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>

      {/* Color Picker Dialog */}
      {colorPickerOpen && (
        <Dialog
          open={colorPickerOpen}
          onClose={() => setColorPickerOpen(false)}
        >
          <DialogTitle>Select Text Color</DialogTitle>
          <DialogContent>
            <ChromePicker
              color={selectedField?.color || "#000000"}
              onChangeComplete={handleColorChange}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setColorPickerOpen(false)}>Done</Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Edit Field Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>Edit Field</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="dense"
            label="Field Text"
            value={editingField?.text || ""}
            onChange={(e) =>
              setEditingField({ ...editingField, text: e.target.value })
            }
          />
          <Box sx={{ mt: 2, display: "flex", gap: 2 }}>
            <FormControl fullWidth margin="dense">
              <InputLabel>Font Weight</InputLabel>
              <Select
                value={editingField?.fontWeight || "normal"}
                label="Font Weight"
                onChange={(e) =>
                  setEditingField({
                    ...editingField,
                    fontWeight: e.target.value,
                  })
                }
              >
                <MenuItem value="normal">Normal</MenuItem>
                <MenuItem value="bold">Bold</MenuItem>
                <MenuItem value="lighter">Light</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              margin="dense"
              label="Font Size"
              type="number"
              value={editingField?.fontSize || 24}
              onChange={(e) =>
                setEditingField({
                  ...editingField,
                  fontSize: parseInt(e.target.value),
                })
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={saveFieldEdit} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Loading Indicator */}
      {loading && (
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.7)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
            color: "white",
          }}
        >
          <CircularProgress size={80} thickness={4} color="inherit" />
          <Typography variant="h5" sx={{ mt: 3 }}>
            Generating Certificates...
          </Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            Please wait while we process your request
          </Typography>
          <Typography variant="caption" sx={{ mt: 2 }}>
            This may take a while for large batches
          </Typography>
        </Box>
      )}

      {/* Snackbar Notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
          variant="filled"
>>>>>>> 5588743da0dfd984820041ab15c7e35c559b6032
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
