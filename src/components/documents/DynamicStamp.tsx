import { cn } from "@/lib/utils";

interface DynamicStampProps {
  status: 'LUNAS' | 'BELUM_LUNAS';
  documentNumber: string;
  companyName: string;
  date: string;
  className?: string;
}

export const DynamicStamp = ({
  status,
  documentNumber,
  companyName,
  date,
  className,
}: DynamicStampProps) => {
  const isLunas = status === 'LUNAS';
  
  return (
    <div
      className={cn(
        "relative w-32 h-32 flex flex-col items-center justify-center p-2 rounded-lg border-4 transform rotate-[-8deg]",
        isLunas 
          ? "border-emerald-600 text-emerald-600" 
          : "border-orange-600 text-orange-600",
        className
      )}
      style={{
        fontFamily: "'Courier New', Courier, monospace",
      }}
    >
      {/* Outer border effect */}
      <div 
        className={cn(
          "absolute inset-1 rounded-md border-2",
          isLunas ? "border-emerald-600" : "border-orange-600"
        )}
      />
      
      {/* Status */}
      <div className="text-sm font-bold tracking-wide flex items-center gap-1">
        {isLunas ? '✓' : '⏳'} {status.replace('_', ' ')}
      </div>
      
      {/* Document Number */}
      <div className="text-xs font-semibold mt-1 text-center leading-tight">
        {documentNumber}
      </div>
      
      {/* Company Name */}
      <div className="text-[8px] font-medium mt-1 text-center leading-tight uppercase max-w-full overflow-hidden">
        {companyName.length > 20 ? companyName.substring(0, 20) + '...' : companyName}
      </div>
      
      {/* Date */}
      <div className="text-[9px] font-medium mt-1">
        {date}
      </div>
    </div>
  );
};
