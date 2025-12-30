import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { StampElement, CanvasSettings, defaultCanvasSettings } from '@/components/stamp-designer/types';

interface CustomStampRendererProps {
  documentNumber?: string;
  companyName?: string;
  date?: string;
  scale?: number;
  rotation?: number;
  opacity?: number;
}

export const CustomStampRenderer: React.FC<CustomStampRendererProps> = ({
  documentNumber = 'INV-2025-0001',
  companyName = 'Perusahaan',
  date,
  scale = 1,
  rotation = 0,
  opacity = 80,
}) => {
  const [elements, setElements] = useState<StampElement[]>([]);
  const [canvasSettings, setCanvasSettings] = useState<CanvasSettings>(defaultCanvasSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStampData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // Fetch stamp elements
        const { data: elementsData } = await supabase
          .from('stamp_elements')
          .select('*')
          .eq('user_id', user.id)
          .order('order_index', { ascending: true });

        if (elementsData && elementsData.length > 0) {
          setElements(elementsData as StampElement[]);
        }

        // Fetch canvas settings from document_settings
        const { data: settingsData } = await supabase
          .from('document_settings')
          .select('stamp_canvas_width, stamp_canvas_height, stamp_border_width, stamp_border_style, stamp_border_color, stamp_rotation, stamp_type')
          .eq('user_id', user.id)
          .single();

        if (settingsData) {
          setCanvasSettings({
            shape: (settingsData.stamp_type as 'rectangle' | 'circle' | 'oval') || 'oval',
            width: settingsData.stamp_canvas_width || 220,
            height: settingsData.stamp_canvas_height || 120,
            borderWidth: settingsData.stamp_border_width || 3,
            borderStyle: (settingsData.stamp_border_style as 'solid' | 'dashed' | 'dotted' | 'double') || 'solid',
            borderColor: settingsData.stamp_border_color || '#047857',
            rotation: settingsData.stamp_rotation || -8,
          });
        }
      } catch (error) {
        console.error('Error fetching stamp data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStampData();
  }, []);

  // Replace placeholders in content
  const processContent = (content: string): string => {
    const currentDate = date || format(new Date(), 'dd/MM/yyyy');
    return content
      .replace(/\{\{tanggal\}\}/gi, currentDate)
      .replace(/\{\{nomor\}\}/gi, documentNumber)
      .replace(/\{\{perusahaan\}\}/gi, companyName)
      .replace(/No\. INV-\d{4}-\d{3}/gi, `No. ${documentNumber}`)
      .replace(/\d{2}\/\d{2}\/\d{4}/gi, currentDate);
  };

  const getShapeStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      width: canvasSettings.width * scale,
      height: canvasSettings.height * scale,
      border: `${canvasSettings.borderWidth}px ${canvasSettings.borderStyle} ${canvasSettings.borderColor}`,
      position: 'relative',
      transform: `rotate(${canvasSettings.rotation + rotation}deg)`,
      opacity: opacity / 100,
    };

    if (canvasSettings.shape === 'circle') {
      return {
        ...baseStyle,
        borderRadius: '50%',
        width: Math.max(canvasSettings.width, canvasSettings.height) * scale,
        height: Math.max(canvasSettings.width, canvasSettings.height) * scale,
      };
    } else if (canvasSettings.shape === 'oval') {
      return {
        ...baseStyle,
        borderRadius: '50%',
      };
    }
    // rectangle
    return {
      ...baseStyle,
      borderRadius: '4px',
    };
  };

  if (loading) {
    return null;
  }

  if (elements.length === 0) {
    // Fallback: no custom stamp elements, render nothing
    return null;
  }

  return (
    <div style={getShapeStyle()} className="flex items-center justify-center overflow-hidden">
      {elements
        .filter(el => el.is_visible)
        .map((element) => (
          <div
            key={element.id}
            style={{
              position: 'absolute',
              left: `${element.position_x}%`,
              top: `${element.position_y}%`,
              transform: `translate(-50%, -50%) rotate(${element.rotation}deg)`,
              fontFamily: element.font_family,
              fontSize: `${element.font_size * scale}px`,
              fontWeight: element.font_weight,
              color: element.color,
              whiteSpace: 'nowrap',
              textAlign: 'center',
            }}
          >
            {processContent(element.content)}
          </div>
        ))}
    </div>
  );
};
