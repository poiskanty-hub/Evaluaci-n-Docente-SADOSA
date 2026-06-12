/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Teacher, QuestionDefinition } from "../types";

export const TEACHERS: Teacher[] = [
  { id: "1", name: "AYZACAYO CONDE JOSE LUIS", subject: "MÚSICA" },
  { id: "2", name: "BECERRA VILLANUEVA MARCELO", subject: "FÍSICA" },
  { id: "3", name: "BUSTOS LOPEZ LILIAM", subject: "C. NATURALES" },
  { id: "4", name: "CALLIZAYA HUAYTA VIRGINIA", subject: "RELIGIÓN" },
  { id: "5", name: "CHOQUECALLATA BOHORQUEZ EVELYN VANESSA", subject: "ART. PLÁSTICAS" },
  { id: "6", name: "COSSIO ALVAREZ MARCO ANTONIO", subject: "QUÍMICA" },
  { id: "7", name: "GARCIA MANCILLA LUIS DANIEL", subject: "GEOGRAFÍA / FILOSOFÍA / RELIGIÓN" },
  { id: "8", name: "GARCIA SAHONERO KAREM", subject: "EST. SOCIALES" },
  { id: "9", name: "GUTIERREZ TORRES CLAUDER", subject: "BIOLOGÍA / CLÍNICA / ANATOMÍA" },
  { id: "10", name: "HUANCA ANTEZANA PAOLA ALEJANDRA", subject: "ROBÓTICA" },
  { id: "11", name: "HUANCA GUTIERREZ LIBERTAD", subject: "RELIGIÓN" },
  { id: "12", name: "LANZA GUARAYO LIZBETH NOELIA", subject: "GEOMETRÍA / ROBÓTICA" },
  { id: "13", name: "MEDRANO LOPEZ RODOLFO PEDRO", subject: "PSICOLOGÍA / FILOSOFÍA" },
  { id: "14", name: "MORALES GALINDO RICARDO WILLY", subject: "LENGUAJE / GRAMÁTICA" },
  { id: "15", name: "NAVIA TORRICO MARIA PATRICIA", subject: "LENGUAJE / LITERATURA" },
  { id: "16", name: "PEREDO CLAROS MILNEKA LIZBETH", subject: "FÍSICA" },
  { id: "17", name: "PEREYRA LOPEZ HUGO OSMAN", subject: "LENGUAJE / LITERATURA" },
  { id: "18", name: "QUINTANILLA ALARCON LIZ MARGOTH", subject: "INGLÉS" },
  { id: "19", name: "QUIROGA MENDIVIL ROBERTO CARLOS", subject: "QUÍMICA" },
  { id: "20", name: "QUISBERT VARGAS GUSTAVO JULIO", subject: "BIOLOGÍA" },
  { id: "21", name: "QUISPE VARGAS NOELIA", subject: "MATEMÁTICA / FÍSICA" },
  { id: "22", name: "RAMOS PACHECO ERIK", subject: "ED. FÍSICA" },
  { id: "23", name: "RIOJA FLORES BEYMAR HENRY", subject: "MÚSICA" },
  { id: "24", name: "RODRÍGUEZ ACUÑA ORLANDO", subject: "MATEMÁTICA / GEOMETRÍA / CÁLCULO" },
  { id: "25", name: "SALVATIERRA CARTAGENA JANNETTE", subject: "INGLÉS" },
  { id: "26", name: "SOTO MACHADO BENIGNO", subject: "ART. PLÁSTICAS" },
  { id: "27", name: "TORRICO ARANCIBIA JONATAN MARCELO", subject: "ROBÓTICA" },
  { id: "28", name: "USTARIZ MONTAÑO LUIS SALVADOR", subject: "FILOSOFÍA / CÍVICA" },
  { id: "29", name: "VALDIVIA ARZE ARIEL", subject: "MATEMÁTICA / GEOMETRÍA" },
  { id: "30", name: "YRIARTE ARNEZ CLOTILDE", subject: "GEOGRAFÍA" },
  { id: "31", name: "ZABALA SANCHEZ MELVY VANESA", subject: "HISTORIA" },
  { id: "32", name: "ZELADA SALVATIERRA WILFREDO", subject: "MATEMÁTICA" },
  { id: "33", name: "ZURITA PAREDES SHANNON", subject: "ED. FÍSICA" }
];

export const RATING_QUESTIONS: QuestionDefinition[] = [
  {
    id: 1,
    text: "¿Cómo evalúas las estrategias de enseñanza que utiliza la maestra o el maestro para facilitar tu aprendizaje durante el primer trimestre?",
    type: "rating"
  },
  {
    id: 2,
    text: "¿La maestra o el maestro explica los contenidos de manera clara, ordenada y comprensible?",
    type: "rating"
  },
  {
    id: 3,
    text: "¿La maestra o el maestro promueve tu participación activa y el intercambio de ideas durante las clases?",
    type: "rating"
  },
  {
    id: 4,
    text: "¿La maestra o el maestro despierta tu interés y motivación por aprender y mejorar tu rendimiento académico?",
    type: "rating"
  },
  {
    id: 5,
    text: "¿La maestra o el maestro fomenta tu participación en las actividades organizadas por la Unidad Educativa (campañas, convivencias, actividades deportivas, ferias, celebraciones y otras)?",
    type: "rating"
  },
  {
    id: 6,
    text: "¿Consideras que recibes un trato respetuoso, cordial y adecuado por parte de la maestra o el maestro?",
    type: "rating"
  },
  {
    id: 7,
    text: "¿Sientes que la maestra o el maestro escucha y toma en cuenta tus opiniones, inquietudes o sugerencias?",
    type: "rating"
  }
];

export const OPEN_QUESTIONS: QuestionDefinition[] = [
  {
    id: 8,
    text: "¿Qué área, taller o actividad complementaria te gustaría que la Unidad Educativa incorpore para fortalecer tu formación integral?",
    type: "text"
  },
  {
    id: 9,
    text: "¿Qué ambiente, espacio o recurso consideras necesario implementar o mejorar para apoyar tu desarrollo académico, cultural, deportivo o tecnológico?",
    type: "text"
  },
  {
    id: 10,
    text: "¿Qué sugerencia realizarías para mejorar la calidad educativa y el bienestar estudiantil en la Unidad Educativa Santo Domingo Savio?",
    type: "text"
  }
];

export const COURSES: string[] = [
  "1ro de Secundaria A",
  "1ro de Secundaria B",
  "1ro de Secundaria C",
  "2do de Secundaria A",
  "2do de Secundaria B",
  "2do de Secundaria C",
  "3ro de Secundaria A",
  "3ro de Secundaria B",
  "3ro de Secundaria C",
  "4to de Secundaria A",
  "4to de Secundaria B",
  "4to de Secundaria C",
  "5to de Secundaria A",
  "5to de Secundaria B",
  "5to de Secundaria C",
  "6to de Secundaria A",
  "6to de Secundaria B",
  "6to de Secundaria C"
];
