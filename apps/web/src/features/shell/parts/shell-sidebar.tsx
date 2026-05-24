import { ROUTES } from '@dipstick/core';
import { Link, useLocation } from 'react-router-dom';

import { cn } from '@dipstick/ui';
import { IconBack, IconClose } from '@icons';

import { useAuth } from '@shared/auth';

import { NAV_GROUPS, NAV_ITEMS, type NavGroup, type NavItem } from '../shell.nav.ts';

interface ShellSidebarProps {
  readonly branchId: string;
  readonly branchName: string;
  /** Mobile drawer open state. */
  readonly open: boolean;
  readonly onClose: () => void;
}

export function ShellSidebar({ branchId, branchName, open, onClose }: ShellSidebarProps) {
  const { can } = useAuth();
  const { pathname } = useLocation();

  const visible = NAV_ITEMS.filter(
    (item) => item.permission === undefined || can(item.permission),
  );

  const inner = (showClose: boolean) => (
    <div className="flex h-full flex-col">
      <div className="flex items-start px-5 pt-6">
        <div className="min-w-0">
          <Link
            to={ROUTES.BRANCHES}
            className="inline-flex items-center gap-1.5 font-sans text-[12px] text-ink-tertiary hover:text-ink"
          >
            <IconBack size={14} aria-hidden="true" />
            All branches
          </Link>
          <p className="mt-3 font-serif text-[18px] font-semibold leading-tight tracking-[-0.015em] text-ink">
            {branchName !== '' ? branchName : 'Branch'}
          </p>
        </div>
        {showClose && (
          <button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="ml-auto -mr-1 p-1 text-ink-tertiary hover:text-ink lg:hidden"
          >
            <IconClose size={18} aria-hidden="true" />
          </button>
        )}
      </div>

      <nav className="mt-5 flex-1 overflow-y-auto px-3 pb-8">
        {NAV_GROUPS.map((group) => {
          const items = visible.filter((i) => i.group === group);
          if (items.length === 0) return null;
          return (
            <NavGroupSection key={group} group={group} items={items} branchId={branchId} pathname={pathname} />
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      {/* Desktop: static column */}
      <aside className="hidden h-screen w-[240px] flex-shrink-0 flex-col border-r border-sheet-edge bg-paper lg:flex">
        {inner(false)}
      </aside>

      {/* Mobile: scrim + slide-in drawer */}
      <div
        className={cn(
          'fixed inset-0 z-[1200] bg-ink/30 transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        aria-hidden="true"
        onClick={onClose}
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-[1300] flex w-[260px] max-w-[82%] flex-col border-r border-sheet-edge bg-paper transition-transform lg:hidden',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-hidden={!open}
      >
        {inner(true)}
      </aside>
    </>
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
