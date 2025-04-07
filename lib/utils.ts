import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function readFileContent(filePath: string) {
  const response = await fetch(filePath);
  const text = await response.text();
  return text;
}


