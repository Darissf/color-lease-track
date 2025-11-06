import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const monthlyData = [
  { month: "Jan", income: 45000, expenses: 32000, profit: 13000 },
  { month: "Feb", income: 52000, expenses: 28000, profit: 24000 },
  { month: "Mar", income: 48000, expenses: 35000, profit: 13000 },
  { month: "Apr", income: 61000, expenses: 31000, profit: 30000 },
  { month: "May", income: 55000, expenses: 29000, profit: 26000 },
  { month: "Jun", income: 67000, expenses: 33000, profit: 34000 },
];

const transactions = [
  { id: 1, type: "Income", description: "Rent - Sunset Villa #12", amount: "$2,500", date: "Jun 1, 2025", category: "Rent" },
  { id: 2, type: "Expense", description: "Maintenance - Harbor View #7", amount: "$450", date: "Jun 2, 2025", category: "Maintenance" },
  { id: 3, type: "Income", description: "Rent - Garden Court #23", amount: "$2,200", date: "Jun 1, 2025", category: "Rent" },
  { id: 4, type: "Expense", description: "Insurance Payment", amount: "$1,200", date: "Jun 3, 2025", category: "Insurance" },
  { id: 5, type: "Income", description: "Rent - Parkside #15", amount: "$1,950", date: "Jun 2, 2025", category: "Rent" },
  { id: 6, type: "Expense", description: "Property Tax", amount: "$3,500", date: "Jun 5, 2025", category: "Tax" },
];

const Finances = () => {
  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent mb-2">
            Financial Overview
          </h1>
          <p className="text-muted-foreground">Track your income, expenses, and profitability</p>
        </div>
        <Button className="gradient-primary text-white border-0 shadow-lg hover:shadow-xl transition-all">
          <DollarSign className="mr-2 h-4 w-4" />
          Add Transaction
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card className="p-6 gradient-card border-0 shadow-md card-hover">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Income</p>
              <p className="text-3xl font-bold text-foreground mt-2">$67,000</p>
            </div>
            <div className="h-12 w-12 rounded-xl gradient-success flex items-center justify-center shadow-lg">
              <ArrowUpRight className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4 text-accent" />
            <span className="text-sm font-semibold text-accent">+15.3%</span>
            <span className="text-xs text-muted-foreground">vs last month</span>
          </div>
        </Card>

        <Card className="p-6 gradient-card border-0 shadow-md card-hover">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
              <p className="text-3xl font-bold text-foreground mt-2">$33,000</p>
            </div>
            <div className="h-12 w-12 rounded-xl gradient-secondary flex items-center justify-center shadow-lg">
              <ArrowDownRight className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4 text-secondary" />
            <span className="text-sm font-semibold text-secondary">+6.2%</span>
            <span className="text-xs text-muted-foreground">vs last month</span>
          </div>
        </Card>

        <Card className="p-6 gradient-card border-0 shadow-md card-hover">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Net Profit</p>
              <p className="text-3xl font-bold text-foreground mt-2">$34,000</p>
            </div>
            <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4 text-accent" />
            <span className="text-sm font-semibold text-accent">+30.8%</span>
            <span className="text-xs text-muted-foreground">vs last month</span>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        <Card className="p-6 gradient-card border-0 shadow-md">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Income vs Expenses</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="expensesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
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
              <Legend />
              <Area type="monotone" dataKey="income" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#incomeGradient)" />
              <Area type="monotone" dataKey="expenses" stroke="hsl(var(--secondary))" fillOpacity={1} fill="url(#expensesGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 gradient-card border-0 shadow-md">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Profit Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
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
              <Line 
                type="monotone" 
                dataKey="profit" 
                stroke="hsl(var(--accent))" 
                strokeWidth={3}
                dot={{ fill: "hsl(var(--accent))", strokeWidth: 2, r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="p-6 gradient-card border-0 shadow-md">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Recent Transactions</h3>
        <div className="space-y-3">
          {transactions.map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <div className="flex items-center gap-4">
                <div className={`h-10 w-10 rounded-full ${
                  transaction.type === "Income" ? "gradient-success" : "gradient-secondary"
                } flex items-center justify-center shadow-md`}>
                  {transaction.type === "Income" ? (
                    <ArrowUpRight className="h-5 w-5 text-white" />
                  ) : (
                    <ArrowDownRight className="h-5 w-5 text-white" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{transaction.description}</p>
                  <p className="text-sm text-muted-foreground">{transaction.category} • {transaction.date}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-lg font-bold ${
                  transaction.type === "Income" ? "text-accent" : "text-secondary"
                }`}>
                  {transaction.type === "Income" ? "+" : "-"}{transaction.amount}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default Finances;
