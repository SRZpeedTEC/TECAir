# Pruebas manuales de filtros

No hay pruebas automatizadas de frontend en el proyecto. Para validar los filtros:

- Cliente: buscar vuelos desde Home con origen, destino y fecha; cambiar escalas y orden en Results. Confirmar que cada cambio llama al backend y mantiene solo itinerarios PUBLIC.
- Admin itinerarios: abrir Gestion de Itinerarios, confirmar carga inicial sin filtros y probar filtros por id, origen, destino y estado.
- Admin vuelos: abrir Gestion de Vuelos, confirmar carga inicial sin filtros y probar filtros por id, origen, destino, estado y fecha de salida.
