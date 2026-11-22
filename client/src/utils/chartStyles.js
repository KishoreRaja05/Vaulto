// Shared axis / grid styling that reads correctly in both themes via CSS variables.
export const AXIS_PROPS = {
  tick: { fill: 'var(--vl-muted)', fontSize: 11 },
  axisLine: false,
  tickLine: false,
}
export const GRID_PROPS = { stroke: 'var(--vl-grid)', strokeDasharray: '3 3', vertical: false }
