export default function AccentScript() {
  const script = `
    (function() {
      try {
        var root = document.documentElement;
        var accents = ['1','2','3','4'];
        var accent = localStorage.getItem('accent-index');
        if (accent === null) {
          accent = sessionStorage.getItem('accent-session');
          if (accent === null) {
            accent = String(1 + Math.floor(Math.random() * 4));
            sessionStorage.setItem('accent-session', accent);
          }
        }
        if (accents.includes(accent)) root.setAttribute('data-accent', accent);
        else root.removeAttribute('data-accent');
      } catch (e) {}
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
