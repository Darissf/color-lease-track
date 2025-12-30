import React, { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { StampElement, CanvasSettings, defaultStampElements, defaultCanvasSettings } from './types';
import { DraggableElement } from './DraggableElement';
import { ElementProperties } from './ElementProperties';
import { ElementList } from './ElementList';
import { DesignerToolbar } from './DesignerToolbar';
import { CanvasSettings as CanvasSettingsPanel } from './CanvasSettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export const StampDesigner: React.FC = () => {
  const { user } = useAuth();
  const [elements, setElements] = useState<StampElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [canvasSettings, setCanvasSettings] = useState<CanvasSettings>(defaultCanvasSettings);
  
  const canvasRef = useRef<HTMLDivElement>(null);

  // Fetch elements from database
  useEffect(() => {
    const fetchElements = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('stamp_elements')
          .select('*')
          .eq('user_id', user.id)
          .order('order_index');

        if (error) throw error;

        if (data && data.length > 0) {
          setElements(data.map(el => ({
            ...el,
            position_x: Number(el.position_x),
            position_y: Number(el.position_y),
          })) as StampElement[]);
        } else {
          // Initialize with default elements
          await initializeDefaultElements();
        }
      } catch (error) {
        console.error('Error fetching elements:', error);
        toast.error('Gagal memuat elemen stempel');
      } finally {
        setLoading(false);
      }
    };

    fetchElements();
  }, [user]);

  const initializeDefaultElements = async () => {
    if (!user) return;

    const newElements: StampElement[] = defaultStampElements.map((el, index) => ({
      ...el,
      id: crypto.randomUUID(),
      user_id: user.id,
      order_index: index,
    }));

    try {
      const { error } = await supabase
        .from('stamp_elements')
        .insert(newElements);

      if (error) throw error;

      setElements(newElements);
    } catch (error) {
      console.error('Error initializing elements:', error);
      // Still set elements locally even if save fails
      setElements(newElements);
    }
  };

  const selectedElement = elements.find((el) => el.id === selectedId) || null;

  const updateElement = useCallback((id: string, updates: Partial<StampElement>) => {
    setElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, ...updates } : el))
    );
    setHasChanges(true);
  }, []);

  const deleteElement = useCallback((id: string) => {
    setElements((prev) => prev.filter((el) => el.id !== id));
    if (selectedId === id) setSelectedId(null);
    setHasChanges(true);
  }, [selectedId]);

  const addTextElement = useCallback(() => {
    if (!user) return;

    const newElement: StampElement = {
      id: crypto.randomUUID(),
      user_id: user.id,
      element_type: 'text',
      content: 'Teks Baru',
      position_x: 50,
      position_y: 50,
      font_family: 'Arial',
      font_size: 14,
      font_weight: 'normal',
      color: '#047857',
      rotation: 0,
      order_index: elements.length,
      is_visible: true,
    };

    setElements((prev) => [...prev, newElement]);
    setSelectedId(newElement.id);
    setHasChanges(true);
  }, [user, elements.length]);

  const toggleVisibility = useCallback((id: string) => {
    setElements((prev) =>
      prev.map((el) =>
        el.id === id ? { ...el, is_visible: !el.is_visible } : el
      )
    );
    setHasChanges(true);
  }, []);

  const moveElement = useCallback((id: string, direction: 'up' | 'down') => {
    setElements((prev) => {
      const sorted = [...prev].sort((a, b) => a.order_index - b.order_index);
      const index = sorted.findIndex((el) => el.id === id);
      
      if (
        (direction === 'up' && index === 0) ||
        (direction === 'down' && index === sorted.length - 1)
      ) {
        return prev;
      }

      const newIndex = direction === 'up' ? index - 1 : index + 1;
      const temp = sorted[index].order_index;
      sorted[index].order_index = sorted[newIndex].order_index;
      sorted[newIndex].order_index = temp;

      return sorted;
    });
    setHasChanges(true);
  }, []);

  const handleReset = async () => {
    if (!user) return;
    
    // Delete all existing elements
    try {
      await supabase
        .from('stamp_elements')
        .delete()
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error deleting elements:', error);
    }

    // Re-initialize with defaults
    await initializeDefaultElements();
    setSelectedId(null);
    setHasChanges(false);
    toast.success('Stempel direset ke default');
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      // Delete existing elements
      await supabase
        .from('stamp_elements')
        .delete()
        .eq('user_id', user.id);

      // Insert current elements
      if (elements.length > 0) {
        const { error } = await supabase
          .from('stamp_elements')
          .insert(elements.map(el => ({
            ...el,
            user_id: user.id,
          })));

        if (error) throw error;
      }

      setHasChanges(false);
      toast.success('Stempel berhasil disimpan');
    } catch (error) {
      console.error('Error saving elements:', error);
      toast.error('Gagal menyimpan stempel');
    } finally {
      setSaving(false);
    }
  };

  // Drag handling
  const handleDragStart = (e: React.MouseEvent) => {
    if (!selectedId || !canvasRef.current) return;

    const element = elements.find((el) => el.id === selectedId);
    if (!element) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const elementX = (element.position_x / 100) * rect.width;
    const elementY = (element.position_y / 100) * rect.height;

    setDragOffset({
      x: e.clientX - rect.left - elementX,
      y: e.clientY - rect.top - elementY,
    });
    setIsDragging(true);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !selectedId || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      let newX = ((e.clientX - rect.left - dragOffset.x) / rect.width) * 100;
      let newY = ((e.clientY - rect.top - dragOffset.y) / rect.height) * 100;

      // Clamp values
      newX = Math.max(0, Math.min(100, newX));
      newY = Math.max(0, Math.min(100, newY));

      updateElement(selectedId, { position_x: newX, position_y: newY });
    },
    [isDragging, selectedId, dragOffset, updateElement]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleCanvasSettingsChange = (newSettings: CanvasSettings) => {
    setCanvasSettings(newSettings);
    setHasChanges(true);
  };

  const handleShapeChange = (shape: 'rectangle' | 'circle' | 'oval') => {
    setCanvasSettings(prev => ({
      ...prev,
      shape,
      height: shape === 'circle' ? prev.width : prev.height,
    }));
    setHasChanges(true);
  };

  // Render canvas with shape
  const renderCanvasShape = () => {
    const { shape, width, height, borderWidth, borderStyle, borderColor, rotation } = canvasSettings;
    const canvasHeight = shape === 'circle' ? width : height;

    const borderStyles = {
      borderWidth: `${borderWidth}px`,
      borderStyle,
      borderColor,
    };

    const commonClasses = "relative bg-white overflow-hidden";

    return (
      <div 
        className="flex items-center justify-center p-6 bg-muted/20 rounded-lg min-h-[280px]"
        onClick={() => setSelectedId(null)}
      >
        <div style={{ transform: `rotate(${rotation}deg)`, transition: 'transform 0.2s ease' }}>
          <div
            ref={canvasRef}
            className={commonClasses}
            style={{
              width: `${width}px`,
              height: `${canvasHeight}px`,
              ...borderStyles,
              borderRadius: shape === 'rectangle' ? '8px' : '50%',
              cursor: isDragging ? 'grabbing' : 'default',
            }}
          >
            {/* Grid overlay */}
            <div 
              className="absolute inset-0 pointer-events-none opacity-10"
              style={{
                backgroundImage: `linear-gradient(to right, ${borderColor} 1px, transparent 1px), linear-gradient(to bottom, ${borderColor} 1px, transparent 1px)`,
                backgroundSize: '20% 20%',
              }}
            />

            {/* Render elements */}
            {elements.map((element) => (
              <DraggableElement
                key={element.id}
                element={element}
                isSelected={selectedId === element.id}
                onSelect={() => setSelectedId(element.id)}
                onDragStart={handleDragStart}
                containerRef={canvasRef}
              />
            ))}

            {/* Center guides */}
            <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-primary/20 pointer-events-none" />
            <div className="absolute left-1/2 top-0 bottom-0 border-l border-dashed border-primary/20 pointer-events-none" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <DesignerToolbar
        onAddText={addTextElement}
        onReset={handleReset}
        onSave={handleSave}
        saving={saving}
        hasChanges={hasChanges}
        canvasShape={canvasSettings.shape}
        onShapeChange={handleShapeChange}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Canvas */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Canvas Stempel</CardTitle>
            </CardHeader>
            <CardContent>
              {renderCanvasShape()}
            </CardContent>
          </Card>
        </div>

        {/* Properties & Settings */}
        <div className="space-y-4">
          <CanvasSettingsPanel
            settings={canvasSettings}
            onChange={handleCanvasSettingsChange}
          />

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Properti Elemen</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ElementProperties
                element={selectedElement}
                onUpdate={updateElement}
                onDelete={deleteElement}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Daftar Elemen</CardTitle>
            </CardHeader>
            <CardContent>
              <ElementList
                elements={elements}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onToggleVisibility={toggleVisibility}
                onMoveUp={(id) => moveElement(id, 'up')}
                onMoveDown={(id) => moveElement(id, 'down')}
                onDelete={deleteElement}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
