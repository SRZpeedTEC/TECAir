using Microsoft.AspNetCore.Mvc;
using TECAir.Application.DTOs.Airports;
using TECAir.Application.Interfaces;

namespace TECAir.Api.Controllers;

[ApiController]
[Route("api/airports")]
public class AirportsController(IAirportService airportService) : ControllerBase
{
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
