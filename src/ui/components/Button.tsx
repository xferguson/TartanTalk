import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'ghost';

interface Common {
  variant?: ButtonVariant;
  children: ReactNode;
}
type AsButton = Common & ButtonHTMLAttributes<HTMLButtonElement> & { to?: undefined };
type AsLink = Common & { to: string; className?: string };

/** A button, or a router link styled as one when `to` is given. */
export function Button(props: AsButton | AsLink) {
  const { variant = 'primary', children } = props;
  const cls = `${styles.button} ${variant === 'ghost' ? styles.ghost : styles.primary}`;
  if (props.to !== undefined) {
    return (
      <Link to={props.to} className={cls}>
        {children}
      </Link>
    );
  }
  const { className, ...rest } = stripCustom(props);
  return (
    <button type="button" {...rest} className={className ? `${cls} ${className}` : cls}>
      {children}
    </button>
  );
}

function stripCustom(p: AsButton): ButtonHTMLAttributes<HTMLButtonElement> {
  const { variant: _v, children: _c, to: _t, ...rest } = p;
  void _v; void _c; void _t;
  return rest;
}

export function ButtonRow({ children }: { children: ReactNode }) {
  return <div className={styles.row}>{children}</div>;
}
