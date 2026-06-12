/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  GraduationCap, 
  Settings, 
  BarChart3, 
  ChevronRight, 
  Lock, 
  Unlock,
  HeartHandshake, 
  FileSpreadsheet, 
  Undo2,
  Calendar,
  AlertCircle
} from "lucide-react";
import StudentEvaluationForm from "./components/StudentEvaluationForm";
import AdminReport from "./components/AdminReport";
import { Evaluation } from "./types";
import { TEACHERS } from "./data/teachers";

export default function App() {
  const [activeView, setActiveView] = useState<"home" | "evaluation" | "admin-login" | "admin-dashboard">("home");
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [passcode, setPasscode] = useState<string>("");
  const [loginError, setLoginError] = useState<string>("");
  const [savedPasscode, setSavedPasscode] = useState<string>("");

  // Master Lock system states (Password: DÁMASO)
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [showMasterLockModal, setShowMasterLockModal] = useState<boolean>(false);
  const [masterLockPass, setMasterLockPass] = useState<string>("");
  const [masterLockError, setMasterLockError] = useState<string>("");
  const [masterLockLoading, setMasterLockLoading] = useState<boolean>(false);
  const [masterLockSuccessMessage, setMasterLockSuccessMessage] = useState<string>("");

  // Recover passcode from session if saved
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("sadosa_admin_pass");
      if (stored) {
        setSavedPasscode(stored);
      }
    } catch (e) {
      console.warn("sessionStorage no está disponible (modo iframe / Google Sites):", e);
    }
  }, []);

  // Poll lock-status from server to synchronize all open devices/tabs
  useEffect(() => {
    const checkLockStatus = async () => {
      try {
        const res = await fetch("/api/lock-status");
        if (res.ok) {
          const data = await res.json();
          setIsLocked(data.locked);
        }
      } catch (err) {
        console.error("Error verifying lock status:", err);
      }
    };
    
    checkLockStatus(); // initial check
    const interval = setInterval(checkLockStatus, 4000); // Check lock status every 4 seconds
    return () => clearInterval(interval);
  }, []);

  // Fetch evaluations from Express API
  const fetchAllEvaluations = async (codeToUse: string): Promise<boolean> => {
    setIsFetching(true);
    setLoginError("");
    const cleanCode = codeToUse.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    try {
      const response = await fetch(`/api/evaluations?passcode=${encodeURIComponent(cleanCode)}`);

      if (response.ok) {
        const data = await response.json();
        setEvaluations(data);
        setSavedPasscode(cleanCode);
        try {
          sessionStorage.setItem("sadosa_admin_pass", cleanCode);
        } catch (e) {
          console.warn("sessionStorage no está disponible para persistir sesión (modo iframe / Google Sites):", e);
        }
        return true;
      } else {
        const errData = await response.json();
        setLoginError(errData.error || "Clave de acceso incorrecta.");
        return false;
      }
    } catch (err) {
      console.error("Error fetching evaluations:", err);
      setLoginError("Error al establecer conexión con la base de datos.");
      return false;
    } finally {
      setIsFetching(false);
    }
  };

  // Submit new evaluation to back-end (supports single or array batch)
  const submitEvaluation = async (
    evaluationData: Omit<Evaluation, "id" | "createdAt" | "totalScore"> | Omit<Evaluation, "id" | "createdAt" | "totalScore">[]
  ): Promise<boolean> => {
    try {
      const response = await fetch("/api/evaluations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(evaluationData)
      });

      if (response.ok) {
        // Automatically refresh internal stats if we are logged into Admin session
        if (savedPasscode) {
          const cleanSaved = savedPasscode.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          fetchAllEvaluations(cleanSaved);
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error("Error submitting evaluation:", err);
      return false;
    }
  };

  // Reset database via Express API
  const resetDatabase = async (): Promise<boolean> => {
    const code = savedPasscode || passcode;
    const cleanCode = code.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    try {
      const response = await fetch("/api/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ passcode: cleanCode })
      });

      if (response.ok) {
        setEvaluations([]);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Error resetting evaluations:", err);
      return false;
    }
  };

  // Toggle evaluations lock status
  const toggleLockStatus = async (requestLockState: boolean, masterPass: string): Promise<{ success: boolean; error?: string }> => {
    const cleanCode = masterPass.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    try {
      const response = await fetch("/api/lock-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ passcode: cleanCode, locked: requestLockState })
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsLocked(data.locked);
        return { success: true };
      } else {
        const errData = await response.json();
        return { success: false, error: errData.error || "Contraseña maestra incorrecta." };
      }
    } catch (err) {
      console.error("Error toggling lock status:", err);
      return { success: false, error: "Error de red al intentar conectarse al servidor." };
    }
  };

  const handleMasterLockModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMasterLockError("");
    setMasterLockSuccessMessage("");
    setMasterLockLoading(true);

    const targetLockState = !isLocked; // Toggle current status
    const result = await toggleLockStatus(targetLockState, masterLockPass);
    setMasterLockLoading(false);

    if (result.success) {
      setMasterLockSuccessMessage(`Equipos ${targetLockState ? "BLOQUEADOS" : "HABILITADOS"} con éxito en toda la red.`);
      setMasterLockPass("");
      setTimeout(() => {
        setShowMasterLockModal(false);
        setMasterLockSuccessMessage("");
      }, 1500);
    } else {
      setMasterLockError(result.error || "Ocurrió un error.");
    }
  };

  // Handle manual login
  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setLoginError("Por favor introduce la clave académica.");
      return;
    }
    const success = await fetchAllEvaluations(passcode.trim());
    if (success) {
      setActiveView("admin-dashboard");
      setPasscode("");
    }
  };

  // Check login toggle if session is already active
  const handleAdminAccessClick = () => {
    if (savedPasscode) {
      fetchAllEvaluations(savedPasscode);
      setActiveView("admin-dashboard");
      return;
    }
    setActiveView("admin-login");
  };

  // Handle refresh
  const triggerReload = () => {
    if (savedPasscode) {
      fetchAllEvaluations(savedPasscode);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col" id="app-root">
      
      {/* GLOBAL BANNER HEADER (HIDDEN IN PRINT) */}
      <header className="bg-blue-900 text-white shadow-md print:hidden w-full" id="global-header">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          
          <button 
            onClick={() => setActiveView("home")}
            className="flex items-center gap-3 cursor-pointer group text-left"
            id="header-brand-trigger"
          >
            <div className="bg-amber-400 p-2 rounded-xl text-blue-950 group-hover:scale-110 transition-transform">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-extrabold tracking-tight uppercase">
                Santo Domingo Savio
              </h1>
              <p className="text-[10px] sm:text-xs text-blue-200 uppercase font-bold tracking-widest leading-none">
                Particular • Secundaria
              </p>
            </div>
          </button>

          {/* RIGHT UTILITIES */}
          <div className="flex items-center gap-2" id="header-utilities">
            {/* Master Lock status control, quick access toggle */}
            <button
              type="button"
              onClick={() => {
                setMasterLockError("");
                setMasterLockSuccessMessage("");
                setShowMasterLockModal(true);
              }}
              className={`inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                isLocked 
                  ? "bg-red-500/20 text-red-100 border-red-500/50 hover:bg-red-500/30" 
                  : "bg-emerald-500/20 text-emerald-100 border-emerald-500/50 hover:bg-emerald-500/30"
              }`}
              id="header-master-lock-btn"
              title="Control de Bloqueo General de Dispositivos"
            >
              <div className={`h-2 w-2 rounded-full ${isLocked ? "bg-red-500 animate-pulse" : "bg-emerald-450"}`} />
              <span>Sistemas: {isLocked ? "BLOQUEADO" : "ACTIVO"}</span>
            </button>

            {activeView !== "admin-dashboard" && (
              <button
                type="button"
                onClick={handleAdminAccessClick}
                className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg text-blue-100 hover:text-white hover:bg-white/10 transition-all border border-blue-800"
                id="btn-trigger-login"
              >
                <Lock className="h-3.5 w-3.5 text-amber-400" />
                <span>Informe de Evaluación</span>
              </button>
            )}
            
            {activeView === "admin-dashboard" && (
              <button
                type="button"
                onClick={() => {
                  try {
                    sessionStorage.removeItem("sadosa_admin_pass");
                  } catch (e) {
                    console.warn("No se pudo limpiar sessionStorage:", e);
                  }
                  setSavedPasscode("");
                  setActiveView("home");
                }}
                className="font-bold text-xs bg-red-600/30 border border-red-500 hover:bg-red-600 hover:text-white px-3 py-1.5 rounded-lg text-red-100 transition-all"
                id="btn-admin-logout"
              >
                Cerrar Sesión
              </button>
            )}
          </div>

        </div>
      </header>

      {/* VIEWPORT AREA */}
      <main className="flex-grow flex flex-col" id="main-viewport">
        
        <AnimatePresence mode="wait">
          
          {/* VIEW: HOME VIEW */}
          {activeView === "home" && (
            <motion.div
              key="home-screen"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="flex-grow flex items-center justify-center py-12 px-4 print:hidden"
              id="home-screen-container"
            >
              <div className="max-w-2xl w-full bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center shadow-lg space-y-8 relative overflow-hidden">
                
                {/* Visual Accent Badge */}
                <span className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 via-amber-400 to-indigo-700" />

                <div className="space-y-4 flex flex-col items-center">
                  <div className="space-y-2 text-center">
                    <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight font-sans">
                      Evaluación Docente <span className="text-blue-700">2026</span>
                    </h2>
                    <p className="text-sm sm:text-base text-slate-600 font-medium max-w-lg mx-auto">
                      Tu participación ayuda a centralizar sugerencias de forma 100% anónima. Formulado para el primer trimestre del nivel secundaria, fortaleciendo nuestra institución de forma colaborativa.
                    </p>
                  </div>
                </div>

                {/* Grid features highlight */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left max-w-xl mx-auto" id="home-feature-box">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <div className="text-blue-700 font-extrabold text-xs uppercase font-mono border-b pb-0.5 mb-1 bg-blue-50/50 rounded-md py-0.5 px-1 inline-block">100% Anónimo</div>
                    <p className="text-slate-500 text-[11px] leading-tight font-medium">Las opiniones y calificaciones individuales de los alumnos son estrictamente privadas.</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <div className="text-blue-700 font-extrabold text-xs uppercase font-mono border-b pb-0.5 mb-1 bg-blue-50/50 rounded-md py-0.5 px-1 inline-block">Mínimo 10 Maestros</div>
                    <p className="text-slate-500 text-[11px] leading-tight font-medium">Selecciona un grupo de por lo menos 10 docentes a la vez para evaluarlos en fila.</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <div className="text-blue-700 font-extrabold text-xs uppercase font-mono border-b pb-0.5 mb-1 bg-blue-50/50 rounded-md py-0.5 px-1 inline-block">Sala de Cómputo</div>
                    <p className="text-slate-500 text-[11px] leading-tight font-medium">Optimizado para el ingreso fluido de múltiples estudiantes en simultáneo con volcado automático.</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-2">
                  {isLocked ? (
                    <div className="w-full sm:w-auto inline-flex flex-col items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-slate-200 text-slate-400 font-bold text-base rounded-xl cursor-not-allowed border border-slate-300"
                        id="btn-goto-evaluation-locked"
                      >
                        <Lock className="h-5 w-5 text-red-500 animate-pulse shrink-0" />
                        Evaluación Pausada
                      </button>
                      <span className="text-[9px] text-red-700 bg-red-50 border border-red-100 py-0.5 px-2.5 rounded-md font-mono font-black uppercase tracking-wider flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 shrink-0 text-red-500" />
                        Bloqueada por Dirección
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveView("evaluation")}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base rounded-xl transition-all shadow-md transform hover:-translate-y-0.5 cursor-pointer"
                      id="btn-goto-evaluation"
                    >
                      Evaluar a mis Docentes
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  )}
                  
                  <button
                    type="button"
                    onClick={handleAdminAccessClick}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50/70 hover:text-slate-900 transition-all"
                    id="btn-goto-admin"
                  >
                    <BarChart3 className="h-4 w-4 text-blue-600" />
                    Ver Consolidado
                  </button>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-[11px] font-mono text-slate-400">
                  <span>Gestión Educativa 2026</span>
                  <span>U.E. SANTO DOMINGO SAVIO</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* VIEW: STUDENT EVALUATION REGISTRATION */}
          {activeView === "evaluation" && (
            <motion.div
              key="evaluation-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-grow py-8 print:hidden"
              id="evaluation-viewport-card"
            >
              {isLocked ? (
                <div className="max-w-2xl mx-auto px-6 py-16 text-center bg-white rounded-3xl border border-slate-200 shadow-xl space-y-6">
                  <div className="mx-auto w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center border border-red-200 animate-pulse">
                    <Lock className="h-7 w-7" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-slate-950">
                      Evaluación Pausada por Dirección
                    </h3>
                    <p className="text-sm text-slate-600 max-w-md mx-auto">
                      El Administrador de la Unidad Educativa ha colocado la evaluación de docentes en pausa de forma generalizada.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl text-slate-700 text-xs text-left font-semibold leading-relaxed max-w-lg mx-auto flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-amber-900">¿Qué pasa con mis datos introducidos?</p>
                      <p className="text-slate-600 font-medium font-sans">No te preocupes. No cierres ni recargues esta pestaña. En cuanto el Administrador reanude la sesión con la clave del sistema, tu formulario se desbloqueará de inmediato para continuar evaluando sin perder la información cargada.</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveView("home")}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all border border-slate-200"
                  >
                    <Undo2 className="h-4 w-4" />
                    Volver al Inicio
                  </button>
                </div>
              ) : (
                <StudentEvaluationForm 
                  onSubmit={submitEvaluation} 
                  onBackToHome={() => setActiveView("home")} 
                />
              )}
            </motion.div>
          )}

          {/* VIEW: ADMIN LOCK DIALOG */}
          {activeView === "admin-login" && (
            <motion.div
              key="admin-login-screen"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="flex-grow flex items-center justify-center py-12 px-4 print:hidden"
              id="admin-login-screen-view"
            >
              <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 shadow-md space-y-6">
                <div className="text-center space-y-2">
                  <div className="mx-auto h-12 w-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center">
                    <Lock className="h-6 w-6 text-amber-500" />
                  </div>
                  <h3 className="text-xl font-bold tracking-tight text-slate-900">
                    Acceso para Autoridades SADOSA
                  </h3>
                  <p className="text-slate-500 text-xs sm:text-sm">
                    Introduce la clave de la Unidad Educativa para auditar los reportes e informes consolidados.
                  </p>
                </div>

                <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase text-slate-700 tracking-wider">
                      Clave de Ingreso:
                    </label>
                    <input
                      type="password"
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                      placeholder="Introduce la contraseña..."
                      className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-center font-mono placeholder:font-sans"
                      id="passcode-input"
                    />
                  </div>

                  {loginError && (
                    <div className="p-3 bg-red-50 text-red-800 rounded-lg border border-red-200 text-xs flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{loginError}</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveView("home")}
                      className="w-1/3 py-2.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Atrás
                    </button>
                    <button
                      type="submit"
                      disabled={isFetching}
                      className="w-2/3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-all shadow-sm"
                      id="btn-submit-passcode"
                    >
                      {isFetching ? "Verificando..." : "Entrar a Informes"}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}

          {/* VIEW: ADMIN EXTREME CONSOLIDATED REPORT DASHBOARD */}
          {activeView === "admin-dashboard" && (
            <motion.div
              key="admin-dashboard-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-grow py-4"
              id="admin-dashboard-container-box"
            >
              <AdminReport
                evaluations={evaluations}
                onResetDatabase={resetDatabase}
                onRefresh={triggerReload}
                onBackToForm={() => setActiveView("home")}
                isLocked={isLocked}
                onToggleLock={toggleLockStatus}
                savedPasscode={savedPasscode}
              />
            </motion.div>
          )}

        </AnimatePresence>

      </main>

      {/* FOOTER AREA (HIDDEN IN PRINT) */}
      <footer className="bg-slate-900 text-slate-400 py-6 border-t border-slate-800 text-center text-xs print:hidden w-full" id="global-footer">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p>© 2026 Unidad Educativa Santo Domingo Savio Particular - Nivel Secundario.</p>
          <p className="text-[10px] text-slate-600">Sistema de Evaluación Docente Centralizado en Línea. Código de Acceso Requerido.</p>
        </div>
      </footer>

      {/* MASTER LOCK/UNLOCK CONTROL MODAL */}
      {showMasterLockModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" id="master-lock-modal">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className={`p-2.5 rounded-xl ${isLocked ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
                {isLocked ? <Unlock className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
              </div>
              <div className="text-left">
                <h3 className="text-sm font-extrabold text-slate-900">
                  {isLocked ? "Habilitar Evaluaciones para Estudiantes" : "Bloquear Evaluaciones para Estudiantes"}
                </h3>
                <p className="text-slate-500 text-[11px] leading-tight font-medium font-sans mt-0.5">
                  {isLocked 
                    ? "Esto rehabilitará el ingreso de la evaluación docente en todos los dispositivos y laboratorios abiertos en simultáneo." 
                    : "Esto bloqueará de inmediato el ingreso y los envíos de evaluaciones para evitar respuestas desatendidas."}
                </p>
              </div>
            </div>

            <form onSubmit={handleMasterLockModalSubmit} className="space-y-4">
              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                  Contraseña Maestra:
                </label>
                <input
                  type="password"
                  value={masterLockPass}
                  onChange={(e) => setMasterLockPass(e.target.value)}
                  placeholder="Introduce la contraseña maestra..."
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-xs bg-slate-50 text-center font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:font-sans"
                  autoFocus
                  required
                />
              </div>

              {masterLockError && (
                <div className="p-3 bg-red-50 text-red-800 rounded-lg border border-red-150 text-xs flex items-center gap-2 text-left">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span className="font-semibold">{masterLockError}</span>
                </div>
              )}

              {masterLockSuccessMessage && (
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-150 text-xs flex items-center gap-2 text-left animate-pulse">
                  <div className="h-4 w-4 shrink-0 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] font-bold">✓</div>
                  <span className="font-semibold">{masterLockSuccessMessage}</span>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowMasterLockModal(false);
                    setMasterLockPass("");
                    setMasterLockError("");
                    setMasterLockSuccessMessage("");
                  }}
                  className="px-4 py-2 hover:bg-slate-100 text-slate-600 font-bold rounded-lg text-xs border border-transparent transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={masterLockLoading}
                  className={`px-5 py-2 font-black rounded-lg text-xs text-white transition-all shadow-sm cursor-pointer ${
                    isLocked 
                      ? "bg-emerald-600 hover:bg-emerald-700" 
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {masterLockLoading ? "Procesando..." : isLocked ? "Habilitar Evaluaciones" : "Bloquear Evaluaciones"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
