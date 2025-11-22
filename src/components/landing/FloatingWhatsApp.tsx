import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";

export const FloatingWhatsApp = () => {
  const whatsappNumber = "6281234567890"; // Ganti dengan nomor WhatsApp bisnis
  const message = "Halo! Saya tertarik dengan layanan scaffolding Anda.";

  const handleClick = () => {
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  return (
    <motion.button
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-full shadow-2xl flex items-center justify-center group hover:shadow-green-500/50"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1, type: "spring", stiffness: 200 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute inset-0 rounded-full bg-green-400 opacity-20"
      />
      <MessageCircle className="w-8 h-8" />
      
      {/* Tooltip */}
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        whileHover={{ opacity: 1, x: 0 }}
        className="absolute right-full mr-4 bg-white text-gray-800 px-4 py-2 rounded-lg shadow-xl whitespace-nowrap pointer-events-none"
      >
        Chat via WhatsApp
      </motion.div>

      {/* Notification Badge */}
      <motion.div
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white"
      />
    </motion.button>
  );
};
