/** Emojis de temporada cayendo. Posiciones fijas para evitar diferencias de hidratación. */
export default function Decorations({ items }: { items: string[] }) {
  const flakes = Array.from({ length: 14 }, (_, i) => ({
    emoji: items[i % items.length],
    left: (i * 37) % 100,
    delay: (i * 1.7) % 12,
    duration: 12 + ((i * 5) % 10),
    size: 14 + ((i * 7) % 14),
  }));
  return (
    <div aria-hidden>
      {flakes.map((f, i) => (
        <span
          key={i}
          className="decoration"
          style={{ left: `${f.left}%`, animationDelay: `${f.delay}s`, animationDuration: `${f.duration}s`, fontSize: f.size }}
        >
          {f.emoji}
        </span>
      ))}
    </div>
  );
}
