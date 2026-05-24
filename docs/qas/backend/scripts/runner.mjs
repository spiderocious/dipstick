// Minimal PASS/FAIL/BLOCK/SKIP runner shared across the QA test files.
export const results = [];
let passed = 0,
  failed = 0,
  blocked = 0,
  skipped = 0;

export function pass(id, label) {
  passed++;
  results.push({ id, label, result: 'PASS' });
  console.log(`  ✓ ${id}: ${label}`);
}
export function fail(id, label, reason) {
  failed++;
  results.push({ id, label, result: 'FAIL', reason });
  console.log(`  ✗ ${id}: ${label}`);
  console.log(`      → ${reason}`);
}
export function block(id, label, reason) {
  blocked++;
  results.push({ id, label, result: 'BLOCKED', reason });
  console.log(`  ⊘ ${id}: ${label} [BLOCKED: ${reason}]`);
}
export function skip(id, label, reason) {
  skipped++;
  results.push({ id, label, result: 'SKIP', reason });
  console.log(`  - ${id}: ${label} [SKIP: ${reason}]`);
}
export function section(name) {
  console.log(`\n── ${name} ──────────`);
}

// Assert helper: check(id, label, condition, detailOnFail)
export function check(id, label, cond, detail = '') {
  if (cond) pass(id, label);
  else fail(id, label, detail || 'assertion failed');
}

// Convenience: assert a flat error response. Verifies errorCode + (optional) field, and
// that the body is the FLAT shape (no nested `error`, no `success`).
export function expectError(id, label, res, code, { field, type } = {}) {
  const b = res.data ?? {};
  const flat = b.error === undefined && b.success === undefined;
  const codeOk = b.errorCode === code;
  const fieldOk = field === undefined || b.field === field;
  const typeOk = type === undefined || b.type === type;
  if (codeOk && fieldOk && typeOk && flat) {
    pass(id, label);
    return true;
  }
  fail(
    id,
    label,
    `got status=${res.status} body=${JSON.stringify(b)} (wanted errorCode=${code}${
      field ? ` field=${field}` : ''
    }${type ? ` type=${type}` : ''}${flat ? '' : ' [NESTED/NON-FLAT BODY]'})`,
  );
  return false;
}

export function summary(title = 'QA Run') {
  const total = passed + failed + blocked + skipped;
  console.log(`\n${'═'.repeat(54)}`);
  console.log(`  ${title}`);
  console.log(`  ${passed} PASS / ${failed} FAIL / ${blocked} BLOCKED / ${skipped} SKIP  (${total} total)`);
  console.log('═'.repeat(54));
  return { passed, failed, blocked, skipped, total };
}

export function counts() {
  return { passed, failed, blocked, skipped };
}
