// Centralised icon proxy. The rest of the codebase imports from `@icons`
// (mapped in each app's tsconfig/vite alias) so we can swap the icon source
// in one place — currently lucide-react.
export {
  Home as IconHome,
  ChevronLeft as IconBack,
  ChevronRight as IconForward,
  ChevronDown as IconChevronDown,
  User as IconUser,
  Users as IconStaff,
  Search as IconSearch,
  Settings as IconSettings,
  LogOut as IconLogout,
  Check as IconCheck,
  X as IconClose,
  AlertTriangle as IconAlert,
  Gauge as IconGauge, // dip / tank readout
  Fuel as IconFuel, // pumps / product
  Truck as IconTruck, // deliveries / tanker offloads
  ClipboardList as IconDaybook, // the day-book
  Receipt as IconExpense, // expenses
  TrendingUp as IconPrice, // pricing
  BarChart3 as IconChart, // charts / roll-up
  History as IconAudit, // audit log
  Building2 as IconBranch, // branches
  Bell as IconBell, // notifications
  Plus as IconPlus, // create / add
  Calendar as IconCalendar, // dates / roster
  Printer as IconPrint, // export / print
  Pencil as IconEdit, // edit a row
  ShieldCheck as IconRole, // roles & permissions
  ChevronUp as IconChevronUp,
  Menu as IconMenu, // mobile nav hamburger
} from 'lucide-react';

// The shared icon type, so feature code can type an icon prop without importing lucide-react.
export type { LucideIcon } from 'lucide-react';
