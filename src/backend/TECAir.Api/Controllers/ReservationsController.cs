using Microsoft.AspNetCore.Mvc;
using TECAir.Application.DTOs.Reservations;
using TECAir.Application.Interfaces;

namespace TECAir.Api.Controllers;

// Controller de reservaciones.
// Traduce resultados del servicio a HTTP sin conocer SQL ni reglas internas.
[ApiController]
[Route("api/reservations")]
public class ReservationsController(IReservationService reservationService) : ControllerBase
{
    // POST /api/reservations
    // Crea una reservacion pagada para un usuario, pasajero e itinerario.
    [HttpPost]
    public async Task<ActionResult<ReservationResponse>> Create(
        CreateReservationRequest request,
        CancellationToken cancellationToken)
    {
        var result = await reservationService.CreateAsync(request, cancellationToken);
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

        return Created(
            $"/api/reservations/{result.Reservation!.ReservationId}",
            result.Reservation);
    }

    // GET /api/reservations/search?reservationId=...&passengerId=...&name=...
    // Permite localizar reservaciones por id exacto, pasaporte exacto o nombre parcial.
    [HttpGet("search")]
    public async Task<ActionResult<IReadOnlyList<ReservationSearchResponse>>> Search(
        [FromQuery] int? reservationId,
        [FromQuery] string? passengerId,
        [FromQuery] string? name,
        CancellationToken cancellationToken)
    {
        var result = await reservationService.SearchAsync(
            reservationId,
            passengerId,
            name,
            cancellationToken);
        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.ErrorMessage });
        }

        return Ok(result.Reservations);
    }
}
