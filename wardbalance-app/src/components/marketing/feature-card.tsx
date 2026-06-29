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
      className="border border-neutral-200/60 rounded-2xl p-6 flex flex-col h-full bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-primary-200/60"
    >
      <div className="flex flex-col h-full">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 bg-primary-container text-primary"
        >
          <Icon size={24} />
        </div>
        <h3 className="text-title-medium mb-2.5 text-neutral-900 font-bold">
          {title}
        </h3>
        <p className="text-body-medium flex-1 text-neutral-600 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}

