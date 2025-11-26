import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaginationControls } from "@/components/shared/PaginationControls";
import { Plus, Users, Trash2, Edit, CheckCircle, XCircle, AlertCircle, Loader2, ExternalLink, FileText, ChevronDown, ChevronRight, Calendar, Wallet, Sparkles } from "lucide-react";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { ColoredStatCard } from "@/components/ColoredStatCard";
import { GradientButton } from "@/components/GradientButton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/currency";
import { useAppTheme } from "@/contexts/AppThemeContext";
import { z } from "zod";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface ClientGroup {
  id: string;
  nama: string;
  nomor_telepon: string;
  icon: string;
  ktp_files: Array<{ name: string; url: string }>;
  has_whatsapp: boolean | null;
  whatsapp_checked_at: string | null;
  created_at: string;
}

interface Contract {
  id: string;
  invoice: string | null;
  start_date: string;
  end_date: string;
  status: string;
  jumlah_lunas: number | null;
  tagihan_belum_bayar: number | null;
  tanggal: string | null;
}

// Validation schema for Indonesian phone numbers
const phoneSchema = z.string()
  .trim()
  .refine(
    (val) => {
      // Accept formats: +62xxx or 08xx
      const indonesianPhoneRegex = /^(\+62|08)\d{8,12}$/;
      return indonesianPhoneRegex.test(val);
    },
    {
      message: "Nomor telepon harus format +62xxx atau 08xx (minimal 10 digit)"
    }
  );

