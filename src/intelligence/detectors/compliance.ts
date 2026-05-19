import { join } from 'node:path';
import type { ComplianceSignals, MonorepoInfo } from '../../types/profile.js';
import { walkSource, grepFiles, rel } from '../../lib/fs.js';

/**
 * Heuristic compliance detection. The aim is "did the codebase intentionally
 * encode this concern" — generators use this to decide whether to bake in
 * P0 rules for it (e.g., "audit_logs is append-only" only matters if the
 * code already has audit logs).
 */
export async function detectCompliance(
  root: string,
  _monorepo: MonorepoInfo | null
): Promise<ComplianceSignals> {
  const files = await walkSource(root, {
    extensions: ['.ts', '.tsx', '.js', '.sql', '.prisma'],
    maxFiles: 1500,
  });

  const evidence: Record<string, string[]> = {};

  const probe = async (key: string, needles: string[]): Promise<boolean> => {
    const matches = await grepFiles(files, needles, { maxMatches: 3 });
    if (matches.length > 0) {
      evidence[key] = matches.map((m) => `${rel(root, m.file)} (matched "${m.matchedNeedle}")`);
      return true;
    }
    return false;
  };

  const encryption = await probe('encryption', [
    'AES-256-GCM',
    'createCipheriv',
    'EncryptionService',
    'encrypt(',
    'crypto.subtle',
  ]);
  const auditLogs = await probe('auditLogs', [
    'audit_logs',
    'AuditInterceptor',
    'audit.service',
    'audit_log',
  ]);
  const rls = await probe('rls', [
    'ROW LEVEL SECURITY',
    'CREATE POLICY',
    'rls/index.ts',
    'ENABLE RLS',
  ]);
  const gdpr = await probe('gdpr', [
    'GDPR',
    'gdpr',
    'right to erasure',
    'data minimization',
  ]);
  const hipaa = await probe('hipaa', ['HIPAA', 'hipaa', 'PHI', 'protected health information']);

  return { encryption, auditLogs, rls, gdpr, hipaa, evidence };
}
