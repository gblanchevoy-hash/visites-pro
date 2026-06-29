import { RendezVous, Patient, FraisKilometriques, StatsMensuelles } from '@/types';
import { formatDate, formatDateLong } from './dates';

// ==================== PDF ====================
export async function exportTourneePDF(rdvs: RendezVous[], date: Date, kmTotal: number, fraisTotal: number) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // En-tête
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, 210, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Tournée du ' + formatDateLong(date), 14, 20);

  // Résumé
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`${rdvs.length} visite(s)  •  ${kmTotal.toFixed(1)} km  •  ${fraisTotal.toFixed(2)} €`, 14, 40);

  // Tableau
  const rows = rdvs.map((rdv, i) => [
    `${i + 1}`,
    rdv.heure_debut,
    rdv.heure_fin,
    `${rdv.patient?.prenom} ${rdv.patient?.nom}`,
    `${rdv.patient?.adresse}, ${rdv.patient?.code_postal} ${rdv.patient?.ville}`,
    rdv.patient?.telephone || '-',
    rdv.statut,
  ]);

  autoTable(doc, {
    startY: 50,
    head: [['#', 'Début', 'Fin', 'Patient', 'Adresse', 'Téléphone', 'Statut']],
    body: rows,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [79, 70, 229] },
    alternateRowStyles: { fillColor: [240, 240, 255] },
  });

  // Pied
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Généré le ${formatDate(new Date())} - Page ${i}/${pageCount}`, 14, 287);
  }

  doc.save(`tournee-${formatDate(date, 'yyyy-MM-dd')}.pdf`);
}

export async function exportStatsPDF(stats: StatsMensuelles[], annee: number) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const doc = new jsPDF();

  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, 210, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text(`Rapport annuel ${annee}`, 14, 20);

  const rows = stats.map((s) => [
    s.mois,
    s.nb_visites.toString(),
    `${s.km_total.toFixed(1)} km`,
    `${Math.floor(s.duree_trajet_min / 60)}h${(s.duree_trajet_min % 60).toString().padStart(2, '0')}`,
    `${s.frais_total.toFixed(2)} €`,
  ]);

  autoTable(doc, {
    startY: 40,
    head: [['Mois', 'Visites', 'Kilométrage', 'Temps trajet', 'Frais']],
    body: rows,
    headStyles: { fillColor: [79, 70, 229] },
  });

  doc.save(`rapport-annuel-${annee}.pdf`);
}

// ==================== EXCEL ====================
export async function exportTourneeExcel(rdvs: RendezVous[], date: Date) {
  const XLSX = await import('xlsx');
  const ws_data = [
    ['Heure début', 'Heure fin', 'Prénom', 'Nom', 'Adresse', 'Code postal', 'Ville', 'Téléphone', 'Notes', 'Statut'],
    ...rdvs.map((rdv) => [
      rdv.heure_debut,
      rdv.heure_fin,
      rdv.patient?.prenom || '',
      rdv.patient?.nom || '',
      rdv.patient?.adresse || '',
      rdv.patient?.code_postal || '',
      rdv.patient?.ville || '',
      rdv.patient?.telephone || '',
      rdv.notes || '',
      rdv.statut,
    ]),
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  XLSX.utils.book_append_sheet(wb, ws, 'Tournée');
  XLSX.writeFile(wb, `tournee-${formatDate(date, 'yyyy-MM-dd')}.xlsx`);
}

export async function exportStatsExcel(stats: StatsMensuelles[], annee: number) {
  const XLSX = await import('xlsx');
  const ws_data = [
    ['Mois', 'Visites', 'Kilométrage', 'Temps trajet (min)', 'Frais (€)'],
    ...stats.map((s) => [s.mois, s.nb_visites, s.km_total, s.duree_trajet_min, s.frais_total]),
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  XLSX.utils.book_append_sheet(wb, ws, `Stats ${annee}`);
  XLSX.writeFile(wb, `rapport-${annee}.xlsx`);
}
