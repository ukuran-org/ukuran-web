import styles from "./hero-banner.module.css";

export default function HeroBanner() {
  return (
    <header className={styles.hero}>
      <div className={styles.banner}>
        <div className={styles.floor} aria-hidden="true">
          <div className={styles.grid} />
        </div>
      </div>
    </header>
  );
}
