const ABILITIES = [
  { code: 'STR', name: 'Strength' },
  { code: 'DEX', name: 'Dexterity' },
  { code: 'CON', name: 'Constitution' },
  { code: 'INT', name: 'Intelligence' },
  { code: 'WIS', name: 'Wisdom' },
  { code: 'CHA', name: 'Charisma' }
];

const SKILL_TO_ABILITY = {
  Acrobatics: 'DEX',
  'Animal Handling': 'WIS',
  Arcana: 'INT',
  Athletics: 'STR',
  Deception: 'CHA',
  History: 'INT',
  Insight: 'WIS',
  Intimidation: 'CHA',
  Investigation: 'INT',
  Medicine: 'WIS',
  Nature: 'INT',
  Perception: 'WIS',
  Performance: 'CHA',
  Persuasion: 'CHA',
  Religion: 'INT',
  'Sleight of Hand': 'DEX',
  Stealth: 'DEX',
  Survival: 'WIS'
};

const ALL_SKILLS = Object.keys(SKILL_TO_ABILITY);
const POINT_BUY_COSTS = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
const ALL_TOOLS = [
  "Alchemist's Supplies", "Brewer's Supplies", "Calligrapher's Supplies", "Carpenter's Tools",
  "Cartographer's Tools", "Cobbler's Tools", "Cook's Utensils", "Forgery Kit", "Gaming Set",
  "Glassblower's Tools", "Herbalism Kit", "Jeweler's Tools", "Leatherworker's Tools",
  "Mason's Tools", "Musical Instrument", "Navigator's Tools", "Painter's Supplies",
  "Poisoner's Kit", "Potter's Tools", "Smith's Tools", "Thieves' Tools", "Tinker's Tools",
  "Vehicle (Land)", "Vehicle (Water)", "Weaver's Tools", "Woodcarver's Tools"
];

const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xvzdvvyb';
const SUBMIT_LOCK_MS = 5000;
let submitLockedUntil = 0;

const appState = {
  data: {
    feats: [],
    backgrounds: [],
    species: [],
    classes: []
  },
  inputs: {
    name: '',
    level: 1,
    pointBuy: { STR: 8, DEX: 8, CON: 8, INT: 8, WIS: 8, CHA: 8 },
    speciesName: '',
    speciesChoices: {},
    backgroundName: '',
    backgroundChoices: {},
    className: '',
    classChoices: {},
    apiChoices: []
  }
};

const els = {};

document.addEventListener('DOMContentLoaded', init);

async function init() {
  cacheElements();
  attachEvents();
  try {
    const [featsRaw, backgrounds, species, classesRaw] = await Promise.all([
      fetchJson('./database/dnd_2024_feats_with_proficiency_choices.json'),
      fetchJson('./database/dnd_2024_common_backgrounds.json'),
      fetchJson('./database/dnd_2024_standard_species.json'),
      fetchJson('./database/dnd_2024_classes.json')
    ]);

    appState.data.feats = Array.isArray(featsRaw) ? featsRaw : (featsRaw.feats || []);
    appState.data.backgrounds = backgrounds;
    appState.data.species = species;
    appState.data.classes = normalizeClasses(classesRaw);

    ensureApiEntries();
    renderAll();
  } catch (error) {
    document.body.innerHTML = `
      <div style="padding:32px;font-family:Inter,sans-serif;color:white;max-width:900px;margin:0 auto;">
        <h1>Could not load JSON data</h1>
        <p>${escapeHtml(error.message)}</p>
        <p>Make sure your folder looks like:</p>
        <pre>index.html\nstyles.css\nscript.js\ndatabase/\n  dnd_2024_feats_with_proficiency_choices.json\n  dnd_2024_common_backgrounds.json\n  dnd_2024_standard_species.json\n  dnd_2024_classes.json</pre>
        <p>Also open the site through a local server rather than double-clicking the HTML file.</p>
      </div>
    `;
  }
}

function cacheElements() {
  els.name = document.getElementById('characterName');
  els.level = document.getElementById('characterLevel');
  els.pointsRemaining = document.getElementById('pointsRemaining');
  els.proficiencyBonus = document.getElementById('proficiencyBonus');
  els.pointBuyGrid = document.getElementById('pointBuyGrid');
  els.abilitySummary = document.getElementById('abilitySummary');
  els.savingThrows = document.getElementById('savingThrows');
  els.skillsList = document.getElementById('skillsList');
  els.builderCards = document.getElementById('builderCards');
  els.selectionSummary = document.getElementById('selectionSummary');
  els.classCardMount = document.getElementById('classCardMount');
  els.submitterName = document.getElementById('submitterName');
  els.exportCharacterBtn = document.getElementById('exportCharacterBtn');
  els.exportMessage = document.getElementById('exportMessage');
}

function attachEvents() {
  els.name.addEventListener('input', e => {
    appState.inputs.name = e.target.value;
    renderSelectionSummary();
  });

  els.level.addEventListener('input', e => {
    const value = clamp(parseInt(e.target.value || '1', 10), 1, 20);
    appState.inputs.level = value;
    e.target.value = value;
    ensureApiEntries();
    renderAll();
  });

  els.exportCharacterBtn.addEventListener('click', handleCharacterExport);
}

