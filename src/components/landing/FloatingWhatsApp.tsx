import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";

export const FloatingWhatsApp = () => {
  const whatsappNumber = "6289666666632";
  const message = "Halo! Saya tertarik dengan layanan scaffolding Anda.";

  const handleClick = () => {
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  return (
    <motion.button
      onClick={handleClick}
      className="fixed bottom-20 sm:bottom-6 right-6 z-50 w-14 h-14 sm:w-16 sm:h-16 bg-green-600 text-white rounded-full shadow-xl flex items-center justify-center group hover:bg-green-700 transition-colors duration-300"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1, type: "spring", stiffness: 200 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <MessageCircle className="w-7 h-7 sm:w-8 sm:h-8" />
      
      {/* Tooltip - Desktop only */}
      <div className="absolute right-full mr-4 bg-white text-slate-800 px-4 py-2 rounded-lg shadow-xl whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden sm:block">
        Chat via WhatsApp
      </div>

      {/* Static Notification Badge */}
      <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white" />
    </motion.button>
  );
};