const ClientGroups = () => {
  const { user } = useAuth();
  const { activeTheme } = useAppTheme();
  const [clientGroups, setClientGroups] = useState<ClientGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [validatingWhatsApp, setValidatingWhatsApp] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState<{has_whatsapp: boolean | null; confidence: string; reason: string} | null>(null);
  const [sortBy, setSortBy] = useState<'number' | 'nama' | 'telepon' | 'whatsapp' | 'created' | 'none'>('none');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const saved = localStorage.getItem('clientGroups_itemsPerPage');
    return saved ? parseInt(saved) : 10;
  });
  const [searchQuery, setSearchQuery] = useState("");
  
  // Expandable client states
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [clientContracts, setClientContracts] = useState<Record<string, Contract[]>>({});
  const [loadingContracts, setLoadingContracts] = useState<Set<string>>(new Set());
  const [contractCounts, setContractCounts] = useState<Record<string, number>>({});
  const [contractStatusBreakdown, setContractStatusBreakdown] = useState<Record<string, { active: number; completed: number }>>({});
  
  const navigate = useNavigate();

  // Icon options for clients - expanded comprehensive list
  const iconOptions = [
    // People & Professions
    "👤", "👨", "👩", "🧑", "👶", "🧒", "👦", "👧", "👴", "👵", "🧓",
    "👨‍💼", "👩‍💼", "🧑‍💼", "👨‍🎓", "👩‍🎓", "🧑‍🎓", "👨‍🏫", "👩‍🏫", "🧑‍🏫",
    "👨‍⚖️", "👩‍⚖️", "🧑‍⚖️", "👨‍🌾", "👩‍🌾", "🧑‍🌾", "👨‍🍳", "👩‍🍳", "🧑‍🍳",
    "👨‍🔧", "👩‍🔧", "🧑‍🔧", "👨‍🏭", "👩‍🏭", "🧑‍🏭", "👨‍💻", "👩‍💻", "🧑‍💻",
    "👨‍🔬", "👩‍🔬", "🧑‍🔬", "👨‍🎨", "👩‍🎨", "🧑‍🎨", "👨‍🚒", "👩‍🚒", "🧑‍🚒",
    "👨‍✈️", "👩‍✈️", "🧑‍✈️", "👨‍🚀", "👩‍🚀", "🧑‍🚀", "👨‍⚕️", "👩‍⚕️", "🧑‍⚕️",
    "🧔", "👱", "👱‍♀️", "👱‍♂️", "🧑‍🦰", "🧑‍🦱", "🧑‍🦳", "🧑‍🦲",
    "👨‍👩‍👦", "👨‍👩‍👧", "👨‍👩‍👧‍👦", "👨‍👨‍👦", "👩‍👩‍👧", "👨‍👦", "👩‍👧",
    "🕵️", "💂", "👷", "🤴", "👸", "👳", "👲", "🧕", "🤵", "👰", "🤰", "🤱",
    
    // Business & Buildings
    "💼", "🏢", "🏠", "🏡", "🏘️", "🏚️", "🏗️", "🏭", "🏛️", "🏦", "🏪", "🏬",
    "🏨", "🏩", "🏫", "🏤", "🏥", "🏣", "🏰", "🏯", "🗼", "🗽", "⛪", "🕌",
    "🛕", "🕍", "⛩️", "🕋", "🗾", "🎪", "🎭", "🎬", "🎤", "🎧", "🎼", "🎹",
    
    // Special & Symbols
    "⭐", "🌟", "💎", "👑", "🎯", "🔥", "⚡", "✨", "💫", "🌈", "☄️",
    "🎊", "🎉", "🎁", "🏆", "🥇", "🥈", "🥉", "🏅", "🎖️", "🎗️", "🏵️",
    "💯", "💢", "💥", "💦", "💨", "🕳️", "💬", "💭", "🗨️", "🗯️", "💤",
    "♠️", "♥️", "♦️", "♣️", "🃏", "🀄", "🎴", "🎲", "🎰", "🧧",
    
    // Hearts & Emotions
    "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💝", "💖", "💗",
    "💓", "💞", "💕", "💟", "❣️", "💔", "❤️‍🔥", "❤️‍🩹", "💘", "💌",
    "😊", "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉",
    "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪",
    "🤨", "🧐", "🤓", "😎", "🥸", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟",
    "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠",
    "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗",
    "🤔", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧",
    "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢", "🤮", "🤧",
    "😷", "🤒", "🤕", "🤑", "🤠", "😈", "👿", "👹", "👺", "🤡", "💩", "👻",
    "💀", "☠️", "👽", "👾", "🤖", "🎃", "😺", "😸", "😹", "😻", "😼", "😽",
    "🙀", "😿", "😾",
    
    // Animals
    "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮",
    "🐷", "🐸", "🐵", "🙈", "🙉", "🙊", "🐒", "🐔", "🐧", "🐦", "🐤", "🐣",
    "🐥", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🐛", "🦋",
    "🐌", "🐞", "🐜", "🦟", "🦗", "🕷️", "🕸️", "🦂", "🐢", "🐍", "🦎", "🦖",
    "🦕", "🐙", "🦑", "🦐", "🦞", "🦀", "🐡", "🐠", "🐟", "🐬", "🐳", "🐋",
    "🦈", "🐊", "🐅", "🐆", "🦓", "🦍", "🦧", "🐘", "🦛", "🦏", "🐪", "🐫",
    "🦒", "🦘", "🐃", "🐂", "🐄", "🐎", "🐖", "🐏", "🐑", "🦙", "🐐", "🦌",
    "🐕", "🐩", "🦮", "🐕‍🦺", "🐈", "🐈‍⬛", "🐓", "🦃", "🦚", "🦜", "🦢", "🦩",
    "🕊️", "🐇", "🦝", "🦨", "🦡", "🦦", "🦥", "🐁", "🐀", "🐿️", "🦔",
    
    // Nature & Plants
    "🌸", "💮", "🏵️", "🌹", "🥀", "🌺", "🌻", "🌼", "🌷", "🌱", "🌲", "🌳",
    "🌴", "🌵", "🌾", "🌿", "☘️", "🍀", "🍁", "🍂", "🍃", "🍄", "🌰", "🦀",
    "🐚", "🌍", "🌎", "🌏", "🌐", "🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗",
    "🌘", "🌙", "🌚", "🌛", "🌜", "☀️", "🌝", "🌞", "⭐", "🌟", "🌠", "☁️",
    "⛅", "⛈️", "🌤️", "🌥️", "🌦️", "🌧️", "🌨️", "🌩️", "🌪️", "🌫️", "🌬️", "🌀",
    "🌈", "☂️", "☔", "⚡", "❄️", "☃️", "⛄", "☄️", "🔥", "💧", "🌊", "🏔️",
    "⛰️", "🗻", "🏕️", "🏖️", "🏜️", "🏝️", "🏞️", "🏟️",
    
    // Food & Drink
    "🍇", "🍈", "🍉", "🍊", "🍋", "🍌", "🍍", "🥭", "🍎", "🍏", "🍐", "🍑",
    "🍒", "🍓", "🥝", "🍅", "🥥", "🥑", "🍆", "🥔", "🥕", "🌽", "🌶️", "🥒",
    "🥬", "🥦", "🧄", "🧅", "🍄", "🥜", "🌰", "🍞", "🥐", "🥖", "🥨", "🥯",
    "🥞", "🧇", "🧀", "🍖", "🍗", "🥩", "🥓", "🍔", "🍟", "🍕", "🌭", "🥪",
    "🌮", "🌯", "🥙", "🧆", "🥚", "🍳", "🥘", "🍲", "🥣", "🥗", "🍿", "🧈",
    "🧂", "🥫", "🍱", "🍘", "🍙", "🍚", "🍛", "🍜", "🍝", "🍠", "🍢", "🍣",
    "🍤", "🍥", "🥮", "🍡", "🥟", "🥠", "🥡", "🦀", "🦞", "🦐", "🦑", "🦪",
    "🍦", "🍧", "🍨", "🍩", "🍪", "🎂", "🍰", "🧁", "🥧", "🍫", "🍬", "🍭",
    "🍮", "🍯", "🍼", "🥛", "☕", "🍵", "🧃", "🥤", "🍶", "🍺", "🍻", "🥂",
    "🍷", "🥃", "🍸", "🍹", "🍾", "🧉", "🧊", "🥄", "🍴", "🍽️", "🥢", "🧂",
    
    // Sports & Activities
    "⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱", "🪀", "🏓",
    "🏸", "🏒", "🏑", "🥍", "🏏", "🥅", "⛳", "🪁", "🏹", "🎣", "🤿", "🥊",
    "🥋", "🎽", "🛹", "🛷", "⛸️", "🥌", "🎿", "⛷️", "🏂", "🪂", "🏋️", "🤼",
    "🤸", "🤺", "⛹️", "🤾", "🏌️", "🏇", "🧘", "🏄", "🏊", "🤽", "🚣", "🧗",
    "🚴", "🚵", "🤹", "🎪", "🎭", "🎨", "🎬", "🎤", "🎧", "🎼", "🎹", "🥁",
    "🎷", "🎺", "🎸", "🪕", "🎻", "🎲", "♟️", "🎯", "🎳", "🎮", "🎰", "🧩",
    
    // Transport & Vehicles
    "🚗", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "🚐", "🚚", "🚛",
    "🚜", "🦯", "🦽", "🦼", "🛴", "🚲", "🛵", "🏍️", "🛺", "🚨", "🚔", "🚍",
    "🚘", "🚖", "🚡", "🚠", "🚟", "🚃", "🚋", "🚞", "🚝", "🚄", "🚅", "🚈",
    "🚂", "🚆", "🚇", "🚊", "🚉", "✈️", "🛫", "🛬", "🛩️", "💺", "🛰️", "🚀",
    "🛸", "🚁", "🛶", "⛵", "🚤", "🛥️", "🛳️", "⛴️", "🚢", "⚓", "⛽", "🚧",
    "🚦", "🚥", "🚏", "🗺️", "🗿", "🗼", "🗽",
    
    // Objects & Tools
    "📱", "📲", "💻", "⌨️", "🖥️", "🖨️", "🖱️", "🖲️", "🕹️", "🗜️", "💽", "💾",
    "💿", "📀", "📼", "📷", "📸", "📹", "🎥", "📽️", "🎞️", "📞", "☎️", "📟",
    "📠", "📺", "📻", "🎙️", "🎚️", "🎛️", "🧭", "⏱️", "⏲️", "⏰", "🕰️", "⌛",
    "⏳", "📡", "🔋", "🔌", "💡", "🔦", "🕯️", "🪔", "🧯", "🛢️", "💸", "💵",
    "💴", "💶", "💷", "💰", "💳", "💎", "⚖️", "🧰", "🔧", "🔨", "⚒️", "🛠️",
    "⛏️", "🔩", "⚙️", "🧱", "⛓️", "🧲", "🔫", "💣", "🧨", "🪓", "🔪", "🗡️",
    "⚔️", "🛡️", "🚬", "⚰️", "⚱️", "🏺", "🔮", "📿", "🧿", "💈", "⚗️", "🔭",
    "🔬", "🕳️", "🩹", "🩺", "💊", "💉", "🩸", "🧬", "🦠", "🧫", "🧪", "🌡️",
    "🧹", "🧺", "🧻", "🚽", "🚰", "🚿", "🛁", "🛀", "🧼", "🧽", "🧴", "🛎️",
    "🔑", "🗝️", "🚪", "🪑", "🛋️", "🛏️", "🛌", "🧸", "🖼️", "🛍️", "🛒", "🎁",
    "🎈", "🎏", "🎀", "🎊", "🎉", "🎎", "🏮", "🎐", "🧧", "✉️", "📩", "📨",
    "📧", "💌", "📥", "📤", "📦", "🏷️", "📪", "📫", "📬", "📭", "📮", "📯",
    "📜", "📃", "📄", "📑", "🧾", "📊", "📈", "📉", "🗒️", "🗓️", "📆", "📅",
    "🗑️", "📇", "🗃️", "🗳️", "🗄️", "📋", "📁", "📂", "🗂️", "🗞️", "📰", "📓",
    "📔", "📒", "📕", "📗", "📘", "📙", "📚", "📖", "🔖", "🧷", "🔗", "📎",
    "🖇️", "📐", "📏", "🧮", "📌", "📍", "✂️", "🖊️", "🖋️", "✒️", "🖌️", "🖍️",
    "📝", "✏️", "🔍", "🔎", "🔏", "🔐", "🔒", "🔓",
    
    // Symbols & Signs
    "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕",
    "💞", "💓", "💗", "💖", "💘", "💝", "💟", "☮️", "✝️", "☪️", "🕉️", "☸️",
    "✡️", "🔯", "🕎", "☯️", "☦️", "🛐", "⛎", "♈", "♉", "♊", "♋", "♌",
    "♍", "♎", "♏", "♐", "♑", "♒", "♓", "🆔", "⚛️", "🉑", "☢️", "☣️",
    "📴", "📳", "🈶", "🈚", "🈸", "🈺", "🈷️", "✴️", "🆚", "💮", "🉐", "㊙️",
    "㊗️", "🈴", "🈵", "🈹", "🈲", "🅰️", "🅱️", "🆎", "🆑", "🅾️", "🆘", "❌",
    "⭕", "🛑", "⛔", "📛", "🚫", "💯", "💢", "♨️", "🚷", "🚯", "🚳", "🚱",
    "🔞", "📵", "🚭", "❗", "❕", "❓", "❔", "‼️", "⁉️", "🔅", "🔆", "〽️",
    "⚠️", "🚸", "🔱", "⚜️", "🔰", "♻️", "✅", "🈯", "💹", "❇️", "✳️", "❎",
    "🌐", "💠", "Ⓜ️", "🌀", "💤", "🏧", "🚾", "♿", "🅿️", "🈳", "🈂️", "🛂",
    "🛃", "🛄", "🛅", "🚹", "🚺", "🚼", "🚻", "🚮", "🎦", "📶", "🈁", "🔣",
    "ℹ️", "🔤", "🔡", "🔠", "🆖", "🆗", "🆙", "🆒", "🆕", "🆓", "0️⃣", "1️⃣",
    "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟", "🔢", "#️⃣", "*️⃣",
    "⏏️", "▶️", "⏸️", "⏯️", "⏹️", "⏺️", "⏭️", "⏮️", "⏩", "⏪", "⏫", "⏬",
    "◀️", "🔼", "🔽", "➡️", "⬅️", "⬆️", "⬇️", "↗️", "↘️", "↙️", "↖️", "↕️",
    "↔️", "↪️", "↩️", "⤴️", "⤵️", "🔀", "🔁", "🔂", "🔄", "🔃", "🎵", "🎶",
    "➕", "➖", "➗", "✖️", "♾️", "💲", "💱", "™️", "©️", "®️", "〰️", "➰",
    "➿", "🔚", "🔙", "🔛", "🔝", "🔜", "✔️", "☑️", "🔘", "🔴", "🟠", "🟡",
    "🟢", "🔵", "🟣", "⚫", "⚪", "🟤", "🔺", "🔻", "🔸", "🔹", "🔶", "🔷",
    "🔳", "🔲", "▪️", "▫️", "◾", "◽", "◼️", "◻️", "🟥", "🟧", "🟨", "🟩",
    "🟦", "🟪", "⬛", "⬜", "🟫", "🔈", "🔇", "🔉", "🔊", "🔔", "🔕", "📣",
    "📢", "👁️‍🗨️", "💬", "💭", "🗯️", "♠️", "♣️", "♥️", "♦️", "🃏", "🎴", "🀄",
    "🕐", "🕑", "🕒", "🕓", "🕔", "🕕", "🕖", "🕗", "🕘", "🕙", "🕚", "🕛"
  ];

  const [groupForm, setGroupForm] = useState({
    nama: "",
    nomor_telepon: "",
    icon: "👤",
    ktp_files: [] as Array<{ name: string; url: string }>
  });
  const [phoneError, setPhoneError] = useState<string>("");
  const [ktpFiles, setKtpFiles] = useState<File[]>([]);
  const [iconImageFile, setIconImageFile] = useState<File | null>(null);
  const [iconImagePreview, setIconImagePreview] = useState<string | null>(null);
  const [deletingFile, setDeletingFile] = useState<{ groupId: string; fileIndex: number; fileName: string } | null>(null);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // Debounced WhatsApp validation
  useEffect(() => {
    if (!groupForm.nomor_telepon || phoneError) {
      setWhatsappStatus(null);
      return;
    }

    const timer = setTimeout(async () => {
      await validateWhatsApp(groupForm.nomor_telepon);
    }, 1500);

    return () => clearTimeout(timer);
  }, [groupForm.nomor_telepon, phoneError]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data: groups, error: groupsError } = await supabase
        .from("client_groups")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (groupsError) throw groupsError;
      setClientGroups((groups || []).map(g => ({
        ...g,
        ktp_files: (g.ktp_files as any) || [],
        has_whatsapp: g.has_whatsapp,
        whatsapp_checked_at: g.whatsapp_checked_at
      })));
      
      // Fetch contract counts for all clients
      if (groups && groups.length > 0) {
        const clientIds = groups.map(g => g.id);
        const { data: contracts, error: contractsError } = await supabase
          .from("rental_contracts")
          .select("client_group_id, status")
          .in("client_group_id", clientIds);
        
        if (!contractsError && contracts) {
          // Count contracts per client
          const counts: Record<string, number> = {};
          const statusBreakdown: Record<string, { active: number; completed: number }> = {};
          
          contracts.forEach(contract => {
            counts[contract.client_group_id] = (counts[contract.client_group_id] || 0) + 1;
            
            if (!statusBreakdown[contract.client_group_id]) {
              statusBreakdown[contract.client_group_id] = { active: 0, completed: 0 };
            }
            
            if (contract.status.toLowerCase() === "masa sewa") {
              statusBreakdown[contract.client_group_id].active += 1;
            } else if (contract.status.toLowerCase() === "selesai") {
              statusBreakdown[contract.client_group_id].completed += 1;
            }
          });
          
          setContractCounts(counts);
          setContractStatusBreakdown(statusBreakdown);
        }
      }
    } catch (error: any) {
      toast.error("Gagal memuat data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchContractsForClient = async (clientId: string) => {
    // Don't fetch if already loading or already have data
    if (loadingContracts.has(clientId) || clientContracts[clientId]) return;
    
    try {
      setLoadingContracts(prev => new Set(prev).add(clientId));
      
      const { data: contracts, error } = await supabase
        .from("rental_contracts")
        .select("id, invoice, start_date, end_date, status, jumlah_lunas, tagihan_belum_bayar, tanggal")
        .eq("client_group_id", clientId)
        .order("start_date", { ascending: false });

      if (error) throw error;
      
      setClientContracts(prev => ({
        ...prev,
        [clientId]: contracts || []
      }));
    } catch (error: any) {
      toast.error("Gagal memuat kontrak: " + error.message);
    } finally {
      setLoadingContracts(prev => {
        const newSet = new Set(prev);
        newSet.delete(clientId);
        return newSet;
      });
    }
  };

  const toggleClientExpansion = (clientId: string) => {
    const newExpanded = new Set(expandedClients);
    if (newExpanded.has(clientId)) {
      newExpanded.delete(clientId);
    } else {
      newExpanded.add(clientId);
      // Fetch contracts when expanding for the first time
      if (!clientContracts[clientId]) {
        fetchContractsForClient(clientId);
      }
    }
    setExpandedClients(newExpanded);
  };

  const getStatusBadge = (status: string) => {
    const capitalizeWords = (str: string) => {
      return str.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
    };
    
    switch (status.toLowerCase()) {
      case "masa sewa":
        return <Badge className="bg-blue-500">Masa Sewa</Badge>;
      case "selesai":
        return <Badge className="bg-green-500">Selesai</Badge>;
      default:
        return <Badge variant="secondary">{capitalizeWords(status)}</Badge>;
    }
  };

  const uploadFiles = async (files: File[], bucket: string) => {
    const uploadedFiles = [];
    
    for (const file of files) {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user?.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      uploadedFiles.push({ name: file.name, url: publicUrl });
    }

    return uploadedFiles;
  };

  const validateWhatsApp = async (phoneNumber: string) => {
    try {
      setValidatingWhatsApp(true);
      setWhatsappStatus(null);

      const { data, error } = await supabase.functions.invoke("validate-whatsapp", {
        body: { phoneNumber }
      });

      if (error) {
        if (error.message.includes("AI settings not configured")) {
          toast.error("Konfigurasi AI belum disetup. Silakan ke Settings → AI");
        } else {
          console.error("WhatsApp validation error:", error);
        }
        return;
      }

      setWhatsappStatus({
        has_whatsapp: data.has_whatsapp,
        confidence: data.confidence,
        reason: data.reason
      });

      if (data.has_whatsapp) {
        toast.success(`✅ ${data.confidence === "high" ? "Kemungkinan besar" : "Mungkin"} ada WhatsApp`);
      } else {
        toast.info(`❌ ${data.confidence === "high" ? "Kemungkinan besar" : "Mungkin"} tidak ada WhatsApp`);
      }
    } catch (error: any) {
      console.error("Error validating WhatsApp:", error);
    } finally {
      setValidatingWhatsApp(false);
    }
  };

  const handleSaveGroup = async () => {
    try {
      if (!groupForm.nama || !groupForm.nomor_telepon) {
        toast.error("Mohon lengkapi semua field");
        return;
      }

      const phoneValidation = phoneSchema.safeParse(groupForm.nomor_telepon);
      if (!phoneValidation.success) {
        setPhoneError(phoneValidation.error.errors[0].message);
        toast.error(phoneValidation.error.errors[0].message);
        return;
      }
      setPhoneError("");

      let ktpFileUrls: Array<{ name: string; url: string }> = [];
      
      if (editingGroupId) {
        const existingGroup = clientGroups.find(g => g.id === editingGroupId);
        ktpFileUrls = existingGroup?.ktp_files || [];
        
        if (ktpFiles.length > 0) {
          const newFiles = await uploadFiles(ktpFiles, "ktp-documents");
          ktpFileUrls = [...ktpFileUrls, ...newFiles];
        }
      } else {
        if (ktpFiles.length > 0) {
          ktpFileUrls = await uploadFiles(ktpFiles, "ktp-documents");
        }
      }

      // Upload icon image if selected
      let iconUrl = groupForm.icon;
      if (iconImageFile) {
        const iconFiles = await uploadFiles([iconImageFile], "client-icons");
        iconUrl = iconFiles[0].url;
      }

      const groupData = {
        user_id: user?.id,
        nama: groupForm.nama,
        nomor_telepon: groupForm.nomor_telepon,
        icon: iconUrl,
        ktp_files: ktpFileUrls,
        has_whatsapp: whatsappStatus?.has_whatsapp || null,
        whatsapp_checked_at: whatsappStatus ? new Date().toISOString() : null,
      };

      if (editingGroupId) {
        const { error } = await supabase
          .from("client_groups")
          .update(groupData)
          .eq("id", editingGroupId);

        if (error) throw error;
        toast.success("Client berhasil diupdate");
      } else {
        const { error } = await supabase
          .from("client_groups")
          .insert(groupData);

        if (error) throw error;
        toast.success("Client berhasil ditambahkan");
      }

      setIsGroupDialogOpen(false);
      resetGroupForm();
      fetchData();
    } catch (error: any) {
      toast.error("Gagal menyimpan: " + error.message);
    }
  };

  const handleEditGroup = (group: ClientGroup) => {
    setEditingGroupId(group.id);
    setGroupForm({
      nama: group.nama,
      nomor_telepon: group.nomor_telepon,
      icon: group.icon || "👤",
      ktp_files: group.ktp_files || []
    });
    // Set preview if icon is an image URL
    if (group.icon?.startsWith('http')) {
      setIconImagePreview(group.icon);
    }
    setIsGroupDialogOpen(true);
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm("Yakin ingin menghapus client ini? Semua kontrak terkait juga akan terhapus.")) return;

    try {
      // Delete related contracts first
      await supabase
        .from("rental_contracts")
        .delete()
        .eq("client_group_id", id);

      const { error } = await supabase
        .from("client_groups")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Client berhasil dihapus");
      fetchData();
    } catch (error: any) {
      toast.error("Gagal menghapus: " + error.message);
    }
  };

  const handleDeleteKtpFile = async () => {
    if (!deletingFile) return;

    try {
      const group = clientGroups.find(g => g.id === deletingFile.groupId);
      if (!group) return;

      // Remove file from array
      const updatedFiles = group.ktp_files.filter((_, idx) => idx !== deletingFile.fileIndex);

      // Update database
      const { error } = await supabase
        .from("client_groups")
        .update({ ktp_files: updatedFiles })
        .eq("id", deletingFile.groupId);

      if (error) throw error;

      toast.success("File KTP berhasil dihapus");
      fetchData();
      setDeletingFile(null);
    } catch (error: any) {
      toast.error("Gagal menghapus file: " + error.message);
    }
  };

  const resetGroupForm = () => {
    setEditingGroupId(null);
    setGroupForm({
      nama: "",
      nomor_telepon: "",
      icon: "👤",
      ktp_files: []
    });
    setKtpFiles([]);
    setIconImageFile(null);
    setIconImagePreview(null);
    setPhoneError("");
    setWhatsappStatus(null);
  };

  const sortedGroups = React.useMemo(() => {
    if (!clientGroups) return [];
    
    let filtered = [...clientGroups];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(group => 
        group.nama.toLowerCase().includes(query) || 
        group.nomor_telepon.includes(query)
      );
    }
    
    // Apply sorting
    if (sortBy !== 'none') {
      filtered.sort((a, b) => {
        let comparison = 0;
        
        switch(sortBy) {
          case 'number':
            comparison = clientGroups.indexOf(a) - clientGroups.indexOf(b);
            break;
          case 'nama':
            comparison = a.nama.localeCompare(b.nama);
            break;
          case 'telepon':
            comparison = a.nomor_telepon.localeCompare(b.nomor_telepon);
            break;
          case 'whatsapp':
            const aVal = a.has_whatsapp === null ? -1 : a.has_whatsapp ? 1 : 0;
            const bVal = b.has_whatsapp === null ? -1 : b.has_whatsapp ? 1 : 0;
            comparison = aVal - bVal;
            break;
          case 'created':
            comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            break;
        }
        
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }
    
    return filtered;
  }, [clientGroups, sortBy, sortOrder, searchQuery]);

  const totalPages = Math.ceil(sortedGroups.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedGroups = sortedGroups.slice(startIndex, startIndex + itemsPerPage);

  // Calculate stats
  const totalClients = clientGroups.length;
  const totalContracts = Object.values(contractCounts).reduce((sum, count) => sum + count, 0);
  const whatsappVerified = clientGroups.filter(g => g.has_whatsapp === true).length;
  const totalActiveContracts = Object.values(contractStatusBreakdown).reduce((sum, breakdown) => sum + (breakdown?.active || 0), 0);

  if (loading) {
    return (
      <AnimatedBackground theme="neutral">
        <div className="flex flex-col items-center justify-center h-screen gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-600 rounded-full blur-xl opacity-50 animate-pulse"></div>
            <Loader2 className="relative h-16 w-16 animate-spin text-blue-600" />
          </div>
          <p className="text-lg font-medium bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Memuat data client...
          </p>
        </div>
      </AnimatedBackground>
    );
  }

  return (
    <AnimatedBackground theme="neutral">
      <div className="h-[calc(100vh-104px)] relative overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto px-2 py-2 md:px-8 md:py-4 space-y-6">
        {/* Header dengan Gradient */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl blur-lg opacity-50"></div>
                <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-xl shadow-lg">
                  <Users className="h-8 w-8 text-white" />
                </div>
              </div>
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Daftar Client
              </span>
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Kelola semua client dan kontrak dalam satu tempat
            </p>
          </div>
          
          <Dialog open={isGroupDialogOpen} onOpenChange={(open) => {
            setIsGroupDialogOpen(open);
            if (!open) resetGroupForm();
          }}>
            <DialogTrigger asChild>
              <GradientButton 
                variant="income"
                icon={Plus}
                onClick={() => {
                  setEditingGroupId(null);
                  setGroupForm({ nama: "", nomor_telepon: "", icon: "👤", ktp_files: [] });
                  setPhoneError("");
                  setWhatsappStatus(null);
                  setIconImageFile(null);
                  setIconImagePreview(null);
                }}
              >
                Tambah Client Baru
              </GradientButton>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="bg-gradient-to-r from-blue-500 to-purple-600 -m-6 mb-6 p-6 rounded-t-lg">
              <DialogTitle className="text-white text-xl flex items-center gap-2">
                <Users className="h-5 w-5" />
                {editingGroupId ? "Edit Client" : "Tambah Client Baru"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nama Client</Label>
                <Input
                  value={groupForm.nama}
                  onChange={(e) => setGroupForm({ ...groupForm, nama: e.target.value })}
                  placeholder="Nama client"
                />
              </div>
              <div>
                <Label>Icon/Emoticon</Label>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={groupForm.icon.startsWith('http') ? '' : groupForm.icon}
                      onChange={(e) => {
                        setGroupForm({ ...groupForm, icon: e.target.value });
                        setIconImageFile(null);
                        setIconImagePreview(null);
                      }}
                      placeholder="Ketik emoticon..."
                      className="text-2xl text-center"
                      maxLength={4}
                      disabled={!!iconImageFile}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setGroupForm({ ...groupForm, icon: "👤" });
                        setIconImageFile(null);
                        setIconImagePreview(null);
                      }}
                    >
                      Reset
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="icon-upload" className="text-sm text-muted-foreground">
                      Atau Upload Gambar Icon (JPG/PNG)
                    </Label>
                    <Input
                      id="icon-upload"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setIconImageFile(file);
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setIconImagePreview(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                          setGroupForm({ ...groupForm, icon: "" });
                        }
                      }}
                      className="cursor-pointer"
                    />
                    {iconImagePreview && (
                      <div className="flex items-center gap-2">
                        <img 
                          src={iconImagePreview} 
                          alt="Icon preview" 
                          className="w-16 h-16 rounded-full object-cover border-2 border-primary"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIconImageFile(null);
                            setIconImagePreview(null);
                            setGroupForm({ ...groupForm, icon: "👤" });
                          }}
                        >
                          Hapus
                        </Button>
                      </div>
                    )}
                    {groupForm.icon.startsWith('http') && !iconImagePreview && (
                      <div className="flex items-center gap-2">
                        <img 
                          src={groupForm.icon} 
                          alt="Current icon" 
                          className="w-16 h-16 rounded-full object-cover border-2 border-muted"
                        />
                        <span className="text-sm text-muted-foreground">Icon saat ini</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-10 gap-1 p-3 border rounded-md bg-muted/20 max-h-[240px] overflow-y-auto">
                    {iconOptions.map((icon, idx) => (
                      <button
                        key={`${icon}-${idx}`}
                        type="button"
                        onClick={() => {
                          setGroupForm({ ...groupForm, icon });
                          setIconImageFile(null);
                          setIconImagePreview(null);
                        }}
                        disabled={!!iconImageFile}
                        className={cn(
                          "h-9 text-xl hover:bg-accent rounded transition-colors disabled:opacity-50",
                          groupForm.icon === icon && !iconImageFile && "bg-primary text-primary-foreground ring-2 ring-primary"
                        )}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Nomor Telepon</Label>
                <div className="relative">
                  <Input
                    value={groupForm.nomor_telepon}
                    onChange={(e) => {
                      setGroupForm({ ...groupForm, nomor_telepon: e.target.value });
                      setPhoneError("");
                    }}
                    placeholder="+62812345678 atau 08123456789"
                    className={cn(
                      "pr-10 transition-all",
                      phoneError && "border-rose-500 focus:ring-rose-500/20",
                      whatsappStatus?.has_whatsapp !== null && !phoneError && "border-emerald-500 focus:ring-emerald-500/20",
                      !phoneError && !whatsappStatus && "focus:border-purple-500 focus:ring-purple-500/20"
                    )}
                  />
                  {validatingWhatsApp && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  {whatsappStatus && !validatingWhatsApp && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {whatsappStatus.has_whatsapp ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                  )}
                </div>
                {phoneError && (
                  <p className="text-xs text-destructive mt-1">{phoneError}</p>
                )}
                {whatsappStatus && !phoneError && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {whatsappStatus.reason}
                  </p>
                )}
              </div>
              <div>
                <Label>Upload KTP (Multiple)</Label>
                <Input
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={(e) => setKtpFiles(Array.from(e.target.files || []))}
                />
                {ktpFiles.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">{ktpFiles.length} file dipilih</p>
                )}
              </div>
              <Button onClick={handleSaveGroup} className="w-full" disabled={validatingWhatsApp}>
                {validatingWhatsApp ? "Memvalidasi..." : editingGroupId ? "Update Client" : "Simpan Client"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Controls */}
      <Card className="p-4 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <Input
              placeholder="Cari berdasarkan nama atau nomor telepon..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="max-w-md"
            />
            <div className="text-sm text-muted-foreground">
              {searchQuery ? `${sortedGroups.length} dari ${clientGroups.length}` : `Total: ${clientGroups.length}`} client
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm">Sort By:</Label>
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Tidak Ada</SelectItem>
                <SelectItem value="number">Nomor</SelectItem>
                <SelectItem value="nama">Nama</SelectItem>
                <SelectItem value="telepon">Telepon</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="created">Tanggal Dibuat</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Client Groups Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center w-20">No</TableHead>
                <TableHead>Nama Client</TableHead>
                <TableHead>Nomor Telepon</TableHead>
                <TableHead className="text-center">WhatsApp</TableHead>
                <TableHead className="text-center">Dokumen KTP</TableHead>
                <TableHead>Tanggal Dibuat</TableHead>
                <TableHead className="text-center w-24">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedGroups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Belum ada client</p>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedGroups.map((group, index) => {
                  const isExpanded = expandedClients.has(group.id);
                  const contracts = clientContracts[group.id] || [];
                  const isLoading = loadingContracts.has(group.id);
                  
                  return (
                    <React.Fragment key={group.id}>
                      {/* Main client row */}
                      <TableRow 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleClientExpansion(group.id)}
                      >
                        <TableCell className="text-center font-medium">
                          <div className="flex items-center justify-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                            {startIndex + index + 1}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {group.icon?.startsWith('http') ? (
                              <img 
                                src={group.icon} 
                                alt={group.nama}
                                className="w-8 h-8 rounded-full object-cover border border-border"
                              />
                            ) : (
                              <span className="text-2xl">{group.icon || "👤"}</span>
                            )}
                            <span className="font-medium">{group.nama}</span>
                            {contractCounts[group.id] > 0 && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="secondary" className="text-xs cursor-help">
                                      {contractCounts[group.id]} Kontrak
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent className="text-xs">
                                    <div className="space-y-1">
                                      <p className="font-semibold">Breakdown Kontrak:</p>
                                      <p className="text-blue-500">
                                        • Masa Sewa: {contractStatusBreakdown[group.id]?.active || 0}
                                      </p>
                                      <p className="text-green-500">
                                        • Selesai: {contractStatusBreakdown[group.id]?.completed || 0}
                                      </p>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">{group.nomor_telepon}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          {group.has_whatsapp !== null ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  {group.has_whatsapp ? (
                                    <CheckCircle className="h-5 w-5 mx-auto text-green-600 dark:text-green-400" />
                                  ) : (
                                    <XCircle className="h-5 w-5 mx-auto text-red-600 dark:text-red-400" />
                                  )}
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">
                                    {group.has_whatsapp 
                                      ? "Kemungkinan ada WhatsApp" 
                                      : "Kemungkinan tidak ada WhatsApp"}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <AlertCircle className="h-5 w-5 mx-auto text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">Status WhatsApp belum dicek</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {group.ktp_files && group.ktp_files.length > 0 ? (
                            <div className="flex items-center justify-center gap-1">
                              <Badge variant="secondary" className="text-xs">
                                {group.ktp_files.length} file
                              </Badge>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <FileText className="h-3 w-3" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Dokumen KTP - {group.nama}</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-2">
                                    {group.ktp_files.map((file, idx) => (
                                      <div
                                        key={idx}
                                        className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors"
                                      >
                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                        <a
                                          href={file.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex-1 text-sm truncate hover:underline"
                                        >
                                          {file.name}
                                        </a>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                          onClick={() => setDeletingFile({ groupId: group.id, fileIndex: idx, fileName: file.name })}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                        <a
                                          href={file.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                        </a>
                                      </div>
                                    ))}
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{format(new Date(group.created_at), "dd MMM yyyy", { locale: localeId })}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditGroup(group)}
                              className="h-8 w-8 text-primary hover:bg-primary/10"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteGroup(group.id)}
                              className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      
                      {/* Expanded contracts row */}
                      {isExpanded && (
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={7} className="p-0">
                            <div className="p-4">
                              {isLoading ? (
                                <div className="flex items-center justify-center py-8">
                                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                  <span className="ml-2 text-sm text-muted-foreground">Memuat kontrak...</span>
                                </div>
                              ) : contracts.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                  <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                  <p className="text-sm">Belum ada kontrak sewa</p>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  <h4 className="text-sm font-semibold text-foreground mb-3">
                                    Kontrak Sewa ({contracts.length})
                                  </h4>
                                  
                                  {/* Summary Cards */}
                                  <div className="grid gap-3 md:grid-cols-3 mb-4">
                                    <Card className="border-primary/20">
                                      <CardContent className="p-4">
                                        <div className="flex items-center gap-2">
                                          <div className="p-2 bg-primary/10 rounded-lg">
                                            <FileText className="h-5 w-5 text-primary" />
                                          </div>
                                          <div className="flex-1">
                                            <p className="text-xs text-muted-foreground">Total Kontrak</p>
                                            <p className="text-xl font-bold">{contracts.length} Kontrak</p>
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                    
                                    <Card className="border-green-500/20">
                                      <CardContent className="p-4">
                                        <div className="flex items-center gap-2">
                                          <div className="p-2 bg-green-500/10 rounded-lg">
                                            <Wallet className="h-5 w-5 text-green-600" />
                                          </div>
                                          <div className="flex-1">
                                            <p className="text-xs text-muted-foreground">Total Lunas</p>
                                            <p className="text-lg font-bold text-green-600">
                                              {formatRupiah(
                                                contracts.reduce((sum, c) => sum + (c.jumlah_lunas || 0), 0)
                                              )}
                                            </p>
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                    
                                    <Card className="border-orange-500/20">
                                      <CardContent className="p-4">
                                        <div className="flex items-center gap-2">
                                          <div className="p-2 bg-orange-500/10 rounded-lg">
                                            <Wallet className="h-5 w-5 text-orange-600" />
                                          </div>
                                          <div className="flex-1">
                                            <p className="text-xs text-muted-foreground">Total Belum Bayar</p>
                                            <p className="text-lg font-bold text-orange-600">
                                              {formatRupiah(
                                                contracts.reduce((sum, c) => sum + (c.tagihan_belum_bayar || 0), 0)
                                              )}
                                            </p>
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  </div>
                                  
                                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                    {contracts.map((contract) => (
                                      <div
                                        key={contract.id}
                                        className="border rounded-lg p-3 hover:bg-accent/50 transition-colors cursor-pointer"
                                        onClick={() => navigate(`/contract/${contract.id}`)}
                                      >
                                        <div className="flex items-start justify-between mb-2">
                                          <div className="flex-1">
                                            <p className="text-sm font-medium">
                                              {contract.invoice || "No Invoice"}
                                            </p>
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                              <Calendar className="h-3 w-3" />
                                              <span>
                                                {format(new Date(contract.start_date), "dd MMM yyyy", { locale: localeId })}
                                                {" - "}
                                                {format(new Date(contract.end_date), "dd MMM yyyy", { locale: localeId })}
                                              </span>
                                            </div>
                                          </div>
                                          {getStatusBadge(contract.status)}
                                        </div>
                                        
                                        <div className="space-y-1 text-xs">
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">Lunas:</span>
                                            <span className="font-medium text-green-600">
                                              Rp {(contract.jumlah_lunas || 0).toLocaleString('id-ID')}
                                            </span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">Belum Bayar:</span>
                                            <span className="font-medium text-red-600">
                                              Rp {(contract.tagihan_belum_bayar || 0).toLocaleString('id-ID')}
                                            </span>
                                          </div>
                                        </div>
                                        
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="w-full mt-2 h-7 text-xs"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/contract/${contract.id}`);
                                          }}
                                        >
                                          Lihat Detail →
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={sortedGroups.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
          storageKey="clientGroups"
        />
      </Card>

      {/* Alert Dialog for Delete KTP File Confirmation */}
      <AlertDialog open={!!deletingFile} onOpenChange={(open) => !open && setDeletingFile(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus File</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus file <strong>{deletingFile?.fileName}</strong>? 
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteKtpFile} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
      </div>
    </AnimatedBackground>
  );
};

export default ClientGroups;
