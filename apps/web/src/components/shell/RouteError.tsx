import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { type ErrorComponentProps, useRouter } from '@tanstack/react-router';
import { isApiError, isNetworkError } from '../../api/http';
import { Button } from '../ui/Button';
import { NotFoundPage } from './NotFoundPage';
import styles from './Page.module.css';

/** Every route's errorComponent: plain language, plus Retry that resets queries and reloads the route. */
export function RouteError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  const queryReset = useQueryErrorResetBoundary();

  if (isApiError(error) && error.status === 404) return <NotFoundPage />;

  const message = isNetworkError(error)
    ? "We couldn't reach the server. Check your connection and try again."
    : 'Something went wrong while loading this page. Your data is safe.';

  const retry = () => {
    queryReset.reset();
    reset();
    void router.invalidate();
  };

  return (
    <section aria-labelledby="route-error-title">
      <h1 id="route-error-title" tabIndex={-1}>
        We couldn't load this page
      </h1>
      <p role="alert">{message}</p>
      <div className={styles.actions}>
        <Button variant="primary" onPress={retry}>
          Retry
        </Button>
      </div>
    </section>
  );
}
