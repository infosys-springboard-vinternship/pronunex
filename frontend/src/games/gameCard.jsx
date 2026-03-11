import { useState } from "react";

export default function GameCard({ level, onNext }) {
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState("");

  const checkAnswer = (option) => {
    setSelected(option);
    if (option === level.phoneme) {
      setResult("correct");
      setTimeout(onNext, 800);
    } else {
      setResult("wrong");
    }
  };

  return (
    <div className="bg-white shadow-xl rounded-2xl p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-2">{level.word}</h2>

      <audio controls className="mb-4 w-full">
        <source src={level.audio} type="audio/mpeg" />
      </audio>

      <div className="grid grid-cols-3 gap-3">
        {level.options.map((option) => (
          <button
            key={option}
            onClick={() => checkAnswer(option)}
            className="border rounded-xl py-2 hover:bg-primary-100 transition"
          >
            {option}
          </button>
        ))}
      </div>

      {result === "correct" && (
        <p className="text-success-600 mt-4 font-semibold">Correct! 🎉</p>
      )}
      {result === "wrong" && (
        <p className="text-error-600 mt-4">Try again ❌</p>
      )}
    </div>
  );
}
