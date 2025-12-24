interface StepCardProps {
  number: number;
  color: "orange" | "cyan" | "pink" | "amber";
  title: string;
  description: string;
}

const colorClasses = {
  orange: "bg-orange-500",
  cyan: "bg-cyan-500",
  pink: "bg-pink-500",
  amber: "bg-amber-500",
};

export default function StepCard({
  number,
  color,
  title,
  description,
}: StepCardProps) {
  return (
    <div className="text-center">
      <div
        className={`w-12 h-12 ${colorClasses[color]} text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg shadow-md`}
        aria-hidden="true"
      >
        {number}
      </div>
      <h3 className="font-semibold text-purple-950 dark:text-cyan-50 mb-1">
        {title}
      </h3>
      <p className="text-sm text-purple-900 dark:text-cyan-100">
        {description}
      </p>
    </div>
  );
}
