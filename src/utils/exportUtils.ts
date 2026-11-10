import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { CampusEvent, Room } from '../types';
import { formatDateIndo, formatDateFullIndo } from './conflictDetector';

export interface ReportFilterMeta {
  title: string;
  periodLabel: string;
  printedBy: string;
  printedRole: string;
  campusName?: string;
  campusAddress?: string;
}

export function exportEventsToExcel(
  events: CampusEvent[],
  rooms: Room[],
  fileName: string = 'Laporan_Event_STEKOM.xlsx'
) {
  const roomMap = new Map(rooms.map((r) => [r.id, r.name]));

  const worksheetData = events.map((ev, index) => {
    const roomNames = (ev.ruangan_ids || []).map((id) => roomMap.get(id) || id).join(', ');
    return {
      'No': index + 1,
      'Nama Event': ev.nama_event,
      'Tanggal': formatDateIndo(ev.tanggal),
      'Jam Mulai': ev.jam_mulai + ' WIB',
      'Jam Selesai': ev.jam_selesai + ' WIB',
      'Ruangan': roomNames,
      'Jumlah Peserta': ev.jumlah_peserta,
      'PIC (Penanggung Jawab)': ev.pic,
      'Kontak PIC': ev.nomor_hp_pic,
      'Status': ev.status,
      'Catatan': ev.catatan || '-',
      'Dibuat Oleh': ev.created_by,
      'Tanggal Pengajuan': ev.created_at ? formatDateIndo(ev.created_at.split('T')[0]) : '-'
    };
  });

  const ws = XLSX.utils.json_to_sheet(worksheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data Event');

  // Set column widths
  ws['!cols'] = [
    { wch: 6 },
    { wch: 35 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 28 },
    { wch: 15 },
    { wch: 25 },
    { wch: 16 },
    { wch: 20 },
    { wch: 30 },
    { wch: 22 },
    { wch: 16 }
  ];

  XLSX.writeFile(wb, fileName);
}

export function exportEventsToPdf(
  events: CampusEvent[],
  rooms: Room[],
  meta: ReportFilterMeta
) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const roomMap = new Map(rooms.map((r) => [r.id, r.name]));

  // Brand Colors
  const navyBlue = [10, 37, 64]; // #0A2540
  const mediumBlue = [37, 99, 235]; // #2563EB
  const lightBg = [240, 247, 255]; // #F0F7FF

  // 1. Header & Kop Surat Resmi STEKOM
  doc.setFillColor(navyBlue[0], navyBlue[1], navyBlue[2]);
  doc.rect(0, 0, 297, 6, 'F'); // Top accent banner

  // STEKOM Campus Logo Graphic in pure vector
  doc.setFillColor(37, 99, 235);
  doc.roundedRect(14, 12, 14, 14, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('STEKOM', 15.5, 21);

  // Institution Text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(navyBlue[0], navyBlue[1], navyBlue[2]);
  doc.text('UNIVERSITAS SAINS & TEKNOLOGI KOMPUTER (STEKOM)', 33, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text('Kampus Pusat: Jl. Majapahit No. 605, Pedurungan Kidul, Semarang, Jawa Tengah 50192', 33, 23);
  doc.text('Telp: (024) 6723456 | Website: https://stekom.ac.id | Email: event@stekom.ac.id', 33, 27);

  // Dividing double line
  doc.setDrawColor(200, 210, 225);
  doc.setLineWidth(0.8);
  doc.line(14, 31, 283, 31);
  doc.setLineWidth(0.2);
  doc.line(14, 32, 283, 32);

  // 2. Report Title & Meta
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(navyBlue[0], navyBlue[1], navyBlue[2]);
  doc.text(meta.title.toUpperCase(), 14, 39);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(70, 70, 70);
  doc.text(`Periode Laporan : ${meta.periodLabel}`, 14, 44);

  const todayStr = new Date().toISOString().split('T')[0];
  const printDateIndo = formatDateFullIndo(todayStr);
  doc.text(`Tanggal Cetak  : Semarang, ${printDateIndo} (WIB)`, 210, 44);

  // 3. Stats Summary Boxes
  const totalEvents = events.length;
  const scheduledCount = events.filter((e) => e.status === 'Scheduled').length;
  const pendingCount = events.filter((e) => e.status === 'Menunggu Konfirmasi').length;
  const cancelledCount = events.filter((e) => e.status === 'Dibatalkan').length;
  const totalParticipants = events.reduce((sum, e) => sum + (e.jumlah_peserta || 0), 0);

  // Mini summary cards
  const boxY = 48;
  const boxW = 51;
  const boxH = 14;

  const summaryBoxes = [
    { label: 'Total Event', val: `${totalEvents} Agenda`, color: [15, 23, 42] },
    { label: 'Scheduled', val: `${scheduledCount} Event`, color: [16, 122, 57] },
    { label: 'Menunggu', val: `${pendingCount} Event`, color: [180, 100, 0] },
    { label: 'Dibatalkan', val: `${cancelledCount} Event`, color: [190, 20, 20] },
    { label: 'Total Peserta', val: `${totalParticipants.toLocaleString('id-ID')} Orang`, color: [37, 99, 235] }
  ];

  summaryBoxes.forEach((b, idx) => {
    const x = 14 + idx * (boxW + 3);
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.setDrawColor(210, 225, 245);
    doc.roundedRect(x, boxY, boxW, boxH, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(90, 105, 120);
    doc.text(b.label, x + 3, boxY + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(b.color[0], b.color[1], b.color[2]);
    doc.text(b.val, x + 3, boxY + 11);
  });

  // 4. Data Table
  const tableData = events.map((ev, index) => {
    const roomNames = (ev.ruangan_ids || []).map((id) => roomMap.get(id) || id).join(', ');
    return [
      String(index + 1),
      ev.nama_event,
      formatDateIndo(ev.tanggal),
      `${ev.jam_mulai} - ${ev.jam_selesai}`,
      roomNames,
      `${ev.jumlah_peserta} org`,
      `${ev.pic}\n(${ev.nomor_hp_pic})`,
      ev.status
    ];
  });

  autoTable(doc, {
    startY: 66,
    head: [
      ['No', 'Nama Event / Kegiatan', 'Tanggal', 'Jam (WIB)', 'Ruangan STEKOM', 'Peserta', 'PIC & Kontak', 'Status']
    ],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1
    },
    headStyles: {
      fillColor: [10, 37, 64],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 62 },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 24, halign: 'center' },
      4: { cellWidth: 55 },
      5: { cellWidth: 20, halign: 'center' },
      6: { cellWidth: 44 },
      7: { cellWidth: 32, halign: 'center', fontStyle: 'bold' }
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 7) {
        const val = String(data.cell.raw);
        if (val === 'Scheduled') {
          data.cell.styles.textColor = [16, 122, 57];
        } else if (val === 'Menunggu Konfirmasi') {
          data.cell.styles.textColor = [180, 100, 0];
        } else if (val === 'Dibatalkan') {
          data.cell.styles.textColor = [190, 20, 20];
        }
      }
    },
    margin: { left: 14, right: 14 }
  });

  // 5. Signature Section
  const finalY = (doc as any).lastAutoTable?.finalY || 160;
  let sigY = finalY + 12;

  // Add new page if table ran down to the bottom
  if (sigY > 165) {
    doc.addPage();
    sigY = 25;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);

  // Left side signature: Operator / Dicetak oleh
  doc.text('Petugas Pelapor / Operator:', 25, sigY);
  doc.text(meta.printedRole || 'Bagian Sarpras & Event', 25, sigY + 5);
  doc.setLineWidth(0.4);
  doc.setDrawColor(150, 150, 150);
  doc.line(25, sigY + 28, 85, sigY + 28);
  doc.setFont('helvetica', 'bold');
  doc.text(meta.printedBy || 'Rahmat Hidayat, S.Kom', 25, sigY + 33);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('NIP / ID: STEKOM-2026-OP', 25, sigY + 37);

  // Right side signature: Mengetahui Rektor / Kepala Biro
  doc.setFontSize(9);
  doc.text(`Semarang, ${printDateIndo}`, 200, sigY);
  doc.text('Mengetahui, Kepala Biro Umum & Sarana Prasarana', 200, sigY + 5);
  doc.line(200, sigY + 28, 275, sigY + 28);
  doc.setFont('helvetica', 'bold');
  doc.text('Dr. Ir. Agus Wibowo, M.Kom', 200, sigY + 33);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('NIDN: 0628047501', 200, sigY + 37);

  // Footer footer mark
  doc.setFontSize(7.5);
  doc.setTextColor(140, 140, 140);
  doc.text(
    'Dokumen ini dicetak otomatis dari Sistem STEKOM Campus Event Management & Room Booking (Universitas STEKOM)',
    14,
    198
  );

  doc.save(`${meta.title.replace(/\s+/g, '_')}_${todayStr}.pdf`);
}
