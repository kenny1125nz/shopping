import React, { forwardRef, useState } from 'react';
import styles from './Input.module.css';

// ── Base input ────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, className, id, ...rest }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className={styles.group}>
        {label && (
          <label className={styles.label} htmlFor={inputId}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[styles.input, error ? styles.inputError : '', className ?? '']
            .filter(Boolean)
            .join(' ')}
          {...rest}
        />
        {hint && !error && <p className={styles.hint}>{hint}</p>}
        {error && <p className={styles.errorMsg}>{error}</p>}
      </div>
    );
  },
);
Input.displayName = 'Input';

// ── Password input with show/hide toggle ──────────────────────────────

type PasswordInputProps = Omit<InputProps, 'type'>;

export function PasswordInput(props: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={styles.pwWrap}>
      <Input type={visible ? 'text' : 'password'} {...props} />
      <button
        type="button"
        className={styles.pwToggle}
        onClick={() => setVisible(v => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        tabIndex={-1}
      >
        {visible ? '🙈' : '👁'}
      </button>
    </div>
  );
}

// ── Select ────────────────────────────────────────────────────────────

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export function Select({ label, id, children, className, ...rest }: SelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className={styles.group}>
      {label && (
        <label className={styles.label} htmlFor={selectId}>
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={[styles.input, styles.select, className ?? ''].filter(Boolean).join(' ')}
        {...rest}
      >
        {children}
      </select>
    </div>
  );
}
