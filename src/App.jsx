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
  Paper,
  Grid,
  Stack,
  ToggleButtonGroup,
  ToggleButton,
  Card,
  CardContent,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Divider,
  ButtonGroup,
} from "@mui/material";
import {
  FolderZip,
  TextFields,
  CropFree,
  FormatAlignLeft,
  FormatAlignCenter,
  FormatAlignRight,
  FormatAlignJustify,
  Delete,
  Upload,
  Add,
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  FormatColorText,
  Preview,
  RestartAlt,
  ChevronLeft,
  ChevronRight,
  InsertDriveFile,
} from "@mui/icons-material";

const FONT_FAMILIES = [
  "Arial",
  "Verdana",
  "Times New Roman",
  "Georgia",
  "Courier New",
  "Tahoma",
  "Roboto",
  "Open Sans",
  "Montserrat",
  "Lato",
  "Poppins",
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
  const [fontWeight, setFontWeight] = useState("normal");
  const [fontStyle, setFontStyle] = useState("normal");
  const [textDecoration, setTextDecoration] = useState("");
  const [textColor, setTextColor] = useState("#000000");
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [exportType, setExportType] = useState("single");

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [alert, setAlert] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  // Toggle font weight (bold)
  const toggleBold = () => {
    setFontWeight(fontWeight === "bold" ? "normal" : "bold");
  };

  // Toggle font style (italic)
  const toggleItalic = () => {
    setFontStyle(fontStyle === "italic" ? "normal" : "italic");
  };

  // Initialize Fabric canvas
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      preserveObjectStacking: true,
      backgroundColor: "transparent",
      selection: true,
    });

    setCanvas(fabricCanvas);

    const resizeCanvas = () => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.clientWidth;
      const calculatedHeight = (containerWidth * 600) / 1000;
      fabricCanvas.setWidth(containerWidth);
      fabricCanvas.setHeight(calculatedHeight);
      if (fabricCanvas.backgroundImage) {
        centerBackgroundImage(fabricCanvas);
      }
      fabricCanvas.calcOffset();
      fabricCanvas.requestRenderAll();
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

  const centerBackgroundImage = (fabricCanvas) => {
    const img = fabricCanvas.backgroundImage;
    if (!img) return;

    const canvasWidth = fabricCanvas.getWidth();
    const canvasHeight = fabricCanvas.getHeight();

    img.scaleX = 1;
    img.scaleY = 1;

    const imgRatio = img.width / img.height;
    const canvasRatio = canvasWidth / canvasHeight;

    let scaleFactor =
      imgRatio > canvasRatio
        ? canvasWidth / img.width
        : canvasHeight / img.height;

    img.scale(scaleFactor);
    img.left = (canvasWidth - img.getScaledWidth()) / 2;
    img.top = (canvasHeight - img.getScaledHeight()) / 2;
    img.setCoords();
    fabricCanvas.requestRenderAll();
  };

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

  const deleteObject = (_eventData, transform) => {
    const target = transform.target;
    const canvasInstance = target.canvas;
    canvasInstance.remove(target);
    canvasInstance.requestRenderAll();
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

  const calculateTextDimensions = (text, fontOptions) => {
    const tempText = new fabric.Text(text, {
      fontSize: fontOptions.fontSize,
      fontFamily: fontOptions.fontFamily,
      fontWeight: fontOptions.fontWeight,
      fontStyle: fontOptions.fontStyle,
    });

    const width = tempText.width * 1.2;
    const height = tempText.fontSize * 1.5;

    return {
      width: Math.max(width, 100),
      height: Math.max(height, 30),
    };
  };

  const addTextbox = (text, isDynamic = false, columnKey = null) => {
    if (dataRows.length === 0 && !backgroundLoaded) {
      setAlert({
        open: true,
        message:
          "Please upload a background image or an Excel file before adding textboxes.",
        severity: "warning",
      });
      return;
    }
    if (!canvas) return;

    const fontOptions = {
      fontSize,
      fontFamily,
      fontWeight,
      fontStyle,
    };

    let { width, height } = calculateTextDimensions(text, fontOptions);

    if (isDynamic && columnKey && dataRows.length > 0) {
      dataRows.forEach((row) => {
        const value = String(row[columnKey] || "");
        const dims = calculateTextDimensions(value, fontOptions);
        width = Math.max(width, dims.width);
      });
      height = fontSize * 1.5;
    }

    const canvasWidth = canvas.getWidth();
    const canvasHeight = canvas.getHeight();

    const textbox = new fabric.Textbox(text, {
      left: (canvasWidth - width) / 2,
      top: canvasHeight / 3,
      width,
      height,
      fontSize,
      fontFamily,
      fontWeight,
      fontStyle,
      underline: textDecoration.includes("underline"),
      linethrough: textDecoration.includes("line-through"),
      fill: textColor,
      textAlign: alignment,
      columnKey: isDynamic ? columnKey : undefined,
      editable: true,
      cursorWidth: 2,
      lockScalingX: isDynamic,
      lockScalingY: isDynamic,
      lockUniScaling: true,
      lockMovementY: false,
      lockRotation: true,
      splitByGrapheme: true,
      originX: "center",
      originY: "center",
    });

    addDeleteControlToObject(textbox);

    if (isDynamic) {
      textbox.setControlsVisibility({
        mt: false,
        mb: false,
        ml: false,
        mr: false,
        mtr: true,
      });

      textbox.controls.info = new fabric.Control({
        x: -0.5,
        y: -0.5,
        offsetY: -10,
        offsetX: -10,
        cursorStyle: "help",
        render: (ctx, left, top) => {
          ctx.save();
          const radius = 8;
          ctx.beginPath();
          ctx.arc(left, top, radius, 0, 2 * Math.PI, false);
          ctx.fillStyle = "#2196F3";
          ctx.fill();
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 2;
          ctx.font = "bold 12px Arial";
          ctx.fillStyle = "#fff";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("i", left, top);
          ctx.restore();
        },
        mouseDownHandler: () => {
          setAlert({
            open: true,
            message: `This dynamic field's dimensions are locked to fit all data from "${columnKey}"`,
            severity: "info",
          });
          return false;
        },
        cornerSize: 16,
      });
    }

    canvas.add(textbox);
    canvas.setActiveObject(textbox);
    canvas.requestRenderAll();
  };

  const onDrop = (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file || !canvas) return;

    const reader = new FileReader();

    if (file.type.includes("image")) {
      reader.onload = (f) => {
        fabric.Image.fromURL(f.target.result, (img) => {
          img.set({ selectable: false, evented: false });
          canvas.setBackgroundImage(img, () => {
            centerBackgroundImage(canvas);
          });
          setBackgroundLoaded(true);
          setAlert({
            open: true,
            message: "Background image loaded successfully.",
            severity: "success",
          });
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
            setAlert({
              open: true,
              message: "Excel sheet is empty.",
              severity: "warning",
            });
            return;
          }

          setColumns(Object.keys(jsonData[0]));
          setDataRows(jsonData);
          setAlert({
            open: true,
            message: "Excel file loaded successfully.",
            severity: "success",
          });
        } catch (error) {
          setColumns([]);
          setDataRows([]);
          setAlert({
            open: true,
            message: "Failed to read Excel file.",
            severity: "error",
          });
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const updatePreview = (index) => {
    if (!canvas || dataRows.length === 0) return;

    const row = dataRows[index];
    canvas.getObjects("textbox").forEach((obj) => {
      const key = obj.columnKey;
      if (key && row[key] !== undefined) {
        obj.set("text", String(row[key]));
      }
    });
    canvas.renderAll();
  };

  const handleNextPreview = () => {
    const nextIndex = (previewIndex + 1) % dataRows.length;
    setPreviewIndex(nextIndex);
    updatePreview(nextIndex);
  };

  const handlePrevPreview = () => {
    const prevIndex = (previewIndex - 1 + dataRows.length) % dataRows.length;
    setPreviewIndex(prevIndex);
    updatePreview(prevIndex);
  };

  const togglePreview = () => {
    if (showPreview) {
      // When turning off preview, restore original text
      canvas.getObjects("textbox").forEach((obj) => {
        if (obj.columnKey) {
          obj.set("text", `[${obj.columnKey}]`);
        }
      });
      canvas.renderAll();
    } else {
      // When turning on preview, show first record
      updatePreview(0);
      setPreviewIndex(0);
    }
    setShowPreview(!showPreview);
  };

  const handleExport = async () => {
    if (!canvas || (dataRows.length === 0 && !backgroundLoaded)) {
      setAlert({ open: true, message: "No data to export.", severity: "info" });
      return;
    }

    setIsExporting(true);

    try {
      if (exportType === "single" || dataRows.length === 0) {
        // Export single certificate (current preview or template)
        const indexToExport = showPreview ? previewIndex : 0;
        const row = dataRows[indexToExport] || {};

        const canvasClone = new fabric.StaticCanvas(null, {
          width: canvas.width,
          height: canvas.height,
        });

        if (canvas.backgroundImage) {
          const bgImg = await new Promise((resolve) => {
            fabric.Image.fromURL(canvas.backgroundImage.toDataURL(), resolve);
          });
          canvasClone.setBackgroundImage(bgImg, () => {
            centerBackgroundImage(canvasClone);
          });
        }

        canvas.getObjects().forEach((obj) => {
          const clone = fabric.util.object.clone(obj);
          const key = clone.columnKey;
          if (key && row[key] !== undefined) {
            clone.set("text", String(row[key]));
          }
          canvasClone.add(clone);
        });

        canvasClone.renderAll();

        const dataUrl = canvasClone.toDataURL({
          format: "png",
          multiplier: 2,
        });

        const blob = dataURLtoBlob(dataUrl);
        const fileName = row.id
          ? `certificate_${row.id}.png`
          : "certificate.png";

        saveAs(blob, fileName);
        setAlert({
          open: true,
          message: "Certificate exported successfully.",
          severity: "success",
        });
        canvasClone.dispose();
      } else {
        // Bulk export as ZIP
        const zip = new JSZip();
        const promises = [];

        for (let i = 0; i < dataRows.length; i++) {
          const row = dataRows[i];
          const canvasClone = new fabric.StaticCanvas(null, {
            width: canvas.width,
            height: canvas.height,
          });

          if (canvas.backgroundImage) {
            const bgImg = await new Promise((resolve) => {
              fabric.Image.fromURL(canvas.backgroundImage.toDataURL(), resolve);
            });
            canvasClone.setBackgroundImage(bgImg, () => {
              centerBackgroundImage(canvasClone);
            });
          }

          canvas.getObjects().forEach((obj) => {
            const clone = fabric.util.object.clone(obj);
            const key = clone.columnKey;
            if (key && row[key] !== undefined) {
              clone.set("text", String(row[key]));
            }
            canvasClone.add(clone);
          });

          canvasClone.renderAll();

          promises.push(
            new Promise((resolve) => {
              setTimeout(() => {
                const dataUrl = canvasClone.toDataURL({
                  format: "png",
                  multiplier: 2,
                });
                resolve({ dataUrl, index: i, row });
                canvasClone.dispose();
              }, 100);
            })
          );
        }

        const results = await Promise.all(promises);
        results.forEach(({ dataUrl, index, row }) => {
          const blob = dataURLtoBlob(dataUrl);
          const fileName = row.id
            ? `certificate_${row.id}.png`
            : `certificate_${index + 1}.png`;
          zip.file(fileName, blob);
        });

        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, "certificates.zip");
        setAlert({
          open: true,
          message: `${dataRows.length} certificates exported successfully.`,
          severity: "success",
        });
      }
    } catch (error) {
      setAlert({
        open: true,
        message: "Error during export: " + error.message,
        severity: "error",
      });
    } finally {
      setIsExporting(false);
      if (showPreview) {
        updatePreview(previewIndex);
      }
    }
  };

  const handleReset = () => {
    if (canvas) {
      canvas.clear();
      setColumns([]);
      setDataRows([]);
      setBackgroundLoaded(false);
      setPreviewIndex(0);
      setShowPreview(false);
      setAlert({
        open: true,
        message: "Editor has been reset.",
        severity: "info",
      });
    }
  };

  const dataURLtoBlob = (dataUrl) => {
    const arr = dataUrl.split(",");
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  useEffect(() => {
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (obj && obj.type === "textbox") {
      obj.set({
        fontSize,
        fontFamily,
        fontWeight,
        fontStyle,
        underline: textDecoration.includes("underline"),
        linethrough: textDecoration.includes("line-through"),
        fill: textColor,
        textAlign: alignment,
      });

      if (!obj.columnKey) {
        const { width } = calculateTextDimensions(obj.text, {
          fontSize,
          fontFamily,
          fontWeight,
          fontStyle,
        });
        obj.set("width", width);
      }

      canvas.requestRenderAll();
    }
  }, [
    fontSize,
    fontFamily,
    fontWeight,
    fontStyle,
    textDecoration,
    textColor,
    alignment,
    canvas,
  ]);

  useEffect(() => {
    if (!canvas) return;

    const handleSelection = () => {
      const activeObject = canvas.getActiveObject();
      if (activeObject && activeObject.type === "textbox") {
        setFontSize(activeObject.fontSize);
        setFontFamily(activeObject.fontFamily);
        setFontWeight(activeObject.fontWeight);
        setFontStyle(activeObject.fontStyle);
        setTextDecoration(
          [
            activeObject.underline ? "underline" : "",
            activeObject.linethrough ? "line-through" : "",
          ]
            .filter(Boolean)
            .join(" ")
        );
        setTextColor(activeObject.fill);
        setAlignment(activeObject.textAlign);
      }
    };

    canvas.on("selection:created", handleSelection);
    canvas.on("selection:updated", handleSelection);
    canvas.on("selection:cleared", () => {
      setFontSize(24);
      setFontFamily("Arial");
      setFontWeight("normal");
      setFontStyle("normal");
      setTextDecoration("");
      setTextColor("#000000");
      setAlignment("center");
    });

    return () => {
      canvas.off("selection:created", handleSelection);
      canvas.off("selection:updated", handleSelection);
      canvas.off("selection:cleared");
    };
  }, [canvas]);

  return (
    <Box sx={{ p: isMobile ? 1 : 3, maxWidth: 1200, mx: "auto" }}>
      <Typography variant="h4" fontWeight={600} gutterBottom></Typography>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Grid>
            <Grid item xs={12} md={6}>
              <Paper
                {...getRootProps()}
                elevation={isDragActive ? 8 : 2}
                sx={{
                  p: 4,
                  textAlign: "center",
                  borderRadius: 2,
                  bgcolor: isDragActive ? "action.hover" : "background.paper",
                  cursor: "pointer",
                  border: "2px dashed",
                  borderColor: isDragActive ? "primary.main" : "divider",
                  transition: "all 0.3s ease",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <input {...getInputProps()} />
                <Upload fontSize="large" color="primary" sx={{ mb: 1 }} />
                <Typography variant="h6" gutterBottom>
                  {isDragActive ? "Drop files here" : "Drag & drop files here"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Upload a background image or Excel file with data
                </Typography>
                <Button variant="contained" startIcon={<Add />} sx={{ mt: 2 }}>
                  Browse Files
                </Button>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Stack spacing={2} height="100%">
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Add Text Elements
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Tooltip
                      title={
                        !backgroundLoaded && dataRows.length === 0
                          ? "Upload background image or Excel file first"
                          : "Add static text"
                      }
                    >
                      <span>
                        <Button
                          onClick={() => addTextbox("New Text")}
                          variant="outlined"
                          startIcon={<TextFields />}
                          size="small"
                          disabled={!backgroundLoaded && dataRows.length === 0}
                        >
                          Add Text
                        </Button>
                      </span>
                    </Tooltip>

                    {columns.map((col) => (
                      <Tooltip
                        key={col}
                        title={
                          dataRows.length === 0
                            ? "Upload Excel file first"
                            : `Add column: ${col}`
                        }
                      >
                        <span>
                          <Button
                            onClick={() => addTextbox(`[${col}]`, true, col)}
                            variant="outlined"
                            startIcon={<CropFree />}
                            size="small"
                            disabled={dataRows.length === 0}
                          >
                            {col}
                          </Button>
                        </span>
                      </Tooltip>
                    ))}
                  </Stack>
                </Paper>

                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Text Properties
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Font Family</InputLabel>
                        <Select
                          value={fontFamily}
                          label="Font Family"
                          onChange={(e) => setFontFamily(e.target.value)}
                        >
                          {FONT_FAMILIES.map((font) => (
                            <MenuItem
                              key={font}
                              value={font}
                              style={{ fontFamily: font }}
                            >
                              {font}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Font Size"
                        type="number"
                        value={fontSize}
                        onChange={(e) =>
                          setFontSize(
                            Math.max(
                              8,
                              Math.min(72, parseInt(e.target.value) || 24)
                            )
                          )
                        }
                        fullWidth
                        size="small"
                        inputProps={{ min: 8, max: 72 }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Stack direction="row" spacing={1}>
                        <ToggleButtonGroup size="small">
                          <ToggleButton
                            value="bold"
                            selected={fontWeight === "bold"}
                            onClick={toggleBold}
                          >
                            <FormatBold />
                          </ToggleButton>
                          <ToggleButton
                            value="italic"
                            selected={fontStyle === "italic"}
                            onClick={toggleItalic}
                          >
                            <FormatItalic />
                          </ToggleButton>
                        </ToggleButtonGroup>

                        <ToggleButtonGroup
                          value={textDecoration}
                          exclusive
                          onChange={(e, val) => setTextDecoration(val)}
                          size="small"
                        >
                          <ToggleButton value="underline">
                            <FormatUnderlined />
                          </ToggleButton>
                        </ToggleButtonGroup>

                        <TextField
                          type="color"
                          value={textColor}
                          onChange={(e) => setTextColor(e.target.value)}
                          size="small"
                          sx={{ width: 60 }}
                          InputProps={{
                            startAdornment: (
                              <FormatColorText
                                sx={{ color: textColor, mr: 1 }}
                              />
                            ),
                          }}
                        />
                      </Stack>
                    </Grid>
                    <Grid item xs={12}>
                      <ToggleButtonGroup
                        value={alignment}
                        exclusive
                        onChange={(e, val) => setAlignment(val)}
                        fullWidth
                        size="small"
                      >
                        <ToggleButton value="left">
                          <FormatAlignLeft />
                        </ToggleButton>
                        <ToggleButton value="center">
                          <FormatAlignCenter />
                        </ToggleButton>
                        <ToggleButton value="right">
                          <FormatAlignRight />
                        </ToggleButton>
                        <ToggleButton value="justify">
                          <FormatAlignJustify />
                        </ToggleButton>
                      </ToggleButtonGroup>
                    </Grid>
                  </Grid>
                </Paper>

                <Stack direction="row" spacing={2}>
                  <Button
                    variant="outlined"
                    startIcon={<Preview />}
                    onClick={togglePreview}
                    disabled={dataRows.length === 0}
                    fullWidth
                  >
                    {showPreview ? "Exit Preview" : "Preview"}
                  </Button>

                  <ButtonGroup fullWidth>
                    <Button
                      variant={
                        exportType === "single" ? "contained" : "outlined"
                      }
                      onClick={() => setExportType("single")}
                      startIcon={<InsertDriveFile />}
                    >
                      Single
                    </Button>
                    <Button
                      variant={exportType === "bulk" ? "contained" : "outlined"}
                      onClick={() => setExportType("bulk")}
                      startIcon={<FolderZip />}
                      disabled={dataRows.length === 0}
                    >
                      Bulk
                    </Button>
                  </ButtonGroup>
                </Stack>

                <Button
                  variant="contained"
                  onClick={handleExport}
                  disabled={!backgroundLoaded}
                  fullWidth
                  size="large"
                >
                  {isExporting ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    `Export ${exportType === "single" ? "Current" : "All"}`
                  )}
                </Button>

                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<RestartAlt />}
                  onClick={handleReset}
                  fullWidth
                >
                  Reset Editor
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {showPreview && dataRows.length > 0 && (
        <Paper sx={{ mt: 3, p: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Data Preview ({previewIndex + 1} of {dataRows.length})
            </Typography>
            <IconButton onClick={handlePrevPreview}>
              <ChevronLeft />
            </IconButton>
            <IconButton onClick={handleNextPreview}>
              <ChevronRight />
            </IconButton>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <List dense>
            {columns.map((col) => (
              <ListItem key={col}>
                <ListItemText
                  primary={col}
                  secondary={dataRows[previewIndex]?.[col] || "N/A"}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      <Box
        ref={containerRef}
        sx={{
          width: "100%",
          maxWidth: 1000,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          backgroundColor: "background.paper",
          p: 1,
          m: 2,
          aspectRatio: "1000 / 600",
          overflow: "hidden",
          mx: "auto",
          boxShadow: 1,
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
