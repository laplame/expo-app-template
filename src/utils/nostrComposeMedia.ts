export type NostrComposeMediaItem = {
  kind: 'image' | 'video';
  url: string;
  mime?: string;
};

/** Arma `content` y etiquetas NIP-92 (`imeta`) para kind:1 con fotos o vídeos. */
export function buildNostrNoteFromMedia(
  text: string,
  media: NostrComposeMediaItem[]
): { content: string; tags: string[][] } {
  const parts: string[] = [];
  const trimmed = text.trim();
  if (trimmed) parts.push(trimmed);

  const tags: string[][] = [];

  for (const m of media) {
    const mime =
      m.mime ??
      (m.kind === 'video' ? 'video/mp4' : 'image/jpeg');
    tags.push(['imeta', `url ${m.url}`, `m ${mime}`]);
    if (m.kind === 'image') {
      parts.push(`![](${m.url})`);
    } else {
      parts.push(m.url);
    }
  }

  return {
    content: parts.join('\n\n').trim(),
    tags,
  };
}
