using Microsoft.AspNetCore.Mvc;
using TECAir.Application.DTOs.Passengers;
using TECAir.Application.Interfaces;

namespace TECAir.Api.Controllers;

// Controller de pasajeros.
// Expone el endpoint HTTP y deja las validaciones de negocio al servicio.
[ApiController]
[Route("api/passengers")]
public class PassengersController(IPassengerService passengerService) : ControllerBase
{
    // POST /api/passengers
    // Crea el pasajero que luego puede asociarse a una reservacion.
    [HttpPost]
    public async Task<ActionResult<PassengerResponse>> Create(
        CreatePassengerRequest request,
        CancellationToken cancellationToken)
    {
        var result = await passengerService.CreateAsync(request, cancellationToken);
        if (!result.IsSuccess)
        {
            if (result.IsConflict)
            {
                return Conflict(new { message = result.ErrorMessage });
            }

            return BadRequest(new { message = result.ErrorMessage });
        }

        return Created($"/api/passengers/{Uri.EscapeDataString(result.Passenger!.PassportId)}", result.Passenger);
    }
}
