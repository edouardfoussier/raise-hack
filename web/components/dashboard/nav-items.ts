import {
  Boxes,
  Clapperboard,
  Film,
  FolderGit2,
  GitCompareArrows,
  LayoutDashboard,
  Palette,
  Radio,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** When true, only highlight on an exact path match (used for Overview). */
  exact?: boolean;
};

/**
 * Primary dashboard nav. Order per the product spine:
 * Overview → Design System → Diff Render → Demo → Assets → Channels, with the
 * secondary surfaces (Videos, Projects) and Settings grouped after. Billing
 * moved into Settings.
 */
export const dashboardNav: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard, exact: true },
  { label: "Design System", href: "/dashboard/design-system", icon: Palette },
  {
    label: "Diff Render",
    href: "/dashboard/diff-render",
    icon: GitCompareArrows,
  },
  { label: "Demo", href: "/dashboard/generate", icon: Clapperboard },
  { label: "Assets", href: "/dashboard/assets", icon: Boxes },
  { label: "Channels", href: "/dashboard/channels", icon: Radio },
  { label: "Videos", href: "/dashboard/videos", icon: Film },
  { label: "Projects", href: "/dashboard/projects", icon: FolderGit2 },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];
