import { Building2, Truck, Award, Monitor, Trophy } from "lucide-react";
import { ScrollAnimationWrapper } from "@/components/landing/ScrollAnimationWrapper";

const timelineEvents = [
  {
    year: "2014",
    title: "Berdiri & Proyek Pertama",
    description: "Memulai dengan 50 unit scaffolding dan melayani proyek pertama di Bali",
    icon: Building2,
    image: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=400",
  },
  {
    year: "2016",
    title: "Ekspansi Peralatan",
    description: "Menambah 200 unit scaffolding dan armada pengiriman untuk jangkauan lebih luas",
    icon: Truck,
    image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400",
  },
  {
    year: "2018",
    title: "Sertifikasi SNI",
    description: "Mendapat sertifikasi SNI & ISO untuk standar kualitas internasional",
    icon: Award,
    image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400",
  },
  {
    year: "2020",
    title: "Digital Transformation",
    description: "Launching sistem booking online untuk kemudahan pelanggan",
    icon: Monitor,
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400",
  },
  {
    year: "2025",
    title: "500+ Proyek Selesai",
    description: "Melayani 300+ klien di seluruh Bali dengan tingkat kepuasan tinggi",
    icon: Trophy,
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400",
  },
];

export const CompanyTimeline = () => {
  return (
    <section className="py-20 bg-gradient-to-b from-background to-sky-blue/5">
      <div className="container mx-auto px-4">
        <ScrollAnimationWrapper direction="up">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Perjalanan Kami
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Lebih dari satu dekade pengalaman melayani proyek konstruksi di Bali
            </p>
          </div>
        </ScrollAnimationWrapper>

        <div className="relative max-w-4xl mx-auto">
          {/* Timeline line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-sky-blue via-cyan to-sky-blue/20 transform -translate-x-1/2" />

          {timelineEvents.map((event, index) => (
            <ScrollAnimationWrapper
              key={event.year}
              direction={index % 2 === 0 ? "left" : "right"}
              delay={index * 0.1}
            >
              <div
                className={`relative flex items-center mb-16 ${
                  index % 2 === 0 ? "flex-row" : "flex-row-reverse"
                }`}
              >
                {/* Content Card */}
                <div className="w-5/12">
                  <div className="bg-card border border-border rounded-lg p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-sky-blue to-cyan flex items-center justify-center">
                        <event.icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-sky-blue mb-1">
                          {event.year}
                        </div>
                        <h3 className="text-xl font-bold text-foreground mb-2">
                          {event.title}
                        </h3>
                        <p className="text-muted-foreground">
                          {event.description}
                        </p>
                      </div>
                    </div>
                    <img
                      src={event.image}
                      alt={event.title}
                      className="mt-4 rounded-lg w-full h-40 object-cover"
                    />
                  </div>
                </div>

                {/* Timeline dot */}
                <div className="absolute left-1/2 transform -translate-x-1/2 w-6 h-6 bg-sky-blue rounded-full border-4 border-background shadow-lg z-10" />
              </div>
            </ScrollAnimationWrapper>
          ))}
        </div>
      </div>
    </section>
  );
};
