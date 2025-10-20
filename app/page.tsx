'use client';

import { useState } from 'react';
import Layout from './layout';
import Map from './components/Map';
import RouteEditor from './components/RouteEditor';

const Page = () => {
  const [route, setRoute] = useState(null);
  const [waypoints, setWaypoints] = useState([]);

  const handleCalculateRoute = async (origin, destination) => {
    try {
      const response = await fetch(`/api/route?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`);
      if (!response.ok) throw new Error('Error al calcular ruta');
      const data = await response.json();
      setRoute(data);
    } catch (error) {
      console.error('Error:', error);
      alert('Error al calcular la ruta');
    }
  };

  const handleWaypointAdd = (waypoint) => {
    setWaypoints([...waypoints, waypoint]);
  };

  return (
    <Layout>
      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Map 
              route={route} 
              waypoints={waypoints}
              onWaypointAdd={handleWaypointAdd}
            />
          </div>
          <div>
            <RouteEditor onCalculateRoute={handleCalculateRoute} />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Page;