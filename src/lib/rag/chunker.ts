export type TextChunk = {
  id: string;
  content: string;
  metadata: {
    source: string;
    region?: string;
    category?: string;
    synonyms?: string[];
    chunkIndex: number;
  };
};

export type ChunkOptions = {
  chunkSize?: number;
  overlap?: number;
  source?: string;
  region?: string;
  category?: string;
};

/**
 * Split text into overlapping chunks while preserving paragraph boundaries.
 */
export function chunkText(text: string, options: ChunkOptions = {}): TextChunk[] {
  const {
    chunkSize = 800,
    overlap = 0.15,
    source = "unknown",
    region,
    category,
  } = options;

  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: TextChunk[] = [];
  let buffer = "";
  let chunkIndex = 0;

  const flush = () => {
    if (!buffer.trim()) return;
    chunks.push({
      id: `${source}-chunk-${chunkIndex}`,
      content: buffer.trim(),
      metadata: { source, region, category, chunkIndex },
    });
    chunkIndex += 1;
    buffer = "";
  };

  for (const paragraph of paragraphs) {
    if ((buffer + "\n\n" + paragraph).length <= chunkSize) {
      buffer = buffer ? `${buffer}\n\n${paragraph}` : paragraph;
    } else {
      flush();
      if (paragraph.length <= chunkSize) {
        buffer = paragraph;
      } else {
        const overlapChars = Math.floor(chunkSize * overlap);
        let start = 0;
        while (start < paragraph.length) {
          const slice = paragraph.slice(start, start + chunkSize);
          chunks.push({
            id: `${source}-chunk-${chunkIndex}`,
            content: slice.trim(),
            metadata: { source, region, category, chunkIndex },
          });
          chunkIndex += 1;
          start += chunkSize - overlapChars;
        }
      }
    }
  }

  flush();
  return chunks;
}
