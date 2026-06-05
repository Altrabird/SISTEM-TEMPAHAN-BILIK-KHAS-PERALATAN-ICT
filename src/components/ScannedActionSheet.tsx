import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Sparkles, Info, PackageCheck, DoorOpen, Laptop, AlertTriangle,
  Lock, CalendarDays, User, Search as SearchIcon
} from 'lucide-react';
import { Asset, Booking, Profile, Resource } from '../types';
import { isAssetLocked, isResourceLocked, lockReasonOf } from '../lib/locks';
import { isHiddenFromUser } from '../lib/visibility';
import { todayLocalISO } from '../lib/dates';
import { TelegramJoinPill } from './TelegramJoinPill';

interface Props {
  open: boolean;
  scannedId: string | null;
  assets: Asset[];
  rooms: Resource[];
  equipment: Resource[];
  bookings: Booking[];
  profile: Profile | null;
  isAdmin: boolean;
  onClose: () => void;
  onLoan: (asset: Asset) => void;
  onReturn: (booking: Booking, asset: Asset | null) => void;
  onBookRoom: (room: Resource) => void;
  onScanAgain: () => void;
}

/**
 * Smart action sheet shown after a QR scan.
 *
 * Resolves the scanned id to either an Asset, an Equipment category, or a
 * Room, then renders context-aware action buttons. The actions surface
 * depends on:
 *   - asset state (available / on loan to me / on loan to others / locked / damaged)
 *   - whether the current user is admin
 *   - resource type (asset vs room)
 */
export function ScannedActionSheet({
  open, scannedId, assets, rooms, equipment, bookings, profile, isAdmin,
  onClose, onLoan, onReturn, onBookRoom, onScanAgain,
}: Props) {
  const resolved = useMemo(() => {
    if (!scannedId) return { kind: 'none' as const };
    const asset = assets.find((a) => a.id === scannedId);
    if (asset) {
      // Hide from non-admin if admin marked the asset (or its category) hidden
      const category = equipment.find((e) => e.id === asset.resourceId) ?? null;
      if (isHiddenFromUser(asset, isAdmin) || isHiddenFromUser(category, isAdmin)) {
        return { kind: 'hidden' as const, kindLabel: 'Peralatan ICT' as const };
      }
      // Active loan = confirmed booking that hasn't been returned/cancelled
      const today = todayLocalISO();
      const activeLoan = bookings.find((b) =>
        b.resourceId === asset.id &&
        b.status === 'confirmed' &&
        b.date <= today &&
        (b.returnDate ?? b.date) >= today,
      ) ?? null;
      return { kind: 'asset' as const, asset, category, activeLoan };
    }
    const room = rooms.find((r) => r.id === scannedId);
    if (room) {
      if (isHiddenFromUser(room, isAdmin)) {
        return { kind: 'hidden' as const, kindLabel: 'Bilik Khas' as const };
      }
      return { kind: 'room' as const, room };
    }
    const cat = equipment.find((e) => e.id === scannedId);
    if (cat) {
      if (isHiddenFromUser(cat, isAdmin)) {
        return { kind: 'hidden' as const, kindLabel: 'Kategori Peralatan' as const };
      }
      return { kind: 'category' as const, category: cat };
    }
    return { kind: 'unknown' as const, raw: scannedId };
  }, [scannedId, assets, rooms, equipment, bookings, isAdmin]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ type: 'spring', damping: 24, stiffness: 220 }}
            className="relative bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
          >
            <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white">
                  <PackageCheck size={16} />
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-purple-600">Hasil Imbasan</p>
                  <h2 className="text-sm font-bold tracking-tight text-slate-800">Apa Nak Buat?</h2>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                title="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Asset path */}
              {resolved.kind === 'asset' && (
                <AssetCard
                  asset={resolved.asset}
                  category={resolved.category}
                  activeLoan={resolved.activeLoan}
                  profile={profile}
                  isAdmin={isAdmin}
                  onLoan={() => { onLoan(resolved.asset); onClose(); }}
                  onReturn={() => {
                    if (resolved.activeLoan) onReturn(resolved.activeLoan, resolved.asset);
                    onClose();
                  }}
                />
              )}

              {/* Room path */}
              {resolved.kind === 'room' && (
                <RoomCard
                  room={resolved.room}
                  onBook={() => { onBookRoom(resolved.room); onClose(); }}
                />
              )}

              {/* Equipment category path (less common but possible if QR encodes the category) */}
              {resolved.kind === 'category' && (
                <CategoryCard category={resolved.category} />
              )}

              {/* Hidden from this user — admin marked it private */}
              {resolved.kind === 'hidden' && (
                <HiddenCard kindLabel={resolved.kindLabel} />
              )}

              {/* Unknown id */}
              {resolved.kind === 'unknown' && (
                <UnknownCard raw={resolved.raw} />
              )}

              {/* Footer: try again */}
              <button
                onClick={onScanAgain}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
              >
                <SearchIcon size={12} /> Imbas Lagi
              </button>

              {/* Telegram opt-in CTA — hidden when env explicitly disables it */}
              <TelegramJoinPill />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Sub-components — one per resolved kind
