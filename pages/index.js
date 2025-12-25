import { useEffect, useMemo, useRef, useState } from 'react';

const orientationOptions = [
  { id: 'horizontal', label: 'Horizontal (Side by Side)' },
  { id: 'vertical', label: 'Vertical (Stacked)' },
];

export default function Home() {
  const [sources, setSources] = useState([null, null]);
  const [orientation, setOrientation] = useState('horizontal');
  const [spacing, setSpacing] = useState(24);
  const [background, setBackground] = useState('#ffffff');
  const [error, setError] = useState('');
  const canvasRef = useRef(null);
  const hasBothImages = useMemo(() => sources.every(Boolean), [sources]);

  useEffect(() => {
    if (!hasBothImages) {
      const canvas = canvasRef.current;
      if (canvas) {
        const context = canvas.getContext('2d');
        canvas.width = 640;
        canvas.height = 360;
        context.fillStyle = '#1f2833';
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    let cancelled = false;

    async function mergeImages() {
      try {
        const [imgA, imgB] = await Promise.all(
          sources.map(
            (src) =>
              new Promise((resolve, reject) => {
                const image = new Image();
                image.onload = () => resolve(image);
                image.onerror = () => reject(new Error('Gagal memuat gambar.'));
                image.src = src;
              }),
          ),
        );

        if (cancelled) {
          return;
        }

        const canvas = canvasRef.current;
        if (!canvas) {
          return;
        }

        const context = canvas.getContext('2d');
        if (!context) {
          return;
        }

        const gap = Number.isFinite(spacing) ? spacing : 0;

        if (orientation === 'horizontal') {
          const targetHeight = Math.min(imgA.naturalHeight, imgB.naturalHeight);
          const widthA = Math.round((imgA.naturalWidth / imgA.naturalHeight) * targetHeight);
          const widthB = Math.round((imgB.naturalWidth / imgB.naturalHeight) * targetHeight);

          canvas.width = widthA + widthB + gap;
          canvas.height = targetHeight;

          context.fillStyle = background;
          context.fillRect(0, 0, canvas.width, canvas.height);

          context.drawImage(imgA, 0, 0, widthA, targetHeight);
          context.drawImage(imgB, widthA + gap, 0, widthB, targetHeight);
        } else {
          const targetWidth = Math.min(imgA.naturalWidth, imgB.naturalWidth);
          const heightA = Math.round((imgA.naturalHeight / imgA.naturalWidth) * targetWidth);
          const heightB = Math.round((imgB.naturalHeight / imgB.naturalWidth) * targetWidth);

          canvas.width = targetWidth;
          canvas.height = heightA + heightB + gap;

          context.fillStyle = background;
          context.fillRect(0, 0, canvas.width, canvas.height);

          context.drawImage(imgA, 0, 0, targetWidth, heightA);
          context.drawImage(imgB, 0, heightA + gap, targetWidth, heightB);
        }
      } catch (err) {
        setError(err.message);
      }
    }

    mergeImages();

    return () => {
      cancelled = true;
    };
  }, [sources, orientation, spacing, background, hasBothImages]);

  const handleFileChange = (index) => (event) => {
    const file = event.target.files?.[0];
    setError('');

    if (!file) {
      setSources((prev) => {
        const next = [...prev];
        next[index] = null;
        return next;
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('File harus berupa gambar.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSources((prev) => {
        const next = [...prev];
        next[index] = reader.result;
        return next;
      });
    };
    reader.onerror = () => setError('Gagal membaca file.');
    reader.readAsDataURL(file);
  };

  const handleReset = () => {
    setSources([null, null]);
    setError('');
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    canvas.toBlob((blob) => {
      if (!blob) {
        setError('Gagal menyiapkan unduhan.');
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'gabungan-gambar.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  return (
    <main className="layout">
      <header className="hero">
        <h1>Penggabung Gambar</h1>
        <p>Unggah dua gambar, gabungkan secara horizontal atau vertikal, lalu unduh hasilnya.</p>
      </header>

      <section className="controls">
        <div className="input-group">
          <label htmlFor="image-1">Gambar Pertama</label>
          <input id="image-1" type="file" accept="image/*" onChange={handleFileChange(0)} />
        </div>
        <div className="input-group">
          <label htmlFor="image-2">Gambar Kedua</label>
          <input id="image-2" type="file" accept="image/*" onChange={handleFileChange(1)} />
        </div>
        <div className="inline-group">
          {orientationOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              className={orientation === option.id ? 'toggle active' : 'toggle'}
              onClick={() => setOrientation(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <label className="range-label">
          Spacing: {spacing}px
          <input
            type="range"
            min="0"
            max="64"
            value={spacing}
            onChange={(event) => setSpacing(Number(event.target.value))}
          />
        </label>
        <label className="color-label">
          Warna Latar: {background}
          <input type="color" value={background} onChange={(event) => setBackground(event.target.value)} />
        </label>
      </section>

      <section className="canvas-wrapper">
        <canvas ref={canvasRef} className="preview"></canvas>
      </section>

      {error && <p className="error">{error}</p>}

      <section className="actions">
        <button type="button" className="primary" onClick={handleDownload} disabled={!hasBothImages}>
          Unduh Hasil Gabungan
        </button>
        <button type="button" className="ghost" onClick={handleReset}>
          Reset
        </button>
      </section>
    </main>
  );
}
