const BASE_URL = "https://www.bungie.net/Platform";
const STATS_URL = "https://stats.bungie.net/Platform";
const API_KEY = "323ae08f4acb4783af25753b99713058";
const RAID_MODE = 4;
const CHARACTERS_COMPONENT = 200;
const activityNameCache = new Map();
const itemNameCache = new Map();
const CLASS_NAMES = {
  0: "Titan",
  1: "Hunter",
  2: "Warlock",
};

const form = document.querySelector("#search-form");
const statusElement = document.querySelector("#status");
const summaryElement = document.querySelector("#summary");
const raidGrid = document.querySelector("#raid-grid");
const intro = document.querySelector("#intro");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const bungieName = new FormData(form).get("bungie_name").trim();

  setStatus(`Loading raid history for ${bungieName}...`);
  summaryElement.classList.add("hidden");
  raidGrid.replaceChildren();

  try {
    const data = await pullRaidHistory(bungieName);
    renderResults(data);
  } catch (error) {
    setStatus(error.message, true);
  }
});

const sharedSearchName = new URLSearchParams(window.location.search).get("bungie_name");
if (sharedSearchName) {
  form.elements.bungie_name.value = sharedSearchName;
  form.requestSubmit();
}

async function bungieRequest(path, options = {}) {
  const headers = {
    "X-API-Key": API_KEY,
    ...options.headers,
  };

  if (options.body) {
    headers["Content-Type"] = "application/json";
  }

  let response;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      response = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers,
      });
      break;
    } catch (error) {
      if (attempt === 3) {
        throw new Error(
          `Network request failed while loading Bungie data (${path}). `
          + "Check the browser Network tab for the blocked request."
        );
      }

      await wait(350 * attempt);
    }
  }

  const data = await response.json().catch(() => null);

  if (!response.ok || !data || data.ErrorCode !== 1) {
    if (data?.ErrorStatus === "OriginHeaderDoesNotMatchKey") {
      throw new Error(
        `This API key does not allow requests from ${window.location.origin}. `
        + "Add this exact origin to the Bungie application settings for the key."
      );
    }

    const message = data?.Message || `Bungie request failed (${response.status}).`;
    throw new Error(message);
  }

  return data.Response;
}

