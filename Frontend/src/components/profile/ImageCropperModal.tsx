import { useEffect, useState, useRef, type MouseEvent, type TouchEvent, type JSX } from "react";
import { ZoomIn, ZoomOut, X } from "lucide-react";
import { Spinner } from "../ui/Spinner";

interface ImageCropperModalProps {
  isOpen: boolean;
  imageFile: File | null;
  onClose: () => void;
  onCropComplete: (croppedFile: File) => void;
}

const CROP_SIZE = 220; // circular crop diameter in UI
const CONTAINER_SIZE = 300; // editor box width/height

export const ImageCropperModal = ({
  isOpen,
  imageFile,
  onClose,
  onCropComplete,
}: ImageCropperModalProps): JSX.Element | null => {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [baseDimensions, setBaseDimensions] = useState<{ w: number; h: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragStart = useRef({ x: 0, y: 0 });
  const dragOffset = useRef({ x: 0, y: 0 });

  // Load selected image file
  useEffect(() => {
    if (!imageFile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setImgSrc(null);
      setBaseDimensions(null);
      setIsLoading(true);
      setError(null);
      return;
    }

    const objectUrl = URL.createObjectURL(imageFile);
    setImgSrc(objectUrl);
    setIsLoading(true);
    setError(null);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [imageFile]);

  // Set default view
  const resetView = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  if (!isOpen || !imageFile || !imgSrc) return null;

  const handleImageLoaded = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const naturalW = img.naturalWidth;
    const naturalH = img.naturalHeight;

    if (!naturalW || !naturalH) {
      setError("Failed to load image dimensions");
      setIsLoading(false);
      return;
    }

    const aspect = naturalW / naturalH;
    let baseW = 0;
    let baseH = 0;

    // Scale so smaller dimension matches CROP_SIZE
    if (aspect >= 1) {
      baseH = CROP_SIZE;
      baseW = CROP_SIZE * aspect;
    } else {
      baseW = CROP_SIZE;
      baseH = CROP_SIZE / aspect;
    }

    setBaseDimensions({ w: baseW, h: baseH });
    setIsLoading(false);
    resetView();
  };

  const handleImageLoadError = () => {
    setError("Failed to load image");
    setIsLoading(false);
  };

  // Helper to restrict repositioning inside circular bounds
  const getClampedPosition = (x: number, y: number, currentScale: number) => {
    if (!baseDimensions) return { x: 0, y: 0 };
    const maxDragX = Math.max(0, (baseDimensions.w * currentScale - CROP_SIZE) / 2);
    const maxDragY = Math.max(0, (baseDimensions.h * currentScale - CROP_SIZE) / 2);

    return {
      x: Math.max(-maxDragX, Math.min(maxDragX, x)),
      y: Math.max(-maxDragY, Math.min(maxDragY, y)),
    };
  };

  // Dragging event handlers
  const handleDragStart = (clientX: number, clientY: number) => {
    if (isLoading || error || !baseDimensions) return;
    setIsDragging(true);
    dragStart.current = { x: clientX, y: clientY };
    dragOffset.current = { x: position.x, y: position.y };
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDragging || !baseDimensions) return;
    const dx = clientX - dragStart.current.x;
    const dy = clientY - dragStart.current.y;
    const rawX = dragOffset.current.x + dx;
    const rawY = dragOffset.current.y + dy;

    const clamped = getClampedPosition(rawX, rawY, scale);
    setPosition(clamped);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Desktop Mouse Handlers
  const onMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleDragStart(e.clientX, e.clientY);
  };

  const onMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.preventDefault();
    handleDragMove(e.clientX, e.clientY);
  };

  // Mobile Touch Handlers
  const onTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
  };

  const onTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (!isDragging || e.touches.length !== 1) return;
    handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
  };

  // Scale slider change handler
  const handleScaleChange = (val: number) => {
    setScale(val);
    const clamped = getClampedPosition(position.x, position.y, val);
    setPosition(clamped);
  };

  // Save / Crop Image
  const handleSave = () => {
    if (!baseDimensions || !imageRef.current) return;

    const img = imageRef.current;
    const canvas = document.createElement("canvas");
    // High-resolution canvas for premium quality output
    const targetSize = 400; 
    canvas.width = targetSize;
    canvas.height = targetSize;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, targetSize, targetSize);

    // Map UI crop space coordinates to Canvas crop coordinates
    const scaleFactor = targetSize / CROP_SIZE;
    const imgCenterX = targetSize / 2 + position.x * scaleFactor;
    const imgCenterY = targetSize / 2 + position.y * scaleFactor;
    const imgW = baseDimensions.w * scale * scaleFactor;
    const imgH = baseDimensions.h * scale * scaleFactor;

    ctx.save();
    ctx.translate(imgCenterX, imgCenterY);
    ctx.drawImage(img, -imgW / 2, -imgH / 2, imgW, imgH);
    ctx.restore();

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const croppedFile = new File([blob], imageFile.name, {
          type: "image/jpeg",
          lastModified: Date.now(),
        });
        onCropComplete(croppedFile);
      },
      "image/jpeg",
      0.9
    );
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm rounded-xl bg-surface p-5 shadow-xl border border-border flex flex-col items-center">
        {/* Header */}
        <div className="w-full flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-text-primary">Edit Profile Photo</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close editor"
            className="p-1 rounded-full text-text-secondary hover:bg-surface-tertiary transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Cropping Area */}
        <div
          className="relative overflow-hidden bg-black rounded-lg cursor-grab active:cursor-grabbing select-none"
          style={{ width: `${CONTAINER_SIZE}px`, height: `${CONTAINER_SIZE}px` }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={handleDragEnd}
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 text-white z-20">
              <Spinner size="md" />
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 text-danger p-4 text-center text-sm z-20">
              {error}
            </div>
          )}

          <img
            ref={(el) => {
              imageRef.current = el;
            }}
            src={imgSrc}
            alt="Original profile selection"
            onLoad={handleImageLoaded}
            onError={handleImageLoadError}
            className="pointer-events-none select-none max-w-none origin-center"
            style={{
              width: baseDimensions ? `${baseDimensions.w * scale}px` : "auto",
              height: baseDimensions ? `${baseDimensions.h * scale}px` : "auto",
              position: "absolute",
              left: baseDimensions ? `${(CONTAINER_SIZE - baseDimensions.w * scale) / 2}px` : "0px",
              top: baseDimensions ? `${(CONTAINER_SIZE - baseDimensions.h * scale) / 2}px` : "0px",
              transform: `translate(${position.x}px, ${position.y}px)`,
            }}
          />

          {/* Mask circular overlay */}
          <div
            className="absolute rounded-full border border-white/60 pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]"
            style={{
              width: `${CROP_SIZE}px`,
              height: `${CROP_SIZE}px`,
              left: `${(CONTAINER_SIZE - CROP_SIZE) / 2}px`,
              top: `${(CONTAINER_SIZE - CROP_SIZE) / 2}px`,
            }}
          />
        </div>

        {/* Zoom Controls */}
        <div className="w-full flex items-center gap-3 mt-4 px-2">
          <button
            type="button"
            onClick={() => handleScaleChange(Math.max(1, scale - 0.1))}
            disabled={scale <= 1 || isLoading}
            className="text-text-secondary hover:text-text-primary disabled:opacity-40"
            aria-label="Zoom out"
          >
            <ZoomOut size={18} />
          </button>
          <input
            type="range"
            min="1"
            max="3"
            step="0.01"
            value={scale}
            onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
            disabled={isLoading || !!error}
            aria-label="Zoom scale"
            className="flex-1 h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <button
            type="button"
            onClick={() => handleScaleChange(Math.min(3, scale + 0.1))}
            disabled={scale >= 3 || isLoading}
            className="text-text-secondary hover:text-text-primary disabled:opacity-40"
            aria-label="Zoom in"
          >
            <ZoomIn size={18} />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="w-full grid grid-cols-3 gap-2 mt-6">
          <button
            type="button"
            onClick={resetView}
            disabled={isLoading || !!error}
            className="rounded-lg bg-surface-tertiary px-3 py-2 text-sm font-semibold text-text-primary transition-colors hover:bg-surface-secondary disabled:opacity-50"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-text-secondary transition-colors hover:bg-surface-tertiary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading || !!error}
            className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};
