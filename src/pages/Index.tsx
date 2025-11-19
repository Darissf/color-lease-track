import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { FileText, Calendar, PiggyBank, TrendingUp, Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/ui/theme-provider";

const Index = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background Layer */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Stars */}
        {[...Array(100)].map((_, i) => (
          <div
            key={`star-${i}`}
            className="absolute w-1 h-1 rounded-full bg-white animate-[star-twinkle_3s_ease-in-out_infinite]"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.7 + 0.3,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}

        {/* Moon */}
        <div className="absolute top-20 right-20 w-32 h-32 rounded-full bg-gradient-to-br from-[hsl(var(--moon-gold))] to-yellow-200 opacity-80 blur-sm animate-[moon-pulse_6s_ease-in-out_infinite]" />

        {/* Night Fog */}
        {[...Array(5)].map((_, i) => (
          <div
            key={`fog-${i}`}
            className="absolute w-96 h-96 rounded-full bg-[hsl(var(--fog-mist))] opacity-10 blur-3xl animate-[fog-drift_20s_ease-in-out_infinite]"
            style={{
              left: `${i * 25}%`,
              top: `${Math.random() * 80}%`,
              animationDelay: `${i * 4}s`,
            }}
          />
        ))}

        {/* Torii Gate Silhouette */}
        <svg
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-64 text-[hsl(var(--torii-red))] opacity-20 animate-[torii-glow_4s_ease-in-out_infinite]"
          viewBox="0 0 200 200"
          fill="currentColor"
        >
          <rect x="30" y="60" width="15" height="140" />
          <rect x="155" y="60" width="15" height="140" />
          <path d="M 10 70 Q 100 50 190 70 L 190 85 Q 100 65 10 85 Z" />
          <rect x="20" y="100" width="160" height="12" />
        </svg>

        {/* Floating Origami */}
        {[...Array(18)].map((_, i) => (
          <svg
            key={`origami-${i}`}
            className="absolute opacity-30 animate-[origami-float_15s_ease-in-out_infinite]"
            width="30"
            height="30"
            viewBox="0 0 30 30"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDuration: `${12 + Math.random() * 8}s`,
              animationDelay: `${i * 0.8}s`,
            }}
          >
            <polygon
              points="15,5 25,25 5,25"
              fill={`hsl(${Math.random() * 360}, 70%, 60%)`}
            />
          </svg>
        ))}

        {/* Fireflies */}
        {[...Array(35)].map((_, i) => (
          <div
            key={`firefly-${i}`}
            className="absolute w-2 h-2 rounded-full bg-[hsl(var(--firefly-glow-green))] animate-[firefly-glow_2s_ease-in-out_infinite,firefly-drift_8s_ease-in-out_infinite]"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              boxShadow: '0 0 10px hsl(var(--firefly-glow-green))',
              animationDelay: `${Math.random() * 4}s`,
            }}
          />
        ))}

        {/* Bamboo Leaves */}
        {[...Array(28)].map((_, i) => (
          <div
            key={`bamboo-${i}`}
            className="absolute w-8 h-16 rounded-full bg-gradient-to-b from-[hsl(var(--bamboo-night-green))] to-emerald-800 opacity-40 animate-[bamboo-fall_12s_linear_infinite,bamboo-sway_2s_ease-in-out_infinite]"
            style={{
              left: `${Math.random() * 100}%`,
              top: `-10%`,
              animationDelay: `${i * 0.4}s`,
            }}
          />
        ))}

        {/* Sakura Petals */}
        {[...Array(20)].map((_, i) => (
          <svg
            key={`sakura-${i}`}
            className="absolute opacity-60 animate-[sakura-fall_15s_linear_infinite]"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            style={{
              left: `${Math.random() * 100}%`,
              top: `-5%`,
              animationDelay: `${i * 0.7}s`,
            }}
          >
            <circle cx="10" cy="10" r="2" fill="hsl(var(--sakura-pink))" />
            <ellipse cx="10" cy="5" rx="3" ry="5" fill="hsl(var(--cherry-glow-pink))" />
            <ellipse cx="15" cy="10" rx="5" ry="3" fill="hsl(var(--cherry-glow-pink))" />
            <ellipse cx="10" cy="15" rx="3" ry="5" fill="hsl(var(--cherry-glow-pink))" />
            <ellipse cx="5" cy="10" rx="5" ry="3" fill="hsl(var(--cherry-glow-pink))" />
            <ellipse cx="10" cy="10" rx="4" ry="4" fill="hsl(var(--sakura-pink))" opacity="0.7" />
          </svg>
        ))}

        {/* Floating Lanterns */}
        {[...Array(8)].map((_, i) => (
          <div
            key={`lantern-${i}`}
            className="absolute w-16 h-20 rounded-lg bg-gradient-to-b from-[hsl(var(--lantern-glow-orange))] to-red-600 opacity-40 animate-[lantern-float_20s_ease-in-out_infinite]"
            style={{
              left: `${Math.random() * 100}%`,
              bottom: `${Math.random() * 50}%`,
              boxShadow: '0 0 30px hsl(var(--lantern-glow-orange))',
              animationDelay: `${i * 2.5}s`,
            }}
          />
        ))}
      </div>

      {/* Content Layer */}
      <div className="relative z-10 container mx-auto px-4 py-16">
        {/* Header Section */}
        <div className="text-center space-y-6 mb-16">
          <h1 className="text-5xl md:text-6xl font-bold">
            <span className="bg-gradient-to-r from-[hsl(var(--torii-red))] via-[hsl(var(--sakura-pink))] to-[hsl(var(--gold-kin))] bg-clip-text text-transparent">
              🏮 Financial Planner 🏮
            </span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Metode Kakeibo untuk Perencanaan Keuangan yang Lebih Baik
          </p>
          
          <div className="flex justify-center gap-4 mt-6">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="w-12 h-12 rounded-full border-2 border-[hsl(var(--moon-gold))]"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5 text-[hsl(var(--moon-gold))]" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Interactive Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Card 1: Nabila */}
          <Card 
            className="p-8 backdrop-blur-sm bg-card/80 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 cursor-pointer group border-2 border-[hsl(var(--border))]"
            onClick={() => navigate("/nabila")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate("/nabila");
              }
            }}
          >
            <div className="flex items-start gap-4">
              <div className="p-4 bg-gradient-to-br from-[hsl(var(--torii-red))] to-[hsl(var(--sakura-pink))] rounded-xl group-hover:scale-110 transition-transform">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-2 text-foreground">
                  Nabila Financial Planner
                </h3>
                <p className="text-muted-foreground mb-4">
                  Akses halaman utama financial planner dengan metode Kakeibo
                </p>
                <Button 
                  variant="ghost" 
                  className="px-0 hover:bg-transparent hover:text-[hsl(var(--torii-red))] transition-colors"
                >
                  Buka Halaman →
                </Button>
              </div>
            </div>
          </Card>

          {/* Card 2: Dashboard */}
          <Card 
            className="p-8 backdrop-blur-sm bg-card/80 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 cursor-pointer group border-2 border-[hsl(var(--border))]"
            onClick={() => navigate("/dashboard")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate("/dashboard");
              }
            }}
          >
            <div className="flex items-start gap-4">
              <div className="p-4 bg-gradient-to-br from-[hsl(var(--gold-kin))] to-[hsl(var(--moon-gold))] rounded-xl group-hover:scale-110 transition-transform">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-2 text-foreground">
                  Dashboard
                </h3>
                <p className="text-muted-foreground mb-4">
                  Lihat ringkasan keuangan dan statistik bulanan Anda
                </p>
                <Button 
                  variant="ghost" 
                  className="px-0 hover:bg-transparent hover:text-[hsl(var(--gold-kin))] transition-colors"
                >
                  Lihat Dashboard →
                </Button>
              </div>
            </div>
          </Card>

          {/* Card 3: Savings Plans */}
          <Card 
            className="p-8 backdrop-blur-sm bg-card/80 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 cursor-pointer group border-2 border-[hsl(var(--border))]"
            onClick={() => navigate("/savings")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate("/savings");
              }
            }}
          >
            <div className="flex items-start gap-4">
              <div className="p-4 bg-gradient-to-br from-[hsl(var(--matcha-green))] to-emerald-500 rounded-xl group-hover:scale-110 transition-transform">
                <PiggyBank className="h-8 w-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-2 text-foreground">
                  Savings Plans
                </h3>
                <p className="text-muted-foreground mb-4">
                  Kelola rencana tabungan dan target keuangan Anda
                </p>
                <Button 
                  variant="ghost" 
                  className="px-0 hover:bg-transparent hover:text-[hsl(var(--matcha-green))] transition-colors"
                >
                  Kelola Tabungan →
                </Button>
              </div>
            </div>
          </Card>

          {/* Card 4: Monthly Budget */}
          <Card 
            className="p-8 backdrop-blur-sm bg-card/80 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 cursor-pointer group border-2 border-[hsl(var(--border))]"
            onClick={() => navigate("/monthly-budget")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate("/monthly-budget");
              }
            }}
          >
            <div className="flex items-start gap-4">
              <div className="p-4 bg-gradient-to-br from-[hsl(var(--lantern-glow-orange))] to-red-600 rounded-xl group-hover:scale-110 transition-transform">
                <Calendar className="h-8 w-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-2 text-foreground">
                  Monthly Budget
                </h3>
                <p className="text-muted-foreground mb-4">
                  Buat dan pantau anggaran bulanan Anda
                </p>
                <Button 
                  variant="ghost" 
                  className="px-0 hover:bg-transparent hover:text-[hsl(var(--lantern-glow-orange))] transition-colors"
                >
                  Kelola Budget →
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
