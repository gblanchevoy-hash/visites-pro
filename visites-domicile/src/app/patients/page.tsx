'use client';
import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import EmptyState from '@/components/ui/EmptyState';
import { PatientsSkeleton } from '@/components/ui/Skeleton';
import Topbar from '@/components/layout/Topbar';
import { useAppStore } from '@/lib/stores/appStore';
import { supabase } from '@/lib/supabase/client';
import { Patient } from '@/types';
import { cn } from '@/lib/utils/cn';
import toast from 'react-hot-toast';
import { Search, Plus, Edit2, Trash2, Phone, Mail, MapPin, X } from 'lucide-react';
import PatientModal from '@/components/patients/PatientModal';

export default function PatientsPage() {
  const { patients, setPatients, user, pushHistory } = useAppStore();
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editPatient, setEditPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(false);

  const categories = Array.from(new Set(patients.map((p) => p.categorie).filter(Boolean))) as string[];

  const filtered = patients.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !q || `${p.nom} ${p.prenom} ${p.adresse} ${p.ville}`.toLowerCase().includes(q);
    const matchCat = !filterCat || p.categorie === filterCat;
    return matchSearch && matchCat;
  });

  const handleDelete = async (p: Patient) => {
    if (!confirm(`Supprimer ${p.prenom} ${p.nom} ?`)) return;
    const { error } = await supabase.from('patients').update({ actif: false }).eq('id', p.id);
    if (error) { toast.error('Erreur suppression'); return; }
    setPatients(patients.filter((pat) => pat.id !== p.id));
    pushHistory({ type: 'DELETE_PATIENT', patient: p });
    toast.success('Patient supprimé');
  };

  const openNew = () => { setEditPatient(null); setShowModal(true); };
  const openEdit = (p: Patient) => { setEditPatient(p); setShowModal(true); };

  const FREQ_COLORS: Record<string, string> = {
    quotidien: 'bg-red-100 text-red-700',
    hebdomadaire: 'bg-orange-100 text-orange-700',
    bihebdomadaire: 'bg-amber-100 text-amber-700',
    mensuel: 'bg-blue-100 text-blue-700',
  };

  return (
    <AppShell>
      <Topbar
        title="Patients"
        subtitle={`${patients.length} patient${patients.length > 1 ? 's' : ''} enregistré${patients.length > 1 ? 's' : ''}`}
        actions={
          <button onClick={openNew} style={{ display:"flex",alignItems:"center",gap:"6px",padding:"10px 20px",background:"#2563EB",color:"#fff",border:"none",borderRadius:"10px",fontSize:"14px",fontWeight:600,cursor:"pointer" }}>
            <Plus className="w-4 h-4" /> Nouveau patient
          </button>
        }
      />

      <div style={{ flex:1,padding:"32px",background:"#F8FAFC",overflow:"auto" }}>
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Rechercher un patient…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {categories.length > 0 && (
            <select
              className="input w-auto"
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
            >
              <option value="">Toutes catégories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          {(search || filterCat) && (
            <button onClick={() => { setSearch(''); setFilterCat(''); }} className="btn-ghost">
              <X className="w-4 h-4" /> Effacer
            </button>
          )}
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Search className="w-7 h-7" />
            </div>
            <p className="font-medium text-slate-600">Aucun patient trouvé</p>
            <p className="text-sm mt-1">
              {patients.length === 0
                ? 'Ajoutez votre premier patient'
                : 'Modifiez vos critères de recherche'}
            </p>
            {patients.length === 0 && (
              <button onClick={openNew} className="btn-primary mt-4">
                <Plus className="w-4 h-4" /> Ajouter un patient
              </button>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((patient) => (
              <div key={patient.id} className="card p-4 flex flex-col gap-3 hover:shadow-card-hover transition-shadow">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                        style={{ backgroundColor: patient.photo_url ? 'transparent' : (patient.couleur || '#6366f1') }}>
                        {patient.photo_url
                          ? <img src={patient.photo_url} alt={patient.prenom} className="w-full h-full object-cover rounded-full" />
                          : <>{patient.prenom[0]}{patient.nom[0]}</>}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{patient.prenom} {patient.nom}</p>
                        {patient.categorie && (
                          <span className="badge bg-slate-100 text-slate-600 text-[10px]">{patient.categorie}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(patient)} className="p-2.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(patient)} className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 text-sm">
                  <div className="flex items-start gap-2 text-slate-600">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" />
                    <span className="line-clamp-2">{patient.adresse}, {patient.code_postal} {patient.ville}</span>
                  </div>
                  {patient.telephone && (
                    <a href={`tel:${patient.telephone}`} className="flex items-center gap-2 text-slate-600 hover:text-primary-600">
                      <Phone className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      {patient.telephone}
                    </a>
                  )}
                  {patient.email && (
                    <a href={`mailto:${patient.email}`} className="flex items-center gap-2 text-slate-600 hover:text-primary-600 truncate">
                      <Mail className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">{patient.email}</span>
                    </a>
                  )}
                </div>

                {patient.frequence_visite && (
                  <span className={cn('badge w-fit', FREQ_COLORS[patient.frequence_visite] || 'bg-slate-100 text-slate-600')}>
                    {patient.frequence_visite}
                  </span>
                )}

                {!patient.lat && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    ⚠️ Adresse non géolocalisée
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <PatientModal
          patient={editPatient}
          onClose={() => setShowModal(false)}
        />
      )}
    </AppShell>
  );
}
