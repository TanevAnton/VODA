const toast = document.getElementById('toast');
const toastTimeouts = { current: null };

const presetContent = {
  commute: {
    title: 'Commute mode active',
    description:
      'VODA will sanitize every 4 hours, send refill reminders after 450 ml, and reduce brightness while you are moving.',
  },
  office: {
    title: 'Office mode active',
    description:
      'Quiet nudges arrive during work blocks, bottle temperature is tracked all day, and UV cycles wait for desk breaks.',
  },
  travel: {
    title: 'Travel mode active',
    description:
      'Airplane lock prevents accidental UV triggers, battery saver stretches runtime, and refill alerts adapt to long transfers.',
  },
};

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('visible');

  if (toastTimeouts.current) {
    clearTimeout(toastTimeouts.current);
  }

  toastTimeouts.current = window.setTimeout(() => {
    toast.classList.remove('visible');
  }, 2800);
}

document.getElementById('uvCycleButton').addEventListener('click', () => {
  showToast('UV purification started · 90-second smart cycle enabled.');
});

document.getElementById('refillButton').addEventListener('click', () => {
  showToast('620 ml refill logged · hydration goal updated.');
});

document.getElementById('pairBottleButton').addEventListener('click', () => {
  showToast('Pairing flow opened · ready for Bluetooth onboarding.');
});

document.querySelectorAll('.preset').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.preset').forEach((preset) => preset.classList.remove('active'));
    button.classList.add('active');

    const selectedPreset = presetContent[button.dataset.preset];
    const details = document.getElementById('presetDetails');

    details.innerHTML = `
      <h3>${selectedPreset.title}</h3>
      <p>${selectedPreset.description}</p>
    `;

    showToast(`${selectedPreset.title.replace(' active', '')} configured.`);
  });
});
