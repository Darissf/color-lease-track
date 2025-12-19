import { useInView } from "react-intersection-observer";
import CountUp from "react-countup";
import { motion } from "framer-motion";
import { Award, Building2, Clock, Users } from "lucide-react";

const stats = [
  { icon: Building2, value: 500, suffix: "+", label: "Proyek Selesai" },
  { icon: Clock, value: 10, suffix: "+", label: "Tahun Pengalaman" },
  { icon: Users, value: 24, suffix: "/7", label: "Customer Support" },
  { icon: Award, value: 100, suffix: "%", label: "Kepuasan Klien" },
];

export const StatsCounter = () => {
  const { ref, inView } = useInView({
    threshold: 0.3,
    triggerOnce: true,
  });

  return (
    <section ref={ref} className="py-16 bg-slate-50">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
              className="text-center"
            >
              <div className="relative inline-block mb-4">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-slate-800 flex items-center justify-center shadow-lg">
                  <stat.icon className="w-8 h-8 md:w-10 md:h-10 text-amber-500" />
                </div>
              </div>
              <div className="text-3xl md:text-5xl font-bold text-slate-800 mb-2">
                {inView && (
                  <>
                    <CountUp end={stat.value} duration={2.5} />
                    {stat.suffix}
                  </>
                )}
              </div>
              <p className="text-slate-600 font-medium">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};