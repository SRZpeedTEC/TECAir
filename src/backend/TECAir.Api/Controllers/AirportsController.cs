using Microsoft.AspNetCore.Mvc;
using TECAir.Application.DTOs.Airports;
using TECAir.Application.Interfaces;

namespace TECAir.Api.Controllers;

// Controller encargado de endpoints HTTP relacionados con aeropuertos.
// Valida parametros basicos de la request y delega la busqueda al servicio.
[ApiController]
[Route("api/airports")]
public class AirportsController(IAirportService airportService) : ControllerBase
{
    // GET /api/airports/search?term=...
    // Busca aeropuertos por nombre, ciudad, pais o codigo.
    [HttpGet("search")]
    public async Task<ActionResult<IReadOnlyList<AirportSearchResponse>>> Search(
        [FromQuery] string? term,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(term))
        {
            return BadRequest(new { message = "Query parameter 'term' is required." });
        }

        var airports = await airportService.SearchAsync(term, cancellationToken);
        return Ok(airports);
    }
}
