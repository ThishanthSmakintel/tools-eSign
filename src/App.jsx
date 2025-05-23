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
  Divider,
  IconButton,
  Slider,
  ToggleButtonGroup,
  ToggleButton,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
  Image,
  InsertDriveFile,
  Preview,
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
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

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

    let scaleFactor = imgRatio > canvasRatio 
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
    
    // Calculate width based on font size (1.2 multiplier for padding)
    const width = tempText.width * 1.2;
    
    // Calculate height based on line height (1.5x font size is standard)
    const height = tempText.fontSize * 1.5;
    
    return {
      width: Math.max(width, 100), // Minimum 100px width
      height: Math.max(height, 30) // Minimum 30px height
    };
  };

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

    const fontOptions = {
      fontSize,
      fontFamily,
      fontWeight,
      fontStyle,
    };

    // Calculate dimensions for the initial text
    let { width, height } = calculateTextDimensions(text, fontOptions);

    // For dynamic fields, calculate maximum dimensions across all possible values
    if (isDynamic && columnKey && dataRows.length > 0) {
      dataRows.forEach(row => {
        const value = String(row[columnKey] || "");
        const dims = calculateTextDimensions(value, fontOptions);
        width = Math.max(width, dims.width);
      });
      
      // For dynamic fields, we keep the original height but lock width
      height = fontSize * 1.5; // Standard line height
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
      lockScalingX: isDynamic, // Only lock width for dynamic fields
      lockScalingY: false, // Allow height adjustment for all fields
      lockUniScaling: true,
      lockMovementY: false,
      lockRotation: true,
      splitByGrapheme: true,
      originX: 'center',
      originY: 'center',
    });

    addDeleteControlToObject(textbox);

    if (isDynamic) {
      textbox.setControlsVisibility({
        mt: true,  // Allow top resize
        mb: true,  // Allow bottom resize
        ml: false, // Disable left resize
        mr: false, // Disable right resize
        mtr: true, // Allow rotation
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
          ctx.font = 'bold 12px Arial';
          ctx.fillStyle = '#fff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('i', left, top);
          ctx.restore();
        },
        mouseDownHandler: () => {
          setAlert({
            open: true,
            message: `This field's width is locked to fit all data from "${columnKey}" but height can be adjusted`,
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
          setAlert({ open: true, message: "Background image loaded successfully.", severity: "success" });
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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const handlePreview = (index) => {
    if (!canvas || dataRows.length === 0) return;
    
    const row = dataRows[index];
    
    canvas.getObjects("textbox").forEach((obj) => {
      const key = obj.columnKey;
      if (key && row[key] !== undefined) {
        obj.set("text", String(row[key]));
      }
    });

    canvas.renderAll();
    setPreviewIndex(index);
    setPreviewOpen(true);
  };

  const handleExport = async () => {
    if (!canvas || (dataRows.length === 0 && !backgroundLoaded)) {
      setAlert({ open: true, message: "No data to export.", severity: "info" });
      return;
    }

    if (dataRows.length === 0) {
      const dataUrl = canvas.toDataURL({ format: "png", multiplier: 2 });
      const blob = dataURLtoBlob(dataUrl);
      saveAs(blob, "certificate.png");
      setAlert({ open: true, message: "Certificate exported successfully.", severity: "success" });
      return;
    }

    const zip = new JSZip();
    const promises = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      
      // Create a clone of the canvas to avoid flickering
      const canvasClone = new fabric.StaticCanvas(null, {
        width: canvas.width,
        height: canvas.height,
      });

      // Copy background
      if (canvas.backgroundImage) {
        const bgImg = await new Promise(resolve => {
          fabric.Image.fromURL(canvas.backgroundImage.toDataURL(), resolve);
        });
        canvasClone.setBackgroundImage(bgImg, () => {
          centerBackgroundImage(canvasClone);
        });
      }

      // Copy objects with current data
      canvas.getObjects().forEach(obj => {
        const clone = fabric.util.object.clone(obj);
        const key = clone.columnKey;
        if (key && row[key] !== undefined) {
          clone.set("text", String(row[key]));
        }
        canvasClone.add(clone);
      });

      canvasClone.renderAll();

      promises.push(new Promise((resolve) => {
        setTimeout(() => {
          const dataUrl = canvasClone.toDataURL({ 
            format: "png",
            multiplier: 2 // Higher quality
          });
          resolve({ dataUrl, index: i });
          canvasClone.dispose();
        }, 100);
      }));
    }

    const results = await Promise.all(promises);
    results.forEach(({ dataUrl, index }) => {
      const blob = dataURLtoBlob(dataUrl);
      zip.file(`certificate_${index + 1}.png`, blob);
    });

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "certificates.zip");
    setAlert({ open: true, message: `${dataRows.length} certificates exported successfully.`, severity: "success" });
  };

  const dataURLtoBlob = (dataUrl) => {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  // Update selected textbox style when text properties change
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
      
      // For dynamic fields, only update font properties, not dimensions
      if (!obj.columnKey) {
        const { width } = calculateTextDimensions(obj.text, {
          fontSize,
          fontFamily,
          fontWeight,
          fontStyle,
        });
        obj.set('width', width);
      }
      
      canvas.requestRenderAll();
    }
  }, [fontSize, fontFamily, fontWeight, fontStyle, textDecoration, textColor, alignment, canvas]);

  // Handle canvas object selection changes
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
          ].filter(Boolean).join(" ")
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
      <Typography variant="h4" fontWeight={600} gutterBottom>
        Certificate Editor
      </Typography>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3}>
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
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  sx={{ mt: 2 }}
                >
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
                      title={!backgroundLoaded && dataRows.length === 0 ? "Upload background image or Excel file first" : "Add static text"}
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
                        title={dataRows.length === 0 ? "Upload Excel file first" : `Add column: ${col}`}
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
                            <MenuItem key={font} value={font} style={{ fontFamily: font }}>
                              {font}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Stack spacing={1}>
                        <Typography variant="caption">Font Size</Typography>
                        <Slider
                          value={fontSize}
                          onChange={(e, val) => setFontSize(val)}
                          min={8}
                          max={72}
                          valueLabelDisplay="auto"
                        />
                      </Stack>
                    </Grid>
                    <Grid item xs={12}>
                      <Stack direction="row" spacing={1}>
                        <ToggleButtonGroup
                          value={fontWeight}
                          exclusive
                          onChange={(e, val) => val && setFontWeight(val)}
                          size="small"
                        >
                          <ToggleButton value="normal">
                            <FormatBold />
                          </ToggleButton>
                          <ToggleButton value="bold">
                            <FormatBold sx={{ fontWeight: 'bold' }} />
                          </ToggleButton>
                        </ToggleButtonGroup>

                        <ToggleButtonGroup
                          value={fontStyle}
                          exclusive
                          onChange={(e, val) => val && setFontStyle(val)}
                          size="small"
                        >
                          <ToggleButton value="normal">
                            <FormatItalic />
                          </ToggleButton>
                          <ToggleButton value="italic">
                            <FormatItalic sx={{ fontStyle: 'italic' }} />
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
                              <FormatColorText sx={{ color: textColor, mr: 1 }} />
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
                    onClick={() => handlePreview(0)}
                    disabled={dataRows.length === 0}
                    fullWidth
                  >
                    Preview
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<FolderZip />}
                    onClick={handleExport}
                    disabled={!backgroundLoaded && dataRows.length === 0}
                    fullWidth
                    size="large"
                  >
                    Export
                  </Button>
                </Stack>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

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

      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Certificate Preview</DialogTitle>
        <DialogContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Box
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  backgroundColor: "background.paper",
                  p: 1,
                  aspectRatio: "1000 / 600",
                  overflow: "hidden",
                }}
              >
                <canvas
                  id="previewCanvas"
                  ref={canvasRef}
                  style={{ display: "block", width: "100%", height: "100%" }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Column</TableCell>
                      <TableCell>Value</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {columns.map((col) => (
                      <TableRow key={col}>
                        <TableCell>{col}</TableCell>
                        <TableCell>
                          {dataRows[previewIndex]?.[col] || ''}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                <Button
                  variant="outlined"
                  onClick={() => handlePreview(Math.max(0, previewIndex - 1))}
                  disabled={previewIndex === 0}
                >
                  Previous
                </Button>
                <Typography variant="body2" sx={{ alignSelf: 'center' }}>
                  {previewIndex + 1} of {dataRows.length}
                </Typography>
                <Button
                  variant="outlined"
                  onClick={() => handlePreview(Math.min(dataRows.length - 1, previewIndex + 1))}
                  disabled={previewIndex === dataRows.length - 1}
                >
                  Next
                </Button>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

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