function ensureApiEntries() {
  const count = Math.floor(appState.inputs.level / 4);
  while (appState.inputs.apiChoices.length < count) {
    appState.inputs.apiChoices.push({ mode: '', featName: '', choices: {} });
  }
  appState.inputs.apiChoices = appState.inputs.apiChoices.slice(0, count);
}

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to fetch ${path}`);
  return response.json();
}

function normalizeClasses(rawClasses) {
  return (rawClasses || []).map(item => {
    const followups = item.followup_choices || [];
    const skillChoice = followups.find(choice => choice.id === 'skill_choices' || choice.type === 'skill_proficiency_choice') || null;
    const subclassChoice = followups.find(choice => choice.id === 'subclass' || choice.type === 'subclass_choice') || null;
    return {
      ...item,
      skill_choices: skillChoice ? {
        count: skillChoice.count || 0,
        options: skillChoice.options || []
      } : null,
      subclasses: subclassChoice ? (subclassChoice.options || []) : []
    };
  });
}

function renderAll() {
  renderPointBuy();
  renderClassCard();
  renderBuilderCards();
  renderDerivedPanels();
  renderSelectionSummary();
}

async function handleCharacterExport() {
  const submitterName = els.submitterName.value.trim();

  if (!submitterName) {
    setExportMessage('Please enter your name.', 'error');
    return;
  }

  if (Date.now() < submitLockedUntil) return;

  els.exportCharacterBtn.disabled = true;
  setExportMessage('Sending character...');

  try {
    const exportData = buildCharacterExport(submitterName);

    const response = await fetch(FORMSPREE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        submitter_name: submitterName,
        character_name: exportData.character.name || 'Unnamed Character',
        character_level: exportData.character.level,
        class_name: exportData.character.class?.name || '',
        subclass_name: exportData.character.class?.subclass || '',
        species: exportData.character.species.name || '',
        background: exportData.character.background.name || '',
        selected_feats: exportData.character.advancement_choices
          .filter(choice => choice.mode === 'Feat')
          .map(choice => `${choice.feat_name}: ${choice.feat_description}`)
          .join('\n\n'),
        subject: `D&D Character Export - ${exportData.character.name || 'Unnamed Character'}`,
        message: JSON.stringify(exportData, null, 2)
      })
    });

    if (!response.ok) throw new Error(`Submit failed: ${response.status}`);

    setExportMessage('Character sent successfully.', 'success');
    submitLockedUntil = Date.now() + SUBMIT_LOCK_MS;
    startExportCooldown();
  } catch (error) {
    console.error(error);
    setExportMessage('Could not send character. Please try again.', 'error');
    els.exportCharacterBtn.disabled = false;
  }
}

function buildCharacterExport(submitterName = '') {
  const derived = getDerivedState();
  const species = getSelectedSpecies();
  const background = getSelectedBackground();
  const selectedClass = getSelectedClass();

  const advancementChoicesDetailed = (appState.inputs.apiChoices || []).map((entry, index) => {
    const level = (index + 1) * 4;

    if (entry.mode === 'Feat') {
      const feat = getFeatByName(entry.featName);

      return {
        level,
        mode: entry.mode,
        feat_name: entry.featName || '',
        feat_description: feat?.description || '',
        feat_prerequisite: feat?.prerequisite || null,
        feat_category: feat?.category || '',
        feat_record: feat || null,
        choices: structuredCloneSafe(entry.choices || {})
      };
    }

    if (entry.mode === 'Ability Score Improvement') {
      return {
        level,
        mode: entry.mode,
        choices: structuredCloneSafe(entry.choices || {})
      };
    }

    return {
      level,
      mode: entry.mode || '',
      choices: structuredCloneSafe(entry.choices || {})
    };
  });

  return {
    export_version: 2,
    exported_at: new Date().toISOString(),
    submitted_by: submitterName,
    character: {
      name: appState.inputs.name || '',
      level: appState.inputs.level,
      point_buy: { ...appState.inputs.pointBuy },
      species: {
        name: appState.inputs.speciesName || '',
        selections: structuredCloneSafe(appState.inputs.speciesChoices || {}),
        record: species || null
      },
      background: {
        name: appState.inputs.backgroundName || '',
        selections: structuredCloneSafe(appState.inputs.backgroundChoices || {}),
        record: background || null
      },
      class: selectedClass ? {
        name: appState.inputs.className || '',
        subclass: appState.inputs.classChoices.subclass || '',
        selections: structuredCloneSafe(appState.inputs.classChoices || {}),
        hit_die: selectedClass.hit_die,
        record: selectedClass
      } : null,
      advancement_choices: advancementChoicesDetailed,
      ability_scores: { ...derived.abilityScores },
      ability_modifiers: Object.fromEntries(
        ABILITIES.map(({ code }) => [code, getAbilityModifier(derived.abilityScores[code])])
      ),
      proficiency_bonus: derived.proficiencyBonus,
      saving_throws: Object.fromEntries(
        ABILITIES.map(({ code, name }) => [
          code,
          {
            name,
            proficient: derived.saveProficiencies.has(code),
            value:
              getAbilityModifier(derived.abilityScores[code]) +
              (derived.saveProficiencies.has(code) ? derived.proficiencyBonus : 0)
          }
        ])
      ),
      skills: Object.fromEntries(
        ALL_SKILLS.map(skill => {
          const tier = derived.skillTiers[skill] || 'none';
          const pbMultiplier = tier === 'expertise' ? 2 : tier === 'proficient' ? 1 : 0;
          return [
            skill,
            {
              ability: SKILL_TO_ABILITY[skill],
              tier,
              value:
                getAbilityModifier(derived.abilityScores[SKILL_TO_ABILITY[skill]]) +
                pbMultiplier * derived.proficiencyBonus
            }
          ];
        })
      ),
      proficiencies: {
        weapons: [...new Set(derived.weaponProficiencies)],
        armor: [...new Set(derived.armorProficiencies)],
        saving_throws: [...new Set(derived.saveProficiencies)],
        other: [...new Set(derived.otherProficiencies)]
      }
    }
  };
}

function setExportMessage(message, type = '') {
  els.exportMessage.textContent = message;
  els.exportMessage.className = `export-message${type ? ` ${type}` : ''}`;
}

function startExportCooldown() {
  const interval = setInterval(() => {
    const msLeft = submitLockedUntil - Date.now();

    if (msLeft <= 0) {
      clearInterval(interval);
      els.exportCharacterBtn.disabled = false;
      setExportMessage('Ready to send again.');
      return;
    }

    const seconds = Math.ceil(msLeft / 1000);
    setExportMessage(`Please wait ${seconds}s before sending again.`);
  }, 250);
}

function renderPointBuy() {
  const pointsLeft = getPointBuyPointsLeft();
  els.pointsRemaining.textContent = pointsLeft;
  els.pointsRemaining.parentElement.classList.toggle('error', pointsLeft < 0);
  els.pointBuyGrid.innerHTML = '';

  ABILITIES.forEach(({ code, name }) => {
    const current = appState.inputs.pointBuy[code];
    const row = document.createElement('div');
    row.className = 'point-row';
    row.innerHTML = `
      <div class="point-row-header">
        <div>
          <div class="ability-code">${code}</div>
          <div class="ability-name">${name}</div>
        </div>
        <div class="point-buy-value">${current}</div>
      </div>
      <div class="stepper">
        <button type="button" data-action="down" data-ability="${code}">−</button>
        <button type="button" data-action="up" data-ability="${code}">+</button>
      </div>
      <div class="point-buy-cost">Cost: ${POINT_BUY_COSTS[current]} points</div>
    `;

    row.querySelectorAll('button').forEach(btn => {
      const action = btn.dataset.action;
      btn.disabled = action === 'down' ? current <= 8 : current >= 15 || pointsLeft <= 0;
      btn.addEventListener('click', () => {
        const next = current + (action === 'up' ? 1 : -1);
        if (next < 8 || next > 15) return;
        appState.inputs.pointBuy[code] = next;
        renderAll();
      });
    });

    els.pointBuyGrid.appendChild(row);
  });
}

function renderBuilderCards() {
  els.builderCards.innerHTML = '';
  els.builderCards.appendChild(renderSpeciesCard());
  els.builderCards.appendChild(renderBackgroundCard());
  appState.inputs.apiChoices.forEach((entry, index) => {
    els.builderCards.appendChild(renderApiCard(entry, index));
  });
}

function renderSpeciesCard() {
  const card = createBuilderCard('Species', 'Choose a standard 2024 species.');
  const speciesOptions = sortByName(appState.data.species);
  const select = createSelect(
    'Species',
    speciesOptions.map(species => species.name),
    appState.inputs.speciesName,
    value => {
      appState.inputs.speciesName = value;
      appState.inputs.speciesChoices = {};
      renderAll();
    },
    'Select a species'
  );

  card.querySelector('.card-body').appendChild(select);

  const species = getSelectedSpecies();
  if (species) {
    card.querySelector('.card-body').appendChild(renderSpeciesDetails(species));
    const followups = renderChoiceGroup(species.followup_choices || [], appState.inputs.speciesChoices, 'species');
    if (followups) card.querySelector('.card-body').appendChild(followups);
  }

  return card;
}

function renderBackgroundCard() {
  const card = createBuilderCard('Background', 'Choose a common 2024 background.');
  const backgroundOptions = sortByName(appState.data.backgrounds);
  const select = createSelect(
    'Background',
    backgroundOptions.map(background => background.name),
    appState.inputs.backgroundName,
    value => {
      appState.inputs.backgroundName = value;
      appState.inputs.backgroundChoices = {};
      renderAll();
    },
    'Select a background'
  );

  card.querySelector('.card-body').appendChild(select);

  const background = getSelectedBackground();
  if (background) {
    card.querySelector('.card-body').appendChild(renderBackgroundDetails(background));
    const followups = renderChoiceGroup(background.followup_choices || [], appState.inputs.backgroundChoices, 'background');
    if (followups) card.querySelector('.card-body').appendChild(followups);
  }

  return card;
}

function renderApiCard(entry, index) {
  const level = (index + 1) * 4;
  const card = createBuilderCard(`Level ${level} Choice`, 'Choose Ability Score Improvement or a feat.');
  const body = card.querySelector('.card-body');

  body.appendChild(createSelect(
    'Choice Type',
    ['Ability Score Improvement', 'Feat'],
    entry.mode,
    value => {
      appState.inputs.apiChoices[index] = { mode: value, featName: '', choices: {} };
      renderAll();
    },
    'Select one'
  ));

  if (entry.mode === 'Feat') {
    body.appendChild(createSelect(
      'Feat',
      sortByName(appState.data.feats).map(feat => feat.name),
      entry.featName,
      value => {
        appState.inputs.apiChoices[index].featName = value;
        appState.inputs.apiChoices[index].choices = {};
        renderAll();
      },
      'Select a feat'
    ));

    const feat = getFeatByName(entry.featName);
    if (feat) {
      body.appendChild(renderFeatDetails(feat));
      const followups = renderChoiceGroup(feat.followup_choices || [], entry.choices, `api-${index}`);
      if (followups) body.appendChild(followups);
    }
  } else if (entry.mode === 'Ability Score Improvement') {
    const asiChoice = {
      id: 'ability_score_improvement',
      type: 'ability_score_improve_2',
      count: 2,
      options: ABILITIES.map(a => a.code),
      distribution: 'one score +2 or two scores +1 each',
      max_score: 20,
      rules: null
    };
    const wrapper = renderChoiceGroup([asiChoice], entry.choices, `api-${index}`);
    if (wrapper) body.appendChild(wrapper);
  }

  return card;
}

function createBuilderCard(title, subtitle) {
  const card = document.createElement('div');
  card.className = 'card builder-card';
  card.innerHTML = `
    <div class="card-heading">
      <div>
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(subtitle)}</p>
      </div>
      <div class="mini-pill">Interactive</div>
    </div>
    <div class="card-body"></div>
  `;
  return card;
}

function createSelect(label, options, value, onChange, placeholder = 'Select') {
  const wrapper = document.createElement('div');
  wrapper.className = 'choice-block';
  const select = document.createElement('select');
  select.innerHTML = `<option value="">${escapeHtml(placeholder)}</option>` + options.map(opt => {
    const optionLabel = typeof opt === 'string' ? opt : opt.name;
    return `<option value="${escapeHtml(optionLabel)}" ${optionLabel === value ? 'selected' : ''}>${escapeHtml(optionLabel)}</option>`;
  }).join('');
  select.addEventListener('change', e => onChange(e.target.value));
  wrapper.innerHTML = `<label class="field-label">${escapeHtml(label)}</label>`;
  wrapper.appendChild(select);
  return wrapper;
}

function renderSpeciesDetails(species) {
  const div = document.createElement('div');
  div.className = 'card-grid';

  div.appendChild(renderDetailBox('Core Traits', [
    `Creature Type: ${species.creature_type}`,
    `Speed: ${species.speed} ft.`,
    species.darkvision ? `Darkvision: ${species.darkvision} ft.` : 'No Darkvision'
  ]));

  div.appendChild(renderDetailBox('Abilities', species.abilities || []));
  return div;
}

function renderBackgroundDetails(background) {
  const div = document.createElement('div');
  div.className = 'card-grid';
  div.appendChild(renderDetailBox('Background Feature Summary', [
    `Origin Feat: ${background.origin_feat}`,
    `Ability Score Options: ${background.ability_score_options.join(', ')}`,
    `Distribution: +2/+1 or +1/+1/+1`
  ]));
  div.appendChild(renderDetailBox('Granted Proficiencies', flattenProficiencies(background.proficiencies)));
  return div;
}

function renderFeatDetails(feat) {
  const div = document.createElement('div');
  div.className = 'card-grid';
  div.appendChild(renderDetailBox('Feat', [feat.description, feat.prerequisite ? `Prerequisite: ${feat.prerequisite}` : 'No prerequisite']));
  div.appendChild(renderDetailBox('Granted Proficiencies', flattenDetailedFeatProficiencies(feat.proficiencies)));
  return div;
}

function renderDetailBox(title, items) {
  const box = document.createElement('div');
  box.className = 'detail-box';
  const content = items && items.length
    ? `<ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    : `<p class="helper-text">No additional fixed entries.</p>`;
  box.innerHTML = `<div class="field-label">${escapeHtml(title)}</div>${content}`;
  return box;
}

