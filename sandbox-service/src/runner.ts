import { spawn } from 'node:child_process';
import type { SandboxRunEvent, SandboxResult } from './types.ts';
import { generatePythonHarness, generateJsHarness } from './harness.ts';

const DOCKER_IMAGES: Record<string, string> = {
  python: 'python:3.12-alpine',
  javascript: 'node:24-alpine',
};

const INTERPRETERS: Record<string, string[]> = {
  python: ['python3', '-'],
  javascript: ['node', '-'],
};

export function runCode(event: SandboxRunEvent): Promise<SandboxResult> {
  return new Promise((resolve) => {
    const { language, timeLimitMs, memoryLimitMb } = event;

    const harness =
      language === 'python'
        ? generatePythonHarness(event.code, event.testCases, timeLimitMs)
        : generateJsHarness(event.code, event.testCases, timeLimitMs);

    const image = DOCKER_IMAGES[language];
    const interpreter = INTERPRETERS[language];

    const args = [
      'run', '--rm', '-i',
      '--network', 'none',
      `-m`, `${memoryLimitMb}m`,
      '--cpus', '0.5',
      image,
      ...interpreter,
    ];

    const child = spawn('docker', args, { stdio: ['pipe', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    // external timeout = timeLimitMs + startup buffer
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeLimitMs + 5000);

    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

    child.stdin.write(harness);
    child.stdin.end();

    child.on('close', (code) => {
      clearTimeout(timer);

      if (timedOut) {
        resolve(timeoutResult(event));
        return;
      }

      if (code !== 0) {
        resolve(errorResult(event, stderr || stdout));
        return;
      }

      try {
        const result = JSON.parse(stdout.trim()) as SandboxResult;
        resolve(result);
      } catch {
        resolve(errorResult(event, `Failed to parse harness output: ${stdout}`));
      }
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      resolve(errorResult(event, err.message));
    });
  });
}

function timeoutResult(event: SandboxRunEvent): SandboxResult {
  const emptyResults = event.testCases.map((tc) => ({
    passed: false,
    input: tc.input,
    expectedOutput: tc.expectedOutput,
    actualOutput: '',
    durationMs: event.timeLimitMs,
  }));

  return {
    status: 'timeout',
    stdout: '',
    stderr: '',
    durationMs: event.timeLimitMs,
    testResults: emptyResults,
    passedCount: 0,
    totalCount: event.testCases.length,
  };
}

function errorResult(event: SandboxRunEvent, stderr: string): SandboxResult {
  const emptyResults = event.testCases.map((tc) => ({
    passed: false,
    input: tc.input,
    expectedOutput: tc.expectedOutput,
    actualOutput: '',
    durationMs: 0,
  }));

  return {
    status: 'error',
    stdout: '',
    stderr,
    durationMs: 0,
    testResults: emptyResults,
    passedCount: 0,
    totalCount: event.testCases.length,
  };
}
