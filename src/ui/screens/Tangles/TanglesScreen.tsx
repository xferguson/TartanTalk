import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSessionStore } from '../../../app/store/useSessionStore';
import type { SessionStore } from '../../../app/store/sessionStore';
import { indexItems, loadContent } from '../../../content';
import { db, type TartanDB } from '../../../db/db';
import { Button, ButtonRow } from '../../components/Button';
import { Card } from '../../components/Card';
import { Chip } from '../../components/Chip';
import { ProgressBar } from '../../components/ProgressBar';
import { ExercisePanel } from '../Reweave/ExercisePanel';
import { loadTangles, type TangleRow } from './loadTangles';
import styles from './TanglesScreen.module.css';

export interface TanglesScreenProps {
  store?: SessionStore;
  database?: TartanDB;
}

export function TanglesScreen({ store = useSessionStore, database = db }: TanglesScreenProps) {
  const s = store();
  const items = useMemo(() => indexItems(loadContent()), []);
  const [rows, setRows] = useState<TangleRow[] | null>(null);
  const practising = s.mode === 'tangles';

  const refresh = useCallback(() => loadTangles(database, items).then(setRows), [database, items]);
  useEffect(() => {
    void refresh();
    return () => store.getState().reset();
  }, [refresh, store]);

  const untangle = async () => {
    await s.startTangles();
  };
  const finish = () => {
    s.reset();
    void refresh();
  };

  if (practising) {
    return (
      <>
        <h1 className={styles.title}>Tangles</h1>
        <ProgressBar value={s.answered} max={Math.max(s.total, 1)} label="Untangling" />
        {s.exercise ? (
          <Card>
            <ExercisePanel exercise={s.exercise} feedback={s.feedback} onSubmit={(r) => void s.submit(r)} showCorrect />
          </Card>
        ) : s.waitUntil !== null ? (
          <Card>
            <p className={styles.empty}>Let that thread rest a moment, then carry on.</p>
          </Card>
        ) : null}
        {s.weaving && (
          <p className={styles.note} role="status">
            Untangled: this thread is woven back in.
          </p>
        )}
        <ButtonRow>
          {s.done ? (
            <Button onClick={finish}>Done</Button>
          ) : (
            (s.feedback || s.waitUntil !== null) && <Button onClick={() => void s.next()}>Next thread</Button>
          )}
        </ButtonRow>
      </>
    );
  }

  return (
    <>
      <header>
        <h1 className={styles.title}>Tangles</h1>
        <p className={styles.sub}>Threads that need a little more practice.</p>
      </header>
      {rows === null ? null : rows.length === 0 ? (
        <Card>
          <p className={styles.empty}>No tangles. Every thread is running smoothly.</p>
        </Card>
      ) : (
        <>
          {rows.map((r) => (
            <Card key={r.itemId}>
              <div className={styles.row}>
                <div>
                  <div className={styles.gd} lang="gd">{r.gd}</div>
                  <div className={styles.en}>{r.en}</div>
                </div>
                {r.scarfName && <Chip variant="calm">{r.scarfName}</Chip>}
              </div>
            </Card>
          ))}
          <ButtonRow>
            <Button onClick={() => void untangle()}>Untangle {rows.length}</Button>
          </ButtonRow>
        </>
      )}
    </>
  );
}
