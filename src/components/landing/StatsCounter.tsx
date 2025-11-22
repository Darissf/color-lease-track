import { useInView } from "react-intersection-observer";
import CountUp from "react-countup";
import { motion } from "framer-motion";
import { Award, Building2, Clock, Users } from "lucide-react";

const stats = [
  { icon: Building2, value: 500, suffix: "+", label: "Proyek Selesai", color: "from-blue-500 to-cyan-500" },
  { icon: Clock, value: 10, suffix: "+", label: "Tahun Pengalaman", color: "from-purple-500 to-pink-500" },
  { icon: Users, value: 24, suffix: "/7", label: "Customer Support", color: "from-orange-500 to-yellow-500" },
  { icon: Award, value: 100, suffix: "%", label: "Kepuasan Klien", color: "from-green-500 to-emerald-500" },
];

export const StatsCounter = () => {
  const { ref, inView } = useInView({
    threshold: 0.3,
    triggerOnce: true,
  });

  return (
    <section ref={ref} className="py-16 bg-gradient-to-r from-sky-50 to-cyan-50">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
              className="text-center"
            >
              <div className="relative inline-block mb-4">
                <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-xl transform hover:scale-110 transition-transform duration-300`}>
                  <stat.icon className="w-10 h-10 text-white" />
                </div>
                <motion.div
                  className={`absolute inset-0 rounded-full bg-gradient-to-br ${stat.color} opacity-20`}
                  animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0, 0.2] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
              <div className="text-4xl md:text-5xl font-bold text-gray-800 mb-2">
                {inView && (
                  <>
                    <CountUp end={stat.value} duration={2.5} />
                    {stat.suffix}
                  </>
                )}
              </div>
              <p className="text-gray-600 font-medium">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
