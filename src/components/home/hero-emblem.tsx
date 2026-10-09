import { useId } from 'react';
import styles from './home.module.css';

/** Repli léger présent dès le HTML, sans anciennes cartes ni dépendance WebGL. */
export function HeroEmblem() {
  const id = useId();
  const fillId = `${id}-fill`;
  const clipId = `${id}-clip`;

  return (
    <svg
      className={styles.staticEmblem}
      data-testid="hero-emblem"
      viewBox="0 0 400 400"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7aaf8a" />
          <stop offset="0.45" stopColor="#176a4c" />
          <stop offset="1" stopColor="#0c3227" />
        </linearGradient>
        <clipPath id={clipId}>
          <circle cx="200" cy="203" r="34" />
        </clipPath>
      </defs>
      <ellipse
        cx="200"
        cy="200"
        rx="161"
        ry="123"
        fill="none"
        stroke="#acc8a3"
        strokeOpacity="0.18"
        transform="rotate(-28 200 200)"
      />
      <path
        d="M200 47 244 140 347 155 273 227 290 330 200 282 110 330 127 227 53 155 156 140Z"
        fill={`url(#${fillId})`}
        stroke="#a8cba6"
        strokeWidth="2"
      />
      <circle cx="200" cy="203" r="47" fill="#d0b961" />
      <circle cx="200" cy="203" r="42" fill="#f6f3e6" />
      <image
        href="/images/logo.webp"
        x="166"
        y="169"
        width="68"
        height="68"
        clipPath={`url(#${clipId})`}
      />
    </svg>
  );
}
