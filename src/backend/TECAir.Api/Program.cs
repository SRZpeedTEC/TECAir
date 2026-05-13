using Npgsql;
using TECAir.Application.Interfaces;
using TECAir.Application.Services;
using TECAir.Infrastructure.Repositories;
// Publsh command on TECAir.Api: dotnet publish -c Release -o ./publish

// Program.cs configura la aplicacion web.
// Aqui se registran controllers, conexion a PostgreSQL, servicios y repositorios.
var builder = WebApplication.CreateBuilder(args);

// Agrega soporte para controllers y para descubrir endpoints de la API.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// La cadena de conexion se lee desde appsettings.json o variables de entorno.
// Si no existe, la API falla al arrancar para evitar errores mas dificiles luego.
var connectionString = builder.Configuration.GetConnectionString("TECAirDatabase")
    ?? throw new InvalidOperationException("Connection string 'TECAirDatabase' was not found.");

// NpgsqlDataSource administra el pool de conexiones a PostgreSQL.
builder.Services.AddSingleton(_ => new NpgsqlDataSourceBuilder(connectionString).Build());

// Inyeccion de dependencias: los controllers piden interfaces y ASP.NET
// entrega las implementaciones concretas de servicios y repositorios.
builder.Services.AddScoped<IAirportRepository, PostgresAirportRepository>();
builder.Services.AddScoped<IAirportService, AirportService>();
builder.Services.AddScoped<IBaggageRepository, PostgresBaggageRepository>();
builder.Services.AddScoped<IBaggageService, BaggageService>();
builder.Services.AddScoped<ICheckInRepository, PostgresCheckInRepository>();
builder.Services.AddScoped<ICheckInService, CheckInService>();
builder.Services.AddScoped<IFlightRepository, PostgresFlightRepository>();
builder.Services.AddScoped<IFlightService, FlightService>();
builder.Services.AddScoped<IItineraryRepository, PostgresItineraryRepository>();
builder.Services.AddScoped<IItineraryService, ItineraryService>();
builder.Services.AddScoped<IPassengerRepository, PostgresPassengerRepository>();
builder.Services.AddScoped<IPassengerService, PassengerService>();
builder.Services.AddScoped<IPlaneRepository, PostgresPlaneRepository>();
builder.Services.AddScoped<IPlaneService, PlaneService>();
builder.Services.AddScoped<IPromotionRepository, PostgresPromotionRepository>();
builder.Services.AddScoped<IPromotionService, PromotionService>();
builder.Services.AddScoped<IReservationRepository, PostgresReservationRepository>();
builder.Services.AddScoped<IReservationService, ReservationService>();
builder.Services.AddScoped<ISeatRepository, PostgresSeatRepository>();
builder.Services.AddScoped<ISeatService, SeatService>();
builder.Services.AddScoped<IUserRepository, PostgresUserRepository>();
builder.Services.AddScoped<IUserService, UserService>();

var app = builder.Build();

// Endpoint simple para revisar si la API esta levantada.
app.MapGet("/health", () => Results.Ok(new { status = "healthy", service = "TECAir.Api" }));

// Activa las rutas definidas por atributos en los controllers.
app.MapControllers();

app.Run();
