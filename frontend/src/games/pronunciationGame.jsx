import { useState } from "react";
import { gameLevels } from "./gameData";
import GameCard from "./GameCard";

export default function PronunciationGame() {
  const [levelIndex, setLevelIndex] = useState(0);
  const [score, setScore] = useState(0);

  const nextLevel = () => {
    setScore((s) => s + 10);
    setLevelIndex((i) => i + 1);
  };

  if (levelIndex >= gameLevels.length) {
    return (
      <div className="text-center mt-20">
        <h2 className="text-3xl font-bold">Game Completed 🏆</h2>
        <p className="mt-4 text-lg">Your Score: {score}</p>
      </div>
    );
  }

  return (
    <div className="mt-10">
      <p className="text-center mb-4 font-medium">Score: {score}</p>
      <GameCard level={gameLevels[levelIndex]} onNext={nextLevel} />
    </div>
  );
}
