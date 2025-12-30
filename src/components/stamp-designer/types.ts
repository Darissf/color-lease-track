export interface StampElement {
  id: string;
  user_id: string;
  element_type: 'text' | 'line' | 'shape';
  content: string;
  position_x: number; // 0-100%
  position_y: number; // 0-100%
  font_family: string;
  font_size: number;
  font_weight: string;
  color: string;
  rotation: number;
  order_index: number;
  is_visible: boolean;
  created_at?: string;
  updated_at?: string;
}

export const defaultStampElements: Omit<StampElement, 'id' | 'user_id' | 'created_at' | 'updated_at'>[] = [
  {
    element_type: 'text',
    content: 'LUNAS',
    position_x: 50,
    position_y: 25,
    font_family: 'Arial',
    font_size: 28,
    font_weight: 'bold',
    color: '#047857',
    rotation: 0,
    order_index: 0,
    is_visible: true,
  },
  {
    element_type: 'text',
    content: 'No. INV-2024-001',
    position_x: 50,
    position_y: 50,
    font_family: 'Arial',
    font_size: 12,
    font_weight: 'normal',
    color: '#047857',
    rotation: 0,
    order_index: 1,
    is_visible: true,
  },
  {
    element_type: 'text',
    content: '30/12/2024',
    position_x: 50,
    position_y: 65,
    font_family: 'Arial',
    font_size: 11,
    font_weight: 'normal',
    color: '#047857',
    rotation: 0,
    order_index: 2,
    is_visible: true,
  },
  {
    element_type: 'text',
    content: 'CV. NAMA PERUSAHAAN',
    position_x: 50,
    position_y: 80,
    font_family: 'Arial',
    font_size: 10,
    font_weight: 'bold',
    color: '#047857',
    rotation: 0,
    order_index: 3,
    is_visible: true,
  },
];

export const fontFamilies = [
  { value: 'Arial', label: 'Arial' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Courier New', label: 'Courier New' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Trebuchet MS', label: 'Trebuchet MS' },
  { value: 'Impact', label: 'Impact' },
];

export const fontWeights = [
  { value: 'normal', label: 'Normal' },
  { value: 'bold', label: 'Bold' },
  { value: 'lighter', label: 'Light' },
];
