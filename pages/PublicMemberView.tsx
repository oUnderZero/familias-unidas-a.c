import React, { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { Member, Credential } from '../types';
import { getMemberById } from '../services/memberService';
import { CheckCircle2, XCircle, AlertTriangle, Droplet, Phone, Calendar, MapPin, ShieldAlert, Timer, History, Users } from 'lucide-react';

export const PublicMemberView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [member, setMember] = useState<Member | null | undefined>(undefined);
  const [scannedCredential, setScannedCredential] = useState<Credential | null>(null);
  const [errorType, setErrorType] = useState<'NOT_FOUND' | 'INVALID_QR' | null>(null);

  useEffect(() => {
    if (id) {
      const found = getMemberById(id);
      
      if (!found) {
        setMember(null);
        setErrorType('NOT_FOUND');
        return;
      }

      // VALIDATE TOKEN AGAINST HISTORY
      // Parse ?token=XYZ from URL
      const searchParams = new URLSearchParams(location.search);
      const urlToken = searchParams.get('token');
      
      if (!urlToken) {
          setMember(found);
          setErrorType('INVALID_QR');
          return;
      }

      // Find the specific credential in history
      const matchingCredential = found.credentials.find(c => c.token === urlToken);

      if (matchingCredential) {
         setMember(found);
         setScannedCredential(matchingCredential);
         setErrorType(null);
      } else {
         // Token doesn't exist in history at all (Fake QR)
         setMember(found);
         setErrorType('INVALID_QR');
      }
    }
  }, [id, location.search]);

  if (member === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-slate-200 rounded-full mb-4"></div>
          <div className="h-4 w-32 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!member && errorType === 'NOT_FOUND') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
        <div className="bg-red-100 p-6 rounded-full mb-6">
            <XCircle className="text-red-500 w-16 h-16" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Miembro No Encontrado</h1>
        <p className="text-slate-600 max-w-xs">
          El código QR escaneado no corresponde a un miembro activo en nuestra base de datos.
        </p>
      </div>
    );
  }

  if (errorType === 'INVALID_QR') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
        <div className="bg-slate-200 p-6 rounded-full mb-6">
            <ShieldAlert className="text-slate-500 w-16 h-16" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">QR Desconocido</h1>
        <p className="text-slate-600 max-w-xs">
          Este código QR no es reconocido por el sistema.
        </p>
      </div>
    );
  }

  // --- CREDENTIAL STATUS LOGIC ---
  // Check validity of the *specific* credential scanned
  const isTimeExpired = scannedCredential && new Date(scannedCredential.expirationDate) < new Date();
  const isRevoked = scannedCredential?.status === 'REVOKED';
  const isInactiveStatus = scannedCredential?.status === 'EXPIRED' || scannedCredential?.status === 'REVOKED'; // Explicit status in DB
  
  // A credential is valid ONLY if it is ACTIVE status AND date is not expired
  const isValid = scannedCredential?.status === 'ACTIVE' && !isTimeExpired && member?.status === 'ACTIVE';
  
  let statusColor = 'bg-green-600';
  let statusText = 'VIGENTE';
  let StatusIcon = CheckCircle2;

  if (member?.status === 'INACTIVE') {
      statusColor = 'bg-gray-500';
      statusText = 'MIEMBRO INACTIVO';
      StatusIcon = XCircle;
  } else if (isRevoked) {
      statusColor = 'bg-orange-500';
      statusText = 'REEMPLAZADA';
      StatusIcon = History;
  } else if (isTimeExpired || isInactiveStatus) {
      statusColor = 'bg-red-500';
      statusText = 'VENCIDA';
      StatusIcon = AlertTriangle;
  }

  const hasAddress = member?.street || member?.colony;

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 flex justify-center font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 relative">
        
        {/* Header Background - Orange/Yellow Gradient to match Logo */}
        <div className="h-36 bg-gradient-to-r from-orange-600 via-amber-500 to-yellow-400 relative overflow-hidden">
           {/* Decorative Circles */}
           <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-xl"></div>
           <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full blur-lg"></div>

           <div className="absolute top-4 left-4 flex items-center gap-2 text-white">
              <div className="bg-white/20 p-1.5 rounded-full">
                <Users size={16} />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-[10px] font-bold tracking-widest opacity-90">FAMILIAS UNIDAS</span>
                <span className="text-[8px] tracking-wider opacity-75">PRESA DE LOS REYES A.C.</span>
              </div>
           </div>
           <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 text-white shadow-sm ${statusColor}`}>
              <StatusIcon size={12} />
              {statusText}
           </div>
        </div>

        {/* Profile Photo */}
        <div className="relative -mt-16 flex justify-center">
            <div className="p-1.5 bg-white rounded-full shadow-lg">
                <img 
                    src={member?.photoUrl} 
                    alt={`${member?.firstName}`} 
                    className="w-32 h-32 rounded-full object-cover border-4 border-slate-50 bg-slate-200"
                />
            </div>
        </div>

        {/* Main Info */}
        <div className="text-center pt-4 pb-6 px-6 border-b border-slate-100">
            <h1 className="text-2xl font-extrabold text-slate-800">{member?.firstName} {member?.lastName}</h1>
            <p className="text-orange-600 font-bold mt-1 uppercase tracking-wider text-sm">{member?.role}</p>
            <p className="text-slate-400 text-xs mt-2 font-mono">ID: {member?.id}</p>
        </div>

        {/* --- ALERTS BASED ON SPECIFIC CREDENTIAL --- */}
        
        {/* Case 1: Revoked (Replaced by new one) */}
        {isRevoked && (
            <div className="bg-orange-50 border-y border-orange-100 p-4 flex items-start gap-3 text-orange-800 text-sm">
                <History className="shrink-0 mt-0.5" size={20} />
                <div>
                    <p className="font-bold">Credencial Antigua</p>
                    <p>
                        Este código QR pertenece a una credencial que fue reemplazada el <strong>{scannedCredential?.expirationDate}</strong> (aprox). 
                        Por favor solicite al miembro su credencial más reciente.
                    </p>
                </div>
            </div>
        )}

        {/* Case 2: Time Expired */}
        {(isTimeExpired || scannedCredential?.status === 'EXPIRED') && !isRevoked && (
            <div className="bg-red-50 border-y border-red-100 p-4 flex items-start gap-3 text-red-800 text-sm">
                <AlertTriangle className="shrink-0 mt-0.5" size={20} />
                <div>
                    <p className="font-bold">Vigencia Expirada</p>
                    <p>
                        Esta credencial expiró el <strong>{scannedCredential?.expirationDate}</strong>.
                        Ya no es válida para identificación o accesos.
                    </p>
                </div>
            </div>
        )}

        {/* Details Grid */}
        <div className="p-6 space-y-4">
            
            <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="p-2 bg-white rounded-lg shadow-sm text-slate-600">
                    <Calendar size={20} />
                </div>
                <div className="w-full flex justify-between">
                    <div>
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wide">Vigencia</p>
                        <p className={`font-bold text-lg ${!isValid ? 'text-slate-400 line-through decoration-red-500' : 'text-slate-800'}`}>
                            {scannedCredential?.expirationDate}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wide">Registro</p>
                        <p className="text-slate-800 font-medium">{member?.joinDate}</p>
                    </div>
                </div>
            </div>

            {/* Address Section */}
            {hasAddress && (
                <div className="flex items-start gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="p-2 bg-white rounded-lg shadow-sm text-sky-600 mt-1">
                        <MapPin size={20} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wide">Domicilio</p>
                        <p className="text-slate-800 font-medium text-sm leading-relaxed">
                           {member?.street} {member?.houseNumber ? `#${member?.houseNumber}` : ''}
                           {member?.colony && <br />}
                           {member?.colony && <span className="text-orange-600 font-semibold">{member?.colony}</span>}
                           {member?.city && <br />}
                           {member?.city && <span className="text-slate-500 text-xs">{member?.city}</span>}
                        </p>
                    </div>
                </div>
            )}

            {member?.bloodType && (
                <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="p-2 bg-white rounded-lg shadow-sm text-red-500">
                        <Droplet size={20} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wide">Tipo de Sangre</p>
                        <p className="text-slate-800 font-bold">{member?.bloodType}</p>
                    </div>
                </div>
            )}

            {member?.emergencyContact && (
                 <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="p-2 bg-white rounded-lg shadow-sm text-green-600">
                        <Phone size={20} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wide">Contacto Emergencia</p>
                        <p className="text-slate-800 font-bold text-lg">{member?.emergencyContact}</p>
                    </div>
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 text-center border-t border-slate-200">
            <p className="text-xs text-slate-400">
                Validación Oficial • Familias Unidas A.C.
            </p>
        </div>

      </div>
    </div>
  );
};