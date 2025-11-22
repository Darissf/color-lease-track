import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X, Phone, Mail, MapPin, Clock, Shield, Award, Truck, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedHero } from "@/components/landing/AnimatedHero";
import { StatsCounter } from "@/components/landing/StatsCounter";
import { FlipCard } from "@/components/landing/FlipCard";
import { PortfolioGallery } from "@/components/landing/PortfolioGallery";
import { TestimonialCarousel } from "@/components/landing/TestimonialCarousel";
import { QuoteForm } from "@/components/landing/QuoteForm";
import { FloatingWhatsApp } from "@/components/landing/FloatingWhatsApp";
import { ScrollAnimationWrapper } from "@/components/landing/ScrollAnimationWrapper";

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
    gradient: "from-sky-500 to-cyan-500",
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
    gradient: "from-green-500 to-emerald-500",
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
    gradient: "from-purple-500 to-pink-500",
    price: "GRATIS",
  },
];

const features = [
  {
    icon: Award,
    title: "Sertifikasi SNI",
    description: "Scaffolding bersertifikat SNI dan standar keamanan internasional",
    color: "from-green-500 to-emerald-500",
  },
  {
    icon: Clock,
    title: "10+ Tahun Pengalaman",
    description: "Melayani ratusan proyek konstruksi di Bali sejak 2014",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Shield,
    title: "Kualitas Terjamin",
    description: "Material berkualitas tinggi dengan maintenance rutin",
    color: "from-purple-500 to-pink-500",
  },
  {
    icon: Phone,
    title: "Support 24/7",
    description: "Tim customer service siap membantu kapan saja",
    color: "from-orange-500 to-yellow-500",
  },
];

