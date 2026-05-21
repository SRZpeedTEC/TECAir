using Microsoft.AspNetCore.Mvc;
using TECAir.Application.DTOs.Flights;
using TECAir.Application.Interfaces;

namespace TECAir.Api.Controllers;

// Este controller expone los endpoints HTTP de vuelos.
// La logica de negocio queda en FlightService; aqui solo se traducen resultados
// a respuestas como 201 Created, 400 Bad Request, 404 Not Found o 409 Conflict.
[ApiController]
[Route("api/flights")]
public class FlightsController(IFlightService flightService) : ControllerBase
{
    // POST /api/flights
    // Recibe el DTO del body y delega la creacion al servicio de aplicacion.
    [HttpPost]
    public async Task<ActionResult<FlightResponse>> Create(
        CreateFlightRequest request,
        CancellationToken cancellationToken)
    {
        var result = await flightService.CreateAsync(request, cancellationToken);
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

        return Created($"/api/flights/{result.Flight!.FlightId}", result.Flight);
    }

    // GET /api/flights/by-departure?departureCode=XXX&state=YYY
    // Consulta vuelos por aeropuerto de salida filtrados por estado.
    // state acepta UPCOMING (vuelos para armar itinerarios) u OPEN (vuelos
    // ya publicados que pueden listarse o editarse). CLOSED no se expone aqui.
    [HttpGet("by-departure")]
    public async Task<ActionResult<IReadOnlyList<OpenFlightResponse>>> GetByDepartureAirportAndState(
        [FromQuery] string? departureCode,
        [FromQuery] string? state,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(departureCode))
        {
            return BadRequest(new { message = "Query parameter 'departureCode' is required." });
        }

        if (string.IsNullOrWhiteSpace(state))
        {
            return BadRequest(new { message = "Query parameter 'state' is required." });
        }

        var normalizedState = state.Trim().ToUpperInvariant();
        if (normalizedState is not "UPCOMING" and not "OPEN")
        {
            return BadRequest(new { message = "Query parameter 'state' must be UPCOMING or OPEN." });
        }

        var flights = await flightService.GetByDepartureAirportAndStateAsync(
            departureCode,
            normalizedState,
            cancellationToken);
        return Ok(flights);
    }

    // PUT /api/flights/{flightId}
    // Actualiza el vuelo sin permitir cambios al flight_id.
    [HttpPut("{flightId:int}")]
    public async Task<ActionResult<FlightResponse>> Update(
        int flightId,
        UpdateFlightRequest request,
        CancellationToken cancellationToken)
    {
        var result = await flightService.UpdateAsync(flightId, request, cancellationToken);
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

        return Ok(result.Flight);
    }

    // DELETE /api/flights/{flightId}
    // No borra vuelos usados por itinerarios para proteger rutas existentes.
    [HttpDelete("{flightId:int}")]
    public async Task<IActionResult> Delete(
        int flightId,
        CancellationToken cancellationToken)
    {
        var result = await flightService.DeleteAsync(flightId, cancellationToken);
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
