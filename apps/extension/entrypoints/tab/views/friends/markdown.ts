// XSS-safe subset-markdown renderer for the profile card bio (ported from the
// Worker UI's client-script renderMd). HTML entities are escaped FIRST, so
// every tag introduced below is one we generate ourselves; user-supplied
// text can never inject markup.
export function renderMd(text: string | null | undefined): string {
  if (!text) return "";
  let s = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  s = s.replace(
    /\[([^\]]+)\]\((https:\/\/[^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
  );
  s = s.replace(/^### (.+)$/gm, '<strong style="font-size:13px">$1</strong>');
  s = s.replace(/^## (.+)$/gm, '<strong style="font-size:14px">$1</strong>');
  s = s.replace(/^# (.+)$/gm, '<strong style="font-size:15px">$1</strong>');
  s = s.replace(/^[-*] (.+)$/gm, "• $1");
  s = s.replace(/\n/g, "<br>");
  return s;
}
