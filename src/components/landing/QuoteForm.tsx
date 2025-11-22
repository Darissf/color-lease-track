import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Mail, Phone, User, MessageSquare } from "lucide-react";

export const QuoteForm = () => {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    service: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simulate form submission
    toast.success("Terima kasih! Kami akan segera menghubungi Anda.", {
      description: "Tim kami akan memproses permintaan Anda dalam 1-2 jam kerja.",
    });
    
    // Reset form
    setFormData({
      name: "",
      phone: "",
      email: "",
      service: "",
      message: "",
    });
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="space-y-6"
    >
      {/* Name */}
      <div className="relative">
        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          type="text"
          placeholder="Nama Lengkap"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="pl-10 h-12 border-gray-300 focus:border-sky-500"
          required
        />
      </div>

      {/* Phone */}
      <div className="relative">
        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          type="tel"
          placeholder="Nomor Telepon"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="pl-10 h-12 border-gray-300 focus:border-sky-500"
          required
        />
      </div>

      {/* Email */}
      <div className="relative">
        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="pl-10 h-12 border-gray-300 focus:border-sky-500"
          required
        />
      </div>

      {/* Service Selection */}
      <Select value={formData.service} onValueChange={(value) => setFormData({ ...formData, service: value })}>
        <SelectTrigger className="h-12 border-gray-300 focus:border-sky-500">
          <SelectValue placeholder="Pilih Jenis Layanan" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="sewa">Sewa Scaffolding</SelectItem>
          <SelectItem value="pengiriman">Pengiriman & Instalasi</SelectItem>
          <SelectItem value="konsultasi">Konsultasi & Survey</SelectItem>
          <SelectItem value="lainnya">Lainnya</SelectItem>
        </SelectContent>
      </Select>

      {/* Message */}
      <div className="relative">
        <MessageSquare className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
        <Textarea
          placeholder="Ceritakan kebutuhan proyek Anda..."
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          className="pl-10 min-h-32 border-gray-300 focus:border-sky-500 resize-none"
          required
        />
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        size="lg"
        className="w-full h-12 bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white shadow-xl transform hover:scale-105 transition-all duration-300"
      >
        Minta Penawaran Gratis
      </Button>

      <p className="text-center text-sm text-gray-500">
        Kami akan merespons dalam <span className="font-semibold text-sky-600">1-2 jam kerja</span>
      </p>
    </motion.form>
  );
};
