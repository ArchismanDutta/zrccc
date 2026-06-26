// ShortcutsHelp.jsx — shown when the user presses ?
import Modal from './Modal'

const SECTIONS = [
  {
    heading: 'Navigation',
    rows: [
      { keys: ['G', 'D'], desc: 'Go to Dashboard' },
      { keys: ['G', 'T'], desc: 'Go to Tasks' },
      { keys: ['G', 'P'], desc: 'Go to Projects' },
      { keys: ['G', 'C'], desc: 'Go to Clients' },
      { keys: ['G', 'F'], desc: 'Go to Finance' },
      { keys: ['G', 'M'], desc: 'Go to Messages' },
      { keys: ['G', 'R'], desc: 'Go to Reports' },
    ],
  },
  {
    heading: 'Actions',
    rows: [
      { keys: ['N'],        desc: 'New item (context-aware)' },
      { keys: ['⌘', 'K'],  desc: 'Global search' },
      { keys: ['?'],        desc: 'Show keyboard shortcuts' },
    ],
  },
]

function Key({ label }) {
  return (
    <kbd className="inline-flex items-center justify-center px-1.5 py-0.5 min-w-[22px] text-[10px] font-mono font-semibold text-fg bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-md leading-none">
      {label}
    </kbd>
  )
}

export function ShortcutsHelp({ open, onClose }) {
  return (
    <Modal isOpen={open} onClose={onClose} title="Keyboard Shortcuts" size="sm">
      <div className="space-y-5">
        {SECTIONS.map(section => (
          <div key={section.heading}>
            <p className="text-[10px] font-semibold text-fg-3 uppercase tracking-wider mb-2">
              {section.heading}
            </p>
            <div className="space-y-0.5">
              {section.rows.map(({ keys, desc }) => (
                <div key={desc} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-[var(--color-surface-2)] transition-colors">
                  <span className="text-xs text-fg-2">{desc}</span>
                  <div className="flex items-center gap-1 ml-4 flex-shrink-0">
                    {keys.map((k, i) => (
                      <span key={i} className="flex items-center gap-1">
                        <Key label={k} />
                        {i < keys.length - 1 && (
                          <span className="text-[9px] text-fg-3">then</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        <p className="text-[10px] text-fg-3 text-center pt-1">
          G-chord: press <Key label="G" /> then the letter within 0.8 s
        </p>
      </div>
    </Modal>
  )
}
