/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { 
  ShieldAlert, 
  Download, 
  Search, 
  TrendingUp, 
  Award, 
  Users, 
  ArrowLeft, 
  CheckCircle, 
  XOctagon, 
  MessageSquare, 
  Calendar, 
  Sliders, 
  Trash2,
  Lock,
  Unlock,
  Printer,
  ChevronRight,
  Sparkles,
  RefreshCw,
  BookOpen,
  GraduationCap
} from "lucide-react";
import { motion } from "motion/react";
import { Evaluation, TeacherStats, Teacher } from "../types";
import { TEACHERS, RATING_QUESTIONS, OPEN_QUESTIONS, COURSES } from "../data/teachers";

interface AdminReportProps {
  evaluations: Evaluation[];
  onResetDatabase: () => Promise<boolean>;
  onRefresh: () => void;
  onBackToForm: () => void;
  isLocked?: boolean;
  onToggleLock?: (requestLockState: boolean, masterPass: string) => Promise<{ success: boolean; error?: string }>;
  savedPasscode?: string;
}

export default function AdminReport({ 
  evaluations, 
  onResetDatabase, 
  onRefresh, 
  onBackToForm,
  isLocked = false,
  onToggleLock,
  savedPasscode = ""
}: AdminReportProps) {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [selectedTrimesterFilter, setSelectedTrimesterFilter] = useState<string>("Todos");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"ratings" | "text">("ratings");
  const [showConfirmReset, setShowConfirmReset] = useState<boolean>(false);
  const [resetPasscode, setResetPasscode] = useState<string>("");
  const [resetStatus, setResetStatus] = useState<string>("");

  const [mainTab, setMainTab] = useState<"teachers" | "complementation">("teachers");
  const [selectedComplementationCourse, setSelectedComplementationCourse] = useState<string>("");

  // Inline lock/unlock form state inside administrative dashboard
  const [showInlineLockForm, setShowInlineLockForm] = useState<boolean>(false);
  const [inlineLockPass, setInlineLockPass] = useState<string>("");
  const [inlineLockError, setInlineLockError] = useState<string>("");
  const [inlineLockSuccess, setInlineLockSuccess] = useState<string>("");
  const [inlineLockLoading, setInlineLockLoading] = useState<boolean>(false);

  // PDF download selection states
  const [printScope, setPrintScope] = useState<"all" | "multiple" | "single">("all");
  const [selectedPrintTeacherIds, setSelectedPrintTeacherIds] = useState<string[]>([]);
  const [singlePrintTeacherId, setSinglePrintTeacherId] = useState<string>("");
  const [activePrintSet, setActivePrintSet] = useState<any[] | null>(null);

  // Filter evaluation list based on selected trimester
  const filteredEvaluations = useMemo(() => {
    if (selectedTrimesterFilter === "Todos") return evaluations;
    return evaluations.filter((e) => {
      const val = e.trimester || "1er Trimestre";
      return val.includes(selectedTrimesterFilter) || selectedTrimesterFilter.includes(val);
    });
  }, [evaluations, selectedTrimesterFilter]);

  // Trimester Comparison for the whole school
  const trimesterComparison = useMemo(() => {
    const trimesters = ["1er Trimestre", "2do Trimestre", "3er Trimestre"];
    return trimesters.map((tri) => {
      const triEvals = evaluations.filter((e) => {
        const val = e.trimester || "1er Trimestre";
        return val.includes(tri) || tri.includes(val);
      });
      const count = triEvals.length;
      let avgScore = 0;
      if (count > 0) {
        const sum = triEvals.reduce((acc, curr) => {
          const scoresSum = curr.scores.reduce((a, b) => a + b, 0);
          return acc + Math.round((scoresSum / 35) * 100);
        }, 0);
        avgScore = Math.round(sum / count);
      }
      return { trimester: tri, count, avgScore };
    });
  }, [evaluations]);

  // Trimester Comparison for a selected teacher
  const teacherTrimesterComparison = useMemo(() => {
    if (!selectedTeacherId) return null;
    const trimesters = ["1er Trimestre", "2do Trimestre", "3er Trimestre"];
    return trimesters.map((tri) => {
      const triEvals = evaluations.filter(
        (e) => e.teacherId === selectedTeacherId && (e.trimester || "1er Trimestre") === tri
      );
      const count = triEvals.length;
      let avgScore = 0;
      if (count > 0) {
        const sum = triEvals.reduce((acc, curr) => {
          const scoresSum = curr.scores.reduce((a, b) => a + b, 0);
          return acc + Math.round((scoresSum / 35) * 100);
        }, 0);
        avgScore = Math.round(sum / count);
      }
      return { trimester: tri, count, avgScore };
    });
  }, [evaluations, selectedTeacherId]);

  // Deduplicate evaluations by student (same batch usually has exact identical createdAt and studentCourse and openAnswers)
  const uniqueSubmissions = useMemo(() => {
    const seen = new Set<string>();
    const list: { studentCourse: string; openAnswers: string[]; createdAt: string }[] = [];
    
    filteredEvaluations.forEach((evalItem) => {
      const answersStr = evalItem.openAnswers?.join("|") || "";
      const key = `${evalItem.createdAt}_${evalItem.studentCourse}_${answersStr}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push({
          studentCourse: evalItem.studentCourse,
          openAnswers: evalItem.openAnswers || ["", "", ""],
          createdAt: evalItem.createdAt
        });
      }
    });
    return list;
  }, [filteredEvaluations]);

  // Compute frequent words for open ended text answers
  const getMostFrequentWords = (texts: string[]): { word: string; count: number }[] => {
    const stopWords = new Set([
      "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "en", "que", "y", "a", "o", "u", "con", "para", "por", "si", "no", "es", "me", "se", "te", "le", "lo", "los", "les", "nos", "mi", "tu", "su", "sus", "mas", "más", "pero", "como", "cómo", "al", "este", "esta", "estos", "estas", "eso", "esa", "esos", "esas", "todo", "toda", "todos", "todas", "muy", "bien", "mejor", "que", "qué", "sobre", "otro", "otra", "otros", "otras", "para", "colegio", "escuela", "estudiantes", "alumnos", "clases", "clase", "profesor", "profesores", "maestro", "maestros", "docente", "docentes", "unid", "educativa", "sdomingo", "sábado", "domingo", "savio", "sadosa", "tener", "hacer", "dar", "buen", "buena", "completar", "también", "tambien", "quieren", "quiero", "gustaria", "gustaría", "deberia", "debería", "deberían", "deberian", "pueden", "puedan", "pueda", "puedo", "creo", "creeo"
    ]);

    const wordCounts: Record<string, number> = {};
    
    texts.forEach((text) => {
      if (!text) return;
      const cleanWordList = text
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'¡¿\n]/g, " ")
        .split(/\s+/);
        
      cleanWordList.forEach((word) => {
        const trimmed = word.trim();
        if (trimmed.length > 3 && !stopWords.has(trimmed)) {
          wordCounts[trimmed] = (wordCounts[trimmed] || 0) + 1;
        }
      });
    });

    return Object.entries(wordCounts)
      .map(([word, count]) => ({ word: word.toUpperCase(), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // top 10 terms
  };

  // Compute the word frequencies for each of the 3 complementation/open questions dynamically based on filtered course
  const q8Frequencies = useMemo(() => {
    const texts = uniqueSubmissions
      .filter(s => !selectedComplementationCourse || s.studentCourse === selectedComplementationCourse)
      .map(s => s.openAnswers[0])
      .filter(Boolean);
    return getMostFrequentWords(texts);
  }, [uniqueSubmissions, selectedComplementationCourse]);

  const q9Frequencies = useMemo(() => {
    const texts = uniqueSubmissions
      .filter(s => !selectedComplementationCourse || s.studentCourse === selectedComplementationCourse)
      .map(s => s.openAnswers[1])
      .filter(Boolean);
    return getMostFrequentWords(texts);
  }, [uniqueSubmissions, selectedComplementationCourse]);

  const q10Frequencies = useMemo(() => {
    const texts = uniqueSubmissions
      .filter(s => !selectedComplementationCourse || s.studentCourse === selectedComplementationCourse)
      .map(s => s.openAnswers[2])
      .filter(Boolean);
    return getMostFrequentWords(texts);
  }, [uniqueSubmissions, selectedComplementationCourse]);

  // Process evaluations to calculate aggregated statistics for all teachers
  const teachersStats = useMemo<Record<string, TeacherStats>>(() => {
    const statsMap: Record<string, TeacherStats> = {};

    // First initialize stats for all 33 teachers so we can see who has 0 evaluations
    TEACHERS.forEach((teacher) => {
      statsMap[teacher.id] = {
        teacherId: teacher.id,
        teacherName: teacher.name,
        subject: teacher.subject,
        totalEvaluations: 0,
        averageScore: 0,
        courses: {},
        questionScoreAverages: Array(7).fill(0),
        strengths: [],
        weaknesses: [],
        suggestions: { q8: [], q9: [], q10: [] }
      };
    });

    // Aggregate with actual evaluation records
    filteredEvaluations.forEach((evalItem) => {
      const stats = statsMap[evalItem.teacherId];
      if (!stats) return; // ignore deleted teachers if any

      stats.totalEvaluations += 1;
      
      // Calculate individual evaluation score (0-100)
      const scoresSum = evalItem.scores.reduce((a, b) => a + b, 0);
      const evalTotalScore = Math.round((scoresSum / 35) * 100);

      // Add to overall average helper (we will divide by totalEvaluations at the end)
      stats.averageScore += evalTotalScore;

      // Group by student course
      if (!stats.courses[evalItem.studentCourse]) {
        stats.courses[evalItem.studentCourse] = { count: 0, averageScore: 0 };
      }
      stats.courses[evalItem.studentCourse].count += 1;
      stats.courses[evalItem.studentCourse].averageScore += evalTotalScore;

      // Group by questions (Q1 to Q7)
      evalItem.scores.forEach((score, qIdx) => {
        // Map 1-5 score to 0-100 range: (score / 5) * 100
        const normalized = Math.round((score / 5) * 100);
        stats.questionScoreAverages[qIdx] += normalized;
      });

      // Group suggestions (open ended responses)
      if (evalItem.openAnswers[0]?.trim()) stats.suggestions.q8.push(evalItem.openAnswers[0].trim());
      if (evalItem.openAnswers[1]?.trim()) stats.suggestions.q9.push(evalItem.openAnswers[1].trim());
      if (evalItem.openAnswers[2]?.trim()) stats.suggestions.q10.push(evalItem.openAnswers[2].trim());
    });

    // Normalize sums into averages
    Object.keys(statsMap).forEach((id) => {
      const stats = statsMap[id];
      if (stats.totalEvaluations > 0) {
        stats.averageScore = Math.round(stats.averageScore / stats.totalEvaluations);

        // Normalize courses averages
        Object.keys(stats.courses).forEach((cName) => {
          stats.courses[cName].averageScore = Math.round(
            stats.courses[cName].averageScore / stats.courses[cName].count
          );
        });

        // Normalize question averages
        stats.questionScoreAverages = stats.questionScoreAverages.map((sum) =>
          Math.round(sum / stats.totalEvaluations)
        );

        // Identify strengths and weaknesses based on Q1-Q7 average scores
        const thresholdStrength = 80; // overall above 85% or 80% is fortaleza
        const thresholdWeakness = 60;   // overall below 60% is debilidad

        RATING_QUESTIONS.forEach((q, qIdx) => {
          const score = stats.questionScoreAverages[qIdx];
          if (score >= thresholdStrength) {
            stats.strengths.push({
              questionId: q.id,
              text: q.text,
              score
            });
          } else if (score <= thresholdWeakness) {
            stats.weaknesses.push({
              questionId: q.id,
              text: q.text,
              score
            });
          }
        });

        // Sort strengths descending, weaknesses ascending
        stats.strengths.sort((a, b) => b.score - a.score);
        stats.weaknesses.sort((a, b) => a.score - b.score);
      }
    });

    return statsMap;
  }, [filteredEvaluations]);

  const printTeachersList = useMemo(() => {
    let list: string[] = [];
    if (printScope === "all") {
      list = TEACHERS.map((t) => t.id);
    } else if (printScope === "multiple") {
      list = selectedPrintTeacherIds;
    } else if (printScope === "single") {
      if (singlePrintTeacherId) {
        list = [singlePrintTeacherId];
      }
    }
    return list.map((tid) => teachersStats[tid]).filter(Boolean);
  }, [printScope, selectedPrintTeacherIds, singlePrintTeacherId, teachersStats]);

  const finalTeachersToPrint = useMemo(() => {
    if (activePrintSet && activePrintSet.length > 0) {
      return activePrintSet;
    }
    if (selectedTeacherId) {
      const stats = teachersStats[selectedTeacherId];
      if (stats) return [stats];
    }
    return printTeachersList;
  }, [activePrintSet, selectedTeacherId, teachersStats, printTeachersList]);

  const getPrintListCount = () => {
    if (printScope === "all") return TEACHERS.length;
    if (printScope === "multiple") return selectedPrintTeacherIds.length;
    if (printScope === "single") return singlePrintTeacherId ? 1 : 0;
    return 0;
  };

  const downloadSelectedPDFs = () => {
    const list = printTeachersList;
    if (list.length === 0) {
      alert("Por favor, selecciona por lo menos un docente para poder generar el PDF.");
      return;
    }
    setActivePrintSet(list);
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        setActivePrintSet(null);
      }, 650);
    }, 120);
  };

  const getTeacherTrimesterComparison = (teacherId: string) => {
    const trimesters = ["1er Trimestre", "2do Trimestre", "3er Trimestre"];
    return trimesters.map((tri) => {
      const triEvals = evaluations.filter(
        (e) => e.teacherId === teacherId && (e.trimester || "1er Trimestre") === tri
      );
      const count = triEvals.length;
      let avgScore = 0;
      if (count > 0) {
        const sum = triEvals.reduce((acc, curr) => {
          const scoresSum = curr.scores.reduce((a, b) => a + b, 0);
          return acc + Math.round((scoresSum / 35) * 100);
        }, 0);
        avgScore = Math.round(sum / count);
      }
      return { trimester: tri, count, avgScore };
    });
  };

  // Overall metadata for the school
  const generalStats = useMemo(() => {
    const totalEvals = filteredEvaluations.length;
    const statsList = Object.values(teachersStats) as TeacherStats[];
    const evaluatedTeachersCount = statsList.filter(t => t.totalEvaluations > 0).length;
    
    if (totalEvals === 0) {
      return { totalEvals, evaluatedTeachersCount, averageScore: 0, topCourse: "N/A" };
    }

    const totalScoreSum = filteredEvaluations.reduce((acc, curr) => {
      const scoresSum = curr.scores.reduce((a, b) => a + b, 0);
      return acc + Math.round((scoresSum / 35) * 100);
    }, 0);
    const averageScore = Math.round(totalScoreSum / totalEvals);

    // Find course with the most evaluations
    const courseCounts: { [name: string]: number } = {};
    filteredEvaluations.forEach(e => {
      courseCounts[e.studentCourse] = (courseCounts[e.studentCourse] || 0) + 1;
    });
    
    let topCourse = "N/A";
    let maxCount = 0;
    Object.entries(courseCounts).forEach(([name, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topCourse = name;
      }
    });

    return {
      totalEvals,
      evaluatedTeachersCount,
      averageScore,
      topCourse: topCourse !== "N/A" ? `${topCourse} (${maxCount})` : "N/A"
    };

  }, [filteredEvaluations, teachersStats]);

  // Filter teachers dictionary list for admin dashboard
  const filteredTeacherStatsList = useMemo<TeacherStats[]>(() => {
    const list = Object.values(teachersStats) as TeacherStats[];
    const query = searchQuery.toLowerCase().trim();
    if (!query) return list;
    return list.filter(
      (stats) =>
        stats.teacherName.toLowerCase().includes(query) ||
        stats.subject.toLowerCase().includes(query)
    );
  }, [teachersStats, searchQuery]);

  // Active Selected Teacher Detailed data
  const activeStats = useMemo<TeacherStats | null>(() => {
    if (!selectedTeacherId) return null;
    return (teachersStats[selectedTeacherId] as TeacherStats) || null;
  }, [selectedTeacherId, teachersStats]);

  // Handle PDF generating / Printing targeted element
  const handlePrintReport = () => {
    window.focus();
    window.print();
  };

  const handleResetConfirm = async () => {
    const clean = resetPasscode.trim().toUpperCase();
    const cleanSaved = (savedPasscode || "").trim().toUpperCase();
    
    // Allow matching either the default DAMASO, the custom saved passcode, or general validation at the API level
    if (
      clean !== "DÁMASO" && 
      clean.normalize("NFD").replace(/[\u0300-\u036f]/g, "") !== "DAMASO" &&
      clean !== cleanSaved &&
      clean.normalize("NFD").replace(/[\u0300-\u036f]/g, "") !== cleanSaved.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    ) {
      setResetStatus("Error: La clave de confirmación es incorrecta.");
      return;
    }
    
    setResetStatus("Borrando datos...");
    const ok = await onResetDatabase();
    if (ok) {
      setResetStatus("La base de datos se ha reiniciado correctamente.");
      setTimeout(() => {
        setShowConfirmReset(false);
        setResetPasscode("");
        setResetStatus("");
      }, 2000);
    } else {
      setResetStatus("Ocurrió un error al intentar borrar las evaluaciones.");
    }
  };

  // Score badge coloring helper
  const getRatingBadgeClass = (score: number, isText: boolean = false) => {
    if (score >= 85) return isText ? "text-blue-600 font-bold" : "bg-blue-100 text-blue-800 border-blue-200";
    if (score >= 70) return isText ? "text-emerald-600 font-semibold" : "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (score >= 50) return isText ? "text-yellow-600 font-semibold" : "bg-yellow-100 text-yellow-800 border-yellow-200";
    return isText ? "text-red-600 font-bold" : "bg-red-100 text-red-800 border-red-200";
  };

  return (
    <div className="w-full max-w-7xl mx-auto py-6 px-4 space-y-6" id="admin-report-root">
      
      {/* HEADER SECTION (HIDDEN IN PRINT) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div id="admin-header-text">
          <span className="text-xs font-mono font-bold tracking-wider text-blue-800 bg-blue-50 px-3 py-1 rounded">
            PANEL DE ADMINISTRACIÓN SADOSA 2026
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
            Consolidado e Informe de Calificaciones
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm">
            Monitorea el rendimiento docente, visualiza estadísticas e imprime reportes oficiales por docente.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2" id="admin-header-actions">
          <button
            type="button"
            onClick={onRefresh}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </button>
          <button
            type="button"
            onClick={() => setShowConfirmReset(true)}
            className="flex items-center gap-2 px-4 py-2 border border-red-200 rounded-lg text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100/70 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Reiniciar Datos
          </button>
          <button
            type="button"
            onClick={onBackToForm}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
          >
            Modo Estudiante
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* SECCIÓN CONTROL MAESTRO DE ACCESO (PASSWORD: DÁMASO) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden" id="admin-security-control-panel">
        <div className="space-y-1">
          <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-2">
            <Lock className="h-4 w-4 text-blue-600 shrink-0" />
            Estado de Seguridad de la Red SADOSA
          </h2>
          <p className="text-xs text-slate-500 max-w-xl">
            Permite habilitar o pausar el sistema de evaluación en todas las computadoras del laboratorio en tiempo real. 
            Actualmente: <strong className={isLocked ? "text-red-600 uppercase font-black" : "text-emerald-700 uppercase font-black"}>{isLocked ? "❌ Bloqueado / Congelado" : "🟢 Habilitado y Abierto"}</strong>
          </p>
        </div>

        <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3 shrink-0">
          {!showInlineLockForm ? (
            <button
              type="button"
              onClick={() => {
                setInlineLockPass("");
                setInlineLockError("");
                setInlineLockSuccess("");
                setShowInlineLockForm(true);
              }}
              className={`px-5 py-2.5 rounded-lg text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all border ${
                isLocked
                  ? "bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-700 shadow-sm"
                  : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100/80"
              }`}
            >
              {isLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              {isLocked ? "Habilitar Evaluaciones" : "Bloquear las Evaluaciones"}
            </button>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setInlineLockError("");
                setInlineLockSuccess("");
                setInlineLockLoading(true);

                if (!onToggleLock) {
                  setInlineLockError("Error: Canal de control no vinculado.");
                  setInlineLockLoading(false);
                  return;
                }

                const targetLockValue = !isLocked;
                const res = await onToggleLock(targetLockValue, inlineLockPass);
                setInlineLockLoading(false);

                if (res.success) {
                  setInlineLockSuccess(`El sistema ha sido ${targetLockValue ? "BLOQUEADO" : "HABILITADO"} con éxito.`);
                  setInlineLockPass("");
                  setTimeout(() => {
                    setShowInlineLockForm(false);
                    setInlineLockSuccess("");
                  }, 2000);
                } else {
                  setInlineLockError(res.error || "Contraseña de control incorrecta.");
                }
              }}
              className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col gap-2 relative z-10 text-left"
            >
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                <input
                  type="password"
                  value={inlineLockPass}
                  onChange={(e) => setInlineLockPass(e.target.value)}
                  placeholder="Introduce la contraseña maestra..."
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 grow placeholder:font-sans text-center"
                  autoFocus
                  required
                />
                <div className="flex gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setShowInlineLockForm(false);
                      setInlineLockError("");
                    }}
                    className="px-3 py-1.5 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-all border border-slate-200 cursor-pointer"
                  >
                    Volver
                  </button>
                  <button
                    type="submit"
                    disabled={inlineLockLoading}
                    className={`px-4 py-1.5 text-white rounded-lg text-xs font-black transition-all shadow-sm shrink-0 cursor-pointer ${
                      isLocked ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
                    }`}
                  >
                    {inlineLockLoading ? "Procesando..." : isLocked ? "Habilitar" : "Bloquear"}
                  </button>
                </div>
              </div>

              {inlineLockError && (
                <span className="text-[10px] text-red-700 font-bold flex items-center gap-1">
                  <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-red-500" />
                  {inlineLockError}
                </span>
              )}

              {inlineLockSuccess && (
                <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 animate-pulse">
                  <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {inlineLockSuccess}
                </span>
              )}
            </form>
          )}
        </div>
      </div>

      {/* TRIMESTER FILTER SELECTOR (HIDDEN IN PRINT) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden" id="trimester-filter-actions">
        <label className="text-xs text-slate-750 font-extrabold tracking-wider uppercase font-mono flex items-center gap-2">
          <Calendar className="h-4 w-4 text-emerald-500 shrink-0" />
          Filtrar Período de Evaluación:
        </label>
        <div className="flex bg-slate-100 p-1 rounded-lg gap-1 border border-slate-200 self-start sm:self-auto shrink-0 flex-wrap">
          {["Todos", "1er Trimestre", "2do Trimestre", "3er Trimestre"].map((tri) => (
            <button
              key={tri}
              type="button"
              onClick={() => setSelectedTrimesterFilter(tri)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedTrimesterFilter === tri
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              {tri === "Todos" ? "Todos los Trimestres" : tri}
            </button>
          ))}
        </div>
      </div>

      {/* PDF Export Control Panel (PRINTS ONE, SEVERAL, OR ALL TEACHERS) */}
      {!selectedTeacherId && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 p-5 rounded-2xl border border-blue-100 shadow-sm print:hidden text-left space-y-4" id="pdf-export-panel">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 text-white p-2 rounded-xl">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider font-mono">Centro de Descarga e Impresión de Reportes PDF</h3>
              <p className="text-[11px] text-slate-500 font-medium font-sans">Exporta informes oficiales de evaluación para uno, varios o todos los docentes en un solo lote PDF.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-xl border border-slate-200">
            {/* Selector 1: Scope */}
            <div className="space-y-1.5 border-b md:border-b-0 md:border-r border-slate-200 pb-3 md:pb-0 md:pr-4">
              <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">1. Ámbitos de Descarga:</span>
              <div className="flex flex-col gap-2 mt-2">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input 
                    type="radio" 
                    name="printScope" 
                    value="all" 
                    checked={printScope === "all"} 
                    onChange={() => setPrintScope("all")} 
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded-full" 
                  />
                  <span>Todos los Docentes (33)</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input 
                    type="radio" 
                    name="printScope" 
                    value="multiple" 
                    checked={printScope === "multiple"} 
                    onChange={() => setPrintScope("multiple")} 
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded-full" 
                  />
                  <span>Varios Docentes (Lista)</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input 
                    type="radio" 
                    name="printScope" 
                    value="single" 
                    checked={printScope === "single"} 
                    onChange={() => setPrintScope("single")} 
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded-full" 
                  />
                  <span>Un Docente Particular</span>
                </label>
              </div>
            </div>

            {/* Selector 2: Selection based on scope */}
            <div className="space-y-1.5 md:col-span-2 md:pl-2">
              <span class="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">2. Selección y Configuración del lote:</span>
              
              {/* If single teacher */}
              {printScope === "single" && (
                <div className="pt-1">
                  <select 
                    value={singlePrintTeacherId} 
                    onChange={(e) => setSinglePrintTeacherId(e.target.value)} 
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs bg-slate-50 text-slate-950 font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Elige un maestro --</option>
                    {TEACHERS.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} [{t.subject}]</option>
                    ))}
                  </select>
                </div>
              )}

              {/* If all */}
              {printScope === "all" && (
                <div className="text-xs text-slate-600 font-semibold leading-relaxed pt-1 select-none">
                  Se generará un informe consolidado que agrupará a los <strong class="text-blue-700">33 docentes</strong> evaluados. Cada reporte incluirá su cabecera, tabla de criterios de desempeño, comparativas y comentarios, con un salto de página automático entre ellos.
                </div>
              )}

              {/* If multiple */}
              {printScope === "multiple" && (
                <div className="space-y-2 pt-1">
                  <div className="flex gap-2">
                    <button 
                      type="button" 
                      onClick={() => setSelectedPrintTeacherIds(TEACHERS.map((t) => t.id))} 
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded text-[9px] font-extrabold transition-all uppercase font-mono cursor-pointer"
                    >
                      Marcar Todos
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setSelectedPrintTeacherIds([])} 
                      className="px-2 py-1 bg-red-50 hover:bg-red-100 border border-red-100 text-red-700 rounded text-[9px] font-extrabold transition-all uppercase font-mono cursor-pointer"
                    >
                      Limpiar
                    </button>
                  </div>
                  {/* Box height restricted with list */}
                  <div className="max-h-28 overflow-y-auto border border-slate-200 rounded-lg p-2.5 bg-slate-50 space-y-1.5">
                    {TEACHERS.map((t) => (
                      <div key={t.id} className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id={`print-chk-${t.id}`} 
                          value={t.id} 
                          checked={selectedPrintTeacherIds.includes(t.id)} 
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPrintTeacherIds([...selectedPrintTeacherIds, t.id]);
                            } else {
                              setSelectedPrintTeacherIds(selectedPrintTeacherIds.filter((id) => id !== t.id));
                            }
                          }} 
                          className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer" 
                        />
                        <label htmlFor={`print-chk-${t.id}`} className="text-[10px] font-bold text-slate-700 cursor-pointer select-none">
                          {t.name} <span className="text-slate-400 font-normal font-sans">({t.subject})</span>
                        </label>
                      </div>
                    ))}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">
                    Seleccionados en lote: <strong class="text-blue-700">{selectedPrintTeacherIds.length}</strong> de 33 docentes.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action block with download button */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 border-t border-slate-200/50">
            <div className="text-[9px] text-slate-400 font-mono text-center sm:text-left leading-relaxed">
              * El sistema genera un PDF limpio sin banners mediante el diálogo de impresión de su computadora. Active "Gráficos de fondo" en su diálogo para no omitir colores.
            </div>
            <button 
              type="button" 
              onClick={downloadSelectedPDFs}
              className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all hover:-translate-y-0.5"
            >
              <Printer className="h-4 w-4" />
              <span>Generar Documento PDF ({getPrintListCount()} seleccionados)</span>
            </button>
          </div>
        </div>
      )}

      {/* METRIC CARD GRID (HIDDEN IN PRINT) */}
      {(!activeStats) && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print:hidden" id="metric-cards-grid">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="bg-blue-50 text-blue-700 p-3 rounded-xl shrink-0">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs text-slate-500 block font-medium">Evaluaciones</span>
              <span className="text-2xl font-bold tracking-tight text-slate-900">{generalStats.totalEvals}</span>
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl shrink-0">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs text-slate-500 block font-medium">Promedio General</span>
              <span className="text-2xl font-bold tracking-tight text-emerald-700">{generalStats.averageScore} <span className="text-xs font-semibold text-slate-400">/100</span></span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="bg-amber-50 text-amber-700 p-3 rounded-xl shrink-0">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs text-slate-500 block font-medium">Docentes Evaluados</span>
              <span className="text-2xl font-bold tracking-tight text-slate-900">
                {generalStats.evaluatedTeachersCount} <span className="text-xs text-slate-400">/ 33</span>
              </span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="bg-indigo-50 text-indigo-700 p-3 rounded-xl shrink-0">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs text-slate-500 block font-medium">Curso más Participante</span>
              <span className="text-sm font-bold text-slate-800 truncate block max-w-[150px] mt-1">
                {generalStats.topCourse}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* SECCIÓN COMPARATIVA DE TRIMESTRES (VISIBLE EN EL DASHBOARD GENERAL) */}
      {!activeStats && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4 print:hidden" id="trimester-school-comparison">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <TrendingUp className="h-5 w-5 text-blue-600 animate-pulse shrink-0" />
            <div>
              <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                Comparativa Trimestral del Rendimiento y Participación
              </h2>
              <p className="text-slate-550 text-xs mt-0.5 leading-relaxed">
                Evaluaciones recopiladas y calificación promedio consolidada por cada período del año escolar. Haz clic en un trimestre para filtrar el panel.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {trimesterComparison.map((triData) => {
              const isSelected = selectedTrimesterFilter === triData.trimester;
              return (
                <button
                  key={triData.trimester}
                  type="button"
                  onClick={() => setSelectedTrimesterFilter(triData.trimester)}
                  className={`text-left p-4 rounded-xl border transition-all hover:shadow-md flex flex-col justify-between whitespace-normal ${
                    isSelected
                      ? "bg-blue-50/65 border-blue-500 shadow-sm ring-1 ring-blue-500"
                      : "bg-slate-50/55 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex justify-between items-start w-full">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block">PERÍODO ESCOLAR</span>
                      <h3 className="text-sm font-extrabold text-slate-950 mt-0.5">{triData.trimester}</h3>
                    </div>
                    {isSelected && (
                      <span className="text-[9px] font-bold uppercase font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                        ACTIVO
                      </span>
                    )}
                  </div>
                  
                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-200/60 pt-3 w-full">
                    <div>
                      <span className="text-[10px] text-slate-500 font-mono block">EVALUACIONES</span>
                      <strong className="text-sm font-black text-slate-800">{triData.count} <span className="text-[10px] text-slate-400 font-medium">unids</span></strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-mono block">PROMEDIO GLOBAL</span>
                      <strong className={`text-sm font-black ${
                        triData.avgScore >= 80 ? "text-blue-700" : triData.avgScore >= 70 ? "text-emerald-600" : triData.avgScore > 0 ? "text-yellow-600" : "text-slate-400"
                      }`}>
                        {triData.avgScore > 0 ? `${triData.avgScore}/100` : "Sin Datos"}
                      </strong>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* SECCIÓN DE TABS DE NAVEGACIÓN PRINCIPAL (SOLO SI NO HAY MAESTRO SELECCIONADO) */}
      {!activeStats && (
        <div className="flex border-b border-slate-200 mt-2 print:hidden" id="admin-main-screen-tabs">
          <button
            onClick={() => setMainTab("teachers")}
            className={`pb-3 text-sm font-extrabold border-b-2 px-2 transition-all flex items-center gap-2 ${
              mainTab === "teachers"
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <GraduationCap className="h-5 w-5" />
            Puntajes y Desempeño Docente ({Object.keys(teachersStats).length})
          </button>
          <button
            onClick={() => setMainTab("complementation")}
            className={`pb-3 text-sm font-extrabold border-b-2 px-2 ml-6 transition-all flex items-center gap-2 ${
              mainTab === "complementation"
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <MessageSquare className="h-5 w-5" />
            Análisis de Preguntas de Complementación ({uniqueSubmissions.length})
          </button>
        </div>
      )}

      {/* RENDER REPORT DETAILS GRID IF TEACHER SELECTED */}
      {activeStats ? (
        <div className="space-y-6" id="teacher-detail-dashboard">
          
          {/* BACK ROW & PRINT BTN */}
          <div className="flex justify-between items-center print:hidden">
            <button
              onClick={() => setSelectedTeacherId("")}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-950 font-bold text-sm bg-white border border-slate-200 px-4 py-2 rounded-lg hover:shadow-sm transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a la Lista
            </button>
            <button
              onClick={handlePrintReport}
              disabled={activeStats.totalEvaluations === 0}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeStats.totalEvaluations > 0 
                  ? "bg-slate-900 text-white cursor-pointer hover:bg-slate-850"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
              }`}
            >
              <Printer className="h-4 w-4" />
              Generar / Imprimir PDF
            </button>
          </div>

          {activeStats.totalEvaluations === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 max-w-xl mx-auto print:hidden">
              <ShieldAlert className="h-12 w-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-800">Maestro Sin Evaluaciones</h3>
              <p className="text-slate-500 text-sm mt-1">
                {activeStats.teacherName} todavía no ha sido calificado por ningún estudiante en este periodo evaluativo.
              </p>
              <button
                onClick={() => setSelectedTeacherId("")}
                className="mt-6 px-4 py-2 text-xs font-bold text-blue-600 border border-blue-200 rounded-lg bg-blue-50 hover:bg-blue-100 transition-all"
              >
                Volver a la Lista General
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 align-stretch print:hidden">
              
              {/* PRIMARY DOSSIER & METADATA */}
              <div className="lg:col-span-1 space-y-6">
                
                {/* Score Summary Box */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center space-y-4">
                  <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">PUNTUACIÓN GLOBAL</span>
                  <div className="relative flex items-center justify-center">
                    
                    {/* SVG Circular Progress Meter */}
                    <svg className="w-36 h-36">
                      <circle
                        className="text-slate-100"
                        strokeWidth="10"
                        stroke="currentColor"
                        fill="transparent"
                        r="58"
                        cx="72"
                        cy="72"
                      />
                      <circle
                        className={activeStats.averageScore >= 85 ? "text-blue-600" : activeStats.averageScore >= 70 ? "text-emerald-500" : activeStats.averageScore >= 50 ? "text-yellow-500" : "text-red-500"}
                        strokeWidth="10"
                        strokeDasharray={364.4}
                        strokeDashoffset={364.4 - (364.4 * activeStats.averageScore) / 100}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r="58"
                        cx="72"
                        cy="72"
                        transform="rotate(-90 72 72)"
                      />
                    </svg>
                    <div className="absolute text-center">
                      <span className="text-4xl font-extrabold tracking-tighter text-slate-900">{activeStats.averageScore}</span>
                      <span className="text-xs font-bold text-slate-400 block uppercase">Sobre 100</span>
                    </div>
                  </div>

                  <div className="w-full">
                    <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight">{activeStats.teacherName}</h3>
                    <p className="text-xs text-slate-500 font-medium tracking-wide uppercase mt-1">{activeStats.subject}</p>
                    <div className="mt-4 flex justify-center gap-4 text-xs font-medium text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div>
                        <span className="text-slate-400 block">Evaluaciones:</span>
                        <strong className="text-slate-900 text-sm font-bold">{activeStats.totalEvaluations}</strong>
                      </div>
                      <div className="border-r border-slate-200" />
                      <div>
                        <span className="text-slate-400 block">Estado:</span>
                        <strong className={`${getRatingBadgeClass(activeStats.averageScore, true)} text-sm font-bold`}>
                          {activeStats.averageScore >= 85 ? "Sobresaliente" : activeStats.averageScore >= 70 ? "Competente" : activeStats.averageScore >= 50 ? "Regular" : "Insuficiente"}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Courses That evaluated docent */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-blue-600" />
                      Cursos Evaluadores
                    </h4>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-500 font-semibold">
                      {Object.keys(activeStats.courses).length} Cursos
                    </span>
                  </div>
                  
                  <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                    {(Object.entries(activeStats.courses) as [string, { count: number; averageScore: number }][]).map(([courseName, rating]) => (
                      <div key={courseName} className="flex justify-between items-center text-xs p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50/50">
                        <span className="text-slate-700 font-medium truncate max-w-[200px]">{courseName}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-slate-400 font-mono">({rating.count} ev.)</span>
                          <span className={`px-2 py-0.5 rounded font-bold border ${getRatingBadgeClass(rating.averageScore)}`}>
                            {rating.averageScore}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Trimester evolution for the specific teacher (comparative analytics) */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-emerald-500 shrink-0" />
                      Rendimiento por Trimestre
                    </h4>
                  </div>
                  
                  <div className="space-y-3">
                    {teacherTrimesterComparison?.map((triData) => (
                      <div key={triData.trimester} className="flex flex-col p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-extrabold text-slate-800">{triData.trimester}</span>
                          <span className="text-[10px] text-slate-500 font-mono font-medium">({triData.count} ev.)</span>
                        </div>
                        
                        <div className="mt-2 flex items-center justify-between gap-3">
                          {triData.count > 0 ? (
                            <>
                              <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    triData.avgScore >= 80 ? "bg-blue-600" : triData.avgScore >= 70 ? "bg-emerald-500" : "bg-yellow-500"
                                  }`} 
                                  style={{ width: `${triData.avgScore}%` }}
                                />
                              </div>
                              <span className={`text-xs font-mono font-bold shrink-0 ${getRatingBadgeClass(triData.avgScore, true)}`}>
                                {triData.avgScore}%
                              </span>
                            </>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic leading-none">Sin datos este trimestre</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
              
              {/* COMPREHENSIVE GRAPHS & TABULATOR FIELDS */}
              <div className="lg:col-span-2 space-y-6">

                {/* Question Score chart averages (Q1 to Q7) */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                  <div className="flex border-b border-slate-200">
                    <button
                      onClick={() => setActiveTab("ratings")}
                      className={`pb-3 text-sm font-bold border-b-2 px-1 transition-all flex items-center gap-2 ${
                        activeTab === "ratings"
                          ? "border-blue-600 text-blue-600"
                          : "border-transparent text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <Sliders className="h-4 w-4" />
                      Competencias Docentes (Q1 - Q7)
                    </button>
                    <button
                      onClick={() => setActiveTab("text")}
                      className={`pb-3 text-sm font-bold border-b-2 px-1 ml-4 transition-all flex items-center gap-2 ${
                        activeTab === "text"
                          ? "border-blue-600 text-blue-600"
                          : "border-transparent text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <MessageSquare className="h-4 w-4" />
                      Sugerencias Estudiantiles
                    </button>
                  </div>

                  {activeTab === "ratings" ? (
                    <div className="space-y-4" id="ratings-bars-list">
                      {RATING_QUESTIONS.map((q, qIdx) => {
                        const score = activeStats.questionScoreAverages[qIdx];
                        return (
                          <div key={q.id} className="space-y-1.5" id={`analytics-q${q.id}`}>
                            <div className="flex justify-between items-start text-xs sm:text-xs text-slate-600 gap-4">
                              <span className="font-semibold text-slate-700 flex gap-1.5 leading-tight">
                                <span className="text-blue-600 font-mono font-bold">{q.id}.</span> 
                                {q.text}
                              </span>
                              <span className={`font-bold shrink-0 font-mono ${
                                score >= 80 ? "text-blue-700" : score >= 60 ? "text-slate-800" : "text-red-600"
                              }`}>{score} pts</span>
                            </div>
                            
                            {/* SVG style bar */}
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ease-out ${
                                  score >= 80 ? "bg-blue-600" : score >= 60 ? "bg-emerald-500" : score >= 40 ? "bg-amber-500" : "bg-red-500"
                                }`}
                                style={{ width: `${score}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-5 max-h-[480px] overflow-y-auto pr-2" id="text-comments-view">
                      {/* Q8 */}
                      <div className="space-y-2">
                        <h5 className="text-[11px] sm:text-xs font-extrabold font-mono text-blue-900 bg-blue-50/70 p-3 rounded-lg border border-blue-100 leading-tight">
                          Q8. ¿Qué área, taller o actividad complementaria te gustaría que la Unidad Educativa incorpore para fortalecer tu formación integral?
                        </h5>
                        {activeStats.suggestions.q8.length > 0 ? (
                          <ul className="divide-y divide-slate-100 select-all space-y-1.5">
                            {activeStats.suggestions.q8.map((s, idx) => (
                              <li key={idx} className="py-2.5 text-xs sm:text-sm text-slate-700 leading-relaxed pl-3.5 border-l-3 border-blue-500 bg-slate-50/50 rounded-r-lg">
                                "{s}"
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-slate-400 italic pl-3">Aún no hay respuestas registradas para esta pregunta.</p>
                        )}
                      </div>

                      {/* Q9 */}
                      <div className="space-y-2">
                        <h5 className="text-[11px] sm:text-xs font-extrabold font-mono text-indigo-900 bg-indigo-50/70 p-3 rounded-lg border border-indigo-100 leading-tight">
                          Q9. ¿Qué ambiente, espacio o recurso consideras necesario implementar o mejorar para apoyar tu desarrollo académico, cultural, deportivo o tecnológico?
                        </h5>
                        {activeStats.suggestions.q9.length > 0 ? (
                          <ul className="divide-y divide-slate-100 select-all space-y-1.5">
                            {activeStats.suggestions.q9.map((s, idx) => (
                              <li key={idx} className="py-2.5 text-xs sm:text-sm text-slate-700 leading-relaxed pl-3.5 border-l-3 border-indigo-500 bg-slate-50/50 rounded-r-lg">
                                "{s}"
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-slate-400 italic pl-3">Aún no hay respuestas registradas para esta pregunta.</p>
                        )}
                      </div>

                      {/* Q10 */}
                      <div className="space-y-2">
                        <h5 className="text-[11px] sm:text-xs font-extrabold font-mono text-emerald-900 bg-emerald-50/70 p-3 rounded-lg border border-emerald-100 leading-tight">
                          Q10. ¿Qué sugerencia realizarías para mejorar la calidad educativa y el bienestar estudiantil en la Unidad Educativa Santo Domingo Savio?
                        </h5>
                        {activeStats.suggestions.q10.length > 0 ? (
                          <ul className="divide-y divide-slate-100 select-all space-y-1.5">
                            {activeStats.suggestions.q10.map((s, idx) => (
                              <li key={idx} className="py-2.5 text-xs sm:text-sm text-slate-700 leading-relaxed pl-3.5 border-l-3 border-emerald-500 bg-slate-50/50 rounded-r-lg">
                                "{s}"
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-slate-400 italic pl-3">Aún no hay respuestas registradas para esta pregunta.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Strengths and Weaknesses derived */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Strengths card */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                      Fortalezas Identificadas
                    </h4>
                    {activeStats.strengths.length > 0 ? (
                      <div className="space-y-2.5">
                        {activeStats.strengths.map((str) => (
                          <div key={str.questionId} className="text-xs bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100 leading-relaxed">
                            <span className="font-semibold text-emerald-800 block">Q{str.questionId}: {str.text}</span>
                            <span className="text-emerald-700 block mt-1 font-mono font-bold">Desempeño Alto ({str.score}/100)</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic py-3">Ninguna dimensión cumple el criterio de Fortaleza Académica (&gt;= 80 pts).</p>
                    )}
                  </div>

                  {/* Weaknesses card */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <XOctagon className="h-4 w-4 text-red-500 shrink-0" />
                      Debilidades (Áreas de Mejora)
                    </h4>
                    {activeStats.weaknesses.length > 0 ? (
                      <div className="space-y-2.5">
                        {activeStats.weaknesses.map((wk) => (
                          <div key={wk.questionId} className="text-xs bg-red-50/50 p-2.5 rounded-lg border border-red-100 leading-relaxed">
                            <span className="font-semibold text-red-800 block">Q{wk.questionId}: {wk.text}</span>
                            <span className="text-red-700 block mt-1 font-mono font-bold">Por Mejorar ({wk.score}/100)</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic py-3">Ninguna dimensión cumple el criterio de Debilidad (&lt;= 60 pts).</p>
                    )}
                  </div>

                </div>

              </div>

            </div>
          )}

        </div>
      ) : (
        mainTab === "teachers" ? (
          /* LIST OF ALL TEACHERS GRID */
          <div className="space-y-4 print:hidden" id="teachers-list-container">
            
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filtrar por Maestro(a) o Asignatura..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  id="admin-teacher-filter"
                />
              </div>
              <div className="text-xs font-mono text-slate-500 shrink-0">
                Mostrando: <strong>{filteredTeacherStatsList.length}</strong> de <strong>33</strong> Docentes
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" id="admin-table">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-mono font-bold border-b border-slate-200">
                      <th className="px-6 py-4">Apellidos y Nombres</th>
                      <th className="px-6 py-4">Asignatura</th>
                      <th className="px-6 py-4 text-center">Evaluaciones</th>
                      <th className="px-6 py-4 text-center">Puntaje Global</th>
                      <th className="px-6 py-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredTeacherStatsList.map((t) => {
                      return (
                        <tr key={t.teacherId} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-900">{t.teacherName}</td>
                          <td className="px-6 py-4">
                            <span className="uppercase text-xs font-semibold font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded">
                              {t.subject}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {t.totalEvaluations > 0 ? (
                              <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-full text-xs">
                                {t.totalEvaluations}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs italic">Ninguna</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {t.totalEvaluations > 0 ? (
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getRatingBadgeClass(t.averageScore)}`}>
                                {t.averageScore} / 100
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs italic">--</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => setSelectedTeacherId(t.teacherId)}
                              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              Ver Informe
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {filteredTeacherStatsList.length === 0 && (
                <div className="p-8 text-center text-slate-400 italic text-sm">
                  No se encontraron registros para la búsqueda.
                </div>
              )}
            </div>

          </div>
        ) : (
          /* CONSOLIDATED SEMANTICS VIEW PANEL */
          <div className="space-y-6 print:hidden font-sans" id="complementation-analytics">
            
            {/* Top Panel Banner */}
            <div className="bg-gradient-to-r from-blue-700 via-indigo-800 to-indigo-900 p-6 rounded-2xl text-white shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-mono font-bold bg-white/20 px-2.5 py-1 rounded tracking-wider">
                  Análisis Semántico de Sugerencias
                </span>
                <h2 className="text-xl sm:text-2xl font-black font-sans tracking-tight">
                  Consolidado de Preguntas de Complementación (Análisis)
                </h2>
                <p className="text-blue-100/90 text-xs font-medium">
                  Sugerencias y análisis inteligente de palabras más recurrentes provistos por los alumnos de forma 100% anónima.
                </p>
              </div>
              
              {/* Filter Dropdown */}
              <div className="flex flex-col gap-1 w-full md:w-auto shrink-0">
                <label className="text-[10px] font-mono tracking-wider font-bold text-blue-200 uppercase">Filtrar por Curso:</label>
                <select
                  value={selectedComplementationCourse}
                  onChange={(e) => setSelectedComplementationCourse(e.target.value)}
                  className="bg-white/10 text-white font-extrabold text-xs rounded-xl px-4 py-2.5 border border-white/20 focus:outline-none focus:ring-2 focus:ring-white focus:bg-slate-900/40"
                >
                  <option value="" className="text-slate-900 font-bold">Todos los Cursos</option>
                  {COURSES.map(course => (
                    <option key={course} value={course} className="text-slate-900 font-medium">
                      {course}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cards list for each of the 3 complementation/open questions */}
            <div className="space-y-6">
              {OPEN_QUESTIONS.map((q, idx) => {
                // Get current word frequencies and comments lists
                const freqWords = idx === 0 ? q8Frequencies : idx === 1 ? q9Frequencies : q10Frequencies;
                const allSubm = uniqueSubmissions.filter(s => !selectedComplementationCourse || s.studentCourse === selectedComplementationCourse);
                const comments = allSubm
                  .map(s => ({ course: s.studentCourse, text: s?.openAnswers?.[idx] || "" }))
                  .filter(c => c.text.trim().length > 0);

                const colorThemes = [
                  { border: "border-blue-100", accentBg: "bg-blue-50 text-blue-800", pillBg: "bg-blue-50 hover:bg-blue-100/80 text-blue-900" },
                  { border: "border-indigo-100", accentBg: "bg-indigo-50 text-indigo-800", pillBg: "bg-indigo-50 hover:bg-indigo-100/80 text-indigo-900" },
                  { border: "border-emerald-100", accentBg: "bg-emerald-50 text-emerald-800", pillBg: "bg-emerald-50 hover:bg-emerald-100/80 text-emerald-950" }
                ];
                const theme = colorThemes[idx] || colorThemes[0];

                return (
                  <div key={q.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" id={`central-q${q.id}-card`}>
                    {/* Card Question Header */}
                    <div className="p-5 border-b border-slate-100 flex items-start gap-4">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 text-white text-sm font-black font-mono shrink-0 mt-0.5">
                        {q.id}
                      </span>
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-mono tracking-wider font-extrabold uppercase text-slate-500">Pregunta de Complementación</span>
                        <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                          {q.text}
                        </h3>
                      </div>
                    </div>

                    {/* Frequency cloud/pills block */}
                    <div className="bg-slate-50/50 p-5 border-b border-slate-100 space-y-3.5">
                      <div className="flex gap-2 items-center">
                        <Sparkles className="h-4.5 w-4.5 text-amber-500 animate-pulse" />
                        <h4 className="text-xs font-bold uppercase font-mono tracking-wider text-slate-700">
                          Palabras Clave más Recurrente / Análisis de Frecuencia:
                        </h4>
                      </div>

                      {freqWords.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {freqWords.map((item, w_idx) => (
                            <div 
                              key={w_idx}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${theme.pillBg} shadow-sm cursor-default transform hover:-translate-y-0.5`}
                              title={`Repetida ${item.count} veces`}
                            >
                              <span>{item.word}</span>
                              <span className="text-[10px] px-1.5 py-0.5 bg-white/70 border border-slate-200 rounded-md font-mono font-black text-slate-800">
                                {item.count} {item.count === 1 ? 'vez' : 'veces'}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-450 italic">
                          No hay suficientes sugerencias redactadas para registrar palabras recurrentes automáticamente.
                        </p>
                      )}
                    </div>

                    {/* Actual Student Comments Lists */}
                    <div className="p-5 space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-extrabold uppercase font-mono tracking-wider text-slate-600 flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-blue-600" />
                          Listado de Respuestas Reales de Estudiantes:
                        </h4>
                        <span className="text-[10px] font-mono bg-slate-100 border text-slate-500 font-extrabold px-2.5 py-1 rounded-full">
                          {comments.length} Respuestas
                        </span>
                      </div>

                      {comments.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                          {comments.map((comment, commentIdx) => (
                            <div 
                              key={commentIdx} 
                              className={`p-3.5 bg-white border rounded-xl leading-relaxed text-xs sm:text-sm text-slate-800 flex flex-col justify-between gap-2.5 shadow-sm transition-all hover:shadow-md ${theme.border}`}
                            >
                              <span className="font-semibold block italic text-slate-900 leading-normal">
                                "{comment.text}"
                              </span>
                              <div className="flex justify-between items-center border-t border-slate-100/60 pt-2 mt-1">
                                <span className="text-[9px] uppercase font-mono bg-slate-50 border border-slate-250/55 px-2 py-0.5 rounded text-slate-550 font-bold">
                                  {comment.course}
                                </span>
                                <span className="text-[9px] text-slate-400 font-mono">
                                  Anónimo
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-450 italic py-4">
                          Ningún comentario ingresado para este curso.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}

      {/* PDF PRINT DESIGN (COMPLETELY DEDICATED TEMPLATE ACCORDING TO DESIRED SCOPE) */}
      {finalTeachersToPrint.length > 0 && (
        <div id="printable-report-area" className="hidden print:block bg-white text-slate-955 font-sans p-2">
          {finalTeachersToPrint.map((stats, statsIdx) => {
            const comparisonData = getTeacherTrimesterComparison(stats.teacherId);
            return (
              <div 
                key={stats.teacherId} 
                className={`${statsIdx > 0 ? "page-break pt-8" : ""} border-b border-dashed border-slate-300 pb-10 mb-10 last:border-0 last:pb-0 last:mb-0`}
              >
                {/* Official Emblem Header */}
                <div className="text-center border-b-2 border-slate-950 pb-5 mb-8">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight uppercase">
                    Unidad Educativa Santo Domingo Savio Particular
                  </h2>
                  <p className="text-xs font-mono tracking-widest uppercase text-slate-600 mt-1">
                    Departamento de Evaluación y Dirección Académica • Secundaria
                  </p>
                  <div className="mt-4 inline-block bg-slate-950 text-white px-6 py-1 text-xs font-bold uppercase tracking-wider">
                    INFORME DIGITAL DE CALIFICACIÓN DOCENTE GESTIÓN 2026
                  </div>
                </div>

                {/* Dossier Metadata Grid */}
                <div className="grid grid-cols-2 gap-y-4 gap-x-6 border border-slate-950 p-4 mb-6 text-sm">
                  <div>
                    <span className="text-xs uppercase font-mono font-bold text-slate-500 block">Apellidos y Nombres del Docente:</span>
                    <strong className="text-base text-slate-950 block">{stats.teacherName}</strong>
                  </div>
                  <div>
                    <span className="text-xs uppercase font-mono font-bold text-slate-500 block">Asignatura / Área Curricular:</span>
                    <strong className="text-base text-slate-950 block">{stats.subject}</strong>
                  </div>
                  <div>
                    <span className="text-xs uppercase font-mono font-bold text-slate-500 block">Periodo Evaluativo Reportado:</span>
                    <strong className="text-base text-slate-950 block">
                      {selectedTrimesterFilter === "Todos" ? "Gestión Completa (Los 3 Trimestres)" : selectedTrimesterFilter}
                    </strong>
                  </div>
                  <div>
                    <span className="text-xs uppercase font-mono font-bold text-slate-500 block">Cantidad de Evaluaciones Recibidas:</span>
                    <strong className="text-base text-slate-950 block">{stats.totalEvaluations} Estudiantes</strong>
                  </div>
                  <div className="col-span-2 border-t border-slate-200 pt-2">
                    <span className="text-xs uppercase font-mono font-bold text-slate-500 block">Calificación Consolidada Global:</span>
                    <strong className="text-lg text-slate-950 block">{stats.averageScore} / 100 Puntos</strong>
                  </div>
                </div>

                {/* Section 1: Quantitative Averages */}
                <div className="mb-6">
                  <h3 className="text-sm font-bold uppercase bg-slate-100 px-3 py-1.5 border-l-4 border-slate-950 mb-3 block">
                    I. Resumen de Competencias Evaluadas (Base 100 Puntos)
                  </h3>
                  <table className="w-full border border-slate-300 text-xs text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-300">
                        <th className="px-4 py-2 border-r border-slate-300">N°</th>
                        <th className="px-4 py-2 border-r border-slate-300">Pregunta Formulario</th>
                        <th className="px-4 py-2 text-right">Puntaje Promedio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300">
                      {RATING_QUESTIONS.map((q, qIdx) => (
                        <tr key={q.id}>
                          <td className="px-4 py-2 w-10 font-bold border-r border-slate-300 text-center">{q.id}</td>
                          <td className="px-4 py-2 border-r border-slate-300">{q.text}</td>
                          <td className="px-4 py-2 text-right font-bold font-mono">{stats.questionScoreAverages[qIdx]} pts</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Section 2: Courses Participants */}
                <div className="mb-6">
                  <h3 className="text-sm font-bold uppercase bg-slate-100 px-3 py-1.5 border-l-4 border-slate-950 mb-3 block">
                    II. Cursos Evaluadores y Desempeño Relacionado
                  </h3>
                  <table className="w-full border border-slate-300 text-xs text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-300">
                        <th className="px-4 py-2 border-r border-slate-300">Grado y Curso de Secundaria</th>
                        <th className="px-4 py-2 border-r border-slate-300 text-center">Evaluaciones</th>
                        <th className="px-4 py-2 text-right">Promedio del Curso (100)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300">
                      {Object.entries(stats.courses).map(([courseName, item]: [string, any]) => (
                        <tr key={courseName}>
                          <td className="px-4 py-2 font-bold border-r border-slate-300">{courseName}</td>
                          <td className="px-4 py-2 border-r border-slate-300 text-center font-mono">{item.count}</td>
                          <td className="px-4 py-2 text-right font-bold font-mono">{item.averageScore} pts</td>
                        </tr>
                      ))}
                      {Object.keys(stats.courses).length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-4 py-4 text-center text-slate-500 italic">No hay registros de cursos evaluadores para este periodo.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Section II.B: Performance over trimesters */}
                <div className="mb-6 avoid-break">
                  <h3 className="text-sm font-bold uppercase bg-slate-100 px-3 py-1.5 border-l-4 border-slate-950 mb-3">
                    III. Comparativa de Rendimiento Histórico por Trimestre
                  </h3>
                  <table className="w-full border border-slate-300 text-xs text-left text-slate-950">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-300 font-bold">
                        <th className="px-4 py-2 border-r border-slate-300">Periodo Académico</th>
                        <th className="px-4 py-2 border-r border-slate-300 text-center">Evaluaciones Recibidas</th>
                        <th className="px-4 py-2 text-right">Calificación Promedio (100 pts)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300">
                      {comparisonData.map((triData) => (
                        <tr key={triData.trimester}>
                          <td className="px-4 py-2 font-bold border-r border-slate-300">{triData.trimester}</td>
                          <td className="px-4 py-2 border-r border-slate-300 text-center font-mono">{triData.count}</td>
                          <td className="px-4 py-2 text-right font-bold font-mono">
                            {triData.count > 0 ? `${triData.avgScore} pts` : "Sin registro / Sin evaluaciones"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Section 3: Strengths and Weaknesses */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="border border-slate-300 p-3 rounded">
                    <h4 className="text-xs font-bold uppercase text-slate-800 border-b pb-1 mb-2">FORTALEZAS</h4>
                    {stats.strengths.length > 0 ? (
                      <ul className="list-disc pl-4 space-y-1 text-[11px]">
                        {stats.strengths.map((s: any) => (
                          <li key={s.questionId}>
                            <strong>Q{s.questionId}:</strong> {s.text} ({s.score} pts)
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[11px] text-slate-500 italic">No registradas por criterios mínimos.</p>
                    )}
                  </div>
                  
                  <div className="border border-slate-300 p-3 rounded">
                    <h4 className="text-xs font-bold uppercase text-slate-805 border-b pb-1 mb-2">DEBILIDADES / ÁREAS DE MEJORA</h4>
                    {stats.weaknesses.length > 0 ? (
                      <ul className="list-disc pl-4 space-y-1 text-[11px]">
                        {stats.weaknesses.map((w: any) => (
                          <li key={w.questionId}>
                            <strong>Q{w.questionId}:</strong> {w.text} ({w.score} pts)
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[11px] text-slate-500 italic">No registradas por criterios mínimos.</p>
                    )}
                  </div>
                </div>

                {/* Section 4: Open suggestions */}
                <div className="mb-8">
                  <h3 className="text-sm font-bold uppercase bg-slate-100 px-3 py-1.5 border-l-4 border-slate-950 mb-3">
                    IV. Respuestas a Secciones Abiertas (Sugerencias Estudiantiles)
                  </h3>
                  
                  <div className="space-y-3 text-[11px]">
                    <div>
                      <strong className="block text-slate-800">Q8. ¿Qué área, taller o actividad complementaria te gustaría que la Unidad Educativa incorpore para fortalecer tu formación integral?</strong>
                      <p className="pl-3 text-slate-600 leading-normal bg-slate-50 border-l border-slate-300 p-2 italic gap-1">
                        {stats.suggestions.q8.length > 0 
                          ? stats.suggestions.q8.map((x: any) => `"${x}"`).join(" | ")
                          : "Ninguna sugerencia provista."}
                      </p>
                    </div>
                    
                    <div>
                      <strong className="block text-slate-800">Q9. ¿Qué ambiente, espacio o recurso consideras necesario implementar o mejorar para apoyar tu desarrollo académico, cultural, deportivo o tecnológico?</strong>
                      <p className="pl-3 text-slate-650 leading-normal bg-slate-50 border-l border-slate-300 p-2 italic">
                        {stats.suggestions.q9.length > 0 
                          ? stats.suggestions.q9.map((x: any) => `"${x}"`).join(" | ")
                          : "Ninguna sugerencia provista."}
                      </p>
                    </div>

                    <div>
                      <strong className="block text-slate-800">Q10. ¿Qué sugerencia realizarías para mejorar la calidad educativa y el bienestar estudiantil en la Unidad Educativa Santo Domingo Savio?</strong>
                      <p className="pl-3 text-slate-650 leading-normal bg-slate-50 border-l border-slate-300 p-2 italic">
                        {stats.suggestions.q10.length > 0 
                          ? stats.suggestions.q10.map((x: any) => `"${x}"`).join(" | ")
                          : "Ninguna sugerencia provista."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Signature Block */}
                <div className="mt-16 flex justify-around text-center text-xs">
                  <div className="w-48 border-t border-slate-950 pt-2 font-bold">
                    Dirección Académica
                    <span className="block text-[10px] text-slate-500 font-medium">U.E. Santo Domingo Savio</span>
                  </div>
                  <div className="w-48 border-t border-slate-950 pt-2 font-bold">
                    Firma del Docente
                    <span className="block text-[10px] text-slate-500 font-medium">C.I. ____________________</span>
                  </div>
                </div>

                <div className="mt-8 text-center text-[9px] text-slate-400 font-mono">
                  Generado automáticamente el {new Date().toLocaleDateString()} por el Sistema de Evaluación Docente SADOSA 2026.
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* RECON CONFIRM_RESET DIALOG MODAL */}
      {showConfirmReset && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 animate-fade-in print:hidden">
          <motion.div 
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="bg-white p-6 rounded-2xl max-w-md w-full border border-slate-200 shadow-xl space-y-4"
          >
            <div className="flex gap-3 items-start">
              <ShieldAlert className="h-6 w-6 text-red-600 shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-bold text-slate-900">¿Estás absolutamente seguro?</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Esta acción eliminará todas las evaluaciones registradas en el sistema de forma permanente. No se puede deshacer.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Introduce la contraseña maestra para proceder:</label>
              <input
                type="password"
                value={resetPasscode}
                onChange={(e) => setResetPasscode(e.target.value)}
                placeholder="Escribe la clave aquí..."
                className="w-full px-3 py-2 border rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-950 font-mono"
              />
            </div>

            {resetStatus && (
              <p className={`text-xs font-semibold ${resetStatus.includes("Error") ? "text-red-600" : "text-green-600"}`}>
                {resetStatus}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2 text-sm font-semibold">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmReset(false);
                  setResetPasscode("");
                  setResetStatus("");
                }}
                className="px-4 py-2 hover:bg-slate-50 rounded-lg text-slate-600 border border-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleResetConfirm}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition-colors"
              >
                Eliminar Todo
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
