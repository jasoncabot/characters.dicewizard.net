import type { Ability } from "../../types/character";

export type AbilityMethod = "standard" | "pointbuy" | "roll";

export type AbilityScores = Record<Ability, number>;
