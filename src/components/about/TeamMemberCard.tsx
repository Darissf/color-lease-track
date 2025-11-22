import { useState } from "react";
import { motion } from "framer-motion";
import { Linkedin, Mail } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TeamMemberCardProps {
  name: string;
  position: string;
  bio: string;
  fullBio?: string;
  image?: string;
  linkedin?: string;
  email?: string;
}

export const TeamMemberCard = ({
  name,
  position,
  bio,
  fullBio,
  image,
  linkedin,
  email,
}: TeamMemberCardProps) => {
  const [isFlipped, setIsFlipped] = useState(false);
  
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className="relative h-96 cursor-pointer"
      onMouseEnter={() => setIsFlipped(true)}
      onMouseLeave={() => setIsFlipped(false)}
    >
      <motion.div
        className="w-full h-full"
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: "spring" }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Front of card */}
        <div
          className="absolute inset-0 bg-card border border-border rounded-xl shadow-lg p-6 flex flex-col items-center justify-center"
          style={{ backfaceVisibility: "hidden" }}
        >
          <Avatar className="w-32 h-32 mb-4 border-4 border-sky-blue/20">
            <AvatarImage src={image} alt={name} />
            <AvatarFallback className="bg-gradient-to-br from-sky-blue to-cyan text-white text-2xl">
              {initials}
            </AvatarFallback>
          </Avatar>
          <h3 className="text-2xl font-bold text-foreground mb-1">{name}</h3>
          <p className="text-sky-blue font-medium mb-3">{position}</p>
          <p className="text-muted-foreground text-center">{bio}</p>
        </div>

        {/* Back of card */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-sky-blue to-cyan rounded-xl shadow-lg p-6 flex flex-col justify-between text-white"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <div>
            <h3 className="text-xl font-bold mb-2">{name}</h3>
            <p className="text-white/90 text-sm mb-4">{position}</p>
            <p className="text-white/80 text-sm leading-relaxed">
              {fullBio || bio}
            </p>
          </div>
          
          <div className="flex gap-3 pt-4 border-t border-white/20">
            {linkedin && (
              <a
                href={linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm hover:text-white/80 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Linkedin className="w-4 h-4" />
                LinkedIn
              </a>
            )}
            {email && (
              <a
                href={`mailto:${email}`}
                className="flex items-center gap-2 text-sm hover:text-white/80 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Mail className="w-4 h-4" />
                Email
              </a>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
