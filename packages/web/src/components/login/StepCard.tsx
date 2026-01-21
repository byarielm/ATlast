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
        className={`size-12 ${colorClasses[color]} mx-auto mb-3 flex items-center justify-center rounded-full text-lg font-bold text-white shadow-md`}
        aria-hidden="true"
      >
        {number}
      </div>
      <h3 className="mb-1 font-semibold text-purple-950 dark:text-cyan-50">
        {title}
      </h3>
      <p className="text-sm text-purple-900 dark:text-cyan-100">
        {description}
      </p>
    </div>
  );
}