function renderChoiceGroup(choiceDefs, choiceState, scopeKey) {
  if (!choiceDefs || !choiceDefs.length) return null;
  const wrapper = document.createElement('div');
  wrapper.className = 'inline-selects';
  choiceDefs.forEach(choice => {
    wrapper.appendChild(renderSingleChoice(choice, choiceState, scopeKey));
  });
  return wrapper;
}

function renderSingleChoice(choice, choiceState, scopeKey) {
  switch (choice.type) {
    case 'ability_score_allocation':
      return renderAbilityAllocation(choice, choiceState, scopeKey);
    case 'ability_score_increase':
      return renderSimpleAbilityIncrease(choice, choiceState, scopeKey);
    case 'ability_score_improve_2':
      return renderAsiChoice(choice, choiceState, scopeKey);
    case 'size_choice':
    case 'spellcasting_ability_choice':
    case 'saving_throw_proficiency':
    case 'skill_proficiency_choice':
    case 'skill_proficiency':
    case 'skill_expertise':
    case 'proficiency_or_expertise':
    case 'feat_choice':
    case 'subclass_choice':
      return renderSingleSelectChoice(choice, choiceState, scopeKey);
    case 'other_proficiency_choice':
      return renderOtherProfChoice(choice, choiceState, scopeKey);
    case 'lineage_choice':
      return renderLineageChoice(choice, choiceState, scopeKey);
    case 'mixed_proficiency':
      return renderMixedProficiencyChoice(choice, choiceState, scopeKey);
    default:
      return renderUnsupportedChoice(choice);
  }
}

