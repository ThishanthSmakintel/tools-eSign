import React, { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import 'pdfjs-dist/build/pdf.worker.entry';

// Set PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function CertificateDesigner() {
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);
  const [newText, setNewText] = useState('');
  const [imageSrc, setImageSrc] = useState(null);

  const initFabric = (bgUrl, width, height) => {
    const canvasElement = canvasRef.current;

    const fabricCanvas = new fabric.Canvas(canvasElement, {
      width,
      height,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
    });

    fabric.Image.fromURL(bgUrl, (img) => {
      img.set({ selectable: false });
      fabricCanvas.setBackgroundImage(img, fabricCanvas.renderAll.bind(fabricCanvas), {
        scaleX: width / img.width,
        scaleY: height / img.height,
      });
    });

    fabricRef.current = fabricCanvas;
  };

  const addText = () => {
    if (!newText.trim() || !fabricRef.current) return;

    const text = new fabric.IText(newText, {
      left: 100,
      top: 100,
      fontSize: 24,
      fill: '#000',
      fontFamily: 'Arial',
      editable: true,
    });

    fabricRef.current.add(text).setActiveObject(text);
    fabricRef.current.renderAll();
    setNewText('');
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (fabricRef.current) {
      fabricRef.current.dispose();
      fabricRef.current = null;
    }

    if (file.type === 'application/pdf') {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 2 });

      const tempCanvas = document.createElement('canvas');
      const context = tempCanvas.getContext('2d');
      tempCanvas.width = viewport.width;
      tempCanvas.height = viewport.height;

      await page.render({ canvasContext: context, viewport }).promise;

      const dataUrl = tempCanvas.toDataURL('image/png');
      setImageSrc(dataUrl);
      initFabric(dataUrl, tempCanvas.width, tempCanvas.height);
    } else if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        setImageSrc(url);
        initFabric(url, img.width, img.height);
      };
      img.src = url;
    } else {
      alert('Unsupported file type.');
    }
  };

  useEffect(() => {
    return () => {
      if (fabricRef.current) {
        fabricRef.current.dispose();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6">Certificate Designer with Fabric.js</h1>

      <div className="mb-4">
        <input
          type="file"
          accept="application/pdf,image/*"
          onChange={handleFileChange}
          className="mb-2"
        />
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            className="border px-2 py-1 rounded flex-grow"
          />
          <button
            onClick={addText}
            className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700"
          >
            Add Text
          </button>
        </div>
      </div>

      <div className="border bg-white shadow-md max-w-full overflow-auto">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
