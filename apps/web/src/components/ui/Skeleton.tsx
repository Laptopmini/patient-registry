import type { CSSProperties } from 'react';
import styles from './Skeleton.module.css';

interface SkeletonProps {
  /** CSS width, for example `40%` or `120px`. Defaults to the full width. */
  width?: string;
  /** CSS height; match the final text or control so nothing shifts when data arrives. */
  height?: string;
  pill?: boolean;
}

/** A decorative placeholder block. Wrap groups in `aria-busy` with a live region. */
export function Skeleton({ width, height, pill = false }: SkeletonProps) {
  const style: CSSProperties = { ...(width ? { width } : {}), ...(height ? { height } : {}) };
  return (
    <span
      className={`${styles.block} ${pill ? styles.pill : ''}`}
      style={style}
      aria-hidden="true"
    />
  );
}
