import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import {
  OperationType,
  auth,
  db,
  googleAuthProvider,
  handleFirestoreError
} from '../lib/firebase';
import {
  AuditLog,
  CampusEvent,
  FilterOptions,
  Room,
  User,
  UserRole
} from '../types';
import { checkEventConflict } from '../utils/conflictDetector';
import { INITIAL_AUDIT_LOGS, INITIAL_EVENTS, INITIAL_ROOMS } from './seedData';

const CAMPUS_ID = 'stekom';
const BOOTSTRAP_ADMIN_EMAILS = new Set(['mumahadfaiz@stekom.ac.id', 'admin@stekom.ac.id']);

function toIsoString(val: unknown): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (val && typeof val === 'object' && 'toDate' in val && typeof (val as any).toDate === 'function') {
    return (val as any).toDate().toISOString();
  }
  if (typeof val === 'string' && val.trim()) {
    return val;
  }
  return new Date().toISOString();
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function mapUserDoc(id: string, data: Record<string, any>, isPendingInvite = false): User {
  return {
    id,
    name: String(data.name || data.email || 'Pengguna STEKOM'),
    email: String(data.email || '').toLowerCase(),
    role: (data.role as UserRole) || 'Viewer',
    department: String(data.department || 'Universitas STEKOM'),
    phone: data.phone ? String(data.phone) : '',
    created_at: toIsoString(data.createdAt),
    isPendingInvite
  };
}

function mapRoomDoc(id: string, data: Record<string, any>): Room {
  return {
    id,
    name: String(data.name || ''),
    code: String(data.code || ''),
    capacity: Number(data.capacity) || 0,
    is_general: Boolean(data.is_general),
    floor: String(data.floor || 'Lantai 1'),
    building: String(data.building || 'Gedung Pusat STEKOM'),
    facilities: Array.isArray(data.facilities) ? data.facilities.map(String) : [],
    status: data.status === 'Pemeliharaan' ? 'Pemeliharaan' : 'Tersedia',
    notes: data.notes ? String(data.notes) : ''
  };
}

function mapEventDoc(id: string, data: Record<string, any>): CampusEvent {
  return {
    id,
    nama_event: String(data.nama_event || ''),
    tanggal: String(data.tanggal || ''),
    jam_mulai: String(data.jam_mulai || ''),
    jam_selesai: String(data.jam_selesai || ''),
    jumlah_peserta: Number(data.jumlah_peserta) || 1,
    pic: String(data.pic || ''),
    nomor_hp_pic: String(data.nomor_hp_pic || ''),
    ruangan_ids: Array.isArray(data.ruangan_ids) ? data.ruangan_ids.map(String) : [],
    status: (data.status as CampusEvent['status']) || 'Menunggu Konfirmasi',
    catatan: data.catatan ? String(data.catatan) : '',
    created_at: toIsoString(data.createdAt),
    updated_at: toIsoString(data.updatedAt),
    created_by: String(data.created_by || 'Sistem')
  };
}

function mapAuditLogDoc(id: string, data: Record<string, any>): AuditLog {
  return {
    id,
    user_name: String(data.user_name || 'Pengguna'),
    user_role: (data.user_role as UserRole) || 'Viewer',
    action: (data.action as AuditLog['action']) || 'UBAH',
    target_type: (data.target_type as AuditLog['target_type']) || 'Sistem',
    target_id: data.target_id ? String(data.target_id) : undefined,
    target_name: String(data.target_name || ''),
    details: String(data.details || ''),
    timestamp: toIsoString(data.createdAt)
  };
}

