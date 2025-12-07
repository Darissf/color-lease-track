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
  Droplets,
  Wifi,
  Shield,
  Receipt,
  TrendingUp,
  CreditCard,
  Calendar,
  AlertCircle,
  MoreHorizontal,
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
  // ExpenseTracker categories
  'Makanan & Minuman': {
    bg: 'bg-gradient-to-r from-orange-400 via-red-400 to-pink-400',
    text: 'text-orange-600',
    border: 'border-orange-400',
    gradient: 'from-orange-400 via-red-400 to-pink-400',
    icon: Utensils
  },
  'Transportasi': {
    bg: 'bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400',
    text: 'text-blue-600',
    border: 'border-blue-400',
    gradient: 'from-blue-400 via-cyan-400 to-teal-400',
    icon: Car
  },
  'Komisi': {
    bg: 'bg-gradient-to-r from-emerald-400 via-green-400 to-lime-400',
    text: 'text-emerald-600',
    border: 'border-emerald-400',
    gradient: 'from-emerald-400 via-green-400 to-lime-400',
    icon: DollarSign
  },
  'Sedekah': {
    bg: 'bg-gradient-to-r from-pink-400 via-rose-400 to-red-400',
    text: 'text-pink-600',
    border: 'border-pink-400',
    gradient: 'from-pink-400 via-rose-400 to-red-400',
    icon: Heart
  },
  'Belanja': {
    bg: 'bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-400',
    text: 'text-purple-600',
    border: 'border-purple-400',
    gradient: 'from-purple-400 via-fuchsia-400 to-pink-400',
    icon: ShoppingBag
  },
  'Kesehatan': {
    bg: 'bg-gradient-to-r from-rose-400 via-red-400 to-orange-400',
    text: 'text-rose-600',
    border: 'border-rose-400',
    gradient: 'from-rose-400 via-red-400 to-orange-400',
    icon: Heart
  },
  'Pendidikan': {
    bg: 'bg-gradient-to-r from-indigo-400 via-purple-400 to-violet-400',
    text: 'text-indigo-600',
    border: 'border-indigo-400',
    gradient: 'from-indigo-400 via-purple-400 to-violet-400',
    icon: GraduationCap
  },
  'Hiburan': {
    bg: 'bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400',
    text: 'text-violet-600',
    border: 'border-violet-400',
    gradient: 'from-violet-400 via-purple-400 to-fuchsia-400',
    icon: Film
  },
  'Listrik & Air': {
    bg: 'bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400',
    text: 'text-yellow-600',
    border: 'border-yellow-400',
    gradient: 'from-yellow-400 via-amber-400 to-orange-400',
    icon: Zap
  },
  'Internet & Pulsa': {
    bg: 'bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-400',
    text: 'text-cyan-600',
    border: 'border-cyan-400',
    gradient: 'from-cyan-400 via-sky-400 to-blue-400',
    icon: Wifi
  },
  'Rumah Tangga': {
    bg: 'bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400',
    text: 'text-green-600',
    border: 'border-green-400',
    gradient: 'from-green-400 via-emerald-400 to-teal-400',
    icon: Home
  },
  'Kendaraan': {
    bg: 'bg-gradient-to-r from-slate-400 via-blue-400 to-indigo-400',
    text: 'text-slate-600',
    border: 'border-slate-400',
    gradient: 'from-slate-400 via-blue-400 to-indigo-400',
    icon: Car
  },
  'Asuransi': {
    bg: 'bg-gradient-to-r from-teal-400 via-cyan-400 to-sky-400',
    text: 'text-teal-600',
    border: 'border-teal-400',
    gradient: 'from-teal-400 via-cyan-400 to-sky-400',
    icon: Shield
  },
  'Pajak': {
    bg: 'bg-gradient-to-r from-red-400 via-rose-400 to-pink-400',
    text: 'text-red-600',
    border: 'border-red-400',
    gradient: 'from-red-400 via-rose-400 to-pink-400',
    icon: Receipt
  },
  'Investasi': {
    bg: 'bg-gradient-to-r from-amber-400 via-yellow-400 to-lime-400',
    text: 'text-amber-600',
    border: 'border-amber-400',
    gradient: 'from-amber-400 via-yellow-400 to-lime-400',
    icon: TrendingUp
  },
  'Cicilan': {
    bg: 'bg-gradient-to-r from-slate-400 via-gray-400 to-zinc-400',
    text: 'text-slate-600',
    border: 'border-slate-400',
    gradient: 'from-slate-400 via-gray-400 to-zinc-400',
    icon: CreditCard
  },
  'Pengeluaran Tetap': {
    bg: 'bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400',
    text: 'text-blue-600',
    border: 'border-blue-400',
    gradient: 'from-blue-400 via-indigo-400 to-violet-400',
    icon: Calendar
  },
  'Tak Terduga': {
    bg: 'bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400',
    text: 'text-orange-600',
    border: 'border-orange-400',
    gradient: 'from-orange-400 via-amber-400 to-yellow-400',
    icon: AlertCircle
  },
  'Lainnya': {
    bg: 'bg-gradient-to-r from-gray-400 via-slate-400 to-zinc-400',
    text: 'text-gray-600',
    border: 'border-gray-400',
    gradient: 'from-gray-400 via-slate-400 to-zinc-400',
    icon: MoreHorizontal
  },
  // Legacy categories (for backward compatibility)
  'Makanan': {
    bg: 'bg-gradient-to-r from-orange-400 via-red-400 to-pink-400',
    text: 'text-orange-600',
    border: 'border-orange-400',
    gradient: 'from-orange-400 via-red-400 to-pink-400',
    icon: Utensils
  },
  'Transport': {
    bg: 'bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400',
    text: 'text-blue-600',
    border: 'border-blue-400',
    gradient: 'from-blue-400 via-cyan-400 to-teal-400',
    icon: Car
  },
  'Tagihan': {
    bg: 'bg-gradient-to-r from-red-400 via-rose-400 to-pink-400',
    text: 'text-red-600',
    border: 'border-red-400',
    gradient: 'from-red-400 via-rose-400 to-pink-400',
    icon: Zap
  },
  'Travel': {
    bg: 'bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-400',
    text: 'text-cyan-600',
    border: 'border-cyan-400',
    gradient: 'from-cyan-400 via-sky-400 to-blue-400',
    icon: Plane
  },
  'Komunikasi': {
    bg: 'bg-gradient-to-r from-teal-400 via-cyan-400 to-sky-400',
    text: 'text-teal-600',
    border: 'border-teal-400',
    gradient: 'from-teal-400 via-cyan-400 to-sky-400',
    icon: Smartphone
  },
  'Fashion': {
    bg: 'bg-gradient-to-r from-fuchsia-400 via-pink-400 to-rose-400',
    text: 'text-fuchsia-600',
    border: 'border-fuchsia-400',
    gradient: 'from-fuchsia-400 via-pink-400 to-rose-400',
    icon: Shirt
  },
  'Hadiah': {
    bg: 'bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400',
    text: 'text-amber-600',
    border: 'border-amber-400',
    gradient: 'from-amber-400 via-yellow-400 to-orange-400',
    icon: Gift
  },
  'Perbaikan': {
    bg: 'bg-gradient-to-r from-slate-400 via-gray-400 to-zinc-400',
    text: 'text-slate-600',
    border: 'border-slate-400',
    gradient: 'from-slate-400 via-gray-400 to-zinc-400',
    icon: Wrench
  },
  'Pemeliharaan': {
    bg: 'bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400',
    text: 'text-yellow-600',
    border: 'border-yellow-400',
    gradient: 'from-yellow-400 via-amber-400 to-orange-400',
    icon: Wrench
  },
  'Properti': {
    bg: 'bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400',
    text: 'text-violet-600',
    border: 'border-violet-400',
    gradient: 'from-violet-400 via-purple-400 to-indigo-400',
    icon: Building2
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
