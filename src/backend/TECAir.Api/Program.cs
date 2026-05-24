using Npgsql;
using TECAir.Application.Interfaces;
using TECAir.Application.Services;
using TECAir.Infrastructure.Repositories;
using TECAir.Infrastructure.Security;
using TECAir.Infrastructure.Storage;
// Publsh command on TECAir.Api: dotnet publish -c Release -o ./publish

// Program.cs configura la aplicacion web.
// Aqui se registran controllers, conexion a PostgreSQL, servicios y repositorios.
var builder = WebApplication.CreateBuilder(args);

// Agrega soporte para controllers y para descubrir endpoints de la API.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// CORS: permite peticiones desde el WebView de Android (capacitor/localhost) y
// desde el frontend web en desarrollo. En produccion reemplazar con el dominio real.
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

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
// Almacenamiento local de imagenes de promociones bajo wwwroot/uploads/promotions.
// Singleton porque solo guarda configuracion (rutas) y no estado por request.
builder.Services.AddSingleton<IPromotionImageStorage>(serviceProvider =>
{
    var environment = serviceProvider.GetRequiredService<IWebHostEnvironment>();
    var webRoot = environment.WebRootPath;
    if (string.IsNullOrEmpty(webRoot))
    {
        webRoot = Path.Combine(environment.ContentRootPath, "wwwroot");
    }
    var rootPath = Path.Combine(webRoot, "uploads", "promotions");
    return new LocalPromotionImageStorage(rootPath, "/uploads/promotions/");
});
builder.Services.AddScoped<IReservationRepository, PostgresReservationRepository>();
builder.Services.AddScoped<IReservationService, ReservationService>();
builder.Services.AddScoped<ISeatRepository, PostgresSeatRepository>();
builder.Services.AddScoped<ISeatService, SeatService>();
builder.Services.AddScoped<IUserRepository, PostgresUserRepository>();
builder.Services.AddScoped<IUserService, UserService>();

// Seguridad: este componente centraliza el hash de contrasenas para que
// ningun flujo guarde passwords en texto plano en app_user.password_hash.
builder.Services.AddScoped<IPasswordHasher, BCryptPasswordHasher>();
builder.Services.AddScoped<IAuthService, AuthService>();

var app = builder.Build();

// Convierte BadHttpRequestException (413 disparado por [RequestSizeLimit] al
// exceder el tamano del body) en una respuesta JSON con campo message, para
// que el cliente vea un mensaje legible en vez de un 413 con body vacio.
app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (BadHttpRequestException ex) when (ex.StatusCode == StatusCodes.Status413PayloadTooLarge)
    {
        if (!context.Response.HasStarted)
        {
            context.Response.Clear();
            context.Response.StatusCode = StatusCodes.Status413PayloadTooLarge;
            context.Response.ContentType = "application/json; charset=utf-8";
            await context.Response.WriteAsync(
                """{"message":"Image file must not exceed 5 MB."}""");
        }
    }
});

app.UseCors();

// Sirve archivos estaticos desde wwwroot (incluye /uploads/promotions/* para
// las imagenes que sube el admin desde el formulario de promociones).
app.UseStaticFiles();

// Endpoint simple para revisar si la API esta levantada.
app.MapGet("/health", () => Results.Ok(new { status = "healthy", service = "TECAir.Api" }));

// Activa las rutas definidas por atributos en los controllers.
app.MapControllers();

app.Run();