async function writeAuditLog(
  actor: User,
  entry: {
    action: AuditLog['action'];
    target_type: AuditLog['target_type'];
    target_id?: string;
    target_name: string;
    details: string;
  }
) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  const logId = makeId('log');
  const path = `audit_logs/${logId}`;
  try {
    await setDoc(doc(db, 'audit_logs', logId), {
      id: logId,
      campusId: CAMPUS_ID,
      actorUid: uid,
      user_name: actor.name.slice(0, 150),
      user_role: actor.role,
      action: entry.action,
      target_type: entry.target_type,
      ...(entry.target_id ? { target_id: entry.target_id.slice(0, 128) } : {}),
      target_name: entry.target_name.slice(0, 200),
      details: entry.details.slice(0, 500),
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

async function ensureSeedData(actor: User): Promise<void> {
  if (actor.role !== 'Administrator' && actor.role !== 'Operator') return;
  const roomsRef = collection(db, 'rooms');
  let existingRoomsSnap;
  try {
    existingRoomsSnap = await getDocs(query(roomsRef, where('campusId', '==', CAMPUS_ID)));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'rooms');
  }

  if (!existingRoomsSnap.empty) return;

  const uid = auth.currentUser?.uid;
  if (!uid) return;

  try {
    const batch = writeBatch(db);

    for (const room of INITIAL_ROOMS) {
      batch.set(doc(db, 'rooms', room.id), {
        id: room.id,
        campusId: CAMPUS_ID,
        name: room.name,
        code: room.code,
        capacity: room.capacity,
        is_general: room.is_general,
        floor: room.floor,
        building: room.building,
        facilities: room.facilities,
        status: room.status,
        notes: room.notes || '',
        updatedByUid: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }

    for (const ev of INITIAL_EVENTS) {
      batch.set(doc(db, 'events', ev.id), {
        id: ev.id,
        campusId: CAMPUS_ID,
        nama_event: ev.nama_event,
        tanggal: ev.tanggal,
        jam_mulai: ev.jam_mulai,
        jam_selesai: ev.jam_selesai,
        jumlah_peserta: ev.jumlah_peserta,
        pic: ev.pic,
        nomor_hp_pic: ev.nomor_hp_pic,
        ruangan_ids: ev.ruangan_ids,
        status: ev.status,
        catatan: ev.catatan || '',
        created_by: ev.created_by,
        ownerUid: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }

    for (const log of INITIAL_AUDIT_LOGS) {
      batch.set(doc(db, 'audit_logs', log.id), {
        id: log.id,
        campusId: CAMPUS_ID,
        actorUid: uid,
        user_name: log.user_name,
        user_role: log.user_role,
        action: log.action,
        target_type: log.target_type,
        ...(log.target_id ? { target_id: log.target_id } : {}),
        target_name: log.target_name,
        details: log.details,
        createdAt: serverTimestamp()
      });
    }

    if (actor.role === 'Administrator') {
      batch.set(doc(db, 'settings', 'campus'), {
        campusId: CAMPUS_ID,
        app_name: 'STEKOM CAMPUS EVENT MANAGEMENT',
        campus_name: 'Universitas STEKOM',
        campus_address: 'Jl. Majapahit No. 605, Pedurungan Kidul, Kec. Pedurungan, Kota Semarang, Jawa Tengah 50192',
        campus_phone: '(024) 6723456 / 0812-3456-7890',
        campus_website: 'https://stekom.ac.id',
        mode: 'production_synced',
        timezone: 'Asia/Jakarta (WIB)',
        updatedByUid: uid,
        updatedAt: serverTimestamp()
      });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'seed_initial_data');
  }
}

export async function syncFirebaseUserProfile(firebaseUser: FirebaseUser): Promise<User> {
  const emailLower = (firebaseUser.email || '').trim().toLowerCase();
  const userDocRef = doc(db, 'users', firebaseUser.uid);
  const userPath = `users/${firebaseUser.uid}`;

  let existingSnap;
  try {
    existingSnap = await getDoc(userDocRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userPath);
  }

  if (existingSnap.exists()) {
    const profile = mapUserDoc(existingSnap.id, existingSnap.data(), false);
    await ensureSeedData(profile);
    return profile;
  }

  let assignedRole: UserRole = BOOTSTRAP_ADMIN_EMAILS.has(emailLower) ? 'Administrator' : 'Viewer';
  let assignedName = (firebaseUser.displayName || emailLower.split('@')[0] || 'Pengguna STEKOM').trim();
  let assignedDept = BOOTSTRAP_ADMIN_EMAILS.has(emailLower)
    ? 'Biro Administrasi Akademik & Sarpras'
    : 'Universitas STEKOM';
  let assignedPhone = '';
  let matchedInviteId: string | null = null;

  if (!BOOTSTRAP_ADMIN_EMAILS.has(emailLower) && emailLower) {
    try {
      const inviteSnap = await getDocs(
        query(collection(db, 'user_invites'), where('email', '==', emailLower))
      );
      if (!inviteSnap.empty) {
        const inviteDoc = inviteSnap.docs[0];
        const inv = inviteDoc.data();
        assignedRole = (inv.role as UserRole) || 'Operator';
        if (inv.name) assignedName = String(inv.name);
        if (inv.department) assignedDept = String(inv.department);
        if (inv.phone) assignedPhone = String(inv.phone);
        matchedInviteId = inviteDoc.id;
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'user_invites');
    }
  }

  const newUserPayload: Record<string, any> = {
    uid: firebaseUser.uid,
    name: assignedName.slice(0, 150),
    email: emailLower.slice(0, 150),
    role: assignedRole,
    department: assignedDept.slice(0, 150),
    phone: assignedPhone.slice(0, 40),
    ...(matchedInviteId ? { inviteId: matchedInviteId } : {}),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  try {
    await setDoc(userDocRef, newUserPayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, userPath);
  }

  if (matchedInviteId) {
    try {
      await deleteDoc(doc(db, 'user_invites', matchedInviteId));
    } catch {
      // Non-fatal if invite cleanup fails
    }
  }

  const createdUser: User = {
    id: firebaseUser.uid,
    name: newUserPayload.name,
    email: newUserPayload.email,
    role: assignedRole,
    department: newUserPayload.department,
    phone: newUserPayload.phone,
    created_at: new Date().toISOString()
  };

  await ensureSeedData(createdUser);
  await writeAuditLog(createdUser, {
    action: 'LOGIN',
    target_type: 'Sistem',
    target_id: createdUser.id,
    target_name: 'Autentikasi Pengguna Google',
    details: `${createdUser.name} (${createdUser.email}) mendaftar & masuk sebagai ${createdUser.role}`
  });

  return createdUser;
}

export const api = {
  observeAuth(callback: (firebaseUser: FirebaseUser | null) => void): () => void {
    return onAuthStateChanged(auth, callback);
  },

  async loginWithGoogle(): Promise<User> {
    const credential = await signInWithPopup(auth, googleAuthProvider);
    const user = await syncFirebaseUserProfile(credential.user);
    await writeAuditLog(user, {
      action: 'LOGIN',
      target_type: 'Sistem',
      target_id: user.id,
      target_name: 'Autentikasi Pengguna Google',
      details: `${user.name} (${user.email}) masuk ke sistem sebagai ${user.role}`
    });
    return user;
  },

  async logout(currentUser?: User | null): Promise<void> {
    try {
      if (currentUser && auth.currentUser) {
        await writeAuditLog(currentUser, {
          action: 'LOGOUT',
          target_type: 'Sistem',
          target_id: currentUser.id,
          target_name: 'Autentikasi Pengguna Google',
          details: `${currentUser.name} (${currentUser.email}) keluar dari sistem`
        });
      }
    } catch {
      // Ignore audit error during logout
    } finally {
      await signOut(auth);
    }
  },

  subscribeRooms(
    onData: (rooms: Room[]) => void,
    onError: (err: Error) => void
  ): () => void {
    const q = query(collection(db, 'rooms'), where('campusId', '==', CAMPUS_ID));
    return onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs
          .map((d) => mapRoomDoc(d.id, d.data()))
          .sort((a, b) => a.name.localeCompare(b.name));
        onData(list);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, 'rooms');
        } catch (wrapped: any) {
          onError(wrapped);
        }
      }
    );
  },

  subscribeEvents(
    onData: (events: CampusEvent[]) => void,
    onError: (err: Error) => void
  ): () => void {
    const q = query(collection(db, 'events'), where('campusId', '==', CAMPUS_ID));
    return onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs
          .map((d) => mapEventDoc(d.id, d.data()))
          .sort((a, b) => `${a.tanggal} ${a.jam_mulai}`.localeCompare(`${b.tanggal} ${b.jam_mulai}`));
        onData(list);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, 'events');
        } catch (wrapped: any) {
          onError(wrapped);
        }
      }
    );
  },

  subscribeAuditLogs(
    onData: (logs: AuditLog[]) => void,
    onError: (err: Error) => void
  ): () => void {
    const q = query(collection(db, 'audit_logs'), where('campusId', '==', CAMPUS_ID));
    return onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs
          .map((d) => mapAuditLogDoc(d.id, d.data()))
          .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        onData(list);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, 'audit_logs');
        } catch (wrapped: any) {
          onError(wrapped);
        }
      }
    );
  },

  subscribeUsers(
    onData: (users: User[]) => void,
    onError: (err: Error) => void
  ): () => void {
    let activeUsers: User[] = [];
    let pendingInvites: User[] = [];

    const emitMerged = () => {
      const merged = [...activeUsers, ...pendingInvites].sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      onData(merged);
    };

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        activeUsers = snapshot.docs.map((d) => mapUserDoc(d.id, d.data(), false));
        emitMerged();
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, 'users');
        } catch (wrapped: any) {
          onError(wrapped);
        }
      }
    );

    const unsubInvites = onSnapshot(
      collection(db, 'user_invites'),
      (snapshot) => {
        pendingInvites = snapshot.docs.map((d) => mapUserDoc(d.id, d.data(), true));
        emitMerged();
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, 'user_invites');
        } catch (wrapped: any) {
          onError(wrapped);
        }
      }
    );

    return () => {
      unsubUsers();
      unsubInvites();
    };
  },

  async createRoom(room: Partial<Room>, actor: User): Promise<Room> {
    if (actor.role === 'Viewer') throw new Error('Akses ditolak.');
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Sesi login tidak valid.');

    const roomId = room.id || makeId('room');
    const payload = {
      id: roomId,
      campusId: CAMPUS_ID,
      name: String(room.name || '').trim().slice(0, 120),
      code: String(room.code || '').trim().slice(0, 40),
      capacity: Math.max(0, Math.min(50000, Number(room.capacity) || 0)),
      is_general: Boolean(room.is_general),
      floor: String(room.floor || 'Lantai 1').slice(0, 60),
      building: String(room.building || 'Gedung Pusat STEKOM').slice(0, 120),
      facilities: (room.facilities || []).slice(0, 30).map(String),
      status: room.status === 'Pemeliharaan' ? 'Pemeliharaan' : 'Tersedia',
      notes: String(room.notes || '').slice(0, 500),
      updatedByUid: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    try {
      await setDoc(doc(db, 'rooms', roomId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `rooms/${roomId}`);
    }

    await writeAuditLog(actor, {
      action: 'TAMBAH',
      target_type: 'Ruangan',
      target_id: roomId,
      target_name: payload.name,
      details: `Menambahkan ruangan baru ${payload.name} (${payload.code}), kapasitas ${payload.capacity}`
    });

    return mapRoomDoc(roomId, payload);
  },

  async updateRoom(id: string, room: Partial<Room>, actor: User): Promise<Room> {
    if (actor.role === 'Viewer') throw new Error('Akses ditolak.');
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Sesi login tidak valid.');

    const roomRef = doc(db, 'rooms', id);
    let snap;
    try {
      snap = await getDoc(roomRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `rooms/${id}`);
    }
    if (!snap.exists()) throw new Error('Ruangan tidak ditemukan');

    const prev = mapRoomDoc(snap.id, snap.data());
    const nextFields = {
      name: room.name !== undefined ? String(room.name).trim().slice(0, 120) : prev.name,
      code: room.code !== undefined ? String(room.code).trim().slice(0, 40) : prev.code,
      capacity: room.capacity !== undefined ? Math.max(0, Math.min(50000, Number(room.capacity) || 0)) : prev.capacity,
      is_general: room.is_general !== undefined ? Boolean(room.is_general) : prev.is_general,
      floor: room.floor !== undefined ? String(room.floor).slice(0, 60) : prev.floor,
      building: room.building !== undefined ? String(room.building).slice(0, 120) : prev.building,
      facilities: room.facilities !== undefined ? room.facilities.slice(0, 30).map(String) : prev.facilities,
      status: room.status !== undefined ? (room.status === 'Pemeliharaan' ? 'Pemeliharaan' : 'Tersedia') : prev.status,
      notes: room.notes !== undefined ? String(room.notes).slice(0, 500) : prev.notes || '',
      updatedByUid: uid,
      updatedAt: serverTimestamp()
    };

    try {
      await updateDoc(roomRef, nextFields);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${id}`);
    }

    await writeAuditLog(actor, {
      action: 'UBAH',
      target_type: 'Ruangan',
      target_id: id,
      target_name: nextFields.name,
      details: `Mengubah data ruangan ${nextFields.name}: kapasitas ${nextFields.capacity}, status ${nextFields.status}`
    });

    return { ...prev, ...nextFields };
  },

  async createEvent(
    eventData: Partial<CampusEvent>,
    actor: User,
    allEvents: CampusEvent[],
    rooms: Room[]
  ): Promise<CampusEvent> {
    if (actor.role === 'Viewer') throw new Error('Akses ditolak. Akun Viewer hanya dapat melihat data.');
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Sesi login tidak valid.');

    if (
      !eventData.nama_event?.trim() ||
      !eventData.tanggal ||
      !eventData.jam_mulai ||
      !eventData.jam_selesai ||
      !eventData.pic?.trim() ||
      !eventData.nomor_hp_pic?.trim()
    ) {
      throw new Error('Semua field wajib diisi lengkap.');
    }
    if (!eventData.ruangan_ids?.length) {
      throw new Error('Pilih minimal satu ruangan untuk event ini.');
    }
    if (!eventData.jumlah_peserta || Number(eventData.jumlah_peserta) <= 0) {
      throw new Error('Jumlah peserta harus berupa bilangan positif (> 0).');
    }
    if (eventData.jam_selesai <= eventData.jam_mulai) {
      throw new Error('Jam selesai harus lebih akhir daripada jam mulai.');
    }

    const status: CampusEvent['status'] = eventData.status || 'Menunggu Konfirmasi';
    const conflictResult = checkEventConflict(
      {
        tanggal: eventData.tanggal,
        jam_mulai: eventData.jam_mulai,
        jam_selesai: eventData.jam_selesai,
        ruangan_ids: eventData.ruangan_ids,
        status
      },
      allEvents,
      rooms
    );
    if (status === 'Scheduled' && conflictResult.hasConflict) {
      throw new Error(`Jadwal bentrok tidak dapat di-set ke Scheduled! ${conflictResult.conflicts[0].reason}`);
    }

    const eventId = makeId('evt');
    const payload = {
      id: eventId,
      campusId: CAMPUS_ID,
      nama_event: eventData.nama_event.trim().slice(0, 200),
      tanggal: eventData.tanggal,
      jam_mulai: eventData.jam_mulai,
      jam_selesai: eventData.jam_selesai,
      jumlah_peserta: Number(eventData.jumlah_peserta),
      pic: eventData.pic.trim().slice(0, 120),
      nomor_hp_pic: eventData.nomor_hp_pic.trim().slice(0, 40),
      ruangan_ids: eventData.ruangan_ids.slice(0, 25),
      status,
      catatan: eventData.catatan ? eventData.catatan.trim().slice(0, 1000) : '',
      created_by: actor.name.slice(0, 150),
      ownerUid: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    try {
      await setDoc(doc(db, 'events', eventId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `events/${eventId}`);
    }

    await writeAuditLog(actor, {
      action: 'TAMBAH',
      target_type: 'Event',
      target_id: eventId,
      target_name: payload.nama_event,
      details: `Membuat event "${payload.nama_event}" pada ${payload.tanggal} (${payload.jam_mulai} - ${payload.jam_selesai} WIB), status: ${payload.status}`
    });

    return mapEventDoc(eventId, payload);
  },

  async updateEvent(
    id: string,
    eventData: Partial<CampusEvent>,
    actor: User,
    allEvents: CampusEvent[],
    rooms: Room[]
  ): Promise<CampusEvent> {
    if (actor.role === 'Viewer') throw new Error('Akses ditolak.');
    const eventRef = doc(db, 'events', id);
    let snap;
    try {
      snap = await getDoc(eventRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `events/${id}`);
    }
    if (!snap.exists()) throw new Error('Event tidak ditemukan');

    const prev = mapEventDoc(snap.id, snap.data());
    if (prev.status === 'Dibatalkan' && actor.role !== 'Administrator') {
      throw new Error('Event yang sudah Dibatalkan hanya dapat diubah kembali oleh Administrator.');
    }

    const updatedTanggal = eventData.tanggal || prev.tanggal;
    const updatedStart = eventData.jam_mulai || prev.jam_mulai;
    const updatedEnd = eventData.jam_selesai || prev.jam_selesai;
    const updatedRooms = eventData.ruangan_ids || prev.ruangan_ids;
    const updatedStatus = eventData.status || prev.status;

    if (updatedEnd <= updatedStart) {
      throw new Error('Jam selesai harus lebih akhir daripada jam mulai.');
    }

    const conflictResult = checkEventConflict(
      {
        id: prev.id,
        tanggal: updatedTanggal,
        jam_mulai: updatedStart,
        jam_selesai: updatedEnd,
        ruangan_ids: updatedRooms,
        status: updatedStatus
      },
      allEvents,
      rooms
    );
    if (updatedStatus === 'Scheduled' && conflictResult.hasConflict) {
      throw new Error(`Jadwal bentrok tidak dapat di-set ke Scheduled! ${conflictResult.conflicts[0].reason}`);
    }

    const updatePayload = {
      nama_event: eventData.nama_event !== undefined ? eventData.nama_event.trim().slice(0, 200) : prev.nama_event,
      tanggal: updatedTanggal,
      jam_mulai: updatedStart,
      jam_selesai: updatedEnd,
      jumlah_peserta: eventData.jumlah_peserta !== undefined ? Number(eventData.jumlah_peserta) : prev.jumlah_peserta,
      pic: eventData.pic !== undefined ? eventData.pic.trim().slice(0, 120) : prev.pic,
      nomor_hp_pic: eventData.nomor_hp_pic !== undefined ? eventData.nomor_hp_pic.trim().slice(0, 40) : prev.nomor_hp_pic,
      ruangan_ids: updatedRooms.slice(0, 25),
      status: updatedStatus,
      catatan: eventData.catatan !== undefined ? eventData.catatan.trim().slice(0, 1000) : prev.catatan,
      updatedAt: serverTimestamp()
    };

    try {
      await updateDoc(eventRef, updatePayload);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `events/${id}`);
    }

    let action: AuditLog['action'] = 'UBAH';
    let details = `Memperbarui event "${updatePayload.nama_event}"`;
    if (prev.status !== updatedStatus) {
      if (updatedStatus === 'Scheduled') {
        action = 'KONFIRMASI';
        details = `Menetapkan event "${updatePayload.nama_event}" menjadi Scheduled (${prev.status} -> Scheduled)`;
      } else if (updatedStatus === 'Dibatalkan') {
        action = 'BATALKAN';
        details = `Membatalkan event "${updatePayload.nama_event}" (${prev.status} -> Dibatalkan)`;
      }
    }

    await writeAuditLog(actor, {
      action,
      target_type: 'Event',
      target_id: id,
      target_name: updatePayload.nama_event,
      details
    });

    return {
      ...prev,
      ...updatePayload,
      updated_at: new Date().toISOString()
    };
  },

  async deleteEvent(id: string, actor: User, eventName?: string): Promise<void> {
    if (actor.role === 'Viewer') throw new Error('Akses ditolak.');
    try {
      await deleteDoc(doc(db, 'events', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `events/${id}`);
    }

    await writeAuditLog(actor, {
      action: 'HAPUS',
      target_type: 'Event',
      target_id: id,
      target_name: eventName || id,
      details: `Menghapus event "${eventName || id}"`
    });
  },

  async createUser(
    userData: Partial<User>,
    actor: User
  ): Promise<User> {
    if (actor.role !== 'Administrator') throw new Error('Akses ditolak. Hanya Administrator.');
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Sesi login tidak valid.');

    const name = String(userData.name || '').trim().slice(0, 150);
    const email = String(userData.email || '').trim().toLowerCase().slice(0, 150);
    if (!name || !email) throw new Error('Nama lengkap dan email akun Google wajib diisi.');

    const role: UserRole =
      userData.role === 'Administrator' || userData.role === 'Operator' || userData.role === 'Viewer'
        ? userData.role
        : 'Operator';
    const department = String(userData.department || 'Universitas STEKOM').trim().slice(0, 150);
    const phone = String(userData.phone || '').trim().slice(0, 40);

    // Check if an active user with this email already signed in earlier
    let activeSnap;
    try {
      activeSnap = await getDocs(query(collection(db, 'users'), where('email', '==', email)));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
    }

    if (!activeSnap.empty) {
      const existingDoc = activeSnap.docs[0];
      try {
        await updateDoc(doc(db, 'users', existingDoc.id), {
          name,
          role,
          department,
          phone,
          updatedAt: serverTimestamp()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${existingDoc.id}`);
      }
      await writeAuditLog(actor, {
        action: 'UBAH',
        target_type: 'Pengguna',
        target_id: existingDoc.id,
        target_name: name,
        details: `Memperbarui hak akses pengguna aktif ${name} (${email}) menjadi ${role}`
      });
      return {
        id: existingDoc.id,
        name,
        email,
        role,
        department,
        phone,
        created_at: toIsoString(existingDoc.data().createdAt),
        isPendingInvite: false
      };
    }

    // Check if invite already exists for this email
    let invSnap;
    try {
      invSnap = await getDocs(query(collection(db, 'user_invites'), where('email', '==', email)));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'user_invites');
    }
    if (!invSnap.empty) {
      throw new Error(`Email "${email}" sudah terdaftar pada daftar undangan pengguna.`);
    }

    const inviteId = makeId('inv');
    const invitePayload = {
      id: inviteId,
      name,
      email,
      role,
      department,
      phone,
      createdByUid: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    try {
      await setDoc(doc(db, 'user_invites', inviteId), invitePayload);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `user_invites/${inviteId}`);
    }

    await writeAuditLog(actor, {
      action: 'TAMBAH',
      target_type: 'Pengguna',
      target_id: inviteId,
      target_name: name,
      details: `Mendaftarkan akses Google Login untuk ${name} (${email}) sebagai ${role}`
    });

    return {
      id: inviteId,
      name,
      email,
      role,
      department,
      phone,
      created_at: new Date().toISOString(),
      isPendingInvite: true
    };
  },

  async updateUser(
    id: string,
    data: Partial<User>,
    actor: User
  ): Promise<void> {
    if (actor.role !== 'Administrator') throw new Error('Akses ditolak.');

    const activeRef = doc(db, 'users', id);
    let activeSnap;
    try {
      activeSnap = await getDoc(activeRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${id}`);
    }

    if (activeSnap.exists()) {
      const prev = mapUserDoc(activeSnap.id, activeSnap.data(), false);
      const nextPayload = {
        name: data.name !== undefined ? data.name.trim().slice(0, 150) : prev.name,
        role: data.role || prev.role,
        department: data.department !== undefined ? data.department.trim().slice(0, 150) : prev.department,
        phone: data.phone !== undefined ? data.phone.trim().slice(0, 40) : prev.phone || '',
        updatedAt: serverTimestamp()
      };
      try {
        await updateDoc(activeRef, nextPayload);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${id}`);
      }
      await writeAuditLog(actor, {
        action: 'UBAH',
        target_type: 'Pengguna',
        target_id: id,
        target_name: nextPayload.name,
        details: `Mengubah data & peran pengguna ${nextPayload.name} menjadi ${nextPayload.role}`
      });
      return;
    }

    const inviteRef = doc(db, 'user_invites', id);
    let inviteSnap;
    try {
      inviteSnap = await getDoc(inviteRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `user_invites/${id}`);
    }
    if (!inviteSnap.exists()) {
      throw new Error('Pengguna tidak ditemukan.');
    }

    const prevInv = mapUserDoc(inviteSnap.id, inviteSnap.data(), true);
    const nextInvitePayload = {
      name: data.name !== undefined ? data.name.trim().slice(0, 150) : prevInv.name,
      email: data.email !== undefined ? data.email.trim().toLowerCase().slice(0, 150) : prevInv.email,
      role: data.role || prevInv.role,
      department: data.department !== undefined ? data.department.trim().slice(0, 150) : prevInv.department,
      phone: data.phone !== undefined ? data.phone.trim().slice(0, 40) : prevInv.phone || '',
      updatedAt: serverTimestamp()
    };

    try {
      await updateDoc(inviteRef, nextInvitePayload);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `user_invites/${id}`);
    }
    await writeAuditLog(actor, {
      action: 'UBAH',
      target_type: 'Pengguna',
      target_id: id,
      target_name: nextInvitePayload.name,
      details: `Mengubah pra-registrasi pengguna ${nextInvitePayload.name} (${nextInvitePayload.email}) menjadi ${nextInvitePayload.role}`
    });
  },

  async deleteUser(id: string, actor: User, targetName?: string): Promise<void> {
    if (actor.role !== 'Administrator') throw new Error('Akses ditolak.');
    if (id === actor.id) throw new Error('Anda tidak dapat menghapus akun Anda sendiri.');

    const activeRef = doc(db, 'users', id);
    let activeSnap;
    try {
      activeSnap = await getDoc(activeRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${id}`);
    }

    if (activeSnap.exists()) {
      try {
        await deleteDoc(activeRef);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${id}`);
      }
    } else {
      try {
        await deleteDoc(doc(db, 'user_invites', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `user_invites/${id}`);
      }
    }

    await writeAuditLog(actor, {
      action: 'HAPUS',
      target_type: 'Pengguna',
      target_id: id,
      target_name: targetName || id,
      details: `Menghapus akses pengguna ${targetName || id}`
    });
  },

  async resetData(actor: User): Promise<void> {
    if (actor.role !== 'Administrator') {
      throw new Error('Akses ditolak. Hanya Administrator yang dapat me-reset data.');
    }
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Sesi login tidak valid.');

    try {
      const [roomsSnap, eventsSnap] = await Promise.all([
        getDocs(query(collection(db, 'rooms'), where('campusId', '==', CAMPUS_ID))),
        getDocs(query(collection(db, 'events'), where('campusId', '==', CAMPUS_ID)))
      ]);

      const batch = writeBatch(db);
      roomsSnap.docs.forEach((d) => batch.delete(d.ref));
      eventsSnap.docs.forEach((d) => batch.delete(d.ref));

      for (const room of INITIAL_ROOMS) {
        batch.set(doc(db, 'rooms', room.id), {
          id: room.id,
          campusId: CAMPUS_ID,
          name: room.name,
          code: room.code,
          capacity: room.capacity,
          is_general: room.is_general,
          floor: room.floor,
          building: room.building,
          facilities: room.facilities,
          status: room.status,
          notes: room.notes || '',
          updatedByUid: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      for (const ev of INITIAL_EVENTS) {
        batch.set(doc(db, 'events', ev.id), {
          id: ev.id,
          campusId: CAMPUS_ID,
          nama_event: ev.nama_event,
          tanggal: ev.tanggal,
          jam_mulai: ev.jam_mulai,
          jam_selesai: ev.jam_selesai,
          jumlah_peserta: ev.jumlah_peserta,
          pic: ev.pic,
          nomor_hp_pic: ev.nomor_hp_pic,
          ruangan_ids: ev.ruangan_ids,
          status: ev.status,
          catatan: ev.catatan || '',
          created_by: ev.created_by,
          ownerUid: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'reset_data');
    }

    await writeAuditLog(actor, {
      action: 'PENGATURAN',
      target_type: 'Sistem',
      target_id: 'sys-reset',
      target_name: 'Database Reset',
      details: 'Melakukan reset data ruangan dan event contoh Universitas STEKOM ke Cloud Firestore'
    });
  }
};
