import React from 'react';
import styles from './Alert.module.css';

export type AlertType = 'error' | 'success' | 'info' | 'warning';

interface AlertProps {
  type: AlertType;
  children: React.ReactNode;
  className?: string;
}

export function Alert({ type, children, className }: AlertProps) {
  return (
    <div className={[styles.alert, styles[type], className ?? ''].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}
