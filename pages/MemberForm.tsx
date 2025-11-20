import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getMemberById, saveMember, resolveMediaUrl } from '../services/memberService';
import { Member, Credential } from '../types';
import { Save, ArrowLeft, User, Briefcase, Image as ImageIcon, MapPin, Upload, BadgeCheck, Plus, History, AlertOctagon, CheckCircle2 } from 'lucide-react';

// Utility to generate random ID for new members
const generateId = () => Math.random().toString(36).substr(2, 9).toUpperCase();
const generateToken = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

export const MemberForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState<Partial<Member>>({
    status: 'ACTIVE',
    photoUrl: '',
    curp: '',
    postalCode: '',
    joinDate: new Date().toISOString().split('T')[0],
    credentials: []
  });

  // UI State for Expiration Date (Default +1 year)
  const [newExpirationDate, setNewExpirationDate] = useState<string>(
     new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
  );

  useEffect(() => {
    const loadMember = async () => {
      if (id) {
        try {
          const existing = await getMemberById(id);
          if (existing) {
            setFormData({
                ...existing,
                credentials: existing.credentials || []
            });
          } else {
            navigate('/admin');
          }
        } catch (err) {
          console.error('Error loading member', err);
          alert('No se pudo cargar el miembro. Verifica la API.');
          navigate('/admin');
        }
      } else {
          setFormData(prev => ({
              ...prev,
              photoUrl: ''
          }));
      }
    };
    void loadMember();
  }, [id, navigate]);

  // Helper to show temporary success message
  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.firstName && formData.lastName) {
      const finalData = {
          ...formData,
          photoUrl: formData.photoUrl || 'https://ui-avatars.com/api/?background=random&name=' + formData.firstName + '+' + formData.lastName
      };
      
      // Ensure at least one credential exists for new members if none added manually
      if (!finalData.credentials || finalData.credentials.length === 0) {
          finalData.credentials = [{
              id: generateId(),
              token: generateToken(),
              issueDate: new Date().toISOString().split('T')[0],
              expirationDate: newExpirationDate,
              status: 'ACTIVE'
          }];
      }

      try {
        setIsSaving(true);
        await saveMember(finalData as Member, Boolean(id));
        navigate('/admin');
      } catch (err) {
        console.error('Error saving member', err);
        alert('No se pudo guardar. Verifica la API.');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleChange = (field: keyof Member, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleIssueNewCredential = () => {
    // 1. Get current list safe copy
    const currentCredentials = formData.credentials ? [...formData.credentials] : [];
    
    // 2. Mark all existing ACTIVE credentials as REVOKED
    // We explicitly cast the string status to the specific union type to avoid TS errors
    const updatedHistory = currentCredentials.map(c => {
        if (c.status === 'ACTIVE') {
            return { ...c, status: 'REVOKED' as const };
        }
        return c;
    });

    // 3. Create new Credential
    const newCred: Credential = {
        id: generateId(),
        token: generateToken(),
        issueDate: new Date().toISOString().split('T')[0],
        expirationDate: newExpirationDate,
        status: 'ACTIVE'
    };

    // 4. Update State
    const newCredentialsList = [newCred, ...updatedHistory];
    
    setFormData(prev => ({
        ...prev,
        credentials: newCredentialsList
    }));

    showSuccess("¡Nueva credencial generada! Aparece en la lista inferior.");
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        handleChange('photoUrl', result);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Helper to get active credential for display
  const activeCredential = formData.credentials?.find(c => c.status === 'ACTIVE');

  // Common input class
  const inputClass = "w-full p-2.5 bg-slate-50 border border-slate-300 text-slate-900 rounded-lg focus:bg-white focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition-colors placeholder-slate-400";

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 pb-24">
      <div className="flex items-center gap-4 mb-8">
        <button 
          type="button"
          onClick={() => navigate('/admin')} 
          className="p-2 rounded-full hover:bg-slate-200 transition-colors text-slate-600"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
            <h1 className="text-3xl font-bold text-slate-900">
                {id ? 'Editar Miembro' : 'Registrar Nuevo Miembro'}
            </h1>
            <div className="h-1 w-16 bg-orange-500 rounded mt-1"></div>
        </div>
      </div>

      {/* Success Toast */}
      {successMsg && (
        <div className="fixed top-24 right-4 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-xl animate-bounce flex items-center gap-2">
            <CheckCircle2 size={20} /> {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Photo & Status */}
        <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <ImageIcon size={18} className="text-orange-500" /> Fotografía
                </h3>
                <div className="flex flex-col items-center">
                    <div 
                        onClick={triggerFileInput}
                        className="w-40 h-40 rounded-full overflow-hidden bg-slate-100 mb-4 border-4 border-slate-50 shadow-inner relative group cursor-pointer hover:border-orange-200 transition-all"
                    >
                        {formData.photoUrl ? (
                            <img src={resolveMediaUrl(formData.photoUrl)} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                                <User size={48} />
                                <span className="text-xs mt-1">Sin foto</span>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Upload className="text-white" size={24} />
                        </div>
                    </div>
                    
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        onChange={handleImageUpload} 
                    />

                    <button 
                        type="button"
                        onClick={triggerFileInput}
                        className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2"
                    >
                        <Upload size={14} /> Subir desde PC
                    </button>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-4">Estado General</h3>
                <div className="space-y-3">
                    <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white hover:border-green-200 cursor-pointer transition-all">
                        <input 
                            type="radio" 
                            name="status" 
                            className="text-green-600 focus:ring-green-500"
                            checked={formData.status === 'ACTIVE'}
                            onChange={() => handleChange('status', 'ACTIVE')}
                        />
                        <div>
                            <span className="block font-medium text-slate-900">Activo</span>
                        </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white hover:border-red-200 cursor-pointer transition-all">
                        <input 
                            type="radio" 
                            name="status" 
                            className="text-red-600 focus:ring-red-500"
                            checked={formData.status === 'INACTIVE'}
                            onChange={() => handleChange('status', 'INACTIVE')}
                        />
                        <div>
                            <span className="block font-medium text-slate-900">Inactivo (Baja)</span>
                        </div>
                    </label>
                </div>
            </div>
        </div>

        {/* Right Column: Fields */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* Personal Info */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                    <User size={18} className="text-orange-500" /> Información Personal
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nombre(s)</label>
                        <input 
                            required
                            className={inputClass}
                            value={formData.firstName || ''}
                            onChange={(e) => handleChange('firstName', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Apellidos</label>
                        <input 
                            required
                            className={inputClass}
                            value={formData.lastName || ''}
                            onChange={(e) => handleChange('lastName', e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Address Info */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                    <MapPin size={18} className="text-orange-500" /> Domicilio
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Ciudad</label>
                        <input 
                            placeholder="Ej. Guadalajara"
                            className={inputClass}
                            value={formData.city || ''}
                            onChange={(e) => handleChange('city', e.target.value)}
                        />
                    </div>
                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Código Postal</label>
                        <input 
                            placeholder="Ej. 58000"
                            className={inputClass}
                            value={formData.postalCode || ''}
                            onChange={(e) => handleChange('postalCode', e.target.value)}
                        />
                    </div>
                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Calle</label>
                        <input 
                            placeholder="Ej. Calle Independencia"
                            className={inputClass}
                            value={formData.street || ''}
                            onChange={(e) => handleChange('street', e.target.value)}
                        />
                    </div>
                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Número</label>
                        <input 
                            placeholder="Ej. 123 Int 4"
                            className={inputClass}
                            value={formData.houseNumber || ''}
                            onChange={(e) => handleChange('houseNumber', e.target.value)}
                        />
                    </div>
                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Colonia</label>
                        <input 
                            placeholder="Ej. Centro"
                            className={inputClass}
                            value={formData.colony || ''}
                            onChange={(e) => handleChange('colony', e.target.value)}
                        />
                    </div>
                </div>
            </div>

             {/* Org & Medical Info */}
             <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                    <Briefcase size={18} className="text-orange-500" /> Datos Organización
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
                        <input 
                            required
                            className={inputClass}
                            value={formData.role || ''}
                            onChange={(e) => handleChange('role', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Sangre</label>
                         <select 
                            className={inputClass}
                            value={formData.bloodType || ''}
                            onChange={(e) => handleChange('bloodType', e.target.value)}
                        >
                            <option value="">--</option>
                            <option value="O+">O+</option>
                            <option value="O-">O-</option>
                            <option value="A+">A+</option>
                            <option value="A-">A-</option>
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">CURP</label>
                        <input 
                            className={inputClass}
                            value={formData.curp || ''}
                            onChange={(e) => handleChange('curp', e.target.value.toUpperCase())}
                            placeholder="16-18 caracteres"
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tel. Emergencia</label>
                        <input 
                            className={inputClass}
                            value={formData.emergencyContact || ''}
                            onChange={(e) => handleChange('emergencyContact', e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Credential Management Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-6 pb-2 border-b border-slate-100">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <BadgeCheck size={18} className="text-orange-500" /> Gestión de Credenciales
                    </h3>
                    {activeCredential ? (
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full font-bold border border-green-200">
                            Vigente
                        </span>
                    ) : (
                         <span className="px-3 py-1 bg-red-100 text-red-700 text-xs rounded-full font-bold border border-red-200">
                            Sin Vigencia
                        </span>
                    )}
                </div>
                
                {/* Issue New Section - Improved Layout */}
                <div className="bg-sky-50 p-6 rounded-xl mb-6 border border-sky-100 shadow-sm">
                    <div className="flex flex-col gap-4">
                        <p className="text-sm font-bold text-sky-900">Emitir Nueva Credencial</p>
                        <div className="flex flex-col sm:flex-row gap-4 items-end w-full">
                            <div className="w-full sm:w-1/2">
                                <label className="block text-xs font-semibold text-sky-700 mb-1 uppercase tracking-wider">Fecha de Vencimiento</label>
                                <input 
                                    type="date"
                                    className="w-full p-2.5 bg-white border border-sky-200 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none text-sky-900 font-medium"
                                    value={newExpirationDate}
                                    onChange={(e) => setNewExpirationDate(e.target.value)}
                                />
                            </div>
                            <div className="w-full sm:w-1/2">
                                <button 
                                    type="button"
                                    onClick={handleIssueNewCredential}
                                    className="w-full p-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 active:scale-95"
                                >
                                    <Plus size={18} /> 
                                    <span>Generar Credencial</span>
                                </button>
                            </div>
                        </div>
                        <p className="text-xs text-sky-600 flex items-center gap-1 mt-1">
                            <AlertOctagon size={14} className="shrink-0" />
                            Nota: Al dar clic, se invalida automáticamente la credencial anterior.
                        </p>
                    </div>
                </div>

                {/* History Table */}
                <h4 className="text-sm font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                    <History size={14} /> Historial de Emisiones
                </h4>
                <div className="overflow-hidden rounded-lg border border-slate-200">
                    <table className="w-full text-left text-sm">
                        {/* Header styled for visibility: light grey bg, black text */}
                        <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                            <tr>
                                <th className="p-3">Emisión</th>
                                <th className="p-3">Vence</th>
                                <th className="p-3">Token</th>
                                <th className="p-3 text-center">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white text-slate-800">
                            {formData.credentials?.map((cred) => (
                                <tr key={cred.id} className={cred.status === 'ACTIVE' ? 'bg-green-50' : ''}>
                                    <td className="p-3">{cred.issueDate}</td>
                                    <td className="p-3">{cred.expirationDate}</td>
                                    <td className="p-3 font-mono text-xs text-slate-400">
                                        {cred.token.substring(0, 8)}...
                                    </td>
                                    <td className="p-3 text-center">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold border uppercase ${
                                            cred.status === 'ACTIVE' ? 'bg-green-100 text-green-700 border-green-200' :
                                            cred.status === 'REVOKED' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                                            'bg-red-100 text-red-700 border-red-200'
                                        }`}>
                                            {cred.status === 'REVOKED' ? 'Reemplazada' : 
                                             cred.status === 'EXPIRED' ? 'Vencida' : 'Activa'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {(!formData.credentials || formData.credentials.length === 0) && (
                                <tr>
                                    <td colSpan={4} className="p-6 text-center text-slate-400 italic bg-slate-50">
                                        No hay historial. Genere una nueva credencial arriba.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex justify-end gap-4 pt-4">
                <button 
                    type="button" 
                    onClick={() => navigate('/admin')}
                    className="px-6 py-3 rounded-lg text-slate-600 font-medium hover:bg-slate-100 transition-colors"
                >
                    Cancelar
                </button>
                <button 
                    type="submit"
                    disabled={isSaving}
                    className="px-8 py-3 rounded-lg bg-orange-600 text-white font-bold hover:bg-orange-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    <Save size={20} /> {isSaving ? 'Guardando...' : 'Guardar Todo'}
                </button>
            </div>

        </div>
      </form>
    </div>
  );
};
