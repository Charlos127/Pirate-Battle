import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { flushPending, queryClient } from "../api/hooks";
import { useAppStore } from "../store/appStore";
import { MainMenu } from "./MainMenu";
import { OptionsScreen } from "./Options";
import { GameScreen } from "./GameScreen";
import { ResultScreen } from "./ResultScreen";

export default function App() {
  const screen = useAppStore((s) => s.screen);
  const options = useAppStore((s) => s.options);
  const lastResult = useAppStore((s) => s.lastResult);
  const nonce = useAppStore((s) => s.matchNonce);
  const { go, setOptions, startMatch, finishMatch } = useAppStore.getState();

  useEffect(() => {
    void flushPending(queryClient);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {screen === "menu" && (
        <MainMenu onPlay={startMatch} onOptions={() => go("options")} />
      )}
      {screen === "options" && (
        <OptionsScreen
          value={options}
          onSave={setOptions}
          onBack={() => go("menu")}
        />
      )}
      {screen === "playing" && (
        <GameScreen
          key={nonce}
          options={options}
          onEnd={finishMatch}
          onExit={() => go("menu")}
        />
      )}
      {screen === "result" && lastResult && (
        <ResultScreen
          result={lastResult}
          onPlayAgain={startMatch}
          onMenu={() => go("menu")}
        />
      )}
    </QueryClientProvider>
  );
}
