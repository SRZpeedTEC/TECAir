using Microsoft.AspNetCore.Mvc;
using TECAir.Application.DTOs.Seats;
using TECAir.Application.Interfaces;

namespace TECAir.Api.Controllers;

// Controller para endpoints de asientos.
// La disponibilidad depende del vuelo, pero el recurso expuesto sigue siendo Seat.
[ApiController]
[Route("api/seats")]
public class SeatController(ISeatService seatService) : ControllerBase
{
    // GET /api/seats/available/{flightId}
    // Devuelve asientos libres segun los check-ins reales del vuelo.
    [HttpGet("available/{flightId:int}")]
    public async Task<ActionResult<IReadOnlyList<AvailableSeatResponse>>> GetAvailableSeats(
        int flightId,
        CancellationToken cancellationToken)
    {
        var result = await seatService.GetAvailableSeatsAsync(flightId, cancellationToken);
        if (!result.IsSuccess)
        {
            return NotFound(new { message = result.ErrorMessage });
        }

        return Ok(result.Seats);
    }
}
