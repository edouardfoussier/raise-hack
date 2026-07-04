import {
  Boxes,
  CreditCard,
  Film,
  FolderGit2,
  LayoutDashboard,
  Palette,
  Radio,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** When true, only highlight on an exact path match (used for Overview). */
  exact?: boolean;
};

export const dashboardNav: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard, exact: true },
  { label: "Projects", href: "/dashboard/projects", icon: FolderGit2 },
  { label: "Videos", href: "/dashboard/videos", icon: Film },
  { label: "Assets", href: "/dashboard/assets", icon: Boxes },
  { label: "Channels", href: "/dashboard/channels", icon: Radio },
  { label: "Billing", href: "/dashboard/billing", icon: CreditCard },
  { label: "Design System", href: "/dashboard/design-system", icon: Palette },
];
