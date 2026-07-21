// Cliente mínimo de la API local.
async function pedir(url, opciones) {
  const res = await fetch(url, opciones);
  if (!res.ok) {
    const cuerpo = await res.json().catch(() => ({}));
    throw new Error(cuerpo.error || `Error ${res.status}`);
  }
  return res.json();
}

export const api = {
  estado: () => pedir('/api/estado'),
  cola: (limite = 20) => pedir(`/api/repaso/cola?limite=${limite}`),
  responder: (cardId, resultado) => pedir('/api/repaso/responder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cardId, resultado })
  }),
  importar: () => pedir('/api/importar', { method: 'POST' }),
  biblioteca: () => pedir('/api/biblioteca'),
  ejercicios: () => pedir('/api/ejercicios'),
  registrarEjercicio: () => pedir('/api/ejercicios/resultado', { method: 'POST' }),
  dashboard: () => pedir('/api/dashboard')
};
