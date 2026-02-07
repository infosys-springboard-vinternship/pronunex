import PronunciationGame from "../games/PronunciationGame";

export default function Games() {
  return (
    <div className="min-h-screen bg-neutral-50 px-6 py-10">
      <h1 className="text-4xl font-bold text-center mb-8">
        🎮 Pronunex Learning Games
      </h1>

      <p className="text-center text-neutral-600 max-w-xl mx-auto mb-10">
        Improve your pronunciation through interactive challenges designed by
        speech experts. No pressure, just progress.
      </p>

      <PronunciationGame />
    </div>
  );
}