function renderAbilityAllocation(choice, choiceState, scopeKey) {
  const block = makeChoiceBlock(choice, 'Assign 3 points among the listed abilities. Maximum +2 to any one score.');
  const current = choiceState[choice.id] || Object.fromEntries(choice.options.map(opt => [opt, 0]));
  choiceState[choice.id] = current;

  const totalSpent = Object.values(current).reduce((sum, value) => sum + value, 0);
  const grid = document.createElement('div');
  grid.className = 'ability-allocation-grid';

  choice.options.forEach(option => {
    const amount = current[option] || 0;
    const cell = document.createElement('div');
    cell.className = 'alloc-cell';
    cell.innerHTML = `<h4>${option}</h4><div class="stepper"><button type="button">−</button><div class="point-buy-value">${amount}</div><button type="button">+</button></div>`;
    const [down, up] = cell.querySelectorAll('button');
    down.disabled = amount <= 0;
    up.disabled = amount >= (choice.rules?.max_to_one_score ?? 2) || totalSpent >= (choice.rules?.total_points ?? 3);
    down.addEventListener('click', () => {
      current[option] = amount - 1;
      renderAll();
    });
    up.addEventListener('click', () => {
      current[option] = amount + 1;
      renderAll();
    });
    grid.appendChild(cell);
  });

  const message = document.createElement('div');
  message.className = `message ${totalSpent === 3 ? 'success' : ''}`;
  message.textContent = totalSpent === 3 ? 'Allocation complete.' : `${3 - totalSpent} point(s) left to assign.`;
  block.appendChild(grid);
  block.appendChild(message);
  return block;
}

function renderSimpleAbilityIncrease(choice, choiceState, scopeKey) {
  return renderSingleSelectChoice(choice, choiceState, scopeKey, 'Choose the ability to increase by 1.');
}

