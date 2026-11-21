import Image from "next/image";
import logo from "../../../assets/logo.svg";
import styles from "./hero-banner.module.css";
import PerspectiveGrid from "./perspective-grid";

export default function HeroBanner() {
  return (
    <header className={styles.hero}>
      <div className={styles.banner}>
        <div className={styles.floor} aria-hidden="true">
          <PerspectiveGrid />
        </div>
        <div className={styles.logo}>
          <Image src={logo} alt="" preload sizes="520px" />
        </div>
        <div className={styles.fade} aria-hidden="true" />
      </div>
      <h1 className={styles.wordmark}>UKURAN</h1>
    </header>
  );
}
