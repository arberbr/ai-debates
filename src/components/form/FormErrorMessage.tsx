/**
 * Reusable error message component for form fields
 */

interface FormErrorMessageProps {
  id: string;
  error?: string;
}

export function FormErrorMessage({ id, error }: FormErrorMessageProps) {
  if (!error) return null;

  return (
    <div
      id={id}
      className="text-sm text-red-600 dark:text-red-400 font-semibold"
      role="alert"
      aria-live="assertive"
    >
      {error}
    </div>
  );
}
