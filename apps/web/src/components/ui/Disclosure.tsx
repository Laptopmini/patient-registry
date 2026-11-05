import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  Disclosure as AriaDisclosure,
  type DisclosureProps as AriaDisclosureProps,
  Button,
  DisclosurePanel,
  Heading,
} from 'react-aria-components';
import styles from './Disclosure.module.css';

interface DisclosureProps extends Omit<AriaDisclosureProps, 'className' | 'children'> {
  title: string;
  children: ReactNode;
}

/** A collapsed-by-default section, for example the tips under the wizard's progress bar. */
export function Disclosure({ title, children, ...props }: DisclosureProps) {
  return (
    <AriaDisclosure {...props} className={styles.root}>
      <Heading level={2} className={styles.heading}>
        <Button slot="trigger" className={styles.trigger}>
          {title}
          <ChevronDown className={styles.chevron} />
        </Button>
      </Heading>
      <DisclosurePanel>
        <div className={styles.content}>{children}</div>
      </DisclosurePanel>
    </AriaDisclosure>
  );
}