function renderAsiChoice(choice, choiceState) {
  const block = makeChoiceBlock(choice, 'Choose one ability for +2, or choose two abilities for +1 each.');
  const mode = choiceState[`${choice.id}_mode`] || 'plus2';
  const first = choiceState[`${choice.id}_first`] || '';
  const second = choiceState[`${choice.id}_second`] || '';

  const modeWrap = document.createElement('div');
  modeWrap.className = 'dual-select-row';
  const modeSelect = document.createElement('select');
  modeSelect.innerHTML = `
    <option value="plus2" ${mode === 'plus2' ? 'selected' : ''}>+2</option>
    <option value="plus1plus1" ${mode === 'plus1plus1' ? 'selected' : ''}>+1 / +1</option>
  `;
  modeSelect.addEventListener('change', e => {
    choiceState[`${choice.id}_mode`] = e.target.value;
    if (e.target.value === 'plus2') delete choiceState[`${choice.id}_second`];
    renderAll();
  });
  modeWrap.innerHTML = '<div class="field-label">Mode</div>';
  modeWrap.appendChild(modeSelect);
  block.appendChild(modeWrap);

  block.appendChild(makeLabeledSelect('Ability', choice.options, first, value => {
    choiceState[`${choice.id}_first`] = value;
    renderAll();
  }, 'Choose ability'));

  if (mode === 'plus1plus1') {
    const secondOptions = choice.options.filter(opt => opt !== first || !first);
    block.appendChild(makeLabeledSelect('Second Ability', secondOptions, second, value => {
      choiceState[`${choice.id}_second`] = value;
      renderAll();
    }, 'Choose second ability'));
  }

  return block;
}

function renderSingleSelectChoice(choice, choiceState, scopeKey, helperOverride = '') {
  const block = makeChoiceBlock(choice, helperOverride || stringifyRules(choice.rules));
  const value = choiceState[choice.id] || '';
  block.appendChild(makeLabeledSelect('Selection', normalizeOptionLabels(choice.options), value, nextValue => {
    choiceState[choice.id] = nextValue;
    renderAll();
  }, 'Choose one'));
  return block;
}

function renderOtherProfChoice(choice, choiceState) {
  const block = makeChoiceBlock(choice, stringifyRules(choice.rules));
  const value = choiceState[choice.id] || '';
  block.appendChild(makeLabeledSelect('Selection', normalizeOptionLabels(choice.options), value, nextValue => {
    choiceState[choice.id] = nextValue;
    renderAll();
  }, 'Choose one'));
  return block;
}

function renderLineageChoice(choice, choiceState) {
  const block = makeChoiceBlock(choice, stringifyRules(choice.rules));
  const options = choice.options.map(opt => opt.name);
  const selectedName = choiceState[choice.id] || '';
  block.appendChild(makeLabeledSelect('Selection', options, selectedName, value => {
    choiceState[choice.id] = value;
    renderAll();
  }, 'Choose one'));

  const selected = (choice.options || []).find(opt => opt.name === selectedName);
  if (selected) {
    const pills = document.createElement('div');
    pills.className = 'pill-row';
    Object.entries(selected)
      .filter(([key]) => key !== 'name')
      .forEach(([key, val]) => {
        const text = Array.isArray(val) ? `${key}: ${val.join('; ')}` : `${key}: ${val}`;
        pills.innerHTML += `<div class="small-pill">${escapeHtml(text)}</div>`;
      });
    block.appendChild(pills);
  }
  return block;
}

function renderMixedProficiencyChoice(choice, choiceState) {
  const block = makeChoiceBlock(choice, choice.rules);
  const rowsWrapper = document.createElement('div');
  rowsWrapper.className = 'inline-selects';
  const rows = choiceState[choice.id] || Array.from({ length: choice.count }, () => ({ group: 'skills', value: '' }));
  choiceState[choice.id] = rows;

  rows.forEach((row, idx) => {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'dual-select-row';

    const groupSelect = document.createElement('select');
    groupSelect.innerHTML = choice.groups.map(group => `<option value="${group}" ${row.group === group ? 'selected' : ''}>${titleCase(group)}</option>`).join('');
    groupSelect.addEventListener('change', e => {
      rows[idx] = { group: e.target.value, value: '' };
      renderAll();
    });

    const options = row.group === 'skills' ? ALL_SKILLS : ALL_TOOLS;
    const valueSelect = document.createElement('select');
    valueSelect.innerHTML = `<option value="">Choose ${row.group === 'skills' ? 'skill' : 'tool'}</option>` + options.map(opt => `<option value="${escapeHtml(opt)}" ${row.value === opt ? 'selected' : ''}>${escapeHtml(opt)}</option>`).join('');
    valueSelect.addEventListener('change', e => {
      rows[idx].value = e.target.value;
      renderAll();
    });

    rowDiv.appendChild(groupSelect);
    rowDiv.appendChild(valueSelect);
    rowsWrapper.appendChild(rowDiv);
  });

  block.appendChild(rowsWrapper);
  return block;
}

function renderUnsupportedChoice(choice) {
  const block = makeChoiceBlock(choice, 'This choice type is not yet custom-rendered.');
  block.appendChild(renderDetailBox('Choice Data', [JSON.stringify(choice)]));
  return block;
}

function makeChoiceBlock(choice, helperText = '') {
  const block = document.createElement('div');
  block.className = 'choice-block';
  block.innerHTML = `<div class="field-label">${escapeHtml(prettifyChoiceLabel(choice.id || choice.type))}</div>`;
  if (helperText) {
    const note = document.createElement('div');
    note.className = 'choice-note';
    note.textContent = helperText;
    block.appendChild(note);
  }
  return block;
}

