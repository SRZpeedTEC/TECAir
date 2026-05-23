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
    // GET /api/flights
    // Lista vuelos registrados; si no hay query params, funciona como get all.
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<FlightResponse>>> GetAll(
        [FromQuery] int? flightId,
        [FromQuery] string? departureCode,
        [FromQuery] string? arrivalCode,
        [FromQuery] string? state,
        [FromQuery] DateOnly? departureDate,
        CancellationToken cancellationToken)
    {
        var result = await flightService.SearchAsync(
            new FlightSearchFilters
            {
                FlightId = flightId,
                DepartureCode = departureCode,
                ArrivalCode = arrivalCode,
                State = state,
                DepartureDate = departureDate
            },
            cancellationToken);

        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.ErrorMessage });
        }

        return Ok(result.Flights);
    }

    // GET /api/flights/{flightId}
    // Consulta un vuelo puntual por id.
    [HttpGet("{flightId:int}")]
    public async Task<ActionResult<FlightResponse>> GetById(
        int flightId,
        CancellationToken cancellationToken)
    {
        var flight = await flightService.GetByIdAsync(flightId, cancellationToken);
        if (flight is null)
        {
            return NotFound(new { message = $"Flight '{flightId}' was not found." });
        }

        return Ok(flight);
    }

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

    // GET /api/flights/search?state=YYY&departureCode=XXX&arrivalCode=ZZZ
    // Lista vuelos de una ruta especifica (origen+destino) en un estado dado.
    // Lo usan las pantallas de Apertura (state=UPCOMING) y Cierre (state=OPEN).
    [HttpGet("search")]
    public async Task<ActionResult<IReadOnlyList<OpenFlightResponse>>> SearchByRouteAndState(
        [FromQuery] string? state,
        [FromQuery] string? departureCode,
        [FromQuery] string? arrivalCode,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(state))
        {
            return BadRequest(new { message = "Query parameter 'state' is required." });
        }

        if (string.IsNullOrWhiteSpace(departureCode))
        {
            return BadRequest(new { message = "Query parameter 'departureCode' is required." });
        }

        if (string.IsNullOrWhiteSpace(arrivalCode))
        {
            return BadRequest(new { message = "Query parameter 'arrivalCode' is required." });
        }

        var normalizedState = state.Trim().ToUpperInvariant();
        if (normalizedState is not "UPCOMING" and not "OPEN")
        {
            return BadRequest(new { message = "Query parameter 'state' must be UPCOMING or OPEN." });
        }

        if (departureCode.Trim().Equals(arrivalCode.Trim(), StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "Departure and arrival airports must be different." });
        }

        var flights = await flightService.SearchByRouteAndStateAsync(
            normalizedState,
            departureCode,
            arrivalCode,
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

    // PATCH /api/flights/{flightId}/state
    // Aplica una transicion de estado controlada. Reglas validas:
    //   UPCOMING -> OPEN (apertura de vuelo)
    //   OPEN     -> CLOSED (cierre de vuelo)
    // Cualquier otra transicion devuelve 409 Conflict.
    [HttpPatch("{flightId:int}/state")]
    public async Task<ActionResult<FlightResponse>> TransitionState(
        int flightId,
        UpdateFlightStateRequest request,
        CancellationToken cancellationToken)
    {
        var result = await flightService.TransitionStateAsync(flightId, request, cancellationToken);
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
