import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export default function FeatureCard({
  icon: Icon,
  title,
  description,
}: FeatureCardProps) {
  return (
    <div
      className="card-elevated p-6 flex flex-col h-full group relative overflow-hidden transition-all duration-500 bg-surface-container-lowest"
    >
      {/* Expandable Wave Circle Overlay - Sharp Brand Color */}
      <div
        className="absolute bottom-0 right-0 translate-x-[40%] translate-y-[40%] w-[320px] h-[320px] rounded-full transition-all duration-700 ease-out group-hover:scale-[2.8] pointer-events-none z-0 opacity-0 group-hover:opacity-100 bg-primary"
      />

      {/* Content wrapper with z-index to stay above background wave */}
      <div className="relative z-10 flex flex-col h-full pointer-events-none">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-110 card-icon-bg bg-primary-light group-hover:bg-white"
        >
          <Icon 
            size={24} 
            className="transition-colors duration-300 text-primary-600 group-hover:text-primary" 
          />
        </div>
        <h3
          className="text-title-medium mb-2.5 transition-colors duration-300 text-on-surface group-hover:text-white"
        >
          {title}
        </h3>
        <p
          className="text-body-medium flex-1 transition-colors duration-300 text-on-surface-variant group-hover:text-white/90"
        >
          {description}
        </p>
      </div>
    </div>
  );
}

