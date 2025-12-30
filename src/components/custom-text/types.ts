export interface CustomTextElement {
  id: string;
  user_id: string;
  document_type: 'invoice' | 'receipt';
  content: string;
  position_x: number;
  position_y: number;
  rotation: number;
  font_size: number;
  font_family: string;
  font_weight: string;
  font_color: string;
  text_align: string;
  is_visible: boolean;
  order_index: number;
  created_at?: string;
  updated_at?: string;
}

export const defaultCustomTextElement: Omit<CustomTextElement, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  document_type: 'invoice',
  content: 'Custom Text',
  position_x: 50,
  position_y: 50,
  rotation: 0,
  font_size: 14,
  font_family: 'Arial',
  font_weight: 'normal',
  font_color: '#000000',
  text_align: 'left',
  is_visible: true,
  order_index: 0,
};
