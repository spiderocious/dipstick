import { ROUTES } from '@dipstick/core';
import { Link, useLocation } from 'react-router-dom';

import { cn } from '@dipstick/ui';

import { useAuth } from '@shared/auth';

import { NAV_GROUPS, NAV_ITEMS, type NavGroup, type NavItem } from '../shell.nav.ts';

interface ShellSidebarProps {
  readonly branchId: string;
}

export function ShellSidebar({ branchId }: ShellSidebarProps) {
  const { can } = useAuth();
  const { pathname } = useLocation();

  const visible = NAV_ITEMS.filter((item) => {
    if (item.permission !== undefined && !can(item.permission)) return false;
    // Branch-scoped items need a branch to point at.
    if (item.scope === 'branch' && branchId === '') return false;
    return true;
  });

  return (
    <aside className="flex h-screen w-[240px] flex-shrink-0 flex-col border-r border-sheet-edge bg-paper">
      <div className="px-6 pt-7">
        <Link to={ROUTES.DASHBOARD} className="font-serif text-[22px] font-semibold tracking-[-0.02em] text-ink">
          Dipstick<span className="text-emerald">.</span>
        </Link>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-tertiary">
          Station logbook
        </p>
      </div>

      <nav className="mt-6 flex-1 overflow-y-auto px-3 pb-8">
        {NAV_GROUPS.map((group) => {
          const items = visible.filter((i) => i.group === group);
          if (items.length === 0) return null;
          return (
            <NavGroupSection key={group} group={group} items={items} branchId={branchId} pathname={pathname} />
          );
        })}
      </nav>
    </aside>
  );
}

interface NavGroupSectionProps {
  readonly group: NavGroup;
  readonly items: readonly NavItem[];
  readonly branchId: string;
  readonly pathname: string;
}

function NavGroupSection({ group, items, branchId, pathname }: NavGroupSectionProps) {
  return (
    <div className="mb-5">
      <div className="px-3 pb-2 font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-tertiary">
        {group}
      </div>
      <ul className="m-0 list-none p-0">
        {items.map((item) => {
          const to = item.to(branchId);
          const active = pathname === to || pathname.startsWith(`${to}/`);
          const Icon = item.icon;
          return (
            <li key={item.id}>
              <Link
                to={to}
                className={cn(
                  'flex items-center gap-2.5 rounded-[3px] px-3 py-2 font-sans text-[13px] transition-colors',
                  active ? 'bg-recessed font-medium text-ink' : 'text-ink-secondary hover:bg-recessed/60 hover:text-ink',
                )}
              >
                <Icon size={16} className={active ? 'text-emerald' : 'text-ink-tertiary'} aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
