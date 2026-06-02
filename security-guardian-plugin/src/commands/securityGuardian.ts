#!/usr/bin/env node
// ============================================================
// Security Guardian Plugin — Slash Command Handler
// Wired to: /security-guardian
// ============================================================

import * as path from 'path';
import * as fs from 'fs';
import { runSecurityScan } from '../engine/scanOrchestrator';
import {
  generateMarkdownReport,
  generateJsonReport,
  generateConsoleSummary,
} from '../report/reportGenerator';
import { ScanOptions } from '../types/findings';

// ─── CLI Argument Parser ──────────────────────────────────────

export interface CommandOptions {
  repoPath: string;
  changedFilesOnly: boolean;
  dependenciesOnly: boolean;
  outputFormat: 'markdown' | 'json' | 'both';
  outputFile?: string;
  verbose: boolean;
}

export function parseArgs(argv: string[]): CommandOptions {
  const args = argv.slice(2); // strip node + script

  const opts: CommandOptions = {
    repoPath: process.cwd(),
    changedFilesOnly: false,
    dependenciesOnly: false,
    outputFormat: 'markdown',
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--changed':
      case '-c':
        opts.changedFilesOnly = true;
        break;
      case '--dependencies':
      case '--deps':
      case '-d':
        opts.dependenciesOnly = true;
        break;
      case '--json':
        opts.outputFormat = 'json';
        break;
      case '--both':
        opts.outputFormat = 'both';
        break;
      case '--output':
      case '-o':
        opts.outputFile = args[++i];
        break;
      case '--verbose':
      case '-v':
        opts.verbose = true;
        break;
      case '--path':
      case '-p':
        opts.repoPath = path.resolve(args[++i]);
        break;
      default:
        if (arg && !arg.startsWith('-')) {
          // Positional argument: treat as repo path
          opts.repoPath = path.resolve(arg);
        }
    }
  }

  return opts;
}

// ─── Main Command Runner ──────────────────────────────────────

export async function runSecurityGuardianCommand(
  cmdOpts: CommandOptions,
): Promise<void> {
  // Validate repo path
  if (!fs.existsSync(cmdOpts.repoPath)) {
    console.error(`❌ Repository path not found: ${cmdOpts.repoPath}`);
    process.exit(1);
  }

  console.log('');
  console.log('🛡️  Security Guardian — Starting scan...');
  console.log(`📂 Repository: ${cmdOpts.repoPath}`);

  if (cmdOpts.changedFilesOnly) console.log('📝 Mode: Changed files only');
  if (cmdOpts.dependenciesOnly) console.log('📦 Mode: Dependencies only');
  console.log('');

  const scanOptions: ScanOptions = {
    repoPath: cmdOpts.repoPath,
    changedFilesOnly: cmdOpts.changedFilesOnly,
    dependenciesOnly: cmdOpts.dependenciesOnly,
    verbose: cmdOpts.verbose,
  };

  let report: Awaited<ReturnType<typeof runSecurityScan>>;
  try {
    report = await runSecurityScan(scanOptions);
  } catch (err) {
    console.error('❌ Fatal error during scan:', err instanceof Error ? err.message : err);
    process.exit(1);
    return; // unreachable but satisfies TypeScript
  }

  // Print console summary
  console.log(generateConsoleSummary(report));

  // Generate outputs
  let markdownContent: string | undefined;
  let jsonContent: string | undefined;

  if (cmdOpts.outputFormat === 'markdown' || cmdOpts.outputFormat === 'both') {
    markdownContent = generateMarkdownReport(report);
  }
  if (cmdOpts.outputFormat === 'json' || cmdOpts.outputFormat === 'both') {
    jsonContent = generateJsonReport(report);
  }

  // Write to file or stdout
  if (cmdOpts.outputFile) {
    const base = cmdOpts.outputFile.replace(/\.\w+$/, '');

    if (markdownContent) {
      const mdPath = cmdOpts.outputFormat === 'both' ? `${base}.md` : cmdOpts.outputFile;
      fs.writeFileSync(mdPath, markdownContent, 'utf-8');
      console.log(`📄 Markdown report saved to: ${mdPath}`);
    }
    if (jsonContent) {
      const jsonPath = cmdOpts.outputFormat === 'both' ? `${base}.json` : cmdOpts.outputFile;
      fs.writeFileSync(jsonPath, jsonContent, 'utf-8');
      console.log(`📄 JSON report saved to: ${jsonPath}`);
    }
  } else {
    // Print to stdout
    if (markdownContent) console.log(markdownContent);
    if (jsonContent) console.log(jsonContent);
  }

  // Exit with code 1 if critical/high findings (useful in CI)
  const { summary } = report;
  if (summary.critical > 0 || summary.secretsFound > 0) {
    process.exit(1);
  }
}

// ─── Entry point when called as a command ────────────────────

if (require.main === module) {
  const opts = parseArgs(process.argv);
  runSecurityGuardianCommand(opts).catch((err) => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });
}