function makeLabeledSelect(label, options, currentValue, onChange, placeholder) {
  const wrap = document.createElement('div');
  wrap.className = 'inline-selects';
  wrap.innerHTML = `<label class="field-label">${escapeHtml(label)}</label>`;
  const select = document.createElement('select');
  select.innerHTML = `<option value="">${escapeHtml(placeholder)}</option>` + options.map(opt => {
    const val = typeof opt === 'string' ? opt : opt.name;
    return `<option value="${escapeHtml(val)}" ${val === currentValue ? 'selected' : ''}>${escapeHtml(val)}</option>`;
  }).join('');
  select.addEventListener('change', e => onChange(e.target.value));
  wrap.appendChild(select);
  return wrap;
}

function renderClassCard() {
  if (!els.classCardMount) return;
  els.classCardMount.innerHTML = '';

  const card = createBuilderCard('Class', 'Choose a class, then choose a subclass.');
  const body = card.querySelector('.card-body');
  const classes = sortByName(appState.data.classes || []);

  body.appendChild(createSelect(
    'Class',
    classes.map(item => item.name),
    appState.inputs.className,
    value => {
      appState.inputs.className = value;
      appState.inputs.classChoices = {};
      renderAll();
    },
    'Select a class'
  ));

  const selectedClass = getSelectedClass();
  if (selectedClass) {
    body.appendChild(renderClassDetails(selectedClass));

    if (selectedClass.skill_choices?.count) {
      body.appendChild(renderClassSkillChoices(selectedClass));
    }

    if (selectedClass.subclasses?.length) {
      body.appendChild(makeLabeledSelect(
        'Subclass',
        selectedClass.subclasses,
        appState.inputs.classChoices.subclass || '',
        value => {
          appState.inputs.classChoices.subclass = value;
          renderAll();
        },
        'Select a subclass'
      ));
    }
  }

  els.classCardMount.appendChild(card);
}

function renderClassDetails(selectedClass) {
  const div = document.createElement('div');
  div.className = 'card-grid';
  div.appendChild(renderDetailBox('Class Summary', [
    `Hit Die: ${selectedClass.hit_die}`,
    `Saving Throws: ${(selectedClass.proficiencies?.saving_throws || []).join(', ') || 'None'}`,
    `Subclass Options: ${(selectedClass.subclasses || []).length}`
  ]));
  div.appendChild(renderDetailBox('Starting Proficiencies', flattenProficiencies(selectedClass.proficiencies)));
  return div;
}

function renderClassSkillChoices(selectedClass) {
  const block = document.createElement('div');
  block.className = 'choice-block';
  block.innerHTML = `<div class="field-label">Class Skill Choices</div><div class="choice-note">Choose ${selectedClass.skill_choices.count} skill${selectedClass.skill_choices.count === 1 ? '' : 's'}.</div>`;

  const current = Array.isArray(appState.inputs.classChoices.skill_choices)
    ? appState.inputs.classChoices.skill_choices
    : Array.from({ length: selectedClass.skill_choices.count }, () => '');
  if (current.length !== selectedClass.skill_choices.count) {
    while (current.length < selectedClass.skill_choices.count) current.push('');
    current.length = selectedClass.skill_choices.count;
  }
  appState.inputs.classChoices.skill_choices = current;

  const wrap = document.createElement('div');
  wrap.className = 'inline-selects';

  current.forEach((value, index) => {
    const taken = current.filter((item, itemIndex) => item && itemIndex !== index);
    const options = selectedClass.skill_choices.options.filter(opt => !taken.includes(opt) || opt === value);
    wrap.appendChild(makeLabeledSelect(
      `Skill ${index + 1}`,
      options,
      value,
      nextValue => {
        appState.inputs.classChoices.skill_choices[index] = nextValue;
        renderAll();
      },
      'Choose a skill'
    ));
  });

  block.appendChild(wrap);
  return block;
}

function renderDerivedPanels() {
  const derived = getDerivedState();
  els.proficiencyBonus.textContent = formatModifier(derived.proficiencyBonus);

  renderAbilitySummary(derived);
  renderSavingThrows(derived);
  renderSkills(derived);
}

function renderAbilitySummary(derived) {
  els.abilitySummary.innerHTML = '';
  ABILITIES.forEach(({ code, name }) => {
    const total = derived.abilityScores[code];
    const mod = getAbilityModifier(total);
    const base = appState.inputs.pointBuy[code];
    const bonus = total - base;
    const tile = document.createElement('div');
    tile.className = 'ability-tile';
    tile.innerHTML = `
      <div class="ability-tile-top">
        <div>
          <div class="ability-code">${code}</div>
          <div class="ability-name">${name}</div>
        </div>
        <div class="mod-badge">${formatModifier(mod)}</div>
      </div>
      <div class="ability-total">${total}</div>
      <div class="tile-detail">Base ${base}${bonus ? ` · Bonus +${bonus}` : ''}</div>
    `;
    els.abilitySummary.appendChild(tile);
  });
}

function renderSavingThrows(derived) {
  els.savingThrows.innerHTML = '';
  ABILITIES.forEach(({ code, name }) => {
    const proficient = derived.saveProficiencies.has(code);
    const modifier = getAbilityModifier(derived.abilityScores[code]) + (proficient ? derived.proficiencyBonus : 0);
    els.savingThrows.appendChild(createListRow(name, code, formatModifier(modifier), proficient ? 'Proficient' : 'None', proficient ? 'proficient' : 'none'));
  });
}

function renderSkills(derived) {
  els.skillsList.innerHTML = '';
  ALL_SKILLS.forEach(skill => {
    const tier = derived.skillTiers[skill] || 'none';
    const pbMultiplier = tier === 'expertise' ? 2 : tier === 'proficient' ? 1 : 0;
    const modifier = getAbilityModifier(derived.abilityScores[SKILL_TO_ABILITY[skill]]) + pbMultiplier * derived.proficiencyBonus;
    const subtitle = `${SKILL_TO_ABILITY[skill]} · ${titleCase(tier)}`;
    els.skillsList.appendChild(createListRow(skill, subtitle, formatModifier(modifier), titleCase(tier), tier));
  });
}

