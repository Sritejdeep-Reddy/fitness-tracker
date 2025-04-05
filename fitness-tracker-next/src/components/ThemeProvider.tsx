"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ThemeProviderProps } from "next-themes"; // Try importing directly

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  // attribute="class" enables Tailwind's dark: variant
  // defaultTheme="system" respects user's OS preference
  // enableSystem allows switching between light/dark/system
  // disableTransitionOnChange prevents flash on theme change
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}