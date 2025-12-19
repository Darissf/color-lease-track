import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ServiceCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  features: string[];
  price?: string;
}

export const ServiceCard = ({ icon: Icon, title, description, features, price }: ServiceCardProps) => {
  return (
    <Card className="group border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 bg-white overflow-hidden h-full">
      <CardContent className="p-6 flex flex-col h-full">
        {/* Icon */}
        <div className="w-14 h-14 rounded-xl bg-amber-100 flex items-center justify-center mb-4">
          <Icon className="w-7 h-7 text-amber-600" />
        </div>

        {/* Title & Description */}
        <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
        <p className="text-slate-600 text-sm mb-4">{description}</p>

        {/* Features List */}
        <ul className="space-y-2 mb-6 flex-grow">
          {features.map((feature, idx) => (
            <li key={idx} className="flex items-center gap-2 text-sm text-slate-600">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
              {feature}
            </li>
          ))}
        </ul>

        {/* Price & CTA */}
        <div className="mt-auto pt-4 border-t border-slate-100">
          {price && (
            <p className="text-lg font-bold text-slate-800 mb-3">
              {price === "GRATIS" ? (
                <span className="text-emerald-600">{price}</span>
              ) : price === "Hubungi kami" ? (
                <span className="text-slate-600 text-base font-medium">{price}</span>
              ) : (
                <>
                  Mulai dari <span className="text-amber-600">{price}</span>
                </>
              )}
            </p>
          )}
          <Button 
            className="w-full bg-slate-800 hover:bg-slate-900 text-white"
            onClick={() => window.open("https://wa.me/6289666666632?text=Halo!%20Saya%20tertarik%20dengan%20layanan%20" + encodeURIComponent(title), "_blank")}
          >
            Minta Penawaran
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};