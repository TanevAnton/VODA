const STORAGE_KEY = 'voda-mobile-webapp-state';
const FILTER_CAPACITY_LITERS = 120;
const DEFAULT_STATE = {
  bottleName: 'VODA Bottle',
  capacityMl: 620,
  currentVolumeMl: 420,
  batteryLevel: 64,
  waterTempC: 9,
  dailyGoalMl: 2400,
  intakeTodayMl: 1200,
  hydrationEntries: [
    { id: 'h1', amount: 330, kind: 'drink', timestamp: Date.now() - 1000 * 60 * 130 },
    { id: 'h2', amount: 500, kind: 'refill', timestamp: Date.now() - 1000 * 60 * 260 },
    { id: 'h3', amount: 250, kind: 'drink', timestamp: Date.now() - 1000 * 60 * 340 },
  ],
  uvHistory: [
    { id: 'u1', label: 'Morning sanitize', seconds: 90, timestamp: Date.now() - 1000 * 60 * 300 },
  ],
  uvScheduleHours: 4,
  autoSanitizeOnRefill: true,
  travelLock: false,
  silentMode: false,
  cycleInProgress: false,
  cycleTotalSeconds: 0,
  cycleRemainingSeconds: 0,
  cycleLabel: '',
  lastSanitizedAt: Date.now() - 1000 * 60 * 300,
  litersFiltered: 24.6,
  filterInstalledAt: Date.now() - 1000 * 60 * 60 * 24 * 18,
  qualityProfile: 'Home tap',
  filterNotes: '',
  temperatureUnit: 'C',
  language: 'English',
  notifications: true,
};

let state = loadState();
let toastTimer = null;
let cycleTimer = null;
let deferredPrompt = null;

