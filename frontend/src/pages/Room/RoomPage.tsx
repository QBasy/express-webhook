import { useEffect, useState } from 'react';
import { roomsApi } from '../../api/rooms';
import type { Room } from '../../api/types';
import { useI18n } from '../../i18n/I18nContext';
import { RoomSelector } from './RoomSelector';
import { RoomDetail } from './RoomDetail';
import styles from './RoomPage.module.scss';

const LAST_ROOM_KEY = 'last_room_id';

export function RoomPage() {
  const { t } = useI18n();
  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(() =>
    localStorage.getItem(LAST_ROOM_KEY)
  );

  useEffect(() => {
    let cancelled = false;
    roomsApi.myRooms().then(({ rooms: fetchedRooms }) => {
      if (cancelled) return;
      setRooms(fetchedRooms);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function selectRoom(roomId: string) {
    localStorage.setItem(LAST_ROOM_KEY, roomId);
    setSelectedRoomId(roomId);
  }

  function deselectRoom() {
    localStorage.removeItem(LAST_ROOM_KEY);
    setSelectedRoomId(null);
  }

  async function handleCreated(roomId: string) {
    const { rooms: fetchedRooms } = await roomsApi.myRooms();
    setRooms(fetchedRooms);
    selectRoom(roomId);
  }

  function handleClosed(roomId: string) {
    setRooms((prev) => prev?.filter((room) => room.roomId !== roomId) ?? null);
    deselectRoom();
  }

  if (rooms === null) {
    return <p className={styles.state}>{t.common.loading}</p>;
  }

  const selectedRoom = selectedRoomId ? rooms.find((room) => room.roomId === selectedRoomId) : undefined;

  if (selectedRoom) {
    return <RoomDetail room={selectedRoom} onBack={deselectRoom} onClosed={handleClosed} />;
  }

  return <RoomSelector rooms={rooms} onSelect={selectRoom} onCreated={handleCreated} />;
}
