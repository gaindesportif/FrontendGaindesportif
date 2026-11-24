'use client';
import { PasswordInput } from '../password-input';
import styles from './account.module.css';

export function PasswordField({
  id,
  label,
  autoComplete = 'new-password',
  minimum = 12,
  hint = true,
}: {
  id: string;
  label: string;
  autoComplete?: 'new-password' | 'current-password';
  minimum?: number;
  hint?: boolean;
}) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <PasswordInput
        className={styles.input}
        id={id}
        name={id}
        label={label}
        required
        minLength={minimum}
        maxLength={128}
        autoComplete={autoComplete}
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
      {hint && (
        <p className={styles.hint} id={`${id}-hint`}>
          {minimum} caractères minimum. Une phrase de passe unique est un bon choix.
        </p>
      )}
    </div>
  );
}
