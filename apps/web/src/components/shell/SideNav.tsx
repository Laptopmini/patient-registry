import { Link } from '@tanstack/react-router';
import styles from './Shell.module.css';

/** The primary navigation. Shown in the sidebar, or inside the drawer on compact screens. */
export function SideNav() {
  return (
    <nav aria-label="Main">
      <ul className={styles.navList}>
        <li>
          <Link to="/" activeOptions={{ exact: true }} className={styles.navLink}>
            Dashboard
          </Link>
        </li>
        <li>
          <Link to="/patients" className={styles.navLink}>
            Patients
          </Link>
        </li>
      </ul>
    </nav>
  );
}
