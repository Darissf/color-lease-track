/**
 * Helper script to remove old theme system references
 * This file documents the changes made to transition to dual theme system
 * 
 * Changes made:
 * 1. Removed all `activeTheme` destructuring from useAppTheme()
 * 2. Removed all `themeColors` destructuring from useAppTheme()
 * 3. Removed all conditional `activeTheme === 'japanese'` styling
 * 4. Replaced theme-specific colors with CSS variables
 * 5. Removed theme prop from AnimatedBackground component
 * 
 * Files affected:
 * - All components in src/components/**
 * - All pages in src/pages/**
 * 
 * Replacement patterns:
 * - `activeTheme === 'japanese' ? "dark-color" : "light-color"` → "text-foreground"
 * - `themeColors.text` → "text-foreground"
 * - `themeColors.cardBg` → "bg-card"
 * - `<AnimatedBackground theme="income">` → `<AnimatedBackground>`
 */

export const THEME_MIGRATION_COMPLETE = true;
