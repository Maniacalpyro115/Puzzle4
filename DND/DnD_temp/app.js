const ABILITIES = [
  { key: "str", short: "STR", name: "Strength" },
  { key: "dex", short: "DEX", name: "Dexterity" },
  { key: "con", short: "CON", name: "Constitution" },
  { key: "int", short: "INT", name: "Intelligence" },
  { key: "wis", short: "WIS", name: "Wisdom" },
  { key: "cha", short: "CHA", name: "Charisma" }
];

const SKILLS = [
  { name: "Acrobatics", ability: "dex" },
  { name: "Animal Handling", ability: "wis" },
  { name: "Arcana", ability: "int" },
  { name: "Athletics", ability: "str" },
  { name: "Deception", ability: "cha" },
  { name: "History", ability: "int" },
  { name: "Insight", ability: "wis" },
  { name: "Intimidation", ability: "cha" },
  { name: "Investigation", ability: "int" },
  { name: "Medicine", ability: "wis" },
  { name: "Nature", ability: "int" },
  { name: "Perception", ability: "wis" },
  { name: "Performance", ability: "cha" },
  { name: "Persuasion", ability: "cha" },
  { name: "Religion", ability: "int" },
  { name: "Sleight of Hand", ability: "dex" },
  { name: "Stealth", ability: "dex" },
  { name: "Survival", ability: "wis" }
];

const POINT_BUY_COST = {
  8: 0,
  9: 1,
  10: 2,
  11: 3,
  12: 4,
  13: 5,
  14: 7,
  15: 9
};

const CLASS_INDEX_PATH = "./database/classes/index.json";
const SUBCLASS_INDEX_BASE = "./database/subclasses";

const state = {
  classList: [],
  loadedClasses: {},
  loadedSubclasses: {},
  selectedClass: null,
  selectedSubclass: null,
  selectedClassSkills: new Set(),
  backgroundSkills: new Set(),
  classSkillOptions: [],
  classSkillChooseCount: 0,
  stats: {
    str: 8,
    dex: 8,
    con: 8,
    int: 8,
    wis: 8,
    cha: 8
  }
};

const els = {
  classSelect: document.getElementById("classSelect"),
  subclassSelect: document.getElementById("subclassSelect"),
  levelInput: document.getElementById("levelInput"),
  backgroundSelect: document.getElementById("backgroundSelect"),
  alignmentSelect: document.getElementById("alignmentSelect"),
  abilityList: document.getElementById("abilityList"),
  pointsRemaining: document.getElementById("pointsRemaining"),
  profBonus: document.getElementById("profBonus"),
  initiative: document.getElementById("initiative"),
  passivePerception: document.getElementById("passivePerception"),
  chosenSkillsCount: document.getElementById("chosenSkillsCount"),
  proficienciesBlock: document.getElementById("proficienciesBlock"),
  skillsGrid: document.getElementById("skillsGrid"),
  skillsHeader: document.getElementById("skillsHeader"),
  skillStatus: document.getElementById("skillStatus"),
  featuresBlock: document.getElementById("featuresBlock")
};

function formatModifier(n) {
  return n >= 0 ? `+${n}` : `${n}`;
}

function abilityMod(score) {
  return Math.floor((score - 10) / 2);
}

function proficiencyBonus(level) {
  return Math.floor((level - 1) / 4) + 2;
}

function getLevel() {
  const raw = parseInt(els.levelInput.value, 10);
  if (Number.isNaN(raw)) return 1;
  return Math.max(1, Math.min(20, raw));
}

function totalPointCost() {
  return Object.values(state.stats).reduce((sum, score) => sum + POINT_BUY_COST[score], 0);
}

function pointsRemaining() {
  return 27 - totalPointCost();
}

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

function fillSelect(selectEl, items, emptyText = null) {
  selectEl.innerHTML = "";

  if (!items.length && emptyText) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = emptyText;
    selectEl.appendChild(option);
    return;
  }

  items.forEach(item => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.name;
    selectEl.appendChild(option);
  });
}

function renderAbilityCards() {
  els.abilityList.innerHTML = "";

  ABILITIES.forEach(({ key, short, name }) => {
    const score = state.stats[key];
    const mod = abilityMod(score);
    const buyCost = POINT_BUY_COST[score];

    const card = document.createElement("div");
    card.className = "ability-card";
    card.innerHTML = `
      <div class="ability-name">${name}</div>
      <div class="ability-mod">${formatModifier(mod)}</div>
      <div class="ability-score-row">
        <input
          id="score-${key}"
          type="number"
          min="8"
          max="15"
          step="1"
          value="${score}"
          aria-label="${name} score"
        />
      </div>
      <div class="ability-buy">${short} cost: ${buyCost}</div>
    `;

    els.abilityList.appendChild(card);

    const input = card.querySelector(`#score-${key}`);
    input.addEventListener("change", (e) => handleAbilityInput(key, e.target.value));
  });
}

