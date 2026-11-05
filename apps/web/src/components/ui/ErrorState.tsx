import { Banner } from './Banner';
import { Button } from './Button';

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

/** Inline, plain-language error with a Retry action. The rest of the page stays usable. */
export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <Banner
      tone="error"
      role="alert"
      action={
        <Button variant="primary" onPress={onRetry}>
          Retry
        </Button>
      }
    >
      {message}
    </Banner>
  );
}
