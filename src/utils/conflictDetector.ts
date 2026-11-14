import { CampusEvent, ConflictCheckResult, ConflictInfo, Room } from '../types';

/**
 * Checks schedule conflicts for an event against existing events.
 * Rule:
 * 1. Cancelled events (status === 'Dibatalkan') DO NOT block rooms.
 * 2. If target event itself is 'Dibatalkan', no active conflict is generated.
 * 3. Overlap condition on same date: startA < endB && endA > startB
 * 4. At least one room in targetEvent.ruangan_ids is in event.ruangan_ids
 */
export function checkEventConflict(
  target: {
    id?: string;
    tanggal: string;
    jam_mulai: string;
    jam_selesai: string;
    ruangan_ids: string[];
    status?: string;
  },
  allEvents: CampusEvent[],
  allRooms: Room[]
): ConflictCheckResult {
  if (target.status === 'Dibatalkan') {
    return { hasConflict: false, conflicts: [] };
  }

  if (!target.tanggal || !target.jam_mulai || !target.jam_selesai || !target.ruangan_ids?.length) {
    return { hasConflict: false, conflicts: [] };
  }

  const conflicts: ConflictInfo[] = [];

  for (const ev of allEvents) {
    // Skip self
    if (target.id && ev.id === target.id) {
      continue;
    }
    // Cancelled events do not block rooms
    if (ev.status === 'Dibatalkan') {
      continue;
    }
    // Must be same date
    if (ev.tanggal !== target.tanggal) {
      continue;
    }

    // Time window overlap: startA < endB && endA > startB
    const isOverlap = target.jam_mulai < ev.jam_selesai && target.jam_selesai > ev.jam_mulai;
    if (!isOverlap) {
      continue;
    }

    // Shared rooms
    const sharedRoomIds = (target.ruangan_ids || []).filter((rId) =>
      (ev.ruangan_ids || []).includes(rId)
    );

    if (sharedRoomIds.length > 0) {
      const roomNames = sharedRoomIds.map((rId) => {
        const r = allRooms.find((room) => room.id === rId);
        return r ? r.name : rId;
      });

      const maxStart = target.jam_mulai > ev.jam_mulai ? target.jam_mulai : ev.jam_mulai;
      const minEnd = target.jam_selesai < ev.jam_selesai ? target.jam_selesai : ev.jam_selesai;

      conflicts.push({
        conflictingEvent: ev,
        conflictingRoomIds: sharedRoomIds,
        conflictingRoomNames: roomNames,
        overlapWindow: `${maxStart} - ${minEnd} WIB`,
        reason: `Bentrok di ruangan [${roomNames.join(', ')}] dengan event "${ev.nama_event}" (${ev.status}) pada ${ev.jam_mulai} - ${ev.jam_selesai} WIB.`
      });
    }
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts
  };
}

/**
 * Format date string YYYY-MM-DD to Indonesian format DD/MM/YYYY
 */
export function formatDateIndo(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Format date to full Indonesian text (e.g. "10 November 2026")
 */
export function formatDateFullIndo(dateStr: string): string {
  if (!dateStr) return '-';
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const day = parseInt(parts[2], 10);
    const month = months[parseInt(parts[1], 10) - 1] || parts[1];
    const year = parts[0];
    return `${day} ${month} ${year}`;
  }
  return dateStr;
}

/**
 * Format local Date object to YYYY-MM-DD without UTC conversion shift
 */
export function formatLocalDateYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Get current date YYYY-MM-DD in Asia/Jakarta (WIB)
 */
export function getTodayWibDateStr(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
  } catch {
    return formatLocalDateYMD(new Date());
  }
}

/**
 * Check room's live status today at specific time
 */
export function getRoomLiveStatus(
  roomId: string,
  events: CampusEvent[],
  checkDate: string = getTodayWibDateStr(),
  currentTimeStr: string = getCurrentTimeHHMM()
): { status: 'Tersedia' | 'Sedang Digunakan' | 'Akan Digunakan'; activeEvent?: CampusEvent; nextEvent?: CampusEvent } {
  // Find events for this room on checkDate that are NOT cancelled
  const dayEvents = events
    .filter((e) => e.tanggal === checkDate && e.status !== 'Dibatalkan' && (e.ruangan_ids || []).includes(roomId))
    .sort((a, b) => a.jam_mulai.localeCompare(b.jam_mulai));

  // Current active event: jam_mulai <= currentTime < jam_selesai
  const active = dayEvents.find((e) => e.jam_mulai <= currentTimeStr && e.jam_selesai > currentTimeStr);
  if (active) {
    return { status: 'Sedang Digunakan', activeEvent: active };
  }

  // Next upcoming event today: jam_mulai > currentTime
  const upcoming = dayEvents.find((e) => e.jam_mulai > currentTimeStr);
  if (upcoming) {
    return { status: 'Akan Digunakan', nextEvent: upcoming };
  }

  return { status: 'Tersedia' };
}

function getCurrentTimeHHMM(): string {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(new Date());
    const h = parts.find((p) => p.type === 'hour')?.value || '00';
    const m = parts.find((p) => p.type === 'minute')?.value || '00';
    return `${h === '24' ? '00' : h}:${m}`;
  } catch {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }
}