function cloneDefaultState() {
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

const elements = {
  screens: document.querySelectorAll('.screen'),
  navButtons: document.querySelectorAll('.nav-button'),
  bottleNameHeading: document.getElementById('bottleNameHeading'),
  statusSummary: document.getElementById('statusSummary'),
  heroVolume: document.getElementById('heroVolume'),
  heroInsight: document.getElementById('heroInsight'),
  batteryStat: document.getElementById('batteryStat'),
  filterStat: document.getElementById('filterStat'),
  tempStat: document.getElementById('tempStat'),
  nextUvStat: document.getElementById('nextUvStat'),
  hydrationHeadline: document.getElementById('hydrationHeadline'),
  paceBadge: document.getElementById('paceBadge'),
  hydrationProgress: document.getElementById('hydrationProgress'),
  uvHeadline: document.getElementById('uvHeadline'),
  uvProgress: document.getElementById('uvProgress'),
  lastSanitize: document.getElementById('lastSanitize'),
  uvCount: document.getElementById('uvCount'),
  travelLockLabel: document.getElementById('travelLockLabel'),
  remainingToday: document.getElementById('remainingToday'),
  currentVolumeStat: document.getElementById('currentVolumeStat'),
  hydrationHistory: document.getElementById('hydrationHistory'),
  uvHistory: document.getElementById('uvHistory'),
  filterLifeLabel: document.getElementById('filterLifeLabel'),
  litersFilteredLabel: document.getElementById('litersFilteredLabel'),
  filterAgeLabel: document.getElementById('filterAgeLabel'),
  qualityProfileLabel: document.getElementById('qualityProfileLabel'),
  goalInput: document.getElementById('goalInput'),
  customDrinkInput: document.getElementById('customDrinkInput'),
  scheduleInput: document.getElementById('scheduleInput'),
  autoSanitizeInput: document.getElementById('autoSanitizeInput'),
  travelLockInput: document.getElementById('travelLockInput'),
  silentModeInput: document.getElementById('silentModeInput'),
  qualityProfileInput: document.getElementById('qualityProfileInput'),
  filterNotesInput: document.getElementById('filterNotesInput'),
  bottleNameInput: document.getElementById('bottleNameInput'),
  capacityInput: document.getElementById('capacityInput'),
  temperatureUnitInput: document.getElementById('temperatureUnitInput'),
  languageInput: document.getElementById('languageInput'),
  notificationsInput: document.getElementById('notificationsInput'),
  installButton: document.getElementById('installButton'),
  toast: document.getElementById('toast'),
};

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return cloneDefaultState();
  }

  try {
    return { ...cloneDefaultState(), ...JSON.parse(saved) };
  } catch {
    return cloneDefaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatMl(value) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}L`;
  }

  return `${Math.round(value)} ml`;
}

function formatTemperature(tempC) {
  if (state.temperatureUnit === 'F') {
    return `${Math.round(tempC * 1.8 + 32)}°F`;
  }

  return `${tempC}°C`;
}

function formatRelativeTime(timestamp) {
  const diffMinutes = Math.max(1, Math.round((Date.now() - timestamp) / 60000));
  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  const hours = Math.round(diffMinutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  return `${Math.round(hours / 24)}d ago`;
}

function getFilterLifePct() {
  return Math.max(0, Math.round(100 - (state.litersFiltered / FILTER_CAPACITY_LITERS) * 100));
}

function getCycleCompletionPct() {
  if (!state.cycleInProgress || state.cycleTotalSeconds === 0) {
    return 0;
  }

  return Math.round(((state.cycleTotalSeconds - state.cycleRemainingSeconds) / state.cycleTotalSeconds) * 100);
}

function getNextUvLabel() {
  if (state.travelLock) {
    return 'Locked';
  }

  if (state.cycleInProgress) {
    return `${state.cycleRemainingSeconds}s left`;
  }

  return `In ${state.uvScheduleHours}h`;
}

function getPaceStatus() {
  const pct = Math.round((state.intakeTodayMl / state.dailyGoalMl) * 100);
  if (pct >= 100) {
    return { label: 'Goal reached', insight: 'Excellent hydration today.' };
  }

  if (pct >= 60) {
    return { label: 'On pace', insight: 'Keep taking steady sips through the day.' };
  }

  return { label: 'Behind', insight: 'Add a refill or drink to catch up.' };
}

function setScreen(target) {
  elements.screens.forEach((screen) => {
    screen.classList.toggle('active', screen.dataset.screen === target);
  });

  elements.navButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.target === target);
  });
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('visible');

  if (toastTimer) {
    window.clearTimeout(toastTimer);
  }

  toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove('visible');
  }, 2600);
}

function logHydration(amount, kind = 'drink') {
  if (kind === 'drink' && state.currentVolumeMl <= 0) {
    showToast('Bottle is empty. Refill before logging another drink.');
    return;
  }

  const appliedAmount = kind === 'drink' ? Math.min(amount, state.currentVolumeMl) : amount;

  if (kind === 'drink') {
    state.intakeTodayMl += appliedAmount;
    state.currentVolumeMl = Math.max(0, state.currentVolumeMl - appliedAmount);
  } else {
    const nextVolume = Math.min(state.capacityMl, state.currentVolumeMl + appliedAmount);
    const actualRefill = nextVolume - state.currentVolumeMl;
    if (actualRefill <= 0) {
      showToast('Bottle is already full.');
      return;
    }
    state.currentVolumeMl = nextVolume;
    state.litersFiltered = Number((state.litersFiltered + actualRefill / 1000).toFixed(1));
  }

  state.hydrationEntries.unshift({
    id: crypto.randomUUID(),
    amount: appliedAmount,
    kind,
    timestamp: Date.now(),
  });

  if (kind === 'refill' && state.autoSanitizeOnRefill) {
    startUvCycle(90, 'Auto sanitize after refill');
  }

  saveState();
  render();
  showToast(kind === 'drink' ? `Logged ${formatMl(appliedAmount)} intake.` : `Refilled ${formatMl(appliedAmount)}.`);
}

function startUvCycle(seconds, label = 'Manual UV sanitize') {
  if (state.travelLock) {
    showToast('Travel lock is enabled. Disable it to run UV cycles.');
    return;
  }

  if (state.cycleInProgress) {
    showToast('A UV cycle is already running.');
    return;
  }

  state.cycleInProgress = true;
  state.cycleTotalSeconds = seconds;
  state.cycleRemainingSeconds = seconds;
  state.cycleLabel = label;
  state.batteryLevel = Math.max(10, state.batteryLevel - 4);
  saveState();
  render();
  showToast(`${label} started.`);

  cycleTimer = window.setInterval(() => {
    state.cycleRemainingSeconds -= 1;

    if (state.cycleRemainingSeconds <= 0) {
      window.clearInterval(cycleTimer);
      cycleTimer = null;
      state.cycleInProgress = false;
      state.lastSanitizedAt = Date.now();
      state.uvHistory.unshift({
        id: crypto.randomUUID(),
        label,
        seconds,
        timestamp: Date.now(),
      });
      state.cycleRemainingSeconds = 0;
      state.cycleTotalSeconds = 0;
      state.cycleLabel = '';
      saveState();
      render();
      showToast('UV purification completed successfully.');
      return;
    }

    saveState();
    render();
  }, 1000);
}

function replaceFilter() {
  state.litersFiltered = 0;
  state.filterInstalledAt = Date.now();
  saveState();
  render();
  showToast('Filter replaced and lifecycle reset.');
}

function resetDay() {
  state.intakeTodayMl = 0;
  state.hydrationEntries = [];
  saveState();
  render();
  showToast('Today’s hydration log has been reset.');
}

function saveAutomation(event) {
  event.preventDefault();
  state.uvScheduleHours = Math.min(24, Math.max(1, Number(elements.scheduleInput.value) || 4));
  state.autoSanitizeOnRefill = elements.autoSanitizeInput.checked;
  state.travelLock = elements.travelLockInput.checked;
  state.silentMode = elements.silentModeInput.checked;
  saveState();
  render();
  showToast('Automation settings saved.');
}

function saveFilterSettings(event) {
  event.preventDefault();
  state.qualityProfile = elements.qualityProfileInput.value;
  state.filterNotes = elements.filterNotesInput.value.trim();
  saveState();
  render();
  showToast('Filter settings updated.');
}

function savePreferences(event) {
  event.preventDefault();
  state.bottleName = elements.bottleNameInput.value.trim() || DEFAULT_STATE.bottleName;
  state.capacityMl = Math.min(2000, Math.max(300, Number(elements.capacityInput.value) || DEFAULT_STATE.capacityMl));
  state.currentVolumeMl = Math.min(state.currentVolumeMl, state.capacityMl);
  state.temperatureUnit = elements.temperatureUnitInput.value;
  state.language = elements.languageInput.value;
  state.notifications = elements.notificationsInput.checked;
  saveState();
  render();
  showToast('Preferences saved to this device.');
}

function saveGoalAndDrink(event) {
  event.preventDefault();
  state.dailyGoalMl = Math.max(500, Number(elements.goalInput.value) || DEFAULT_STATE.dailyGoalMl);
  const customDrink = Number(elements.customDrinkInput.value) || 0;
  saveState();

  if (customDrink > 0) {
    logHydration(customDrink, 'drink');
    elements.customDrinkInput.value = '';
    return;
  }

  render();
  showToast('Hydration goal updated.');
}

function renderHistory(listElement, entries, formatter) {
  if (entries.length === 0) {
    listElement.innerHTML = '<li><div><h4>No activity yet</h4><p>Your new events will appear here.</p></div></li>';
    return;
  }

  listElement.innerHTML = entries
    .slice(0, 8)
    .map((entry) => formatter(entry))
    .join('');
}

function render() {
  const hydrationPct = Math.min(100, Math.round((state.intakeTodayMl / state.dailyGoalMl) * 100));
  const filterLife = getFilterLifePct();
  const filterAgeDays = Math.max(1, Math.round((Date.now() - state.filterInstalledAt) / (1000 * 60 * 60 * 24)));
  const pace = getPaceStatus();

  elements.bottleNameHeading.textContent = state.bottleName;
  elements.statusSummary.textContent = state.cycleInProgress
    ? `${state.cycleLabel} · ${state.cycleRemainingSeconds}s remaining`
    : `${state.notifications ? 'Reminders on' : 'Reminders off'} · Ready for purification`;
  elements.heroVolume.textContent = `${formatMl(state.currentVolumeMl)} available`;
  elements.heroInsight.textContent = pace.insight;
  elements.batteryStat.textContent = `${state.batteryLevel}%`;
  elements.filterStat.textContent = `${filterLife}%`;
  elements.tempStat.textContent = formatTemperature(state.waterTempC);
  elements.nextUvStat.textContent = getNextUvLabel();
  elements.hydrationHeadline.textContent = `${formatMl(state.intakeTodayMl)} of ${formatMl(state.dailyGoalMl)}`;
  elements.paceBadge.textContent = pace.label;
  elements.hydrationProgress.style.width = `${hydrationPct}%`;
  elements.uvHeadline.textContent = state.cycleInProgress
    ? `${state.cycleLabel} · ${state.cycleRemainingSeconds}s left`
    : 'No cycle running';
  elements.uvProgress.style.width = `${getCycleCompletionPct()}%`;
  elements.lastSanitize.textContent = formatRelativeTime(state.lastSanitizedAt);
  elements.uvCount.textContent = `${state.uvHistory.length} completed`;
  elements.travelLockLabel.textContent = state.travelLock ? 'On' : 'Off';
  elements.remainingToday.textContent = formatMl(Math.max(0, state.dailyGoalMl - state.intakeTodayMl));
  elements.currentVolumeStat.textContent = `${formatMl(state.currentVolumeMl)} / ${formatMl(state.capacityMl)}`;
  elements.filterLifeLabel.textContent = `${filterLife}%`;
  elements.litersFilteredLabel.textContent = `${state.litersFiltered.toFixed(1)} L`;
  elements.filterAgeLabel.textContent = `${filterAgeDays} days`;
  elements.qualityProfileLabel.textContent = state.qualityProfile;

  elements.goalInput.value = state.dailyGoalMl;
  elements.scheduleInput.value = state.uvScheduleHours;
  elements.autoSanitizeInput.checked = state.autoSanitizeOnRefill;
  elements.travelLockInput.checked = state.travelLock;
  elements.silentModeInput.checked = state.silentMode;
  elements.qualityProfileInput.value = state.qualityProfile;
  elements.filterNotesInput.value = state.filterNotes;
  elements.bottleNameInput.value = state.bottleName;
  elements.capacityInput.value = state.capacityMl;
  elements.temperatureUnitInput.value = state.temperatureUnit;
  elements.languageInput.value = state.language;
  elements.notificationsInput.checked = state.notifications;

  renderHistory(elements.hydrationHistory, state.hydrationEntries, (entry) => `
    <li>
      <div>
        <h4>${entry.kind === 'drink' ? 'Drink logged' : 'Bottle refilled'}</h4>
        <p>${formatRelativeTime(entry.timestamp)}</p>
      </div>
      <strong>${entry.kind === 'drink' ? '-' : '+'}${formatMl(entry.amount)}</strong>
    </li>
  `);

  renderHistory(elements.uvHistory, state.uvHistory, (entry) => `
    <li>
      <div>
        <h4>${entry.label}</h4>
        <p>${formatRelativeTime(entry.timestamp)}</p>
      </div>
      <strong>${entry.seconds}s</strong>
    </li>
  `);
}

function bindEvents() {
  elements.navButtons.forEach((button) => {
    button.addEventListener('click', () => setScreen(button.dataset.target));
  });

  document.getElementById('startUvButton').addEventListener('click', () => startUvCycle(90));
  document.getElementById('capSanitizeButton').addEventListener('click', () => startUvCycle(60, 'Cap sanitize'));
  document.getElementById('chargeButton').addEventListener('click', () => {
    state.batteryLevel = Math.min(100, state.batteryLevel + 10);
    saveState();
    render();
    showToast('Battery boosted by 10%.');
  });

  document.querySelectorAll('[data-drink]').forEach((button) => {
    button.addEventListener('click', () => logHydration(Number(button.dataset.drink), 'drink'));
  });

  document.querySelectorAll('[data-refill]').forEach((button) => {
    button.addEventListener('click', () => logHydration(Number(button.dataset.refill), 'refill'));
  });

  document.querySelectorAll('[data-cycle]').forEach((button) => {
    button.addEventListener('click', () => startUvCycle(Number(button.dataset.cycle), 'Manual UV sanitize'));
  });

  document.getElementById('goalForm').addEventListener('submit', saveGoalAndDrink);
  document.getElementById('scheduleForm').addEventListener('submit', saveAutomation);
  document.getElementById('filterForm').addEventListener('submit', saveFilterSettings);
  document.getElementById('settingsForm').addEventListener('submit', savePreferences);
  document.getElementById('replaceFilterButton').addEventListener('click', replaceFilter);
  document.getElementById('resetDayButton').addEventListener('click', resetDay);

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    elements.installButton.hidden = false;
  });

  elements.installButton.addEventListener('click', async () => {
    if (!deferredPrompt) {
      return;
    }

    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    elements.installButton.hidden = true;
  });
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {
      showToast('Offline support could not be enabled in this browser.');
    });
  }
}

bindEvents();
render();
registerServiceWorker();
