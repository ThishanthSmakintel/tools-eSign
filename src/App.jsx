import React, { useState, useRef } from 'react';
import Draggable from 'react-draggable';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';

// Set pdf.js workerSrc to CDN before using pdfjsLib
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
console.log('pdf.js workerSrc set to:', pdfjsLib.GlobalWorkerOptions.workerSrc);

export default function App() {
  const [file, setFile] = useState(null);
  const [textBoxes, setTextBoxes] = useState([]);
  const [newText, setNewText] = useState('');
  const [imageSrc, setImageSrc] = useState(null);
  const pdfCanvasRef = useRef(null);

  const onFileChange = async (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    setTextBoxes([]);
    setImageSrc(null);
    setFile(null);

    if (uploadedFile.type === 'application/pdf') {
      setFile(uploadedFile);
      const fileReader = new FileReader();

      fileReader.onload = async function () {
        const typedarray = new Uint8Array(this.result);
        const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 });

        const canvas = pdfCanvasRef.current;
        const context = canvas.getContext('2d');

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport,
        };

        await page.render(renderContext).promise;
      };

      fileReader.readAsArrayBuffer(uploadedFile);
    } else if (uploadedFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(uploadedFile);
      setImageSrc(url);
    } else {
      alert('Unsupported file type');
    }
  };

  const addTextBox = () => {
    if (!newText.trim()) return;
    setTextBoxes((boxes) => [
      ...boxes,
      { id: Date.now(), text: newText, x: 20, y: 20 },
    ]);
    setNewText('');
  };

  const updatePosition = (id, data) => {
    setTextBoxes((boxes) =>
      boxes.map((box) =>
        box.id === id ? { ...box, x: data.x, y: data.y } : box
      )
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-4">Certificate Designer</h1>

      <input
        type="file"
        accept="application/pdf,image/*"
        onChange={onFileChange}
        className="mb-4"
      />

      <div className="mb-4 flex gap-2">
        <input
          type="text"
          placeholder="Enter text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          className="border rounded px-2 py-1 flex-grow"
        />
        <button
          onClick={addTextBox}
          className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700"
        >
          Add Text Box
        </button>
      </div>

      <div
        className="relative bg-white shadow-lg mx-auto"
        style={{ width: imageSrc ? 'auto' : 600, height: 800 }}
      >
        {imageSrc && (
          <img
            src={imageSrc}
            alt="certificate"
            className="block max-w-full"
            style={{ maxHeight: 800 }}
          />
        )}

        {!imageSrc && file && (
          <canvas ref={pdfCanvasRef} className="block max-w-full" />
        )}

        {/* Draggable text boxes */}
        {textBoxes.map(({ id, text, x, y }) => (
          <Draggable
            key={id}
            position={{ x, y }}
            onStop={(_, data) => updatePosition(id, data)}
          >
            <div
              className="absolute cursor-move select-none bg-yellow-200 px-2 py-1 rounded border border-gray-400"
              style={{ userSelect: 'none' }}
            >
              {text}
            </div>
          </Draggable>
        ))}
      </div>
    </div>
  );
}
