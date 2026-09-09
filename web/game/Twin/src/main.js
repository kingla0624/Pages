import { GoldenScene } from "./scene.js";
import { BrainRouter } from "./brain.js";
import { GoldenStateStore, formatTimestamp } from "./state.js";

const ui = {
  providerBadge: document.querySelector("#providerBadge"),
  taskBadge: document.querySelector("#taskBadge"),
  locationBadge: document.querySelector("#locationBadge"),
  moodLabel: document.querySelector("#moodLabel"),
  actionLabel: document.querySelector("#actionLabel"),
  providerSelect: document.querySelector("#providerSelect"),
  externalConfig: document.querySelector("#externalConfig"),
  baseUrlInput: document.querySelector("#baseUrlInput"),
  modelInput: document.querySelector("#modelInput"),
  apiKeyInput: document.querySelector("#apiKeyInput"),
  chatForm: document.querySelector("#chatForm"),
  chatInput: document.querySelector("#chatInput"),
  voiceBtn: document.querySelector("#voiceBtn"),
  cameraBtn: document.querySelector("#cameraBtn"),
  cameraPreview: document.querySelector("#cameraPreview"),
  cameraStatus: document.querySelector("#cameraStatus"),
  visionSummary: document.querySelector("#visionSummary"),
  visionCanvas: document.querySelector("#visionCanvas"),
  routeLabel: document.querySelector("#routeLabel"),
  constraintLabel: document.querySelector("#constraintLabel"),
  replyText: document.querySelector("#replyText"),
  planText: document.querySelector("#planText"),
  bondMeter: document.querySelector("#bondMeter"),
  energyMeter: document.querySelector("#energyMeter"),
  joyMeter: document.querySelector("#joyMeter"),
  focusMeter: document.querySelector("#focusMeter"),
  bondValue: document.querySelector("#bondValue"),
  energyValue: document.querySelector("#energyValue"),
  joyValue: document.querySelector("#joyValue"),
  focusValue: document.querySelector("#focusValue"),
  treatValue: document.querySelector("#treatValue"),
  coinValue: document.querySelector("#coinValue"),
  emotionValue: document.querySelector("#emotionValue"),
  relationshipValue: document.querySelector("#relationshipValue"),
  ruleList: document.querySelector("#ruleList"),
  questText: document.querySelector("#questText"),
  memoryList: document.querySelector("#memoryList"),
  resetMemoryBtn: document.querySelector("#resetMemoryBtn"),
  focusBallBtn: document.querySelector("#focusBallBtn"),
  focusUserBtn: document.querySelector("#focusUserBtn"),
};

const store = new GoldenStateStore();
const router = new BrainRouter();
const scene = new GoldenScene(document.querySelector("#scene"));
const quickInputs = document.querySelectorAll("[data-quick-input]");

let mediaStream = null;
let recognition = null;
let lastFrame = null;
let visionTimer = null;
let lastVisualDecision = 0;

function meter(element, value) {
  element.style.width = `${value}%`;
}

function renderRules(rules) {
  ui.ruleList.innerHTML = rules.map((rule) => `<li>${rule}</li>`).join("");
}

function renderMemories(memory) {
  ui.memoryList.innerHTML = memory
    .map(
      (item) => `
        <article class="memory-item">
          <strong>
            <span>${item.title}</span>
            <span>${formatTimestamp(item.timestamp)}</span>
          </strong>
          <p>${item.detail}</p>
          <div class="tag-row">
            ${item.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}
          </div>
        </article>
      `
    )
    .join("");
}

function render() {
  const snapshot = store.snapshot();
  ui.providerBadge.textContent = snapshot.lastDecision.provider;
  ui.taskBadge.textContent = snapshot.activeTask.name;
  ui.locationBadge.textContent = snapshot.location;
  ui.moodLabel.textContent = snapshot.moodLabel;
  ui.actionLabel.textContent = snapshot.currentAction;
  ui.routeLabel.textContent = snapshot.lastDecision.route;
  ui.constraintLabel.textContent = snapshot.lastDecision.constraintStatus;
  ui.replyText.textContent = snapshot.lastDecision.reply;
  ui.planText.textContent = snapshot.lastDecision.plan;
  ui.cameraStatus.textContent = mediaStream ? "Camera online" : "Camera offline";
  ui.visionSummary.textContent = snapshot.perception.vision;
  ui.questText.textContent = snapshot.activeTask.description;
  ui.bondValue.textContent = snapshot.bond;
  ui.energyValue.textContent = snapshot.energy;
  ui.joyValue.textContent = snapshot.joy;
  ui.focusValue.textContent = snapshot.focus;
  ui.treatValue.textContent = snapshot.treats;
  ui.coinValue.textContent = snapshot.coins;
  ui.emotionValue.textContent = snapshot.emotionLabel;
  ui.relationshipValue.textContent = snapshot.relationshipLabel;
  meter(ui.bondMeter, snapshot.bond);
  meter(ui.energyMeter, snapshot.energy);
  meter(ui.joyMeter, snapshot.joy);
  meter(ui.focusMeter, snapshot.focus);
  renderRules(snapshot.rules);
  renderMemories(snapshot.memory);
  scene.setMood(snapshot);
}

