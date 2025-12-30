import React, { useRef } from 'react';
import { StampElement, CanvasSettings } from './types';
import { DraggableElement } from './DraggableElement';

interface StampCanvasProps {
  elements: StampElement[];
  canvasSettings: CanvasSettings;
  selectedId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (id: string, updates: Partial<StampElement>) => void;
}

export const StampCanvas: React.FC<StampCanvasProps> = ({
  elements,
  canvasSettings,
  selectedId,
  onSelectElement,
  onUpdateElement,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('[data-canvas-bg]')) {
      onSelectElement(null);
    }
  };

  const handleDrag = (elementId: string, e: React.MouseEvent) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    const newX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const newY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    
    onUpdateElement(elementId, { position_x: newX, position_y: newY });
  };

  const { shape, width, height, borderWidth, borderStyle, borderColor } = canvasSettings;

  const renderCanvasShape = () => {
    const visibleElements = elements.filter(el => el.is_visible);

    const elementsLayer = (
      <div className="absolute inset-0">
        {visibleElements.map((element) => (
          <DraggableElement
            key={element.id}
            element={element}
            isSelected={selectedId === element.id}
            onSelect={() => onSelectElement(element.id)}
            onDrag={(e) => handleDrag(element.id, e)}
          />
        ))}
      </div>
    );

    const commonStyles = {
      width,
      height: shape === 'circle' ? width : height,
      borderWidth,
      borderStyle,
      borderColor,
    };

    switch (shape) {
      case 'circle':
        return (
          <div
            ref={canvasRef}
            className="relative bg-background cursor-crosshair overflow-hidden"
            style={{
              ...commonStyles,
              borderRadius: '50%',
            }}
            onClick={handleCanvasClick}
            data-canvas-bg
          >
            {elementsLayer}
          </div>
        );

      case 'oval':
        return (
          <div
            ref={canvasRef}
            className="relative bg-background cursor-crosshair overflow-hidden"
            style={{
              ...commonStyles,
              borderRadius: '50%',
            }}
            onClick={handleCanvasClick}
            data-canvas-bg
          >
            {elementsLayer}
          </div>
        );

      default: // rectangle
        return (
          <div
            ref={canvasRef}
            className="relative bg-background cursor-crosshair overflow-hidden rounded-lg"
            style={commonStyles}
            onClick={handleCanvasClick}
            data-canvas-bg
          >
            {elementsLayer}
          </div>
        );
    }
  };

  return (
    <div className="flex items-center justify-center p-6 bg-muted/20 rounded-lg min-h-[250px]">
      <div
        style={{
          transform: `rotate(${canvasSettings.rotation}deg)`,
          transition: 'transform 0.2s ease',
        }}
      >
        {renderCanvasShape()}
      </div>
    </div>
  );
};
