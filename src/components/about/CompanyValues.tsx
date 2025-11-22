import { Shield, Clock, Users, Calculator, AlertTriangle, Heart } from "lucide-react";
import { ScrollAnimationWrapper } from "@/components/landing/ScrollAnimationWrapper";

const values = [
  {
    title: "Kualitas Terjamin",
    description: "Scaffolding berkualitas SNI untuk keamanan maksimal",
    icon: Shield,
    color: "from-sky-blue to-cyan",
  },
  {
    title: "Tepat Waktu",
    description: "Pengiriman & pickup on-time sesuai jadwal",
    icon: Clock,
    color: "from-green-500 to-emerald-500",
  },
  {
    title: "Tim Profesional",
    description: "Teknisi berpengalaman & terlatih",
    icon: Users,
    color: "from-purple-500 to-pink-500",
  },
  {
    title: "Harga Transparan",
    description: "No hidden cost, clear pricing",
    icon: Calculator,
    color: "from-accent-orange to-yellow-500",
  },
  {
    title: "Safety First",
    description: "Prioritas keselamatan #1 di setiap proyek",
    icon: AlertTriangle,
    color: "from-red-500 to-rose-500",
  },
  {
    title: "Customer Focus",
    description: "Kepuasan pelanggan adalah tujuan kami",
    icon: Heart,
    color: "from-pink-500 to-rose-500",
  },
];

export const CompanyValues = () => {
  return (
    <section className="py-20 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-sky-blue/5 via-transparent to-cyan/5" />
      
      <div className="container mx-auto px-4 relative z-10">
        <ScrollAnimationWrapper direction="up">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Nilai-Nilai Kami
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Prinsip yang kami pegang teguh dalam setiap proyek
            </p>
          </div>
        </ScrollAnimationWrapper>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {values.map((value, index) => (
            <ScrollAnimationWrapper
              key={value.title}
              direction="up"
              delay={index * 0.1}
            >
              <div className="bg-card border border-border rounded-xl p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 group">
                <div
                  className={`w-16 h-16 rounded-full bg-gradient-to-br ${value.color} flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300`}
                >
                  <value.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">
                  {value.title}
                </h3>
                <p className="text-muted-foreground">
                  {value.description}
                </p>
              </div>
            </ScrollAnimationWrapper>
          ))}
        </div>
      </div>
    </section>
  );
};
