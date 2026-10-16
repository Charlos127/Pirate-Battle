import { useState } from "react";
import { validateOptions, type Options } from "../game/core/config";

export function OptionsScreen({
  value,
  onSave,
  onBack,
}: {
  value: Options;
  onSave: (o: Options) => void;
  onBack: () => void;
}) {
  const [draft, setDraft] = useState({
    sessionSeconds: String(value.sessionSeconds),
    spawnSeconds: String(value.spawnSeconds),
  });
  const parsed = {
    sessionSeconds: Number(draft.sessionSeconds),
    spawnSeconds: Number(draft.spawnSeconds),
  };
  const errors = validateOptions(parsed);
  const invalid = Object.keys(errors).length > 0;

  return (
    <form
      className="menu panel"
      onSubmit={(e) => {
        e.preventDefault();
        if (!invalid) onSave(parsed);
      }}
    >
      <h1>Options</h1>
      <label htmlFor="session">Game session time (60–180 s)</label>
      <input
        id="session"
        inputMode="numeric"
        value={draft.sessionSeconds}
        aria-invalid={!!errors.sessionSeconds}
        aria-describedby="session-err"
        onChange={(e) =>
          setDraft((d) => ({ ...d, sessionSeconds: e.target.value }))
        }
      />
      <p id="session-err" role="alert">
        {errors.sessionSeconds}
      </p>

      <label htmlFor="spawn">Enemy spawn time (0.5–10 s)</label>
      <input
        id="spawn"
        inputMode="decimal"
        value={draft.spawnSeconds}
        aria-invalid={!!errors.spawnSeconds}
        aria-describedby="spawn-err"
        onChange={(e) =>
          setDraft((d) => ({ ...d, spawnSeconds: e.target.value }))
        }
      />
      <p id="spawn-err" role="alert">
        {errors.spawnSeconds}
      </p>

      <div className="menu-actions">
        <button type="submit" className="primary" disabled={invalid}>
          Save
        </button>
        <button type="button" onClick={onBack}>
          Back
        </button>
      </div>
    </form>
  );
}
