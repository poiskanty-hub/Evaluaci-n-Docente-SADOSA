/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;
const DATA_FILE = path.resolve(process.cwd(), "evaluations.json");
const CONFIG_FILE = path.resolve(process.cwd(), "config.json");

// Helper to read lock status
function getLockStatus(): boolean {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, "utf-8");
      const config = JSON.parse(data);
      return !!config.locked;
    }
  } catch (error) {
    console.error("Error reading config file:", error);
  }
  return false; // Default to unlocked (false)
}

// Helper to write lock status
function setLockStatus(locked: boolean): void {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ locked }, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing config file:", error);
  }
}

// Middleware to parse JSON bodies
app.use(express.json());

// Enable CORS for external access (essential for Google Sites custom code inputs)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  
  const requestedHeaders = req.headers["access-control-request-headers"];
  if (requestedHeaders) {
    res.setHeader("Access-Control-Allow-Headers", requestedHeaders);
  } else {
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-passcode, Authorization, passcode, Accept, Origin");
  }

  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Helper to read evaluations
function readEvaluations(): any[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error reading evaluations file, returning empty array:", error);
  }
  return [];
}

// Helper to write evaluations
function writeEvaluations(evaluations: any[]): boolean {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(evaluations, null, 2), "utf-8");
    return true;
  } catch (error) {
    console.error("Error writing evaluations file:", error);
    return false;
  }
}

