import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Shield, Truck, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export const AnimatedHero = () => {
  return (
    <section className="relative min-h-screen pt-20 flex items-center justify-center overflow-hidden bg-slate-900">
      {/* Subtle Industrial Pattern Background */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Diagonal Stripes Accent */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-2 bg-amber-500"
        style={{
          backgroundImage: `repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 10px,
            rgba(0,0,0,0.2) 10px,
            rgba(0,0,0,0.2) 20px
          )`,
        }}
      />

      {/* Content */}
      <div className="container relative z-10 px-4 mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 px-4 py-2 rounded-full mb-6"
          >
            <Shield className="w-4 h-4" />
            <span className="text-sm font-medium">Standar SNI & Berkualitas</span>
          </motion.div>

          <motion.h1
            className="text-4xl md:text-6xl lg:text-7xl font-industrial font-bold text-white mb-6 leading-tight tracking-tight"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Pusat Sewa Scaffolding Bali
            <br />
            <span className="text-amber-500">
              Ready Stock & Kirim Cepat
            </span>
          </motion.h1>

          <motion.p
            className="text-lg md:text-xl text-slate-300 mb-8 max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            Ring Lock, Cup Lock & Frame Scaffolding untuk proyek konstruksi Anda.
            <span className="text-white font-semibold"> Harga kompetitif</span> dengan 
            <span className="text-white font-semibold"> pengiriman ke seluruh Bali.</span>
          </motion.p>

          {/* Trust Badges - Static */}
          <motion.div
            className="flex flex-wrap justify-center gap-4 mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            {[
              { icon: CheckCircle2, text: "500+ Proyek Selesai" },
              { icon: Clock, text: "10+ Tahun Pengalaman" },
              { icon: Shield, text: "Sertifikasi SNI" },
            ].map((item, idx) => (
              <div 
                key={idx} 
                className="flex items-center gap-2 bg-slate-800/50 border border-slate-700 px-4 py-2 rounded-lg"
              >
                <item.icon className="w-5 h-5 text-amber-500" />
                <span className="text-white font-medium text-sm">{item.text}</span>
              </div>
            ))}
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            <Button
              size="lg"
              className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold shadow-lg shadow-amber-500/30 transform hover:scale-105 transition-all duration-300"
              onClick={() => window.open("https://wa.me/6289666666632?text=Halo!%20Saya%20ingin%20cek%20ketersediaan%20stok%20scaffolding.", "_blank")}
            >
              Cek Ketersediaan Stok
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="bg-transparent border-2 border-slate-600 text-white hover:bg-slate-800 hover:border-slate-500 transform hover:scale-105 transition-all duration-300"
              onClick={() => document.getElementById("portfolio")?.scrollIntoView({ behavior: "smooth" })}
            >
              <Truck className="mr-2 w-5 h-5" />
              Lihat Portfolio
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};