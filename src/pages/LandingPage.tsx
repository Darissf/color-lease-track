import { Button } from "@/components/ui/button";
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
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6">
            Sewa Scaffolding Profesional di Bali
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Solusi terpercaya untuk kebutuhan konstruksi Anda dengan standar keamanan tinggi dan layanan terbaik
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
          <h2 className="text-4xl font-bold text-center text-foreground mb-12">Layanan Kami</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-card p-8 rounded-lg border border-border hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Sewa Scaffolding</h3>
              <p className="text-muted-foreground">
                Berbagai jenis scaffolding dengan kualitas premium untuk proyek konstruksi Anda, lengkap dengan peralatan safety.
              </p>
            </div>
            <div className="bg-card p-8 rounded-lg border border-border hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Instalasi Profesional</h3>
              <p className="text-muted-foreground">
                Tim ahli kami siap memasang scaffolding dengan standar keamanan internasional dan pengalaman bertahun-tahun.
              </p>
            </div>
            <div className="bg-card p-8 rounded-lg border border-border hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Konsultasi Gratis</h3>
              <p className="text-muted-foreground">
                Dapatkan konsultasi gratis untuk menentukan solusi scaffolding yang tepat sesuai kebutuhan proyek Anda.
              </p>
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
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="text-4xl font-bold text-foreground mb-6">Hubungi Kami</h2>
          <div className="space-y-4 text-muted-foreground">
            <p className="text-lg">
              <strong className="text-foreground">Telepon:</strong> +62 812-3456-7890
            </p>
            <p className="text-lg">
              <strong className="text-foreground">Email:</strong> info@scaffoldingbali.com
            </p>
            <p className="text-lg">
              <strong className="text-foreground">Alamat:</strong> Jl. Bypass Ngurah Rai No. 123, Denpasar, Bali
            </p>
          </div>
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
