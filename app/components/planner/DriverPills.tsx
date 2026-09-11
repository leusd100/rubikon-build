import { ChevronDown } from 'lucide-react';

export type DriverView = { label: string; explanation: string };

/** What most affects the comparison; each driver opens its explanation. */
export function DriverPills({
  id,
  label,
  drivers,
  open,
  onToggle,
}: {
  id: string;
  label: string;
  drivers: readonly DriverView[];
  open: string | null;
  onToggle: (driver: string) => void;
}) {
  const active = drivers.find((driver) => driver.label === open);

  return (
    <div className="planner-drivers">
      <p>{label}</p>
      <ul>
        {drivers.map((driver) => (
          <li key={driver.label}>
            <button
              type="button"
              className={open === driver.label ? 'is-open' : undefined}
              aria-expanded={open === driver.label}
              aria-controls={id}
              onClick={() => onToggle(driver.label)}
            >
              {driver.label} <ChevronDown aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <div id={id} className="planner-driver-explanation" hidden={!active} aria-live="polite">
        {active && <><b>{active.label}</b><span>{active.explanation}</span></>}
      </div>
    </div>
  );
}
