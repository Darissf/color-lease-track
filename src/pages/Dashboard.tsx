import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Building2, Users, AlertCircle } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const revenueData = [
  { month: "Jan", revenue: 45000, expenses: 32000 },
  { month: "Feb", revenue: 52000, expenses: 28000 },
  { month: "Mar", revenue: 48000, expenses: 35000 },
  { month: "Apr", revenue: 61000, expenses: 31000 },
  { month: "May", revenue: 55000, expenses: 29000 },
  { month: "Jun", revenue: 67000, expenses: 33000 },
];

const propertyData = [
  { name: "Occupied", value: 24, color: "hsl(var(--primary))" },
  { name: "Vacant", value: 6, color: "hsl(var(--secondary))" },
  { name: "Maintenance", value: 2, color: "hsl(var(--warning))" },
];

const Dashboard = () => {
  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent mb-2">
          Dashboard Overview
        </h1>
        <p className="text-muted-foreground">Welcome back! Here's what's happening with your properties.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="p-6 gradient-card card-hover border-0 shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
              <p className="text-3xl font-bold text-foreground mt-2">$67,000</p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="h-4 w-4 text-accent" />
                <span className="text-sm font-semibold text-accent">+12.5%</span>
                <span className="text-xs text-muted-foreground">vs last month</span>
              </div>
            </div>
            <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6 gradient-card card-hover border-0 shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Properties</p>
              <p className="text-3xl font-bold text-foreground mt-2">32</p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-primary">+2</span>
                <span className="text-xs text-muted-foreground">new this month</span>
              </div>
            </div>
            <div className="h-12 w-12 rounded-xl gradient-success flex items-center justify-center shadow-lg">
              <Building2 className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6 gradient-card card-hover border-0 shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Tenants</p>
              <p className="text-3xl font-bold text-foreground mt-2">24</p>
              <div className="flex items-center gap-1 mt-2">
                <span className="text-sm font-semibold text-muted-foreground">75%</span>
                <span className="text-xs text-muted-foreground">occupancy rate</span>
              </div>
            </div>
            <div className="h-12 w-12 rounded-xl gradient-secondary flex items-center justify-center shadow-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6 gradient-card card-hover border-0 shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending Tasks</p>
              <p className="text-3xl font-bold text-foreground mt-2">8</p>
              <div className="flex items-center gap-1 mt-2">
                <AlertCircle className="h-4 w-4 text-warning" />
                <span className="text-sm font-semibold text-warning">3 urgent</span>
              </div>
            </div>
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-warning to-secondary flex items-center justify-center shadow-lg">
              <AlertCircle className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        <Card className="p-6 gradient-card border-0 shadow-md">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Revenue & Expenses</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              <Bar dataKey="expenses" fill="hsl(var(--secondary))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 gradient-card border-0 shadow-md">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Property Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={propertyData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {propertyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="p-6 gradient-card border-0 shadow-md">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Recent Payments</h3>
        <div className="space-y-4">
          {[
            { tenant: "Sarah Johnson", property: "Sunset Villa #12", amount: "$2,500", status: "Paid", date: "Jun 1, 2025" },
            { tenant: "Michael Chen", property: "Harbor View #7", amount: "$1,800", status: "Paid", date: "Jun 1, 2025" },
            { tenant: "Emily Rodriguez", property: "Garden Court #23", amount: "$2,200", status: "Pending", date: "Due Jun 5, 2025" },
            { tenant: "David Kim", property: "Parkside #15", amount: "$1,950", status: "Paid", date: "Jun 2, 2025" },
          ].map((payment, i) => (
            <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center">
                  <span className="text-sm font-bold text-white">{payment.tenant[0]}</span>
                </div>
                <div>
                  <p className="font-semibold text-foreground">{payment.tenant}</p>
                  <p className="text-sm text-muted-foreground">{payment.property}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-foreground">{payment.amount}</p>
                <p className="text-sm text-muted-foreground">{payment.date}</p>
              </div>
              <div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  payment.status === "Paid" 
                    ? "bg-accent/10 text-accent" 
                    : "bg-warning/10 text-warning"
                }`}>
                  {payment.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;
