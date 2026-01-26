export default function AccentScript() {
  const script = `
    (function() {
      try {
        var accent = localStorage.getItem('accent-index');
        if (accent && ['1','2','3','4'].includes(accent)) {
          document.documentElement.setAttribute('data-accent', accent);
        }
      } catch (e) {}
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
