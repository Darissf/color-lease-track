import { Building2 } from "lucide-react";

interface BankLogoProps {
  bankName: string;
  size?: "sm" | "md" | "lg";
}

const BankLogo = ({ bankName, size = "md" }: BankLogoProps) => {
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
  };

  // Bank color schemes
  const getBankStyle = (name: string) => {
    const upperName = name.toUpperCase();
    
    if (upperName.includes("BCA")) {
      return { bg: "bg-blue-500", text: "BCA" };
    } else if (upperName.includes("MANDIRI")) {
      return { bg: "bg-yellow-500", text: "MDR" };
    } else if (upperName.includes("BRI")) {
      return { bg: "bg-blue-600", text: "BRI" };
    } else if (upperName.includes("BNI")) {
      return { bg: "bg-orange-500", text: "BNI" };
    } else if (upperName.includes("CIMB")) {
      return { bg: "bg-red-600", text: "CIMB" };
    } else if (upperName.includes("PERMATA")) {
      return { bg: "bg-green-600", text: "PMT" };
    } else if (upperName.includes("DANAMON")) {
      return { bg: "bg-blue-700", text: "DNM" };
    } else if (upperName.includes("BTN")) {
      return { bg: "bg-blue-800", text: "BTN" };
    } else if (upperName.includes("OCBC")) {
      return { bg: "bg-red-700", text: "OCBC" };
    } else if (upperName.includes("PANIN")) {
      return { bg: "bg-purple-600", text: "PNN" };
    } else {
      return { bg: "bg-gray-500", text: name.substring(0, 3).toUpperCase() };
    }
  };

  const style = getBankStyle(bankName);

  return (
    <div className={`${sizeClasses[size]} rounded-full ${style.bg} flex items-center justify-center flex-shrink-0`}>
      <span className="text-white font-bold">{style.text}</span>
    </div>
  );
};

export default BankLogo;
