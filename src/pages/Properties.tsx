import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, BedDouble, Bath, Home, Plus } from "lucide-react";
import { formatRupiah } from "@/lib/currency";
import { useAppTheme } from "@/contexts/AppThemeContext";
import { cn } from "@/lib/utils";

const properties = [
  {
    id: 1,
    name: "Sunset Villa #12",
    address: "456 Ocean Drive, Miami Beach, FL 33139",
    type: "Apartment",
    bedrooms: 2,
    bathrooms: 2,
    rent: 7500000,
    status: "Dihuni",
    tenant: "Sarah Johnson",
    image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=600&fit=crop"
  },
  {
    id: 2,
    name: "Harbor View #7",
    address: "789 Bayfront Ave, San Diego, CA 92101",
    type: "Condo",
    bedrooms: 1,
    bathrooms: 1,
    rent: 5400000,
    status: "Dihuni",
    tenant: "Michael Chen",
    image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop"
  },
  {
    id: 3,
    name: "Garden Court #23",
    address: "123 Park Lane, Austin, TX 78701",
    type: "Apartment",
    bedrooms: 3,
    bathrooms: 2,
    rent: 6500000,
    status: "Dihuni",
    tenant: "Emily Rodriguez",
    image: "https://images.unsplash.com/photo-1502672260066-6bc2a9ee6e06?w=800&h=600&fit=crop"
  },
  {
    id: 4,
    name: "Downtown Loft #5",
    address: "321 Main St, Seattle, WA 98101",
    type: "Loft",
    bedrooms: 2,
    bathrooms: 1,
    rent: 8000000,
    status: "Kosong",
    tenant: null,
    image: "https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800&h=600&fit=crop"
  },
  {
    id: 5,
    name: "Riverside Studio #18",
    address: "567 River Rd, Portland, OR 97204",
    type: "Studio",
    bedrooms: 1,
    bathrooms: 1,
    rent: 4500000,
    status: "Maintenance",
    tenant: null,
    image: "https://images.unsplash.com/photo-1515263487990-61b07816b324?w=800&h=600&fit=crop"
  },
  {
    id: 6,
    name: "Parkside #15",
    address: "890 Green St, Denver, CO 80202",
    type: "Apartment",
    bedrooms: 2,
    bathrooms: 2,
    rent: 5800000,
    status: "Dihuni",
    tenant: "David Kim",
    image: "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800&h=600&fit=crop"
  },
];

const Properties = () => {
  const { activeTheme } = useAppTheme();
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Dihuni":
        return "bg-accent/10 text-accent border-accent/20";
      case "Kosong":
        return "bg-secondary/10 text-secondary border-secondary/20";
      case "Maintenance":
        return "bg-warning/10 text-warning border-warning/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Properties
          </h1>
          <p className="text-muted-foreground">Kelola dan lacak semua properti sewaan Anda</p>
        </div>
        <Button className={cn(
          activeTheme === 'japanese' ? 'gradient-primary text-white border-0' : '',
          "shadow-lg hover:shadow-xl transition-all"
        )}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Properti
        </Button>
      </div>

      {/* Properties Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {properties.map((property) => (
          <Card key={property.id} className={cn(
            "overflow-hidden shadow-md card-hover",
            activeTheme === 'japanese' ? 'gradient-card border-0' : ''
          )}>
            <div className="relative h-48 overflow-hidden">
              <img 
                src={property.image} 
                alt={property.name}
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
              />
              <Badge className={`absolute top-4 right-4 ${getStatusColor(property.status)} border`}>
                {property.status}
              </Badge>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold text-foreground mb-2">{property.name}</h3>
              <div className="flex items-start gap-2 mb-4">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">{property.address}</p>
              </div>
              
              <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Home className="h-4 w-4" />
                  <span>{property.type}</span>
                </div>
                <div className="flex items-center gap-1">
                  <BedDouble className="h-4 w-4" />
                  <span>{property.bedrooms}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Bath className="h-4 w-4" />
                  <span>{property.bathrooms}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div>
                  <p className="text-sm text-muted-foreground">Sewa Bulanan</p>
                  <p className="text-2xl font-bold text-primary">{formatRupiah(property.rent)}</p>
                </div>
                {property.tenant && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Penyewa</p>
                    <p className="text-sm font-semibold text-foreground">{property.tenant}</p>
                  </div>
                )}
              </div>

              <Button variant="outline" className="w-full mt-4 border-primary/20 text-primary hover:bg-primary/10">
                Lihat Detail
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Properties;
