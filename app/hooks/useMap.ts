import React, { useEffect, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

const Map = ({ onRouteChange }) => {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);

    useEffect(() => {
        const loader = new Loader({
            apiKey: 'YOUR_GOOGLE_MAPS_API_KEY',
            version: 'weekly',
        });

        loader.load().then(() => {
            mapInstance.current = new google.maps.Map(mapRef.current, {
                center: { lat: -34.397, lng: 150.644 },
                zoom: 8,
            });

            // Add event listener for route changes
            google.maps.event.addListener(mapInstance.current, 'click', (event) => {
                const lat = event.latLng.lat();
                const lng = event.latLng.lng();
                onRouteChange({ lat, lng });
            });
        });

        return () => {
            if (mapInstance.current) {
                google.maps.event.clearInstanceListeners(mapInstance.current);
            }
        };
    }, [onRouteChange]);

    return <div ref={mapRef} style={{ height: '100%', width: '100%' }} />;
};

export default Map;