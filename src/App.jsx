import React, { useEffect, useRef, useState, useCallback } from 'react'

/* ---------- константы ---------- */
const TAGS = [
  { id: 'atk', label: 'Атака', raw: '#ff5c33' },
  { id: 'def', label: 'Оборона', raw: '#4d8dff' },
  { id: 'vbr', label: 'Вброс', raw: '#b06bff' },
  { id: 'oth', label: 'Другое', raw: '#7a8699' },
]
const SWATCHES = ['#ff5c33', '#4d8dff', '#ffd23f', '#34d399', '#ffffff', '#ff2d55']
const SPEEDS = [0.25, 0.5, 1, 2]
const fmt = (t) => {
  if (!isFinite(t) || t < 0) return '00:00.0'
  const m = Math.floor(t / 60), s = Math.floor(t % 60), d = Math.floor((t * 10) % 10)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${d}`
}
const uid = () => Math.random().toString(36).slice(2, 9)

/* ---------- иконки ---------- */
const I = {
  select: 'M6 3l13 7.5-5.4 1.3-1.2 5.6z',
  arrow: null, ring: null, line: null, pen: 'M4 20l1-4L16 5l3 3L8 19z M14 7l3 3',
  track: null, undo: 'M4 8h7a6 6 0 1 1-6 6 M4 8l3-3 M4 8l3 3', trash: 'M4 7h16 M7 7l1 13h8l1-13 M9 7V4h6v3',
  upload: 'M12 15V4 M7 9l5-5 5 5 M5 19h14', download: 'M12 4v11 M7 10l5 5 5-5 M5 19h14',
  play: 'M7 4l13 8-13 8z', pause: 'M8 4h3v16H8z M15 4h3v16h-3z',
  prev: 'M7 5v14 M19 5L9 12l10 7z', next: 'M17 5v14 M5 5l10 7-10 7z',
}
function Icon({ n, fill }) {
  const sw = { stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', fill: fill ? 'currentColor' : 'none' }
  if (n === 'arrow') return <svg viewBox="0 0 24 24"><path d="M5 19L18 6" {...sw} fill="none" /><path d="M10 6h8v8" {...sw} fill="none" /></svg>
  if (n === 'ring') return <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" {...sw} fill="none" /></svg>
  if (n === 'line') return <svg viewBox="0 0 24 24"><path d="M5 19L19 5" {...sw} fill="none" /></svg>
  if (n === 'track') return <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="6" {...sw} fill="none" /><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" /><path d="M12 2v3 M12 19v3 M2 12h3 M19 12h3" {...sw} /></svg>
  if (n === 'play' || n === 'pause' || n === 'select' || n === 'pen' || n === 'prev' || n === 'next') return <svg viewBox="0 0 24 24"><path d={I[n]} {...sw} fill={(n === 'play' || n === 'select') ? 'currentColor' : (n === 'pause' ? 'currentColor' : 'none')} stroke={(n === 'play' || n === 'pause' || n === 'select') ? 'none' : 'currentColor'} /></svg>
  return <svg viewBox="0 0 24 24"><path d={I[n]} {...sw} /></svg>
}

/* ---------- рисование аннотаций ---------- */
function stroked(ctx, fn, color, width) {
  // тёмный контур-гало для читаемости на любом видео + цветная линия
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = width + 3; fn(ctx)
  ctx.strokeStyle = color; ctx.lineWidth = width; fn(ctx)
  ctx.restore()
}
function drawAnn(ctx, a, W, H) {
  const w = a.width
  if (a.type === 'pen') {
    const pts = a.pts.map(p => ({ x: p.x * W, y: p.y * H }))
    const path = (c) => {
      c.beginPath()
      if (pts.length < 3) { pts.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)) }
      else {
        c.moveTo(pts[0].x, pts[0].y)
        for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2; c.quadraticCurveTo(pts[i].x, pts[i].y, mx, my) }
        c.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y)
      }
      c.stroke()
    }
    stroked(ctx, path, a.color, w); return
  }
  const ax = a.a.x * W, ay = a.a.y * H, bx = a.b.x * W, by = a.b.y * H
  if (a.type === 'line') stroked(ctx, (c) => { c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke() }, a.color, w)
  else if (a.type === 'arrow') {
    const ang = Math.atan2(by - ay, bx - ax), hl = 12 + w * 2.4
    stroked(ctx, (c) => { c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx - Math.cos(ang) * hl * .5, by - Math.sin(ang) * hl * .5); c.stroke() }, a.color, w)
    ctx.save(); ctx.fillStyle = a.color; ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 2; ctx.lineJoin = 'round'
    ctx.beginPath(); ctx.moveTo(bx, by)
    ctx.lineTo(bx - hl * Math.cos(ang - Math.PI / 7), by - hl * Math.sin(ang - Math.PI / 7))
    ctx.lineTo(bx - hl * Math.cos(ang + Math.PI / 7), by - hl * Math.sin(ang + Math.PI / 7))
    ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore()
  } else if (a.type === 'ring') {
    const cx = (ax + bx) / 2, cy = (ay + by) / 2, rx = Math.max(Math.abs(bx - ax) / 2, 8), ry = Math.max(Math.abs(by - ay) / 2, 8)
    ctx.save(); ctx.fillStyle = a.color; ctx.globalAlpha = .12
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore()
    stroked(ctx, (c) => { c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); c.stroke() }, a.color, w)
  }
}

/* ---------- авто-трекинг (template matching по SAD) ---------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
// поиск нового положения шаблона cv в текущем кадре sample-канваса
function searchTrack(sctx, cv, PW, PH) {
  const S = Math.max(8, Math.round(PW * 0.045)), tw = cv.tw, th = cv.th
  let x0 = clamp(Math.round(cv.x) - (tw >> 1) - S, 0, PW - tw)
  let y0 = clamp(Math.round(cv.y) - (th >> 1) - S, 0, PH - th)
  let rw = Math.min(tw + 2 * S, PW - x0), rh = Math.min(th + 2 * S, PH - y0)
  if (rw < tw || rh < th) return
  const reg = sctx.getImageData(x0, y0, rw, rh).data, tpl = cv.tpl
  const maxdx = rw - tw, maxdy = rh - th
  let best = Infinity, bx = cv.x, by = cv.y
  for (let dy = 0; dy <= maxdy; dy += 2) {
    for (let dx = 0; dx <= maxdx; dx += 2) {
      let sad = 0
      for (let ty = 0; ty < th && sad < best; ty += 2) {
        const rrow = (dy + ty) * rw, trow = ty * tw
        for (let tx = 0; tx < tw; tx += 2) {
          const ri = (rrow + dx + tx) << 2, ti = (trow + tx) << 2
          sad += Math.abs(reg[ri] - tpl[ti]) + Math.abs(reg[ri + 1] - tpl[ti + 1]) + Math.abs(reg[ri + 2] - tpl[ti + 2])
          if (sad >= best) break
        }
      }
      if (sad < best) { best = sad; bx = x0 + dx + (tw >> 1); by = y0 + dy + (th >> 1) }
    }
  }
  cv.x = bx; cv.y = by
  // лёгкая адаптация шаблона, чтобы пережить смену ракурса (10%)
  if (best < cv.tpl.length * 16) {
    const patch = sctx.getImageData(clamp(bx - (tw >> 1), 0, PW - tw), clamp(by - (th >> 1), 0, PH - th), tw, th).data
    for (let i = 0; i < tpl.length; i++) tpl[i] = (tpl[i] * 9 + patch[i]) / 10
  }
}
function drawRing(ctx, color, label, cx, cy, R, active) {
  ctx.save()
  ctx.globalAlpha = active ? 1 : 0.4
  ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke()
  ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke()
  ctx.fillStyle = color; ctx.globalAlpha = active ? .14 : .06; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill()
  ctx.globalAlpha = active ? 1 : 0.5
  if (label) {
    ctx.font = `700 ${Math.round(R * 0.5)}px -apple-system, Arial`
    const tw = ctx.measureText(label).width
    ctx.fillStyle = 'rgba(0,0,0,.72)'; ctx.fillRect(cx - tw / 2 - 6, cy - R - R * 0.92, tw + 12, R * 0.78)
    ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center'
    ctx.fillText(label, cx, cy - R - R * 0.52)
  }
  ctx.restore()
}
function drawBrand(ctx, brand, W, H) {
  if (!brand.enabled) return
  const fs = Math.round(H * 0.034), pad = Math.round(H * 0.018)
  ctx.save(); ctx.font = `800 ${fs}px -apple-system, Arial`
  const tw = Math.max(ctx.measureText(brand.title || 'РАЗБОР').width, ctx.measureText(brand.coach || '').width)
  const cw = tw + pad * 3, ch = fs * 2.5, x = pad * 1.4, y = H - ch - pad * 1.4
  ctx.fillStyle = 'rgba(8,10,14,.82)'; ctx.fillRect(x, y, cw, ch)
  ctx.fillStyle = '#ff5c33'; ctx.fillRect(x, y, Math.max(3, H * 0.005), ch)
  ctx.textBaseline = 'top'; ctx.fillStyle = '#fff'; ctx.font = `800 ${fs}px -apple-system, Arial`
  ctx.fillText(brand.title || 'РАЗБОР', x + pad * 1.5, y + pad * 0.8)
  ctx.font = `600 ${Math.round(fs * 0.56)}px -apple-system, Arial`; ctx.fillStyle = '#9aa4b4'
  ctx.fillText(brand.coach || '', x + pad * 1.5, y + pad + fs)
  ctx.restore()
}

/* ====================================================== APP */
export default function App() {
  const [view, setView] = useState('library')
  const [projects, setProjects] = useState(() => { try { return JSON.parse(localStorage.getItem('osp_projects') || '[]') } catch { return [] } })
  const [active, setActive] = useState(null)
  useEffect(() => { localStorage.setItem('osp_projects', JSON.stringify(projects)) }, [projects])
  const createProject = (name, team) => { const p = { id: uid(), name, team, created: Date.now() }; setProjects(s => [p, ...s]); setActive(p); setView('editor') }
  return view === 'library'
    ? <Library projects={projects} onCreate={createProject} onOpen={(p) => { setActive(p); setView('editor') }} onDelete={(id) => setProjects(s => s.filter(p => p.id !== id))} />
    : <Editor project={active} onBack={() => setView('library')} />
}

/* ====================================================== LIBRARY */
function Library({ projects, onCreate, onOpen, onDelete }) {
  const [name, setName] = useState(''); const [team, setTeam] = useState(''); const [show, setShow] = useState(false)
  return (
    <div className="app">
      <div className="topbar">
        <div className="brand"><span className="slash">//</span> ONCESPORT <span className="sub">ВИДЕОРАЗБОР</span></div>
        <div className="spacer" />
        <button className="btn primary" onClick={() => setShow(true)}>+ Новый проект</button>
      </div>
      <div className="library">
        <h1>Проекты разбора</h1>
        <p className="lead">Каждый проект — команда или клиент со своим деревом фрагментов по тегам.</p>
        <div className="proj-grid">
          <div className="proj-card new" onClick={() => setShow(true)}>+ Создать проект</div>
          {projects.map(p => (
            <div className="proj-card" key={p.id} onClick={() => onOpen(p)}>
              <h3>{p.name}</h3>
              <div className="meta">{p.team || 'без команды'} · {new Date(p.created).toLocaleDateString('ru-RU')}</div>
              <div className="chips">{TAGS.map(t => <span key={t.id} className="dot" style={{ background: t.raw }} title={t.label} />)}
                <button className="btn ghost sm" style={{ marginLeft: 'auto' }} onClick={(e) => { e.stopPropagation(); onDelete(p.id) }}>удалить</button></div>
            </div>
          ))}
        </div>
      </div>
      {show && <Modal title="Новый проект" onClose={() => setShow(false)} onSubmit={() => { if (name.trim()) { onCreate(name.trim(), team.trim()); setShow(false) } }}>
        <div className="field"><label>Название проекта</label><input className="input" autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="ХК Спартак — матч 12.06" /></div>
        <div className="field"><label>Команда / клиент</label><input className="input" value={team} onChange={e => setTeam(e.target.value)} placeholder="Спартак U17" /></div>
      </Modal>}
    </div>
  )
}
function Modal({ title, children, onClose, onSubmit }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={onClose}>
      <div style={{ background: 'var(--panel)', border: '1px solid var(--line2)', borderRadius: 14, padding: 24, width: 380, boxShadow: 'var(--shadow)' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 18px' }}>{title}</h3>{children}
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 6 }}>
          <button className="btn ghost" onClick={onClose}>Отмена</button><button className="btn primary" onClick={onSubmit}>Создать</button>
        </div>
      </div>
    </div>
  )
}

/* ====================================================== EDITOR */
function Editor({ project, onBack }) {
  const videoRef = useRef(null), overlayRef = useRef(null), fileRef = useRef(null)
  const draft = useRef(null)
  const sampleRef = useRef(null), trackCV = useRef({}), proc = useRef({ w: 480, h: 270 }), procLastT = useRef(-1)

  const [src, setSrc] = useState(null)
  const [tool, setTool] = useState('arrow')
  const [color, setColor] = useState('#ff5c33')
  const [width, setWidth] = useState(5)
  const [anns, setAnns] = useState([])
  const [tracks, setTracks] = useState([])
  const [activeTrack, setActiveTrack] = useState(null)

  const [dur, setDur] = useState(0), [cur, setCur] = useState(0)
  const [playing, setPlaying] = useState(false), [speed, setSpeed] = useState(1), [muted, setMuted] = useState(false)
  const [inT, setInT] = useState(null), [outT, setOutT] = useState(null)
  const [frags, setFrags] = useState([]), [comments, setComments] = useState([])
  const [tab, setTab] = useState('frags'), [rec, setRec] = useState(false), [cmtText, setCmtText] = useState('')
  const [brand, setBrand] = useState({ enabled: true, title: project?.name || 'РАЗБОР', coach: 'Тренер' })
  const [sideW, setSideW] = useState(330), [bottomH, setBottomH] = useState(176)

  /* ---- размеры панелей ---- */
  const dragSide = (e) => { e.preventDefault(); const t = e.currentTarget; t.classList.add('drag')
    const mv = (ev) => setSideW(Math.min(640, Math.max(250, window.innerWidth - ev.clientX)))
    const up = () => { t.classList.remove('drag'); window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); document.body.style.userSelect = '' }
    document.body.style.userSelect = 'none'; window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up) }
  const dragBottom = (e) => { e.preventDefault(); const t = e.currentTarget; t.classList.add('drag')
    const mv = (ev) => setBottomH(Math.min(480, Math.max(120, window.innerHeight - ev.clientY)))
    const up = () => { t.classList.remove('drag'); window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); document.body.style.userSelect = '' }
    document.body.style.userSelect = 'none'; window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up) }

  /* ---- размер overlay под видео ---- */
  const syncCanvas = useCallback(() => {
    const v = videoRef.current, c = overlayRef.current; if (!v || !c) return
    const r = v.getBoundingClientRect(); if (r.width && r.height) { c.width = Math.round(r.width); c.height = Math.round(r.height) }
  }, [])
  useEffect(() => { window.addEventListener('resize', syncCanvas); return () => window.removeEventListener('resize', syncCanvas) }, [syncCanvas])
  useEffect(() => { const id = requestAnimationFrame(syncCanvas); return () => cancelAnimationFrame(id) }, [sideW, bottomH, src, syncCanvas])

  /* ---- покадровый апдейт авто-трекинга ---- */
  const updateTracks = useCallback(() => {
    const v = videoRef.current, sc = sampleRef.current; if (!v || !sc || v.readyState < 2) return
    const { w: PW, h: PH } = proc.current
    const sctx = sc.getContext('2d', { willReadFrequently: true })
    let any = false
    for (const t of tracks) { const cv = trackCV.current[t.id]; if (cv && t.active) { any = true; break } }
    if (!any) return
    sctx.drawImage(v, 0, 0, PW, PH)
    for (const t of tracks) { const cv = trackCV.current[t.id]; if (cv && t.active) searchTrack(sctx, cv, PW, PH) }
  }, [tracks])

  /* ---- живой рендер overlay (инфографика + авто-трекинг) ---- */
  useEffect(() => {
    let raf
    const tick = () => {
      const v = videoRef.current, c = overlayRef.current
      if (v && c) {
        if (v.currentTime !== procLastT.current) { procLastT.current = v.currentTime; updateTracks() }
        const ctx = c.getContext('2d'); ctx.clearRect(0, 0, c.width, c.height)
        anns.forEach(a => drawAnn(ctx, a, c.width, c.height))
        const { w: PW, h: PH } = proc.current
        tracks.forEach(tr => { const cv = trackCV.current[tr.id]; if (cv) drawRing(ctx, tr.color, tr.label, (cv.x / PW) * c.width, (cv.y / PH) * c.height, Math.min(c.width, c.height) * 0.05, tr.active) })
        if (draft.current) drawAnn(ctx, draft.current, c.width, c.height)
        drawBrand(ctx, brand, c.width, c.height)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf)
  }, [anns, tracks, brand, updateTracks])

  /* ---- файл / видео ---- */
  const loadFile = (f) => { if (!f) return; trackCV.current = {}; procLastT.current = -1; setSrc(URL.createObjectURL(f)); setAnns([]); setTracks([]); setActiveTrack(null); setFrags([]); setComments([]); setInT(null); setOutT(null) }
  const onLoaded = () => {
    const v = videoRef.current; setDur(v.duration); v.playbackRate = speed; v.muted = muted
    const PW = 480, PH = Math.max(1, Math.round(PW * ((v.videoHeight / v.videoWidth) || 0.5)))
    proc.current = { w: PW, h: PH }
    if (!sampleRef.current) sampleRef.current = document.createElement('canvas')
    sampleRef.current.width = PW; sampleRef.current.height = PH
    setTimeout(syncCanvas, 60)
  }
  const onTime = () => setCur(videoRef.current.currentTime)
  const playPause = () => { const v = videoRef.current; if (!v || !src) return; v.paused ? v.play() : v.pause() }
  const step = (d) => { const v = videoRef.current; if (!v) return; v.pause(); v.currentTime = Math.min(dur, Math.max(0, v.currentTime + d)) }
  const seekRatio = (e) => { const v = videoRef.current; if (!v || !dur) return; const r = e.currentTarget.getBoundingClientRect(); v.currentTime = ((e.clientX - r.left) / r.width) * dur }
  const changeSpeed = (s) => { setSpeed(s); if (videoRef.current) videoRef.current.playbackRate = s }
  const toggleMute = () => { const m = !muted; setMuted(m); if (videoRef.current) videoRef.current.muted = m }

  /* ---- ввод на overlay ---- */
  const pos = (e) => { const r = overlayRef.current.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height } }
  const startTrack = (p) => {
    const v = videoRef.current, sc = sampleRef.current; if (!v || !sc) return
    const { w: PW, h: PH } = proc.current
    const sctx = sc.getContext('2d', { willReadFrequently: true }); sctx.drawImage(v, 0, 0, PW, PH)
    const tw = clamp(Math.round(PW * 0.075), 16, 44), th = tw
    const px = clamp(Math.round(p.x * PW), tw, PW - tw), py = clamp(Math.round(p.y * PH), th, PH - th)
    const tpl = Float32Array.from(sctx.getImageData(px - (tw >> 1), py - (th >> 1), tw, th).data)
    const id = uid()
    trackCV.current[id] = { tpl, tw, th, x: px, y: py }
    setTracks(s => [...s, { id, color, label: 'Игрок ' + (s.length + 1), active: true }]); setActiveTrack(id)
  }
  const down = (e) => {
    if (!src || tool === 'select') return
    const p = pos(e)
    if (tool === 'track') { startTrack(p); return }
    draft.current = tool === 'pen' ? { id: uid(), type: 'pen', color, width, pts: [p] } : { id: uid(), type: tool, color, width, a: p, b: p }
  }
  const move = (e) => {
    if (!draft.current) return; const p = pos(e)
    if (draft.current.type === 'pen') draft.current.pts.push(p); else draft.current.b = p
  }
  const up = () => {
    if (!draft.current) return; const d = draft.current; draft.current = null
    const tiny = d.type !== 'pen' && Math.hypot(d.b.x - d.a.x, d.b.y - d.a.y) < 0.012
    if (!tiny) setAnns(s => [...s, d])
  }
  const toggleTrack = (id) => setTracks(s => s.map(t => t.id === id ? { ...t, active: !t.active } : t))
  const delTrack = (id) => { delete trackCV.current[id]; setTracks(s => s.filter(t => t.id !== id)) }
  const undo = () => setAnns(s => s.slice(0, -1))
  const clearAnns = () => setAnns([])

  /* ---- фрагменты / комментарии ---- */
  const addFragment = (tagId) => {
    const a = inT ?? 0, b = outT ?? Math.min(dur, a + 5); if (b <= a) return
    const tag = TAGS.find(t => t.id === tagId)
    setFrags(s => [...s, { id: uid(), in: a, out: b, tag: tagId, name: `${tag.label} ${fmt(a)}`, anns: [...anns] }]); setInT(null); setOutT(null)
  }
  const gotoFrag = (f) => { const v = videoRef.current; if (v) { v.currentTime = f.in; setInT(f.in); setOutT(f.out) } }
  const addComment = () => { if (!cmtText.trim()) return; setComments(s => [...s, { id: uid(), t: cur, text: cmtText.trim() }].sort((x, y) => x.t - y.t)); setCmtText('') }

  /* ---- горячие клавиши ---- */
  useEffect(() => {
    const h = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return
      const k = e.key.toLowerCase()
      if (k === ' ') { e.preventDefault(); playPause() }
      else if (k === 'v') setTool('select'); else if (k === '1') setTool('arrow'); else if (k === '2') setTool('ring')
      else if (k === '3') setTool('line'); else if (k === '4') setTool('pen'); else if (k === '5') setTool('track')
      else if (k === 'i') setInT(videoRef.current?.currentTime ?? 0); else if (k === 'o') setOutT(videoRef.current?.currentTime ?? 0)
      else if (e.key === 'ArrowLeft') step(-1 / 30); else if (e.key === 'ArrowRight') step(1 / 30)
      else if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); undo() }
    }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [dur, src])

  /* ---- экспорт ---- */
  const exportRange = async (start, end, useAnns) => {
    const v = videoRef.current; if (!v || !src) return
    const W = v.videoWidth, H = v.videoHeight
    const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H
    const ctx = canvas.getContext('2d'); const aSet = useAnns || anns
    setRec(true); v.pause(); v.muted = true
    await new Promise(res => { v.onseeked = () => { v.onseeked = null; res() }; v.currentTime = start })
    const cstream = canvas.captureStream(30); const trks = [...cstream.getVideoTracks()]
    try { if (!muted && v.captureStream) { const at = v.captureStream().getAudioTracks(); if (at[0]) trks.push(at[0]) } } catch {}
    const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || 'video/webm'
    const mr = new MediaRecorder(new MediaStream(trks), { mimeType: mime }); const chunks = []
    mr.ondataavailable = e => e.data.size && chunks.push(e.data)
    mr.onstop = () => { const blob = new Blob(chunks, { type: 'video/webm' }); const a = document.createElement('a')
      a.href = URL.createObjectURL(blob); a.download = `${(project?.name || 'razbor').replace(/\s+/g, '_')}_${Math.round(start)}-${Math.round(end)}.webm`; a.click(); setRec(false); v.muted = muted }
    mr.start(); v.playbackRate = 1; v.play()
    const loop = () => {
      ctx.drawImage(v, 0, 0, W, H)
      aSet.forEach(an => drawAnn(ctx, an, W, H))
      const { w: PW, h: PH } = proc.current
      tracks.forEach(tr => { const cv = trackCV.current[tr.id]; if (cv) drawRing(ctx, tr.color, tr.label, (cv.x / PW) * W, (cv.y / PH) * H, Math.min(W, H) * 0.05, tr.active) })
      drawBrand(ctx, brand, W, H)
      if (v.currentTime < end && !v.ended) requestAnimationFrame(loop); else { v.pause(); mr.stop() }
    }
    requestAnimationFrame(loop)
  }
  const exportCurrent = () => { const a = inT ?? 0, b = (outT && outT > a) ? outT : dur; exportRange(a, b, anns) }

  const TOOLS = [['select', 'V'], ['arrow', '1'], ['ring', '2'], ['line', '3'], ['pen', '4'], ['track', '5']]
  const pp = dur ? (cur / dur) * 100 : 0

  return (
    <div className="app">
      <div className="topbar">
        <button className="btn ghost sm" onClick={onBack}>← Проекты</button>
        <div className="brand"><span className="slash">//</span> ONCESPORT</div>
        <div className="proj-name">проект: <b>{project?.name}</b></div>
        <div className="spacer" />
        <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={e => loadFile(e.target.files[0])} />
        <button className="btn" onClick={() => fileRef.current.click()}><Icon n="upload" /> Загрузить видео</button>
        <button className="btn primary" disabled={!src || rec} onClick={exportCurrent}>
          {rec ? <span className="recording"><span className="blink" />Экспорт…</span> : <><Icon n="download" /> Экспорт разбора</>}
        </button>
      </div>

      <div className="editor">
        <div className="editor-main">
          <div className="tools">
            {TOOLS.map(([id, k], i) => (
              <React.Fragment key={id}>
                {i === 1 && <div className="tool div" />}
                <button className={`tool ${tool === id ? 'active' : ''}`} title={`${id} (${k})`} onClick={() => setTool(id)}>
                  <Icon n={id} /><span className="kbd">{k}</span>
                </button>
              </React.Fragment>
            ))}
            <div className="tool div" />
            <button className="tool" title="Отменить (Ctrl+Z)" onClick={undo}><Icon n="undo" /></button>
            <button className="tool" title="Очистить" onClick={clearAnns}><Icon n="trash" /></button>
          </div>

          <div className="stage">
            {!src ? (
              <div className="empty-stage">
                <div className="ico"><Icon n="upload" /></div>
                <div className="big">Загрузите запись матча</div>
                <p>Лучше H.264 .mp4 (Full HD). Видео обрабатывается локально, ничего не загружается в сеть.</p>
                <button className="btn primary" onClick={() => fileRef.current.click()}><Icon n="upload" /> Выбрать видео</button>
              </div>
            ) : (
              <div className="stage-inner">
                <video ref={videoRef} src={src} onLoadedMetadata={onLoaded} onTimeUpdate={onTime}
                  onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onClick={() => tool === 'select' && playPause()} />
                <canvas ref={overlayRef} className={`overlay ${tool}`} onMouseDown={down} onMouseMove={move} onMouseUp={up} onMouseLeave={up} />
              </div>
            )}
          </div>

          <div className="gutter-v" onMouseDown={dragSide} title="Потяните, чтобы изменить ширину" />

          <div className="side" style={{ width: sideW }}>
            <div className="tabs">
              <button className={tab === 'frags' ? 'active' : ''} onClick={() => setTab('frags')}>Фрагменты</button>
              <button className={tab === 'track' ? 'active' : ''} onClick={() => setTab('track')}>Трекинг</button>
              <button className={tab === 'cmt' ? 'active' : ''} onClick={() => setTab('cmt')}>Заметки</button>
              <button className={tab === 'brand' ? 'active' : ''} onClick={() => setTab('brand')}>Бренд</button>
            </div>
            <div className="body">
              {tab === 'frags' && (frags.length === 0
                ? <div className="empty-note">Отметьте точки I/O на таймлайне и присвойте тег — фрагменты разложатся по папкам.</div>
                : TAGS.map(t => { const list = frags.filter(f => f.tag === t.id); if (!list.length) return null
                  return <div className="folder" key={t.id}>
                    <h4><span className="dot" style={{ background: t.raw }} />{t.label}<span className="count">{list.length}</span></h4>
                    {list.map(f => <div className="card-item" key={f.id} onClick={() => gotoFrag(f)}>
                      <div className="ft">{f.name}</div>
                      <div className="fm">{fmt(f.in)}–{fmt(f.out)} · {(f.out - f.in).toFixed(1)}с · {f.anns.length} разметок
                        <button className="btn ghost sm" style={{ marginLeft: 'auto', padding: '2px 7px' }} onClick={e => { e.stopPropagation(); exportRange(f.in, f.out, f.anns) }}>экспорт</button></div>
                    </div>)}
                  </div> }))}

              {tab === 'track' && <>
                <button className={`btn sm ${tool === 'track' ? 'primary' : ''}`} style={{ width: '100%', marginBottom: 12, justifyContent: 'center' }} onClick={() => setTool('track')}>Инструмент «Трекинг» (5)</button>
                <div className="empty-note" style={{ padding: '4px 0 14px', textAlign: 'left' }}>
                  Авто-трекинг: включите инструмент «Трекинг» и кликните по игроку — кольцо само поедет за ним при воспроизведении, пока вы не выключите. Можно вести нескольких игроков. Лучше работает на чётком Full HD.
                </div>
                {tracks.length === 0 ? <div className="empty-note">Треков пока нет.</div>
                  : tracks.map(tr => <div className="card-item" key={tr.id} style={{ borderColor: tr.active ? tr.color : 'var(--line)' }}>
                      <div className="ft"><span className="dot" style={{ background: tr.color }} />
                        <input className="input" style={{ padding: '3px 7px', height: 26, background: 'transparent', border: 0 }} value={tr.label}
                          onChange={e => setTracks(s => s.map(x => x.id === tr.id ? { ...x, label: e.target.value } : x))} />
                      </div>
                      <div className="fm">{tr.active ? <b style={{ color: tr.color }}>● трекинг идёт</b> : 'остановлен'}
                        <button className="btn ghost sm" style={{ marginLeft: 'auto', padding: '2px 7px' }} onClick={() => toggleTrack(tr.id)}>{tr.active ? 'выключить' : 'включить'}</button>
                        <button className="btn ghost sm" style={{ padding: '2px 7px' }} onClick={() => delTrack(tr.id)}>удалить</button></div>
                    </div>)}
              </>}

              {tab === 'cmt' && <>
                <div className="field"><label>Заметка к моменту {fmt(cur)}</label>
                  <textarea className="input" value={cmtText} onChange={e => setCmtText(e.target.value)} placeholder="текстовая заметка тренера…" />
                  <button className="btn primary sm" style={{ marginTop: 8 }} onClick={addComment}>+ Добавить</button></div>
                {comments.length === 0 ? <div className="empty-note">Пока нет заметок.</div>
                  : comments.map(c => <div className="card-item" key={c.id} onClick={() => { if (videoRef.current) videoRef.current.currentTime = c.t }}>
                    <div className="fm" style={{ marginTop: 0, marginBottom: 4 }}>{fmt(c.t)}</div>{c.text}</div>)}
              </>}

              {tab === 'brand' && <>
                <div className="field row"><input type="checkbox" checked={brand.enabled} onChange={e => setBrand({ ...brand, enabled: e.target.checked })} />
                  <label style={{ margin: 0 }}>Показывать плашку на видео и в экспорте</label></div>
                <div className="field"><label>Заголовок (название / команда)</label><input className="input" value={brand.title} onChange={e => setBrand({ ...brand, title: e.target.value })} /></div>
                <div className="field"><label>Подпись (тренер)</label><input className="input" value={brand.coach} onChange={e => setBrand({ ...brand, coach: e.target.value })} /></div>
                <div className="hint" style={{ marginTop: 4 }}><span>Плашка снизу, как на ТВ-разборах — впечатывается в итоговое видео при экспорте.</span></div>
              </>}
            </div>
          </div>
        </div>

        <div className="gutter-h" onMouseDown={dragBottom} title="Потяните, чтобы изменить высоту" />

        <div className="transport" style={{ height: bottomH }}>
          <div className="tl" onClick={seekRatio}>
            {frags.map(f => { const t = TAGS.find(x => x.id === f.tag); return <div key={f.id} className="frag-band" style={{ left: `${(f.in / dur) * 100}%`, width: `${((f.out - f.in) / dur) * 100}%`, background: t.raw }} /> })}
            {comments.map(c => <div key={c.id} className="marker" style={{ left: `${(c.t / dur) * 100}%` }} />)}
            {inT != null && outT != null && outT > inT && <div className="inout" style={{ left: `${(inT / dur) * 100}%`, width: `${((outT - inT) / dur) * 100}%` }} />}
            <div className="played" style={{ width: `${pp}%` }} /><div className="play-head" style={{ left: `${pp}%` }} />
          </div>

          <div className="controls">
            <button className="btn icon" onClick={() => step(-1 / 30)} title="Кадр назад (←)"><Icon n="prev" /></button>
            <button className="btn primary icon" onClick={playPause} disabled={!src} style={{ width: 40, height: 34, justifyContent: 'center' }}><Icon n={playing ? 'pause' : 'play'} fill /></button>
            <button className="btn icon" onClick={() => step(1 / 30)} title="Кадр вперёд (→)"><Icon n="next" /></button>
            <span className="t">{fmt(cur)} / {fmt(dur)}</span>
            <div className="sep" />
            <span className="grp-label">скорость</span>
            <div className="pills">{SPEEDS.map(s => <button key={s} className={speed === s ? 'active' : ''} onClick={() => changeSpeed(s)}>{s}x</button>)}</div>
            <button className="btn sm" onClick={toggleMute}>{muted ? '🔇' : '🔊'}</button>
            <div className="sep" />
            <button className="btn sm" onClick={() => setInT(cur)} title="Начало (I)">[ {inT != null ? fmt(inT) : 'In'}</button>
            <button className="btn sm" onClick={() => setOutT(cur)} title="Конец (O)">{outT != null ? fmt(outT) : 'Out'} ]</button>
            <span className="grp-label">тег</span>
            {TAGS.map(t => <button key={t.id} className="btn sm" disabled={inT == null || outT == null || outT <= inT} onClick={() => addFragment(t.id)} style={{ borderColor: t.raw, color: t.raw }}>{t.label}</button>)}
            <div className="sep" />
            <span className="grp-label">цвет</span>
            <div className="swatches">{SWATCHES.map(c => <button key={c} className={`sw ${color === c ? 'active' : ''}`} style={{ background: c }} onClick={() => setColor(c)} />)}</div>
            <input type="color" className="swatch" value={color} onChange={e => setColor(e.target.value)} title="Свой цвет" />
            <input type="range" min="2" max="14" value={width} onChange={e => setWidth(+e.target.value)} title="Толщина" style={{ width: 76 }} />
          </div>
          <div className="hint">
            <span><b>V</b> выбор</span><span><b>1</b> стрелка</span><span><b>2</b> кольцо</span><span><b>3</b> линия</span><span><b>4</b> перо</span><span><b>5</b> трекинг</span>
            <span><b>I/O</b> метки</span><span><b>← →</b> кадр</span><span><b>пробел</b> плей</span><span><b>Ctrl+Z</b> отмена</span>
          </div>
        </div>
      </div>
    </div>
  )
}
