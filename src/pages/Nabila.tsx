import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Wallet, TrendingUp, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const MONTHS = [
  { name: "Januari", quarter: 1, monthKey: "januari" },
  { name: "Februari", quarter: 1, monthKey: "februari" },
  { name: "Maret", quarter: 1, monthKey: "maret" },
  { name: "April", quarter: 2, monthKey: "april" },
  { name: "Mei", quarter: 2, monthKey: "mei" },
  { name: "Juni", quarter: 2, monthKey: "juni" },
  { name: "Juli", quarter: 3, monthKey: "juli" },
  { name: "Agustus", quarter: 3, monthKey: "agustus" },
  { name: "September", quarter: 3, monthKey: "september" },
  { name: "Oktober", quarter: 4, monthKey: "oktober" },
  { name: "November", quarter: 4, monthKey: "november" },
  { name: "Desember", quarter: 4, monthKey: "desember" },
];

export default function Nabila() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [availableYears, setAvailableYears] = useState<number[]>([currentYear]);
  const [loading, setLoading] = useState(true);

  // Fetch available years from database based on actual financial data
  useEffect(() => {
    const fetchAvailableYears = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        const yearsSet = new Set<number>();

        // Get years from income_sources
        const { data: incomeData } = await supabase
          .from('income_sources')
          .select('date')
          .eq('user_id', user.id)
          .not('date', 'is', null);
        
        if (incomeData) {
          incomeData.forEach((item) => {
            if (item.date) {
              const year = new Date(item.date).getFullYear();
              yearsSet.add(year);
            }
          });
        }

        // Get years from expenses
        const { data: expenseData } = await supabase
          .from('expenses')
          .select('date')
          .eq('user_id', user.id);
        
        if (expenseData) {
          expenseData.forEach((item) => {
            const year = new Date(item.date).getFullYear();
            yearsSet.add(year);
          });
        }

        // Get years from monthly_reports
        const { data: reportData } = await supabase
          .from('monthly_reports')
          .select('year')
          .eq('user_id', user.id);
        
        if (reportData) {
          reportData.forEach((item) => {
            yearsSet.add(item.year);
          });
        }

        // Get years from monthly_budgets
        const { data: budgetData } = await supabase
          .from('monthly_budgets')
          .select('year')
          .eq('user_id', user.id);
        
        if (budgetData) {
          budgetData.forEach((item) => {
            yearsSet.add(item.year);
          });
        }

        // Convert to sorted array (descending order - newest first)
        const years = Array.from(yearsSet).sort((a, b) => b - a);
        
        // If no data exists, use current year
        if (years.length === 0) {
          setAvailableYears([currentYear]);
          setSelectedYear(currentYear);
        } else {
          setAvailableYears(years);
          // Set to most recent year with data
          setSelectedYear(years[0]);
        }
      } catch (error) {
        console.error('Error fetching available years:', error);
        setAvailableYears([currentYear]);
        setSelectedYear(currentYear);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableYears();
  }, [user, currentYear]);

  const quarters = [
    { number: 1, months: MONTHS.filter(m => m.quarter === 1) },
    { number: 2, months: MONTHS.filter(m => m.quarter === 2) },
    { number: 3, months: MONTHS.filter(m => m.quarter === 3) },
    { number: 4, months: MONTHS.filter(m => m.quarter === 4) },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-5xl md:text-6xl font-serif italic text-foreground">
          Financial Planner.
        </h1>
        <p className="text-2xl md:text-3xl font-serif italic text-muted-foreground">
          KAKEIBO PAGE
        </p>
      </div>

      {/* Subtitle */}
      <Card className="p-6 bg-card">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Nabila</h2>
          <p className="text-sm text-muted-foreground">
            Versi 24.0.0 DKI Bank II Sumitro + Minimalis
          </p>
        </div>
      </Card>



      {/* Laporan Bulanan Finansial - Quarters */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Laporan Bulanan Finansial
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Tahun:</span>
            <Select 
              value={selectedYear.toString()} 
              onValueChange={(value) => setSelectedYear(parseInt(value))}
              disabled={loading}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {quarters.map((quarter) => (
            <div key={quarter.number} className="space-y-3">
              <h4 className="font-semibold text-foreground">Kuartal {quarter.number}</h4>
              <div className="space-y-2">
                {quarter.months.map((month) => (
                  <Button
                    key={month.name}
                    variant="outline"
                    className="w-full justify-start text-sm"
                    onClick={() => navigate(`/month/${selectedYear}/${month.monthKey}`)}
                  >
                    <Calendar className="h-3 w-3 mr-2" />
                    {month.name} {selectedYear}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Rencana Anggaran & Tabungan Bulanan */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
          <Target className="h-5 w-5" />
          Rencana Anggaran & Tabungan Bulanan
        </h3>
        <Button onClick={() => navigate("/monthly-budget")} className="w-full">
          Lihat Anggaran Bulanan
        </Button>
      </Card>

    </div>
  );
}
