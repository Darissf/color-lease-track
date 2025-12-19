import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X, Phone, Mail, MapPin, Clock, Shield, Award, Truck, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedHero } from "@/components/landing/AnimatedHero";
import { StatsCounter } from "@/components/landing/StatsCounter";
import { ServiceCard } from "@/components/landing/ServiceCard";
import { PortfolioGallery } from "@/components/landing/PortfolioGallery";
import { TestimonialCarousel } from "@/components/landing/TestimonialCarousel";

import { FloatingWhatsApp } from "@/components/landing/FloatingWhatsApp";
import { ScrollAnimationWrapper } from "@/components/landing/ScrollAnimationWrapper";
import { EditableText } from "@/components/EditableText";
import { initMetaPixel, trackEvent } from "@/lib/metaPixel";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SEOHead } from "@/components/SEOHead";
import { getLocalBusinessSchema, getBreadcrumbSchema, getFAQSchema, getServiceSchema, getAggregateRatingSchema } from "@/lib/seo";

const services = [
  {
    icon: Shield,
    title: "Sewa Scaffolding",
    description: "Berbagai jenis scaffolding berkualitas tinggi untuk proyek Anda",
    features: [
      "Ring Lock System",
      "Cup Lock System", 
      "Frame Scaffolding",
      "Certified & Tested",
      "Berbagai ukuran tersedia",
    ],
    price: "Rp 25.000/hari",
  },
  {
    icon: Truck,
    title: "Pengiriman & Instalasi",
    description: "Layanan pengiriman dan instalasi profesional di seluruh Bali",
    features: [
      "Free survey lokasi",
      "Instalasi oleh teknisi ahli",
      "Pengiriman tepat waktu",
      "Coverage seluruh Bali",
      "Dokumentasi lengkap",
    ],
    price: "Hubungi kami",
  },
  {
    icon: Headphones,
    title: "Konsultasi & Survey",
    description: "Konsultasi gratis dan survey lokasi untuk proyek Anda",
    features: [
      "Konsultasi gratis 24/7",
      "Survey lokasi profesional",
      "Rekomendasi terbaik",
      "Estimasi biaya detail",
      "Solusi custom",
    ],
    price: "GRATIS",
  },
];

const features = [
  {
    icon: Award,
    title: "Sertifikasi SNI",
    description: "Scaffolding bersertifikat SNI dan standar keamanan internasional",
  },
  {
    icon: Clock,
    title: "10+ Tahun Pengalaman",
    description: "Melayani ratusan proyek konstruksi di Bali sejak 2014",
  },
  {
    icon: Shield,
    title: "Kualitas Terjamin",
    description: "Material berkualitas tinggi dengan maintenance rutin",
  },
  {
    icon: Phone,
    title: "Support 24/7",
    description: "Tim customer service siap membantu kapan saja",
  },
];

