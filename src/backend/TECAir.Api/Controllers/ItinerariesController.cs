using Microsoft.AspNetCore.Mvc;
using TECAir.Application.DTOs.Itineraries;
using TECAir.Application.Interfaces;

namespace TECAir.Api.Controllers;

// Controller encargado de exponer los casos de uso de itinerarios por HTTP.
// Mantiene fuera la logica de negocio y traduce resultados del servicio a codigos HTTP.
[ApiController]
[Route("api/itineraries")]
public class ItinerariesController(IItineraryService itineraryService) : ControllerBase
{
    // GET /api/itineraries/origin-dest
    // Vista admin: devuelve itinerarios en edicion y publicos con origen, destino y horarios resumidos.
    [HttpGet("origin-dest")]
    public async Task<ActionResult<IReadOnlyList<ItinerarySummaryResponse>>> GetAllOriginDest(
        CancellationToken cancellationToken)
    {
        var itineraries = await itineraryService.GetAllOriginDestAsync(cancellationToken);
        return Ok(itineraries);
    }

    // GET /api/itineraries/public/with-promotions
    // Vista usuario: devuelve solo itinerarios publicos resumidos con promocion activa opcional.
    [HttpGet("public/with-promotions")]
    public async Task<ActionResult<IReadOnlyList<ItineraryWithPromotionSummaryResponse>>> GetPublicWithPromotions(
        [FromQuery] string? originCode,
        [FromQuery] string? destinationCode,
        CancellationToken cancellationToken)
    {
        var itineraries = await itineraryService.GetPublicWithPromotionsAsync(
            originCode,
            destinationCode,
            cancellationToken);
        return Ok(itineraries);
    }

    // GET /api/itineraries/search?originCode=...&destinationCode=...
    // Busca itinerarios cuyo primer vuelo salga del origen y cuyo ultimo vuelo llegue al destino.
    [HttpGet("search")]
    public async Task<ActionResult<IReadOnlyList<ItinerarySearchResponse>>> Search(
        [FromQuery] string? originCode,
        [FromQuery] string? destinationCode,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(originCode))
        {
            return BadRequest(new { message = "Query parameter 'originCode' is required." });
        }

        if (string.IsNullOrWhiteSpace(destinationCode))
        {
            return BadRequest(new { message = "Query parameter 'destinationCode' is required." });
        }

        var itineraries = await itineraryService.SearchAsync(originCode, destinationCode, cancellationToken);
        return Ok(itineraries);
    }

    // GET /api/itineraries/{id}
    // Devuelve el resumen de un itinerario.
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ItineraryWithPromotionSummaryResponse>> GetById(
        int id,
        CancellationToken cancellationToken)
    {
        if (id <= 0)
        {
            return BadRequest(new { message = "Itinerary id must be greater than 0." });
        }

        var itinerary = await itineraryService.GetByIdAsync(id, cancellationToken);
        if (itinerary is null)
        {
            return NotFound(new { message = $"Itinerary '{id}' was not found." });
        }

        return Ok(itinerary);
    }

    // POST /api/itineraries
    // Crea un itinerario con una lista ordenada de vuelos existentes.
    [HttpPost]
    public async Task<ActionResult<CreateItineraryResponse>> Create(
        CreateItineraryRequest request,
        CancellationToken cancellationToken)
    {
        var result = await itineraryService.CreateAsync(request, cancellationToken);
        if (!result.IsSuccess)
        {
            if (result.IsNotFound)
            {
                return NotFound(new { message = result.ErrorMessage });
            }

            if (result.IsConflict)
            {
                return Conflict(new { message = result.ErrorMessage });
            }

            return BadRequest(new { message = result.ErrorMessage });
        }

        return Created($"/api/itineraries/{result.Itinerary!.ItineraryId}", result.Itinerary);
    }

    // PUT /api/itineraries/{itineraryId}
    // Reemplaza precio y lista de vuelos; el id se mantiene como llave primaria de la ruta.
    [HttpPut("{itineraryId:int}")]
    public async Task<ActionResult<CreateItineraryResponse>> Update(
        int itineraryId,
        UpdateItineraryRequest request,
        CancellationToken cancellationToken)
    {
        var result = await itineraryService.UpdateAsync(itineraryId, request, cancellationToken);
        if (!result.IsSuccess)
        {
            if (result.IsNotFound)
            {
                return NotFound(new { message = result.ErrorMessage });
            }

            if (result.IsConflict)
            {
                return Conflict(new { message = result.ErrorMessage });
            }

            return BadRequest(new { message = result.ErrorMessage });
        }

        return Ok(result.Itinerary);
    }

    // DELETE /api/itineraries/{itineraryId}
    // Solo elimina itinerarios sin reservaciones para no perder historial de ventas.
    [HttpDelete("{itineraryId:int}")]
    public async Task<IActionResult> Delete(
        int itineraryId,
        CancellationToken cancellationToken)
    {
        var result = await itineraryService.DeleteAsync(itineraryId, cancellationToken);
        if (!result.IsSuccess)
        {
            if (result.IsNotFound)
            {
                return NotFound(new { message = result.ErrorMessage });
            }

            if (result.IsConflict)
            {
                return Conflict(new { message = result.ErrorMessage });
            }
        }

        return NoContent();
    }
}
