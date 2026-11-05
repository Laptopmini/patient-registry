import type { ReactNode } from 'react';
import { Tab, TabList, TabPanel, Tabs } from 'react-aria-components';
import styles from './LinkTabs.module.css';

export interface TabItem {
  id: string;
  label: ReactNode;
  href: string;
}

interface LinkTabsProps {
  label: string;
  tabs: readonly TabItem[];
  selectedKey: string;
  children: ReactNode;
}

/** Tabs where each tab is its own route (`href`); the panel holds the active child route. */
export function LinkTabs({ label, tabs, selectedKey, children }: LinkTabsProps) {
  return (
    <Tabs selectedKey={selectedKey}>
      <TabList aria-label={label} className={styles.list}>
        {tabs.map((tab) => (
          <Tab key={tab.id} id={tab.id} href={tab.href} className={styles.tab}>
            {tab.label}
          </Tab>
        ))}
      </TabList>
      <TabPanel id={selectedKey} className={styles.panel}>
        {children}
      </TabPanel>
    </Tabs>
  );
}