function handleAbilityInput(abilityKey, rawValue) {
  const oldScore = state.stats[abilityKey];
  let newScore = parseInt(rawValue, 10);

  if (Number.isNaN(newScore)) newScore = oldScore;
  newScore = Math.max(8, Math.min(15, newScore));

  const oldCost = POINT_BUY_COST[oldScore];
  const newCost = POINT_BUY_COST[newScore];
  const nextRemaining = pointsRemaining() - (newCost - oldCost);

  if (nextRemaining < 0) {
    rerenderAll();
    return;
  }

  state.stats[abilityKey] = newScore;
  rerenderAll();
}

function applyClassData() {
  const classId = els.classSelect.value;
  state.selectedClass = state.loadedClasses[classId] || null;

  const skillData = state.selectedClass?.proficiencies?.skills || { choose: 0, from: [] };
  state.classSkillChooseCount = skillData.choose || 0;
  state.classSkillOptions = skillData.from || [];

  state.selectedClassSkills.forEach(skill => {
    if (!state.classSkillOptions.includes(skill)) {
      state.selectedClassSkills.delete(skill);
    }
  });

  while (state.selectedClassSkills.size > state.classSkillChooseCount) {
    const first = state.selectedClassSkills.values().next().value;
    state.selectedClassSkills.delete(first);
  }
}

