import { apiFetch, BASE_URL } from './api.js';

// Normaliza una promoción del backend a camelCase consistente.
// Backend: { promotionCode, itineraryId, imageUrl, startDate, endDate, discountPercent, promoPrice }
// startDate / endDate llegan como "YYYY-MM-DD" (DateOnly).
function normalizePromotion(p) {
  return {
    promotionCode:   p.promotionCode   ?? p.PromotionCode,
    itineraryId:     p.itineraryId     ?? p.ItineraryId,
    imageUrl:        p.imageUrl        ?? p.ImageUrl ?? null,
    startDate:       p.startDate       ?? p.StartDate,
    endDate:         p.endDate         ?? p.EndDate,
    discountPercent: Number(p.discountPercent ?? p.DiscountPercent),
    promoPrice:      Number(p.promoPrice      ?? p.PromoPrice),
  };
}

// GET /api/promotions
export async function getAllPromotions() {
  const data = await apiFetch('/promotions');
  return data.map(normalizePromotion);
}

// GET /api/promotions/{code}
export async function getPromotionByCode(code) {
  const data = await apiFetch(`/promotions/${encodeURIComponent(code)}`);
  return normalizePromotion(data);
}

// POST /api/promotions
// payload: { promotionCode, itineraryId, imageUrl?, startDate, endDate, discountPercent, promoPrice }
export async function createPromotion(payload) {
  const data = await apiFetch('/promotions', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
  return normalizePromotion(data);
}

// PUT /api/promotions/{code}
export async function updatePromotion(code, payload) {
  const data = await apiFetch(`/promotions/${encodeURIComponent(code)}`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
  return normalizePromotion(data);
}

// POST /api/promotions/upload-image
// Sube un File como multipart/form-data y devuelve la URL publica que
// devolvio el backend (para guardar luego en imageUrl de la promocion).
export async function uploadPromotionImage(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${BASE_URL}/promotions/upload-image`, {
    method: 'POST',
    body:   formData,
  });
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try {
      const body = await res.json();
      if (body?.message) msg = body.message;
    } catch { /* sin body json */ }
    throw new Error(msg);
  }
  const data = await res.json();
  return data.imageUrl ?? data.ImageUrl;
}

// DELETE /api/promotions/{code}
// Devuelve 204 No Content → no usamos apiFetch (que hace res.json()).
export async function deletePromotion(code) {
  const res = await fetch(`${BASE_URL}/promotions/${encodeURIComponent(code)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try {
      const body = await res.json();
      if (body?.message) msg = body.message;
    } catch { /* sin body json */ }
    throw new Error(msg);
  }
  return true;
}
