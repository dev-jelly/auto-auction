import { useState, useEffect, useCallback, useRef } from 'react';

interface ImageLightboxProps {
  images: string[];
  labels?: string[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export default function ImageLightbox({ images, labels, initialIndex, isOpen, onClose, onNavigate }: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [touchStart, setTouchStart] = useState<{ x: number; y: number; time: number } | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen, initialIndex]);

  useEffect(() => {
    if (isOpen) {
      onNavigate(currentIndex);
    }
  }, [currentIndex, onNavigate, isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          navigatePrev();
          break;
        case 'ArrowRight':
          navigateNext();
          break;
        case '0':
          setZoom(1);
          setPosition({ x: 0, y: 0 });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, currentIndex, images.length]);

  const navigatePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, [images.length]);

  const navigateNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, [images.length]);

  const handleZoom = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((prev) => Math.min(Math.max(0.5, prev + delta), 4));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  }, [zoom, position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, zoom, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch handlers for mobile swipe
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setTouchStart({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      });
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart) return;

    const touchEnd = e.changedTouches[0];
    const deltaX = touchEnd.clientX - touchStart.x;
    const deltaY = touchEnd.clientY - touchStart.y;
    const deltaTime = Date.now() - touchStart.time;

    // Swipe detection (horizontal swipe > 50px in < 300ms)
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) && deltaTime < 300) {
      if (deltaX > 0) {
        navigatePrev();
      } else {
        navigateNext();
      }
    }

    setTouchStart(null);
  }, [touchStart, navigatePrev, navigateNext]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={handleBackdropClick}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        aria-label="닫기"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Navigation arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); navigatePrev(); }}
            className="absolute left-4 z-10 p-4 rounded-full bg-white/20 hover:bg-white/40 text-white transition-all hover:scale-110 active:scale-95"
            aria-label="이전 이미지"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); navigateNext(); }}
            className="absolute right-4 z-10 p-4 rounded-full bg-white/20 hover:bg-white/40 text-white transition-all hover:scale-110 active:scale-95"
            aria-label="다음 이미지"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Image counter */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-full bg-white/10 text-white text-sm font-medium">
        {currentIndex + 1} / {images.length}
      </div>

      {/* Zoom indicator */}
      {zoom !== 1 && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-full bg-white/10 text-white text-sm">
          {Math.round(zoom * 100)}%
        </div>
      )}

      {/* Image */}
      <div
        className="relative max-w-[95vw] max-h-[85vh] overflow-hidden flex flex-col items-center"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="relative">
          <img
            ref={imageRef}
            src={images[currentIndex]}
            alt={`Image ${currentIndex + 1}`}
            className={`max-w-full max-h-[85vh] object-contain transition-transform duration-200 ${isDragging ? 'cursor-grabbing' : zoom > 1 ? 'cursor-grab' : 'cursor-default'}`}
            style={{
              transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
            }}
            onWheel={handleZoom}
            onMouseDown={handleMouseDown}
            draggable={false}
            onClick={(e) => e.stopPropagation()}
          />
          {labels?.[currentIndex] && zoom === 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-black/60 backdrop-blur-md text-white font-medium text-center pointer-events-none border border-white/10">
              {labels[currentIndex]}
            </div>
          )}
        </div>
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2 p-2 rounded-lg bg-black/50 backdrop-blur-sm max-w-[90vw] overflow-x-auto">
          {images.map((img, index) => (
            <button
              key={index}
              onClick={(e) => { e.stopPropagation(); setCurrentIndex(index); }}
              className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden transition-all ${
                currentIndex === index
                  ? 'ring-2 ring-white scale-110'
                  : 'opacity-50 hover:opacity-80'
              }`}
            >
              <img src={img} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Keyboard hints */}
      <div className="absolute bottom-4 right-4 z-10 text-white/40 text-xs space-y-1 hidden md:block">
        <div>← → : 이동</div>
        <div>ESC : 닫기</div>
        <div>스크롤 : 확대/축소</div>
      </div>
    </div>
  );
}
