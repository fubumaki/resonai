export interface NavigationItem {
  href: string;
  label: string;
  icon?: string;
  showInHeader?: boolean;
  showInBottomNav?: boolean;
  headerOrder?: number;
  bottomNavOrder?: number;
}

export const navigationItems: NavigationItem[] = [
  {
    href: "/",
    label: "Home",
    icon: "🏠",
    showInBottomNav: true,
    bottomNavOrder: 1,
  },
  {
    href: "/listen",
    label: "Listen",
    icon: "👂",
    showInHeader: true,
    showInBottomNav: true,
    headerOrder: 1,
    bottomNavOrder: 3,
  },
  {
    href: "/practice",
    label: "Practice",
    icon: "🎤",
    showInHeader: true,
    showInBottomNav: true,
    headerOrder: 2,
    bottomNavOrder: 2,
  },
  {
    href: "/about",
    label: "About",
    icon: "ℹ️",
    showInHeader: true,
    showInBottomNav: true,
    headerOrder: 3,
    bottomNavOrder: 4,
  },
];
