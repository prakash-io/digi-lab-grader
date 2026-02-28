import Docker from "dockerode";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { v4 as uuidv4 } from "uuid";

// Connect to local docker daemon
const docker = new Docker();

// Configuration for supported languages
const languageConfigs = {
  python: {
    image: "python:3.10-alpine",
    filename: "main.py",
    getCommand: (file) => ["python", file],
  },
  javascript: {
    image: "node:18-alpine",
    filename: "main.js",
    getCommand: (file) => ["node", file],
  },
  java: {
    image: "openjdk:17-alpine",
    filename: "Main.java",
    // Java needs compile then run
    getCommand: (file) => ["sh", "-c", `javac ${file} && java Main`],
  },
  cpp: {
    image: "gcc:latest",
    filename: "main.cpp",
    getCommand: (file) => ["sh", "-c", `g++ ${file} -o main && ./main`],
  },
  c: {
    image: "gcc:latest",
    filename: "main.c",
    getCommand: (file) => ["sh", "-c", `gcc ${file} -o main && ./main`],
  },
};

export async function runCodeInSandbox({ code, language, input, timeLimit = 5000, memoryLimit = 256 }) {
  const config = languageConfigs[language] || languageConfigs.python;
  const executionId = uuidv4();
  const tempDir = path.join(os.tmpdir(), `virta-sandbox-${executionId}`);

  try {
    const startTime = Date.now();

    // 1. Create temporary directory and files
    await fs.mkdir(tempDir, { recursive: true });

    const sourceFilePath = path.join(tempDir, config.filename);
    await fs.writeFile(sourceFilePath, code);

    // Create input file if provided
    let bindMounts = [`${tempDir}:/app`];
    let command = config.getCommand("/app/" + config.filename);

    if (input) {
      const inputFilePath = path.join(tempDir, "input.txt");
      await fs.writeFile(inputFilePath, input);
      // Modify command to pipe input file
      if (language === 'java' || language === 'cpp' || language === 'c') {
        command = ["sh", "-c", `${config.getCommand("/app/" + config.filename)[2]} < /app/input.txt`];
      } else {
        command = ["sh", "-c", `${config.getCommand("/app/" + config.filename).join(" ")} < /app/input.txt`];
      }
    }

    // 2. Start Docker Container securely
    const container = await docker.createContainer({
      Image: config.image,
      Cmd: command,
      WorkingDir: "/app",
      HostConfig: {
        Binds: bindMounts,
        Memory: memoryLimit * 1024 * 1024, // MB to Bytes
        NetworkMode: "none", // VERY IMPORTANT: Disable networking to prevent reverse shells
        AutoRemove: false,
      },
      Tty: false,
      AttachStdout: true,
      AttachStderr: true,
    });

    await container.start();

    // 3. Setup timeout bounds (Kill container if infinite loop)
    let executionFinished = false;
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(async () => {
        if (!executionFinished) {
          try {
            await container.kill();
          } catch (e) { /* ignore kill errors */ }
          reject(new Error("Code execution timed out"));
        }
      }, timeLimit);
    });

    // 4. Wait for container to exit and capture logs
    const runPromise = new Promise((resolve, reject) => {
      container.wait(async (err, data) => {
        executionFinished = true;
        if (err) return reject(err);

        try {
          const logs = await container.logs({ stdout: true, stderr: true });

          // Docker logs prepend 8 bytes of header payload (type, length, etc). 
          // We need to strip this to get clean stdout/stderr.
          // Note for true production: dockerode-stream is better, but this works for basic text.
          const cleanOutput = logs.toString('utf8').replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g, "");

          resolve({
            statusCode: data.StatusCode,
            output: cleanOutput
          });
        } catch (logErr) {
          reject(logErr);
        }
      });
    });

    // Race the execution against the timeout
    const result = await Promise.race([runPromise, timeoutPromise]);

    const executionTime = Date.now() - startTime;

    // Cleanup container immediately
    try {
      await container.remove({ force: true });
    } catch (e) { } // ignore

    if (result.statusCode !== 0) {
      return {
        success: false,
        error: "Runtime error",
        stdout: "",
        stderr: result.output,
        exitCode: result.statusCode,
        executionTime,
      }
    }

    return {
      success: true,
      stdout: result.output,
      stderr: "",
      exitCode: result.statusCode,
      executionTime,
      compileTime: 0,
    };
  } catch (error) {
    console.error("Sandbox execution error:", error);
    return {
      success: false,
      error: error.message,
      stdout: "",
      stderr: error.message,
      exitCode: -1,
      executionTime: 0,
    };
  } finally {
    // 5. Cleanup temp files on host system
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (e) {
      console.error("Failed to clean up temp dir", e);
    }
  }
}

// Normalize output for comparison
export function normalizeOutput(output) {
  if (!output) return "";
  return output
    .trim()
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n+/g, "\n")
    .trim();
}

// Compare outputs
export function compareOutputs(actual, expected) {
  const normalizedActual = normalizeOutput(actual);
  const normalizedExpected = normalizeOutput(expected);
  return normalizedActual === normalizedExpected;
}
