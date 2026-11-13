import styles from './editorial.module.css';
// Plain text is rendered by React: no raw HTML, scripts or third-party embeds.
export function ArticleBody({ body }: { body: string }) {
  return (
    <div className={styles.prose}>
      {body
        .split(/\n\s*\n/)
        .filter((p) => p.trim())
        .map((p, i) =>
          p.startsWith('## ') ? (
            <h2 key={i}>{p.slice(3)}</h2>
          ) : p.startsWith('> ') ? (
            <blockquote key={i}>{p.slice(2)}</blockquote>
          ) : (
            <p key={i}>{p}</p>
          ),
        )}
    </div>
  );
}
