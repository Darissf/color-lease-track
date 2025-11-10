import bcaLogo from "@/assets/banks/bca-logo.png";
import mandiriLogo from "@/assets/banks/mandiri-logo.png";
import briLogo from "@/assets/banks/bri-logo.png";
import bniLogo from "@/assets/banks/bni-logo.png";

interface BankLogoProps {
  bankName: string;
  size?: "sm" | "md" | "lg";
}

const BankLogo = ({ bankName, size = "md" }: BankLogoProps) => {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  // Get bank logo
  const getBankLogo = (name: string) => {
    const upperName = name.toUpperCase();
    
    if (upperName.includes("BCA")) {
      return { logo: bcaLogo, alt: "BCA" };
    } else if (upperName.includes("MANDIRI")) {
      return { logo: mandiriLogo, alt: "Mandiri" };
    } else if (upperName.includes("BRI")) {
      return { logo: briLogo, alt: "BRI" };
    } else if (upperName.includes("BNI")) {
      return { logo: bniLogo, alt: "BNI" };
    } else {
      // Fallback untuk bank lain
      return null;
    }
  };

  const bankData = getBankLogo(bankName);

  if (bankData) {
    return (
      <img 
        src={bankData.logo} 
        alt={bankData.alt}
        className={`${sizeClasses[size]} object-contain flex-shrink-0`}
      />
    );
  }

  // Fallback untuk bank yang tidak punya logo
  const getBankInitial = (name: string) => {
    const upperName = name.toUpperCase();
    
    if (upperName.includes("CIMB")) {
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

  const style = getBankInitial(bankName);

  return (
    <div className={`${sizeClasses[size]} rounded-full ${style.bg} flex items-center justify-center flex-shrink-0`}>
      <span className="text-white font-bold text-xs">{style.text}</span>
    </div>
  );
};

export default BankLogo;
