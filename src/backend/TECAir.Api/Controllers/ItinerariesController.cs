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
    // Devuelve el detalle de un itinerario junto con sus vuelos ordenados.
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ItineraryDetailsResponse>> GetById(
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
}
