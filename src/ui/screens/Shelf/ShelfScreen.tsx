import { formatLength } from '../../../domain/length';
import styles from './ShelfScreen.module.css';

export function ShelfScreen() {
  return (
    <>
      <header className={styles.greeting}>
        <h1 lang="gd">Madainn mhath!</h1>
        <p>Good morning.</p>
      </header>
      <p className={styles.empty}>Your scarf shelf is empty. The loom is being set up.</p>
      <p className={styles.total}>Woven so far: {formatLength(0)}</p>
    </>
  );
}
