import { AboutHero } from "@/components/about/AboutHero";
import { CompanyTimeline } from "@/components/about/CompanyTimeline";
import { CompanyValues } from "@/components/about/CompanyValues";
import { TeamMemberCard } from "@/components/about/TeamMemberCard";
import { AchievementBadge } from "@/components/about/AchievementBadge";
import { CompanyGallery } from "@/components/about/CompanyGallery";
import { ScrollAnimationWrapper } from "@/components/landing/ScrollAnimationWrapper";
import { Button } from "@/components/ui/button";
import { Award, Clock, Users, HeadphonesIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { SEOHead } from "@/components/SEOHead";
import { getOrganizationSchema, getBreadcrumbSchema } from "@/lib/seo";

const teamMembers = [
  {
    name: "I Made Suarjana",
    position: "Founder & CEO",
    bio: "Visioner di balik kesuksesan perusahaan",
    fullBio: "Lebih dari 15 tahun pengalaman di industri konstruksi dan scaffolding. Memimpin perusahaan dengan visi untuk menjadi penyedia scaffolding terbaik di Bali.",
  },
  {
    name: "Ni Putu Ayu Dewi",
    position: "Operations Manager",
    bio: "Mengelola operasional harian perusahaan",
    fullBio: "Bertanggung jawab atas efisiensi operasional, manajemen armada, dan koordinasi tim lapangan untuk memastikan setiap proyek berjalan lancar.",
  },
  {
    name: "I Ketut Wirawan",
    position: "Technical Supervisor",
    bio: "Memastikan standar keamanan & kualitas",
    fullBio: "Memiliki sertifikasi K3 dan pengalaman 12 tahun di bidang scaffolding. Mengawasi instalasi dan memastikan semua standar keamanan terpenuhi.",
  },
  {
    name: "Made Agus Santika",
    position: "Customer Relations",
    bio: "Penghubung dengan klien kami",
    fullBio: "Menangani semua komunikasi dengan klien, memberikan konsultasi, dan memastikan kepuasan pelanggan di setiap tahap proyek.",
  },
];

const achievements = [
  {
    icon: Award,
    label: "Sertifikasi SNI",
    description: "Standar kualitas nasional",
  },
  {
    icon: Award,
    label: "ISO Certified",
    description: "Manajemen kualitas internasional",
  },
  {
    icon: Users,
    label: "500+ Proyek",
    description: "Pengalaman di berbagai skala",
  },
  {
    icon: Clock,
    label: "10+ Tahun",
    description: "Melayani Bali dengan dedikasi",
  },
  {
    icon: HeadphonesIcon,
    label: "24/7 Support",
    description: "Siap membantu kapan saja",
  },
];

export default function AboutUs() {
  return (
    <div className="min-h-screen">
      {/* SEO */}
      <SEOHead
        title="Tentang Kami - Sewa Scaffolding Bali"
        description="Kenali Sewa Scaffolding Bali lebih dekat. Berpengalaman 10+ tahun melayani 500+ proyek konstruksi di Bali dengan tim profesional dan scaffolding bersertifikasi SNI."
        keywords="tentang scaffolding bali, profil perusahaan scaffolding, tim scaffolding profesional, sejarah scaffolding bali"
        canonical="/about"
        structuredData={[
          getOrganizationSchema(),
          getBreadcrumbSchema([
            { name: "Beranda", url: "/" },
            { name: "Tentang Kami", url: "/about" }
          ])
        ]}
      />

      <AboutHero />
      <CompanyTimeline />
      <CompanyValues />

      {/* Team Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <ScrollAnimationWrapper direction="up">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-foreground mb-4">
                Tim Kami
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Profesional berpengalaman yang siap melayani Anda
              </p>
            </div>
          </ScrollAnimationWrapper>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
            {teamMembers.map((member, index) => (
              <ScrollAnimationWrapper
                key={member.name}
                direction="up"
                delay={index * 0.1}
              >
                <TeamMemberCard {...member} />
              </ScrollAnimationWrapper>
            ))}
          </div>
        </div>
      </section>

      {/* Achievements Section */}
      <section className="py-20 bg-gradient-to-r from-sky-blue/10 to-cyan/10">
        <div className="container mx-auto px-4">
          <ScrollAnimationWrapper direction="up">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-foreground mb-4">
                Pencapaian & Sertifikasi
              </h2>
            </div>
          </ScrollAnimationWrapper>

          <div className="flex overflow-x-auto gap-6 pb-4 scrollbar-thin scrollbar-thumb-sky-blue scrollbar-track-gray-100">
            {achievements.map((achievement, index) => (
              <ScrollAnimationWrapper
                key={achievement.label}
                direction="left"
                delay={index * 0.1}
              >
                <AchievementBadge {...achievement} />
              </ScrollAnimationWrapper>
            ))}
          </div>
        </div>
      </section>

      <CompanyGallery />

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-blue via-cyan to-purple-500" />
        <div className="container mx-auto px-4 relative z-10 text-center text-white">
          <ScrollAnimationWrapper direction="up">
            <h2 className="text-4xl font-bold mb-4">Siap Bekerja Sama?</h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Hubungi kami untuk konsultasi gratis dan dapatkan penawaran terbaik untuk proyek Anda
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to="/#contact">
                <Button size="lg" variant="secondary" className="text-lg">
                  Hubungi Kami
                </Button>
              </Link>
              <Link to="/#portfolio">
                <Button size="lg" variant="outline" className="text-lg border-white text-white hover:bg-white hover:text-sky-blue">
                  Lihat Portfolio
                </Button>
              </Link>
            </div>
          </ScrollAnimationWrapper>
        </div>
      </section>

      {/* Legal Notice for Meta Verification */}
      <section className="py-6 bg-gray-900 text-center">
        <p className="text-sm text-gray-400">
          Sewa Scaffolding Bali adalah bagian dari/dioperasikan oleh PT ExEnt Digital Indonesia.
        </p>
      </section>
    </div>
  );
}