// ---------------------------------------------------------------------------

function AssetCard({
  asset, category, activeLoan, profile, isAdmin, onLoan, onReturn,
}: {
  asset: Asset;
  category: Resource | null;
  activeLoan: Booking | null;
  profile: Profile | null;
  isAdmin: boolean;
  onLoan: () => void;
  onReturn: () => void;
}) {
  const locked = isAssetLocked(asset) || (category ? isResourceLocked(category) : false);
  const lockReason = isAssetLocked(asset)
    ? lockReasonOf(asset)
    : (category && isResourceLocked(category) ? lockReasonOf(category) : null);
  const damaged = asset.status === 'maintenance';

  const onLoanToMe = activeLoan !== null && profile !== null && activeLoan.userId === profile.id;
  const onLoanToOthers = activeLoan !== null && profile !== null && activeLoan.userId !== profile.id;

  let stateLabel: string;
  let stateTone: 'good' | 'warn' | 'bad' | 'info';
  if (locked) { stateLabel = 'Dikunci oleh pentadbir'; stateTone = 'bad'; }
  else if (damaged) { stateLabel = 'Dalam penyelenggaraan'; stateTone = 'warn'; }
  else if (onLoanToMe) { stateLabel = 'Sedang dipinjam oleh anda'; stateTone = 'info'; }
  else if (onLoanToOthers) { stateLabel = `Sedang dipinjam oleh ${activeLoan!.userName}`; stateTone = 'warn'; }
  else { stateLabel = 'Tersedia untuk dipinjam'; stateTone = 'good'; }

  return (
    <div className="space-y-4">
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex items-center gap-3">
        {asset.imageUrl ? (
          <img src={asset.imageUrl} alt={asset.name} referrerPolicy="no-referrer" className="w-14 h-14 rounded-lg object-cover shrink-0" />
        ) : (
          <div className="w-14 h-14 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
            <Laptop size={22} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-800 truncate">{asset.name}</p>
          <p className="text-[10px] font-mono text-blue-600 uppercase truncate">{asset.serialNumber}</p>
          {category && (
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">{category.name}</p>
          )}
        </div>
      </div>

      <StatePill tone={stateTone} label={stateLabel} icon={
        locked ? Lock : damaged ? AlertTriangle : onLoanToOthers ? User : onLoanToMe ? PackageCheck : Sparkles
      } />

      {locked && lockReason && (
        <div className="bg-rose-50 border border-rose-100 rounded-lg p-3 flex gap-2">
          <Lock size={14} className="text-rose-500 shrink-0 mt-0.5" />
          <p className="text-[11px] font-bold text-rose-700 leading-relaxed">{lockReason}</p>
        </div>
      )}

      {activeLoan && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-[11px] text-blue-800 space-y-0.5">
          <p className="flex items-center gap-1.5 font-bold">
            <CalendarDays size={12} /> {activeLoan.date} → {activeLoan.returnDate ?? activeLoan.date}
          </p>
          <p className="text-blue-700/80">Tujuan: {activeLoan.purpose}</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {/* Primary actions vary by state */}
        {!locked && !damaged && !activeLoan && (
          <ActionButton primary onClick={onLoan} icon={Sparkles}>
            Pinjam Sekarang
          </ActionButton>
        )}
        {onLoanToMe && (
          <ActionButton primary onClick={onReturn} icon={PackageCheck}>
            Pulangkan Sekarang
          </ActionButton>
        )}
        {onLoanToOthers && isAdmin && (
          <ActionButton primary onClick={onReturn} icon={PackageCheck}>
            Rekod Pemulangan (Admin)
          </ActionButton>
        )}
        {/* Always available */}
        <ActionButton onClick={onLoan} icon={Info} hidden={!locked && !damaged && !activeLoan}>
          Lihat / Cuba Pinjam
        </ActionButton>
      </div>
    </div>
  );
}

function RoomCard({ room, onBook }: { room: Resource; onBook: () => void }) {
  const locked = isResourceLocked(room);
  const reason = locked ? lockReasonOf(room) : null;
  return (
    <div className="space-y-4">
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex items-center gap-3">
        {room.imageUrl ? (
          <img src={room.imageUrl} alt={room.name} referrerPolicy="no-referrer" className="w-14 h-14 rounded-lg object-cover shrink-0" />
        ) : (
          <div className="w-14 h-14 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <DoorOpen size={22} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-800 truncate">{room.name}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">Bilik Khas</p>
        </div>
      </div>
      <StatePill
        tone={locked ? 'bad' : 'good'}
        icon={locked ? Lock : Sparkles}
        label={locked ? 'Dikunci oleh pentadbir' : 'Boleh ditempah'}
      />
      {locked && reason && (
        <div className="bg-rose-50 border border-rose-100 rounded-lg p-3 flex gap-2">
          <Lock size={14} className="text-rose-500 shrink-0 mt-0.5" />
          <p className="text-[11px] font-bold text-rose-700 leading-relaxed">{reason}</p>
        </div>
      )}
      {!locked && (
        <ActionButton primary onClick={onBook} icon={Sparkles}>
          Tempah Bilik Ini
        </ActionButton>
      )}
    </div>
  );
}

function CategoryCard({ category }: { category: Resource }) {
  return (
    <div className="space-y-3">
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex items-center gap-3">
        <div className="w-14 h-14 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
          <Laptop size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-800 truncate">{category.name}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">Kategori Peralatan</p>
        </div>
      </div>
      <p className="text-[11px] text-slate-500 leading-relaxed">
        Kod QR ini menunjuk kategori, bukan unit individu. Pergi ke <strong>Peralatan ICT</strong> untuk pilih unit yang ingin dipinjam.
      </p>
    </div>
  );
}

function UnknownCard({ raw }: { raw: string }) {
  return (
    <div className="space-y-3 text-center py-4">
      <div className="w-14 h-14 mx-auto rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
        <AlertTriangle size={22} />
      </div>
      <p className="text-sm font-bold text-slate-800">Kod QR Tidak Dikenali</p>
      <p className="text-[11px] text-slate-500 leading-relaxed">
        Sistem tidak menemui unit, bilik atau kategori sepadan dengan kod ini.
      </p>
      <p className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded inline-block">{raw}</p>
    </div>
  );
}

/** Admin marked this resource as hidden from regular users. We don't
 *  reveal the resource's name or details — just a friendly "tidak
 *  tersedia" message so the user doesn't think the QR is broken. */
function HiddenCard({ kindLabel }: { kindLabel: string }) {
  return (
    <div className="space-y-3 text-center py-4">
      <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 text-slate-500 flex items-center justify-center">
        <AlertTriangle size={22} />
      </div>
      <p className="text-sm font-bold text-slate-800">Tidak Tersedia</p>
      <p className="text-[11px] text-slate-500 leading-relaxed">
        {kindLabel} ini tidak tersedia untuk tempahan/pinjaman pada masa ini.
        Sila hubungi pentadbir jika anda perlukan akses.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared little pieces
// ---------------------------------------------------------------------------

function StatePill({
  tone, label, icon: Icon,
}: {
  tone: 'good' | 'warn' | 'bad' | 'info';
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
  const styles = {
    good: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    warn: 'bg-amber-50 text-amber-700 border-amber-100',
    bad:  'bg-rose-50 text-rose-700 border-rose-100',
    info: 'bg-blue-50 text-blue-700 border-blue-100',
  }[tone];
  return (
    <div className={`rounded-lg border px-3 py-2 flex items-center gap-2 ${styles}`}>
      <Icon size={14} className="shrink-0" />
      <p className="text-xs font-bold flex-1">{label}</p>
    </div>
  );
}

function ActionButton({
  primary, onClick, icon: Icon, children, hidden,
}: {
  primary?: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
  hidden?: boolean;
}) {
  if (hidden) return null;
  // `w-full` is critical here — <button> defaults to inline-block, so
  // without it the button shrinks to its text width and looks
  // awkwardly left-aligned inside the action sheet (see the "TEMPAH
  // BILIK INI" screenshot bug).
  if (primary) {
    return (
      <button
        onClick={onClick}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg shadow-purple-500/25 active:scale-[0.98] flex items-center justify-center gap-2"
      >
        <Icon size={14} /> {children}
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      className="w-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2"
    >
      <Icon size={14} /> {children}
    </button>
  );
}
