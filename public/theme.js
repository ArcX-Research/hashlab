try {
  document.documentElement.dataset.theme =
    localStorage.getItem('hashlab-theme') === 'light' ? 'light' : 'dark';
} catch {
  document.documentElement.dataset.theme = 'dark';
}
