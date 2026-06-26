window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key.toLowerCase() === 'r') {
      e.preventDefault();
      window.location.reload();
    }
});
