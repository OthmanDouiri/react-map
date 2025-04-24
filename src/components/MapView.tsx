/* eslint-disable @typescript-eslint/no-explicit-any */

// Importación de componentes y librerías necesarias
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
} from 'react-leaflet';
import L from 'leaflet';  
import 'leaflet/dist/leaflet.css';
import { useRef, useState } from 'react';
import './MapView.css';

// Configuración del icono por defecto de los marcadores
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});


// Tipo para representar una ciudad
type City = {
  id: number;
  name: string;
  lat: number;
  lng: number;
  weather: string | null;
};

// Componente principal del mapa
const MapView: React.FC = () => {
  const [cities, setCities] = useState<City[]>([]);// Lista de ciudades
  const [query, setQuery] = useState(''); // Consulta para buscar ciudades
  const [mapStyle, setMapStyle] = useState<'streets' | 'terrain'>('streets'); // Estilo del mapa (calles o terreno)
  const mapRef = useRef<any>(null); // Referencia al mapa


  // Función para agregar una ciudad 
  const addCity = async () => {
    if (!query) return;


    // Llamada a la API de geolocalización con OpenCage
    const apiKey = import.meta.env.VITE_OPENCAGE_API_KEY;
    const res = await fetch(
      `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(query)}&key=${apiKey}`
    );
    const data = await res.json();

    // Si no se encontraron resultados
    // se muestra una alerta y se sale de la función
    if (!data.results.length) {
      alert('Ciudad no encontrada');
      return;
    }

    const { lat, lng } = data.results[0].geometry;
    const label = data.results[0].formatted;


    // Llamada a la API del clima con OpenWeather
    const weatherKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
    const weatherRes = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=metric&appid=${weatherKey}&lang=es`
    );
    const weatherData = await weatherRes.json();
    const weather =
      weatherData?.weather?.[0]?.description && weatherData?.main?.temp
        ? `${weatherData.weather[0].description} · ${weatherData.main.temp}°C`
        : null;

    // Nueva ciudad a agregar
    const newCity: City = {
      id: Date.now(),
      name: label,
      lat,
      lng,
      weather,
    };

    // Actualiza el estado con la nueva ciudad
    setCities((prev) => [...prev, newCity]);
    setQuery('');
    mapRef.current?.setView([lat, lng], 10);
  };


  // Elimina una ciudad por ID
  const removeCity = (id: number) => {
    setCities((prev) => prev.filter((city) => city.id !== id));
  };

  // Función para obtener y centrar el mapa en la ubicación actual
  const locateMe = async () => {
    if (!navigator.geolocation) {
      alert('Geolocalización no soportada');
      return;
    }
  
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      mapRef.current?.setView([latitude, longitude], 10);
  
      // Obtener clima desde OpenWeather
      const weatherKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
      const weatherRes = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${weatherKey}&lang=es`
      );
      const weatherData = await weatherRes.json();
      const weather =
        weatherData?.weather?.[0]?.description && weatherData?.main?.temp
          ? `${weatherData.weather[0].description} · ${weatherData.main.temp}°C`
          : null;
  
      setCities((prevCities) => {
        const exists = prevCities.find((city) => city.name === 'Mi ubicación');
        if (exists) {
          // Si ya existe, actualizar posición y clima
          return prevCities.map((city) =>
            city.name === 'Mi ubicación' ? { ...city, lat: latitude, lng: longitude, weather }: city
          );
        } else {
          // Si no existe, agregarla
          return [
            ...prevCities,
            {
              id: Date.now(),
              name: 'Mi ubicación',
              lat: latitude,
              lng: longitude,
              weather,
            },
          ];
        }
      });
    });
  };
  

// Retorna el estilo de mapa actual (callejero o terreno)
  const getTileLayer = () => {
    return mapStyle === 'streets'
      ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      : 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
  };

  return (
    <div className="map-container">
      <div className="map-controls">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Añadir ciudad..."
          className="map-input"
        />
        <button onClick={addCity} className="map-button add-btn">
          Agregar
        </button>
        <button onClick={locateMe} className="map-button locate-btn">
          Mi ubicación
        </button>
        <button
          onClick={() =>
            setMapStyle((prev) => (prev === 'streets' ? 'terrain' : 'streets'))
          }
          className="map-button toggle-btn"
        >
          {mapStyle === 'streets' ? 'Terreno' : 'Calles'}
        </button>
      </div>
  
      <MapContainer
        center={[40.4168, -3.7038]}
        zoom={5}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        whenCreated={(mapInstance: any) => {
          mapRef.current = mapInstance;
        }}
      >
        <TileLayer url={getTileLayer()} />
        {cities.map((city) => (
          <Marker key={city.id} position={[city.lat, city.lng]}>
            <Popup>
              <strong>{city.name}</strong>
              <br />
              {city.weather ?? 'Sin clima'}
              <br />
              <button
                onClick={() => removeCity(city.id)}
                className="popup-button"
              >
                Eliminar
              </button>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapView;
