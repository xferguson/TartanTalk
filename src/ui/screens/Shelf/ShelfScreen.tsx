import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loadContent, indexItems } from '../../../content';
import { db, type TartanDB } from '../../../db/db';
import { formatLength } from '../../../domain/length';
import { Button, ButtonRow } from '../../components/Button';
import { Card } from '../../components/Card';
import { Chip } from '../../components/Chip';
import { ScarfCanvas } from '../../components/ScarfCanvas';
import { loadShelf, type ShelfCard } from './loadShelf';
import { holeChipText, summarise, visitorsText } from './shelfModel';
import styles from './ShelfScreen.module.css';

export interface ShelfScreenProps {
  database?: TartanDB;
  /** Injected so tests and the dev clock can move time. */
  now?: () => number;
}

/** Gaelic words in a scarf's tag filter (prep:aig → "aig"), for the sub-line. */
function subLine(tags: readonly string[]): string {
  return tags.filter((t) => t.startsWith('prep:')).map((t) => t.slice(5)).join(' · ');
}

export function ShelfScreen({ database = db, now = Date.now }: ShelfScreenProps) {
  const navigate = useNavigate();
  const [cards, setCards] = useState<ShelfCard[] | null>(null);
  const bundle = useMemo(() => loadContent(), []);
  const items = useMemo(() => indexItems(bundle), [bundle]);

  useEffect(() => {
    let live = true;
    void loadShelf(database, bundle, items, now()).then((c) => live && setCards(c));
    return () => {
      live = false;
    };
  }, [database, bundle, items, now]);

  const when = new Date(now());
  const s = summarise(cards ?? [], when.getHours());
  const subtitle = [s.greeting.en, visitorsText(s.scarvesWithHoles)].filter(Boolean).join(' ');
  const header = (
    <header className={styles.greeting}>
      <h1 lang="gd">{s.greeting.gd}</h1>
      <p>{subtitle}</p>
    </header>
  );

  if (cards === null) return header;

  if (cards.length === 0) {
    return (
      <>
        {header}
        <Card>
          <p className={styles.empty}>Your shelf is empty. Start your first scarf and the loom will show you how.</p>
          <ButtonRow>
            <Button to="/new">Start a new scarf</Button>
          </ButtonRow>
        </Card>
      </>
    );
  }

  const target = s.reweaveTarget;
  return (
    <>
      {header}
      <p className={styles.label}>Your shelf · {formatLength(s.totalElls)} woven</p>
      {cards.map((c) => {
        const length = formatLength(c.ells);
        const sub = subLine(c.scarf.tagFilter);
        return (
          <Card key={c.scarf.id} className={styles.scarfCard}>
            <ScarfCanvas
              tartan={c.tartan}
              variant="strip"
              wovenOrder={c.scarf.wovenOrder}
              holes={c.holes.map((h) => ({ ...h, gd: c.gd.get(h.itemId) ?? h.itemId }))}
              name={c.scarf.name}
              lengthLabel={length}
              onReweave={() => navigate(`/reweave/${c.scarf.id}`)}
            />
            <div className={styles.row}>
              <div>
                <Link to={`/scarf/${c.scarf.id}`} className={styles.name}>
                  {c.scarf.name}
                </Link>
                {sub && (
                  <div className={styles.sub} lang="gd">
                    {sub}
                  </div>
                )}
              </div>
              <div className={styles.meta}>
                <span className={styles.length}>{length}</span>
                {c.holes.length > 0 ? <Chip variant="attention">{holeChipText(c.holes.length)}</Chip> : <Chip variant="calm">resting</Chip>}
              </div>
            </div>
          </Card>
        );
      })}
      <ButtonRow>
        {target && <Button to={`/reweave/${target.scarf.id}`}>Reweave {target.holes.length} {target.holes.length === 1 ? 'hole' : 'holes'}</Button>}
        <Button to="/new" variant="ghost">
          Start a new scarf
        </Button>
      </ButtonRow>
    </>
  );
}
