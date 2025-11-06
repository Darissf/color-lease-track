import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, Home, Calendar, Plus } from "lucide-react";

const tenants = [
  {
    id: 1,
    name: "Sarah Johnson",
    email: "sarah.j@email.com",
    phone: "(555) 123-4567",
    property: "Sunset Villa #12",
    rent: "$2,500",
    leaseStart: "Jan 1, 2025",
    leaseEnd: "Dec 31, 2025",
    status: "Active",
    paymentStatus: "Current"
  },
  {
    id: 2,
    name: "Michael Chen",
    email: "m.chen@email.com",
    phone: "(555) 234-5678",
    property: "Harbor View #7",
    rent: "$1,800",
    leaseStart: "Mar 15, 2025",
    leaseEnd: "Mar 14, 2026",
    status: "Active",
    paymentStatus: "Current"
  },
  {
    id: 3,
    name: "Emily Rodriguez",
    email: "emily.r@email.com",
    phone: "(555) 345-6789",
    property: "Garden Court #23",
    rent: "$2,200",
    leaseStart: "Feb 1, 2025",
    leaseEnd: "Jan 31, 2026",
    status: "Active",
    paymentStatus: "Pending"
  },
  {
    id: 4,
    name: "David Kim",
    email: "david.kim@email.com",
    phone: "(555) 456-7890",
    property: "Parkside #15",
    rent: "$1,950",
    leaseStart: "Apr 1, 2025",
    leaseEnd: "Mar 31, 2026",
    status: "Active",
    paymentStatus: "Current"
  },
];

const Tenants = () => {
  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent mb-2">
            Tenants
          </h1>
          <p className="text-muted-foreground">Manage tenant information and leases</p>
        </div>
        <Button className="gradient-primary text-white border-0 shadow-lg hover:shadow-xl transition-all">
          <Plus className="mr-2 h-4 w-4" />
          Add Tenant
        </Button>
      </div>

      {/* Tenants Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {tenants.map((tenant) => (
          <Card key={tenant.id} className="p-6 gradient-card border-0 shadow-md card-hover">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full gradient-primary flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                  {tenant.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">{tenant.name}</h3>
                  <Badge className={`mt-1 ${
                    tenant.paymentStatus === "Current"
                      ? "bg-accent/10 text-accent border-accent/20"
                      : "bg-warning/10 text-warning border-warning/20"
                  } border`}>
                    {tenant.paymentStatus}
                  </Badge>
                </div>
              </div>
              <Badge className="bg-primary/10 text-primary border-primary/20 border">
                {tenant.status}
              </Badge>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{tenant.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{tenant.phone}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Home className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{tenant.property}</span>
              </div>
            </div>

            <div className="border-t border-border pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Monthly Rent</span>
                <span className="text-lg font-bold text-primary">{tenant.rent}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Lease Period</span>
                <div className="flex items-center gap-1 text-sm font-medium text-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{tenant.leaseStart} - {tenant.leaseEnd}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button variant="outline" className="flex-1 border-primary/20 text-primary hover:bg-primary/10">
                View Details
              </Button>
              <Button variant="outline" className="flex-1 border-secondary/20 text-secondary hover:bg-secondary/10">
                Contact
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Tenants;
