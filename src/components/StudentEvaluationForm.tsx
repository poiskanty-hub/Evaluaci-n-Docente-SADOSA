/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  GraduationCap, 
  UserCheck, 
  Star, 
  HelpCircle, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  BookOpen, 
  Search,
  MessageSquare,
  AlertCircle,
  X,
  Check,
  CheckSquare,
  ListFilter,
  UserCheck2,
  Trash2,
  Calendar
} from "lucide-react";
import { Teacher, Evaluation } from "../types";
import { TEACHERS, RATING_QUESTIONS, OPEN_QUESTIONS, COURSES } from "../data/teachers";

interface StudentEvaluationFormProps {
  onSubmit: (evaluationData: Omit<Evaluation, "id" | "createdAt" | "totalScore">[]) => Promise<boolean>;
  onBackToHome?: () => void;
}

export default function StudentEvaluationForm({ onSubmit, onBackToHome }: StudentEvaluationFormProps) {
  // Stepper state
  // 1: Select course & teachers (group selector)
  // 2: Consecutive teacher pedagogical ratings (carousel)
  // 3: General school opinion questions (once)
  // 4: Confirmation review & batch submit
  // 5: Celebration/Success
  const [step, setStep] = useState<number>(1);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [selectedTrimester, setSelectedTrimester] = useState<string>("1er Trimestre");
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [submittedCount, setSubmittedCount] = useState<number>(0);
  
  // Carousel tracking for Step 2
  const [activeTeacherIndex, setActiveTeacherIndex] = useState<number>(0);
  
  // Multi-teacher rating state: Record of teacherId => array of 7 ratings (1-5, initialized to 0)
  const [scoresByTeacher, setScoresByTeacher] = useState<Record<string, number[]>>({});
  
  // General school open answers (filled once per student)
  const [openAnswers, setOpenAnswers] = useState<string[]>(Array(3).fill(""));

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>("");
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [step1Attempted, setStep1Attempted] = useState<boolean>(false);

  // Search filter for teachers in Step 1
  const filteredTeachers = TEACHERS;

  // Selected teachers objects
  const selectedTeachers = useMemo<Teacher[]>(() => {
    return TEACHERS.filter((t) => selectedTeacherIds.includes(t.id));
  }, [selectedTeacherIds]);

  // Handle toggling of a teacher
  const toggleTeacher = (id: string) => {
    setSelectedTeacherIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((itemId) => itemId !== id);
      } else {
        return [...prev, id];
      }
    });

    // Initialize blank scores if not present
    setScoresByTeacher((prev) => {
      if (prev[id]) return prev;
      return {
        ...prev,
        [id]: Array(7).fill(0)
      };
    });
  };

  // Helper to select all teachers or clear them
  const selectAllTeachers = () => {
    const allIds = TEACHERS.map((t) => t.id);
    setSelectedTeacherIds(allIds);
    setScoresByTeacher((prev) => {
      const next = { ...prev };
      allIds.forEach((id) => {
        if (!next[id]) {
          next[id] = Array(7).fill(0);
        }
      });
      return next;
    });
  };

  const clearAllTeachers = () => {
    setSelectedTeacherIds([]);
    setScoresByTeacher({});
  };

  // Change individual question rating for a specific teacher
  const handleScoreChange = (teacherId: string, qIndex: number, val: number) => {
    setScoresByTeacher((prev) => {
      const currentScores = prev[teacherId] ? [...prev[teacherId]] : Array(7).fill(0);
      currentScores[qIndex] = val;
      return {
        ...prev,
        [teacherId]: currentScores
      };
    });
  };

  // Get active teacher being evaluated
  const activeTeacherId = selectedTeacherIds[activeTeacherIndex] || "";
  const activeTeacher = useMemo(() => {
    return TEACHERS.find((t) => t.id === activeTeacherId);
  }, [activeTeacherId]);

  const activeScores = useMemo(() => {
    return scoresByTeacher[activeTeacherId] || Array(7).fill(0);
  }, [scoresByTeacher, activeTeacherId]);

  // Checks if a teacher has answered all 7 rating questions
  const isTeacherFullyRated = (teacherId: string) => {
    const teacherScores = scoresByTeacher[teacherId];
    if (!teacherScores) return false;
    return teacherScores.every((s) => s > 0);
  };

  // Score labels
  const ratingLabels = [
    { value: 1, label: "Muy Deficiente", color: "text-red-500 bg-red-50 hover:bg-red-100" },
    { value: 2, label: "Deficiente", color: "text-orange-500 bg-orange-50 hover:bg-orange-100" },
    { value: 3, label: "Regular", color: "text-yellow-600 bg-yellow-50 hover:bg-yellow-100" },
    { value: 4, label: "Bueno", color: "text-emerald-500 bg-emerald-50 hover:bg-emerald-100" },
    { value: 5, label: "Excelente", color: "text-blue-600 bg-blue-50 hover:bg-blue-100" }
  ];

  // Validation
  // "mínimamente 10 maestros o maestras o ambos" means at least 10 teachers selected to initiate
  const canGoToStep2 = !!selectedCourse && !!selectedTrimester && selectedTeacherIds.length >= 10;
  
  // All selected teachers must be fully rated to unlock step 3
  const canGoToStep3 = selectedTeacherIds.length > 0 && selectedTeacherIds.every((id) => isTeacherFullyRated(id));

  const handleNextStep = () => {
    if (step === 1) {
      if (canGoToStep2) {
        setStep(2);
        setActiveTeacherIndex(0);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setStep1Attempted(true);
      }
    } else if (step === 2 && canGoToStep3) {
      setStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (step === 3) {
      setStep(4);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep(step - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Process text responses
  const handleAnswerChange = (ansIndex: number, val: string) => {
    const nextAns = [...openAnswers];
    nextAns[ansIndex] = val;
    setOpenAnswers(nextAns);
  };

  // Bulk Submit Evaluations
  const handleFormSubmit = async () => {
    if (selectedTeacherIds.length === 0) return;
    setIsSubmitting(true);
    setSubmitError("");
    
    try {
      // Map evaluations into a flat batch array
      const payload = selectedTeachers.map((teacher) => {
        return {
          teacherId: teacher.id,
          teacherName: teacher.name,
          subject: teacher.subject,
          studentCourse: selectedCourse,
          trimester: selectedTrimester,
          scores: scoresByTeacher[teacher.id] || Array(7).fill(0),
          openAnswers: openAnswers // Associating institutional suggestions to each evaluation record for consolidated stats
        };
      });

      const success = await onSubmit(payload);
      if (success) {
        setSubmittedCount(selectedTeacherIds.length);
        
        // AUTOMATICALLY CLEAR ALL SELECTION AND INPUT STATE TO BE READY FOR NEXT EVALUATION RUN
        setSelectedTeacherIds([]);
        setScoresByTeacher({});
        setOpenAnswers(Array(3).fill(""));
        setSelectedCourse("");
        setStep1Attempted(false);
        setActiveTeacherIndex(0);
        
        setSubmitSuccess(true);
        setStep(5);
      } else {
        setSubmitError("No se pudo registrar tus evaluaciones. Intenta de nuevo.");
      }
    } catch (err) {
      setSubmitError("Error de red o del servidor al procesar la solicitud.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedTeacherIds([]);
    setScoresByTeacher({});
    setOpenAnswers(Array(3).fill(""));
    setStep(1);
    setActiveTeacherIndex(0);
    setSubmitSuccess(false);
    setSubmitError("");
    setStep1Attempted(false);
    setSubmittedCount(0);
    setSelectedCourse("");
    setSelectedTrimester("1er Trimestre");
  };

  // Count total questions rated for indicators
  const totalRatedTeachersCount = selectedTeacherIds.filter(isTeacherFullyRated).length;

  return (
    <div id="evaluation-form-container" className="w-full max-w-5xl mx-auto py-6 px-4">
      
      {/* Stepper progress indicator */}
      {step <= 4 && (
        <div id="form-stepper" className="mb-8">
          <div className="flex justify-between items-center text-xs font-mono text-slate-500 mb-2">
            <span className="font-extrabold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-amber-400 rounded-full animate-pulse" />
              SADOSA • EVALUACIÓN DIGITAL MULTI-DOCENTE
            </span>
            <span className="font-bold text-slate-700">ETAPA {step} DE 4 — PROGRESO: {step * 25}%</span>
          </div>
          <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-blue-700 via-blue-600 to-amber-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${step * 25}%` }}
            />
          </div>
          
          <div className="flex justify-between mt-3 text-xs font-semibold text-slate-500">
            <span className={step >= 1 ? "text-blue-850 font-extrabold" : ""}>1. Selección de Maestros</span>
            <span className={step >= 2 ? "text-blue-850 font-extrabold" : ""}>2. Calificación ({totalRatedTeachersCount}/{selectedTeacherIds.length})</span>
            <span className={step >= 3 ? "text-blue-850 font-extrabold" : ""}>3. Propuestas sobre la U.E.</span>
            <span className={step >= 4 ? "text-blue-850 font-extrabold" : ""}>4. Envío Centralizado</span>
          </div>
        </div>
      )}

      {/* Stepper Content */}
      <AnimatePresence mode="wait">
        
        {/* STEP 1: Selección de Curso e Identificar de 11 a 33 Maestros */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 sm:p-8 space-y-6"
            id="step-1-card"
          >
            {/* Headings */}
            <div className="flex flex-col items-center text-center space-y-4 max-w-2xl mx-auto pb-4 border-b border-slate-100">
              <div className="space-y-1">
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 font-sans">
                  Regístrate y Elige a tu Grupo de Maestros
                </h2>
                <p className="text-slate-600 text-xs sm:text-sm font-medium">
                  De acuerdo con el reglamento académico, para garantizar un informe centralizado y representativo, debes evaluar un grupo de <span className="text-blue-700 font-bold">mínimamente 10 maestros o maestras o ambos</span> correspondientes a tu carga educativa actual.
                </p>
              </div>
            </div>

            {/* Curso & Trimester Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div id="course-section" className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="block text-xs font-extrabold uppercase text-slate-700 mb-2 flex items-center gap-1.5 font-mono">
                  <GraduationCap className="h-4 w-4 text-blue-700" />
                  1. Selecciona tu Curso Actual:
                </label>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 font-semibold text-sm cursor-pointer shadow-sm hover:border-slate-400"
                  id="course-select"
                >
                  <option value="">-- Haz clic para seleccionar --</option>
                  {COURSES.map((course) => (
                    <option key={course} value={course}>
                      {course}
                    </option>
                  ))}
                </select>
              </div>

              <div id="trimester-section" className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="block text-xs font-extrabold uppercase text-slate-700 mb-2 flex items-center gap-1.5 font-mono">
                  <Calendar className="h-4 w-4 text-amber-500" />
                  2. Trimestre Académico:
                </label>
                <select
                  value={selectedTrimester}
                  onChange={(e) => setSelectedTrimester(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 font-semibold text-sm cursor-pointer shadow-sm hover:border-slate-400"
                  id="trimester-select"
                >
                  <option value="1er Trimestre">1er Trimestre</option>
                  <option value="2do Trimestre">2do Trimestre</option>
                  <option value="3er Trimestre">3er Trimestre</option>
                </select>
              </div>
            </div>

            {/* Teacher Selection Header & Quick Controls */}
            {/* Teacher Selection Header & Quick Controls */}
            <div id="teacher-selection-header" className="flex flex-col sm:flex-row justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200 gap-3">
              <span className="text-xs sm:text-sm font-extrabold text-slate-700 font-mono flex items-center gap-1.5">
                <UserCheck className="h-4.5 w-4.5 text-blue-700" />
                Docentes Elegidos: <span className="text-blue-850 font-black px-2 py-0.5 bg-blue-100 rounded-md">{selectedTeacherIds.length}</span> (Mínimo 10)
              </span>
              
              {/* Bulk assist actions */}
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={selectAllTeachers}
                  className="text-[10px] sm:text-xs font-extrabold text-blue-700 hover:text-white hover:bg-blue-700 border border-blue-200 px-2.5 py-1.5 rounded-md transition-all uppercase font-mono"
                  id="btn-select-all"
                >
                  Seleccionar Todos los 33
                </button>
                <button
                  type="button"
                  onClick={clearAllTeachers}
                  className="text-[10px] sm:text-xs font-extrabold text-red-600 hover:text-white hover:bg-red-600 border border-red-200 px-2.5 py-1.5 rounded-md transition-all uppercase font-mono"
                  id="btn-clear-all"
                >
                  Limpiar Lista
                </button>
              </div>
            </div>

            {/* Split layout: Teachers Catalog vs Active Selections */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Teachers List (Col 7) */}
              <div className="lg:col-span-8 space-y-2">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider">Haga clic en un casillero para añadirlo o quitarlo:</span>
                
                <div 
                  className="border border-slate-200 rounded-xl max-h-80 overflow-y-auto divide-y divide-slate-100 bg-white shadow-inner"
                  id="teachers-scroll-list"
                >
                  {filteredTeachers.length > 0 ? (
                    filteredTeachers.map((t) => {
                      const isSelected = selectedTeacherIds.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => toggleTeacher(t.id)}
                          className={`w-full flex items-center justify-between px-4 py-3 text-left transition-all text-sm hover:bg-slate-50 ${
                            isSelected ? "bg-amber-500/10 hover:bg-amber-500/15" : ""
                          }`}
                          id={`teacher-item-${t.id}`}
                        >
                          <div className="flex items-center gap-3 pr-3 min-w-0">
                            {/* Checkbox circle indicator */}
                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                              isSelected ? "bg-amber-500 border-amber-600 text-white" : "bg-white border-slate-300"
                            }`}>
                              {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                            </div>
                            
                            <div className="min-w-0">
                              <span className={`text-[#1E293B] block font-bold truncate ${isSelected ? "text-amber-900" : ""}`}>
                                {t.name}
                              </span>
                              <span className="text-[11px] text-slate-500 font-mono tracking-wide">{t.id.padStart(2, "0")} • SECUNDARIA</span>
                            </div>
                          </div>
                          <span className={`text-[10px] font-mono font-bold uppercase px-2 py-1 rounded-md shrink-0 block text-right select-none ${
                            isSelected ? "bg-amber-500/20 text-amber-950" : "bg-slate-100 text-slate-600"
                          }`}>
                            {t.subject}
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="py-12 px-4 text-center text-slate-450 text-sm font-medium">
                      No se encontraron maestros o asignaturas con el filtro buscado.
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Mini Selected Sidebar Indicator (Col 4) */}
              <div className="lg:col-span-4 bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-col justify-between max-h-[365px]">
                <div className="space-y-2 flex-grow overflow-hidden flex flex-col">
                  <div className="flex justify-between items-center border-b border-slate-250 pb-2">
                    <span className="text-xs font-black uppercase text-slate-700 tracking-wider font-mono">SELECCIONADOS ({selectedTeacherIds.length})</span>
                    {selectedTeacherIds.length > 0 && (
                      <span className="text-[10px] font-bold bg-[#E2E8F0] px-2 py-0.5 rounded text-[#334155]">
                        Mínimo 10
                      </span>
                    )}
                  </div>

                  {selectedTeachers.length > 0 ? (
                    <div className="overflow-y-auto divide-y divide-slate-200/60 pr-1 flex-grow space-y-1.5 pt-1.5">
                      {selectedTeachers.map((st) => (
                        <div key={st.id} className="flex justify-between items-center text-xs py-1 px-1 text-slate-705">
                          <div className="truncate pr-2">
                            <span className="font-bold text-slate-900 block truncate">{st.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono truncate block">{st.subject}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleTeacher(st.id)}
                            className="text-slate-400 hover:text-red-650 p-1 rounded-full hover:bg-slate-200 shrink-0 transition-colors"
                            title="Quitar"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex-grow flex flex-col items-center justify-center text-center py-10 px-2 space-y-2">
                      <UserCheck2 className="h-8 w-8 text-slate-300 stroke-[1.5]" />
                      <p className="text-slate-400 text-xs font-semibold leading-normal">
                        Aún no seleccionaste ningún docente en la lista de la izquierda.
                      </p>
                    </div>
                  )}
                </div>

                {/* Warning message/Criteria feedback */}
                <div className="pt-3 border-t border-slate-250/60 mt-2">
                  {selectedTeacherIds.length < 10 ? (
                    <div className="p-2.5 bg-amber-50 border border-amber-205 rounded-lg text-[11px] text-amber-850 flex items-start gap-1.5 leading-tight font-medium">
                      <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                      <div>
                        Selecciona <span className="font-bold">al menos 10 maestros o maestras</span> para poder continuar (actualmente {selectedTeacherIds.length}).
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-205 rounded-lg text-[11px] text-emerald-850 flex items-start gap-1.5 leading-tight font-medium">
                      <CheckSquare className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" strokeWidth={2.5} />
                      <div>
                        ¡Grupo apto! Elegiste <span className="font-bold">{selectedTeacherIds.length} maestros</span>. Puedes comenzar.
                      </div>
                    </div>
                  )}
                </div>

              </div>

            </div>

            {/* Validation Feedback when attempted */}
            {step1Attempted && !canGoToStep2 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs sm:text-sm text-red-900 font-semibold space-y-1 mt-4">
                <p className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Por favor completa lo siguiente para iniciar la evaluación:</span>
                </p>
                <ul className="list-disc pl-5 mt-1 text-xs text-red-850 space-y-1">
                  {!selectedCourse && (
                    <li>Debes seleccionar tu <strong>Curso Actual</strong> (Paso 1).</li>
                  )}
                  {selectedTeacherIds.length < 10 && (
                    <li>Debes elegir un grupo de <strong>mínimamente 10 maestros o maestras</strong> (actualmente seleccionados: {selectedTeacherIds.length}).</li>
                  )}
                </ul>
              </div>
            )}

            {/* Form actions footer */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
              {onBackToHome && (
                <button
                  type="button"
                  onClick={onBackToHome}
                  className="px-5 py-2.5 rounded-lg border border-slate-200 text-xs sm:text-sm text-slate-600 font-extrabold uppercase tracking-wider font-mono hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                  Regresar
                </button>
              )}
              
              <button
                type="button"
                onClick={handleNextStep}
                className="flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all shadow-md bg-blue-600 text-white cursor-pointer hover:bg-blue-700 transform hover:-translate-y-0.5 active:scale-95"
                id="btn-goto-step2"
              >
                Comenzar Evaluación de {selectedTeacherIds.length} Docentes
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 2: Calificación Consecutiva (Carousel-style) */}
        {step === 2 && activeTeacher && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="w-full"
            id="step-2-card"
          >
            {/* Main panel: 7 questions for the current selected teacher (Full width) */}
            <div className="w-full bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-md shadow-slate-100 flex flex-col justify-between">
              
              {/* Header panel for active teacher */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start border-b border-slate-150 pb-4 gap-2">
                <div>
                  <span className="text-xs font-mono uppercase bg-blue-100 text-blue-900 border border-blue-200 px-3 py-1 rounded-md font-extrabold">
                    DOCENTE {activeTeacherIndex + 1} DE {selectedTeacherIds.length}
                  </span>
                  <p className="text-slate-500 text-xs uppercase font-bold mt-2.5 tracking-wider font-mono">Maestro(a) evaluado(a) actual:</p>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                    {activeTeacher.name}
                  </h3>
                </div>
                <div className="sm:text-right self-start">
                  <span className="text-[10px] text-slate-400 block font-mono font-bold uppercase tracking-wider">MATERIA</span>
                  <span className="text-xs sm:text-sm font-extrabold text-blue-910 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded inline-block mt-1">
                    {activeTeacher.subject}
                  </span>
                </div>
              </div>

              {/* 7 Questions scrolling area */}
              <div className="space-y-6" id="rating-questions-holder">
                {RATING_QUESTIONS.map((q, idx) => {
                  const currentScore = activeScores[idx];
                  return (
                    <div 
                      key={q.id} 
                      className="p-4 sm:p-5 bg-slate-50/70 border border-slate-150 rounded-xl space-y-4 shadow-sm"
                      id={`rating-block-q${q.id}`}
                    >
                      <div className="flex gap-3">
                        <span className="w-6 h-6 flex items-center justify-center bg-blue-600/10 text-blue-700 rounded-full font-bold text-xs shrink-0 mt-0.5">
                          {q.id}
                        </span>
                        <p className="text-slate-800 font-semibold text-sm sm:text-base leading-relaxed">
                          {q.text}
                        </p>
                      </div>

                      {/* 1 to 5 buttons select block */}
                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1">
                        {ratingLabels.map((rl) => {
                          const isPicked = currentScore === rl.value;
                          return (
                            <button
                              key={rl.value}
                              type="button"
                              onClick={() => handleScoreChange(activeTeacher.id, idx, rl.value)}
                              className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border text-xs font-extrabold transition-all ${
                                isPicked 
                                  ? "bg-amber-500 border-amber-600 text-[#0F172A] shadow-md scale-[1.02]"
                                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-350"
                              }`}
                              id={`rating-btn-q${q.id}-val${rl.value}`}
                            >
                              <Star className={`h-4 w-4 shrink-0 ${isPicked ? "fill-[#0F172A] text-[#0F172A]" : "text-slate-400"}`} />
                              <span>{rl.value} - {rl.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Status Banner */}
              {!isTeacherFullyRated(activeTeacher.id) && (
                <div className="p-3 bg-amber-50 text-amber-850 rounded-xl border border-amber-200 text-xs sm:text-sm flex items-center gap-2 justify-center font-medium">
                  <AlertCircle className="h-4.5 w-4.5 text-amber-600" />
                  <span>Por favor, selecciona una calificación para cada una de las 7 preguntas para registrar este maestro.</span>
                </div>
              )}

              {/* Stepper controls */}
              <div className="mt-8 flex flex-col sm:flex-row justify-between border-t border-slate-100 pt-6 gap-3">
                
                {/* Back button */}
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-200 text-sm font-extrabold text-slate-600 hover:bg-slate-50 transition-colors uppercase font-mono tracking-wider text-xs"
                  id="btn-back-to-step1"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Configurar Maestros
                </button>
                
                {/* Previous/Next teacher or next step */}
                <div className="flex gap-2">
                  {/* Previous teacher in carousel */}
                  <button
                    type="button"
                    disabled={activeTeacherIndex === 0}
                    onClick={() => {
                      setActiveTeacherIndex(activeTeacherIndex - 1);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className={`px-4 py-3 rounded-xl border text-xs font-bold font-mono uppercase tracking-wider transition-all select-none ${
                      activeTeacherIndex === 0
                        ? "bg-slate-50/50 border-slate-100 text-slate-300 cursor-not-allowed"
                        : "bg-white border-slate-250 text-slate-650 hover:bg-slate-50"
                    }`}
                  >
                    Docente Anterior
                  </button>

                  {/* Next teacher in carousel OR proceed to Step 3 */}
                  {activeTeacherIndex < selectedTeacherIds.length - 1 ? (
                    <button
                      type="button"
                      disabled={!isTeacherFullyRated(activeTeacher.id)}
                      onClick={() => {
                        setActiveTeacherIndex(activeTeacherIndex + 1);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-xs uppercase font-mono tracking-wider transition-all ${
                        isTeacherFullyRated(activeTeacher.id)
                          ? "bg-amber-500 text-[#0F172A] hover:bg-amber-650 shadow-sm cursor-pointer"
                          : "bg-slate-100 text-slate-400 cursor-not-allowed"
                      }`}
                    >
                      Siguiente Docente
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!canGoToStep3}
                      onClick={handleNextStep}
                      className={`flex items-center gap-2 px-6 py-3 rounded-xl font-extrabold text-xs uppercase font-mono tracking-wider transition-all ${
                        canGoToStep3
                          ? "bg-green-600 text-white hover:bg-green-700 shadow-md cursor-pointer"
                          : "bg-slate-100 text-slate-400 cursor-not-allowed"
                      }`}
                      id="btn-goto-step3"
                    >
                      Pasar a sugerencias U.E.
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

            </div>
          </motion.div>
        )}

        {/* STEP 3: Preguntas Abiertas e Institucionales (se realiza una única vez) */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 sm:p-8"
            id="step-3-card"
          >
            {/* Header */}
            <div className="border-b border-slate-100 pb-4 mb-6">
              <span className="text-xs font-mono uppercase bg-blue-50 text-blue-900 border border-blue-200 px-2.5 py-1.5 rounded-lg font-extrabold">
                Sección 2: Sugerencias Institucionales SADOSA (Opcionales)
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-3 font-sans">
                Tus Propuestas para la Unidad Educativa
              </h3>
              <p className="text-slate-650 text-xs sm:text-sm mt-1">
                Tus respuestas serán analizadas de manera general para la toma de decisiones del colegio, promoviendo mejoras continuas en infraestructura y pedagogía.
              </p>
            </div>

            {/* Suggestions list of questions */}
            <div className="space-y-6" id="text-questions-holder">
              {OPEN_QUESTIONS.map((q, idx) => {
                return (
                  <div key={q.id} className="space-y-2.5" id={`text-block-q${q.id}`}>
                    <label className="block text-sm font-extrabold text-slate-800 flex items-start gap-2 leading-relaxed">
                      <span className="w-5 h-5 flex items-center justify-center bg-blue-600/10 text-blue-700 rounded-full font-black text-xs shrink-0 mt-0.5 font-mono">
                        {q.id}
                      </span>
                      <span>{q.text}</span>
                    </label>
                    <textarea
                      rows={3}
                      value={openAnswers[idx]}
                      onChange={(e) => handleAnswerChange(idx, e.target.value)}
                      placeholder="Escribe tu propuesta o sugerencia reflexiva aquí... (Por favor sea constructivo y educado)"
                      className="w-full text-sm sm:text-base p-4 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-slate-50/30 shadow-inner"
                      id={`textarea-q${q.id}`}
                    />
                  </div>
                );
              })}
            </div>

            {/* Action buttons */}
            <div className="mt-8 flex justify-between border-t border-slate-100 pt-6">
              <button
                type="button"
                onClick={handlePrevStep}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-slate-200 text-xs font-extrabold uppercase font-mono tracking-wider text-slate-600 hover:bg-slate-50 transition-colors"
                id="btn-back-to-step2"
              >
                <ArrowLeft className="h-4 w-4" />
                Calificaciones
              </button>
              
              <button
                type="button"
                onClick={handleNextStep}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold text-xs uppercase font-mono tracking-wider hover:bg-blue-700 transition-all shadow-md"
                id="btn-goto-step4"
              >
                Revisar y Confirmar
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 4: Revisión Final y Envío Batch */}
        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 sm:p-8"
            id="step-4-card"
          >
            <div className="text-center max-w-xl mx-auto mb-6">
              <CheckCircle2 className="mx-auto h-12 w-12 text-blue-600 mb-2 animate-pulse" />
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-sans">
                Resumen de tu Evaluación
              </h2>
              <p className="mt-1 text-slate-600 text-sm">
                Por favor, verifica el listado final de maestros evaluados antes de presionar enviar. Se registrarán tus respuestas de forma consolidada e instantánea.
              </p>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-150 mb-6 bg-slate-50/30">
              
              {/* Identity details */}
              <div className="bg-slate-100 p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-2 text-sm">
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block font-bold">Unidad Educativa Santo Domingo Savio</span>
                  <span className="font-extrabold text-slate-900 text-base">Colegio Secundaria Pública/Particular</span>
                </div>
                <div className="sm:text-right">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block font-bold">Curso de Alumno</span>
                  <span className="font-black text-blue-900 text-xs bg-blue-50 border border-blue-200 px-3 py-1 rounded-md inline-block mt-0.5 uppercase">
                    {selectedCourse}
                  </span>
                </div>
              </div>

              {/* Quant Scores review */}
              <div className="p-4 space-y-3">
                <span className="text-xs uppercase font-mono tracking-wider text-[#475569] font-black block">Docentes Calificados ({selectedTeacherIds.length} maestros):</span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                  {selectedTeachers.map((teacher, index) => {
                    const ratings = scoresByTeacher[teacher.id] || Array(7).fill(0);
                    const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
                    
                    return (
                      <div key={teacher.id} className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200/80 text-xs shadow-sm">
                        <div className="truncate pr-2">
                          <span className="text-slate-900 font-extrabold block truncate">
                            {index + 1}. {teacher.name}
                          </span>
                          <span className="text-slate-500 font-medium font-mono text-[10px] truncate block">{teacher.subject}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 border border-slate-200 px-2 py-1 rounded shadow-inner">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                          <span className="font-black text-slate-800">{avg.toFixed(1)}/5.0</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Open Suggestions items */}
              <div className="p-4 text-xs sm:text-sm">
                <span className="text-xs uppercase font-mono tracking-wider text-[#475569] font-black block">Sugerencias Institucionales Guardadas:</span>
                <div className="flex gap-2 items-center text-slate-700 mt-2 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                  <MessageSquare className="h-5 w-5 text-blue-700 shrink-0" />
                  <span className="font-medium text-xs leading-relaxed text-blue-900">
                    Has redactado opiniones para <span className="font-bold">{openAnswers.filter(a => a.trim().length > 0).length} de las 3 preguntas abiertas</span> sobre infraestructura y calidad académica del colegio. Tus aportes serán consolidados con éxito de forma anónima.
                  </span>
                </div>
              </div>
            </div>

            {submitError && (
              <div className="mb-6 p-4 bg-red-55 text-red-950 border border-red-200 rounded-xl flex items-center gap-2 text-sm justify-center font-bold">
                <AlertCircle className="h-5 w-5 shrink-0 text-red-650" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Stepper actions */}
            <div className="flex justify-between border-t border-slate-100 pt-6">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handlePrevStep}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-slate-200 text-xs font-extrabold uppercase font-mono tracking-wider text-slate-600 hover:bg-slate-50 transition-colors"
                id="btn-back-to-step3"
              >
                <ArrowLeft className="h-4 w-4" />
                Atrás
              </button>
              
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFormSubmit}
                className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-xl font-extrabold text-sm hover:bg-green-700 transition-all shadow-md cursor-pointer transform hover:-translate-y-0.5"
                id="btn-submit-evaluation"
              >
                {isSubmitting ? (
                  <span>Registrando {selectedTeacherIds.length} evaluaciones...</span>
                ) : (
                  <>
                    <span>Enviar {selectedTeacherIds.length} Evaluaciones a la base de datos</span>
                    <CheckCircle2 className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 5: Felicitaciones / Celebración */}
        {step === 5 && submitSuccess && (
          <motion.div
            key="step5"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8 sm:p-12 text-center max-w-xl mx-auto flex flex-col items-center space-y-6"
            id="step-5-success-card"
          >
            <div className="space-y-2">
              <div className="inline-flex rounded-full bg-emerald-100 p-4 text-emerald-600 mb-2">
                <CheckCircle2 className="h-10 w-10 stroke-[2.5]" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-sans">
                ¡Evaluaciones Registradas!
              </h2>
              <p className="text-slate-600 text-sm sm:text-base font-medium leading-relaxed">
                Tus <span className="text-blue-800 font-bold">{submittedCount} evaluaciones</span> han sido integradas de forma anónima y exitosa en las estadísticas centrales del colegio Santo Domingo Savio.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl text-xs font-mono text-slate-500 border border-slate-100">
              <span className="block font-bold">SALA DE COMPUTACIÓN SECUNDARIA 2026</span>
              <span className="block mt-1">Sincronización: {new Date().toLocaleDateString()} - {new Date().toLocaleTimeString()}</span>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-3 w-full pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase font-mono tracking-wider rounded-xl transition-all shadow-md transform hover:-translate-y-0.5"
                id="btn-evaluate-another-teacher"
              >
                Hacer otra evaluación de alumnos
              </button>
              {onBackToHome && (
                <button
                  type="button"
                  onClick={onBackToHome}
                  className="px-6 py-3 border border-slate-200 hover:bg-slate-50 text-slate-650 font-black text-xs uppercase font-mono tracking-wider rounded-xl transition-all"
                  id="btn-success-back-home"
                >
                  Volver al Menú Principal
                </button>
              )}
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
