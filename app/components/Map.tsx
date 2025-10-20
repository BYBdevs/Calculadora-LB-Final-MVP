'use client';

import { GoogleMap, LoadScript, Polyline, Marker } from '@react-google-maps/api';
import { useState, useCallback, useEffect } from 'react';

const containerStyle = {
  width: '100%',
  height: '600px'  // Aumentado para mejor visibilidad
};

const defaultCenter = {
  lat: -2.1894128,
  lng: -79.8890662
};

const Map = ({ route, waypoints, onWaypointAdd }) => {
  const [map, setMap] = useState(null);
  const [path, setPath] = useState([]);

  useEffect(() => {
    if (route?.polyline) {
      try {
        const decodedPath = google.maps.geometry.encoding.decodePath(route.polyline);
        setPath(decodedPath);
        
        if (map && route.bounds) {
          const bounds = new google.maps.LatLngBounds(
            route.bounds.southwest,
            route.bounds.northeast
          );
          map.fitBounds(bounds);
        }
      } catch (error) {
        console.error('Error decodificando la ruta:', error);
      }
    }
  }, [route, map]);

  const onLoad = useCallback((map) => {
    setMap(map);
  }, []);

  const handleMapClick = (e) => {
    if (onWaypointAdd) {
      onWaypointAdd({
        lat: e.latLng.lat(),
        lng: e.latLng.lng()
      });
    }
  };

  return (
    <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={defaultCenter}
        zoom={13}
        onLoad={onLoad}
        onClick={handleMapClick}
      >
        {path.length > 0 && (
          <Polyline
            path={path}
            options={{
              strokeColor: '#FF0000',
              strokeOpacity: 0.8,
              strokeWeight: 2,
            }}
          />
        )}
        {waypoints?.map((waypoint, index) => (
          <Marker
            key={index}
            position={waypoint}
            label={`${index + 1}`}
          />
        ))}
      </GoogleMap>
    </LoadScript>
  );
};

export default Map;