const LandingPage = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch Meta Ads settings and initialize pixel
  const { data: metaSettings } = useQuery({
    queryKey: ["meta-ads-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meta_ads_settings")
        .select("pixel_id, is_active")
        .limit(1)
        .maybeSingle();
      
      if (error && error.code !== "PGRST116") {
        console.error("Error fetching meta settings:", error);
        return null;
      }
      
      return data;
    },
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  // Initialize Meta Pixel when settings are loaded
  useEffect(() => {
    if (metaSettings?.pixel_id && metaSettings?.is_active) {
      initMetaPixel({
        pixelId: metaSettings.pixel_id,
        enabled: true,
      });
    }
  }, [metaSettings]);

  // Track contact actions
  const handleContactClick = (method: "whatsapp" | "phone" | "email") => {
    trackEvent("Contact", {
      contact_method: method,
    });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* SEO */}
      <SEOHead
        title="Sewa Scaffolding Bali - Rental Scaffolding Profesional & Terpercaya"
        description="Sewa Scaffolding Bali - Penyedia jasa rental scaffolding profesional di Bali. Tersedia Ring Lock, Cup Lock & Frame Scaffolding dengan harga terjangkau, pengiriman cepat & instalasi oleh teknisi ahli."
        keywords="sewa scaffolding bali, rental scaffolding bali, scaffolding denpasar, sewa steger bali, scaffolding murah bali, ring lock scaffolding, cup lock scaffolding"
        canonical="/"
        ogImage="/og-image.jpg"
        structuredData={[
          getLocalBusinessSchema(),
          getBreadcrumbSchema([{ name: "Beranda", url: "/" }]),
          getFAQSchema(),
          getServiceSchema(),
          getAggregateRatingSchema()
        ]}
      />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm shadow-md transition-all duration-300">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center shadow-lg">
                <Shield className="w-7 h-7 text-amber-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">
                  Sewa Scaffolding Bali
                </h1>
                <p className="text-xs text-slate-500">Professional Scaffolding Rental</p>
              </div>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#layanan" className="text-slate-700 hover:text-amber-600 font-medium transition-colors">
                Layanan
              </a>
              <a href="#keunggulan" className="text-slate-700 hover:text-amber-600 font-medium transition-colors">
                Keunggulan
              </a>
              <a href="#portfolio" className="text-slate-700 hover:text-amber-600 font-medium transition-colors">
                Portfolio
              </a>
              <a href="#kontak" className="text-slate-700 hover:text-amber-600 font-medium transition-colors">
                Kontak
              </a>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-slate-200">
              <div className="flex flex-col gap-4">
                <a href="#layanan" className="text-slate-700 hover:text-amber-600 font-medium py-2">
                  Layanan
                </a>
                <a href="#keunggulan" className="text-slate-700 hover:text-amber-600 font-medium py-2">
                  Keunggulan
                </a>
                <a href="#portfolio" className="text-slate-700 hover:text-amber-600 font-medium py-2">
                  Portfolio
                </a>
                <a href="#kontak" className="text-slate-700 hover:text-amber-600 font-medium py-2">
                  Kontak
                </a>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <AnimatedHero />

      {/* Stats Counter */}
      <StatsCounter />

      {/* Services Section */}
      <section id="layanan" className="py-20 bg-slate-50">
        <div className="container mx-auto px-4">
          <ScrollAnimationWrapper>
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4">
                Layanan <span className="text-amber-500">Kami</span>
              </h2>
              <p className="text-slate-600 text-lg max-w-2xl mx-auto">
                Solusi scaffolding lengkap untuk semua kebutuhan konstruksi Anda
              </p>
            </div>
          </ScrollAnimationWrapper>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, idx) => (
              <ScrollAnimationWrapper key={idx} delay={idx * 0.1}>
                <ServiceCard {...service} />
              </ScrollAnimationWrapper>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section id="keunggulan" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <ScrollAnimationWrapper>
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4">
                Mengapa Pilih <span className="text-amber-500">Kami?</span>
              </h2>
              <p className="text-slate-600 text-lg max-w-2xl mx-auto">
                Keunggulan yang membuat kami menjadi pilihan terbaik di Bali
              </p>
            </div>
          </ScrollAnimationWrapper>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => (
              <ScrollAnimationWrapper key={idx} delay={idx * 0.1}>
                <Card className="group hover:shadow-xl transition-all duration-300 border border-slate-200 bg-white overflow-hidden h-full">
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:bg-amber-500 transition-colors duration-300">
                      <feature.icon className="w-8 h-8 text-amber-500 group-hover:text-white transition-colors duration-300" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-3">{feature.title}</h3>
                    <p className="text-slate-600">{feature.description}</p>
                  </CardContent>
                </Card>
              </ScrollAnimationWrapper>
            ))}
          </div>
        </div>
      </section>

      {/* Portfolio Gallery */}
      <div id="portfolio">
        <PortfolioGallery />
      </div>

      {/* Testimonials */}
      <TestimonialCarousel />

      {/* CTA Section */}
      <section className="py-20 bg-slate-900 text-white relative overflow-hidden">
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="container mx-auto px-4 relative z-10">
          <ScrollAnimationWrapper>
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Siap Memulai Proyek Anda?
              </h2>
              <p className="text-xl mb-8 text-slate-300">
                Dapatkan konsultasi gratis dan penawaran terbaik untuk kebutuhan scaffolding proyek Anda
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold shadow-lg shadow-amber-500/30 transform hover:scale-105 transition-all duration-300"
                  onClick={() => document.getElementById("kontak")?.scrollIntoView({ behavior: "smooth" })}
                >
                  <Phone className="mr-2 w-5 h-5" />
                  Hubungi Kami Sekarang
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-transparent border-2 border-slate-600 text-white hover:bg-slate-800 transform hover:scale-105 transition-all duration-300"
                  onClick={() => window.open("https://wa.me/6289666666632", "_blank")}
                >
                  WhatsApp
                </Button>
              </div>
            </div>
          </ScrollAnimationWrapper>
        </div>
      </section>

      {/* Contact Section */}
      <section id="kontak" className="py-20 bg-slate-50">
        <div className="container mx-auto px-4">
          <ScrollAnimationWrapper>
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4">
                Hubungi <span className="text-amber-500">Kami</span>
              </h2>
              <p className="text-slate-600 text-lg max-w-2xl mx-auto">
                Tim kami siap membantu Anda menemukan solusi scaffolding terbaik
              </p>
            </div>
          </ScrollAnimationWrapper>

          <div className="max-w-2xl mx-auto">
            {/* Contact Info */}
            <ScrollAnimationWrapper direction="up">
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-slate-800 mb-6">Informasi Kontak</h3>
                
                <Card className="group hover:shadow-xl transition-all duration-300 border-slate-200">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0 shadow-lg">
                        <Phone className="w-6 h-6 text-amber-500" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 mb-2">Telepon</h4>
                        <a 
                          href="https://wa.me/6289666666632?text=Halo!%20Saya%20ingin%20bertanya%20tentang%20layanan%20scaffolding."
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-600 hover:text-amber-700 font-medium"
                          onClick={() => handleContactClick("phone")}
                        >
                          +62 896-6666-6632
                        </a>
                        <p className="text-sm text-slate-500 mt-1">Senin - Sabtu: 08:00 - 18:00</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="group hover:shadow-xl transition-all duration-300 border-slate-200">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0 shadow-lg">
                        <Mail className="w-6 h-6 text-amber-500" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 mb-2">Email</h4>
                        <a 
                          href="mailto:info@sewascaffoldingbali.com" 
                          className="text-amber-600 hover:text-amber-700 font-medium"
                          onClick={() => handleContactClick("email")}
                        >
                          info@sewascaffoldingbali.com
                        </a>
                        <p className="text-sm text-slate-500 mt-1">Respon dalam 1-2 jam kerja</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="group hover:shadow-xl transition-all duration-300 border-slate-200">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0 shadow-lg">
                        <MapPin className="w-6 h-6 text-amber-500" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 mb-2">Alamat</h4>
                        <p className="text-slate-600">
                          Denpasar, Bali
                        </p>
                        <Button
                          variant="link"
                          className="text-amber-600 hover:text-amber-700 p-0 h-auto mt-2"
                          onClick={() => window.open("https://maps.google.com", "_blank")}
                        >
                          Lihat di Google Maps →
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollAnimationWrapper>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-amber-500" />
                </div>
                <h3 className="text-xl font-bold">Sewa Scaffolding Bali</h3>
              </div>
              <p className="text-slate-400">
                Penyedia scaffolding terpercaya di Bali dengan pengalaman lebih dari 10 tahun.
              </p>
            </div>

            <div>
              <h4 className="text-lg font-bold mb-4">Perusahaan</h4>
              <ul className="space-y-2 text-slate-400">
                <li><Link to="/about" className="hover:text-amber-400 transition-colors">Tentang Kami</Link></li>
                <li><Link to="/blog" className="hover:text-amber-400 transition-colors">Blog</Link></li>
                <li><a href="#portfolio" className="hover:text-amber-400 transition-colors">Portfolio</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-bold mb-4">Layanan</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#layanan" className="hover:text-amber-400 transition-colors">Sewa Scaffolding</a></li>
                <li><a href="#layanan" className="hover:text-amber-400 transition-colors">Pengiriman & Instalasi</a></li>
                <li><a href="#layanan" className="hover:text-amber-400 transition-colors">Konsultasi</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-bold mb-4">Kontak</h4>
              <ul className="space-y-2 text-slate-400">
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <a 
                    href="https://wa.me/6289666666632?text=Halo!%20Saya%20ingin%20bertanya%20tentang%20layanan%20scaffolding."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-amber-400 transition-colors"
                  >
                    +62 896-6666-6632
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  info@sewascaffoldingbali.com
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Denpasar, Bali
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 text-center text-slate-400">
            <p>&copy; {new Date().getFullYear()} Sewa Scaffolding Bali. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Button */}
      <FloatingWhatsApp />
    </div>
  );
};

export default LandingPage;