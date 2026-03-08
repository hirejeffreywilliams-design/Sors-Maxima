import { CSSProperties } from "react";

/**
 * Returns a CSS box-shadow string representing the ambient glow for a given grade.
 * A+ = gold amber glow, A = green glow, B+ = teal glow, B = blue glow, C = yellow glow, D/F = dim red
 */
export function getGradeGlow(grade: string): string {
  const g = grade.toUpperCase();
  if (g === "A+") return "0 0 25px rgba(245, 158, 11, 0.45), 0 0 50px rgba(245, 158, 11, 0.25)";
  if (g.startsWith("A")) return "0 0 22px rgba(34, 197, 94, 0.4), 0 0 45px rgba(34, 197, 94, 0.2)";
  if (g === "B+") return "0 0 20px rgba(20, 184, 166, 0.35), 0 0 40px rgba(20, 184, 166, 0.15)";
  if (g.startsWith("B")) return "0 0 20px rgba(59, 130, 246, 0.35), 0 0 40px rgba(59, 130, 246, 0.15)";
  if (g.startsWith("C")) return "0 0 18px rgba(234, 179, 8, 0.3), 0 0 36px rgba(234, 179, 8, 0.1)";
  return "0 0 15px rgba(239, 68, 68, 0.2), 0 0 30px rgba(239, 68, 68, 0.1)";
}

/**
 * Returns an inline style object with the ambient glow for a given grade.
 */
export function gradeAmbientGlow(grade: string | undefined): CSSProperties {
  if (!grade) return {};
  return {
    boxShadow: getGradeGlow(grade),
  };
}

/**
 * Returns className for A+/A grade shimmer animation.
 */
export function getGradeShimmerClass(grade: string | undefined): string {
  if (!grade) return "";
  const g = grade.toUpperCase();
  if (g.startsWith("A")) return "animate-shimmer-border border-2";
  return "";
}