function providerConfig() {
  return {
    baseUrl: ui.baseUrlInput.value.trim(),
    model: ui.modelInput.value.trim(),
    apiKey: ui.apiKeyInput.value.trim(),
  };
}

function visualSummaryFromMetrics(metrics) {
  const light = metrics.brightness > 145 ? "bright daylight" : metrics.brightness > 105 ? "soft indoor light" : "low light";
  const motion = metrics.motion > 16 ? "strong movement in frame" : metrics.motion > 8 ? "gentle movement in frame" : "almost no movement";
  const tone = metrics.dominant === "red" ? "warm tones" : metrics.dominant === "green" ? "green tones" : "cool blue tones";
  return `${light}, ${motion}, ${tone}`;
}

async function handleInteraction(input, source = "text") {
  const trimmed = input.trim();
  if (!trimmed) {
    return;
  }

  store.updatePerception(source, trimmed, { remember: source !== "vision" });
  const snapshot = store.snapshot();
  const decision = await router.decide({
    snapshot,
    latestInput: trimmed,
    provider: ui.providerSelect.value,
    providerConfig: providerConfig(),
    visualSignal: snapshot.perception.vision,
  });
  store.applyDecision(decision);
  scene.runActions(decision.actions, decision.focusTarget);
  speak(decision.reply);
  render();
}

function speak(text) {
  if (!("speechSynthesis" in window)) {
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.04;
  utterance.pitch = 1.15;
  utterance.volume = 0.82;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function setupSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    ui.voiceBtn.disabled = true;
    ui.voiceBtn.textContent = "Voice unsupported";
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.addEventListener("start", () => {
    ui.voiceBtn.textContent = "Listening...";
  });

  recognition.addEventListener("result", async (event) => {
    const transcript = event.results[0][0].transcript;
    ui.chatInput.value = transcript;
    await handleInteraction(transcript, "voice");
  });

  recognition.addEventListener("end", () => {
    ui.voiceBtn.textContent = "Voice input";
  });
}

function analyzeFrame() {
  if (!mediaStream) {
    return;
  }

  const context = ui.visionCanvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(ui.cameraPreview, 0, 0, ui.visionCanvas.width, ui.visionCanvas.height);
  const { data } = context.getImageData(0, 0, ui.visionCanvas.width, ui.visionCanvas.height);

  let brightness = 0;
  let red = 0;
  let green = 0;
  let blue = 0;
  let motion = 0;
  const currentFrame = [];

  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    brightness += avg;
    red += data[i];
    green += data[i + 1];
    blue += data[i + 2];
    currentFrame.push(avg);
    if (lastFrame) {
      motion += Math.abs(avg - lastFrame[currentFrame.length - 1]);
    }
  }

  const totalPixels = data.length / 4;
  brightness /= totalPixels;
  motion = lastFrame ? motion / totalPixels : 0;
  lastFrame = currentFrame;

  const dominant = red > green && red > blue ? "red" : green > blue ? "green" : "blue";
  const summary = visualSummaryFromMetrics({ brightness, motion, dominant });
  store.updatePerception("vision", summary, { remember: false });
  render();

  const now = Date.now();
  if (motion > 13 && now - lastVisualDecision > 12000) {
    lastVisualDecision = now;
    handleInteraction(`What do you notice? Camera sees ${summary}.`, "vision");
  }
}

async function toggleCamera() {
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
    mediaStream = null;
    clearInterval(visionTimer);
    visionTimer = null;
    ui.cameraPreview.srcObject = null;
    render();
    return;
  }

  mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  ui.cameraPreview.srcObject = mediaStream;
  await ui.cameraPreview.play();
  visionTimer = setInterval(analyzeFrame, 1800);
  render();
}

ui.chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await handleInteraction(ui.chatInput.value, "text");
  ui.chatInput.value = "";
});

ui.providerSelect.addEventListener("change", () => {
  const isExternal = ui.providerSelect.value !== "local";
  ui.externalConfig.classList.toggle("is-hidden", !isExternal);
  render();
});

ui.voiceBtn.addEventListener("click", () => {
  if (!recognition) {
    return;
  }
  recognition.start();
});

ui.cameraBtn.addEventListener("click", async () => {
  try {
    await toggleCamera();
  } catch (error) {
    console.warn("Camera unavailable.", error);
    store.updatePerception("vision", "Camera permission denied or unavailable");
    render();
  }
});

quickInputs.forEach((button) => {
  button.addEventListener("click", () => {
    ui.chatInput.value = button.dataset.quickInput;
  });
});

ui.resetMemoryBtn.addEventListener("click", () => {
  store.reset();
  render();
  scene.runActions(["scan", "wag"], "user");
});

ui.focusBallBtn.addEventListener("click", () => {
  scene.runActions(["playBow", "fetch"], "ball");
});

ui.focusUserBtn.addEventListener("click", () => {
  scene.runActions(["comeUser", "wag", "lookUser"], "user");
});

setupSpeechRecognition();
render();
