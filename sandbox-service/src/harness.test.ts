import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { generatePythonHarness, generateJsHarness } from './harness.ts';

function runPython(script: string): { stdout: string; stderr: string; status: number | null } {
  const result = spawnSync('python3', ['-'], {
    input: script,
    encoding: 'utf8',
    timeout: 10_000,
  });
  return { stdout: result.stdout ?? '', stderr: result.stderr ?? '', status: result.status };
}

function runNode(script: string): { stdout: string; stderr: string; status: number | null } {
  const result = spawnSync('node', ['-'], {
    input: script,
    encoding: 'utf8',
    timeout: 10_000,
  });
  return { stdout: result.stdout ?? '', stderr: result.stderr ?? '', status: result.status };
}

describe('generatePythonHarness', () => {
  it('passed — все тесты прошли', () => {
    const code = 'n = int(input())\nprint(n * 2)';
    const harness = generatePythonHarness(code, [
      { input: '3', expectedOutput: '6' },
      { input: '10', expectedOutput: '20' },
    ], 5000);

    const { stdout, status } = runPython(harness);
    assert.equal(status, 0);

    const result = JSON.parse(stdout.trim());
    assert.equal(result.status, 'passed');
    assert.equal(result.passedCount, 2);
    assert.equal(result.totalCount, 2);
    assert.equal(result.testResults[0].passed, true);
    assert.equal(result.testResults[1].passed, true);
  });

  it('failed — один тест не прошёл', () => {
    const code = 'print("wrong")';
    const harness = generatePythonHarness(code, [
      { input: '1', expectedOutput: '2' },
    ], 5000);

    const { stdout, status } = runPython(harness);
    assert.equal(status, 0);

    const result = JSON.parse(stdout.trim());
    assert.equal(result.status, 'failed');
    assert.equal(result.passedCount, 0);
    assert.equal(result.testResults[0].actualOutput, 'wrong');
    assert.equal(result.testResults[0].passed, false);
  });

  it('timeout — код зависает', () => {
    const code = 'import time\ntime.sleep(999)';
    const harness = generatePythonHarness(code, [
      { input: '', expectedOutput: 'x' },
    ], 300);

    const { stdout, status } = runPython(harness);
    assert.equal(status, 0);

    const result = JSON.parse(stdout.trim());
    assert.equal(result.status, 'timeout');
    assert.equal(result.passedCount, 0);
  });

  it('корректно эскейпит спецсимволы в коде студента', () => {
    const code = 's = "hello \\"world\\""\nprint(s)';
    const harness = generatePythonHarness(code, [
      { input: '', expectedOutput: 'hello "world"' },
    ], 5000);

    const { stdout, status } = runPython(harness);
    assert.equal(status, 0);

    const result = JSON.parse(stdout.trim());
    assert.equal(result.status, 'passed');
  });

  it('несколько тест-кейсов — частично проходят', () => {
    const code = 'n = int(input())\nprint(n + 1)';
    const harness = generatePythonHarness(code, [
      { input: '1', expectedOutput: '2' },
      { input: '5', expectedOutput: '99' },
    ], 5000);

    const { stdout } = runPython(harness);
    const result = JSON.parse(stdout.trim());
    assert.equal(result.status, 'failed');
    assert.equal(result.passedCount, 1);
    assert.equal(result.totalCount, 2);
  });
});

describe('generateJsHarness', () => {
  it('passed — все тесты прошли', () => {
    const code = 'const n = parseInt(require("fs").readFileSync("/dev/stdin", "utf8").trim());\nconsole.log(n * 2);';
    const harness = generateJsHarness(code, [
      { input: '3', expectedOutput: '6' },
      { input: '10', expectedOutput: '20' },
    ], 5000);

    const { stdout, status } = runNode(harness);
    assert.equal(status, 0);

    const result = JSON.parse(stdout.trim());
    assert.equal(result.status, 'passed');
    assert.equal(result.passedCount, 2);
    assert.equal(result.totalCount, 2);
  });

  it('failed — неправильный вывод', () => {
    const code = 'console.log("wrong");';
    const harness = generateJsHarness(code, [
      { input: '', expectedOutput: 'right' },
    ], 5000);

    const { stdout, status } = runNode(harness);
    assert.equal(status, 0);

    const result = JSON.parse(stdout.trim());
    assert.equal(result.status, 'failed');
    assert.equal(result.testResults[0].actualOutput, 'wrong');
    assert.equal(result.testResults[0].passed, false);
  });

  it('timeout — код зависает', () => {
    const code = 'while(true){}';
    const harness = generateJsHarness(code, [
      { input: '', expectedOutput: 'x' },
    ], 300);

    const { stdout, status } = runNode(harness);
    assert.equal(status, 0);

    const result = JSON.parse(stdout.trim());
    assert.equal(result.status, 'timeout');
    assert.equal(result.passedCount, 0);
  });

  it('корректно эскейпит спецсимволы в коде студента', () => {
    const code = 'console.log("hello \\"world\\"");';
    const harness = generateJsHarness(code, [
      { input: '', expectedOutput: 'hello "world"' },
    ], 5000);

    const { stdout, status } = runNode(harness);
    assert.equal(status, 0);

    const result = JSON.parse(stdout.trim());
    assert.equal(result.status, 'passed');
  });

  it('несколько тест-кейсов — частично проходят', () => {
    const code = 'const n = parseInt(require("fs").readFileSync("/dev/stdin","utf8").trim()); console.log(n + 1);';
    const harness = generateJsHarness(code, [
      { input: '1', expectedOutput: '2' },
      { input: '5', expectedOutput: '99' },
    ], 5000);

    const { stdout } = runNode(harness);
    const result = JSON.parse(stdout.trim());
    assert.equal(result.status, 'failed');
    assert.equal(result.passedCount, 1);
    assert.equal(result.totalCount, 2);
  });
});
