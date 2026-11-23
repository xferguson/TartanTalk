import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSessionStore } from '../../../app/store/useSessionStore';
import type { SessionStore } from '../../../app/store/sessionStore';
import { loadContent } from '../../../content';
import { db, type TartanDB } from '../../../db/db';
import { getProgress, getScarf } from '../../../db/repo';
import { nextIntervalDays } from '../../../domain/scheduler';
import type { Rating, Scarf, Tartan } from '../../../domain/types';
import { Button, ButtonRow } from '../../components/Button';
import { Card } from '../../components/Card';
import { RatingBar } from '../../components/RatingBar';
import { FALLBACK_TARTAN } from '../Shelf/loadShelf';
import { ExercisePanel } from './ExercisePanel';
import { MendCard } from './MendCard';
import styles from './ReweaveScreen.module.css';

export interface ReweaveScreenProps {
  store?: SessionStore;
  database?: TartanDB;
  now?: () => number;
}

export const formatInterval = (days: number): string => {
  if (days < 1) return 'soon';
  const n = Math.round(days);
  return n === 1 ? '1 day' : `${n} days`;
};

const holesLeft = (k: number) => `${k} ${k === 1 ? 'hole' : 'holes'} left.`;

export function ReweaveScreen({ store = useSessionStore, database = db, now = Date.now }: ReweaveScreenProps) {
  const { scarfId } = useParams();
  const s = store();
  const [scarf, setScarf] = useState<Scarf | null | undefined>(undefined);
  const [interval, setInterval] = useState('');
  const tartans = useMemo(() => new Map(loadContent().tartans.map((t) => [t.id, t])), []);

  useEffect(() => {
    let live = true;
    void (async () => {
      const found = scarfId ? ((await getScarf(scarfId, database)) ?? null) : null;
      if (live) setScarf(found);
      await store.getState().startReweave(scarfId);
    })();
    return () => {
      live = false;
      store.getState().reset();
    };
  }, [scarfId, store, database]);

  const awaiting = s.feedback?.awaitingRating === true;
  const itemId = s.itemId;
  useEffect(() => {
    if (!awaiting || !itemId) return;
    let live = true;
    void getProgress(itemId, database).then((p) => {
      if (live && p) setInterval(formatInterval(nextIntervalDays(p, 'good', now())));
    });
    return () => {
      live = false;
    };
  }, [awaiting, itemId, database, now]);

  const tartan: Tartan = (scarf && tartans.get(scarf.tartanId)) || FALLBACK_TARTAN;
  const name = scarf?.name ?? 'All scarves';
  const finishedQuestions = s.feedback !== null && !s.feedback.awaitingRating && s.queue.length === 0;

  if (s.done && !s.exercise) {
    return (
      <>
        <h1 className={styles.title}>Reweaving</h1>
        <Card>
          <p className={styles.status} role="status">
            {s.answered > 0 ? 'All mended. The scarf is whole again.' : 'Nothing to reweave. Every thread is holding.'}
          </p>
          {s.tangledLeft > 0 && <TangleNote count={s.tangledLeft} />}
          <ButtonRow>
            <Button to="/">Back to the shelf</Button>
          </ButtonRow>
        </Card>
      </>
    );
  }
  if (!s.exercise || !itemId) return <h1 className={styles.title}>Reweaving</h1>;

  const total = Math.max(s.total, 1);
  const position = Math.min(s.answered + (s.feedback && !s.feedback.awaitingRating ? 0 : 1), total);
  const correct = s.feedback?.check.correct === true;

  return (
    <>
      <p className={styles.top}>
        Reweaving · {name} · {Math.max(position, 1)} of {total}
      </p>
      <MendCard tartan={tartan} itemId={itemId} mended={correct} />
      <Card>
        <ExercisePanel exercise={s.exercise} feedback={s.feedback} onSubmit={(r) => void s.submit(r)} />
        {awaiting && s.feedback && (
          <>
            <p className={styles.rate}>How did that feel?</p>
            <RatingBar
              key={itemId}
              interval={interval || 'next'}
              pre={s.feedback.suggestedRating === 'hard' ? 'hard' : 'good'}
              onRate={(r: Rating) => void s.rate(r)}
            />
          </>
        )}
      </Card>
      {s.feedback && !awaiting && (
        <>
          <p className={styles.status} role="status">
            {correct && 'Math dhèanta! Well done. '}
            {finishedQuestions ? 'All mended. The scarf is whole again.' : holesLeft(s.queue.length)}
          </p>
          {finishedQuestions && s.tangledLeft > 0 && <TangleNote count={s.tangledLeft} />}
          <ButtonRow>
            {finishedQuestions ? <Button to="/">Back to the shelf</Button> : <Button onClick={() => void s.next()}>Next thread</Button>}
          </ButtonRow>
        </>
      )}
    </>
  );
}

function TangleNote({ count }: { count: number }) {
  return (
    <p className={styles.status}>
      {count} tangled {count === 1 ? 'thread needs' : 'threads need'} more practice: <Link to="/tangles">Untangle</Link>.
    </p>
  );
}