function wait(milliseconds) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function parseBungieName(bungieName) {
  const match = bungieName.match(/^(.+?)#(\d{4})$/);

  if (!match) {
    throw new Error("Enter a full Bungie name such as Pyro#0222.");
  }

  return { displayName: match[1].trim(), displayCode: Number(match[2]) };
}

async function findPlayer(bungieName) {
  const { displayName, displayCode } = parseBungieName(bungieName);

  for (let page = 0; page < 10; page += 1) {
    const response = await bungieRequest(`/User/Search/GlobalName/${page}/`, {
      method: "POST",
      body: JSON.stringify({ displayNamePrefix: displayName }),
    });

    const player = response.searchResults.find((result) => (
      result.bungieGlobalDisplayName.toLowerCase() === displayName.toLowerCase()
      && result.bungieGlobalDisplayNameCode === displayCode
    ));

    if (player) {
      const membership = chooseMembership(player.destinyMemberships || []);

      if (!membership) {
        throw new Error("That Bungie account has no public Destiny memberships.");
      }

      return {
        membershipType: membership.membershipType,
        membershipId: membership.membershipId,
        displayName: `${player.bungieGlobalDisplayName}#${String(displayCode).padStart(4, "0")}`,
      };
    }

    if (!response.hasMore) {
      break;
    }
  }

  throw new Error(`No player found for ${bungieName}.`);
}

function chooseMembership(memberships) {
  return memberships.find((membership) => (
    membership.crossSaveOverride
    && membership.crossSaveOverride === membership.membershipType
  )) || memberships[0];
}

async function getCharacters(player) {
  const profile = await bungieRequest(
    `/Destiny2/${player.membershipType}/Profile/${player.membershipId}/?components=${CHARACTERS_COMPONENT}`,
  );
  const characters = profile.characters?.data || {};
  const characterIds = Object.keys(characters);

  if (characterIds.length === 0) {
    throw new Error("No Destiny 2 characters found for this player.");
  }

  return characterIds.map((characterId) => ({
    characterId,
    className: CLASS_NAMES[characters[characterId].classType] || "Unknown class",
  }));
}

async function getRaidHistoryForCharacter(player, character) {
  const activities = [];

  for (let page = 0; page < 100; page += 1) {
    const result = await bungieRequest(
      `/Destiny2/${player.membershipType}/Account/${player.membershipId}`
        + `/Character/${character.characterId}/Stats/Activities/?mode=${RAID_MODE}&page=${page}&count=250`,
    );
    const pageActivities = result.activities || [];

    for (const activity of pageActivities) {
      const details = activity.activityDetails || {};
      activities.push({
        period: activity.period,
        activityHash: details.directorActivityHash || details.referenceId,
        instanceId: details.instanceId,
        characterId: character.characterId,
        className: character.className,
        completed: Number(getStatValue(activity, "completed")),
      });
    }

    if (pageActivities.length < 250) {
      break;
    }
  }

  return activities;
}

function getStatValue(activity, statName) {
  return activity.values?.[statName]?.basic?.value || 0;
}

async function getActivityName(activityHash) {
  if (!activityHash) {
    return "Unknown Raid Activity";
  }

  if (activityNameCache.has(activityHash)) {
    return activityNameCache.get(activityHash);
  }

  let name;
  try {
    const activity = await bungieRequest(
      `/Destiny2/Manifest/DestinyActivityDefinition/${activityHash}/`
    );
    name = activity.displayProperties?.name || `Raid Activity ${activityHash}`;
  } catch (error) {
    name = `Raid Activity ${activityHash}`;
  }

  activityNameCache.set(activityHash, name);
  return name;
}

async function getWeaponDetails(weaponHash) {
  if (itemNameCache.has(weaponHash)) {
    return itemNameCache.get(weaponHash);
  }

  const item = await bungieRequest(
    `/Destiny2/Manifest/DestinyInventoryItemDefinition/${weaponHash}/`
  );
  const details = {
    name: item.displayProperties?.name || `Weapon ${weaponHash}`,
    icon: item.displayProperties?.icon
      ? `https://www.bungie.net${item.displayProperties.icon}`
      : "",
  };
  itemNameCache.set(weaponHash, details);
  return details;
}

async function getCompletionWeapons(completion, player) {
  const response = await fetch(
    `${STATS_URL}/Destiny2/Stats/PostGameCarnageReport/${completion.instanceId}/`,
    { headers: { "X-API-Key": API_KEY } }
  );
  const data = await response.json().catch(() => null);
  if (!response.ok || !data || data.ErrorCode !== 1) {
    throw new Error(data?.Message || "Could not load the completion report.");
  }

  const report = data.Response;
  const entry = report.entries?.find((candidate) => (
    String(candidate.characterId) === String(completion.characterId)
  )) || report.entries?.find((candidate) => (
    String(candidate.player?.destinyUserInfo?.membershipId) === String(player.membershipId)
  ));
  const weaponStats = entry?.extended?.weapons || [];
  const weapons = [];

  for (const weapon of weaponStats) {
    try {
      weapons.push(await getWeaponDetails(weapon.referenceId));
    } catch (error) {
      weapons.push({ name: `Weapon ${weapon.referenceId}`, icon: "" });
    }
  }

  return weapons;
}

async function getLatestCompletedRaids(activities, player) {
  const completedActivities = activities.filter((activity) => activity.completed);
  const hashes = [...new Set(completedActivities.map((activity) => activity.activityHash))];
  for (const hash of hashes) {
    await getActivityName(hash);
  }

  const latestByRaid = new Map();

  for (const activity of completedActivities) {
    const variant = activityNameCache.get(activity.activityHash) || "Unknown Raid Activity";
    const name = variant.split(":", 1)[0].trim();
    const existing = latestByRaid.get(name);

    if (existing && (existing.period || "") >= (activity.period || "")) {
      continue;
    }

    latestByRaid.set(name, {
      name,
      variant,
      period: activity.period,
      displayPeriod: formatPeriod(activity.period),
      instanceId: activity.instanceId,
      characterId: activity.characterId,
      className: activity.className,
    });
  }

  const raids = [...latestByRaid.values()]
    .sort((left, right) => (right.period || "").localeCompare(left.period || ""));

  for (let index = 0; index < raids.length; index += 1) {
    const raid = raids[index];
    setStatus(`Loading loadouts (${index + 1}/${raids.length}): ${raid.name}...`);

    try {
      raid.weapons = await getCompletionWeapons(raid, player);
    } catch (error) {
      raid.weapons = [];
      raid.loadoutError = error.message;
    }
  }

  return raids;
}

async function pullRaidHistory(bungieName) {
  const player = await findPlayer(bungieName);
  const characters = await getCharacters(player);
  const activityLists = [];

  for (let index = 0; index < characters.length; index += 1) {
    setStatus(`Loading raid activities (${index + 1}/${characters.length})...`);
    activityLists.push(await getRaidHistoryForCharacter(player, characters[index]));
  }

  const activities = activityLists.flat();
  setStatus("Finding latest completed raids...");
  const raids = await getLatestCompletedRaids(activities, player);

  return {
    player: player.displayName,
    raids,
  };
}

function formatPeriod(period) {
  if (!period) {
    return "";
  }

  return period.replace("T", " ").slice(0, 16);
}

function setStatus(message, error = false) {
  statusElement.textContent = message;
  statusElement.classList.toggle("error", error);
}

function renderResults(data) {
  intro.classList.add("hidden");
  document.querySelector("#player-name").textContent = data.player;
  summaryElement.classList.remove("hidden");

  if (data.raids.length === 0) {
    setStatus("No raid activities were found for this account.");
    return;
  }

  setStatus("Showing the latest completed run for each raid.");
  const cards = document.createDocumentFragment();

  for (const raid of data.raids) {
    cards.appendChild(buildRaidCard(raid));
  }

  raidGrid.appendChild(cards);
}

function buildRaidCard(raid) {
  const card = document.createElement("article");
  card.className = "raid-card completed";

  const header = document.createElement("div");
  header.className = "raid-card-head";
  const title = document.createElement("h3");
  title.textContent = raid.name;
  const result = document.createElement("span");
  result.className = "result";
  result.textContent = raid.className;
  header.append(title, result);

  const activity = document.createElement("p");
  activity.className = "activity";
  activity.textContent = `Latest completion: ${raid.displayPeriod || "Unknown date"}`;
  const variants = document.createElement("p");
  variants.className = "variants";
  variants.textContent = raid.variant;

  const loadoutHeading = document.createElement("h4");
  loadoutHeading.textContent = "Weapons used";
  const weapons = document.createElement("div");
  weapons.className = "weapons";

  if (raid.weapons.length === 0) {
    const missing = document.createElement("p");
    missing.className = "missing-weapons";
    missing.textContent = raid.loadoutError
      || "No weapon usage data returned for this completion.";
    weapons.appendChild(missing);
  } else {
    for (const weapon of raid.weapons) {
      const row = document.createElement("div");
      row.className = "weapon";
      if (weapon.icon) {
        const icon = document.createElement("img");
        icon.src = weapon.icon;
        icon.alt = "";
        row.appendChild(icon);
      }
      const name = document.createElement("span");
      name.textContent = weapon.name;
      row.appendChild(name);
      weapons.appendChild(row);
    }
  }

  card.append(header, activity, variants, loadoutHeading, weapons);
  return card;
}
