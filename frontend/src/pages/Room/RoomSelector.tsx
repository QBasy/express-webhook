import { useState, type FormEvent } from 'react';
import { ArrowsClockwise, Plus, Stack } from '@phosphor-icons/react';
import { useAuth } from '../../auth/AuthContext';
import { useI18n } from '../../i18n/I18nContext';
import { roomsApi } from '../../api/rooms';
import { ApiError } from '../../api/client';
import { Alert } from '../../components/Alert/Alert';
import { AllRoomsPanel } from './AllRoomsPanel';
import type { Room } from '../../api/types';
import styles from './RoomSelector.module.scss';

interface Props {
  rooms: Room[];
  onSelect: (roomId: string) => void;
  onCreated: (roomId: string) => void;
}

const INTEGRATION_ID_RE = /^\d{10}(\d{2})?$/;

function randomDigits(length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += Math.floor(Math.random() * 10);
  }
  return out;
}

export function RoomSelector({ rooms, onSelect, onCreated }: Props) {
  const { user } = useAuth();
  const { t } = useI18n();
  const isAdmin = user?.role === 'admin';
  const prefix = isAdmin ? '' : `${user?.username ?? ''}_`;

  const [newRoomSuffix, setNewRoomSuffix] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [integrationId, setIntegrationId] = useState('');
  const [isCreatingIntegration, setIsCreatingIntegration] = useState(false);
  const [integrationError, setIntegrationError] = useState<string | null>(null);

  const [showAllRooms, setShowAllRooms] = useState(false);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const suffix = newRoomSuffix.trim();
    if (!suffix) return;

    const roomId = `${prefix}${suffix}`;
    setIsCreating(true);
    try {
      const result = await roomsApi.create(roomId);
      onCreated(result.roomId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.auth.login.genericError);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleCreateIntegration(event: FormEvent) {
    event.preventDefault();
    setIntegrationError(null);

    const id = integrationId.trim();
    if (!INTEGRATION_ID_RE.test(id)) {
      setIntegrationError(t.room.integration.invalidId);
      return;
    }

    setIsCreatingIntegration(true);
    try {
      const result = await roomsApi.create(id);
      onCreated(result.roomId);
    } catch (err) {
      setIntegrationError(err instanceof ApiError ? err.message : t.auth.login.genericError);
    } finally {
      setIsCreatingIntegration(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.titleRow}>
        <h2>{t.room.selector.title}</h2>
        {isAdmin && (
          <button type="button" className={styles.allRoomsBtn} onClick={() => setShowAllRooms(true)}>
            <Stack size={16} /> {t.room.allRooms.title}
          </button>
        )}
      </div>

      {rooms.length === 0 ? (
        <p className={styles.empty}>{t.room.selector.empty}</p>
      ) : (
        <ul className={styles.list}>
          {rooms.map((room) => (
            <li key={room.roomId}>
              <button type="button" onClick={() => onSelect(room.roomId)}>
                <span className={styles.roomId}>{room.roomId}</span>
                <span className={styles.open}>{t.room.selector.open} →</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <form className={styles.createForm} onSubmit={handleCreate}>
        <h3>{t.room.selector.createNew}</h3>
        {error && <Alert type="error" message={error} />}
        <div className={styles.inputRow}>
          {prefix && <span className={styles.prefix}>{prefix}</span>}
          <input
            value={newRoomSuffix}
            onChange={(e) => setNewRoomSuffix(e.target.value)}
            placeholder={t.room.selector.idPlaceholder}
          />
          <button type="submit" disabled={isCreating || !newRoomSuffix.trim()}>
            <Plus size={16} weight="bold" />
            {isCreating ? t.room.selector.creating : t.room.selector.createButton}
          </button>
        </div>
        {prefix && <p className={styles.hint}>{t.room.selector.prefixHint(prefix)}</p>}
      </form>

      {isAdmin && (
        <form className={`${styles.createForm} ${styles.integrationForm}`} onSubmit={handleCreateIntegration}>
          <h3>{t.room.integration.title}</h3>
          <p className={styles.integrationDescription}>{t.room.integration.description}</p>
          {integrationError && <Alert type="error" message={integrationError} />}
          <div className={styles.inputRow}>
            <input
              value={integrationId}
              onChange={(e) => setIntegrationId(e.target.value.replace(/\D/g, ''))}
              placeholder={t.room.integration.idPlaceholder}
              inputMode="numeric"
              maxLength={12}
            />
            <button
              type="button"
              className={styles.generateBtn}
              onClick={() => setIntegrationId(randomDigits(Math.random() < 0.5 ? 10 : 12))}
              title={t.room.integration.generate}
            >
              <ArrowsClockwise size={16} />
            </button>
            <button type="submit" disabled={isCreatingIntegration || !integrationId.trim()}>
              <Plus size={16} weight="bold" />
              {isCreatingIntegration ? t.room.selector.creating : t.room.selector.createButton}
            </button>
          </div>
        </form>
      )}

      {showAllRooms && <AllRoomsPanel onSelect={onSelect} onClose={() => setShowAllRooms(false)} />}
    </div>
  );
}
