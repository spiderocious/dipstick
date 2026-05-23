import { useState, type ChangeEvent } from 'react';

import { NAV_GROUPS, NAV_ITEMS, type NavGroup, type NavItem } from '../../shared/nav-items.ts';

interface PreviewSidebarProps {
  readonly activeId: string;
  readonly onSelect: (id: string) => void;
}

export function PreviewSidebar({ activeId, onSelect }: PreviewSidebarProps) {
  const [search, setSearch] = useState('');

  const filtered = NAV_ITEMS.filter((item) =>
    item.label.toLowerCase().includes(search.toLowerCase()),
  );

  function handleSearchChange(e: ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
  }

  return (
    <aside
      style={{ borderRight: '1px solid var(--sheet-edge)', background: 'var(--paper)' }}
      className="flex flex-col h-full overflow-hidden"
    >
      <div className="px-7 pt-8 flex-shrink-0">
        <h1
          className="font-serif font-medium leading-none"
          style={{ fontSize: '26px', letterSpacing: '-0.02em', color: 'var(--ink)' }}
        >
          Dipstick
        </h1>
        <p className="mt-2 text-[11px] font-sans" style={{ color: 'var(--ink-3)' }}>
          Design System
        </p>
        <div className="mt-5 pb-4" style={{ borderTop: '1px solid var(--hair)', paddingTop: '16px' }}>
          <input
            type="text"
            placeholder="Search…"
            value={search}
            onChange={handleSearchChange}
            className="w-full bg-transparent border-0 font-sans text-[13px] outline-none pb-1"
            style={{ borderBottom: '1px solid var(--ink-3)', color: 'var(--ink)' }}
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-7 pb-8">
        {NAV_GROUPS.map((group) => {
          const items = filtered.filter((item) => item.group === group);
          if (items.length === 0) return null;
          return (
            <GroupSection
              key={group}
              group={group}
              items={items}
              activeId={activeId}
              onSelect={onSelect}
            />
          );
        })}
      </nav>
    </aside>
  );
}

interface GroupSectionProps {
  readonly group: NavGroup;
  readonly items: readonly NavItem[];
  readonly activeId: string;
  readonly onSelect: (id: string) => void;
}

function GroupSection({ group, items, activeId, onSelect }: GroupSectionProps) {
  return (
    <div className="mt-[22px] first:mt-2">
      <div
        className="flex items-baseline gap-2 pb-2"
        style={{ borderBottom: '1px solid var(--hair)' }}
      >
        <span
          className="font-sans font-semibold uppercase"
          style={{ fontSize: '10px', color: 'var(--ink-3)', letterSpacing: '0.18em' }}
        >
          {group}
        </span>
      </div>
      <ul className="mt-1 list-none p-0 m-0">
        {items.map((item) => (
          <NavItemRow
            key={item.id}
            item={item}
            active={activeId === item.id}
            onSelect={onSelect}
          />
        ))}
      </ul>
    </div>
  );
}

interface NavItemRowProps {
  readonly item: NavItem;
  readonly active: boolean;
  readonly onSelect: (id: string) => void;
}

function NavItemRow({ item, active, onSelect }: NavItemRowProps) {
  function handleClick() {
    onSelect(item.id);
  }

  return (
    <li>
      <button
        onClick={handleClick}
        className="flex items-baseline gap-[10px] w-full text-left py-[5px] font-sans text-[13px] leading-[1.45] bg-transparent border-0 cursor-pointer"
        style={{ color: active ? 'var(--ink)' : 'var(--ink-2)', fontWeight: active ? 600 : 400 }}
      >
        <span
          className="flex-shrink-0 rounded-full"
          style={{
            width: '5px',
            height: '5px',
            background: active ? 'var(--emerald)' : 'transparent',
            border: active ? '1px solid var(--emerald)' : '1px solid var(--ink-3)',
            transform: 'translateY(-3px)',
          }}
        />
        {item.label}
      </button>
    </li>
  );
}
