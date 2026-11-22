import { useEffect, useMemo, useState, type FormEvent } from 'react'
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
  const [files, setFiles] = useState<File[]>([])
  const [locationMessage, setLocationMessage] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
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
        setCoordinates({ latitude: coords.latitude, longitude: coords.longitude })
        setLocationMessage('Ubicación agregada. Confirma la dirección antes de enviar.')
      },
      () => setLocationMessage('No pudimos obtener tu ubicación. Puedes completar la dirección manualmente.'),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

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
      {demoMode && <p className="portal-alert portal-alert--demo" role="status">Modo DEMO: el formulario sirve para explorar y no se guarda ni se envía al backend.</p>}
      <div className="portal-page-heading">
        <button className="text-button" onClick={onCancel} type="button">← Volver al panel</button>
        <p className="portal-eyebrow">Nuevo reporte</p>
        <h1 id="incident-form-heading">Reportar una incidencia</h1>
        <p>Cuéntanos qué ocurre para que podamos dar seguimiento.</p>
      </div>
      <form className="incident-form" onSubmit={submit}>
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
          <label htmlFor="incident-address">Dirección o referencia</label>
          <input id="incident-address" maxLength={300} minLength={3} onChange={(event) => setAddress(event.target.value)} placeholder="Calle, parque o punto de referencia" required value={address} />
          <button className="text-button location-button" onClick={useCurrentLocation} type="button">Usar mi ubicación actual</button>
          {locationMessage && <span className="field-help" role="status">{locationMessage}</span>}
          {coordinates && <span className="coordinate-note">Coordenadas: {coordinates.latitude.toFixed(5)}, {coordinates.longitude.toFixed(5)}</span>}
        </div>
        <div className="form-field">
          <label htmlFor="incident-evidence">Evidencias (opcional)</label>
          <input accept="image/*" id="incident-evidence" multiple onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, 5))} type="file" />
          <span className="field-help">Puedes previsualizar hasta cinco imágenes. El servicio actual no recibe archivos; no se adjuntarán al reporte.</span>
          {filePreviews.length > 0 && (
            <div className="evidence-preview">
              {filePreviews.map(({ file, url }) => <figure key={`${file.name}-${file.lastModified}`}><img alt={`Vista previa: ${file.name}`} src={url} /><figcaption>{file.name}</figcaption></figure>)}
            </div>
          )}
        </div>
        {error && <p className="portal-alert portal-alert--error" role="alert">{error}</p>}
        <div className="form-button-row">
          <button className="button-secondary" onClick={onCancel} type="button">Cancelar</button>
          <button className="button-primary" disabled={isSubmitting || categories.filter(({ active }) => active).length === 0} type="submit">{isSubmitting ? 'Enviando…' : 'Enviar reporte'}</button>
        </div>
      </form>
    </section>
  )
}
