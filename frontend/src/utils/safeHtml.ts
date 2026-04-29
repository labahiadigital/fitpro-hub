const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "ul",
  "ol",
  "li",
  "span",
  "a",
]);

const ALLOWED_ATTRS = new Set(["href", "target", "rel"]);

export function sanitizeHtml(input: string | null | undefined): string {
  if (!input) return "";
  if (typeof window === "undefined" || !window.DOMParser) {
    return input.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  }

  const doc = new DOMParser().parseFromString(input, "text/html");
  doc.body.querySelectorAll("*").forEach((el) => {
    const tag = el.tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) {
      el.replaceWith(...Array.from(el.childNodes));
      return;
    }
    Array.from(el.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = attr.value || "";
      if (!ALLOWED_ATTRS.has(name) || value.toLowerCase().startsWith("javascript:")) {
        el.removeAttribute(attr.name);
      }
    });
    if (tag === "a") {
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener noreferrer");
    }
  });
  return doc.body.innerHTML;
}
