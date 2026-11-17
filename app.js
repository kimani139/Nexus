"use strict";

const greetingForm = document.querySelector("#greetingForm");
const greetingInput = document.querySelector("#greetingInput");
const nexusReply = document.querySelector("#nexusReply");
const inputHint = document.querySelector("#inputHint");
const micButton = document.querySelector("#micButton");
const greetingScene = document.querySelector("#greetingScene");
const initializationScene = document.querySelector("#initializationScene");
const entryScene = document.querySelector("#entryScene");
const cinematicImage = document.querySelector("#cinematicImage");
const cinematicBackdrop = document.querySelector("#cinematicBackdrop");
const imageMissing = document.querySelector("#imageMissing");
const screenReaderStatus = document.querySelector("#screenReaderStatus");

let greetingSubmitted = false;
let voiceRecognition = null;

function showScene(scene) {
  for (const candidate of [greetingScene, initializationScene, entryScene]) {
    const active = candidate === scene;
    candidate.classList.toggle("is-active", active);
    candidate.setAttribute("aria-hidden", String(!active));
  }
}

function setStatus(name, state, label, detail) {
  const row = document.querySelector(`[data-check="${name}"]`);
  if (!row) {
    throw new Error(`Unknown initialization check: ${name}`);
  }

  row.dataset.state = state;
  row.querySelector(".status-value").textContent = label;
  if (detail) {
    row.title = detail;
    row.setAttribute("aria-label", `${row.querySelector(".status-name").textContent}: ${label}. ${detail}`);
  }
}

async function checkBackend() {
  try {
    const response = await fetch("/api/system/status", {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    if (response.status === 404) {
      setStatus("backend", "not-configured", "NOT CONFIGURED", "The /api/system/status endpoint is not present.");
      return;
    }

    if (!response.ok) {
      setStatus("backend", "offline", "OFFLINE", `Status endpoint returned HTTP ${response.status}.`);
      return;
    }

    const payload = await response.json();
    if (payload?.status === "ok") {
      setStatus("backend", "available", "AVAILABLE", "The backend status endpoint returned status: ok.");
      return;
    }

    setStatus("backend", "offline", "OFFLINE", "The status endpoint did not return a verified status: ok response.");
  } catch (error) {
    const detail = error instanceof TypeError
      ? "The backend status endpoint could not be reached."
      : "The backend status response could not be verified.";
    setStatus("backend", "offline", "OFFLINE", detail);
  }
}

function initialize() {
  showScene(initializationScene);
  setStatus("interface", "available", "AVAILABLE", "The welcome interface is running in this browser.");
  setStatus("market", "not-configured", "NOT CONFIGURED", "No market-data provider is configured.");
  setStatus("ai", "not-configured", "NOT CONFIGURED", "No AI provider is configured.");
  setStatus("intelligence", "development", "DEVELOPMENT MODE", "The intelligence engine has not been implemented.");
  setStatus("risk", "development", "DEVELOPMENT MODE", "Risk Guardian has not been implemented; do not use this app to trade.");
  setStatus("trading", "development", "DEVELOPMENT MODE", "Trading is disabled; no execution engine is available.");
  void checkBackend();

  window.setTimeout(() => {
    showScene(entryScene);
    document.querySelector("#entryTitle").focus?.({ preventScroll: true });
    screenReaderStatus.textContent = "Welcome to NEXUS. The command centre is in development mode.";
  }, 7200);
}

function revealImage() {
  cinematicBackdrop.classList.add("has-image");
  imageMissing.hidden = true;
}

function reportMissingImage() {
  cinematicBackdrop.classList.remove("has-image");
  imageMissing.hidden = false;
}

cinematicImage.addEventListener("load", revealImage);
cinematicImage.addEventListener("error", reportMissingImage);

greetingForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (greetingSubmitted) {
    return;
  }

  const message = greetingInput.value.trim();
  if (message.toLocaleLowerCase() !== "hi") {
    inputHint.textContent = "SAY “HI” TO BEGIN · NO AI PROVIDER IS CONNECTED";
    greetingInput.focus();
    return;
  }

  greetingSubmitted = true;
  greetingInput.value = "";
  greetingInput.disabled = true;
  micButton.disabled = true;
  nexusReply.hidden = false;
  nexusReply.textContent = "BROOO! LET'S KICK SOME ASS! 🔥";
  screenReaderStatus.textContent = "NEXUS says: Brooo! Let's kick some ass!";
  greetingForm.setAttribute("aria-label", "Greeting complete");

  window.setTimeout(initialize, 1900);
});

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SpeechRecognition) {
  micButton.addEventListener("click", () => {
    inputHint.textContent = "VOICE INPUT IS NOT SUPPORTED HERE · TYPE “HI” INSTEAD";
    greetingInput.focus();
  });
} else {
  voiceRecognition = new SpeechRecognition();
  voiceRecognition.lang = navigator.language || "en-US";
  voiceRecognition.interimResults = false;
  voiceRecognition.maxAlternatives = 1;

  voiceRecognition.addEventListener("start", () => {
    micButton.classList.add("is-listening");
    micButton.setAttribute("aria-label", "Listening for voice input");
    inputHint.textContent = "LISTENING · SAY “HI”";
  });
  voiceRecognition.addEventListener("result", (event) => {
    greetingInput.value = event.results[0][0].transcript;
    greetingInput.focus();
  });
  voiceRecognition.addEventListener("error", (event) => {
    inputHint.textContent = event.error === "not-allowed"
      ? "MICROPHONE ACCESS DENIED · TYPE “HI” INSTEAD"
      : "VOICE INPUT UNAVAILABLE · TYPE “HI” INSTEAD";
  });
  voiceRecognition.addEventListener("end", () => {
    micButton.classList.remove("is-listening");
    micButton.setAttribute("aria-label", "Use voice input");
  });

  micButton.addEventListener("click", () => {
    if (greetingSubmitted) {
      return;
    }
    try {
      voiceRecognition.start();
    } catch (error) {
      inputHint.textContent = error instanceof DOMException && error.name === "InvalidStateError"
        ? "VOICE INPUT IS ALREADY LISTENING"
        : "VOICE INPUT COULD NOT START · TYPE “HI” INSTEAD";
    }
  });
}
