import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Building2, Shield, Clock, CheckCircle2, Award, Headphones } from "lucide-react";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-b border-border z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold text-foreground">ScaffoldingBali</span>
            </div>
            <nav className="hidden md:flex items-center gap-8">
              <a href="#services" className="text-muted-foreground hover:text-foreground transition-colors">Layanan</a>
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Keunggulan</a>
              <a href="#contact" className="text-muted-foreground hover:text-foreground transition-colors">Kontak</a>
              <Link to="/login">
                <Button variant="default">Portal Klien</Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto text-center">
          <div className="inline-block mb-4 px-4 py-2 bg-primary/10 rounded-full">
            <span className="text-primary font-semibold">✓ Tersertifikasi & Terpercaya</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Sewa Scaffolding Profesional di Bali
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            Solusi lengkap scaffolding dengan <span className="text-foreground font-semibold">pengiriman cepat</span>, instalasi profesional, dan sistem tracking online untuk proyek konstruksi Anda
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8" asChild>
              <a href="#contact">Minta Penawaran</a>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8" asChild>
              <a href="#services">Lihat Layanan</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 px-6 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">Layanan Kami</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Solusi lengkap scaffolding dari pengiriman hingga pengambilan dengan sistem tracking online
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-card p-8 rounded-lg border border-border hover:shadow-lg hover:border-primary/50 transition-all group">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Sewa Scaffolding</h3>
              <p className="text-muted-foreground mb-4">
                Ring Lock, Cup Lock, Frame Scaffolding tersedia dalam berbagai ukuran dan kuantitas
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Tersertifikasi SNI</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Kondisi Prima</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Harga Kompetitif</span>
                </li>
              </ul>
            </div>
            <div className="bg-card p-8 rounded-lg border border-border hover:shadow-lg hover:border-primary/50 transition-all group">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Pengiriman & Instalasi</h3>
              <p className="text-muted-foreground mb-4">
                Pengiriman cepat ke seluruh Bali dengan tracking real-time dan instalasi oleh teknisi bersertifikat
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Pengiriman On-Time</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Tracking Online</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Instalasi Gratis*</span>
                </li>
              </ul>
            </div>
            <div className="bg-card p-8 rounded-lg border border-border hover:shadow-lg hover:border-primary/50 transition-all group">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Konsultasi & Survey</h3>
              <p className="text-muted-foreground mb-4">
                Survey lokasi gratis dan konsultasi dengan engineer berpengalaman untuk solusi terbaik
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Survey Gratis</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Perhitungan Akurat</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Rekomendasi Ahli</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6">
        <div className="container mx-auto">
          <h2 className="text-4xl font-bold text-center text-foreground mb-12">Mengapa Memilih Kami?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex gap-4">
              <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-foreground mb-2">Sertifikasi Lengkap</h3>
                <p className="text-muted-foreground">Semua peralatan tersertifikasi dan teruji standar internasional</p>
              </div>
            </div>
            <div className="flex gap-4">
              <Award className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-foreground mb-2">Pengalaman 10+ Tahun</h3>
                <p className="text-muted-foreground">Telah menangani ratusan proyek konstruksi di seluruh Bali</p>
              </div>
            </div>
            <div className="flex gap-4">
              <Headphones className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-foreground mb-2">Support 24/7</h3>
                <p className="text-muted-foreground">Tim support siap membantu kapan saja untuk kebutuhan Anda</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-primary text-primary-foreground">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Siap Memulai Proyek Anda?</h2>
          <p className="text-xl mb-8 opacity-90">
            Hubungi kami sekarang untuk mendapatkan penawaran terbaik
          </p>
          <Button size="lg" variant="secondary" className="text-lg px-8" asChild>
            <a href="#contact">Hubungi Kami</a>
          </Button>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 px-6">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">Hubungi Kami</h2>
            <p className="text-muted-foreground">Tim kami siap membantu Anda 24/7</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Headphones className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Telepon & WhatsApp</h3>
                  <p className="text-muted-foreground mb-2">Hubungi kami langsung</p>
                  <a href="tel:+6281234567890" className="text-primary font-medium hover:underline">
                    +62 812-3456-7890
                  </a>
                </div>
              </div>
            </Card>
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Headphones className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Email</h3>
                  <p className="text-muted-foreground mb-2">Kirim pertanyaan Anda</p>
                  <a href="mailto:info@scaffoldingbali.com" className="text-primary font-medium hover:underline">
                    info@scaffoldingbali.com
                  </a>
                </div>
              </div>
            </Card>
          </div>
          <Card className="mt-8 p-6 bg-muted/50">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">Alamat Kantor & Workshop</h3>
                <p className="text-muted-foreground">
                  Jl. Bypass Ngurah Rai No. 123, Denpasar, Bali 80361
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Buka: Senin - Sabtu, 08:00 - 17:00 WITA
                </p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>&copy; 2024 ScaffoldingBali. Semua hak dilindungi.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
