import type { TestCase } from './types.ts';

export function generatePythonHarness(code: string, testCases: TestCase[], timeLimitMs: number): string {
  const encodedCode = Buffer.from(code).toString('base64');
  const testCasesJson = JSON.stringify(testCases);
  const timeLimitSec = timeLimitMs / 1000;

  return `
import sys, json, subprocess, time, base64

_code = base64.b64decode(${JSON.stringify(encodedCode)}).decode('utf-8')
_test_cases = ${testCasesJson}
_time_limit = ${timeLimitSec}

with open('/tmp/solution.py', 'w') as f:
    f.write(_code)

results = []
all_stdout = []
all_stderr = []
has_timeout = False

for tc in _test_cases:
    start = time.time()
    try:
        proc = subprocess.run(
            ['python3', '/tmp/solution.py'],
            input=tc['input'],
            capture_output=True,
            text=True,
            timeout=_time_limit
        )
        duration_ms = int((time.time() - start) * 1000)
        actual = proc.stdout.strip()
        expected = tc['expectedOutput'].strip()
        all_stdout.append(proc.stdout)
        all_stderr.append(proc.stderr)
        results.append({
            'passed': actual == expected,
            'input': tc['input'],
            'expectedOutput': expected,
            'actualOutput': actual,
            'durationMs': duration_ms
        })
    except subprocess.TimeoutExpired:
        has_timeout = True
        duration_ms = int((time.time() - start) * 1000)
        results.append({
            'passed': False,
            'input': tc['input'],
            'expectedOutput': tc['expectedOutput'].strip(),
            'actualOutput': '',
            'durationMs': duration_ms
        })

passed_count = sum(1 for r in results if r['passed'])
total_duration = sum(r['durationMs'] for r in results)
status = 'timeout' if has_timeout else ('passed' if passed_count == len(results) else 'failed')

print(json.dumps({
    'status': status,
    'stdout': ''.join(all_stdout),
    'stderr': ''.join(all_stderr),
    'durationMs': total_duration,
    'testResults': results,
    'passedCount': passed_count,
    'totalCount': len(results)
}))
`;
}

export function generateJsHarness(code: string, testCases: TestCase[], timeLimitMs: number): string {
  const encodedCode = Buffer.from(code).toString('base64');
  const testCasesJson = JSON.stringify(testCases);

  return `
const { spawnSync } = require('child_process');
const { writeFileSync } = require('fs');

const _code = Buffer.from(${JSON.stringify(encodedCode)}, 'base64').toString('utf8');
const _testCases = ${testCasesJson};
const _timeLimitMs = ${timeLimitMs};

writeFileSync('/tmp/solution.js', _code);

const results = [];
const allStdout = [];
const allStderr = [];
let hasTimeout = false;

for (const tc of _testCases) {
  const start = Date.now();
  const proc = spawnSync('node', ['/tmp/solution.js'], {
    input: tc.input,
    encoding: 'utf8',
    timeout: _timeLimitMs,
    maxBuffer: 1024 * 1024
  });
  const durationMs = Date.now() - start;

  if (proc.signal === 'SIGTERM' || proc.status === null) {
    hasTimeout = true;
    results.push({
      passed: false,
      input: tc.input,
      expectedOutput: tc.expectedOutput.trim(),
      actualOutput: '',
      durationMs
    });
  } else {
    const actual = (proc.stdout || '').trim();
    const expected = tc.expectedOutput.trim();
    allStdout.push(proc.stdout || '');
    allStderr.push(proc.stderr || '');
    results.push({
      passed: actual === expected,
      input: tc.input,
      expectedOutput: expected,
      actualOutput: actual,
      durationMs
    });
  }
}

const passedCount = results.filter(r => r.passed).length;
const totalDuration = results.reduce((sum, r) => sum + r.durationMs, 0);
const status = hasTimeout ? 'timeout' : (passedCount === results.length ? 'passed' : 'failed');

process.stdout.write(JSON.stringify({
  status,
  stdout: allStdout.join(''),
  stderr: allStderr.join(''),
  durationMs: totalDuration,
  testResults: results,
  passedCount,
  totalCount: results.length
}) + '\\n');
`;
}
