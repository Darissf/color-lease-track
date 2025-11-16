import { 
  Utensils, 
  Car, 
  ShoppingBag, 
  Home, 
  Zap, 
  Heart, 
  GraduationCap, 
  Plane,
  Smartphone,
  Shirt,
  Film,
  Gift,
  DollarSign,
  Wrench,
  Building2,
  LucideIcon
} from "lucide-react";

export interface CategoryStyle {
  bg: string;
  text: string;
  border: string;
  gradient: string;
  icon: LucideIcon;
}

export const CATEGORY_COLORS: Record<string, CategoryStyle> = {
  'Makanan': {
    bg: 'bg-orange-500',
    text: 'text-orange-600',
    border: 'border-orange-500',
    gradient: 'from-orange-400 to-orange-600',
    icon: Utensils
  },
  'Transportasi': {
    bg: 'bg-blue-500',
    text: 'text-blue-600',
    border: 'border-blue-500',
    gradient: 'from-blue-400 to-blue-600',
    icon: Car
  },
  'Transport': {
    bg: 'bg-blue-500',
    text: 'text-blue-600',
    border: 'border-blue-500',
    gradient: 'from-blue-400 to-blue-600',
    icon: Car
  },
  'Belanja': {
    bg: 'bg-pink-500',
    text: 'text-pink-600',
    border: 'border-pink-500',
    gradient: 'from-pink-400 to-pink-600',
    icon: ShoppingBag
  },
  'Rumah Tangga': {
    bg: 'bg-green-500',
    text: 'text-green-600',
    border: 'border-green-500',
    gradient: 'from-green-400 to-green-600',
    icon: Home
  },
  'Tagihan': {
    bg: 'bg-red-500',
    text: 'text-red-600',
    border: 'border-red-500',
    gradient: 'from-red-400 to-red-600',
    icon: Zap
  },
  'Kesehatan': {
    bg: 'bg-rose-500',
    text: 'text-rose-600',
    border: 'border-rose-500',
    gradient: 'from-rose-400 to-rose-600',
    icon: Heart
  },
  'Pendidikan': {
    bg: 'bg-indigo-500',
    text: 'text-indigo-600',
    border: 'border-indigo-500',
    gradient: 'from-indigo-400 to-indigo-600',
    icon: GraduationCap
  },
  'Hiburan': {
    bg: 'bg-purple-500',
    text: 'text-purple-600',
    border: 'border-purple-500',
    gradient: 'from-purple-400 to-purple-600',
    icon: Film
  },
  'Travel': {
    bg: 'bg-cyan-500',
    text: 'text-cyan-600',
    border: 'border-cyan-500',
    gradient: 'from-cyan-400 to-cyan-600',
    icon: Plane
  },
  'Komunikasi': {
    bg: 'bg-teal-500',
    text: 'text-teal-600',
    border: 'border-teal-500',
    gradient: 'from-teal-400 to-teal-600',
    icon: Smartphone
  },
  'Fashion': {
    bg: 'bg-fuchsia-500',
    text: 'text-fuchsia-600',
    border: 'border-fuchsia-500',
    gradient: 'from-fuchsia-400 to-fuchsia-600',
    icon: Shirt
  },
  'Hadiah': {
    bg: 'bg-amber-500',
    text: 'text-amber-600',
    border: 'border-amber-500',
    gradient: 'from-amber-400 to-amber-600',
    icon: Gift
  },
  'Investasi': {
    bg: 'bg-emerald-500',
    text: 'text-emerald-600',
    border: 'border-emerald-500',
    gradient: 'from-emerald-400 to-emerald-600',
    icon: DollarSign
  },
  'Perbaikan': {
    bg: 'bg-slate-500',
    text: 'text-slate-600',
    border: 'border-slate-500',
    gradient: 'from-slate-400 to-slate-600',
    icon: Wrench
  },
  'Pemeliharaan': {
    bg: 'bg-yellow-500',
    text: 'text-yellow-600',
    border: 'border-yellow-500',
    gradient: 'from-yellow-400 to-yellow-600',
    icon: Wrench
  },
  'Properti': {
    bg: 'bg-violet-500',
    text: 'text-violet-600',
    border: 'border-violet-500',
    gradient: 'from-violet-400 to-violet-600',
    icon: Building2
  },
  'Lainnya': {
    bg: 'bg-gray-500',
    text: 'text-gray-600',
    border: 'border-gray-500',
    gradient: 'from-gray-400 to-gray-600',
    icon: DollarSign
  }
};

export const getCategoryStyle = (category: string): CategoryStyle => {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS['Lainnya'];
};

export const CHART_GRADIENT_COLORS = [
  { color: '#8b5cf6', gradient: 'url(#colorPurple)' },
  { color: '#3b82f6', gradient: 'url(#colorBlue)' },
  { color: '#10b981', gradient: 'url(#colorGreen)' },
  { color: '#f59e0b', gradient: 'url(#colorAmber)' },
  { color: '#ef4444', gradient: 'url(#colorRed)' },
  { color: '#ec4899', gradient: 'url(#colorPink)' },
  { color: '#14b8a6', gradient: 'url(#colorTeal)' },
  { color: '#f97316', gradient: 'url(#colorOrange)' }
];