// Helper to check passcode robustness
function isValidPasscode(pass: any): boolean {
  if (!pass) {
    console.log("isValidPasscode check: passcode is falsy or undefined");
    return false;
  }
  const rawPass = String(pass).trim();
  const clean = rawPass.toUpperCase();
  const normalized = clean.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  // Try to read custom passcode from environment variables if configured
  const envPasscode = process.env.SADOSA_ADMIN_PASSCODE;
  let customClean = "";
  let customNormalized = "";
  if (envPasscode) {
    customClean = envPasscode.trim().toUpperCase();
    customNormalized = customClean.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  console.log(`[AUTH CHECK] Received passcode: "${normalized}" (length: ${rawPass.length}). Comparing against target "DAMASO" ${envPasscode ? `or custom passcode "${customNormalized}"` : ""}`);

  // 1. Direct checks
  if (normalized === "DAMASO" || clean === "DAMASO" || clean === "DÁMASO") {
    return true;
  }
  if (envPasscode && (normalized === customNormalized || clean === customClean)) {
    return true;
  }
  
  // 2. Decode URL encoded fallbacks
  try {
    const decoded = decodeURIComponent(rawPass).trim().toUpperCase();
    const decodedNorm = decoded.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (decodedNorm === "DAMASO" || decoded === "DAMASO" || decoded === "DÁMASO") {
      return true;
    }
    if (envPasscode && (decodedNorm === customNormalized || decoded === customClean)) {
      return true;
    }
  } catch (e) {}

  console.log(`[AUTH FAILED] Passcode check failed for string: "${normalized}"`);
  return false;
}

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// GET lock status representing if the system is locked or unlocked globally
app.get("/api/lock-status", (req, res) => {
  res.json({ locked: getLockStatus() });
});

// POST lock status update using master password
app.post("/api/lock-status", (req, res) => {
  try {
    const { passcode, locked } = req.body;
    if (!isValidPasscode(passcode)) {
      res.status(401).json({ error: "Contraseña maestra incorrecta para habilitar o bloquear evaluaciones." });
      return;
    }
    if (typeof locked !== "boolean") {
      res.status(400).json({ error: "El estado 'locked' debe ser un valor booleano." });
      return;
    }
    setLockStatus(locked);
    res.json({ success: true, locked });
  } catch (err) {
    console.error("Error setting lock status:", err);
    res.status(500).json({ error: "Error en el servidor al configurar el estado de bloqueo." });
  }
});

// Submit evaluation (supports both single evaluation or batch/array of evaluations)
app.post("/api/evaluations", (req, res) => {
  try {
    // Return early if evaluations are locked
    if (getLockStatus()) {
      res.status(403).json({ error: "Las evaluaciones están temporalmente bloqueadas por el Administrador." });
      return;
    }

    const body = req.body;
    
    // Check if client submitted a batch or single item
    const isBatch = Array.isArray(body);
    const evaluationItems = isBatch ? body : [body];
    
    if (evaluationItems.length === 0) {
      res.status(400).json({ error: "La lista de evaluaciones no puede estar vacía." });
      return;
    }

    const newEvaluations: any[] = [];
    
    for (const item of evaluationItems) {
      const { teacherId, teacherName, subject, studentCourse, scores, openAnswers, trimester } = item;

      if (!teacherId || !teacherName || !studentCourse || !scores || !Array.isArray(scores) || scores.length !== 7) {
        res.status(400).json({ error: `Datos de evaluación incompletos o inválidos en profesor ${teacherName || teacherId}.` });
        return;
      }

      // Verify rating scores are in bounds [1-5]
      const validScores = scores.map((s: any) => {
        const num = Number(s);
        return isNaN(num) ? 3 : Math.max(1, Math.min(5, num));
      });

      // Clean open answers
      const cleanAnswers = Array.isArray(openAnswers) 
        ? openAnswers.map(ans => String(ans || "").trim())
        : ["", "", ""];

      while (cleanAnswers.length < 3) {
        cleanAnswers.push("");
      }

      const sum = validScores.reduce((acc, curr) => acc + curr, 0);
      const totalScore = Math.round((sum / 35) * 100);

      const newEvaluation = {
        id: "eval_" + Math.random().toString(36).substr(2, 9) + "_" + Math.floor(Math.random() * 1000),
        teacherId,
        teacherName,
        subject,
        studentCourse,
        scores: validScores,
        openAnswers: cleanAnswers.slice(0, 3),
        totalScore,
        createdAt: new Date().toISOString(), // Automatic date generation
        trimester: trimester || "1er Trimestre"
      };
      
      newEvaluations.push(newEvaluation);
    }

    const currentEvaluations = readEvaluations();
    currentEvaluations.push(...newEvaluations);
    writeEvaluations(currentEvaluations);

    res.status(201).json(isBatch ? newEvaluations : newEvaluations[0]);
  } catch (error) {
    console.error("Error creating evaluation:", error);
    res.status(500).json({ error: "Error interno del servidor al guardar la evaluación." });
  }
});

// Fetch all evaluations (auth required with passive check)
app.get("/api/evaluations", (req, res) => {
  try {
    const passcode = req.headers["x-passcode"] || req.query.passcode;

    if (!isValidPasscode(passcode)) {
      res.status(401).json({ error: "Clave de acceso incorrecta." });
      return;
    }

    const evaluations = readEvaluations();
    res.json(evaluations);
  } catch (error) {
    console.error("Error getting evaluations:", error);
    res.status(500).json({ error: "Error interno al recuperar evaluaciones." });
  }
});

// Reset evaluations (auth required)
app.post("/api/reset", (req, res) => {
  try {
    const passcode = req.headers["x-passcode"] || req.body.passcode;

    if (!isValidPasscode(passcode)) {
      res.status(401).json({ error: "Clave de acceso incorrecta para reinicio." });
      return;
    }

    writeEvaluations([]);
    res.json({ message: "La base de datos de evaluaciones ha sido reiniciada con éxito." });
  } catch (error) {
    console.error("Error resetting database:", error);
    res.status(500).json({ error: "Error al reiniciar base de datos." });
  }
});

// Serve the Google Sites embed page directly with dynamic API url injection based on original request headers
app.get("/GOOGLE_SITES_EMBED.html", (req, res) => {
  try {
    const filePath = path.resolve(process.cwd(), "GOOGLE_SITES_EMBED.html");
    if (!fs.existsSync(filePath)) {
      res.status(404).send("File not found");
      return;
    }
    const htmlContentOnDisk = fs.readFileSync(filePath, "utf-8");

    // Dynamic resolution of protocol and host using proxy-forwarding headers
    let host = (req.headers["x-forwarded-host"] as string) || req.headers.host || "localhost:3000";
    let proto = (req.headers["x-forwarded-proto"] as string) || (req.secure ? "https" : "http");
    
    const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
    
    // Cloud environments terminate SSL externally and only expose port 443/80.
    // If we detect non-local running, we force HTTPS and strip any custom port suffix like :3000.
    if (!isLocal) {
      proto = "https";
      if (host.includes(":")) {
        host = host.split(":")[0];
      }
    } else {
      proto = "http";
    }
    const currentUrl = `${proto}://${host}`;

    // Perform replacement robustly using RegExp
    const updatedHtml = htmlContentOnDisk.replace(
      /let\s+API_BASE_URL\s*=\s*["'][^"']+["']\s*;?/g,
      `let API_BASE_URL = "${currentUrl}";`
    );

    // Write back to disk so any downloaded or copied HTML from the workspace also has the correct updated default URL!
    if (htmlContentOnDisk !== updatedHtml) {
      try {
        fs.writeFileSync(filePath, updatedHtml, "utf-8");
        console.log(`Successfully updated GOOGLE_SITES_EMBED.html on-disk API_BASE_URL to: ${currentUrl}`);
      } catch (writeErr) {
        console.error("Warning: Could not write updated HTML back to disk:", writeErr);
      }
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(updatedHtml);
  } catch (err) {
    console.error("Error serving dynamically updated raw html:", err);
    res.status(500).send("Internal Server Error serving HTML");
  }
});

// Serve frontend assets
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development middleware mounted.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Production static handler mounted serving: " + distPath);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

setupVite();
