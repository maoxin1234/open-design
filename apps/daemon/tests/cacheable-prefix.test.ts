import { describe, expect, it } from 'vitest';

import { composeLiveInstructionPrompt } from '../src/runtimes/chat-prompt-inputs.js';
import {
  PROMPT_SECTION_CACHE_CLASS,
  buildPromptStackTelemetry,
  classifyPromptSectionCacheClass,
  type PromptTelemetryInputSection,
  type PromptTelemetrySectionKind,
} from '../src/prompt-telemetry.js';

// Mirror of the composed section order built in server.ts after the
// cacheable-prefix reorder (#4679): a volatile formOverride preamble, the
// contiguous stable block (daemon prompt, tool contract, the system prompt and
// its sub-sections), then the volatile tail.
function buildSections({
  daemonSystemPrompt = 'DAEMON',
  runtimeToolPrompt = 'TOOLS',
  systemPrompt = 'SYSTEM (design system / skills / memory)',
  formOverride = '',
  researchCommandContract = '',
  runContextPrompt = '',
  titleGenerationPrompt = '',
  userRequest = 'do the thing',
}: Partial<Record<string, string>> = {}): PromptTelemetryInputSection[] {
  return [
    { kind: 'formOverride', content: formOverride },
    { kind: 'daemonSystemPrompt', content: daemonSystemPrompt },
    { kind: 'runtimeToolPrompt', content: runtimeToolPrompt },
    { kind: 'clientSystemPrompt', content: systemPrompt },
    { kind: 'researchCommandContract', content: researchCommandContract },
    { kind: 'runContextPrompt', content: runContextPrompt },
    { kind: 'titleGenerationPrompt', content: titleGenerationPrompt },
    { kind: 'userRequest', content: userRequest },
  ];
}

describe('cacheable-prefix classification (#4679)', () => {
  it('classifies every section kind (no unclassified default)', () => {
    for (const kind of Object.keys(
      PROMPT_SECTION_CACHE_CLASS,
    ) as PromptTelemetrySectionKind[]) {
      expect(['stable', 'volatile']).toContain(
        classifyPromptSectionCacheClass(kind),
      );
    }
  });

  it('throws on an unclassified section kind', () => {
    expect(() =>
      classifyPromptSectionCacheClass(
        'totallyNewSection' as PromptTelemetrySectionKind,
      ),
    ).toThrow(/unclassified prompt-stack section kind/);
  });
});

describe('cacheable-prefix fingerprint invariant (#4679)', () => {
  it('stays byte-identical when only volatile inputs change', () => {
    const base = buildPromptStackTelemetry({
      composedPrompt: 'a',
      sections: buildSections({ runContextPrompt: 'turn 1 context' }),
    });
    const volatileChanged = buildPromptStackTelemetry({
      composedPrompt: 'b',
      sections: buildSections({
        runContextPrompt: 'turn 2 totally different context',
        researchCommandContract: 'research now enabled',
        titleGenerationPrompt: 'emit a title',
        userRequest: 'a different request',
      }),
    });

    expect(volatileChanged.cacheablePrefixContiguous).toBe(true);
    expect(volatileChanged.cacheablePrefixSectionCount).toBe(
      base.cacheablePrefixSectionCount,
    );
    // The whole-stack fingerprint differs (volatile content changed) but the
    // cacheable prefix is unchanged — the provider can reuse the cached prefix.
    expect(volatileChanged.stackFingerprint).not.toBe(base.stackFingerprint);
    expect(volatileChanged.cacheablePrefixFingerprint).toBe(
      base.cacheablePrefixFingerprint,
    );
  });

  it('changes when stable content changes', () => {
    const base = buildPromptStackTelemetry({
      composedPrompt: 'a',
      sections: buildSections(),
    });
    const stableChanged = buildPromptStackTelemetry({
      composedPrompt: 'a',
      sections: buildSections({ systemPrompt: 'SYSTEM with a new memory line' }),
    });
    expect(stableChanged.cacheablePrefixFingerprint).not.toBe(
      base.cacheablePrefixFingerprint,
    );
  });

  it('flags a volatile preamble ahead of the stable block (#4679 review)', () => {
    // A question-form FORM_ANSWERED_*_OVERRIDE is prepended before the stable
    // trio. The stable sections are still consecutive among themselves, but the
    // request no longer *starts* with them, so the provider cannot reuse the
    // prefix cache — the signal must report not-cacheable, not a healthy hit.
    const withOverride = buildPromptStackTelemetry({
      composedPrompt: 'a',
      sections: buildSections({ formOverride: 'FORM_ANSWERED_TASK_TYPE_OVERRIDE' }),
    });
    expect(withOverride.cacheablePrefixContiguous).toBe(false);

    // The same turn without the override leads with the stable trio → cacheable.
    const withoutOverride = buildPromptStackTelemetry({
      composedPrompt: 'a',
      sections: buildSections(),
    });
    expect(withoutOverride.cacheablePrefixContiguous).toBe(true);
  });

  it('flags non-contiguous stable sections (regression guard)', () => {
    // A volatile block wedged between two stable sections — the exact bug the
    // reorder fixed (run context splitting the tool prompt from the system
    // prompt).
    const split = buildPromptStackTelemetry({
      composedPrompt: 'a',
      sections: [
        { kind: 'daemonSystemPrompt', content: 'DAEMON' },
        { kind: 'runtimeToolPrompt', content: 'TOOLS' },
        { kind: 'runContextPrompt', content: 'VOLATILE WEDGE' },
        { kind: 'clientSystemPrompt', content: 'SYSTEM' },
        { kind: 'userRequest', content: 'go' },
      ],
    });
    expect(split.cacheablePrefixContiguous).toBe(false);
  });
});

describe('composeLiveInstructionPrompt cacheable order (#4679)', () => {
  it('puts the stable trio ahead of volatile blocks and the override', () => {
    const composed = composeLiveInstructionPrompt({
      daemonSystemPrompt: 'DAEMON',
      runtimeToolPrompt: 'TOOLS',
      clientStableSystemPrompt: 'SYSTEM',
      clientSystemPrompt: 'RUN-CONTEXT',
      finalPromptOverride: 'OVERRIDE',
    });
    expect(composed.indexOf('DAEMON')).toBeLessThan(composed.indexOf('TOOLS'));
    expect(composed.indexOf('TOOLS')).toBeLessThan(composed.indexOf('SYSTEM'));
    expect(composed.indexOf('SYSTEM')).toBeLessThan(
      composed.indexOf('RUN-CONTEXT'),
    );
    // The codex imagegen override stays semantically volatile: last, never
    // inside the cacheable prefix.
    expect(composed.indexOf('RUN-CONTEXT')).toBeLessThan(
      composed.indexOf('OVERRIDE'),
    );
  });

  it('keeps the stable prefix byte-identical when only volatile input varies', () => {
    const stableArgs = {
      daemonSystemPrompt: 'DAEMON',
      runtimeToolPrompt: 'TOOLS',
      clientStableSystemPrompt: 'SYSTEM',
    } as const;
    const a = composeLiveInstructionPrompt({
      ...stableArgs,
      clientSystemPrompt: 'context A',
    });
    const b = composeLiveInstructionPrompt({
      ...stableArgs,
      clientSystemPrompt: 'a much longer and different context B',
    });
    const prefixA = a.slice(0, a.indexOf('context A'));
    const prefixB = b.slice(0, b.indexOf('a much longer'));
    expect(prefixA).toBe(prefixB);
  });
});
