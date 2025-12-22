import {
  getTraitDescription,
  getCategoryColor,
  type TraitDescription,
} from "../../data/traitDescriptions";

interface TappableTraitProps {
  name: string;
  onTap: (trait: TraitDescription) => void;
  variant?: "default" | "skill" | "feat" | "saving-throw";
  className?: string;
}

export function TappableTrait({
  name,
  onTap,
  variant = "default",
  className = "",
}: TappableTraitProps) {
  const trait = getTraitDescription(name);

  // Get styling based on variant
  const getVariantStyles = () => {
    switch (variant) {
      case "skill":
        return "from-blue-600/20 to-cyan-600/20 text-blue-300 ring-blue-500/30";
      case "feat":
        return "from-amber-600/20 to-orange-600/20 text-amber-300 ring-amber-500/30";
      case "saving-throw":
        return "from-green-600/20 to-emerald-600/20 text-green-300 ring-green-500/30";
      default:
        if (trait) {
          const colors = getCategoryColor(trait.category);
          return `${colors.bg} ${colors.text} ring-1 ${colors.border}`;
        }
        return "from-purple-600/20 to-pink-600/20 text-purple-300 ring-purple-500/30";
    }
  };

  const handleClick = () => {
    if (trait) {
      onTap(trait);
    }
  };

  const hasTrait = !!trait;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!hasTrait}
      className={`group relative inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r px-3 py-1.5 text-sm font-medium ring-1 transition-all duration-200 ${getVariantStyles()} ${
        hasTrait
          ? "cursor-pointer hover:scale-105 hover:shadow-lg hover:shadow-purple-500/10 active:scale-100"
          : "cursor-default opacity-70"
      } ${className}`}
    >
      {name}
      {hasTrait && (
        <svg
          className="h-3.5 w-3.5 opacity-50 transition-opacity group-hover:opacity-100"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      )}
    </button>
  );
}

// Simple wrapper for non-interactive trait badges (when no description available)
interface TraitBadgeProps {
  name: string;
  variant?: "default" | "skill" | "feat" | "saving-throw";
  className?: string;
}

export function TraitBadge({
  name,
  variant = "default",
  className = "",
}: TraitBadgeProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case "skill":
        return "from-blue-600/20 to-cyan-600/20 text-blue-300 ring-blue-500/30";
      case "feat":
        return "from-amber-600/20 to-orange-600/20 text-amber-300 ring-amber-500/30";
      case "saving-throw":
        return "from-green-600/20 to-emerald-600/20 text-green-300 ring-green-500/30";
      default:
        return "from-purple-600/20 to-pink-600/20 text-purple-300 ring-purple-500/30";
    }
  };

  return (
    <span
      className={`inline-flex items-center rounded-full bg-gradient-to-r px-3 py-1.5 text-sm font-medium ring-1 ${getVariantStyles()} ${className}`}
    >
      {name}
    </span>
  );
}
