import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { indexItems, loadContent } from '../../../content';
import { db } from '../../../db/db';
import { formatLength } from '../../../domain/length';
import { Button, ButtonRow } from '../../components/Button';
import { ScarfCanvas } from '../../components/ScarfCanvas';
import { tagLabel } from '../../../domain/tagLabel';
import { TagPicker } from '../../components/TagPicker';
import { buildScarfView, rulerLabels } from './scarfView';
import styles from './ScarfScreen.module.css';

/** The clock is injected so tests, and later the dev time-travel control, can set "now". */
export function ScarfScreen({ now = Date.now }: { now?: () => number }) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const content = useMemo(() => loadContent(), []);
  const items = useMemo(() => indexItems(content), [content]);

  const scarf = useLiveQuery(async () => (await db.scarves.get(id)) ?? null, [id]);
  const progress = useLiveQuery(
    async () => (scarf ? (await db.progress.bulkGet(scarf.wovenOrder)).filter((p) => p !== undefined) : []),
    [scarf],
  );

  if (scarf === undefined || progress === undefined) return null; // still reading the local database
  if (scarf === null) {
    return (
      <>
        <h1 className={styles.title}>Scarf</h1>
        <p>This scarf isn't on the shelf. <Link to="/">Back to the shelf</Link></p>
      </>
    );
  }

  const tartan = content.tartans.find((t) => t.id === scarf.tartanId);
  const view = buildScarfView({ scarf, items, progress, now: now() });
  const length = Math.round(view.ells * 100) / 100;
  const begun = new Date(scarf.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const { counts } = view;

  return (
    <>
      <header>
        <h1 className={styles.title}>{scarf.name}</h1>
        <small className={styles.subtitle}>{tartan?.name ?? 'Unknown tartan'} · begun {begun}</small>
      </header>

      <div className={styles.body}>
        <div>
          {tartan && (
            <ScarfCanvas
              tartan={tartan}
              variant="detail"
              wovenOrder={scarf.wovenOrder}
              holes={view.holes}
              name={scarf.name}
              lengthLabel={formatLength(view.ells)}
              onReweave={(itemId) => navigate(`/reweave/${scarf.id}?item=${encodeURIComponent(itemId)}`)}
            />
          )}
        </div>

        <div className={styles.ruler} aria-hidden="true">
          {rulerLabels(view.ells).map((l) => (
            <span key={l.text} className={styles.tick} style={{ top: l.top }}>{l.text}</span>
          ))}
        </div>

        <div className={styles.facts}>
          <p className={styles.fact}><b>{length}</b>ells woven</p>
          <p className={styles.fact}>
            <b>{counts.total}</b>
            items: {counts.words} words, {counts.forms} forms, {counts.sentences} sentences
          </p>
          <p className={styles.fact}><b>{view.holes.length}</b>moth holes waiting</p>
          <TagPicker tags={scarf.tagFilter} format={tagLabel} label="Tags" />
        </div>
      </div>

      <ButtonRow>
        <Button to={`/loom/${scarf.id}`}>Weave</Button>
        {view.holes.length > 0 && (
          <Button variant="ghost" to={`/reweave/${scarf.id}`}>Reweave {view.holes.length}</Button>
        )}
      </ButtonRow>
    </>
  );
}
