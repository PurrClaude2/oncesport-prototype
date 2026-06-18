import React, { useEffect, useRef, useState, useCallback } from 'react'

/* ---------- константы ---------- */
const TAGS = [
  { id: 'atk', label: 'Атака', color: 'var(--tag-atk)', raw: '#ff5c33' },
  { id: 'def', label: 'Оборона', color: 'var(--tag-def)', raw: '#3b82f6' },
  { id: 'vbr', label: 'Вброс', color: 'var(--tag-vbr)', raw: '#a855f7' },
  { id: 'oth', label: 'Другое', color: 'var(--tag-oth)', raw: '#64748b' },
]
const TOOLS = [
  { id: 'select', icon: '▣', name: 'V' },
  { id: 'arrow', icon: '↗', name: '1' },
  { id: 'ring', icon: '◯', name: '2' },
  { id: 'line', icon: '╱', name: '3' },
  { id: 'pen', icon: '✎', name: '4' },
]
const SPEEDS = [0.25, 0.5, 1, 2]
const fmt = (t) => {
  if (!isFinite(t)) return '00:00.0'
  const m = Math.floor(t / 60), s = Math.floor(t % 60), d = Math.floor((t * 10) % 10)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${d}`
}
const uid = () => Math.random().toString(36).slice(2, 9)

/* ---------- рисование аннотаций ---------- */
function drawAnn(ctx, a, W, H) {
  ctx.save()
  ctx.strokeStyle = a.color; ctx.fillStyle = a.color
  ctx.lineWidth = a.width; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  if (a.type === 'pen') {
    ctx.beginPath()
    a.pts.forEach((p, i) => { const x = p.x * W, y = p.y * H; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y) })
    ctx.stroke()
  } else {
    const ax = a.a.x * W, ay = a.a.y * H, bx = a.b.x * W, by = a.b.y * H
    if (a.type === 'line') {
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke()
    } else if (a.type === 'arrow') {
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke()
      const ang = Math.atan2(by - ay, bx - ax), hl = 10 + a.width * 2.2
      ctx.beginPath(); ctx.moveTo(bx, by)
      ctx.lineTo(bx - hl * Math.cos(ang - Math.PI / 7), by - hl * Math.sin(ang - Math.PI / 7))
      ctx.lineTo(bx - hl * Math.cos(ang + Math.PI / 7), by - hl * Math.sin(ang + Math.PI / 7))
      ctx.closePath(); ctx.fill()
    } else if (a.type === 'ring') {
      const cx = (ax + bx) / 2, cy = (ay + by) / 2
      const rx = Math.abs(bx - ax) / 2, ry = Math.abs(by - ay) / 2
      ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(rx, 6), Math.max(ry, 6), 0, 0, Math.PI * 2); ctx.stroke()
    }
  }
  ctx.restore()
}
function drawBrand(ctx, brand, W, H) {
  if (!brand.enabled) return
  const pad = Math.round(H * 0.02), fs = Math.round(H * 0.035)
  ctx.save()
  ctx.font = `800 ${fs}px Instrument Sans, Arial, sans-serif`
  const tw = ctx.measureText(brand.title || 'РАЗБОР').width
  const cw = Math.max(tw, ctx.measureText(brand.coach || '').width) + pad * 2.4
  const ch = fs * 2.4, x = pad * 1.5, y = H - ch - pad * 1.5
  ctx.fillStyle = 'rgba(10,12,16,0.82)'
  ctx.fillRect(x, y, cw, ch)
  ctx.fillStyle = '#ff5c33'; ctx.fillRect(x, y, Math.max(3, H * 0.005), ch)
  ctx.fillStyle = '#fff'; ctx.textBaseline = 'top'
  ctx.fillText(brand.title || 'РАЗБОР', x + pad * 1.4, y + pad * 0.7)
  ctx.font = `600 ${Math.round(fs * 0.55)}px Instrument Sans, Arial, sans-serif`
  ctx.fillStyle = '#8b94a3'
  ctx.fillText(brand.coach || '', x + pad * 1.4, y + pad * 0.9 + fs)
  ctx.restore()
}

/* ====================================================== APP */
export default function App() {
  const [view, setView] = useState('library')
  const [projects, setProjects] = useState(() => {
    try { return JSON.parse(localStorage.getItem('osp_projects') || '[]') } catch { return [] }
  })
  const [active, setActive] = useState(null)
  useEffect(() => { localStorage.setItem('osp_projects', JSON.stringify(projects)) }, [projects])

  const createProject = (name, team) => {
    const p = { id: uid(), name, team, created: Date.now(), fragCount: 0 }
    setProjects((s) => [p, ...s]); setActive(p); setView('editor')
  }
  const openProject = (p) => { setActive(p); setView('editor') }

  return view === 'library'
    ? <Library projects={projects} onCreate={createProject} onOpen={openProject}
        onDelete={(id) => setProjects((s) => s.filter((p) => p.id !== id))} />
    : <Editor project={active} onBack={() => setView('library')} />
}

/* ====================================================== LIBRARY */
function Library({ projects, onCreate, onOpen, onDelete }) {
  const [name, setName] = useState(''); const [team, setTeam] = useState(''); const [show, setShow] = useState(false)
  return (
    <div className="app">
      <div className="topbar">
        <div className="brand"><span className="slash">//</span> ONCESPORT <span className="sub">ВИДЕОРАЗБОР · ПРОТОТИП</span></div>
        <div className="spacer" />
        <button className="btn primary" onClick={() => setShow(true)}>+ Новый проект</button>
      </div>
      <div className="library">
        <h1>Проекты разбора</h1>
        <p className="lead">Каждый проект - команда или клиент со своим деревом фрагментов по тегам.</p>
        <div className="proj-grid">
          <div className="proj-card new" onClick={() => setShow(true)}>+ Создать проект</div>
          {projects.map((p) => (
            <div className="proj-card" key={p.id} onClick={() => onOpen(p)}>
              <h3>{p.name}</h3>
              <div className="meta">{p.team || 'без команды'} · {new Date(p.created).toLocaleDateString('ru-RU')}</div>
              <div className="chips">
                {TAGS.map((t) => <span key={t.id} className="dot" style={{ background: t.raw }} title={t.label} />)}
              </div>
              <button className="btn ghost sm" style={{ marginTop: 12, color: 'var(--muted2)' }}
                onClick={(e) => { e.stopPropagation(); onDelete(p.id) }}>удалить</button>
            </div>
          ))}
        </div>
      </div>
      {show && (
        <Modal onClose={() => setShow(false)} title="Новый проект"
          onSubmit={() => { if (name.trim()) { onCreate(name.trim(), team.trim()); setShow(false) } }}>
          <div className="field"><label>Название проекта</label>
            <input className="input" value={name} autoFocus onChange={(e) => setName(e.target.value)} placeholder="напр. ХК Спартак - матч 12.06" /></div>
          <div className="field"><label>Команда / клиент</label>
            <input className="input" value={team} onChange={(e) => setTeam(e.target.value)} placeholder="напр. Спартак U17" /></div>
        </Modal>
      )}
    </div>
  )
}

function Modal({ title, children, onClose, onSubmit }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={onClose}>
      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, padding: 22, width: 360 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 16px' }}>{title}</h3>
        {children}
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="btn ghost" onClick={onClose}>Отмена</button>
          <button className="btn primary" onClick={onSubmit}>Создать</button>
        </div>
      </div>
    </div>
  )
}

/* ====================================================== EDITOR */
function Editor({ project, onBack }) {
  const videoRef = useRef(null)
  const overlayRef = useRef(null)
  const fileRef = useRef(null)

  const [src, setSrc] = useState(null)
  const [tool, setTool] = useState('arrow')
  const [color, setColor] = useState('#ff5c33')
  const [width, setWidth] = useState(4)
  const [anns, setAnns] = useState([])
  const draft = useRef(null)

  const [dur, setDur] = useState(0)
  const [cur, setCur] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [muted, setMuted] = useState(false)

  const [inT, setInT] = useState(null)
  const [outT, setOutT] = useState(null)
  const [frags, setFrags] = useState([])
  const [comments, setComments] = useState([])
  const [tab, setTab] = useState('frags')
  const [brand, setBrand] = useState({ enabled: true, title: (project?.name || 'РАЗБОР'), coach: 'Тренер' })
  const [rec, setRec] = useState(false)
  const [cmtText, setCmtText] = useState('')

  /* ---- размер overlay под видео ---- */
  const syncCanvas = useCallback(() => {
    const v = videoRef.current, c = overlayRef.current
    if (!v || !c) return
    const r = v.getBoundingClientRect()
    if (r.width && r.height) { c.width = r.width; c.height = r.height; redraw() }
  }, [])

  const redraw = useCallback(() => {
    const c = overlayRef.current; if (!c) return
    const ctx = c.getContext('2d'); ctx.clearRect(0, 0, c.width, c.height)
    anns.forEach((a) => drawAnn(ctx, a, c.width, c.height))
    if (draft.current) drawAnn(ctx, draft.current, c.width, c.height)
  }, [anns])

  useEffect(() => { redraw() }, [anns, redraw])
  useEffect(() => {
    window.addEventListener('resize', syncCanvas)
    return () => window.removeEventListener('resize', syncCanvas)
  }, [syncCanvas])

  /* ---- загрузка файла ---- */
  const loadFile = (f) => {
    if (!f) return
    const url = URL.createObjectURL(f)
    setSrc(url); setAnns([]); setFrags([]); setComments([]); setInT(null); setOutT(null)
  }

  /* ---- видео-события ---- */
  const onLoaded = () => { const v = videoRef.current; setDur(v.duration); v.playbackRate = speed; v.muted = muted; setTimeout(syncCanvas, 50) }
  const onTime = () => setCur(videoRef.current.currentTime)

  const playPause = () => {
    const v = videoRef.current; if (!v || !src) return
    if (v.paused) { v.play(); setPlaying(true) } else { v.pause(); setPlaying(false) }
  }
  const step = (d) => { const v = videoRef.current; if (!v) return; v.pause(); setPlaying(false); v.currentTime = Math.min(dur, Math.max(0, v.currentTime + d)) }
  const seekRatio = (e) => {
    const v = videoRef.current; if (!v || !dur) return
    const r = e.currentTarget.getBoundingClientRect()
    v.currentTime = ((e.clientX - r.left) / r.width) * dur
  }
  const changeSpeed = (s) => { setSpeed(s); if (videoRef.current) videoRef.current.playbackRate = s }
  const toggleMute = () => { const m = !muted; setMuted(m); if (videoRef.current) videoRef.current.muted = m }

  /* ---- рисование ---- */
  const pos = (e) => {
    const c = overlayRef.current, r = c.getBoundingClientRect()
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }
  }
  const down = (e) => {
    if (tool === 'select' || !src) return
    const p = pos(e)
    draft.current = tool === 'pen'
      ? { id: uid(), type: 'pen', color, width, pts: [p] }
      : { id: uid(), type: tool, color, width, a: p, b: p }
  }
  const move = (e) => {
    if (!draft.current) return
    const p = pos(e)
    if (draft.current.type === 'pen') draft.current.pts.push(p)
    else draft.current.b = p
    redraw()
  }
  const up = () => {
    if (!draft.current) return
    const d = draft.current; draft.current = null
    const tiny = d.type !== 'pen' && Math.hypot((d.b.x - d.a.x), (d.b.y - d.a.y)) < 0.01
    if (!tiny) setAnns((s) => [...s, d]); else redraw()
  }
  const undo = () => setAnns((s) => s.slice(0, -1))
  const clearAnns = () => setAnns([])

  /* ---- фрагменты ---- */
  const markIn = () => setInT(cur)
  const markOut = () => setOutT(cur)
  const addFragment = (tagId) => {
    const a = inT ?? 0, b = outT ?? Math.min(dur, a + 5)
    if (b <= a) return
    const tag = TAGS.find((t) => t.id === tagId)
    setFrags((s) => [...s, { id: uid(), in: a, out: b, tag: tagId, name: `${tag.label} ${fmt(a)}`, anns: [...anns] }])
    setInT(null); setOutT(null)
  }
  const gotoFrag = (f) => { const v = videoRef.current; if (v) { v.currentTime = f.in; setInT(f.in); setOutT(f.out) } }

  /* ---- комментарии ---- */
  const addComment = () => { if (!cmtText.trim()) return; setComments((s) => [...s, { id: uid(), t: cur, text: cmtText.trim() }].sort((x, y) => x.t - y.t)); setCmtText('') }

  /* ---- горячие клавиши ---- */
  useEffect(() => {
    const h = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return
      const k = e.key.toLowerCase()
      if (k === ' ') { e.preventDefault(); playPause() }
      else if (k === 'v') setTool('select')
      else if (k === '1') setTool('arrow')
      else if (k === '2') setTool('ring')
      else if (k === '3') setTool('line')
      else if (k === '4') setTool('pen')
      else if (k === 'i') markIn()
      else if (k === 'o') markOut()
      else if (e.key === 'ArrowLeft') step(-1 / 30)
      else if (e.key === 'ArrowRight') step(1 / 30)
      else if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); undo() }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [cur, dur, src, playing, anns])

  /* ---- экспорт (реальная запись canvas + аудио) ---- */
  const exportRange = async (start, end, exportAnns) => {
    const v = videoRef.current; if (!v || !src) return
    const W = v.videoWidth, H = v.videoHeight
    const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H
    const ctx = canvas.getContext('2d')
    const useAnns = exportAnns || anns
    setRec(true); v.pause(); v.muted = true
    await new Promise((res) => { v.onseeked = () => { v.onseeked = null; res() }; v.currentTime = start })

    const cstream = canvas.captureStream(30)
    const tracks = [...cstream.getVideoTracks()]
    try { if (!muted && v.captureStream) { const a = v.captureStream().getAudioTracks(); if (a[0]) tracks.push(a[0]) } } catch {}
    const stream = new MediaStream(tracks)
    const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
      .find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || 'video/webm'
    const mr = new MediaRecorder(stream, { mimeType: mime })
    const chunks = []
    mr.ondataavailable = (e) => e.data.size && chunks.push(e.data)
    mr.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${(project?.name || 'razbor').replace(/\s+/g, '_')}_${Math.round(start)}-${Math.round(end)}.webm`
      a.click()
      setRec(false); v.muted = muted
    }
    mr.start()
    v.playbackRate = 1; v.play()
    const loop = () => {
      ctx.drawImage(v, 0, 0, W, H)
      useAnns.forEach((an) => drawAnn(ctx, an, W, H))
      drawBrand(ctx, brand, W, H)
      if (v.currentTime < end && !v.ended) requestAnimationFrame(loop)
      else { v.pause(); setPlaying(false); mr.stop() }
    }
    requestAnimationFrame(loop)
  }
  const exportCurrent = () => {
    const a = inT ?? 0, b = outT ?? dur
    exportRange(a, b > a ? b : dur, anns)
  }

  const playedPct = dur ? (cur / dur) * 100 : 0

  return (
    <div className="app">
      <div className="topbar">
        <button className="btn ghost sm" onClick={onBack}>← Проекты</button>
        <div className="brand"><span className="slash">//</span> ONCESPORT</div>
        <div className="proj-name">проект: <b>{project?.name}</b></div>
        <div className="spacer" />
        <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={(e) => loadFile(e.target.files[0])} />
        <button className="btn" onClick={() => fileRef.current.click()}>⬆ Загрузить видео</button>
        <button className="btn primary" disabled={!src || rec} onClick={exportCurrent}>
          {rec ? <span className="recording"><span className="blink" />Экспорт…</span> : '▼ Экспорт разбора'}
        </button>
      </div>

      <div className="editor">
        {/* tools */}
        <div className="tools">
          {TOOLS.map((t, i) => (
            <React.Fragment key={t.id}>
              {i === 1 && <div className="tool div" />}
              <button className={`tool ${tool === t.id ? 'active' : ''}`} title={`${t.id} (${t.name})`} onClick={() => setTool(t.id)}>
                <span style={{ fontSize: 18 }}>{t.icon}</span><span>{t.name}</span>
              </button>
            </React.Fragment>
          ))}
          <div className="tool div" />
          <button className="tool" title="Отменить (Ctrl+Z)" onClick={undo}>↶<span>undo</span></button>
          <button className="tool" title="Очистить" onClick={clearAnns}>🗑<span>clr</span></button>
        </div>

        {/* stage */}
        <div className="stage">
          {!src ? (
            <div className="empty-stage">
              <div className="big">Загрузите запись матча</div>
              <div>Full HD, любой формат. Видео обрабатывается локально в браузере.</div>
              <button className="btn primary" style={{ marginTop: 16 }} onClick={() => fileRef.current.click()}>⬆ Выбрать видео</button>
            </div>
          ) : (
            <div className="stage-inner">
              <video ref={videoRef} src={src} onLoadedMetadata={onLoaded} onTimeUpdate={onTime}
                onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onClick={playPause} />
              <canvas ref={overlayRef} className={`overlay ${tool === 'select' ? 'select' : ''}`}
                onMouseDown={down} onMouseMove={move} onMouseUp={up} onMouseLeave={up} />
              {brand.enabled && (
                <div className="lt-badge"><div className="t">{brand.title || 'РАЗБОР'}</div><div className="c">{brand.coach}</div></div>
              )}
            </div>
          )}
        </div>

        {/* side */}
        <div className="side">
          <div className="tabs">
            <button className={tab === 'frags' ? 'active' : ''} onClick={() => setTab('frags')}>Фрагменты</button>
            <button className={tab === 'cmt' ? 'active' : ''} onClick={() => setTab('cmt')}>Комментарии</button>
            <button className={tab === 'brand' ? 'active' : ''} onClick={() => setTab('brand')}>Бренд</button>
          </div>
          <div className="body">
            {tab === 'frags' && (
              frags.length === 0
                ? <div className="empty-note">Отметьте точки I/O на таймлайне и присвойте тег - фрагменты разложатся по папкам.</div>
                : TAGS.map((t) => {
                    const list = frags.filter((f) => f.tag === t.id)
                    if (!list.length) return null
                    return (
                      <div className="folder" key={t.id}>
                        <h4><span className="dot" style={{ background: t.raw }} />{t.label} · {list.length}</h4>
                        {list.map((f) => (
                          <div className="frag" key={f.id} onClick={() => gotoFrag(f)}>
                            <div className="ft">{f.name}</div>
                            <div className="fm">{fmt(f.in)} - {fmt(f.out)} · {(f.out - f.in).toFixed(1)}с · {f.anns.length} аннотаций
                              <button className="btn ghost sm" style={{ float: 'right', padding: '2px 6px' }}
                                onClick={(e) => { e.stopPropagation(); exportRange(f.in, f.out, f.anns) }}>экспорт</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })
            )}
            {tab === 'cmt' && (
              <>
                <div className="field">
                  <label>Комментарий к моменту {fmt(cur)}</label>
                  <textarea className="input" value={cmtText} onChange={(e) => setCmtText(e.target.value)} placeholder="текстовая заметка тренера…" />
                  <button className="btn primary sm" style={{ marginTop: 8 }} onClick={addComment}>+ Добавить</button>
                </div>
                {comments.length === 0 ? <div className="empty-note">Пока нет комментариев.</div>
                  : comments.map((c) => (
                    <div className="cmt" key={c.id} onClick={() => { if (videoRef.current) videoRef.current.currentTime = c.t }} style={{ cursor: 'pointer' }}>
                      <div className="ct">{fmt(c.t)}</div>{c.text}
                    </div>
                  ))}
              </>
            )}
            {tab === 'brand' && (
              <>
                <div className="field row">
                  <input type="checkbox" checked={brand.enabled} onChange={(e) => setBrand({ ...brand, enabled: e.target.checked })} />
                  <label style={{ margin: 0 }}>Показывать плашку на видео и в экспорте</label>
                </div>
                <div className="field"><label>Заголовок (название / команда)</label>
                  <input className="input" value={brand.title} onChange={(e) => setBrand({ ...brand, title: e.target.value })} /></div>
                <div className="field"><label>Подпись (тренер)</label>
                  <input className="input" value={brand.coach} onChange={(e) => setBrand({ ...brand, coach: e.target.value })} /></div>
                <div className="hint">Плашка снизу как на ТВ-разборах - впечатывается в итоговое видео при экспорте.</div>
              </>
            )}
          </div>
        </div>

        {/* transport */}
        <div className="transport">
          <div className="tl" onClick={seekRatio}>
            {frags.map((f) => {
              const t = TAGS.find((x) => x.id === f.tag)
              return <div key={f.id} className="frag-band" style={{ left: `${(f.in / dur) * 100}%`, width: `${((f.out - f.in) / dur) * 100}%`, background: t.raw }} />
            })}
            {comments.map((c) => <div key={c.id} className="marker" style={{ left: `${(c.t / dur) * 100}%` }} />)}
            {inT != null && outT != null && outT > inT &&
              <div className="inout" style={{ left: `${(inT / dur) * 100}%`, width: `${((outT - inT) / dur) * 100}%` }} />}
            <div className="played" style={{ width: `${playedPct}%` }} />
            <div className="play-head" style={{ left: `${playedPct}%` }} />
          </div>

          <div className="controls">
            <button className="btn sm" onClick={() => step(-1 / 30)} title="Кадр назад (←)">⏮</button>
            <button className="btn primary sm" onClick={playPause} disabled={!src} style={{ minWidth: 44 }}>{playing ? '❚❚' : '►'}</button>
            <button className="btn sm" onClick={() => step(1 / 30)} title="Кадр вперёд (→)">⏭</button>
            <span className="t">{fmt(cur)} / {fmt(dur)}</span>
            <div className="sep" />
            <span style={{ color: 'var(--muted)', fontSize: 12 }}>Скорость</span>
            <div className="speed-pills">
              {SPEEDS.map((s) => <button key={s} className={speed === s ? 'active' : ''} onClick={() => changeSpeed(s)}>{s}x</button>)}
            </div>
            <button className="btn sm" onClick={toggleMute}>{muted ? '🔇 звук выкл' : '🔊 звук вкл'}</button>
            <div className="sep" />
            <button className="btn sm" onClick={markIn} title="Начало (I)">[ In {inT != null ? fmt(inT) : '—'}</button>
            <button className="btn sm" onClick={markOut} title="Конец (O)">Out {outT != null ? fmt(outT) : '—'} ]</button>
            <span style={{ color: 'var(--muted)', fontSize: 12 }}>Тег:</span>
            {TAGS.map((t) => (
              <button key={t.id} className="btn sm" disabled={inT == null || outT == null || outT <= inT}
                onClick={() => addFragment(t.id)} style={{ borderColor: t.raw, color: t.raw }}>+ {t.label}</button>
            ))}
            <div className="sep" />
            <input type="color" className="swatch" value={color} onChange={(e) => setColor(e.target.value)} title="Цвет" />
            <input type="range" min="2" max="12" value={width} onChange={(e) => setWidth(+e.target.value)} title="Толщина" style={{ width: 70 }} />
          </div>
          <div className="hint">Шорткаты: V выбор · 1 стрелка · 2 кольцо · 3 линия · 4 перо · I/O начало-конец · ← → кадр · пробел плей · Ctrl+Z отмена</div>
        </div>
      </div>
    </div>
  )
}