function titleCaseFromKey(value) {
  if (!value) return value;
  if (value.length <= 3) return value.toUpperCase();

  return value
    .split(/[\s-]+/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getActiveSubclassFeatures() {
  const currentLevel = getLevel();
  return (state.selectedSubclass?.features || []).filter(
    feature => typeof feature.level === "number" && feature.level <= currentLevel
  );
}

function getSubclassGrantedSkillProficiencies() {
  const granted = new Set();

  getActiveSubclassFeatures().forEach(feature => {
    const skills = feature.grants?.skillProficiencies || [];
    skills.forEach(skill => granted.add(skill));
  });

  return granted;
}

function getSkillSources(skillName) {
  const sources = [];

  if (state.selectedClassSkills.has(skillName)) {
    sources.push("class");
  }

  if (state.backgroundSkills.has(skillName)) {
    sources.push("background");
  }

  if (getSubclassGrantedSkillProficiencies().has(skillName)) {
    sources.push("subclass");
  }

  return sources;
}

function isSkillProficient(skillName) {
  return getSkillSources(skillName).length > 0;
}

function addMergedItems(map, groupName, items, source) {
  if (!items || !items.length) return;

  if (!map[groupName]) {
    map[groupName] = {};
  }

  items.forEach(item => {
    if (!map[groupName][item]) {
      map[groupName][item] = new Set();
    }
    map[groupName][item].add(source);
  });
}

function getMergedProficiencies() {
  const merged = {};
  const classProfs = state.selectedClass?.proficiencies || {};

  addMergedItems(merged, "Armor", classProfs.armor || [], "class");
  addMergedItems(merged, "Weapons", classProfs.weapons || [], "class");
  addMergedItems(merged, "Tools", classProfs.tools || [], "class");
  addMergedItems(merged, "Saving Throws", classProfs.savingThrows || [], "class");

  getActiveSubclassFeatures().forEach(feature => {
    const grants = feature.grants || {};

    addMergedItems(merged, "Armor", grants.armorProficiencies || [], "subclass");
    addMergedItems(merged, "Weapons", grants.weaponProficiencies || [], "subclass");
    addMergedItems(merged, "Tools", grants.toolProficiencies || [], "subclass");
    addMergedItems(merged, "Saving Throws", grants.savingThrowProficiencies || [], "subclass");
  });

  return merged;
}

function renderDerived() {
  const level = getLevel();
  const prof = proficiencyBonus(level);

  els.pointsRemaining.textContent = pointsRemaining();
  els.profBonus.textContent = formatModifier(prof);
  els.initiative.textContent = formatModifier(abilityMod(state.stats.dex));

  const passivePerception =
    10 +
    abilityMod(state.stats.wis) +
    (isSkillProficient("Perception") ? prof : 0);

  els.passivePerception.textContent = String(passivePerception);
  els.chosenSkillsCount.textContent =
    `${state.selectedClassSkills.size}/${state.classSkillChooseCount}`;
}

function renderProficiencies() {
  els.proficienciesBlock.innerHTML = "";
  const merged = getMergedProficiencies();
  const groupNames = Object.keys(merged);

  if (!groupNames.length) {
    els.proficienciesBlock.innerHTML = `<div class="small-note">No proficiencies loaded.</div>`;
    return;
  }

  groupNames.forEach(groupName => {
    const group = document.createElement("div");
    group.className = "proficiency-group";

    const title = document.createElement("h4");
    title.textContent = groupName;
    group.appendChild(title);

    const itemsWrap = document.createElement("div");
    itemsWrap.className = "proficiency-items";

    Object.entries(merged[groupName]).forEach(([itemName, sources]) => {
      const chip = document.createElement("div");
      chip.className = "proficiency-chip";

      const label = document.createElement("span");
      label.textContent = titleCaseFromKey(itemName);
      chip.appendChild(label);

      [...sources].forEach(source => {
        const tag = document.createElement("span");
        tag.className = `source-tag ${source}`;
        tag.textContent = source;
        chip.appendChild(tag);
      });

      itemsWrap.appendChild(chip);
    });

    group.appendChild(itemsWrap);
    els.proficienciesBlock.appendChild(group);
  });
}

function handleSkillToggle(skillName, checked) {
  if (!state.classSkillOptions.includes(skillName)) return;

  const lockedBySubclass = getSubclassGrantedSkillProficiencies().has(skillName);
  const lockedByBackground = state.backgroundSkills.has(skillName);

  if (lockedBySubclass || lockedByBackground) {
    rerenderAll();
    return;
  }

  if (checked) {
    if (state.selectedClassSkills.size >= state.classSkillChooseCount) {
      els.skillStatus.textContent =
        `You can only choose ${state.classSkillChooseCount} class skill${state.classSkillChooseCount === 1 ? "" : "s"}.`;
      rerenderAll();
      return;
    }
    state.selectedClassSkills.add(skillName);
  } else {
    state.selectedClassSkills.delete(skillName);
  }

  els.skillStatus.textContent = "";
  rerenderAll();
}

function renderSkills() {
  const prof = proficiencyBonus(getLevel());
  els.skillsGrid.innerHTML = "";

  const className = state.selectedClass?.name || "Class";
  const allowedText = state.classSkillOptions.length
    ? `${className}: choose ${state.classSkillChooseCount} from ${state.classSkillOptions.join(", ")}.`
    : `${className}: no skill choices found.`;

  els.skillsHeader.textContent = allowedText;

  SKILLS.forEach(skill => {
    const sources = getSkillSources(skill.name);
    const proficient = sources.length > 0;
    const classAllowed = state.classSkillOptions.includes(skill.name);
    const subclassGranted = sources.includes("subclass");
    const backgroundGranted = sources.includes("background");
    const isLocked = subclassGranted || backgroundGranted;
    const value = abilityMod(state.stats[skill.ability]) + (proficient ? prof : 0);

    const row = document.createElement("div");
    row.className = `skill-row ${!classAllowed && !proficient ? "disabled" : ""}`;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = proficient;
    checkbox.disabled = (!classAllowed && !proficient) || isLocked;
    checkbox.addEventListener("change", e => handleSkillToggle(skill.name, e.target.checked));

    const name = document.createElement("div");
    name.className = "skill-name";
    name.textContent = skill.name;

    const tagsWrap = document.createElement("div");
    tagsWrap.className = "skill-tags";

    sources.forEach(source => {
      const tag = document.createElement("span");
      tag.className = `source-tag ${source === "background" ? "class" : source}`;
      tag.textContent = source;
      tagsWrap.appendChild(tag);
    });

    if (sources.length === 0 && classAllowed) {
      const tag = document.createElement("span");
      tag.className = "source-tag class";
      tag.textContent = "class option";
      tagsWrap.appendChild(tag);
    }

    const ability = document.createElement("div");
    ability.className = "skill-ability";
    ability.textContent = skill.ability.toUpperCase();

    const mod = document.createElement("div");
    mod.className = "line-bubble";
    mod.textContent = formatModifier(value);

    row.appendChild(checkbox);
    row.appendChild(name);
    row.appendChild(tagsWrap);
    row.appendChild(ability);
    row.appendChild(mod);

    els.skillsGrid.appendChild(row);
  });
}

function getMergedFeatures() {
  const currentLevel = getLevel();
  const merged = [];

  (state.selectedClass?.features || []).forEach(feature => {
    let minLevel = null;

    if (typeof feature.level === "number") {
      minLevel = feature.level;
    } else if (Array.isArray(feature.levelGains) && feature.levelGains.length) {
      minLevel = Math.min(...feature.levelGains);
    }

    if (minLevel !== null && minLevel <= currentLevel) {
      merged.push({
        ...feature,
        sourceType: "class",
        sourceName: state.selectedClass?.name || "Class",
        displayLevel: minLevel
      });
    }
  });

  (state.selectedSubclass?.features || []).forEach(feature => {
    if (typeof feature.level === "number" && feature.level <= currentLevel) {
      merged.push({
        ...feature,
        sourceType: "subclass",
        sourceName: state.selectedSubclass?.name || "Subclass",
        displayLevel: feature.level
      });
    }
  });

  merged.sort((a, b) => {
    if (a.displayLevel !== b.displayLevel) return a.displayLevel - b.displayLevel;
    return a.name.localeCompare(b.name);
  });

  return merged;
}

function renderFeatures() {
  els.featuresBlock.innerHTML = "";

  const features = getMergedFeatures();

  if (!features.length) {
    els.featuresBlock.innerHTML = `<div class="small-note">No features available at this level.</div>`;
    return;
  }

  features.forEach(feature => {
    const card = document.createElement("div");
    card.className = "feature-card";

    const tag = `<span class="source-tag ${feature.sourceType}">${feature.sourceType}</span>`;

    const levelText =
      typeof feature.level === "number"
        ? `Level ${feature.level}`
        : `Levels ${feature.levelGains.join(", ")}`;

    card.innerHTML = `
      <h4>${feature.name}</h4>
      <div class="feature-meta">${levelText} • ${feature.category || "feature"} ${tag}</div>
      <p>${feature.summary || ""}</p>
    `;

    els.featuresBlock.appendChild(card);
  });
}

function loadBackgroundPlaceholder() {
  fillSelect(els.backgroundSelect, [], "No backgrounds loaded yet");
  els.backgroundSelect.disabled = true;
}

async function loadAllClasses() {
  const classIndex = await fetchJson(CLASS_INDEX_PATH);

  const loaded = await Promise.all(
    classIndex.map(async entry => {
      const data = await fetchJson(entry.path);
      return data;
    })
  );

  loaded.forEach(cls => {
    state.loadedClasses[cls.id] = cls;
  });

  state.classList = loaded.map(cls => ({
    id: cls.id,
    name: cls.name
  }));
}

async function loadSubclassesForClass(classId) {
  const subclassIndexPath = `${SUBCLASS_INDEX_BASE}/${classId}/index.json`;

  try {
    const subclassIndex = await fetchJson(subclassIndexPath);

    const loaded = await Promise.all(
      subclassIndex.map(async entry => {
        const data = await fetchJson(entry.path);
        return data;
      })
    );

    state.loadedSubclasses[classId] = loaded;

    return loaded.map(sub => ({
      id: sub.id,
      name: sub.name
    }));
  } catch (err) {
    state.loadedSubclasses[classId] = [];
    return [];
  }
}

async function refreshClass() {
  document.body.classList.add("loading");
  els.skillStatus.textContent = "";

  try {
    applyClassData();

    const classId = els.classSelect.value;
    const subclassOptions = await loadSubclassesForClass(classId);
    fillSelect(els.subclassSelect, subclassOptions, "No subclasses found");

    const selectedSubclassId = els.subclassSelect.value;
    state.selectedSubclass =
      (state.loadedSubclasses[classId] || []).find(sub => sub.id === selectedSubclassId) || null;

    rerenderAll();
  } catch (err) {
    console.error(err);
    els.skillStatus.textContent = "Could not load class data.";
  } finally {
    document.body.classList.remove("loading");
  }
}

function refreshSubclass() {
  const classId = els.classSelect.value;
  const subclassId = els.subclassSelect.value;
  state.selectedSubclass =
    (state.loadedSubclasses[classId] || []).find(sub => sub.id === subclassId) || null;

  rerenderAll();
}

function rerenderAll() {
  renderAbilityCards();
  renderDerived();
  renderProficiencies();
  renderSkills();
  renderFeatures();
}

async function init() {
  renderAbilityCards();
  renderDerived();
  renderProficiencies();
  renderSkills();
  renderFeatures();
  loadBackgroundPlaceholder();

  els.levelInput.addEventListener("input", () => {
    els.levelInput.value = getLevel();
    rerenderAll();
  });

  els.classSelect.addEventListener("change", refreshClass);
  els.subclassSelect.addEventListener("change", refreshSubclass);

  try {
    document.body.classList.add("loading");

    await loadAllClasses();
    fillSelect(els.classSelect, state.classList, "No classes loaded");

    if (!state.classList.length) {
      els.skillStatus.textContent = "No class JSON files are registered in index.json.";
      return;
    }

    await refreshClass();
  } catch (err) {
    console.error(err);
    els.skillStatus.textContent =
      "Initial local JSON load failed. Make sure the files exist and you're using Live Server.";
  } finally {
    document.body.classList.remove("loading");
  }
}

init();