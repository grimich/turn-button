(() => {
  const DEFAULT_MESSAGE = 'turn';
  const input = document.getElementById('message');
  const status = document.getElementById('status');
  chrome.storage.local.get({ message: DEFAULT_MESSAGE }, ({ message }) => {
    input.value = typeof message === 'string' && message.trim() ? message : DEFAULT_MESSAGE;
  });
  document.getElementById('save').addEventListener('click', () => {
    const message = input.value.trim() || DEFAULT_MESSAGE;
    input.value = message;
    chrome.storage.local.set({ message }, () => {
      status.textContent = 'Saved';
      setTimeout(() => { status.textContent = ''; }, 1800);
    });
  });
})();
