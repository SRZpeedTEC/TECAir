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
    // GET /api/itineraries/with-promotions
    // Vista admin: devuelve itinerarios en edicion y publicos con promocion opcional y vuelos.
    [HttpGet("with-promotions")]
    public async Task<ActionResult<IReadOnlyList<ItineraryDetailsResponse>>> GetAllWithPromotions(
        CancellationToken cancellationToken)
    {
        var itineraries = await itineraryService.GetAllWithPromotionsAsync(cancellationToken);
        return Ok(itineraries);
    }

    // GET /api/itineraries/public/with-promotions
    // Vista usuario: devuelve solo itinerarios publicos con promocion opcional y vuelos.
    [HttpGet("public/with-promotions")]
    public async Task<ActionResult<IReadOnlyList<ItineraryDetailsResponse>>> GetPublicWithPromotions(
        CancellationToken cancellationToken)
    {
        var itineraries = await itineraryService.GetPublicWithPromotionsAsync(cancellationToken);
        return Ok(itineraries);
    }

    // GET /api/itineraries/search
    // Busqueda cliente: todos los filtros son opcionales y solo devuelve PUBLIC.
    [HttpGet("search")]
    public async Task<ActionResult<IReadOnlyList<ItinerarySearchResponse>>> Search(
        [FromQuery] string? departureCode,
        [FromQuery] string? arrivalCode,
        [FromQuery] DateOnly? departureDate,
        [FromQuery] string? stops,
        [FromQuery] string? sortBy,
        [FromQuery] string? originCode,
        [FromQuery] string? destinationCode,
        CancellationToken cancellationToken)
    {
        var result = await itineraryService.SearchAsync(
            new ItinerarySearchFilters
            {
                DepartureCode = departureCode ?? originCode,
                ArrivalCode = arrivalCode ?? destinationCode,
                DepartureDate = departureDate,
                Stops = stops,
                SortBy = sortBy
            },
            cancellationToken);

        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.ErrorMessage });
        }

        return Ok(result.Itineraries);
    }

    // GET /api/itineraries/admin/search
    // Busqueda administrativa: puede devolver EDITION, PUBLIC y CLOSED.
    [HttpGet("admin/search")]
    public async Task<ActionResult<IReadOnlyList<ItinerarySearchResponse>>> SearchAdmin(
        [FromQuery] int? itineraryId,
        [FromQuery] string? departureCode,
        [FromQuery] string? arrivalCode,
        [FromQuery] string? state,
        CancellationToken cancellationToken)
    {
        var result = await itineraryService.SearchAdminAsync(
            new ItinerarySearchFilters
            {
                ItineraryId = itineraryId,
                DepartureCode = departureCode,
                ArrivalCode = arrivalCode,
                State = state
            },
            cancellationToken);

        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.ErrorMessage });
        }

        return Ok(result.Itineraries);
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

    // GET /api/itineraries/{itineraryId}/availability?passengers=...
    // Ayuda al frontend a validar cupos; POST /api/reservations vuelve a validar.
    [HttpGet("{itineraryId:int}/availability")]
    public async Task<ActionResult<ItineraryAvailabilityResponse>> GetAvailability(
        int itineraryId,
        [FromQuery] int? passengers,
        CancellationToken cancellationToken)
    {
        if (passengers is null)
        {
            return BadRequest(new { message = "Query parameter 'passengers' is required." });
        }

        var result = await itineraryService.GetAvailabilityAsync(
            itineraryId,
            passengers.Value,
            cancellationToken);

        if (!result.IsSuccess)
        {
            if (result.IsNotFound)
            {
                return NotFound(new { message = result.ErrorMessage });
            }

            return BadRequest(new { message = result.ErrorMessage });
        }

        return Ok(result.Availability);
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
