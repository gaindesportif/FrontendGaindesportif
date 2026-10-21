'use client';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
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
  const [visible, setVisible] = useState(false);
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <div className={styles.password}>
        <input
          className={styles.input}
          id={id}
          name={id}
          type={visible ? 'text' : 'password'}
          required
          minLength={minimum}
          maxLength={128}
          autoComplete={autoComplete}
          aria-describedby={hint ? `${id}-hint` : undefined}
        />
        <button
          className={styles.reveal}
          type="button"
          aria-label={`${visible ? 'Masquer' : 'Afficher'} ${label.toLowerCase()}`}
          aria-pressed={visible}
          onClick={() => setVisible(!visible)}
        >
          {visible ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
        </button>
      </div>
      {hint && (
        <p className={styles.hint} id={`${id}-hint`}>
          12 caractères minimum. Une phrase de passe unique est un bon choix.
        </p>
      )}
    </div>
  );
}
