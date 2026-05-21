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

    // GET /api/airports/connection?from=XXX&to=YYY
    // Devuelve la distancia en millas y la duracion estimada para la ruta indicada.
    // El frontend lo usa para mostrar la llegada calculada antes de crear el vuelo.
    // 404 si no hay una conexion configurada entre ambos aeropuertos.
    [HttpGet("connection")]
    public async Task<ActionResult<AirportConnectionResponse>> GetConnection(
        [FromQuery] string? from,
        [FromQuery] string? to,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(from))
        {
            return BadRequest(new { message = "Query parameter 'from' is required." });
        }

        if (string.IsNullOrWhiteSpace(to))
        {
            return BadRequest(new { message = "Query parameter 'to' is required." });
        }

        if (from.Trim().Equals(to.Trim(), StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "Departure and arrival airports must be different." });
        }

        var connection = await airportService.GetConnectionAsync(from, to, cancellationToken);
        if (connection is null)
        {
            return NotFound(new { message = $"There is no configured airport connection for {from.Trim().ToUpperInvariant()} to {to.Trim().ToUpperInvariant()}." });
        }

        return Ok(connection);
    }
}
