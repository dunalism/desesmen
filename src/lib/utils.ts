import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatDuration = (sec: number) => {
  if (!sec) return "-";
  const mins = Math.floor(sec / 60000);
  const secs = Math.floor((sec % 60000) / 1000);
  return mins > 0 ? `${mins}m ${secs}d` : `${secs}d`;
};
