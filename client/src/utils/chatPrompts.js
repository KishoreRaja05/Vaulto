// Suggested prompt chips per page for the floating assistant.
export const PAGE_LABELS = {
  dashboard: 'Dashboard',
  transactions: 'Transactions',
  analytics: 'Analytics',
  profile: 'Profile',
  learn: 'Learn',
  assistant: 'Assistant',
}

export const PAGE_PROMPTS = {
  dashboard: ['Summarize my month', 'Where am I overspending?', 'Will I overspend this month?'],
  transactions: ['Add an expense', 'Find my biggest purchases', 'Help me import a CSV'],
  analytics: ['Explain this chart', 'Why did spending go up?', 'How healthy is my savings rate?'],
  profile: ['How do I change my password?', 'How is my data used?'],
  learn: ['Explain budgeting basics', 'How do I start saving?'],
  default: ['Will I overspend this month?', 'How much did I spend on food?', 'Add 450 for dinner today'],
}

export const pageFromPath = (pathname) => {
  const seg = String(pathname || '').split('/')[1] || ''
  return seg === 'chat' ? 'assistant' : seg
}
