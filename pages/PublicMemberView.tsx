import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { Member, Credential } from "../types";
import { fetchPublicMember, resolveMediaUrl } from "../services/memberService";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Droplet,
  Phone,
  Calendar,
  MapPin,
  ShieldAlert,
  History,
  Users,
  Shield,
} from "lucide-react";

export const PublicMemberView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [member, setMember] = useState<Member | null | undefined>(undefined);
  const [scannedCredential, setScannedCredential] = useState<Credential | null>(
    null
  );
  const [errorType, setErrorType] = useState<"NOT_FOUND" | "INVALID_QR" | null>(
    null
  );

  useEffect(() => {
    if (!id) return;
    const searchParams = new URLSearchParams(location.search);
    const urlToken = searchParams.get("token") || undefined;

    const load = async () => {
      try {
        const res = await fetchPublicMember(id, urlToken);
        setMember(res.member);
        setScannedCredential(res.credential);
        setErrorType(res.errorType);
      } catch (err) {
        console.error("Error fetching public member", err);
        setMember(null);
        setErrorType("NOT_FOUND");
      }
    };

    void load();
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

  if (!member && errorType === "NOT_FOUND") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
        <div className="bg-red-100 p-6 rounded-full mb-6">
          <XCircle className="text-red-500 w-16 h-16" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          Miembro No Encontrado
        </h1>
        <p className="text-slate-600 max-w-xs">
          El código QR escaneado no corresponde a un miembro activo en nuestra
          base de datos.
        </p>
      </div>
    );
  }

  if (errorType === "INVALID_QR") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
        <div className="bg-slate-200 p-6 rounded-full mb-6">
          <ShieldAlert className="text-slate-500 w-16 h-16" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          QR Desconocido
        </h1>
        <p className="text-slate-600 max-w-xs">
          Este código QR no es reconocido por el sistema.
        </p>
      </div>
    );
  }

  // --- CREDENTIAL STATUS LOGIC ---
  // Check validity of the *specific* credential scanned
  const isTimeExpired =
    scannedCredential &&
    new Date(scannedCredential.expirationDate) < new Date();
  const isRevoked = scannedCredential?.status === "REVOKED";
  const isInactiveStatus =
    scannedCredential?.status === "EXPIRED" ||
    scannedCredential?.status === "REVOKED"; // Explicit status in DB

  // A credential is valid ONLY if it is ACTIVE status AND date is not expired
  const isValid =
    scannedCredential?.status === "ACTIVE" &&
    !isTimeExpired &&
    member?.status === "ACTIVE";

  let statusColor = "bg-green-600";
  let statusText = "VIGENTE";
  let StatusIcon = CheckCircle2;

  if (member?.status === "INACTIVE") {
    statusColor = "bg-gray-500";
    statusText = "MIEMBRO INACTIVO";
    StatusIcon = XCircle;
  } else if (isRevoked) {
    statusColor = "bg-orange-500";
    statusText = "REEMPLAZADA";
    StatusIcon = History;
  } else if (isTimeExpired || isInactiveStatus) {
    statusColor = "bg-red-500";
    statusText = "VENCIDA";
    StatusIcon = AlertTriangle;
  }

  const hasAddress = member?.street || member?.colony;

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4 flex justify-center font-sans">
      <div className="w-full max-w-md  relative">
        {/* Header minimal */}
        <div className="h-24 rounded-t-2xl bg-gradient-to-r from-orange-600 via-amber-500 to-yellow-400 relative overflow-hidden flex items-center px-5 mx-5 ">
          <div className="flex items-center gap-3 text-white">
            <div className="bg-white/20 p-2 rounded-full overflow-hidden">
              <img
                src="/logo.png"
                alt="Logo"
                className="w-10 h-10 rounded-full object-cover"
              />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-xs font-bold tracking-wider">
                FAMILIAS UNIDAS
              </span>
              <span className="text-[10px] tracking-wider opacity-80">
                PRESA DE LOS REYES A.C.
              </span>
            </div>
          </div>
          <div
            className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 text-white shadow-sm ${statusColor}`}
          >
            <StatusIcon size={12} />
            {statusText}
          </div>
        </div>

        {/* Body */}
        <div className="px-5 pb-6  ">
          {/* Card */}
          <div className="bg-white rounded-b-2xl shadow-lg border border-slate-100 p-4">
            <div className="w-full flex flex-col items-center">
              <img
                src={resolveMediaUrl(member?.photoUrl)} 
                alt={`${member?.firstName}`} 
                className="w-24 h-24 object-cover rounded-full shadow mb-3"
              />
 
              {/* Nombre */}
              <h1 className="text-xl font-extrabold text-slate-900 leading-tight text-center">
                {member?.firstName} {member?.lastName}
              </h1>

              {/* Rol */}
              <p className="text-orange-600 font-bold text-xs uppercase tracking-wider text-center">
                {member?.role}
              </p>
            </div>

            {/* Status blocks */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm text-slate-600">
                  <Calendar size={18} />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">
                    Vigencia
                  </p>
                  <p
                    className={`text-sm font-bold ${
                      !isValid
                        ? "text-slate-400 line-through decoration-red-500"
                        : "text-slate-800"
                    }`}
                  >
                    {scannedCredential?.expirationDate}
                  </p>
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm text-amber-600">
                  <Shield size={18} />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">
                    Registro
                  </p>
                  <p className="text-sm font-bold text-slate-800">
                    {member?.joinDate}
                  </p>
                </div>
              </div>
            </div>

            {/* Blocks */}
            <div className="mt-4 space-y-3">
              {(isRevoked ||
                isTimeExpired ||
                scannedCredential?.status === "EXPIRED") && (
                <div
                  className={`rounded-xl border p-3 flex gap-3 text-sm ${
                    isRevoked
                      ? "bg-orange-50 border-orange-100 text-orange-800"
                      : "bg-red-50 border-red-100 text-red-800"
                  }`}
                >
                  {isRevoked ? (
                    <History size={18} className="mt-0.5 shrink-0" />
                  ) : (
                    <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                  )}
                  <div>
                    <p className="font-bold">
                      {isRevoked ? "Credencial Antigua" : "Vigencia Expirada"}
                    </p>
                    <p className="text-xs">
                      {isRevoked ? (
                        <>
                          Este QR fue reemplazado el{" "}
                          <strong>{scannedCredential?.expirationDate}</strong>.
                        </>
                      ) : (
                        <>
                          Expiró el{" "}
                          <strong>{scannedCredential?.expirationDate}</strong>.
                          Ya no es válida.
                        </>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {hasAddress && (
                <div className="rounded-xl border border-slate-100 bg-gradient-to-r from-slate-50 via-white to-slate-50 p-3">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide mb-1 flex items-center gap-1">
                    <MapPin size={14} className="text-sky-500" /> Domicilio
                  </p>
                  <div className="text-slate-800 text-sm leading-relaxed">
                    {member?.street}{" "}
                    {member?.houseNumber ? `#${member?.houseNumber}` : ""}
                    {member?.colony && (
                      <div className="text-orange-600 font-semibold">
                        {member?.colony}
                      </div>
                    )}
                    {member?.city && (
                      <div className="text-slate-500 text-xs">
                        {member?.city}
                      </div>
                    )}
                  </div>
                  {member?.postalCode && (
                    <div className="text-xs text-slate-500 mt-1">
                      C.P. {member.postalCode}
                    </div>
                  )}
                </div>
              )}

              {member?.bloodType && (
                <div className="rounded-xl border border-slate-100 bg-white p-3 flex items-center gap-3">
                  <div className="p-2 bg-red-50 rounded-lg shadow-sm text-red-600">
                    <Droplet size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">
                      Tipo de Sangre
                    </p>
                    <p className="text-slate-800 font-bold">
                      {member?.bloodType}
                    </p>
                  </div>
                </div>
              )}

              {member?.curp && (
                <div className="rounded-xl border border-slate-100 bg-white p-3 flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 rounded-lg shadow-sm text-indigo-600">
                    <ShieldAlert size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">
                      CURP
                    </p>
                    <p className="text-slate-800 font-mono uppercase">
                      {member?.curp}
                    </p>
                  </div>
                </div>
              )}

              {member?.emergencyContact && (
                <div className="rounded-xl border border-slate-100 bg-white p-3 flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded-lg shadow-sm text-green-600">
                    <Phone size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">
                      Contacto Emergencia
                    </p>
                    <p className="text-slate-800 font-bold text-base">
                      {member?.emergencyContact}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
