import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recordAnswer, newSkill, startingLevel, MAX_LEVEL, MIN_LEVEL } from '../public/js/adaptive.js';

test('sube de nivel tras 3 aciertos seguidos', () => {
  let skill = newSkill(1);
  let changed;
  for (let i = 0; i < 3; i++) ({ skill, changed } = recordAnswer(skill, true));
  assert.equal(skill.level, 2);
  assert.equal(changed, 'up');
  assert.equal(skill.streak, 0);
});

test('baja de nivel tras 2 fallos seguidos', () => {
  let skill = newSkill(3);
  ({ skill } = recordAnswer(skill, false));
  const r = recordAnswer(skill, false);
  assert.equal(r.skill.level, 2);
  assert.equal(r.changed, 'down');
});

test('un acierto reinicia la racha de fallos', () => {
  let skill = newSkill(3);
  ({ skill } = recordAnswer(skill, false));
  ({ skill } = recordAnswer(skill, true));
  ({ skill } = recordAnswer(skill, false));
  assert.equal(skill.level, 3);
});

test('no sale de los límites', () => {
  let skill = newSkill(MAX_LEVEL);
  for (let i = 0; i < 5; i++) ({ skill } = recordAnswer(skill, true));
  assert.equal(skill.level, MAX_LEVEL);
  skill = newSkill(MIN_LEVEL);
  for (let i = 0; i < 5; i++) ({ skill } = recordAnswer(skill, false));
  assert.equal(skill.level, MIN_LEVEL);
});

test('nivel inicial por edad', () => {
  assert.equal(startingLevel(6), 1);
  assert.equal(startingLevel(9), 2);
  assert.equal(startingLevel(13), 5);
  assert.equal(startingLevel('x'), 1);
});