const LandingPage = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm shadow-md transition-all duration-300">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-sky-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                <Shield className="w-7 h-7 text-white" />
              </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-sky-600 to-cyan-600 bg-clip-text text-transparent">
                Sewa Scaffolding Bali
              </h1>
              <p className="text-xs text-gray-500">Professional Scaffolding Rental</p>
            </div>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#layanan" className="text-gray-700 hover:text-sky-600 font-medium transition-colors">
                Layanan
              </a>
              <a href="#keunggulan" className="text-gray-700 hover:text-sky-600 font-medium transition-colors">
                Keunggulan
              </a>
              <a href="#portfolio" className="text-gray-700 hover:text-sky-600 font-medium transition-colors">
                Portfolio
              </a>
              <a href="#kontak" className="text-gray-700 hover:text-sky-600 font-medium transition-colors">
                Kontak
              </a>
              <Link to="/login">
                <Button className="bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white shadow-lg">
                  Portal Admin
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-200">
              <div className="flex flex-col gap-4">
                <a href="#layanan" className="text-gray-700 hover:text-sky-600 font-medium">
                  Layanan
                </a>
                <a href="#keunggulan" className="text-gray-700 hover:text-sky-600 font-medium">
                  Keunggulan
                </a>
                <a href="#portfolio" className="text-gray-700 hover:text-sky-600 font-medium">
                  Portfolio
                </a>
                <a href="#kontak" className="text-gray-700 hover:text-sky-600 font-medium">
                  Kontak
                </a>
                <Link to="/login">
                  <Button className="w-full bg-gradient-to-r from-sky-500 to-cyan-500 text-white">
                    Portal Admin
                  </Button>
                </Link>
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
      <section id="layanan" className="py-20 bg-gradient-to-b from-white to-sky-50">
        <div className="container mx-auto px-4">
          <ScrollAnimationWrapper>
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
                Layanan <span className="text-sky-500">Kami</span>
              </h2>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                Solusi scaffolding lengkap untuk semua kebutuhan konstruksi Anda
              </p>
            </div>
          </ScrollAnimationWrapper>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, idx) => (
              <ScrollAnimationWrapper key={idx} delay={idx * 0.1}>
                <FlipCard {...service} />
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
              <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
                Mengapa Pilih <span className="text-sky-500">Kami?</span>
              </h2>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                Keunggulan yang membuat kami menjadi pilihan terbaik di Bali
              </p>
            </div>
          </ScrollAnimationWrapper>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => (
              <ScrollAnimationWrapper key={idx} delay={idx * 0.1}>
                <Card className="group hover:shadow-2xl transition-all duration-300 border-0 bg-white overflow-hidden">
                  <CardContent className="p-6 text-center relative">
                    <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${feature.color} flex items-center justify-center mx-auto mb-4 shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
                      <feature.icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-3">{feature.title}</h3>
                    <p className="text-gray-600">{feature.description}</p>
                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
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
      <section className="py-20 bg-gradient-to-br from-sky-600 via-cyan-600 to-blue-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6bTAgMGMwLTIuMjEgMS43OS00IDQtNHM0IDEuNzkgNCA0LTEuNzkgNC00IDQtNC0xLjc5LTQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20" />
        <div className="container mx-auto px-4 relative z-10">
          <ScrollAnimationWrapper>
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Siap Memulai Proyek Anda?
              </h2>
              <p className="text-xl mb-8 text-white/90">
                Dapatkan konsultasi gratis dan penawaran terbaik untuk kebutuhan scaffolding proyek Anda
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  className="bg-white text-sky-600 hover:bg-gray-100 shadow-2xl transform hover:scale-105 transition-all duration-300"
                  onClick={() => document.getElementById("kontak")?.scrollIntoView({ behavior: "smooth" })}
                >
                  <Phone className="mr-2 w-5 h-5" />
                  Hubungi Kami Sekarang
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-white/10 backdrop-blur-sm border-2 border-white text-white hover:bg-white/20 transform hover:scale-105 transition-all duration-300"
                  onClick={() => window.open("https://wa.me/6281234567890", "_blank")}
                >
                  WhatsApp
                </Button>
              </div>
            </div>
          </ScrollAnimationWrapper>
        </div>
      </section>

      {/* Contact Section */}
      <section id="kontak" className="py-20 bg-gradient-to-b from-sky-50 to-white">
        <div className="container mx-auto px-4">
          <ScrollAnimationWrapper>
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
                Hubungi <span className="text-sky-500">Kami</span>
              </h2>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                Tim kami siap membantu Anda menemukan solusi scaffolding terbaik
              </p>
            </div>
          </ScrollAnimationWrapper>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Contact Form */}
            <ScrollAnimationWrapper direction="left">
              <div className="bg-white rounded-3xl shadow-2xl p-8 border border-sky-100">
                <h3 className="text-2xl font-bold text-gray-800 mb-6">Minta Penawaran</h3>
                <QuoteForm />
              </div>
            </ScrollAnimationWrapper>

            {/* Contact Info */}
            <ScrollAnimationWrapper direction="right">
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-gray-800 mb-6">Informasi Kontak</h3>
                
                <Card className="group hover:shadow-xl transition-all duration-300 border-sky-200">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                        <Phone className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-800 mb-2">Telepon</h4>
                        <a href="tel:+6281234567890" className="text-sky-600 hover:text-sky-700 font-medium">
                          +62 812-3456-7890
                        </a>
                        <p className="text-sm text-gray-500 mt-1">Senin - Sabtu: 08:00 - 18:00</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="group hover:shadow-xl transition-all duration-300 border-sky-200">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                        <Mail className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-800 mb-2">Email</h4>
                        <a href="mailto:info@sewascaffoldingbali.com" className="text-sky-600 hover:text-sky-700 font-medium">
                          info@sewascaffoldingbali.com
                        </a>
                        <p className="text-sm text-gray-500 mt-1">Respon dalam 1-2 jam kerja</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="group hover:shadow-xl transition-all duration-300 border-sky-200">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                        <MapPin className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-800 mb-2">Alamat</h4>
                        <p className="text-gray-600">
                          Jl. Bypass Ngurah Rai No. 123<br />
                          Denpasar, Bali 80361
                        </p>
                        <Button
                          variant="link"
                          className="text-sky-600 hover:text-sky-700 p-0 h-auto mt-2"
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
      <footer className="bg-gradient-to-br from-gray-900 to-gray-800 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-cyan-500 rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold">Sewa Scaffolding Bali</h3>
              </div>
              <p className="text-gray-400">
                Penyedia scaffolding terpercaya di Bali dengan pengalaman lebih dari 10 tahun.
              </p>
            </div>

            <div>
              <h4 className="text-lg font-bold mb-4">Perusahaan</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/about" className="hover:text-sky-400 transition-colors">Tentang Kami</Link></li>
                <li><Link to="/blog" className="hover:text-sky-400 transition-colors">Blog</Link></li>
                <li><a href="#portfolio" className="hover:text-sky-400 transition-colors">Portfolio</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-bold mb-4">Layanan</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#layanan" className="hover:text-sky-400 transition-colors">Sewa Scaffolding</a></li>
                <li><a href="#layanan" className="hover:text-sky-400 transition-colors">Pengiriman & Instalasi</a></li>
                <li><a href="#layanan" className="hover:text-sky-400 transition-colors">Konsultasi</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-bold mb-4">Kontak</h4>
              <ul className="space-y-2 text-gray-400">
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  +62 812-3456-7890
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

          <div className="border-t border-gray-700 pt-8 text-center text-gray-400">
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
