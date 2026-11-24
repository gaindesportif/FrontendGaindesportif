'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useEffect, useRef, useState, type ComponentPropsWithoutRef } from 'react';
import styles from './password-input.module.css';

export function PasswordInput({
  label,
  ...inputProps
}: Omit<ComponentPropsWithoutRef<'input'>, 'type'> & { label: string }) {
  const [visible, setVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const form = inputRef.current?.form;
    const hide = () => setVisible(false);
    form?.addEventListener('reset', hide);
    return () => form?.removeEventListener('reset', hide);
  }, []);

  const Icon = visible ? EyeOff : Eye;
  return (
    <div className={styles.field}>
      <input
        {...inputProps}
        ref={inputRef}
        type={visible ? 'text' : 'password'}
        autoCapitalize="none"
        spellCheck={false}
      />
      <button
        className={styles.toggle}
        type="button"
        aria-label={`${visible ? 'Masquer' : 'Afficher'} ${label.toLowerCase()}`}
        disabled={inputProps.disabled}
        onClick={() => setVisible((value) => !value)}
      >
        <Icon size={19} aria-hidden="true" />
      </button>
    </div>
  );
}
