const ROWS: Array<[string, string, string]> = [
  ["Move forward", "↑ or W", "▲ button"],
  ["Rotate left / right", "← → or A D", "⟲ ⟳ buttons"],
  ["Front shot (1 projectile)", "Space", "Fire front button"],
  ["Left broadside (3 projectiles)", "Q", "Fire left button"],
  ["Right broadside (3 projectiles)", "E", "Fire right button"],
  ["Pause", "Pause button / losing focus", "Pause button"],
];

export function ControlsPanel() {
  return (
    <section aria-labelledby="controls-title">
      <h2 id="controls-title">Controls</h2>
      <table>
        <thead>
          <tr>
            <th scope="col">Action</th>
            <th scope="col">Keyboard</th>
            <th scope="col">Touch</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map(([action, keys, touch]) => (
            <tr key={action}>
              <th scope="row">{action}</th>
              <td>{keys}</td>
              <td>{touch}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        You can move and shoot at the same time. Landscape orientation is
        recommended on mobile.
      </p>
    </section>
  );
}
