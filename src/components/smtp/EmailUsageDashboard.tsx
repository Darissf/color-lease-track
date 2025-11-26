import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from "recharts";
import { Loader2, Mail, CheckCircle, XCircle, Clock } from "lucide-react";

const EMAIL_TYPES: Record<string, { label: string; icon: string; color: string }> = {
  email_verification: { label: "Email Verification", icon: "📧", color: "#3b82f6" },
  password_reset: { label: "Password Reset", icon: "🔑", color: "#f97316" },
  welcome: { label: "Welcome Email", icon: "👋", color: "#10b981" },
  invoice: { label: "Invoice", icon: "📄", color: "#8b5cf6" },
  delivery: { label: "Delivery", icon: "🚚", color: "#06b6d4" },
  pickup: { label: "Pickup", icon: "📦", color: "#f59e0b" },
  payment: { label: "Payment", icon: "💳", color: "#14b8a6" },
  test: { label: "Test Email", icon: "🧪", color: "#6b7280" },
  notification: { label: "Notification", icon: "🔔", color: "#ec4899" },
};

interface UsageByType {
  template_type: string;
  total: number;
  sent: number;
  failed: number;
  pending: number;
}

interface DailyTrend {
  date: string;
  template_type: string;
  count: number;
}

interface ProviderDistribution {
  provider_name: string;
  template_type: string;
  count: number;
}

const EmailUsageDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [usageByType, setUsageByType] = useState<UsageByType[]>([]);
  const [dailyTrends, setDailyTrends] = useState<DailyTrend[]>([]);
  const [providerDistribution, setProviderDistribution] = useState<ProviderDistribution[]>([]);
  const [totalStats, setTotalStats] = useState({
    total: 0,
    sent: 0,
    failed: 0,
    pending: 0,
    successRate: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Get current month usage by type
      const { data: typeData, error: typeError } = await supabase.rpc('get_email_usage_by_type', {
        start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
      });

      if (typeError) {
        console.error('Error fetching usage by type:', typeError);
      } else if (typeData) {
        const typedData = typeData as UsageByType[];
        setUsageByType(typedData);
        
        // Calculate totals
        const totals = typedData.reduce(
          (acc, row) => ({
            total: acc.total + Number(row.total),
            sent: acc.sent + Number(row.sent),
            failed: acc.failed + Number(row.failed),
            pending: acc.pending + Number(row.pending),
          }),
          { total: 0, sent: 0, failed: 0, pending: 0 }
        );
        
        setTotalStats({
          ...totals,
          successRate: totals.total > 0 ? (totals.sent / totals.total) * 100 : 0,
        });
      }

      // Get daily trends (last 7 days)
      const { data: trendData, error: trendError } = await supabase.rpc('get_email_daily_trends', {
        days: 7,
      });
      if (trendError) {
        console.error('Error fetching daily trends:', trendError);
      } else if (trendData) {
        setDailyTrends(trendData as DailyTrend[]);
      }

      // Get provider distribution
      const { data: providerData, error: providerError } = await supabase.rpc('get_email_provider_distribution');
      if (providerError) {
        console.error('Error fetching provider distribution:', providerError);
      } else if (providerData) {
        setProviderDistribution(providerData as ProviderDistribution[]);
      }

    } catch (error) {
      console.error('Error fetching email usage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const pieChartData = usageByType.map((item) => ({
    name: EMAIL_TYPES[item.template_type]?.label || item.template_type,
    value: item.total,
    color: EMAIL_TYPES[item.template_type]?.color || "#6b7280",
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Emails</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.total}</div>
            <p className="text-xs text-muted-foreground">Bulan ini</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sent</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalStats.sent}</div>
            <p className="text-xs text-muted-foreground">
              {totalStats.successRate.toFixed(1)}% success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totalStats.failed}</div>
            <p className="text-xs text-muted-foreground">Gagal terkirim</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{totalStats.pending}</div>
            <p className="text-xs text-muted-foreground">Dalam antrian</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Pie Chart - Usage by Type */}
        <Card>
          <CardHeader>
            <CardTitle>Email Usage by Type</CardTitle>
            <CardDescription>Breakdown berdasarkan tipe email</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bar Chart - Provider Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Provider Distribution</CardTitle>
            <CardDescription>Email per provider per tipe</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={providerDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="provider_name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Line Chart - Daily Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Trends (Last 7 Days)</CardTitle>
          <CardDescription>Pengiriman email per hari</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Breakdown</CardTitle>
          <CardDescription>Status per tipe email</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Type</th>
                  <th className="text-right p-2">Total</th>
                  <th className="text-right p-2">Sent</th>
                  <th className="text-right p-2">Failed</th>
                  <th className="text-right p-2">Pending</th>
                  <th className="text-right p-2">Success Rate</th>
                </tr>
              </thead>
              <tbody>
                {usageByType.map((row) => {
                  const type = EMAIL_TYPES[row.template_type] || { label: row.template_type, icon: "📧" };
                  const successRate = row.total > 0 ? (row.sent / row.total) * 100 : 0;
                  
                  return (
                    <tr key={row.template_type} className="border-b hover:bg-muted/50">
                      <td className="p-2">
                        <span className="mr-2">{type.icon}</span>
                        {type.label}
                      </td>
                      <td className="text-right p-2 font-semibold">{row.total}</td>
                      <td className="text-right p-2 text-green-600">{row.sent}</td>
                      <td className="text-right p-2 text-red-600">{row.failed}</td>
                      <td className="text-right p-2 text-yellow-600">{row.pending}</td>
                      <td className="text-right p-2">
                        <span className={`font-semibold ${successRate >= 90 ? 'text-green-600' : successRate >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {successRate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailUsageDashboard;
