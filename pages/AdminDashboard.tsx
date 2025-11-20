import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getMembers, deleteMember, getActiveCredential, resolveMediaUrl } from '../services/memberService';
import { Member, Credential } from '../types';
import { Plus, Trash2, Edit, QrCode, Search, Eye, ExternalLink, Filter, MapPin, CalendarClock, AlertOctagon, Printer, Image as ImageIcon } from 'lucide-react';
import { QrGenerator } from '../components/QrGenerator';
import { CredentialCanvas } from '../components/CredentialCanvas';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [members, setMembers] = useState<Member[]>([]);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedCredential, setSelectedCredential] = useState<Credential | null>(null);
  
  // Modal View Mode
  const [modalMode, setModalMode] = useState<'SIMPLE_QR' | 'DESIGNER'>('SIMPLE_QR');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const data = await getMembers();
        setMembers(data);
      } catch (err) {
        console.error('Error loading members', err);
        alert('No se pudo cargar la lista de miembros. Verifica la API.');
      }
    };
    void fetchMembers();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este miembro? Esta acción no se puede deshacer.')) {
      return;
    }
    try {
      await deleteMember(id);
      const refreshed = await getMembers();
      setMembers(refreshed);
    } catch (err) {
      console.error('Error deleting member', err);
      alert('No se pudo eliminar. Revisa la API.');
    }
  };

  const handleShowQr = (member: Member) => {
    // Get the active credential
    const active = getActiveCredential(member);
    if (!active) {
        alert("Este miembro no tiene una credencial activa. Por favor edite el miembro y emita una nueva credencial.");
        return;
    }
    setSelectedMember(member);
    setSelectedCredential(active);
    setModalMode('SIMPLE_QR');
    setIsQrModalOpen(true);
  };

  const handlePreview = (id: string, token?: string) => {
    let url = window.location.href.split('#')[0] + '#/member/' + id;
    if (token) {
      url += `?token=${token}`;
    }
    window.open(url, '_blank');
  };

  const isExpired = (dateStr?: string) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  };

  const filteredMembers = members.filter(m => {
    const matchesSearch = 
      m.firstName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      m.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.colony && m.colony.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || m.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getQrUrl = (member: Member, credential: Credential) => {
      return `${window.location.origin}${window.location.pathname}#/member/${member.id}?token=${credential.token}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div className="flex items-center gap-3">
           <img src="/logo.png" alt="Logo" className="w-12 h-12 rounded-full border-2 border-orange-200 shadow-sm" />
           <div>
             <h1 className="text-3xl font-bold text-slate-800">Directorio de Miembros</h1>
             <div className="h-1 w-20 bg-orange-500 rounded mt-2"></div>
             <p className="text-slate-500 mt-1">Gestión centralizada de credenciales y accesos.</p>
           </div>
        </div>
        <Link 
          to="/admin/create"
          className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-orange-200 transition-all font-bold hover:-translate-y-0.5"
        >
          <Plus size={20} /> Nuevo Miembro
        </Link>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="text-slate-400" size={20} />
          </div>
          <input 
            type="text"
            placeholder="Buscar por nombre, ID o colonia..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 text-slate-900 rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter size={20} className="text-slate-400" />
            <select 
                className="px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:ring-2 focus:ring-orange-500 outline-none cursor-pointer"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
            >
                <option value="ALL">Todos los estados</option>
                <option value="ACTIVE">Solo Activos</option>
                <option value="INACTIVE">Solo Inactivos</option>
            </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-orange-50 text-orange-800 text-xs uppercase tracking-wider border-b border-orange-100">
                <th className="p-4 font-bold">Miembro</th>
                <th className="p-4 font-bold">Rol / Cargo</th>
                <th className="p-4 font-bold">Domicilio</th>
                <th className="p-4 font-bold">Vigencia Actual</th>
                <th className="p-4 font-bold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMembers.map(member => {
                 const activeCred = getActiveCredential(member);
                 const expired = activeCred ? isExpired(activeCred.expirationDate) : true;
                 
                 return (
                <tr key={member.id} className="hover:bg-blue-50 transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                        <img 
                            src={resolveMediaUrl(member.photoUrl)} 
                            alt="" 
                            className="w-10 h-10 rounded-full object-cover bg-slate-200 border-2 border-white shadow-sm"
                        />
                        <div>
                            <div className="font-bold text-slate-900">{member.firstName} {member.lastName}</div>
                            <div className="text-xs text-slate-400 font-mono">ID: {member.id}</div>
                        </div>
                    </div>
                  </td>
                  <td className="p-4">
                     <span className="inline-block bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-bold border border-slate-200">
                        {member.role}
                     </span>
                  </td>
                  <td className="p-4 text-sm text-slate-600 max-w-xs">
                     <div className="flex items-start gap-1.5">
                        <MapPin size={14} className="mt-0.5 text-orange-400 shrink-0" />
                        <span>
                           {member.street ? (
                             <>
                                {member.street} {member.houseNumber}
                                {member.colony && <span className="block text-xs text-sky-600 font-medium">{member.colony}</span>}
                             </>
                           ) : (
                             <span className="italic text-slate-400">Sin dirección</span>
                           )}
                        </span>
                     </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1">
                        {!activeCred ? (
                            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded w-fit">Sin credencial</span>
                        ) : (
                            <>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold w-fit border ${
                                    member.status === 'INACTIVE' ? 'bg-gray-100 text-gray-600 border-gray-200' :
                                    expired ? 'bg-red-100 text-red-800 border-red-200' : 'bg-green-100 text-green-800 border-green-200'
                                }`}>
                                {member.status === 'INACTIVE' ? 'Baja' : expired ? 'Vencida' : 'Vigente'}
                                </span>
                                <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                                    <CalendarClock size={12} /> {activeCred.expirationDate}
                                </span>
                            </>
                        )}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        {activeCred && (
                            <>
                                <button 
                                onClick={() => handlePreview(member.id, activeCred.token)} 
                                title="Vista Previa"
                                className="p-2 text-sky-600 hover:bg-sky-100 rounded-lg transition-colors"
                                >
                                <Eye size={18} />
                                </button>
                                <button 
                                onClick={() => handleShowQr(member)} 
                                title="Imprimir / QR"
                                className="p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition-colors"
                                >
                                <QrCode size={18} />
                                </button>
                            </>
                        )}
                        <Link 
                          to={`/admin/edit/${member.id}`} 
                          title="Editar / Historial"
                          className="p-2 text-orange-500 hover:bg-orange-100 hover:text-orange-700 rounded-lg transition-colors"
                        >
                          <Edit size={18} />
                        </Link>
                        <button 
                          onClick={() => handleDelete(member.id)} 
                          title="Eliminar"
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                    </div>
                  </td>
                </tr>
              )})}
              
              {filteredMembers.length === 0 && (
                <tr>
                    <td colSpan={5} className="p-12 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400">
                            <Search size={48} className="mb-4 opacity-20" />
                            <p className="text-lg font-medium text-slate-600">No se encontraron miembros</p>
                            <p className="text-sm">Intenta ajustar los filtros de búsqueda.</p>
                        </div>
                    </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Footer of table */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
            <span>Mostrando {filteredMembers.length} registro(s)</span>
            <span>Sistema de Credenciales v3.0</span>
        </div>
      </div>

      {/* Modal: QR Code Display */}
      {isQrModalOpen && selectedMember && selectedCredential && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:p-0 print:bg-white print:absolute overflow-y-auto">
          <div className={`bg-white rounded-xl p-8 shadow-2xl flex flex-col items-center w-full print:shadow-none print:w-full print:max-w-none relative my-auto ${modalMode === 'DESIGNER' ? 'max-w-4xl' : 'max-w-sm'}`}>
            
            <button 
                onClick={() => setIsQrModalOpen(false)} 
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 print:hidden"
            >
                <ExternalLink size={20} className="rotate-180" />
            </button>

            <h3 className="text-xl font-bold text-slate-800 mb-4 print:hidden">Credencial Digital</h3>
            
            {/* Tabs */}
            <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-lg w-full print:hidden">
                <button 
                    onClick={() => setModalMode('SIMPLE_QR')}
                    className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors flex justify-center gap-2 ${modalMode === 'SIMPLE_QR' ? 'bg-white text-orange-600 shadow' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <QrCode size={16} /> Ver QR
                </button>
                <button 
                    onClick={() => setModalMode('DESIGNER')}
                    className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors flex justify-center gap-2 ${modalMode === 'DESIGNER' ? 'bg-white text-orange-600 shadow' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <ImageIcon size={16} /> Diseñador
                </button>
            </div>

            {/* CONTENT MODE: SIMPLE QR */}
            {modalMode === 'SIMPLE_QR' && (
                <>
                    <div className="border-4 border-slate-900 p-4 rounded-xl bg-white text-center mt-2">
                        <div className="mb-2 font-bold text-slate-900 uppercase tracking-wider text-sm">Escanee para validar</div>
                        <QrGenerator 
                        value={getQrUrl(selectedMember, selectedCredential)} 
                        size={200} 
                        />
                        <div className="mt-2 text-xs text-slate-500 font-mono">{selectedMember.id}</div>
                    </div>
                    
                    <div className="mt-6 text-center print:hidden">
                        <p className="font-medium text-slate-900">{selectedMember.firstName} {selectedMember.lastName}</p>
                        <p className="text-xs text-slate-500 mt-1">Vence: {selectedCredential.expirationDate}</p>
                        <div className="flex justify-center gap-2 mt-4">
                            <button 
                                onClick={() => handlePreview(selectedMember.id, selectedCredential.token)}
                                className="px-3 py-1.5 border border-slate-300 rounded text-slate-600 text-sm hover:bg-slate-50"
                            >
                                Probar Link
                            </button>
                            <button onClick={() => window.print()} className="px-3 py-1.5 bg-slate-900 text-white rounded text-sm hover:bg-slate-800 flex items-center gap-2">
                                <Printer size={16} /> Imprimir QR
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* CONTENT MODE: DESIGNER */}
            {modalMode === 'DESIGNER' && (
                <CredentialCanvas 
                    member={selectedMember} 
                    credential={selectedCredential}
                    qrValue={getQrUrl(selectedMember, selectedCredential)}
                />
            )}

          </div>
        </div>
      )}
    </div>
  );
};
