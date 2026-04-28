export default function ChatBubble({ msg }) {
  const me = msg.role === 'user'
  const time = msg.created_at
    ? new Date(msg.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
    : ''
  return (
    <div className={`flex flex-col ${me ? 'items-end' : 'items-start'} max-w-full`}>
      <div
        className={`max-w-[82%] px-4 py-2.5 text-[14px] leading-snug whitespace-pre-wrap break-words ${
          me
            ? 'bg-gradient-to-br from-[#ff7a4a] to-[#ffb37a] text-white rounded-3xl rounded-br-md shadow-[var(--shadow-pill)]'
            : 'bg-white/65 backdrop-blur text-[var(--color-ink)] rounded-3xl rounded-bl-md'
        }`}
      >
        {msg.content}
      </div>
      {time && <span className="font-mono text-[9px] tracking-wider opacity-50 px-2 mt-1">{time}</span>}
    </div>
  )
}