function createListRow(title, subtitle, trailing, badgeText, badgeClass) {
  const row = document.createElement('div');
  row.className = 'list-row';
  row.innerHTML = `
    <div class="list-main">
      <div class="list-title">${escapeHtml(title)}</div>
      <div class="list-subtitle">${escapeHtml(subtitle)}</div>
    </div>
    <div style="display:flex;align-items:center;gap:10px;">
      <div class="list-title">${escapeHtml(trailing)}</div>
      <div class="status-badge ${badgeClass}">${escapeHtml(badgeText)}</div>
    </div>
  `;
  return row;
}

function renderSelectionSummary() {
  const derived = getDerivedState();
  const chips = [];

  chips.push(summaryChip('Name', appState.inputs.name || 'Unnamed Character'));
  chips.push(summaryChip('Level', String(appState.inputs.level), `PB ${formatModifier(derived.proficiencyBonus)}`));
  chips.push(summaryChip('Species', appState.inputs.speciesName || 'None selected'));
  chips.push(summaryChip('Background', appState.inputs.backgroundName || 'None selected'));
  chips.push(summaryChip('Class', appState.inputs.className || 'None selected', appState.inputs.classChoices.subclass || 'No subclass'));

  appState.inputs.apiChoices.forEach((entry, index) => {
    const label = `L${(index + 1) * 4}`;
    const value = entry.mode === 'Feat' ? (entry.featName || 'Feat') : (entry.mode || 'Unchosen');
    chips.push(summaryChip(label, value));
  });

  els.selectionSummary.innerHTML = chips.join('');
}

function summaryChip(title, value, sub = '') {
  return `
    <div class="summary-chip">
      <div class="summary-chip-title">${escapeHtml(title)}</div>
      <div class="summary-chip-value">${escapeHtml(value)}</div>
      ${sub ? `<div class="summary-chip-sub">${escapeHtml(sub)}</div>` : ''}
    </div>
  `;
}

function getDerivedState() {
  const abilityBonuses = { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 };
  const skillTiers = Object.fromEntries(ALL_SKILLS.map(skill => [skill, 'none']));
  const saveProficiencies = new Set();
  const otherProficiencies = [];
  const weaponProficiencies = [];
  const armorProficiencies = [];

  const background = getSelectedBackground();
  if (background) {
    (background.proficiencies.skills || []).forEach(skill => applySkillTier(skillTiers, skill, 'proficient'));
    (background.proficiencies.other || []).forEach(item => otherProficiencies.push(item));
    applyAbilityAllocationBonus(abilityBonuses, appState.inputs.backgroundChoices.ability_scores || {});
  }

  const selectedClass = getSelectedClass();
  if (selectedClass) {
    applyGenericProficiencies(selectedClass.proficiencies, { skillTiers, saveProficiencies, otherProficiencies, weaponProficiencies, armorProficiencies });
    (appState.inputs.classChoices.skill_choices || []).forEach(skill => {
      if (skill) applySkillTier(skillTiers, skill, 'proficient');
    });
  }

  const species = getSelectedSpecies();
  if (species) {
    applyGenericProficiencies(species.proficiencies, { skillTiers, saveProficiencies, otherProficiencies, weaponProficiencies, armorProficiencies });
    applyChoiceEffects(species.followup_choices, appState.inputs.speciesChoices, { abilityBonuses, skillTiers, saveProficiencies, otherProficiencies });
  }

  appState.inputs.apiChoices.forEach(entry => {
    if (entry.mode === 'Ability Score Improvement') {
      applyChoiceEffects([
        {
          id: 'ability_score_improvement',
          type: 'ability_score_improve_2',
          options: ABILITIES.map(a => a.code)
        }
      ], entry.choices, { abilityBonuses, skillTiers, saveProficiencies, otherProficiencies });
    } else if (entry.mode === 'Feat') {
      const feat = getFeatByName(entry.featName);
      if (!feat) return;
      applyGenericProficiencies(feat.proficiencies, { skillTiers, saveProficiencies, otherProficiencies, weaponProficiencies, armorProficiencies }, true);
      applyChoiceEffects(feat.followup_choices, entry.choices, { abilityBonuses, skillTiers, saveProficiencies, otherProficiencies });
    }
  });

  const abilityScores = Object.fromEntries(ABILITIES.map(({ code }) => [code, clamp(appState.inputs.pointBuy[code] + (abilityBonuses[code] || 0), 1, 20)]));

  return {
    abilityScores,
    abilityBonuses,
    skillTiers,
    saveProficiencies,
    otherProficiencies,
    weaponProficiencies,
    armorProficiencies,
    proficiencyBonus: getProficiencyBonus(appState.inputs.level)
  };
}

function applyGenericProficiencies(profs, accum, detailed = false) {
  if (!profs) return;
  if (detailed) {
    (profs.weapons?.granted || []).forEach(item => accum.weaponProficiencies.push(item));
    (profs.armor?.granted || []).forEach(item => accum.armorProficiencies.push(item));
    (profs.saving_throws?.granted || []).forEach(item => accum.saveProficiencies.add(item));
    (profs.skills?.granted || []).forEach(item => applySkillTier(accum.skillTiers, item, 'proficient'));
    (profs.other?.granted || []).forEach(item => accum.otherProficiencies.push(item));
  } else {
    (profs.weapons || []).forEach(item => accum.weaponProficiencies.push(item));
    (profs.armor || []).forEach(item => accum.armorProficiencies.push(item));
    (profs.saving_throws || []).forEach(item => accum.saveProficiencies.add(item));
    (profs.skills || []).forEach(item => applySkillTier(accum.skillTiers, item, 'proficient'));
    (profs.other || []).forEach(item => accum.otherProficiencies.push(item));
  }
}

