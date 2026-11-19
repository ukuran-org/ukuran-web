import Image from "next/image";
import logo from "../../../assets/logo.svg";
import styles from "./hero-banner.module.css";

export default function HeroBanner() {
  return (
    <header className={styles.hero}>
      <div className={styles.banner}>
        <div className={styles.floor} aria-hidden="true">
          <div className={styles.grid} />
        </div>
        <div className={styles.logo}>
          <Image src={logo} alt="" preload sizes="520px" />
        </div>
        <div className={styles.fade} aria-hidden="true" />
      </div>
    </header>
  );
}
