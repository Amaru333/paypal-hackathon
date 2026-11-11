import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleDashboard } from '../../src/features/landing/demo-data';
import { analysisCard } from '../../src/domain/assistant-analysis';
import { assistantCommand } from '../../src/domain/assistant';
import { parentAssistantTools } from '../../src/server/integrations/parent-assistant';

test('assistant analysis has an independent privacy gate even with a full underlying snapshot', () => {
  const data = sampleDashboard('parent', true);
  const full = analysisCard(data);
  assert.ok(full.categories?.length);
  assert.ok(full.daily?.length);
  assert.equal(full.spent, data.spent);
  data.privacy = { enabled: true, eligible: true, birthDate: '2008-01-01', age: 18 };
  data.purchases[0].name = 'PRIVATE-SECRET';
  const privateCard = analysisCard(data);
  assert.equal(privateCard.spent, full.spent);
  assert.equal(privateCard.remaining, full.remaining);
  for (const key of ['categories', 'daily', 'purchases', 'forecast'])
    assert.equal(key in privateCard, false);
  assert.doesNotMatch(JSON.stringify(privateCard), /PRIVATE-SECRET/);
});
test('assistant tools only expose reads and proposals with strict function schemas', () => {
  for (const tool of parentAssistantTools) {
    assert.equal(tool.strict, true);
    assert.equal(tool.parameters.additionalProperties, false);
    assert.deepEqual(tool.parameters.required, Object.keys(tool.parameters.properties));
    assert.match(tool.name, /^(analyze_|get_|propose_)/);
    assert.doesNotMatch(tool.name, /pay|capture|privacy|execute|confirm/);
  }
  for (const cents of [-1, 0, 0.5, 100001, Infinity])
    assert.equal(
      assistantCommand.safeParse({ kind: 'top_up', childId: 'child', cents }).success,
      false,
    );
  assert.equal(
    assistantCommand.safeParse({ kind: 'top_up', childId: 'child', cents: 100, parentId: 'other' })
      .success,
    false,
  );
});
