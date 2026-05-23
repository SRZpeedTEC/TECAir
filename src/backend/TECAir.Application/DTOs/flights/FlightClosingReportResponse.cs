namespace TECAir.Application.DTOs.Flights;

// Datos consolidados para el reporte operativo de cierre de vuelo.
public class FlightClosingReportResponse
{
    public FlightClosingReportFlight Flight { get; set; } = new();
    public IReadOnlyList<FlightClosingReportItinerary> Itineraries { get; set; } = [];
    public IReadOnlyList<FlightClosingReportPassenger> Passengers { get; set; } = [];
    public FlightClosingReportSummary Summary { get; set; } = new();
}

public class FlightClosingReportFlight
{
    public int FlightId { get; set; }
    public string DepartureAirportCode { get; set; } = string.Empty;
    public string DepartureAirportName { get; set; } = string.Empty;
    public string DepartureAirportCity { get; set; } = string.Empty;
    public string ArrivalAirportCode { get; set; } = string.Empty;
    public string ArrivalAirportName { get; set; } = string.Empty;
    public string ArrivalAirportCity { get; set; } = string.Empty;
    public DateTime DepartureDatetime { get; set; }
    public DateTime ArrivalDatetime { get; set; }
    public string? Gate { get; set; }
    public string PlanePlate { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
}

public class FlightClosingReportItinerary
{
    public int ItineraryId { get; set; }
    public int FlightOrder { get; set; }
}

public class FlightClosingReportPassenger
{
    public int ItineraryId { get; set; }
    public int FlightOrder { get; set; }
    public string PassengerFullName { get; set; } = string.Empty;
    public string PassengerPassportId { get; set; } = string.Empty;
    public int ReservationId { get; set; }
    public string ReservationState { get; set; } = string.Empty;
    public int? ConfirmationNumber { get; set; }
    public string? SeatNumber { get; set; }
    public string? CheckInPlanePlate { get; set; }
    public int BaggageCount { get; set; }
    public decimal TotalBaggageWeight { get; set; }
    public IReadOnlyList<string> BaggageColors { get; set; } = [];
    public IReadOnlyList<int> BagNumbers { get; set; } = [];
    public decimal ExtraBaggageCharge { get; set; }
}

public class FlightClosingReportSummary
{
    public int TotalPassengers { get; set; }
    public int TotalReservations { get; set; }
    public int TotalCheckedInPassengers { get; set; }
    public int TotalBaggageCount { get; set; }
    public decimal TotalBaggageWeight { get; set; }
    public decimal TotalExtraBaggageCharges { get; set; }
}
