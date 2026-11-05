import { Ellipsis } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button, Menu, MenuItem, MenuTrigger, Popover } from 'react-aria-components';
import menuStyles from './ActionMenu.module.css';
import styles from './ListPopover.module.css';

export interface ActionMenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  /** Set to navigate (a link item); otherwise `onAction` runs. */
  href?: string;
  danger?: boolean;
  /** Greyed out; `hint` says why (for example "Not available offline"). */
  disabled?: boolean;
  hint?: string;
}

interface ActionMenuProps {
  /** Accessible name of the trigger, for example "More actions for Martinez, Deborah". */
  label: string;
  items: readonly ActionMenuItem[];
  onAction: (id: string) => void;
}

/** A quiet "⋯" button that opens a menu: row actions in the patient table. */
export function ActionMenu({ label, items, onAction }: ActionMenuProps) {
  return (
    <MenuTrigger>
      <Button aria-label={label} className={menuStyles.trigger}>
        <Ellipsis />
      </Button>
      <Popover className={styles.popover} placement="bottom end">
        <Menu className={styles.listbox} onAction={(key) => onAction(String(key))}>
          {items.map((item) => (
            <MenuItem
              key={item.id}
              id={item.id}
              textValue={item.label}
              className={styles.option}
              {...(item.href ? { href: item.href } : {})}
              {...(item.danger ? { 'data-danger': true } : {})}
              {...(item.disabled ? { isDisabled: true } : {})}
            >
              {item.icon}
              {item.label}
              {item.disabled && item.hint && <span className={menuStyles.hint}>{item.hint}</span>}
            </MenuItem>
          ))}
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}
