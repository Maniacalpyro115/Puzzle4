import * as THREE from "three";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const MANIFEST_URL = "https://pub-a16924d33e624186b23a508f51d992f1.r2.dev/database/manifest.json";
const FORMSPREE_ENDPOINT = "https://formspree.io/f/xlgawnne";
const SUBMIT_LOCK_MS = 10000;

document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.getElementById("mini-grid");
  const status = document.getElementById("status");
  const classFilter = document.getElementById("class-filter");
  const raceFilter = document.getElementById("race-filter");

  const previewModal = document.getElementById("preview-modal");
  const modalBackdrop = document.getElementById("modal-backdrop");
  const closeModalBtn = document.getElementById("close-modal");
  const chooseMiniBtn = document.getElementById("choose-mini-btn");

  const modalTag = document.getElementById("modal-tag");
  const modalName = document.getElementById("modal-name");
  const modalMeta = document.getElementById("modal-meta");

  const selectedMiniText = document.getElementById("selected-mini-text");
  const submitSelectionBtn = document.getElementById("submit-selection");
  const submitterNameInput = document.getElementById("submitter-name");
  const submitMessage = document.getElementById("submit-message");

  const viewerContainer = document.getElementById("viewer-container");

  const requiredElements = {
    grid,
    status,
    classFilter,
    raceFilter,
    previewModal,
    modalBackdrop,
    closeModalBtn,
    chooseMiniBtn,
    modalTag,
    modalName,
    modalMeta,
    selectedMiniText,
    submitSelectionBtn,
    submitterNameInput,
    submitMessage,
    viewerContainer
  };

  const missing = Object.entries(requiredElements)
    .filter(([, el]) => !el)
    .map(([name]) => name);

  if (missing.length) {
    console.error("Missing required HTML elements:", missing);
    return;
  }

  let minis = [];
  let currentPreviewMini = null;
  let selectedMini = null;
  let submitLockedUntil = 0;

  let scene;
  let camera;
  let renderer;
  let controls;
  let loader;
  let currentMesh = null;
  let animationStarted = false;
  let lockInterval = null;

  function safeText(value, fallback = "") {
    return value !== undefined && value !== null && value !== "" ? String(value) : fallback;
  }

  function displayText(value, fallback = "") {
    return safeText(value, fallback).replaceAll("_", " ");
  }

  function escapeDisplayHtml(value, fallback = "") {
    return displayText(value, fallback)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function setSubmitMessage(message, type = "") {
    submitMessage.textContent = message;
    submitMessage.className = "submit-message";
    if (type) {
      submitMessage.classList.add(type);
    }
  }

  function updateSubmitButtonState() {
    const hasMini = !!selectedMini;
    const hasName = submitterNameInput.value.trim().length > 0;
    const isLocked = Date.now() < submitLockedUntil;

    submitSelectionBtn.disabled = !hasMini || !hasName || isLocked;
  }

  function startSubmitCooldown() {
    if (lockInterval) {
      clearInterval(lockInterval);
    }

    const tick = () => {
      const remaining = submitLockedUntil - Date.now();

      if (remaining <= 0) {
        clearInterval(lockInterval);
        lockInterval = null;
        submitSelectionBtn.textContent = "Send Selection";
        updateSubmitButtonState();
        return;
      }

      const secondsLeft = Math.ceil(remaining / 1000);
      submitSelectionBtn.textContent = `Wait ${secondsLeft}s`;
      submitSelectionBtn.disabled = true;
    };

    tick();
    lockInterval = setInterval(tick, 250);
  }

  function initViewer() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x16111f);

    camera = new THREE.PerspectiveCamera(
      45,
      viewerContainer.clientWidth / viewerContainer.clientHeight,
      0.1,
      5000
    );
    camera.position.set(0, 40, 120);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(viewerContainer.clientWidth, viewerContainer.clientHeight);
    viewerContainer.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = true;
    controls.minDistance = 5;
    controls.maxDistance = 2000;

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.8);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.2);
    directionalLight.position.set(80, 120, 100);
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xbda878, 0.9);
    fillLight.position.set(-60, 30, -40);
    scene.add(fillLight);

    loader = new STLLoader();

    startAnimation();
  }

  function startAnimation() {
    if (animationStarted) return;
    animationStarted = true;

    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }

    animate();
  }

  function clearCurrentMesh() {
    if (!currentMesh) return;

    scene.remove(currentMesh);
    currentMesh.geometry.dispose();
    currentMesh.material.dispose();
    currentMesh = null;
  }

  function frameMesh(mesh) {
    const box = new THREE.Box3().setFromObject(mesh);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const distance = maxDim * 2.2;

    camera.near = Math.max(0.1, maxDim / 100);
    camera.far = Math.max(5000, maxDim * 10);
    camera.updateProjectionMatrix();

    camera.position.set(center.x + distance * 0.45, center.y + distance * 0.25, center.z + distance);
    controls.target.copy(center);
    controls.minDistance = maxDim * 0.5;
    controls.maxDistance = maxDim * 8;
    controls.update();
  }

  function loadSTL(filePath) {
    status.textContent = "Loading 3D preview...";
    clearCurrentMesh();

    loader.load(
      filePath,
      (geometry) => {
        geometry.computeVertexNormals();
        geometry.center();

        const material = new THREE.MeshStandardMaterial({
          color: 0xcfb06a,
          metalness: 0.12,
          roughness: 0.72
        });

        currentMesh = new THREE.Mesh(geometry, material);
        currentMesh.rotation.x = -Math.PI / 2;
        scene.add(currentMesh);

        frameMesh(currentMesh);
        status.textContent = `Previewing ${displayText(currentPreviewMini?.name, "mini")}.`;
      },
      undefined,
      (error) => {
        console.error("Error loading STL:", error);
        status.textContent = "Could not load STL preview.";
      }
    );
  }

  function openModal() {
    previewModal.classList.remove("hidden");
    previewModal.setAttribute("aria-hidden", "false");
    setTimeout(() => handleResize(), 20);
  }

  function closeModal() {
    previewModal.classList.add("hidden");
    previewModal.setAttribute("aria-hidden", "true");
  }

  function updateSelectedMiniDisplay() {
    if (!selectedMini) {
      selectedMiniText.textContent = "No mini selected yet.";
      updateSubmitButtonState();
      return;
    }

    selectedMiniText.textContent = `${displayText(selectedMini.name)} — ${displayText(selectedMini.class)} / ${displayText(selectedMini.race)}`;
    updateSubmitButtonState();
  }

  function populateFilters(items) {
    const classes = [...new Set(items.map((m) => safeText(m.class)))].filter(Boolean).sort();
    const races = [...new Set(items.map((m) => safeText(m.race)))].filter(Boolean).sort();

    classFilter.innerHTML = `<option value="">All Classes</option>`;
    raceFilter.innerHTML = `<option value="">All Races</option>`;

    for (const c of classes) {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = displayText(c);
      classFilter.appendChild(opt);
    }

    for (const r of races) {
      const opt = document.createElement("option");
      opt.value = r;
      opt.textContent = displayText(r);
      raceFilter.appendChild(opt);
    }
  }

  function previewMini(mini) {
    currentPreviewMini = mini;

    modalTag.textContent = "Mini Preview";
    modalName.textContent = displayText(mini.name, "Unnamed Mini");
    modalMeta.textContent = `${displayText(mini.class, "Unknown Class")} • ${displayText(mini.race, "Unknown Race")}`;

    openModal();
    loadSTL(mini.file);
  }

  function selectMini(mini) {
    selectedMini = mini;
    updateSelectedMiniDisplay();
    closeModal();
    status.textContent = `Selected ${displayText(mini.name)}.`;
  }

  function renderCards(items) {
    grid.innerHTML = "";

    if (!items.length) {
      grid.innerHTML = `<p class="empty-state">No minis found for the current filters.</p>`;
      return;
    }

    for (const mini of items) {
      const card = document.createElement("article");
      card.className = "mini-card";

      card.innerHTML = `
        <div class="mini-card-top">
          <div class="mini-badge-row">
            <span class="mini-badge">${escapeDisplayHtml(mini.class, "Unknown Class")}</span>
            <span class="mini-badge">${escapeDisplayHtml(mini.race, "Unknown Race")}</span>
          </div>
          <h3>${escapeDisplayHtml(mini.name, "Unnamed Mini")}</h3>
        </div>
        <div class="mini-card-bottom">
          <button class="preview-btn" type="button">Preview</button>
          <button class="select-card-btn" type="button">Select</button>
        </div>
      `;

      const [previewBtn, selectBtn] = card.querySelectorAll("button");

      previewBtn.addEventListener("click", () => previewMini(mini));
      selectBtn.addEventListener("click", () => {
        selectedMini = mini;
        updateSelectedMiniDisplay();
        status.textContent = `Selected ${displayText(mini.name)}.`;
      });

      grid.appendChild(card);
    }
  }

  function applyFilters() {
    const selectedClass = classFilter.value;
    const selectedRace = raceFilter.value;

    const filtered = minis.filter((mini) => {
      const matchesClass = !selectedClass || mini.class === selectedClass;
      const matchesRace = !selectedRace || mini.race === selectedRace;
      return matchesClass && matchesRace;
    });

    renderCards(filtered);
    status.textContent = `Showing ${filtered.length} of ${minis.length} mini(s).`;
  }

  function handleResize() {
    if (!renderer || !camera) return;

    const width = viewerContainer.clientWidth;
    const height = viewerContainer.clientHeight;

    if (!width || !height) return;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  closeModalBtn.addEventListener("click", closeModal);
  modalBackdrop.addEventListener("click", closeModal);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !previewModal.classList.contains("hidden")) {
      closeModal();
    }
  });

  chooseMiniBtn.addEventListener("click", () => {
    if (currentPreviewMini) {
      selectMini(currentPreviewMini);
    }
  });

  submitterNameInput.addEventListener("input", () => {
    updateSubmitButtonState();
    if (submitMessage.classList.contains("error")) {
      setSubmitMessage("");
    }
  });

  submitSelectionBtn.addEventListener("click", async () => {
    const name = submitterNameInput.value.trim();

    if (!selectedMini) {
      setSubmitMessage("Pick a mini first.", "error");
      updateSubmitButtonState();
      return;
    }

    if (!name) {
      setSubmitMessage("Please enter your name.", "error");
      updateSubmitButtonState();
      return;
    }

    if (Date.now() < submitLockedUntil) {
      return;
    }

    submitSelectionBtn.disabled = true;
    setSubmitMessage("Sending selection...");

    try {
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          name,
          mini_name: displayText(selectedMini.name),
          mini_class: displayText(selectedMini.class),
          mini_race: displayText(selectedMini.race),
          mini_file: selectedMini.file
        })
      });

      if (!response.ok) {
        throw new Error(`Submit failed: ${response.status}`);
      }

      setSubmitMessage("Your selection was sent successfully.", "success");
      status.textContent = `Submitted ${displayText(selectedMini.name)} for ${name}.`;

      submitLockedUntil = Date.now() + SUBMIT_LOCK_MS;
      startSubmitCooldown();
    } catch (error) {
      console.error(error);
      setSubmitMessage("Could not send your selection. Please try again.", "error");
      updateSubmitButtonState();
    }
  });

  window.addEventListener("resize", handleResize);

  initViewer();

  try {
    status.textContent = "Loading minis...";

    const response = await fetch(MANIFEST_URL);
    if (!response.ok) {
      throw new Error(`Failed to load manifest: ${response.status}`);
    }

    const data = await response.json();
    minis = Array.isArray(data.minis) ? data.minis : [];

    populateFilters(minis);
    renderCards(minis);
    updateSelectedMiniDisplay();
    status.textContent = `Loaded ${minis.length} mini(s).`;

    classFilter.addEventListener("change", applyFilters);
    raceFilter.addEventListener("change", applyFilters);

    updateSubmitButtonState();
  } catch (err) {
    console.error(err);
    status.textContent = `Error: ${err.message}`;
  }
});