function applyChoiceEffects(choiceDefs = [], choiceState = {}, accum) {
  (choiceDefs || []).forEach(choice => {
    switch (choice.type) {
      case 'ability_score_allocation': {
        applyAbilityAllocationBonus(accum.abilityBonuses, choiceState[choice.id] || {});
        break;
      }
      case 'ability_score_increase': {
        const selected = choiceState[choice.id];
        if (selected) accum.abilityBonuses[selected] = (accum.abilityBonuses[selected] || 0) + 1;
        break;
      }
      case 'ability_score_improve_2': {
        const mode = choiceState[`${choice.id}_mode`] || 'plus2';
        const first = choiceState[`${choice.id}_first`];
        const second = choiceState[`${choice.id}_second`];
        if (first) accum.abilityBonuses[first] = (accum.abilityBonuses[first] || 0) + (mode === 'plus2' ? 2 : 1);
        if (mode === 'plus1plus1' && second) accum.abilityBonuses[second] = (accum.abilityBonuses[second] || 0) + 1;
        break;
      }
      case 'skill_proficiency_choice':
      case 'skill_proficiency': {
        const skill = choiceState[choice.id];
        if (skill) applySkillTier(accum.skillTiers, skill, 'proficient');
        break;
      }
      case 'skill_expertise': {
        const skill = choiceState[choice.id];
        if (skill) applySkillTier(accum.skillTiers, skill, 'expertise');
        break;
      }
      case 'proficiency_or_expertise': {
        const skill = choiceState[choice.id];
        if (skill) {
          const current = accum.skillTiers[skill] || 'none';
          applySkillTier(accum.skillTiers, skill, current === 'none' ? 'proficient' : 'expertise');
        }
        break;
      }
      case 'saving_throw_proficiency': {
        const save = choiceState[choice.id];
        if (save) accum.saveProficiencies.add(save);
        break;
      }
      case 'other_proficiency_choice': {
        const item = choiceState[choice.id];
        if (item) accum.otherProficiencies.push(item);
        break;
      }
      case 'mixed_proficiency': {
        const rows = choiceState[choice.id] || [];
        rows.forEach(row => {
          if (!row.value) return;
          if (row.group === 'skills') applySkillTier(accum.skillTiers, row.value, 'proficient');
          else accum.otherProficiencies.push(row.value);
        });
        break;
      }
      default:
        break;
    }
  });
}

function applyAbilityAllocationBonus(target, allocation) {
  Object.entries(allocation || {}).forEach(([ability, amount]) => {
    target[ability] = (target[ability] || 0) + (amount || 0);
  });
}

function applySkillTier(skillTiers, skill, nextTier) {
  const order = { none: 0, proficient: 1, expertise: 2 };
  const current = skillTiers[skill] || 'none';
  if (order[nextTier] > order[current]) skillTiers[skill] = nextTier;
}

function getPointBuyPointsLeft() {
  const spent = Object.values(appState.inputs.pointBuy).reduce((sum, score) => sum + (POINT_BUY_COSTS[score] ?? 0), 0);
  return 27 - spent;
}

function getSelectedSpecies() {
  return appState.data.species.find(species => species.name === appState.inputs.speciesName);
}

function getSelectedBackground() {
  return appState.data.backgrounds.find(background => background.name === appState.inputs.backgroundName);
}

function getSelectedClass() {
  return (appState.data.classes || []).find(item => item.name === appState.inputs.className);
}

function getFeatByName(name) {
  return appState.data.feats.find(feat => feat.name === name);
}

function flattenProficiencies(profs) {
  const lines = [];
  if (profs.skills?.length) lines.push(`Skills: ${profs.skills.join(', ')}`);
  if (profs.other?.length) lines.push(`Other: ${profs.other.join(', ')}`);
  if (profs.weapons?.length) lines.push(`Weapons: ${profs.weapons.join(', ')}`);
  if (profs.armor?.length) lines.push(`Armor: ${profs.armor.join(', ')}`);
  if (profs.saving_throws?.length) lines.push(`Saving Throws: ${profs.saving_throws.join(', ')}`);
  return lines.length ? lines : ['No fixed proficiencies.'];
}

function flattenDetailedFeatProficiencies(profs) {
  const lines = [];
  const pushGranted = (label, bucket) => {
    if (bucket?.granted?.length) lines.push(`${label}: ${bucket.granted.join(', ')}`);
    if (bucket?.choice_count) lines.push(`${label}: ${bucket.choice_count} choice(s)`);
  };
  pushGranted('Weapons', profs?.weapons);
  pushGranted('Armor', profs?.armor);
  pushGranted('Saving Throws', profs?.saving_throws);
  pushGranted('Skills', profs?.skills);
  pushGranted('Other', profs?.other);
  return lines.length ? lines : ['No granted proficiencies.'];
}

function normalizeOptionLabels(options = []) {
  return options.map(option => (typeof option === 'string' ? option : option.name));
}

function stringifyRules(rules) {
  if (!rules) return '';
  if (typeof rules === 'string') return rules;
  return Object.entries(rules).map(([key, value]) => `${prettifyChoiceLabel(key)}: ${Array.isArray(value) ? value.join(', ') : value}`).join(' · ');
}

function prettifyChoiceLabel(value = '') {
  return String(value).replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function titleCase(value = '') {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function sortByName(items) {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}

function getAbilityModifier(score) {
  return Math.floor((score - 10) / 2);
}

function getProficiencyBonus(level) {
  if (level >= 17) return 6;
  if (level >= 13) return 5;
  if (level >= 9) return 4;
  if (level >= 5) return 3;
  return 2;
}

function formatModifier(value) {
  return value >= 0 ? `+${value}` : `${value}`;
}

function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function structuredCloneSafe(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}
