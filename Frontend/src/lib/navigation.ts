export function isHardReloadNavigation(locationKey?: string): boolean {
  if (locationKey && locationKey !== "default") {
    return false;
  }

  if (typeof window === "undefined") {
    return false;
  }

  const navigationEntries = window.performance?.getEntriesByType?.("navigation") as Array<{ type?: string }> | undefined;
  const firstNavigationEntry = navigationEntries?.[0];
  if (firstNavigationEntry?.type) {
    return firstNavigationEntry.type === "reload";
  }

  const legacyNavigation = window.performance?.navigation as { type?: number } | undefined;
  return legacyNavigation?.type === 1;
}
