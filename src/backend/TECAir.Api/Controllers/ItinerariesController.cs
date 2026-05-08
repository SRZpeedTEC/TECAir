using Microsoft.AspNetCore.Mvc;
using TECAir.Application.DTOs.Itineraries;
using TECAir.Application.Interfaces;

namespace TECAir.Api.Controllers;

[ApiController]
[Route("api/itineraries")]
public class ItinerariesController(IItineraryService itineraryService) : ControllerBase
{
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
}
