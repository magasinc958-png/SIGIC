import { useEffect, useMemo, useState, type FormEvent, type PointerEvent } from 'react'
import { apiRequest, ApiRequestError } from '../lib/api'
import type { IncidentCategory, NewIncidentInput } from '../types/domain'

type IncidentFormPageProps = {
  token: string
  categories: IncidentCategory[]
  onCancel: () => void
  onCreated: (incidentId: string) => void
  onSessionExpired: () => void
  demoMode?: boolean
  onDemoCreate?: (input: NewIncidentInput) => string
}

type CreateIncidentResponse = { incident: { id: string } }

export function IncidentFormPage({ token, categories, onCancel, onCreated, onSessionExpired, demoMode = false, onDemoCreate }: IncidentFormPageProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [address, setAddress] = useState('')
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null)
  const [mapCenter, setMapCenter] = useState({ latitude: -2.1575, longitude: -79.9275 })
  const [files, setFiles] = useState<File[]>([])
  const [locationMessage, setLocationMessage] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [step, setStep] = useState<'details' | 'location' | 'review'>('details')
  const [mapZoom, setMapZoom] = useState(16)
  const filePreviews = useMemo(() => files.map((file) => ({ file, url: URL.createObjectURL(file) })), [files])

  useEffect(() => () => filePreviews.forEach(({ url }) => URL.revokeObjectURL(url)), [filePreviews])

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage('Este dispositivo no ofrece ubicación automática. Escribe la dirección manualmente.')
      return
    }
    setLocationMessage('Solicitando ubicación…')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const point = { latitude: coords.latitude, longitude: coords.longitude }
        setCoordinates(point)
        setMapCenter(point)
        setLocationMessage('Ubicación agregada. Confirma la dirección antes de enviar.')
      },
      () => setLocationMessage('No pudimos obtener tu ubicación. Puedes completar la dirección manualmente.'),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const addFiles = (selection: FileList | null) => {
    if (!selection) return
    const chosen = Array.from(selection)
    const valid = chosen.filter((file) => file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024)
    const seen = new Set(files.map((file) => `${file.name}:${file.size}:${file.lastModified}`))
    const unique = valid.filter((file) => {
      const fingerprint = `${file.name}:${file.size}:${file.lastModified}`
      if (seen.has(fingerprint)) return false
      seen.add(fingerprint)
      return true
    })
    const next = [...files, ...unique].slice(0, 5)
    setFiles(next)
    const issue = chosen.length !== valid.length ? 'Solo se admiten imágenes de hasta 10 MB.' : ''
    const duplicateCount = valid.length - unique.length
    setError(issue || (duplicateCount ? 'Se omitieron archivos duplicados.' : (files.length + unique.length > 5 ? 'El límite es de cinco imágenes.' : '')))
  }

  const pickMapPoint = (event: PointerEvent<HTMLDivElement>) => {
    if (event.type === 'pointerdown' && event.button !== 0) return
    if (event.type === 'pointermove' && event.buttons !== 1) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width))
    const y = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height))
    const longitude = mapCenter.longitude - mapDelta + x * mapDelta * 2
    const latitude = mapCenter.latitude - mapDelta + (1 - y) * mapDelta * 2
    setCoordinates({ latitude, longitude })
    setLocationMessage('Punto seleccionado. Puedes mover el marcador o editar la dirección.')
  }

  const mapDelta = 0.025 * 16 / mapZoom
  const mapBounds = `${mapCenter.longitude - mapDelta},${mapCenter.latitude - mapDelta},${mapCenter.longitude + mapDelta},${mapCenter.latitude + mapDelta}`
  const markerLeft = coordinates ? Math.max(5, Math.min(95, ((coordinates.longitude - (mapCenter.longitude - mapDelta)) / (2 * mapDelta)) * 100)) : 50
  const markerTop = coordinates ? Math.max(5, Math.min(95, (1 - (coordinates.latitude - (mapCenter.latitude - mapDelta)) / (2 * mapDelta)) * 100)) : 50

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    const input: NewIncidentInput = {
      title: title.trim(),
      description: description.trim(),
      categoryId,
      address: address.trim(),
      ...(coordinates ?? {}),
    }
    if (demoMode) {
      const incidentId = onDemoCreate?.(input)
      if (incidentId) onCreated(incidentId)
      setIsSubmitting(false)
      return
    }
    try {
      const result = await apiRequest<CreateIncidentResponse>('/incidents', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(input),
      })
      onCreated(result.incident.id)
    } catch (requestError) {
      if (requestError instanceof ApiRequestError && requestError.status === 401) {
        onSessionExpired()
        return
      }
      setError(requestError instanceof Error ? requestError.message : 'No se pudo registrar la incidencia.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="portal-page" aria-labelledby="incident-form-heading">
      <div className="portal-page-heading">
        <button className="text-button" onClick={onCancel} type="button">← Volver al panel</button>
        <p className="portal-eyebrow">Nuevo reporte</p>
        <h1 id="incident-form-heading">Reportar una incidencia</h1>
        <p>Cuéntanos qué ocurre para que podamos dar seguimiento.</p>
      </div>
      <div className="incident-stepper" aria-label="Pasos del reporte"><span className={step === 'details' ? 'is-current' : ''}>1 <span>Detalles</span></span><span className={step === 'location' ? 'is-current' : ''}>2 <span>Ubicación</span></span><span className={step === 'review' ? 'is-current' : ''}>3 <span>Revisión</span></span></div>
      <form className="incident-form" onSubmit={submit}>
        {step === 'details' && <>
        <div className="form-field">
          <label htmlFor="incident-title">Título</label>
          <input id="incident-title" maxLength={120} minLength={3} onChange={(event) => setTitle(event.target.value)} required value={title} />
        </div>
        <div className="form-field">
          <label htmlFor="incident-category">Categoría</label>
          <select id="incident-category" onChange={(event) => setCategoryId(event.target.value)} required value={categoryId}>
            <option value="">Selecciona una categoría</option>
            {categories.filter(({ active }) => active).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          {categories.length === 0 && <span className="field-help">No hay categorías disponibles. Contacta a Administración.</span>}
        </div>
        <div className="form-field">
          <label htmlFor="incident-description">Descripción</label>
          <textarea id="incident-description" maxLength={5000} minLength={10} onChange={(event) => setDescription(event.target.value)} required rows={5} value={description} />
          <span className="field-help">Incluye detalles que ayuden a identificar y atender el problema.</span>
        </div>
        <div className="form-field">
          <label htmlFor="incident-evidence">Evidencias (opcional)</label>
          <input accept="image/*" id="incident-evidence" multiple onChange={(event) => { addFiles(event.currentTarget.files); event.currentTarget.value = '' }} type="file" />
          <span className="field-help">Hasta cinco imágenes, máximo 10 MB cada una. El servicio actual no recibe archivos y no se adjuntarán al reporte.</span>
          {filePreviews.length > 0 && (
            <div className="evidence-preview">
              {filePreviews.map(({ file, url }) => <figure key={`${file.name}-${file.lastModified}`}><img alt={`Vista previa: ${file.name}`} src={url} /><figcaption>{file.name}</figcaption><button aria-label={`Eliminar ${file.name}`} className="evidence-remove" onClick={() => setFiles((current) => current.filter((entry) => entry !== file))} type="button">×</button></figure>)}
            </div>
          )}
        </div>
        </>}
        {step === 'location' && <section className="location-step"><div className="form-field"><label htmlFor="incident-address">Dirección o referencia</label><input id="incident-address" maxLength={300} minLength={3} onChange={(event) => setAddress(event.target.value)} placeholder="Calle, parque o punto de referencia" required={step === 'location'} value={address} /><span className="field-help">Escribe una dirección o elige un punto aproximado en el mapa.</span></div><div className="map-toolbar"><span>Selecciona o mueve el punto en el mapa</span><div><button className="button-secondary" onClick={() => setMapZoom((zoom) => Math.min(20, zoom + 2))} type="button" aria-label="Acercar mapa">+</button><button className="button-secondary" onClick={() => setMapZoom((zoom) => Math.max(10, zoom - 2))} type="button" aria-label="Alejar mapa">−</button></div></div><div className="location-map" onKeyDown={(event) => { const offsets: Record<string, [number, number]> = { ArrowUp: [0.0002, 0], ArrowDown: [-0.0002, 0], ArrowLeft: [0, -0.0002], ArrowRight: [0, 0.0002] }; const offset = offsets[event.key]; if (!offset) return; event.preventDefault(); setCoordinates((point) => ({ latitude: (point?.latitude ?? mapCenter.latitude) + offset[0], longitude: (point?.longitude ?? mapCenter.longitude) + offset[1] })) }} onPointerDown={pickMapPoint} onPointerMove={pickMapPoint} role="application" aria-label="Mapa OpenStreetMap. Haz clic o usa las flechas para seleccionar la ubicación" tabIndex={0}><iframe title="Mapa de referencia OpenStreetMap" src={`https://www.openstreetmap.org/export/embed.html?bbox=${mapBounds}&layer=mapnik`} loading="lazy" /><button className="map-marker" style={{ left: `${markerLeft}%`, top: `${markerTop}%` }} type="button" aria-label="Marcador de ubicación; arrástralo o selecciona otro punto"><span /></button><div className="map-credit">© OpenStreetMap contributors</div></div><button className="text-button location-button" onClick={useCurrentLocation} type="button">Usar mi ubicación actual</button>{locationMessage && <span className="field-help" role="status">{locationMessage}</span>}{coordinates && <span className="coordinate-note">Coordenadas: {coordinates.latitude.toFixed(5)}, {coordinates.longitude.toFixed(5)}</span>}</section>}
        {step === 'review' && <section className="report-review"><h2>Revisa tu reporte</h2><dl><div><dt>Título</dt><dd>{title}</dd></div><div><dt>Categoría</dt><dd>{categories.find(({ id }) => id === categoryId)?.name}</dd></div><div><dt>Descripción</dt><dd>{description}</dd></div><div><dt>Ubicación</dt><dd>{address}{coordinates && <small>{coordinates.latitude.toFixed(5)}, {coordinates.longitude.toFixed(5)}</small>}</dd></div><div><dt>Evidencias seleccionadas</dt><dd>{files.length ? `${files.length} archivo(s), vista previa local` : 'Sin archivos'}</dd></div></dl><p className="field-help">{demoMode ? 'Este reporte se agregará solo a la vista de prueba.' : 'Las imágenes no se transmiten: el servicio actual no cuenta con una ruta de carga de evidencias.'}</p></section>}
        {error && <p className="portal-alert portal-alert--error" role="alert">{error}</p>}
        <div className="form-button-row">
          <button className="button-secondary" onClick={() => step === 'details' ? onCancel() : setStep(step === 'review' ? 'location' : 'details')} type="button">{step === 'details' ? 'Cancelar' : 'Atrás'}</button>
          {step === 'details' && <button className="button-primary" onClick={() => { setError(''); setStep('location') }} type="button" disabled={!title.trim() || !categoryId || description.trim().length < 10}>Continuar a ubicación</button>}
          {step === 'location' && <button className="button-primary" onClick={() => { setError(''); setStep('review') }} type="button" disabled={!address.trim() || address.trim().length < 3}>Revisar reporte</button>}
          {step === 'review' && <button className="button-primary" disabled={isSubmitting || categories.filter(({ active }) => active).length === 0} type="submit">{isSubmitting ? 'Enviando…' : 'Confirmar y enviar'}</button>}
        </div>
      </form>
    </section>
  )
}
