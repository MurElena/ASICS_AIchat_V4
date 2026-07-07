export function AiSneakersAnimation() {
  return (
    <div className="ai-sneakers-scene" role="status" aria-live="polite" aria-label="Generating content">
      <div className="ai-sneakers-gif-wrap" aria-hidden>
        <img
          src="/sneakrun.png"
          alt=""
          className="ai-sneakers-gif"
          width={320}
          height={160}
        />
      </div>
      <p className="ai-sneakers-label">Generating your content…</p>
      <p className="ai-sneakers-sublabel">ASICS Copy studio is crafting your output</p>
    </div>
  );
}
