import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  SCENARIOS,
  getScenario,
  setScenario,
  type Scenario,
} from "../mocks/scenarios";
import { resetDb } from "../mocks/db";

function clearScenarioFromUrl() {
  const url = new URL(location.href);
  url.searchParams.delete("scenario");
  history.replaceState(null, "", url);
}

export function DebugPanel() {
  const qc = useQueryClient();
  const [value, setValue] = useState<Scenario>(getScenario());

  return (
    <fieldset className="debug">
      <legend>Network scenario (debug)</legend>
      <label htmlFor="scenario">Scenario</label>
      <select
        id="scenario"
        value={value}
        onChange={(e) => {
          const s = e.target.value as Scenario;
          clearScenarioFromUrl();
          setScenario(s);
          setValue(s);
          void qc.invalidateQueries(); // refetch the visible tab under the new scenario
        }}
      >
        {SCENARIOS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      {/* Restores the initial server state. The local pending queue is kept on purpose,
          so you can still test "pending record recovery" after a reset. */}
      <button
        type="button"
        onClick={() => {
          resetDb();
          setScenario("success");
          clearScenarioFromUrl();
          qc.clear();
          location.reload();
        }}
      >
        Reset mock data
      </button>
    </fieldset>
  );
}
