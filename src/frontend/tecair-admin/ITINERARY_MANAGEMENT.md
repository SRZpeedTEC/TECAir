# Gestión de Itinerarios — Notas para Backend

La vista de **Gestión de Itinerarios** del panel admin consume los endpoints actuales del
`ItinerariesController`. Soporta crear (constructor visual), consultar (por origen+destino),
editar y eliminar.

## Endpoint pendiente: `GET /api/itineraries`

La pestaña **Consultar** hoy usa como fallback `GET /api/itineraries/search?originCode=&destinationCode=`,
que tiene dos limitaciones idénticas a las de Gestión de Vuelos:

1. Obliga a indicar origen Y destino concretos.
2. No permite ver la lista global de itinerarios.

### Propuesta

```
GET /api/itineraries
```

**Query parameters (todos opcionales):**

| Param            | Tipo            | Descripción                                          |
|------------------|-----------------|------------------------------------------------------|
| `originCode`     | string (IATA)   | Filtrar por aeropuerto de origen                     |
| `destinationCode`| string (IATA)   | Filtrar por aeropuerto de destino                    |
| `priceMin`       | decimal         | Precio mínimo                                        |
| `priceMax`       | decimal         | Precio máximo                                        |
| `totalFlights`   | int             | Filtrar por cantidad exacta de tramos (1 = directos) |
| `from`           | ISO datetime    | Salida >= from                                       |
| `to`             | ISO datetime    | Salida <= to                                         |
| `page`           | int (default 1) | Paginación                                           |
| `pageSize`       | int (default 50, máx 200) | Tamaño de página                           |

**Response shape (reutilizar `ItinerarySearchResponse`):**

```json
{
  "items": [
    {
      "itineraryId": 12,
      "price": 245000,
      "originCode": "SJO",
      "destinationCode": "MAD",
      "totalFlights": 2,
      "departureDatetime": "2026-06-01T14:30:00",
      "arrivalDatetime":   "2026-06-02T08:15:00"
    }
  ],
  "page": 1,
  "pageSize": 50,
  "total": 87
}
```

### Cómo lo consumirá el frontend

`src/services/itineraryService.js` ya expone `searchItineraries(origin, destination)`. Cuando exista
el endpoint nuevo se agregará `listItineraries(filters)` y `ItineraryListTab` cambiará la llamada.
La UI no requiere cambios estructurales.

## Endpoints ya usados

| Operación  | Verbo  | Ruta                                              | Servicio frontend     |
|-----------|--------|----------------------------------------------------|-----------------------|
| Crear     | POST   | `/api/itineraries`                                 | `createItinerary`     |
| Consultar | GET    | `/api/itineraries/search?originCode=&destinationCode=` | `searchItineraries`   |
| Detalle   | GET    | `/api/itineraries/{id}`                            | `getItineraryById`    |
| Editar    | PUT    | `/api/itineraries/{id}`                            | `updateItinerary`     |
| Eliminar  | DELETE | `/api/itineraries/{id}`                            | `deleteItinerary`     |

## Cómo construye la cadena el constructor visual

1. El admin elige el aeropuerto de salida → se llama `GET /api/flights/by-departure?departureCode=XXX&state=UPCOMING`.
2. Cada vuelo seleccionado se agrega como "leg". El siguiente picker filtra `flights/by-departure` por el
   aeropuerto de llegada del último leg, y client-side aplica:
   - `departureDatetime >= arrivalDatetime` del leg anterior.
   - `departureDatetime - arrivalDatetime <= 24 horas` (regla del `ItineraryService`).
3. Al pulsar "Crear" se envía a `POST /api/itineraries`:
   ```json
   {
     "price": 245000,
     "flights": [
       { "flightId": 12, "flightOrder": 1 },
       { "flightId": 18, "flightOrder": 2 }
     ]
   }
   ```

### Limitación conocida: `ItineraryFlightResponse` no incluye `planePlate`

`GET /api/itineraries/{id}` devuelve cada vuelo sin la matrícula del avión. Al editar un itinerario
existente, el chip muestra el vuelo sin el plate. **No es bloqueante**: la edición funciona porque el
backend identifica el vuelo por `flightId`. Si el equipo de backend agrega `planePlate` al
`ItineraryFlightResponse`, el chip lo mostraría sin cambios adicionales en el front.
